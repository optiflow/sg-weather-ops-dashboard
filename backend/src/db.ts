import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { and, desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { migrate } from 'drizzle-orm/sqlite-proxy/migrator';
import {
  type FreshnessStatus,
  locations,
  type RefreshAttemptOutcome,
  type RefreshAttemptTrigger,
  type RefreshStatus,
  refreshAttempts,
  type WeatherDataQuality,
  type WeatherSignal,
  type WeatherSnapshot,
  weatherObservations,
} from './schema.js';

export interface LocationRecord {
  id: number;
  latitude: number;
  longitude: number;
  label: string | null;
  is_favorite: boolean;
  created_at: string;
  weather: WeatherSnapshot;
}

export interface RefreshAttemptRecord {
  id: number;
  location_id: number;
  trigger: RefreshAttemptTrigger;
  started_at: string;
  completed_at: string | null;
  outcome: RefreshAttemptOutcome;
  coverage_status: RefreshStatus;
  freshness_status: FreshnessStatus;
  unavailable_signals: WeatherSignal[];
  stale_signals: WeatherSignal[];
  served_from_cache: boolean;
  coalesced_to_attempt_id: number | null;
  error_type: string | null;
  error_message: string | null;
}

export interface WeatherObservationRecord {
  id: number;
  location_id: number;
  refresh_attempt_id: number;
  captured_at: string;
  observed_at: string | null;
  weather: WeatherSnapshot;
}

type LocationRow = typeof locations.$inferSelect;
type RefreshAttemptRow = typeof refreshAttempts.$inferSelect;
type WeatherObservationRow = typeof weatherObservations.$inferSelect;

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
    freshness_status: 'not_refreshed',
    stale_signals: [],
  },
};

const unknownDataQuality: WeatherDataQuality = {
  status: 'unknown',
  last_refreshed_at: null,
  unavailable_signals: [],
  freshness_status: 'unknown',
  stale_signals: [],
};

const refreshStatuses = new Set<RefreshStatus>([
  'unknown',
  'not_refreshed',
  'complete',
  'partial',
  'unavailable',
]);
const freshnessStatuses = new Set<FreshnessStatus>(['unknown', 'not_refreshed', 'fresh', 'stale']);

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
sqlite.exec('PRAGMA foreign_keys = ON');
sqlite.exec('PRAGMA journal_mode = WAL');
const db = drizzle(sqliteCallback, { schema: { locations, refreshAttempts, weatherObservations } });
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
    await db
      .select()
      .from(locations)
      .orderBy(desc(locations.isFavorite), desc(locations.createdAt), desc(locations.id))
      .all()
  ).map(rowToRecord);
}

export async function createLocation(
  latitude: number,
  longitude: number,
  metadata: { label?: string | null } = {},
): Promise<LocationRecord> {
  const createdAt = new Date().toISOString().slice(0, 19);
  const weather = weatherToColumns(defaultWeather);
  let row: LocationRow;

  try {
    row = await db
      .insert(locations)
      .values({
        latitude,
        longitude,
        label: metadata.label ?? null,
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

export async function createRefreshAttempt(values: {
  locationId: number;
  trigger: RefreshAttemptTrigger;
  startedAt: string;
  completedAt?: string | null;
  outcome: RefreshAttemptOutcome;
  coverageStatus: RefreshStatus;
  freshnessStatus: FreshnessStatus;
  unavailableSignals?: WeatherSignal[];
  staleSignals?: WeatherSignal[];
  servedFromCache?: boolean;
  coalescedToAttemptId?: number | null;
  errorType?: string | null;
  errorMessage?: string | null;
}): Promise<RefreshAttemptRecord> {
  const row = await db
    .insert(refreshAttempts)
    .values({
      locationId: values.locationId,
      trigger: values.trigger,
      startedAt: values.startedAt,
      completedAt: values.completedAt ?? null,
      outcome: values.outcome,
      coverageStatus: values.coverageStatus,
      freshnessStatus: values.freshnessStatus,
      unavailableSignals: values.unavailableSignals ?? [],
      staleSignals: values.staleSignals ?? [],
      signalResults: [],
      servedFromCache: values.servedFromCache ?? false,
      coalescedToAttemptId: values.coalescedToAttemptId ?? null,
      errorType: values.errorType ?? null,
      errorMessage: values.errorMessage ?? null,
    })
    .returning()
    .get();
  return refreshAttemptToRecord(row);
}

export async function createWeatherObservation(
  locationId: number,
  refreshAttemptId: number,
  weather: WeatherSnapshot,
): Promise<WeatherObservationRecord> {
  const capturedAt = weather.data_quality.last_refreshed_at ?? new Date().toISOString();
  const row = await db
    .insert(weatherObservations)
    .values({
      locationId,
      refreshAttemptId,
      capturedAt,
      ...weatherToColumns(weather),
    })
    .returning()
    .get();
  return weatherObservationToRecord(row);
}

export async function listWeatherObservations(
  locationId: number,
  limit = 24,
): Promise<WeatherObservationRecord[]> {
  const boundedLimit = Math.max(1, Math.min(Math.trunc(limit), 168));
  return (
    await db
      .select()
      .from(weatherObservations)
      .where(eq(weatherObservations.locationId, locationId))
      .orderBy(desc(weatherObservations.capturedAt), desc(weatherObservations.id))
      .limit(boundedLimit)
      .all()
  ).map(weatherObservationToRecord);
}

export async function getLatestRefreshAttempt(
  locationId: number,
): Promise<RefreshAttemptRecord | null> {
  const row = await db
    .select()
    .from(refreshAttempts)
    .where(eq(refreshAttempts.locationId, locationId))
    .orderBy(desc(refreshAttempts.completedAt), desc(refreshAttempts.id))
    .get();
  return row ? refreshAttemptToRecord(row) : null;
}

export async function updateLocationMetadata(
  id: number,
  metadata: { label?: string | null; isFavorite?: boolean },
): Promise<LocationRecord | null> {
  const update: Partial<typeof locations.$inferInsert> = {};
  if ('label' in metadata) update.label = metadata.label ?? null;
  if ('isFavorite' in metadata) update.isFavorite = metadata.isFavorite;

  const row = await db.update(locations).set(update).where(eq(locations.id, id)).returning().get();
  return row ? rowToRecord(row) : null;
}

export async function resetStore(): Promise<void> {
  await db.delete(weatherObservations).run();
  await db.delete(refreshAttempts).run();
  await db.delete(locations).run();
  sqlite.prepare("DELETE FROM sqlite_sequence WHERE name = 'weather_observations'").run();
  sqlite.prepare("DELETE FROM sqlite_sequence WHERE name = 'refresh_attempts'").run();
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
    label: row.label,
    is_favorite: Boolean(row.isFavorite),
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

function refreshAttemptToRecord(row: RefreshAttemptRow): RefreshAttemptRecord {
  return {
    id: row.id,
    location_id: row.locationId,
    trigger: row.trigger,
    started_at: row.startedAt,
    completed_at: row.completedAt,
    outcome: row.outcome,
    coverage_status: row.coverageStatus,
    freshness_status: row.freshnessStatus,
    unavailable_signals: normalizeSignals(row.unavailableSignals),
    stale_signals: normalizeSignals(row.staleSignals),
    served_from_cache: Boolean(row.servedFromCache),
    coalesced_to_attempt_id: row.coalescedToAttemptId,
    error_type: row.errorType,
    error_message: row.errorMessage,
  };
}

function weatherObservationToRecord(row: WeatherObservationRow): WeatherObservationRecord {
  return {
    id: row.id,
    location_id: row.locationId,
    refresh_attempt_id: row.refreshAttemptId,
    captured_at: row.capturedAt,
    observed_at: row.observedAt,
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
  const unavailableSignals = normalizeSignals(candidate.unavailable_signals);
  const staleSignals = normalizeSignals(candidate.stale_signals);
  const freshnessStatus = freshnessStatuses.has(candidate.freshness_status as FreshnessStatus)
    ? (candidate.freshness_status as FreshnessStatus)
    : status === 'not_refreshed'
      ? 'not_refreshed'
      : unknownDataQuality.freshness_status;

  return {
    status,
    last_refreshed_at: lastRefreshedAt,
    unavailable_signals: unavailableSignals,
    freshness_status: freshnessStatus,
    stale_signals: staleSignals,
  };
}

function normalizeSignals(value: unknown): WeatherSignal[] {
  return Array.isArray(value)
    ? value.filter((signal): signal is WeatherSignal => weatherSignals.has(signal as WeatherSignal))
    : [];
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
