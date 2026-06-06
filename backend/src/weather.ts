export class WeatherProviderError extends Error {}

interface ForecastPayload {
  code?: number;
  errorMsg?: string;
  data?: ForecastRoot;
  area_metadata?: AreaMetadata[];
  items?: ForecastItem[];
}

interface ForecastRoot {
  area_metadata?: AreaMetadata[];
  items?: ForecastItem[];
}

interface AreaMetadata {
  name?: string;
  label_location?: {
    latitude?: number | string;
    longitude?: number | string;
  };
}

interface ForecastItem {
  update_timestamp?: string;
  timestamp?: string;
  valid_period?: {
    text?: string;
  };
  forecasts?: Array<{
    area?: string;
    forecast?: string;
  }>;
}

interface ReadingPayload {
  code?: number;
  errorMsg?: string;
  data?: {
    stations?: WeatherStation[];
    readings?: WeatherReading[];
    readingType?: string;
    readingUnit?: string;
  };
}

interface WeatherStation {
  id?: string;
  name?: string;
  location?: {
    latitude?: number | string;
    longitude?: number | string;
  };
}

interface WeatherReading {
  timestamp?: string;
  data?: Array<{
    stationId?: string;
    value?: number | string;
  }>;
}

interface RegionMetadata {
  name?: string;
  labelLocation?: {
    latitude?: number | string;
    longitude?: number | string;
  };
}

interface UvPayload {
  code?: number;
  errorMsg?: string;
  data?: {
    records?: Array<{
      timestamp?: string;
      updatedTimestamp?: string;
      index?: Array<{
        hour?: string;
        value?: number | string;
      }>;
    }>;
  };
}

interface PsiPayload {
  code?: number;
  errorMsg?: string;
  data?: {
    regionMetadata?: RegionMetadata[];
    items?: Array<{
      timestamp?: string;
      updatedTimestamp?: string;
      readings?: Record<string, Record<string, number | string>>;
    }>;
  };
}

interface TwentyFourHourPayload {
  code?: number;
  errorMsg?: string;
  data?: {
    records?: Array<{
      timestamp?: string;
      updatedTimestamp?: string;
      general?: {
        temperature?: {
          low?: number | string;
          high?: number | string;
        };
      };
      periods?: Array<{
        timePeriod?: {
          start?: string;
          text?: string;
        };
        regions?: Record<string, { text?: string; code?: string }>;
      }>;
    }>;
  };
}

interface FourDayPayload {
  items?: Array<{
    update_timestamp?: string;
    timestamp?: string;
    forecasts?: Array<{
      date?: string;
      timestamp?: string;
      forecast?: string;
      temperature?: {
        low?: number | string;
        high?: number | string;
      };
    }>;
  }>;
}

export interface ForecastPeriod {
  label: string;
  forecast: string;
}

export interface DailyForecast {
  date: string;
  forecast: string;
  temperature_low_c: number | null;
  temperature_high_c: number | null;
}

export interface TwoHourForecastArea {
  name: string;
  latitude: number;
  longitude: number;
}

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
  condition: string;
  observed_at: string;
  source: string;
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
  forecast_periods: ForecastPeriod[];
  daily_forecast: DailyForecast[];
  data_quality: WeatherDataQuality;
}

const weatherSignals: WeatherSignal[] = [
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
];

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const ONE_MINUTE_MS = 60 * 1000;
const FIVE_MINUTES_MS = 5 * ONE_MINUTE_MS;

type Settled<T> =
  | {
      status: 'fulfilled';
      value: T;
    }
  | {
      status: 'rejected';
      reason: unknown;
    };

export class SingaporeWeatherClient {
  private readonly responseCache = new Map<string, { expiresAt: number; value: unknown }>();
  private readonly inflightFetches = new Map<string, Promise<unknown>>();

  constructor(
    private readonly options: {
      baseUrl?: string;
      apiKey?: string;
      timeoutMs?: number;
      userAgent?: string;
      now?: () => Date;
    } = {},
  ) {}

  async getCurrentWeather(latitude: number, longitude: number): Promise<WeatherSnapshot> {
    const [
      forecastPayload,
      airTemp,
      relativeHumidity,
      rainfall,
      windSpeed,
      windDirection,
      uvIndex,
      psi,
      pm25,
      twentyFourHour,
      fourDay,
    ] = (await runSettled(
      [
        () => this.fetchLatestForecastPayload(),
        () => this.fetchNearestReading('air-temperature', latitude, longitude),
        () => this.fetchNearestReading('relative-humidity', latitude, longitude),
        () => this.fetchNearestReading('rainfall', latitude, longitude),
        () => this.fetchNearestReading('wind-speed', latitude, longitude),
        () => this.fetchNearestReading('wind-direction', latitude, longitude),
        () => this.fetchUvIndex(),
        () => this.fetchAirQualityReading('psi', latitude, longitude),
        () => this.fetchAirQualityReading('pm25', latitude, longitude),
        () => this.fetchTwentyFourHourForecast(latitude, longitude),
        () => this.fetchFourDayForecast(),
      ],
      3,
    )) as [
      Settled<ForecastPayload>,
      Settled<{ value: number | null; timestamp: string | null }>,
      Settled<{ value: number | null; timestamp: string | null }>,
      Settled<{ value: number | null; timestamp: string | null }>,
      Settled<{ value: number | null; timestamp: string | null }>,
      Settled<{ value: number | null; timestamp: string | null }>,
      Settled<{ value: number | null; timestamp: string | null }>,
      Settled<{ value: number | null; region: string | null; timestamp: string | null }>,
      Settled<{ value: number | null; region: string | null; timestamp: string | null }>,
      Settled<{
        low: number | null;
        high: number | null;
        periods: ForecastPeriod[];
        timestamp: string | null;
      }>,
      Settled<{ days: DailyForecast[]; timestamp: string | null }>,
    ];

    const usableSignals = new Set<WeatherSignal>();
    const unavailableSignals = new Set<WeatherSignal>();
    const signalTimestamps = new Map<WeatherSignal, string | null>();
    let snapshot = this.emptyForecastSnapshot();

    if (forecastPayload.status === 'fulfilled') {
      try {
        snapshot = this.snapshotFromPayload(forecastPayload.value, latitude, longitude);
        if (snapshot.condition && snapshot.condition !== 'Unavailable') {
          usableSignals.add('two_hour_forecast');
          signalTimestamps.set('two_hour_forecast', snapshot.observed_at);
        } else {
          unavailableSignals.add('two_hour_forecast');
        }
      } catch {
        unavailableSignals.add('two_hour_forecast');
      }
    } else {
      unavailableSignals.add('two_hour_forecast');
    }

    const timestamps: (string | null)[] = [snapshot.observed_at];

    applyReadingSignal(airTemp, 'air_temperature', (value) => {
      snapshot.temperature_c = value;
    });
    applyReadingSignal(relativeHumidity, 'relative_humidity', (value) => {
      snapshot.humidity_percent = value;
    });
    applyReadingSignal(rainfall, 'rainfall', (value) => {
      snapshot.rainfall_mm = value;
    });
    applyReadingSignal(windSpeed, 'wind_speed', (value) => {
      snapshot.wind_speed_knots = value;
    });
    applyReadingSignal(windDirection, 'wind_direction', (value) => {
      snapshot.wind_direction_degrees = value;
    });
    applyReadingSignal(uvIndex, 'uv', (value) => {
      snapshot.uv_index = value;
    });

    if (psi.status === 'fulfilled') {
      snapshot.psi_twenty_four_hourly = psi.value.value;
      snapshot.air_quality_region = psi.value.region;
      timestamps.push(psi.value.timestamp);
      signalTimestamps.set('psi', psi.value.timestamp);
      markSignalValue('psi', psi.value.value);
    } else {
      unavailableSignals.add('psi');
    }

    if (pm25.status === 'fulfilled') {
      snapshot.pm25_one_hourly = pm25.value.value;
      snapshot.air_quality_region = snapshot.air_quality_region ?? pm25.value.region;
      timestamps.push(pm25.value.timestamp);
      signalTimestamps.set('pm25', pm25.value.timestamp);
      markSignalValue('pm25', pm25.value.value);
    } else {
      unavailableSignals.add('pm25');
    }

    if (twentyFourHour.status === 'fulfilled') {
      snapshot.forecast_low_c = twentyFourHour.value.low;
      snapshot.forecast_high_c = twentyFourHour.value.high;
      snapshot.forecast_periods = twentyFourHour.value.periods;
      timestamps.push(twentyFourHour.value.timestamp);
      signalTimestamps.set('twenty_four_hour_forecast', twentyFourHour.value.timestamp);
      if (
        isFiniteNumber(twentyFourHour.value.low) ||
        isFiniteNumber(twentyFourHour.value.high) ||
        twentyFourHour.value.periods.length > 0
      ) {
        usableSignals.add('twenty_four_hour_forecast');
      } else {
        unavailableSignals.add('twenty_four_hour_forecast');
      }
    } else {
      unavailableSignals.add('twenty_four_hour_forecast');
    }

    if (fourDay.status === 'fulfilled') {
      snapshot.daily_forecast = fourDay.value.days;
      timestamps.push(fourDay.value.timestamp);
      signalTimestamps.set('four_day_forecast', fourDay.value.timestamp);
      if (fourDay.value.days.length > 0) {
        usableSignals.add('four_day_forecast');
      } else {
        unavailableSignals.add('four_day_forecast');
      }
    } else {
      unavailableSignals.add('four_day_forecast');
    }

    const latest = latestTimestamp(timestamps);
    if (latest) {
      snapshot.observed_at = latest;
    }

    const now = (this.options.now ?? (() => new Date()))();
    const staleSignals = weatherSignals.filter(
      (signal) =>
        usableSignals.has(signal) && isStaleSignal(signal, signalTimestamps.get(signal), now),
    );

    snapshot.data_quality = {
      status: refreshStatus(usableSignals.size, unavailableSignals.size),
      last_refreshed_at: now.toISOString(),
      unavailable_signals: weatherSignals.filter((signal) => unavailableSignals.has(signal)),
      freshness_status:
        usableSignals.size === 0 ? 'unknown' : staleSignals.length > 0 ? 'stale' : 'fresh',
      stale_signals: staleSignals,
    };

    return snapshot;

    function applyReadingSignal(
      result: Settled<{ value: number | null; timestamp: string | null }>,
      signal: WeatherSignal,
      assign: (value: number | null) => void,
    ) {
      if (result.status === 'fulfilled') {
        assign(result.value.value);
        timestamps.push(result.value.timestamp);
        signalTimestamps.set(signal, result.value.timestamp);
        markSignalValue(signal, result.value.value);
        return;
      }
      unavailableSignals.add(signal);
    }

    function markSignalValue(signal: WeatherSignal, value: number | null) {
      if (isFiniteNumber(value)) {
        usableSignals.add(signal);
      } else {
        unavailableSignals.add(signal);
      }
    }
  }

  async fetchLatestForecastPayload(): Promise<ForecastPayload> {
    return this.fetchJson(`${this.apiBaseUrl()}/v2/real-time/api/two-hr-forecast`);
  }

  async listTwoHourForecastAreas(): Promise<TwoHourForecastArea[]> {
    const payload = await this.fetchLatestForecastPayload();
    return forecastAreasFromPayload(payload).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getTwoHourForecastAreaByName(name: string): Promise<TwoHourForecastArea> {
    const normalizedName = normalizeAreaName(name);
    const area = (await this.listTwoHourForecastAreas()).find(
      (candidate) => normalizeAreaName(candidate.name) === normalizedName,
    );
    if (!area) {
      throw new WeatherProviderError('Forecast area not found');
    }
    return area;
  }

  async getNearestTwoHourForecastArea(
    latitude: number,
    longitude: number,
  ): Promise<TwoHourForecastArea> {
    const payload = await this.fetchLatestForecastPayload();
    if (payload.code !== undefined && payload.code !== 0) {
      throw new WeatherProviderError(payload.errorMsg ?? 'Weather provider returned an error');
    }

    const nearestArea = nearestAreaFromMetadata(
      forecastAreasFromPayload(payload),
      latitude,
      longitude,
    );
    if (!nearestArea) {
      throw new WeatherProviderError('Forecast response has no area metadata');
    }

    return nearestArea;
  }

  async fetchNearestReading(
    endpoint:
      | 'air-temperature'
      | 'relative-humidity'
      | 'rainfall'
      | 'wind-speed'
      | 'wind-direction',
    latitude: number,
    longitude: number,
  ): Promise<{ value: number | null; timestamp: string | null }> {
    const payload = await this.fetchReadingPayload(endpoint);
    if (payload.code !== undefined && payload.code !== 0) {
      throw new WeatherProviderError(
        payload.errorMsg ?? `Weather provider returned an error for ${endpoint}`,
      );
    }

    const stations = payload.data?.stations ?? [];
    const latestReading = payload.data?.readings?.[0];
    const values = latestReading?.data ?? [];
    if (stations.length === 0 || values.length === 0) {
      return { value: null, timestamp: latestReading?.timestamp ?? null };
    }

    const valueByStation = new Map(
      values
        .map((entry) => [entry.stationId, Number(entry.value)] as const)
        .filter((entry): entry is [string, number] => Boolean(entry[0]) && !Number.isNaN(entry[1])),
    );
    const station = nearestStation(stations, latitude, longitude, valueByStation);
    return {
      value: station ? (valueByStation.get(station.id) ?? null) : null,
      timestamp: latestReading?.timestamp ?? null,
    };
  }

  async fetchReadingPayload(endpoint: string): Promise<ReadingPayload> {
    return this.fetchJson(`${this.apiBaseUrl()}/v2/real-time/api/${endpoint}`);
  }

  async fetchUvIndex(): Promise<{
    value: number | null;
    timestamp: string | null;
  }> {
    const payload = await this.fetchJson<UvPayload>(`${this.apiBaseUrl()}/v2/real-time/api/uv`);
    if (payload.code !== undefined && payload.code !== 0) {
      throw new WeatherProviderError(
        payload.errorMsg ?? 'Weather provider returned an error for uv',
      );
    }

    const record = payload.data?.records?.[0];
    const latest = record?.index?.[0];
    return {
      value: numberOrNull(latest?.value),
      timestamp: record?.updatedTimestamp ?? latest?.hour ?? record?.timestamp ?? null,
    };
  }

  async fetchAirQualityReading(
    signal: 'psi' | 'pm25',
    latitude: number,
    longitude: number,
  ): Promise<{
    value: number | null;
    region: string | null;
    timestamp: string | null;
  }> {
    const payload = await this.fetchJson<PsiPayload>(
      `${this.apiBaseUrl()}/v2/real-time/api/${signal}`,
    );
    if (payload.code !== undefined && payload.code !== 0) {
      throw new WeatherProviderError(
        payload.errorMsg ?? `Weather provider returned an error for ${signal}`,
      );
    }

    const region = nearestRegionName(payload.data?.regionMetadata ?? [], latitude, longitude);
    const item = payload.data?.items?.[0];
    const key = signal === 'psi' ? 'psi_twenty_four_hourly' : 'pm25_one_hourly';
    return {
      value: valueForRegion(item?.readings?.[key], region),
      region,
      timestamp: item?.updatedTimestamp ?? item?.timestamp ?? null,
    };
  }

  async fetchTwentyFourHourForecast(
    latitude: number,
    longitude: number,
  ): Promise<{
    low: number | null;
    high: number | null;
    periods: ForecastPeriod[];
    timestamp: string | null;
  }> {
    const payload = await this.fetchJson<TwentyFourHourPayload>(
      `${this.apiBaseUrl()}/v2/real-time/api/twenty-four-hr-forecast`,
    );
    if (payload.code !== undefined && payload.code !== 0) {
      throw new WeatherProviderError(
        payload.errorMsg ?? 'Weather provider returned a 24-hour forecast error',
      );
    }

    const record = payload.data?.records?.[0];
    const region = nearestRegionName(defaultRegions(), latitude, longitude) ?? 'central';
    return {
      low: numberOrNull(record?.general?.temperature?.low),
      high: numberOrNull(record?.general?.temperature?.high),
      periods: (record?.periods ?? [])
        .map((period) => ({
          label: period.timePeriod?.text ?? '',
          forecast: period.regions?.[region]?.text ?? period.regions?.central?.text ?? '',
        }))
        .filter((period) => period.label && period.forecast),
      timestamp: record?.updatedTimestamp ?? record?.timestamp ?? null,
    };
  }

  async fetchFourDayForecast(): Promise<{
    days: DailyForecast[];
    timestamp: string | null;
  }> {
    const payload = await this.fetchJson<FourDayPayload>(
      `${this.legacyApiBaseUrl()}/v1/environment/4-day-weather-forecast`,
    );
    const item = payload.items?.[0];
    return {
      days: (item?.forecasts ?? [])
        .map((forecast) => ({
          date: forecast.date ?? forecast.timestamp ?? '',
          forecast: forecast.forecast ?? '',
          temperature_low_c: numberOrNull(forecast.temperature?.low),
          temperature_high_c: numberOrNull(forecast.temperature?.high),
        }))
        .filter((forecast) => forecast.date && forecast.forecast),
      timestamp: item?.update_timestamp ?? item?.timestamp ?? null,
    };
  }

  private apiBaseUrl(): string {
    return this.options.baseUrl ?? 'https://api-open.data.gov.sg';
  }

  private legacyApiBaseUrl(): string {
    return 'https://api.data.gov.sg';
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const now = Date.now();
    const cached = this.responseCache.get(url);
    if (cached && cached.expiresAt > now) return cached.value as T;

    const inflight = this.inflightFetches.get(url);
    if (inflight) return (await inflight) as T;

    const request = this.fetchJsonUncached<T>(url);
    this.inflightFetches.set(url, request as Promise<unknown>);
    try {
      const value = await request;
      this.responseCache.set(url, {
        value,
        expiresAt: now + providerCacheTtlMs(url),
      });
      return value;
    } finally {
      this.inflightFetches.delete(url);
    }
  }

  private async fetchJsonUncached<T>(url: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 8000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent':
            this.options.userAgent ?? 'sg-weather-ops-dashboard/0.1 (educational project)',
          ...(this.options.apiKey ? { 'x-api-key': this.options.apiKey } : {}),
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new WeatherProviderError('Weather provider rate limit reached (HTTP 429)');
        }
        if (response.status === 401 || response.status === 403) {
          throw new WeatherProviderError('Weather provider rejected request (check API key)');
        }
        throw new WeatherProviderError(`Weather provider returned HTTP ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof WeatherProviderError) throw error;
      throw new WeatherProviderError('Unable to reach weather provider');
    } finally {
      clearTimeout(timeout);
    }
  }

  snapshotFromPayload(
    payload: ForecastPayload,
    latitude: number,
    longitude: number,
  ): WeatherSnapshot {
    if (payload.code !== undefined && payload.code !== 0) {
      throw new WeatherProviderError(payload.errorMsg ?? 'Weather provider returned an error');
    }

    const root = payload.data ?? payload;
    const areaMetadata = root.area_metadata ?? [];
    const items = root.items ?? [];
    if (items.length === 0) {
      throw new WeatherProviderError('Forecast response has no items');
    }

    const latestItem = items[0];
    const forecasts = latestItem.forecasts ?? [];
    if (forecasts.length === 0) {
      throw new WeatherProviderError('Forecast item has no area forecasts');
    }

    const forecastByArea = new Map(
      forecasts
        .filter((entry) => entry.area && entry.forecast)
        .map((entry) => [entry.area as string, entry.forecast as string]),
    );

    const nearestArea = nearestAreaFromMetadata(
      forecastAreasFromMetadata(areaMetadata),
      latitude,
      longitude,
    );
    if (nearestArea && forecastByArea.has(nearestArea.name)) {
      return {
        condition: forecastByArea.get(nearestArea.name) as string,
        observed_at: latestItem.update_timestamp ?? latestItem.timestamp ?? '',
        source: 'api-open.data.gov.sg',
        area: nearestArea.name,
        valid_period_text: latestItem.valid_period?.text ?? null,
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
        data_quality: unknownDataQuality(),
      };
    }

    const fallback = forecasts[0];
    return {
      condition: fallback.forecast ?? 'Unknown',
      observed_at: latestItem.update_timestamp ?? latestItem.timestamp ?? '',
      source: 'api-open.data.gov.sg',
      area: fallback.area ?? null,
      valid_period_text: latestItem.valid_period?.text ?? null,
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
      data_quality: unknownDataQuality(),
    };
  }

  private emptyForecastSnapshot(): WeatherSnapshot {
    return {
      condition: 'Unavailable',
      observed_at: '',
      source: 'api-open.data.gov.sg',
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
      data_quality: unknownDataQuality(),
    };
  }
}

async function runSettled(
  tasks: Array<() => Promise<unknown>>,
  concurrency: number,
): Promise<Array<Settled<unknown>>> {
  const results: Array<Settled<unknown>> = [];
  let nextIndex = 0;
  const workerCount = Math.max(1, Math.min(concurrency, tasks.length));

  async function runWorker() {
    while (nextIndex < tasks.length) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        results[index] = { status: 'fulfilled', value: await tasks[index]() };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return results;
}

function refreshStatus(usableCount: number, unavailableCount: number): RefreshStatus {
  if (usableCount === 0) return 'unavailable';
  return unavailableCount === 0 ? 'complete' : 'partial';
}

function unknownDataQuality(): WeatherDataQuality {
  return {
    status: 'unknown',
    last_refreshed_at: null,
    unavailable_signals: [],
    freshness_status: 'unknown',
    stale_signals: [],
  };
}

function providerCacheTtlMs(url: string): number {
  if (url.includes('/two-hr-forecast')) return FIVE_MINUTES_MS;
  if (url.includes('/twenty-four-hr-forecast')) return FIVE_MINUTES_MS;
  if (url.includes('/4-day-weather-forecast')) return TWELVE_HOURS_MS;
  return ONE_MINUTE_MS;
}

function isStaleSignal(signal: WeatherSignal, timestamp: string | null | undefined, now: Date) {
  if (!timestamp) return false;
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return false;
  const ageMs = now.getTime() - parsed.getTime();
  if (ageMs < 0) return false;
  if (signal === 'four_day_forecast') return ageMs > TWENTY_FOUR_HOURS_MS;
  if (signal === 'twenty_four_hour_forecast') return ageMs > TWELVE_HOURS_MS;
  return ageMs > TWO_HOURS_MS;
}

function forecastAreasFromPayload(payload: ForecastPayload): TwoHourForecastArea[] {
  if (payload.code !== undefined && payload.code !== 0) {
    throw new WeatherProviderError(payload.errorMsg ?? 'Weather provider returned an error');
  }

  const root = payload.data ?? payload;
  const areas = forecastAreasFromMetadata(root.area_metadata ?? []);
  if (areas.length === 0) {
    throw new WeatherProviderError('Forecast response has no area metadata');
  }
  return areas;
}

function forecastAreasFromMetadata(areaMetadata: AreaMetadata[]): TwoHourForecastArea[] {
  const byName = new Map<string, TwoHourForecastArea>();
  for (const area of areaMetadata) {
    const lat = Number(area.label_location?.latitude);
    const lon = Number(area.label_location?.longitude);
    if (!area.name || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    byName.set(area.name, { name: area.name, latitude: lat, longitude: lon });
  }
  return [...byName.values()];
}

function nearestAreaFromMetadata(
  areaMetadata: TwoHourForecastArea[],
  latitude: number,
  longitude: number,
): TwoHourForecastArea | null {
  let nearest: (TwoHourForecastArea & { distance: number }) | null = null;

  for (const area of areaMetadata) {
    const lat = area.latitude;
    const lon = area.longitude;

    const distance = (lat - latitude) ** 2 + (lon - longitude) ** 2;
    if (!nearest || distance < nearest.distance) {
      nearest = { name: area.name, latitude: lat, longitude: lon, distance };
    }
  }

  if (!nearest) return null;
  return {
    name: nearest.name,
    latitude: nearest.latitude,
    longitude: nearest.longitude,
  };
}

function normalizeAreaName(name: string): string {
  return name.trim().toLowerCase();
}

function nearestRegionName(
  regions: RegionMetadata[],
  latitude: number,
  longitude: number,
): string | null {
  let nearest: { name: string; distance: number } | null = null;

  for (const region of regions) {
    const lat = Number(region.labelLocation?.latitude);
    const lon = Number(region.labelLocation?.longitude);
    if (!region.name || Number.isNaN(lat) || Number.isNaN(lon)) continue;

    const distance = (lat - latitude) ** 2 + (lon - longitude) ** 2;
    if (!nearest || distance < nearest.distance) {
      nearest = { name: region.name, distance };
    }
  }

  return nearest?.name ?? null;
}

function nearestStation(
  stations: WeatherStation[],
  latitude: number,
  longitude: number,
  valueByStation: Map<string, number>,
): { id: string; distance: number } | null {
  let nearest: { id: string; distance: number } | null = null;

  for (const station of stations) {
    const lat = Number(station.location?.latitude);
    const lon = Number(station.location?.longitude);
    if (!station.id || Number.isNaN(lat) || Number.isNaN(lon) || !valueByStation.has(station.id))
      continue;

    const distance = (lat - latitude) ** 2 + (lon - longitude) ** 2;
    if (!nearest || distance < nearest.distance) {
      nearest = { id: station.id, distance };
    }
  }

  return nearest;
}

function latestTimestamp(timestamps: Array<string | null>): string | null {
  return (
    timestamps
      .filter((timestamp): timestamp is string => Boolean(timestamp))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null
  );
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function numberOrNull(value: number | string | undefined): number | null {
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
}

function valueForRegion(
  values: Record<string, number | string> | undefined,
  region: string | null,
): number | null {
  if (!values || !region) return null;
  return numberOrNull(values[region]);
}

function defaultRegions(): RegionMetadata[] {
  return [
    { name: 'west', labelLocation: { latitude: 1.35735, longitude: 103.7 } },
    { name: 'north', labelLocation: { latitude: 1.41803, longitude: 103.82 } },
    {
      name: 'central',
      labelLocation: { latitude: 1.35735, longitude: 103.82 },
    },
    { name: 'south', labelLocation: { latitude: 1.29587, longitude: 103.82 } },
    { name: 'east', labelLocation: { latitude: 1.35735, longitude: 103.94 } },
  ];
}
