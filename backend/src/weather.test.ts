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
});
