import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export type RefreshStatus = 'unknown' | 'not_refreshed' | 'complete' | 'partial' | 'unavailable';
export type FreshnessStatus = 'unknown' | 'not_refreshed' | 'fresh' | 'stale';

export type WeatherSignal =
  | 'two_hour_forecast'
  | 'air_temperature'
  | 'relative_humidity'
  | 'rainfall'
  | 'wind_speed'
  | 'wind_direction'
  | 'uv'
  | 'psi'
  | 'pm25'
  | 'twenty_four_hour_forecast'
  | 'four_day_forecast';

export interface WeatherDataQuality {
  status: RefreshStatus;
  last_refreshed_at: string | null;
  unavailable_signals: WeatherSignal[];
  freshness_status: FreshnessStatus;
  stale_signals: WeatherSignal[];
}

export interface WeatherSnapshot {
  condition: string | null;
  observed_at: string | null;
  source: string | null;
  area: string | null;
  valid_period_text: string | null;
  temperature_c: number | null;
  humidity_percent: number | null;
  rainfall_mm: number | null;
  wind_speed_knots: number | null;
  wind_direction_degrees: number | null;
  forecast_low_c: number | null;
  forecast_high_c: number | null;
  uv_index: number | null;
  psi_twenty_four_hourly: number | null;
  pm25_one_hourly: number | null;
  air_quality_region: string | null;
  forecast_periods: Array<{
    label: string;
    forecast: string;
  }>;
  daily_forecast: Array<{
    date: string;
    forecast: string;
    temperature_low_c: number | null;
    temperature_high_c: number | null;
  }>;
  data_quality: WeatherDataQuality;
}

export const locations = sqliteTable(
  'locations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),
    createdAt: text('created_at').notNull(),
    label: text('label'),
    isFavorite: integer('is_favorite', { mode: 'boolean' }).notNull().default(false),
    condition: text('condition'),
    observedAt: text('observed_at'),
    source: text('source'),
    area: text('area'),
    validPeriodText: text('valid_period_text'),
    temperatureC: real('temperature_c'),
    humidityPercent: real('humidity_percent'),
    rainfallMm: real('rainfall_mm'),
    windSpeedKnots: real('wind_speed_knots'),
    windDirectionDegrees: real('wind_direction_degrees'),
    forecastLowC: real('forecast_low_c'),
    forecastHighC: real('forecast_high_c'),
    uvIndex: real('uv_index'),
    psiTwentyFourHourly: real('psi_twenty_four_hourly'),
    pm25OneHourly: real('pm25_one_hourly'),
    airQualityRegion: text('air_quality_region'),
    forecastPeriods: text('forecast_periods', { mode: 'json' })
      .$type<WeatherSnapshot['forecast_periods']>()
      .notNull(),
    dailyForecast: text('daily_forecast', { mode: 'json' })
      .$type<WeatherSnapshot['daily_forecast']>()
      .notNull(),
    dataQuality: text('data_quality', { mode: 'json' })
      .$type<WeatherDataQuality>()
      .notNull()
      .default(
        sql`'{"status":"unknown","last_refreshed_at":null,"unavailable_signals":[],"freshness_status":"unknown","stale_signals":[]}'`,
      ),
  },
  (table) => [
    uniqueIndex('locations_latitude_longitude_unique').on(table.latitude, table.longitude),
  ],
);

export type RefreshAttemptOutcome = 'fetched' | 'failed' | 'throttled' | 'coalesced';
export type RefreshAttemptTrigger = 'create' | 'manual';

export interface SignalResult {
  signal: WeatherSignal;
  status: 'usable' | 'unavailable' | 'stale';
  observed_at: string | null;
}

export const refreshAttempts = sqliteTable(
  'refresh_attempts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    locationId: integer('location_id')
      .notNull()
      .references(() => locations.id, { onDelete: 'cascade' }),
    trigger: text('trigger').$type<RefreshAttemptTrigger>().notNull(),
    startedAt: text('started_at').notNull(),
    completedAt: text('completed_at'),
    outcome: text('outcome').$type<RefreshAttemptOutcome>().notNull(),
    coverageStatus: text('coverage_status').$type<RefreshStatus>().notNull(),
    freshnessStatus: text('freshness_status').$type<FreshnessStatus>().notNull(),
    unavailableSignals: text('unavailable_signals', { mode: 'json' })
      .$type<WeatherSignal[]>()
      .notNull(),
    staleSignals: text('stale_signals', { mode: 'json' }).$type<WeatherSignal[]>().notNull(),
    signalResults: text('signal_results', { mode: 'json' }).$type<SignalResult[]>().notNull(),
    servedFromCache: integer('served_from_cache', { mode: 'boolean' }).notNull().default(false),
    coalescedToAttemptId: integer('coalesced_to_attempt_id'),
    errorType: text('error_type'),
    errorMessage: text('error_message'),
  },
  (table) => [
    index('refresh_attempts_location_started_idx').on(table.locationId, table.startedAt),
    index('refresh_attempts_completed_idx').on(table.completedAt),
  ],
);

export const weatherObservations = sqliteTable(
  'weather_observations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    locationId: integer('location_id')
      .notNull()
      .references(() => locations.id, { onDelete: 'cascade' }),
    refreshAttemptId: integer('refresh_attempt_id')
      .notNull()
      .references(() => refreshAttempts.id, { onDelete: 'cascade' }),
    capturedAt: text('captured_at').notNull(),
    observedAt: text('observed_at'),
    condition: text('condition'),
    source: text('source'),
    area: text('area'),
    validPeriodText: text('valid_period_text'),
    temperatureC: real('temperature_c'),
    humidityPercent: real('humidity_percent'),
    rainfallMm: real('rainfall_mm'),
    windSpeedKnots: real('wind_speed_knots'),
    windDirectionDegrees: real('wind_direction_degrees'),
    forecastLowC: real('forecast_low_c'),
    forecastHighC: real('forecast_high_c'),
    uvIndex: real('uv_index'),
    psiTwentyFourHourly: real('psi_twenty_four_hourly'),
    pm25OneHourly: real('pm25_one_hourly'),
    airQualityRegion: text('air_quality_region'),
    forecastPeriods: text('forecast_periods', { mode: 'json' })
      .$type<WeatherSnapshot['forecast_periods']>()
      .notNull(),
    dailyForecast: text('daily_forecast', { mode: 'json' })
      .$type<WeatherSnapshot['daily_forecast']>()
      .notNull(),
    dataQuality: text('data_quality', { mode: 'json' }).$type<WeatherDataQuality>().notNull(),
  },
  (table) => [
    index('weather_observations_location_captured_idx').on(table.locationId, table.capturedAt),
    index('weather_observations_observed_idx').on(table.observedAt),
  ],
);
