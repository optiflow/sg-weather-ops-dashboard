import type { ReactNode } from 'react';

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
  forecast_periods: ForecastPeriod[];
  daily_forecast: DailyForecast[];
  data_quality: WeatherDataQuality;
}

export interface Location {
  id: number;
  label: string | null;
  is_favorite: boolean;
  latitude: number;
  longitude: number;
  created_at: string;
  weather: WeatherSnapshot;
}

export interface CreateLocationPayload {
  latitude: number;
  longitude: number;
  label?: string | null;
}

export interface BrowserPositionPayload {
  latitude: number;
  longitude: number;
}

export interface MatchedArea {
  name: string;
  latitude: number;
  longitude: number;
}

export type ForecastArea = MatchedArea;

export interface CreateLocationFromAreaPayload {
  name: string;
  label?: string | null;
}

export interface UpdateLocationPayload {
  label?: string | null;
  is_favorite?: boolean;
}

export interface LocationFromAreaResponse {
  location: Location;
  created: boolean;
  matched_area: MatchedArea;
}

export interface LocationFromPositionResponse {
  location: Location;
  created: boolean;
  matched_area: MatchedArea;
}

export interface WeatherObservation {
  id: number;
  location_id: number;
  refresh_attempt_id: number;
  captured_at: string;
  observed_at: string | null;
  weather: WeatherSnapshot;
}

export interface LocationHistoryResponse {
  observations: WeatherObservation[];
}

export interface StoreValue {
  locations: Location[];
  selectedId: number | null;
  isAdding: boolean;
  isLoading: boolean;
  refreshingId: number | null;
  error: unknown;
  select: (id: number | null) => void;
  setAdding: (isAdding: boolean) => void;
  create: (payload: CreateLocationPayload) => Promise<void>;
  createFromArea: (payload: CreateLocationFromAreaPayload) => Promise<LocationFromAreaResponse>;
  createFromPosition: (payload: BrowserPositionPayload) => Promise<LocationFromPositionResponse>;
  update: (id: number, payload: UpdateLocationPayload) => Promise<Location>;
  refresh: (id: number) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

export interface ProviderProps {
  children: ReactNode;
}
