import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export type RefreshStatus = 'unknown' | 'not_refreshed' | 'complete' | 'partial' | 'unavailable';

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
      .default(sql`'{"status":"unknown","last_refreshed_at":null,"unavailable_signals":[]}'`),
  },
  (table) => [
    uniqueIndex('locations_latitude_longitude_unique').on(table.latitude, table.longitude),
  ],
);
