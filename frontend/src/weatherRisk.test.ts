import { describe, expect, it } from 'vitest';
import type { WeatherSnapshot } from './types';
import { buildWeatherRiskBrief } from './weatherRisk';

const now = new Date('2026-05-04T02:00:00Z');

function weather(overrides: Partial<WeatherSnapshot> = {}): WeatherSnapshot {
  return {
    condition: 'Fair',
    observed_at: '2026-05-04T01:00:00Z',
    source: 'test',
    area: 'Bishan',
    valid_period_text: 'Now',
    temperature_c: 29,
    humidity_percent: 70,
    rainfall_mm: 0,
    wind_speed_knots: 4,
    wind_direction_degrees: 180,
    forecast_low_c: 25,
    forecast_high_c: 32,
    uv_index: 3,
    psi_twenty_four_hourly: 42,
    pm25_one_hourly: 9,
    air_quality_region: 'central',
    forecast_periods: [{ label: 'Now', forecast: 'Fair' }],
    daily_forecast: [
      { date: '2026-05-05', forecast: 'Fair', temperature_low_c: 25, temperature_high_c: 32 },
    ],
    data_quality: {
      status: 'complete',
      last_refreshed_at: '2026-05-04T01:00:00Z',
      unavailable_signals: [],
      freshness_status: 'fresh',
      stale_signals: [],
    },
    ...overrides,
  };
}

describe('buildWeatherRiskBrief', () => {
  it('returns unavailable for default not-refreshed weather', () => {
    const brief = buildWeatherRiskBrief(
      weather({
        condition: 'Not refreshed',
        observed_at: null,
        source: 'not-refreshed',
        data_quality: {
          status: 'not_refreshed',
          last_refreshed_at: null,
          unavailable_signals: [],
          freshness_status: 'not_refreshed',
          stale_signals: [],
        },
      }),
      { now },
    );

    expect(brief.level).toBe('unavailable');
    expect(brief.label).toBe('Refresh needed');
    expect(brief.headline).toBe('Refresh Bishan to see the latest weather risk brief.');
    expect(brief.recommendation).toBe(
      'Tap Refresh before relying on this location for outdoor plans.',
    );
    expect(brief.confidenceLabel).toBe('No current update');
  });

  it('returns low risk for fresh fair weather', () => {
    const brief = buildWeatherRiskBrief(weather(), { now });

    expect(brief.level).toBe('low');
    expect(brief.label).toBe('Looks okay');
    expect(brief.headline).toBe('Outdoor plans look okay in Bishan.');
    expect(brief.recommendation).toBe(
      'No special action needed; keep an eye on normal weather changes.',
    );
    expect(brief.confidenceLabel).toBe('Updated recently');
    expect(brief.drivers).toHaveLength(0);
  });

  it('returns high risk for thundery heavy rain', () => {
    const brief = buildWeatherRiskBrief(
      weather({ condition: 'Heavy Thundery Showers', rainfall_mm: 12 }),
      { now },
    );

    expect(brief.level).toBe('high');
    expect(brief.label).toBe('Take care');
    expect(brief.headline).toBe('Rain or thunder could affect plans in Bishan.');
    expect(brief.recommendation).toBe('Bring an umbrella and plan for shelter before heading out.');
    expect(brief.drivers[0]?.key).toBe('rain');
    expect(brief.drivers[0]?.label).toBe('Rain or thunder');
    expect(brief.drivers[0]?.advice).toBe(
      'Bring an umbrella and plan for shelter before heading out.',
    );
  });

  it('classifies UV thresholds', () => {
    expect(buildWeatherRiskBrief(weather({ uv_index: 7 }), { now }).level).toBe('moderate');
    expect(buildWeatherRiskBrief(weather({ uv_index: 9 }), { now }).level).toBe('high');
  });

  it('classifies air-quality thresholds', () => {
    expect(buildWeatherRiskBrief(weather({ psi_twenty_four_hourly: 80 }), { now }).level).toBe(
      'moderate',
    );
    expect(buildWeatherRiskBrief(weather({ psi_twenty_four_hourly: 120 }), { now }).level).toBe(
      'high',
    );
  });

  it('converts wind knots to km/h for thresholds', () => {
    expect(buildWeatherRiskBrief(weather({ wind_speed_knots: 14 }), { now }).level).toBe(
      'moderate',
    );
    expect(buildWeatherRiskBrief(weather({ wind_speed_knots: 22 }), { now }).level).toBe('high');
  });

  it('uses heat and humidity thresholds', () => {
    expect(
      buildWeatherRiskBrief(
        weather({ temperature_c: 31, humidity_percent: 80, forecast_high_c: 33 }),
        { now },
      ).level,
    ).toBe('moderate');
    expect(
      buildWeatherRiskBrief(
        weather({ temperature_c: 34, humidity_percent: 80, forecast_high_c: 35 }),
        { now },
      ).level,
    ).toBe('high');
  });

  it('uses stale observations in risk state', () => {
    const staleBrief = buildWeatherRiskBrief(weather({ observed_at: '2026-05-03T23:00:00Z' }), {
      now,
    });
    const unavailableBrief = buildWeatherRiskBrief(
      weather({ observed_at: '2026-05-03T13:00:00Z' }),
      { now },
    );

    expect(staleBrief.level).toBe('moderate');
    expect(staleBrief.headline).toBe('Old update may affect outdoor plans in Bishan.');
    expect(staleBrief.recommendation).toBe(
      'Tap Refresh before relying on this for time-sensitive plans.',
    );
    expect(staleBrief.confidenceLabel).toBe('Older update');
    expect(unavailableBrief.level).toBe('unavailable');
    expect(unavailableBrief.confidenceLabel).toBe('Refresh needed');
  });

  it('adds a data coverage driver without hiding weather drivers', () => {
    const brief = buildWeatherRiskBrief(
      weather({
        condition: 'Heavy Thundery Showers',
        rainfall_mm: 12,
        data_quality: {
          status: 'partial',
          last_refreshed_at: '2026-05-04T01:00:00Z',
          unavailable_signals: ['uv', 'pm25', 'wind_direction'],
          freshness_status: 'fresh',
          stale_signals: [],
        },
      }),
      { now },
    );

    expect(brief.level).toBe('high');
    expect(brief.drivers[0]?.key).toBe('rain');
    expect(brief.drivers.some((driver) => driver.key === 'coverage')).toBe(true);
    expect(brief.drivers.find((driver) => driver.key === 'coverage')?.label).toBe(
      'Incomplete readings',
    );
    expect(brief.confidenceLabel).toBe('Some readings missing');
    expect(brief.confidenceDetail).toBe(
      'A few weather readings are unavailable, so treat this as a quick guide.',
    );
  });
});
