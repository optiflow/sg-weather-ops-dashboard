import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  type TwoHourForecastArea,
  WeatherProviderError,
  type WeatherSnapshot,
} from '../weather.js';

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
  data_quality: {
    status: 'complete',
    last_refreshed_at: '2026-05-04T00:00:01Z',
    unavailable_signals: [],
  },
};

const bishanArea: TwoHourForecastArea = {
  name: 'Bishan',
  latitude: 1.352,
  longitude: 103.849,
};

describe('locations API', () => {
  let tempDir: string;
  let app: Awaited<ReturnType<typeof import('../server.js').createApp>>;
  let resetStore: () => Promise<void>;
  let deleteStoredLocation: (id: number) => Promise<void>;
  let weatherRequestHandler: (latitude: number, longitude: number) => Promise<WeatherSnapshot>;
  let forecastAreasHandler: () => Promise<TwoHourForecastArea[]>;
  let areaByNameHandler: (name: string) => Promise<TwoHourForecastArea>;
  let nearestAreaHandler: (latitude: number, longitude: number) => Promise<TwoHourForecastArea>;
  let weatherRequests: Array<{ latitude: number; longitude: number }>;
  let areaByNameRequests: string[];
  let nearestAreaRequests: Array<{ latitude: number; longitude: number }>;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sg-weather-ops-dashboard-test-'));
    process.env.DATABASE_PATH = join(tempDir, 'weather.db');
    process.env.LOG_LEVEL = 'silent';
    weatherRequestHandler = async () => weather;
    forecastAreasHandler = async () => [bishanArea];
    areaByNameHandler = async () => bishanArea;
    nearestAreaHandler = async () => bishanArea;
    weatherRequests = [];
    areaByNameRequests = [];
    nearestAreaRequests = [];

    const { createApp } = await import('../server.js');
    app = await createApp({
      serveFrontend: false,
      enableRequestLogging: false,
      weatherClient: {
        async getCurrentWeather(latitude, longitude) {
          weatherRequests.push({ latitude, longitude });
          return weatherRequestHandler(latitude, longitude);
        },
        async listTwoHourForecastAreas() {
          return forecastAreasHandler();
        },
        async getTwoHourForecastAreaByName(name) {
          areaByNameRequests.push(name);
          return areaByNameHandler(name);
        },
        async getNearestTwoHourForecastArea(latitude, longitude) {
          nearestAreaRequests.push({ latitude, longitude });
          return nearestAreaHandler(latitude, longitude);
        },
      },
    });

    const db = await import('../db.js');
    resetStore = db.resetStore;
    deleteStoredLocation = db.deleteLocation;
  });

  beforeEach(async () => {
    weatherRequestHandler = async () => weather;
    forecastAreasHandler = async () => [bishanArea];
    areaByNameHandler = async () => bishanArea;
    nearestAreaHandler = async () => bishanArea;
    weatherRequests = [];
    areaByNameRequests = [];
    nearestAreaRequests = [];
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
      label: null,
      is_favorite: false,
      weather: {
        condition: 'Cloudy',
        area: 'Bishan',
        temperature_c: 29,
        data_quality: {
          status: 'complete',
          last_refreshed_at: '2026-05-04T00:00:01Z',
          unavailable_signals: [],
        },
      },
    });

    const listResponse = await request(app).get('/api/locations').expect(200);
    expect(listResponse.body.locations).toHaveLength(1);
    expect(listResponse.body.locations[0].weather.condition).toBe('Cloudy');
    expect(listResponse.body.locations[0]).toMatchObject({
      label: null,
      is_favorite: false,
    });
  });

  it('lists forecast areas sorted by name', async () => {
    forecastAreasHandler = async () => [
      bishanArea,
      { name: 'Changi', latitude: 1.36, longitude: 103.99 },
    ];

    const response = await request(app).get('/api/forecast-areas').expect(200);

    expect(response.body).toEqual({
      areas: [bishanArea, { name: 'Changi', latitude: 1.36, longitude: 103.99 }],
    });
  });

  it('creates a location from a selected forecast area with a label', async () => {
    const response = await request(app)
      .post('/api/locations/from-area')
      .send({ name: ' Bishan ', label: ' Home ' })
      .expect(201);

    expect(response.body).toMatchObject({
      created: true,
      matched_area: bishanArea,
      location: {
        label: 'Home',
        is_favorite: false,
        latitude: bishanArea.latitude,
        longitude: bishanArea.longitude,
        weather: {
          condition: 'Cloudy',
          area: 'Bishan',
        },
      },
    });
    expect(areaByNameRequests).toEqual([' Bishan ']);
    expect(weatherRequests).toEqual([
      { latitude: bishanArea.latitude, longitude: bishanArea.longitude },
    ]);
  });

  it('returns an existing forecast-area location as idempotent success and updates explicit label', async () => {
    const first = await request(app)
      .post('/api/locations/from-area')
      .send({ name: 'Bishan', label: 'Home' })
      .expect(201);

    const second = await request(app)
      .post('/api/locations/from-area')
      .send({ name: 'Bishan', label: 'Office' })
      .expect(200);

    expect(second.body).toMatchObject({
      created: false,
      matched_area: bishanArea,
      location: {
        id: first.body.location.id,
        label: 'Office',
        latitude: bishanArea.latitude,
        longitude: bishanArea.longitude,
      },
    });
    expect(weatherRequests).toHaveLength(1);

    const listResponse = await request(app).get('/api/locations').expect(200);
    expect(listResponse.body.locations).toHaveLength(1);
    expect(listResponse.body.locations[0].label).toBe('Office');
  });

  it('rejects invalid or unknown forecast-area create requests', async () => {
    await request(app).post('/api/locations/from-area').send({ name: '' }).expect(422);
    await request(app)
      .post('/api/locations/from-area')
      .send({ name: 'Bishan', label: 'x'.repeat(41) })
      .expect(422);
    areaByNameHandler = async () => {
      throw new WeatherProviderError('Forecast area not found');
    };

    const response = await request(app)
      .post('/api/locations/from-area')
      .send({ name: 'Atlantis' })
      .expect(422);

    expect(response.body).toEqual({ detail: 'Forecast area not found' });
    expect(weatherRequests).toHaveLength(0);
  });

  it('keeps the canonical forecast-area location when from-area refresh fails', async () => {
    weatherRequestHandler = async () => {
      throw new WeatherProviderError('Weather provider rate limit reached (HTTP 429)');
    };

    const response = await request(app)
      .post('/api/locations/from-area')
      .send({ name: 'Bishan', label: 'Home' })
      .expect(201);

    expect(response.body).toMatchObject({
      created: true,
      matched_area: bishanArea,
      location: {
        label: 'Home',
        latitude: bishanArea.latitude,
        longitude: bishanArea.longitude,
        weather: {
          condition: 'Not refreshed',
          area: 'Bishan',
          data_quality: {
            status: 'not_refreshed',
          },
        },
      },
    });
  });

  it('returns an existing location by id', async () => {
    const createResponse = await request(app)
      .post('/api/locations')
      .send({ latitude: 1.35, longitude: 103.85 })
      .expect(201);

    const response = await request(app).get(`/api/locations/${createResponse.body.id}`).expect(200);

    expect(response.body).toMatchObject({
      id: createResponse.body.id,
      latitude: 1.35,
      longitude: 103.85,
      weather: {
        condition: 'Cloudy',
        area: 'Bishan',
      },
    });
  });

  it('keeps a manually created location when initial weather refresh fails', async () => {
    weatherRequestHandler = async () => {
      throw new WeatherProviderError('Weather provider rate limit reached (HTTP 429)');
    };

    const response = await request(app)
      .post('/api/locations')
      .send({ latitude: 1.35, longitude: 103.85 })
      .expect(201);

    expect(response.body).toMatchObject({
      id: 1,
      latitude: 1.35,
      longitude: 103.85,
      weather: {
        condition: 'Not refreshed',
        area: null,
        data_quality: {
          status: 'not_refreshed',
          last_refreshed_at: null,
          unavailable_signals: [],
        },
      },
    });
    expect(weatherRequests).toEqual([{ latitude: 1.35, longitude: 103.85 }]);

    const listResponse = await request(app).get('/api/locations').expect(200);
    expect(listResponse.body.locations).toHaveLength(1);
    expect(listResponse.body.locations[0].weather.condition).toBe('Not refreshed');
  });

  it('creates a location from the nearest forecast area for browser coordinates', async () => {
    const response = await request(app)
      .post('/api/locations/from-position')
      .send({ latitude: 1.3001, longitude: 103.8001 })
      .expect(201);

    expect(response.body).toMatchObject({
      created: true,
      matched_area: bishanArea,
      location: {
        id: 1,
        latitude: bishanArea.latitude,
        longitude: bishanArea.longitude,
        weather: {
          condition: 'Cloudy',
          area: 'Bishan',
          temperature_c: 29,
          data_quality: {
            status: 'complete',
          },
        },
      },
    });
    expect(nearestAreaRequests).toEqual([{ latitude: 1.3001, longitude: 103.8001 }]);
    expect(weatherRequests).toEqual([
      { latitude: bishanArea.latitude, longitude: bishanArea.longitude },
    ]);

    const listResponse = await request(app).get('/api/locations').expect(200);
    expect(listResponse.body.locations).toHaveLength(1);
    expect(listResponse.body.locations[0]).toMatchObject({
      latitude: bishanArea.latitude,
      longitude: bishanArea.longitude,
    });
  });

  it('returns an existing canonical forecast-area location as idempotent success', async () => {
    const first = await request(app)
      .post('/api/locations/from-position')
      .send({ latitude: 1.3001, longitude: 103.8001 })
      .expect(201);

    const second = await request(app)
      .post('/api/locations/from-position')
      .send({ latitude: 1.3202, longitude: 103.8302 })
      .expect(200);

    expect(second.body).toMatchObject({
      created: false,
      matched_area: bishanArea,
      location: {
        id: first.body.location.id,
        latitude: bishanArea.latitude,
        longitude: bishanArea.longitude,
      },
    });
    expect(nearestAreaRequests).toHaveLength(2);
    expect(weatherRequests).toHaveLength(1);

    const listResponse = await request(app).get('/api/locations').expect(200);
    expect(listResponse.body.locations).toHaveLength(1);
  });

  it('rejects invalid browser coordinates without resolving a forecast area', async () => {
    const invalidBodies = [
      { latitude: '1.35', longitude: 103.85 },
      { latitude: [1.35], longitude: 103.85 },
      { latitude: true, longitude: 103.85 },
      { latitude: null, longitude: 103.85 },
      { longitude: 103.85 },
      { latitude: 1.35, longitude: '103.85' },
    ];

    for (const body of invalidBodies) {
      const response = await request(app)
        .post('/api/locations/from-position')
        .send(body)
        .expect(422);
      expect(response.body).toEqual({ detail: 'latitude and longitude are required' });
    }
    expect(nearestAreaRequests).toHaveLength(0);
    expect(weatherRequests).toHaveLength(0);

    const listResponse = await request(app).get('/api/locations').expect(200);
    expect(listResponse.body.locations).toHaveLength(0);
  });

  it('rejects outside-Singapore browser coordinates without resolving a forecast area', async () => {
    const response = await request(app)
      .post('/api/locations/from-position')
      .send({ latitude: 1.6, longitude: 104.2 })
      .expect(422);

    expect(response.body).toEqual({
      detail: 'Coordinates must be within Singapore (lat 1.1-1.5, lon 103.6-104.1)',
    });
    expect(nearestAreaRequests).toHaveLength(0);
    expect(weatherRequests).toHaveLength(0);

    const listResponse = await request(app).get('/api/locations').expect(200);
    expect(listResponse.body.locations).toHaveLength(0);
  });

  it('does not create a location when forecast-area metadata lookup fails', async () => {
    nearestAreaHandler = async () => {
      throw new WeatherProviderError('Forecast response has no area metadata');
    };

    const response = await request(app)
      .post('/api/locations/from-position')
      .send({ latitude: 1.3001, longitude: 103.8001 })
      .expect(502);

    expect(response.body).toEqual({ detail: 'Forecast response has no area metadata' });
    expect(nearestAreaRequests).toEqual([{ latitude: 1.3001, longitude: 103.8001 }]);
    expect(weatherRequests).toHaveLength(0);

    const listResponse = await request(app).get('/api/locations').expect(200);
    expect(listResponse.body.locations).toHaveLength(0);
  });

  it('keeps the canonical location when weather refresh fails after browser-position create', async () => {
    weatherRequestHandler = async () => {
      throw new WeatherProviderError('Weather provider rate limit reached (HTTP 429)');
    };

    const response = await request(app)
      .post('/api/locations/from-position')
      .send({ latitude: 1.3001, longitude: 103.8001 })
      .expect(201);

    expect(response.body).toMatchObject({
      created: true,
      matched_area: bishanArea,
      location: {
        latitude: bishanArea.latitude,
        longitude: bishanArea.longitude,
        weather: {
          condition: 'Not refreshed',
          area: 'Bishan',
          data_quality: {
            status: 'not_refreshed',
            last_refreshed_at: null,
            unavailable_signals: [],
          },
        },
      },
    });

    const listResponse = await request(app).get('/api/locations').expect(200);
    expect(listResponse.body.locations).toHaveLength(1);
    expect(listResponse.body.locations[0].weather.condition).toBe('Not refreshed');
    expect(listResponse.body.locations[0].weather.area).toBe('Bishan');
    expect(listResponse.body.locations[0].weather.data_quality.status).toBe('not_refreshed');
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

  it('rejects manually added outside-Singapore coordinates', async () => {
    const response = await request(app)
      .post('/api/locations')
      .send({ latitude: 1.6, longitude: 104.2 })
      .expect(422);

    expect(response.body).toEqual({
      detail: 'Coordinates must be within Singapore (lat 1.1-1.5, lon 103.6-104.1)',
    });
    expect(weatherRequests).toHaveLength(0);

    const listResponse = await request(app).get('/api/locations').expect(200);
    expect(listResponse.body.locations).toHaveLength(0);
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

  it('updates, clears, and validates saved-location metadata', async () => {
    const createResponse = await request(app)
      .post('/api/locations')
      .send({ latitude: 1.35, longitude: 103.85, label: ' Home ' })
      .expect(201);
    const locationId = createResponse.body.id as number;

    expect(createResponse.body).toMatchObject({
      label: 'Home',
      is_favorite: false,
    });

    const favoriteResponse = await request(app)
      .patch(`/api/locations/${locationId}`)
      .send({ is_favorite: true, label: ' Office ' })
      .expect(200);
    expect(favoriteResponse.body).toMatchObject({
      id: locationId,
      label: 'Office',
      is_favorite: true,
    });

    const clearResponse = await request(app)
      .patch(`/api/locations/${locationId}`)
      .send({ label: '   ' })
      .expect(200);
    expect(clearResponse.body.label).toBeNull();
    expect(clearResponse.body.is_favorite).toBe(true);

    await request(app)
      .patch(`/api/locations/${locationId}`)
      .send({ label: 'x'.repeat(41) })
      .expect(422);
    await request(app)
      .patch(`/api/locations/${locationId}`)
      .send({ is_favorite: 'true' })
      .expect(422);
    await request(app).patch(`/api/locations/${locationId}`).send({}).expect(422);
    await request(app).patch('/api/locations/999').send({ label: 'Missing' }).expect(404);
  });

  it('orders favorite locations before non-favorites in the default list', async () => {
    const first = await request(app)
      .post('/api/locations')
      .send({ latitude: 1.35, longitude: 103.85, label: 'First' })
      .expect(201);
    const second = await request(app)
      .post('/api/locations')
      .send({ latitude: 1.36, longitude: 103.86, label: 'Second' })
      .expect(201);

    await request(app)
      .patch(`/api/locations/${first.body.id}`)
      .send({ is_favorite: true })
      .expect(200);

    const listResponse = await request(app).get('/api/locations').expect(200);
    expect(listResponse.body.locations.map((location: { id: number }) => location.id)).toEqual([
      first.body.id,
      second.body.id,
    ]);
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

  it('refreshes an existing location and persists updated weather', async () => {
    const createResponse = await request(app)
      .post('/api/locations')
      .send({ latitude: 1.35, longitude: 103.85 })
      .expect(201);
    const refreshedWeather: WeatherSnapshot = {
      ...weather,
      condition: 'Showers',
      observed_at: '2026-05-04T01:00:00Z',
      temperature_c: 27,
    };
    weatherRequestHandler = async () => refreshedWeather;

    const response = await request(app)
      .post(`/api/locations/${createResponse.body.id}/refresh`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: createResponse.body.id,
      latitude: 1.35,
      longitude: 103.85,
      weather: {
        condition: 'Showers',
        observed_at: '2026-05-04T01:00:00Z',
        temperature_c: 27,
        data_quality: {
          status: 'complete',
        },
      },
    });
    expect(weatherRequests).toEqual([
      { latitude: 1.35, longitude: 103.85 },
      { latitude: 1.35, longitude: 103.85 },
    ]);

    const getResponse = await request(app)
      .get(`/api/locations/${createResponse.body.id}`)
      .expect(200);
    expect(getResponse.body.weather.condition).toBe('Showers');
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
