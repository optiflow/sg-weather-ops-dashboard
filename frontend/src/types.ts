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
  forecast_periods: ForecastPeriod[];
  daily_forecast: DailyForecast[];
  data_quality: WeatherDataQuality;
}

export interface Location {
  id: number;
  latitude: number;
  longitude: number;
  created_at: string;
  weather: WeatherSnapshot;
}

export interface CreateLocationPayload {
  latitude: number;
  longitude: number;
}

export interface MatchedArea {
  name: string;
  latitude: number;
  longitude: number;
}

export interface LocationFromPositionResponse {
  location: Location;
  created: boolean;
  matched_area: MatchedArea;
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
  createFromPosition: (payload: CreateLocationPayload) => Promise<LocationFromPositionResponse>;
  refresh: (id: number) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

export interface ProviderProps {
  children: ReactNode;
}
