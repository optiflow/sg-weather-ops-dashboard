import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { and, desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { migrate } from 'drizzle-orm/sqlite-proxy/migrator';
import {
  locations,
  type RefreshStatus,
  type WeatherDataQuality,
  type WeatherSignal,
  type WeatherSnapshot,
} from './schema.js';

export interface LocationRecord {
  id: number;
  latitude: number;
  longitude: number;
  created_at: string;
  weather: WeatherSnapshot;
}

type LocationRow = typeof locations.$inferSelect;

const defaultWeather: WeatherSnapshot = {
  condition: 'Not refreshed',
  observed_at: null,
  source: 'not-refreshed',
  area: null,
  valid_period_text: null,
  temperature_c: null,
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
    status: 'not_refreshed',
    last_refreshed_at: null,
    unavailable_signals: [],
  },
};

const unknownDataQuality: WeatherDataQuality = {
  status: 'unknown',
  last_refreshed_at: null,
  unavailable_signals: [],
};

const refreshStatuses = new Set<RefreshStatus>([
  'unknown',
  'not_refreshed',
  'complete',
  'partial',
  'unavailable',
]);

const weatherSignals = new Set<WeatherSignal>([
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
]);

const databasePath = process.env.DATABASE_PATH ?? join(process.cwd(), 'backend', 'weather.db');
mkdirSync(dirname(databasePath), { recursive: true });

const sqlite = new DatabaseSync(databasePath);
sqlite.exec('PRAGMA journal_mode = WAL');
const db = drizzle(sqliteCallback, { schema: { locations } });
await migrate(
  db,
  async (migrationQueries) => {
    for (const query of migrationQueries) {
      const trimmed = query.trim();
      if (trimmed) sqlite.exec(trimmed);
    }
  },
  { migrationsFolder: join(process.cwd(), 'backend', 'drizzle') },
);

export async function listLocations(): Promise<LocationRecord[]> {
  return (
    await db.select().from(locations).orderBy(desc(locations.createdAt), desc(locations.id)).all()
  ).map(rowToRecord);
}

export async function createLocation(latitude: number, longitude: number): Promise<LocationRecord> {
  const createdAt = new Date().toISOString().slice(0, 19);
  const weather = weatherToColumns(defaultWeather);
  let row: LocationRow;

  try {
    row = await db
      .insert(locations)
      .values({
        latitude,
        longitude,
        createdAt,
        ...weather,
      })
      .returning()
      .get();
  } catch (error) {
    if (isDuplicateLocationConstraintError(error)) {
      throw createDuplicateLocationError();
    }
    throw error;
  }

  return rowToRecord(row);
}

export async function getLocation(id: number): Promise<LocationRecord | null> {
  const row = await db.select().from(locations).where(eq(locations.id, id)).get();
  return row ? rowToRecord(row) : null;
}

export async function getLocationByCoordinates(
  latitude: number,
  longitude: number,
): Promise<LocationRecord | null> {
  const row = await db
    .select()
    .from(locations)
    .where(and(eq(locations.latitude, latitude), eq(locations.longitude, longitude)))
    .get();
  return row ? rowToRecord(row) : null;
}

export async function updateWeather(
  id: number,
  weather: WeatherSnapshot,
): Promise<LocationRecord | null> {
  const columns = weatherToColumns(weather);
  const row = await db.update(locations).set(columns).where(eq(locations.id, id)).returning().get();

  return row ? rowToRecord(row) : null;
}

export async function resetStore(): Promise<void> {
  await db.delete(locations).run();
  sqlite.prepare("DELETE FROM sqlite_sequence WHERE name = 'locations'").run();
}

export async function deleteLocation(id: number): Promise<void> {
  await db.delete(locations).where(eq(locations.id, id)).run();
}

function createDuplicateLocationError(): Error {
  const error = new Error('Location already exists');
  error.name = 'DuplicateLocationError';
  return error;
}

function isDuplicateLocationConstraintError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const sqliteError = error as Error & { code?: unknown };
  if (
    sqliteError.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
    error.message.includes('UNIQUE constraint failed: locations.latitude, locations.longitude') ||
    error.message.includes('locations_latitude_longitude_unique')
  ) {
    return true;
  }

  const causedBy = (error as Error & { cause?: unknown }).cause;
  return isDuplicateLocationConstraintError(causedBy);
}

function weatherToColumns(weather: WeatherSnapshot) {
  return {
    condition: weather.condition,
    observedAt: weather.observed_at,
    source: weather.source,
    area: weather.area,
    validPeriodText: weather.valid_period_text,
    temperatureC: weather.temperature_c,
    humidityPercent: weather.humidity_percent,
    rainfallMm: weather.rainfall_mm,
    windSpeedKnots: weather.wind_speed_knots,
    windDirectionDegrees: weather.wind_direction_degrees,
    forecastLowC: weather.forecast_low_c,
    forecastHighC: weather.forecast_high_c,
    uvIndex: weather.uv_index,
    psiTwentyFourHourly: weather.psi_twenty_four_hourly,
    pm25OneHourly: weather.pm25_one_hourly,
    airQualityRegion: weather.air_quality_region,
    forecastPeriods: weather.forecast_periods,
    dailyForecast: weather.daily_forecast,
    dataQuality: normalizeDataQuality(weather.data_quality),
  };
}

function rowToRecord(row: LocationRow): LocationRecord {
  return {
    id: row.id,
    latitude: row.latitude,
    longitude: row.longitude,
    created_at: row.createdAt,
    weather: {
      condition: row.condition,
      observed_at: row.observedAt,
      source: row.source,
      area: row.area,
      valid_period_text: row.validPeriodText,
      temperature_c: row.temperatureC,
      humidity_percent: row.humidityPercent,
      rainfall_mm: row.rainfallMm,
      wind_speed_knots: row.windSpeedKnots,
      wind_direction_degrees: row.windDirectionDegrees,
      forecast_low_c: row.forecastLowC,
      forecast_high_c: row.forecastHighC,
      uv_index: row.uvIndex,
      psi_twenty_four_hourly: row.psiTwentyFourHourly,
      pm25_one_hourly: row.pm25OneHourly,
      air_quality_region: row.airQualityRegion,
      forecast_periods: row.forecastPeriods,
      daily_forecast: row.dailyForecast,
      data_quality: normalizeDataQuality(row.dataQuality),
    },
  };
}

function normalizeDataQuality(value: unknown): WeatherDataQuality {
  if (!value || typeof value !== 'object') return unknownDataQuality;

  const candidate = value as Partial<WeatherDataQuality>;
  const status = refreshStatuses.has(candidate.status as RefreshStatus)
    ? (candidate.status as RefreshStatus)
    : unknownDataQuality.status;
  const lastRefreshedAt =
    typeof candidate.last_refreshed_at === 'string' ? candidate.last_refreshed_at : null;
  const unavailableSignals = Array.isArray(candidate.unavailable_signals)
    ? candidate.unavailable_signals.filter((signal): signal is WeatherSignal =>
        weatherSignals.has(signal as WeatherSignal),
      )
    : [];

  return {
    status,
    last_refreshed_at: lastRefreshedAt,
    unavailable_signals: unavailableSignals,
  };
}

async function sqliteCallback(
  sql: string,
  params: unknown[],
  method: 'run' | 'all' | 'values' | 'get',
): Promise<{ rows: unknown[] }> {
  const statement = sqlite.prepare(sql);
  const bindings = params as never[];
  if (method === 'run') {
    statement.run(...bindings);
    return { rows: [] };
  }
  if (method === 'get') {
    const row = statement.get(...bindings) as Record<string, unknown> | undefined;
    return { rows: row ? Object.values(row) : (undefined as unknown as unknown[]) };
  }
  const rows = statement.all(...bindings) as Record<string, unknown>[];
  if (method === 'values') {
    return { rows: rows.map((row) => Object.values(row)) };
  }
  return { rows: rows.map((row) => Object.values(row)) };
}
