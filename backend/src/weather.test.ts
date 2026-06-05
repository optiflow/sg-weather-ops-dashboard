import { afterEach, describe, expect, it, vi } from 'vitest';
import { SingaporeWeatherClient, WeatherProviderError } from './weather.js';

describe('SingaporeWeatherClient forecast-area matching', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the nearest 2-hour forecast area metadata', async () => {
    const fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        code: 0,
        data: {
          area_metadata: [
            {
              name: 'Jurong West',
              label_location: { latitude: 1.3404, longitude: 103.7058 },
            },
            {
              name: 'Bishan',
              label_location: { latitude: 1.352, longitude: 103.849 },
            },
          ],
          items: [],
        },
      }),
    }));
    vi.stubGlobal('fetch', fetch);

    const client = new SingaporeWeatherClient({ timeoutMs: 1000 });
    await expect(client.getNearestTwoHourForecastArea(1.35, 103.85)).resolves.toEqual({
      name: 'Bishan',
      latitude: 1.352,
      longitude: 103.849,
    });
    expect(fetch).toHaveBeenCalledWith(
      'https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast',
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: 'application/json' }),
      }),
    );
  });

  it('throws a provider error when forecast-area metadata is unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ code: 0, data: { area_metadata: [], items: [] } }),
      })),
    );

    const client = new SingaporeWeatherClient({ timeoutMs: 1000 });
    await expect(client.getNearestTwoHourForecastArea(1.35, 103.85)).rejects.toThrow(
      new WeatherProviderError('Forecast response has no area metadata'),
    );
  });

  it('throws provider error messages from non-zero forecast payloads', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ code: 1, errorMsg: 'Provider unavailable' }),
      })),
    );

    const client = new SingaporeWeatherClient({ timeoutMs: 1000 });
    await expect(client.getNearestTwoHourForecastArea(1.35, 103.85)).rejects.toThrow(
      new WeatherProviderError('Provider unavailable'),
    );
  });

  it('marks a complete snapshot when all weather signals are usable', async () => {
    vi.stubGlobal('fetch', fetchFromFixtures());

    const client = new SingaporeWeatherClient({
      timeoutMs: 1000,
      now: () => new Date('2026-05-04T01:00:00Z'),
    });
    const snapshot = await client.getCurrentWeather(1.35, 103.85);

    expect(snapshot).toMatchObject({
      condition: 'Cloudy',
      area: 'Bishan',
      temperature_c: 29,
      humidity_percent: 80,
      rainfall_mm: 0,
      wind_speed_knots: 4,
      wind_direction_degrees: 180,
      uv_index: 7,
      psi_twenty_four_hourly: 42,
      pm25_one_hourly: 9,
      forecast_low_c: 25,
      forecast_high_c: 32,
      data_quality: {
        status: 'complete',
        last_refreshed_at: '2026-05-04T01:00:00.000Z',
        unavailable_signals: [],
      },
    });
  });

  it('marks a partial snapshot when one provider signal is unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      fetchFromFixtures({
        'https://api-open.data.gov.sg/v2/real-time/api/uv': {
          ok: false,
          status: 429,
          json: {},
        },
      }),
    );

    const client = new SingaporeWeatherClient({
      timeoutMs: 1000,
      now: () => new Date('2026-05-04T01:00:00Z'),
    });
    const snapshot = await client.getCurrentWeather(1.35, 103.85);

    expect(snapshot.condition).toBe('Cloudy');
    expect(snapshot.uv_index).toBeNull();
    expect(snapshot.data_quality).toEqual({
      status: 'partial',
      last_refreshed_at: '2026-05-04T01:00:00.000Z',
      unavailable_signals: ['uv'],
    });
  });

  it('marks malformed 2-hour forecast payloads as partial instead of throwing', async () => {
    vi.stubGlobal(
      'fetch',
      fetchFromFixtures({
        'https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast': {
          ok: true,
          status: 200,
          json: { code: 1, errorMsg: 'Provider unavailable' },
        },
      }),
    );

    const client = new SingaporeWeatherClient({
      timeoutMs: 1000,
      now: () => new Date('2026-05-04T01:00:00Z'),
    });
    const snapshot = await client.getCurrentWeather(1.35, 103.85);

    expect(snapshot.condition).toBe('Unavailable');
    expect(snapshot.temperature_c).toBe(29);
    expect(snapshot.data_quality.status).toBe('partial');
    expect(snapshot.data_quality.unavailable_signals).toContain('two_hour_forecast');
  });

  it('marks all signals unavailable when provider calls fail', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 401,
        json: async () => ({}),
      })),
    );

    const client = new SingaporeWeatherClient({
      timeoutMs: 1000,
      now: () => new Date('2026-05-04T01:00:00Z'),
    });
    const snapshot = await client.getCurrentWeather(1.35, 103.85);

    expect(snapshot.condition).toBe('Unavailable');
    expect(snapshot.data_quality).toEqual({
      status: 'unavailable',
      last_refreshed_at: '2026-05-04T01:00:00.000Z',
      unavailable_signals: [
        'two_hour_forecast',
        'air_temperature',
        'relative_humidity',
        'rainfall',
        'wind_speed',
        'wind_direction',
        'uv',
        'psi',
        'pm25',
        'twenty_four_hour_forecast',
        'four_day_forecast',
      ],
    });
  });

  it('marks null station readings as unavailable signals', async () => {
    vi.stubGlobal(
      'fetch',
      fetchFromFixtures({
        'https://api-open.data.gov.sg/v2/real-time/api/air-temperature': {
          ok: true,
          status: 200,
          json: readingPayload(null),
        },
      }),
    );

    const client = new SingaporeWeatherClient({
      timeoutMs: 1000,
      now: () => new Date('2026-05-04T01:00:00Z'),
    });
    const snapshot = await client.getCurrentWeather(1.35, 103.85);

    expect(snapshot.temperature_c).toBeNull();
    expect(snapshot.data_quality.status).toBe('partial');
    expect(snapshot.data_quality.unavailable_signals).toContain('air_temperature');
  });
});

function fetchFromFixtures(
  overrides: Record<
    string,
    {
      ok: boolean;
      status: number;
      json: unknown;
    }
  > = {},
) {
  const fixtures = {
    'https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast': {
      ok: true,
      status: 200,
      json: forecastPayload(),
    },
    'https://api-open.data.gov.sg/v2/real-time/api/air-temperature': {
      ok: true,
      status: 200,
      json: readingPayload(29),
    },
    'https://api-open.data.gov.sg/v2/real-time/api/relative-humidity': {
      ok: true,
      status: 200,
      json: readingPayload(80),
    },
    'https://api-open.data.gov.sg/v2/real-time/api/rainfall': {
      ok: true,
      status: 200,
      json: readingPayload(0),
    },
    'https://api-open.data.gov.sg/v2/real-time/api/wind-speed': {
      ok: true,
      status: 200,
      json: readingPayload(4),
    },
    'https://api-open.data.gov.sg/v2/real-time/api/wind-direction': {
      ok: true,
      status: 200,
      json: readingPayload(180),
    },
    'https://api-open.data.gov.sg/v2/real-time/api/uv': {
      ok: true,
      status: 200,
      json: uvPayload(),
    },
    'https://api-open.data.gov.sg/v2/real-time/api/psi': {
      ok: true,
      status: 200,
      json: psiPayload('psi_twenty_four_hourly', 42),
    },
    'https://api-open.data.gov.sg/v2/real-time/api/pm25': {
      ok: true,
      status: 200,
      json: psiPayload('pm25_one_hourly', 9),
    },
    'https://api-open.data.gov.sg/v2/real-time/api/twenty-four-hr-forecast': {
      ok: true,
      status: 200,
      json: twentyFourHourPayload(),
    },
    'https://api.data.gov.sg/v1/environment/4-day-weather-forecast': {
      ok: true,
      status: 200,
      json: fourDayPayload(),
    },
    ...overrides,
  };

  return vi.fn(async (url: string) => {
    const fixture = fixtures[url as keyof typeof fixtures];
    if (!fixture) throw new Error(`Unexpected URL ${url}`);
    return {
      ok: fixture.ok,
      status: fixture.status,
      json: async () => fixture.json,
    };
  });
}

function forecastPayload() {
  return {
    code: 0,
    data: {
      area_metadata: [
        {
          name: 'Bishan',
          label_location: { latitude: 1.352, longitude: 103.849 },
        },
      ],
      items: [
        {
          update_timestamp: '2026-05-04T00:00:00Z',
          valid_period: { text: 'Now' },
          forecasts: [{ area: 'Bishan', forecast: 'Cloudy' }],
        },
      ],
    },
  };
}

function readingPayload(value: number | null) {
  return {
    code: 0,
    data: {
      stations: [
        {
          id: 'S1',
          name: 'Station 1',
          location: { latitude: 1.35, longitude: 103.85 },
        },
      ],
      readings: [
        {
          timestamp: '2026-05-04T00:02:00Z',
          data: value === null ? [] : [{ stationId: 'S1', value }],
        },
      ],
    },
  };
}

function uvPayload() {
  return {
    code: 0,
    data: {
      records: [
        {
          updatedTimestamp: '2026-05-04T00:03:00Z',
          index: [{ hour: '2026-05-04T00:00:00Z', value: 7 }],
        },
      ],
    },
  };
}

function psiPayload(reading: string, value: number) {
  return {
    code: 0,
    data: {
      regionMetadata: [
        {
          name: 'central',
          labelLocation: { latitude: 1.35735, longitude: 103.82 },
        },
      ],
      items: [
        {
          updatedTimestamp: '2026-05-04T00:04:00Z',
          readings: { [reading]: { central: value } },
        },
      ],
    },
  };
}

function twentyFourHourPayload() {
  return {
    code: 0,
    data: {
      records: [
        {
          updatedTimestamp: '2026-05-04T00:05:00Z',
          general: { temperature: { low: 25, high: 32 } },
          periods: [
            {
              timePeriod: { text: 'Now' },
              regions: { central: { text: 'Cloudy' } },
            },
          ],
        },
      ],
    },
  };
}

function fourDayPayload() {
  return {
    items: [
      {
        update_timestamp: '2026-05-04T00:06:00Z',
        forecasts: [
          {
            date: '2026-05-05',
            forecast: 'Cloudy',
            temperature: { low: 25, high: 32 },
          },
        ],
      },
    ],
  };
}
