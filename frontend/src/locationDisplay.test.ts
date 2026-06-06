import { describe, expect, it } from 'vitest';
import { coordinatesText, locationSecondary, locationTitle } from './locationDisplay';
import type { Location } from './types';

const baseLocation: Location = {
  id: 1,
  latitude: 1.352,
  longitude: 103.849,
  label: null,
  is_favorite: false,
  created_at: '2026-05-04T00:00:00Z',
  weather: {
    condition: 'Fair',
    observed_at: '2026-05-04T00:00:00Z',
    source: 'test',
    area: 'Bishan',
    valid_period_text: null,
    temperature_c: 29,
    humidity_percent: null,
    rainfall_mm: null,
    wind_speed_knots: null,
    wind_direction_degrees: null,
    forecast_low_c: null,
    forecast_high_c: null,
    uv_index: null,
    psi_twenty_four_hourly: null,
    pm25_one_hourly: null,
    air_quality_region: null,
    forecast_periods: [],
    daily_forecast: [],
    data_quality: {
      status: 'complete',
      last_refreshed_at: '2026-05-04T00:00:01Z',
      unavailable_signals: [],
      freshness_status: 'fresh',
      stale_signals: [],
    },
  },
};

describe('locationDisplay', () => {
  it('prefers custom labels, then forecast area, then coordinates', () => {
    expect(locationTitle(baseLocation)).toBe('Bishan');
    expect(locationTitle({ ...baseLocation, label: 'Office' })).toBe('Office');
    expect(
      locationTitle({ ...baseLocation, weather: { ...baseLocation.weather, area: null } }),
    ).toBe('1.352, 103.849');
  });

  it('keeps forecast area as secondary text when a custom label exists', () => {
    expect(locationSecondary({ ...baseLocation, label: 'Office' }, 'fallback')).toBe('Bishan');
    expect(locationSecondary(baseLocation, 'fallback')).toBe('fallback');
    expect(coordinatesText(baseLocation)).toBe('1.352, 103.849');
  });
});
