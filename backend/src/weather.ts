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
      airQuality,
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
        () => this.fetchAirQuality(latitude, longitude),
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
      Settled<{
        psi: number | null;
        pm25: number | null;
        region: string | null;
        timestamp: string | null;
      }>,
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
    let snapshot = this.emptyForecastSnapshot();

    if (forecastPayload.status === 'fulfilled') {
      try {
        snapshot = this.snapshotFromPayload(forecastPayload.value, latitude, longitude);
        if (snapshot.condition && snapshot.condition !== 'Unavailable') {
          usableSignals.add('two_hour_forecast');
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

    if (airQuality.status === 'fulfilled') {
      snapshot.psi_twenty_four_hourly = airQuality.value.psi;
      snapshot.pm25_one_hourly = airQuality.value.pm25;
      snapshot.air_quality_region = airQuality.value.region;
      timestamps.push(airQuality.value.timestamp);
      markSignalValue('psi', airQuality.value.psi);
      markSignalValue('pm25', airQuality.value.pm25);
    } else {
      unavailableSignals.add('psi');
      unavailableSignals.add('pm25');
    }

    if (twentyFourHour.status === 'fulfilled') {
      snapshot.forecast_low_c = twentyFourHour.value.low;
      snapshot.forecast_high_c = twentyFourHour.value.high;
      snapshot.forecast_periods = twentyFourHour.value.periods;
      timestamps.push(twentyFourHour.value.timestamp);
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

    snapshot.data_quality = {
      status: refreshStatus(usableSignals.size, unavailableSignals.size),
      last_refreshed_at: (this.options.now ?? (() => new Date()))().toISOString(),
      unavailable_signals: weatherSignals.filter((signal) => unavailableSignals.has(signal)),
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

  async getNearestTwoHourForecastArea(
    latitude: number,
    longitude: number,
  ): Promise<TwoHourForecastArea> {
    const payload = await this.fetchLatestForecastPayload();
    if (payload.code !== undefined && payload.code !== 0) {
      throw new WeatherProviderError(payload.errorMsg ?? 'Weather provider returned an error');
    }

    const root = payload.data ?? payload;
    const nearestArea = nearestAreaFromMetadata(root.area_metadata ?? [], latitude, longitude);
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

  async fetchAirQuality(
    latitude: number,
    longitude: number,
  ): Promise<{
    psi: number | null;
    pm25: number | null;
    region: string | null;
    timestamp: string | null;
  }> {
    const psiPayload = await this.fetchJson<PsiPayload>(
      `${this.apiBaseUrl()}/v2/real-time/api/psi`,
    );
    const pm25Payload = await this.fetchJson<PsiPayload>(
      `${this.apiBaseUrl()}/v2/real-time/api/pm25`,
    );
    for (const payload of [psiPayload, pm25Payload]) {
      if (payload.code !== undefined && payload.code !== 0) {
        throw new WeatherProviderError(
          payload.errorMsg ?? 'Weather provider returned an air quality error',
        );
      }
    }

    const region = nearestRegionName(psiPayload.data?.regionMetadata ?? [], latitude, longitude);
    const psiItem = psiPayload.data?.items?.[0];
    const pm25Item = pm25Payload.data?.items?.[0];
    return {
      psi: valueForRegion(psiItem?.readings?.psi_twenty_four_hourly, region),
      pm25: valueForRegion(pm25Item?.readings?.pm25_one_hourly, region),
      region,
      timestamp: latestTimestamp([
        psiItem?.updatedTimestamp ?? psiItem?.timestamp ?? null,
        pm25Item?.updatedTimestamp ?? pm25Item?.timestamp ?? null,
      ]),
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

    const nearestArea = nearestAreaFromMetadata(areaMetadata, latitude, longitude);
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
  };
}

function nearestAreaFromMetadata(
  areaMetadata: AreaMetadata[],
  latitude: number,
  longitude: number,
): TwoHourForecastArea | null {
  let nearest: (TwoHourForecastArea & { distance: number }) | null = null;

  for (const area of areaMetadata) {
    const lat = Number(area.label_location?.latitude);
    const lon = Number(area.label_location?.longitude);
    if (!area.name || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;

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
