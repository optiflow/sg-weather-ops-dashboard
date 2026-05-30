import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { WeatherProviderError, type WeatherSnapshot } from '../weather.js';

const weather: WeatherSnapshot = {
  condition: 'Cloudy',
  observed_at: '2026-05-04T00:00:00Z',
  source: 'test',
  area: 'Bishan',
  valid_period_text: 'Now',
  temperature_c: 29,
  humidity_percent: 80,
  rainfall_mm: 0,
  wind_speed_knots: 4,
  wind_direction_degrees: 180,
  forecast_low_c: 25,
  forecast_high_c: 32,
  uv_index: 7,
  psi_twenty_four_hourly: 42,
  pm25_one_hourly: 9,
  air_quality_region: 'central',
  forecast_periods: [{ label: 'Now', forecast: 'Cloudy' }],
  daily_forecast: [
    { date: '2026-05-04', forecast: 'Cloudy', temperature_low_c: 25, temperature_high_c: 32 },
  ],
};

describe('locations API', () => {
  let tempDir: string;
  let app: Awaited<ReturnType<typeof import('../server.js').createApp>>;
  let resetStore: () => Promise<void>;
  let deleteStoredLocation: (id: number) => Promise<void>;
  let weatherRequestHandler: (latitude: number, longitude: number) => Promise<WeatherSnapshot>;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'weather-starter-test-'));
    process.env.DATABASE_PATH = join(tempDir, 'weather.db');
    process.env.LOG_LEVEL = 'silent';
    weatherRequestHandler = async () => weather;

    const { createApp } = await import('../server.js');
    app = await createApp({
      serveFrontend: false,
      enableRequestLogging: false,
      weatherClient: {
        async getCurrentWeather(latitude, longitude) {
          return weatherRequestHandler(latitude, longitude);
        },
      },
    });

    const db = await import('../db.js');
    resetStore = db.resetStore;
    deleteStoredLocation = db.deleteLocation;
  });

  beforeEach(async () => {
    weatherRequestHandler = async () => weather;
    await resetStore();
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('refreshes weather when a location is created', async () => {
    const response = await request(app)
      .post('/api/locations')
      .send({ latitude: 1.35, longitude: 103.85 })
      .expect(201);

    expect(response.body).toMatchObject({
      id: 1,
      latitude: 1.35,
      longitude: 103.85,
      weather: {
        condition: 'Cloudy',
        area: 'Bishan',
        temperature_c: 29,
      },
    });

    const listResponse = await request(app).get('/api/locations').expect(200);
    expect(listResponse.body.locations).toHaveLength(1);
    expect(listResponse.body.locations[0].weather.condition).toBe('Cloudy');
  });

  it('rejects coordinates that are not finite JSON numbers', async () => {
    const invalidBodies = [
      { latitude: '1.35', longitude: 103.85 },
      { latitude: [1.35], longitude: 103.85 },
      { latitude: true, longitude: 103.85 },
      { latitude: null, longitude: 103.85 },
      { longitude: 103.85 },
      { latitude: 1.35, longitude: '103.85' },
    ];

    for (const body of invalidBodies) {
      const response = await request(app).post('/api/locations').send(body).expect(422);
      expect(response.body).toEqual({ detail: 'latitude and longitude are required' });
    }
  });

  it('returns conflict for duplicate coordinates', async () => {
    await request(app)
      .post('/api/locations')
      .send({ latitude: 1.35, longitude: 103.85 })
      .expect(201);

    const response = await request(app)
      .post('/api/locations')
      .send({ latitude: 1.35, longitude: 103.85 })
      .expect(409);

    expect(response.body).toEqual({ detail: 'Location already exists' });
  });

  it('deletes existing locations and returns not found for missing locations', async () => {
    const createResponse = await request(app)
      .post('/api/locations')
      .send({ latitude: 1.35, longitude: 103.85 })
      .expect(201);
    const locationId = createResponse.body.id as number;

    await request(app).delete(`/api/locations/${locationId}`).expect(204);
    await request(app).get(`/api/locations/${locationId}`).expect(404);

    const missingResponse = await request(app).delete('/api/locations/999').expect(404);
    expect(missingResponse.body).toEqual({ detail: 'Location not found' });
  });

  it('returns not found when refreshing a missing location', async () => {
    const response = await request(app).post('/api/locations/999/refresh').expect(404);

    expect(response.body).toEqual({ detail: 'Location not found' });
  });

  it('returns bad gateway when the weather provider fails during refresh', async () => {
    const createResponse = await request(app)
      .post('/api/locations')
      .send({ latitude: 1.35, longitude: 103.85 })
      .expect(201);
    weatherRequestHandler = async () => {
      throw new WeatherProviderError('Weather provider rate limit reached (HTTP 429)');
    };

    const response = await request(app)
      .post(`/api/locations/${createResponse.body.id}/refresh`)
      .expect(502);

    expect(response.body).toEqual({
      detail: 'Weather provider rate limit reached (HTTP 429)',
    });
  });

  it('returns not found when a location is deleted during refresh', async () => {
    const createResponse = await request(app)
      .post('/api/locations')
      .send({ latitude: 1.35, longitude: 103.85 })
      .expect(201);
    const locationId = createResponse.body.id as number;
    weatherRequestHandler = async () => {
      await deleteStoredLocation(locationId);
      return weather;
    };

    const response = await request(app).post(`/api/locations/${locationId}/refresh`).expect(404);

    expect(response.body).toEqual({ detail: 'Location not found' });
  });
});
