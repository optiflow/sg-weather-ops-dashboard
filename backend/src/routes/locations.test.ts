import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { WeatherSnapshot } from '../weather.js';
import { WeatherProviderError } from '../weather.js';

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

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'weather-starter-test-'));
    process.env.DATABASE_PATH = join(tempDir, 'weather.db');
    process.env.LOG_LEVEL = 'silent';

    const { createApp } = await import('../server.js');
    app = await createApp({
      serveFrontend: false,
      enableRequestLogging: false,
      weatherClient: {
        async getCurrentWeather() {
          return weather;
        },
      },
    });
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
});

describe('locations API with failing weather client', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'weather-starter-test-error-'));
    process.env.DATABASE_PATH = join(tempDir, 'weather.error.db');
    process.env.LOG_LEVEL = 'silent';
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('handles WeatherProviderError gracefully during location creation', async () => {
    const { createApp } = await import('../server.js');
    const app = await createApp({
      serveFrontend: false,
      enableRequestLogging: false,
      weatherClient: {
        async getCurrentWeather() {
          throw new WeatherProviderError('API rate limit exceeded');
        },
      },
    });

    const response = await request(app)
      .post('/api/locations')
      .send({ latitude: 1.37, longitude: 103.87 }) // different coordinates for clean DB insertion
      .expect(201);

    expect(response.body).toMatchObject({
      latitude: 1.37,
      longitude: 103.87,
    });
    expect(typeof response.body.id).toBe('number');
    expect(response.body.weather).toMatchObject({
      condition: 'Not refreshed',
      source: 'not-refreshed',
    });
  });

  it('returns 500 when unknown error occurs during location creation', async () => {
    const { createApp } = await import('../server.js');
    const app = await createApp({
      serveFrontend: false,
      enableRequestLogging: false,
      weatherClient: {
        async getCurrentWeather() {
          throw new Error('Database connection failed');
        },
      },
    });

    await request(app)
      .post('/api/locations')
      .send({ latitude: 1.36, longitude: 103.86 }) // Use different coordinates
      .expect(500);
  });

  it('returns 502 when WeatherProviderError occurs during location refresh', async () => {
    const { createApp } = await import('../server.js');
    let callCount = 0;
    const app = await createApp({
      serveFrontend: false,
      enableRequestLogging: false,
      weatherClient: {
        async getCurrentWeather() {
          callCount++;
          if (callCount === 1) {
            return weather; // Success on create
          }
          throw new WeatherProviderError('API rate limit exceeded');
        },
      },
    });

    // Create a location first to refresh
    const createResponse = await request(app)
      .post('/api/locations')
      .send({ latitude: 1.38, longitude: 103.88 })
      .expect(201);

    const locationId = createResponse.body.id;

    const response = await request(app).post(`/api/locations/${locationId}/refresh`).expect(502);
    expect(response.body).toEqual({ detail: 'API rate limit exceeded' });
  });

  it('returns 500 when unknown error occurs during location refresh', async () => {
    const { createApp } = await import('../server.js');
    let callCount = 0;
    const app = await createApp({
      serveFrontend: false,
      enableRequestLogging: false,
      weatherClient: {
        async getCurrentWeather() {
          callCount++;
          if (callCount === 1) {
            return weather; // Success on create
          }
          throw new Error('Unknown error');
        },
      },
    });

    // Create a location first to refresh
    const createResponse = await request(app)
      .post('/api/locations')
      .send({ latitude: 1.39, longitude: 103.89 })
      .expect(201);

    const locationId = createResponse.body.id;

    await request(app).post(`/api/locations/${locationId}/refresh`).expect(500);
  });
});
