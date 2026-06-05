import type { WeatherSignal, WeatherSnapshot } from './types';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'unavailable';

export interface RiskDriver {
  key: string;
  level: Exclude<RiskLevel, 'low' | 'unavailable'>;
  label: string;
  value: string;
  detail: string;
  priority: number;
}

export interface WeatherRiskBrief {
  level: RiskLevel;
  label: string;
  summary: string;
  freshnessLabel: string;
  availableSignals: number;
  totalSignals: number;
  drivers: RiskDriver[];
}

interface RiskOptions {
  area?: string;
  now?: Date;
}

const TOTAL_SIGNALS = 11;
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

const providerSignalLabels: Record<WeatherSignal, string> = {
  two_hour_forecast: '2-hour forecast',
  air_temperature: 'temperature',
  relative_humidity: 'humidity',
  rainfall: 'rainfall',
  wind_speed: 'wind speed',
  wind_direction: 'wind direction',
  uv: 'UV',
  psi: 'PSI',
  pm25: 'PM2.5',
  twenty_four_hour_forecast: '24-hour forecast',
  four_day_forecast: '4-day forecast',
};

export function buildWeatherRiskBrief(
  weather: WeatherSnapshot,
  options: RiskOptions = {},
): WeatherRiskBrief {
  const now = options.now ?? new Date();
  const area = options.area ?? weather.area ?? 'this location';
  const unavailableSignals = new Set(weather.data_quality?.unavailable_signals ?? []);
  const inferredMissing = inferredMissingSignals(weather);
  for (const signal of inferredMissing) unavailableSignals.add(signal);

  const availableSignals = Math.max(0, TOTAL_SIGNALS - unavailableSignals.size);
  const freshness = freshnessState(weather, now);

  if (
    weather.data_quality?.status === 'not_refreshed' ||
    weather.condition === 'Not refreshed' ||
    weather.source === 'not-refreshed'
  ) {
    return unavailableBrief(
      'Refresh this location to build a risk brief from current weather data.',
    );
  }

  if (freshness.level === 'unavailable' || weather.data_quality?.status === 'unavailable') {
    return unavailableBrief(
      'Refresh this location to build a risk brief from current weather data.',
    );
  }

  const drivers = [
    rainDriver(weather),
    uvDriver(weather),
    airQualityDriver(weather),
    windDriver(weather),
    heatDriver(weather),
    freshness.driver,
    coverageDriver(weather, unavailableSignals),
  ]
    .filter((driver): driver is RiskDriver => Boolean(driver))
    .sort((a, b) => b.priority - a.priority);

  const topDriver = drivers[0];
  const level: RiskLevel = drivers.some((driver) => driver.level === 'high')
    ? 'high'
    : topDriver
      ? 'moderate'
      : 'low';
  const label = labelForLevel(level);
  const summary =
    level === 'high'
      ? `High attention: ${topDriver.label.toLowerCase()} is the main driver for ${area}.`
      : level === 'moderate'
        ? `Watch: ${topDriver.label.toLowerCase()} may affect outdoor plans for ${area}.`
        : `No major weather drivers in the latest snapshot for ${area}.`;

  return {
    level,
    label,
    summary,
    freshnessLabel: freshness.label,
    availableSignals,
    totalSignals: TOTAL_SIGNALS,
    drivers: drivers.slice(0, 3),
  };

  function unavailableBrief(summary: string): WeatherRiskBrief {
    return {
      level: 'unavailable',
      label: labelForLevel('unavailable'),
      summary,
      freshnessLabel: freshness.label,
      availableSignals,
      totalSignals: TOTAL_SIGNALS,
      drivers: [],
    };
  }
}

export function signalLabel(signal: WeatherSignal): string {
  return providerSignalLabels[signal];
}

function rainDriver(weather: WeatherSnapshot): RiskDriver | null {
  const text = [
    weather.condition,
    ...(weather.forecast_periods ?? []).map((period) => period.forecast),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const rainfall = weather.rainfall_mm;
  const hasHighText = /\b(thundery|thunder|storm|heavy)\b/.test(text);
  const hasModerateText = /\b(showers|rain|drizzle)\b/.test(text);

  if (hasHighText || (isFiniteNumber(rainfall) && rainfall >= 10)) {
    return {
      key: 'rain',
      level: 'high',
      label: 'Rain and storms',
      value: isFiniteNumber(rainfall)
        ? `${rainfall.toFixed(1)} mm`
        : weather.condition || 'storm risk',
      detail: 'Wet or thundery conditions may disrupt outdoor activity.',
      priority: 100,
    };
  }

  if (hasModerateText || (isFiniteNumber(rainfall) && rainfall >= 2.5)) {
    return {
      key: 'rain',
      level: 'moderate',
      label: 'Rain watch',
      value: isFiniteNumber(rainfall)
        ? `${rainfall.toFixed(1)} mm`
        : weather.condition || 'rain risk',
      detail: 'Monitor showers before outdoor movement.',
      priority: 90,
    };
  }

  return null;
}

function uvDriver(weather: WeatherSnapshot): RiskDriver | null {
  const uv = weather.uv_index;
  if (!isFiniteNumber(uv) || uv < 6) return null;
  return {
    key: 'uv',
    level: uv >= 8 ? 'high' : 'moderate',
    label: uv >= 8 ? 'High UV' : 'UV watch',
    value: uv.toFixed(0),
    detail: uv >= 8 ? 'Limit direct sun exposure.' : 'Plan shade for longer outdoor activity.',
    priority: uv >= 8 ? 85 : 55,
  };
}

function airQualityDriver(weather: WeatherSnapshot): RiskDriver | null {
  const psi = weather.psi_twenty_four_hourly;
  const pm25 = weather.pm25_one_hourly;
  if ((isFiniteNumber(psi) && psi > 100) || (isFiniteNumber(pm25) && pm25 >= 55)) {
    return {
      key: 'air',
      level: 'high',
      label: 'Poor air quality',
      value: isFiniteNumber(psi) ? `PSI ${psi.toFixed(0)}` : `PM2.5 ${pm25?.toFixed(0)}`,
      detail: 'Consider reducing prolonged outdoor exposure.',
      priority: 80,
    };
  }
  if ((isFiniteNumber(psi) && psi >= 51) || (isFiniteNumber(pm25) && pm25 >= 35)) {
    return {
      key: 'air',
      level: 'moderate',
      label: 'Air quality watch',
      value: isFiniteNumber(psi) ? `PSI ${psi.toFixed(0)}` : `PM2.5 ${pm25?.toFixed(0)}`,
      detail: 'Air quality may affect sensitive outdoor plans.',
      priority: 50,
    };
  }
  return null;
}

function windDriver(weather: WeatherSnapshot): RiskDriver | null {
  const speedKmh = isFiniteNumber(weather.wind_speed_knots)
    ? weather.wind_speed_knots * 1.852
    : null;
  if (!isFiniteNumber(speedKmh) || speedKmh < 25) return null;
  return {
    key: 'wind',
    level: speedKmh >= 40 ? 'high' : 'moderate',
    label: speedKmh >= 40 ? 'Strong wind' : 'Wind watch',
    value: `${Math.round(speedKmh)} km/h`,
    detail: speedKmh >= 40 ? 'Secure loose outdoor items.' : 'Check exposed outdoor activity.',
    priority: speedKmh >= 40 ? 75 : 45,
  };
}

function heatDriver(weather: WeatherSnapshot): RiskDriver | null {
  const current = weather.temperature_c;
  const high = weather.forecast_high_c;
  const humidity = weather.humidity_percent;
  const highHeat =
    (isFiniteNumber(high) && high >= 35) ||
    (isFiniteNumber(current) && isFiniteNumber(humidity) && current >= 34 && humidity >= 75);
  const moderateHeat =
    (isFiniteNumber(high) && high >= 33) ||
    (isFiniteNumber(current) && isFiniteNumber(humidity) && current >= 31 && humidity >= 75);

  if (!highHeat && !moderateHeat) return null;
  return {
    key: 'heat',
    level: highHeat ? 'high' : 'moderate',
    label: highHeat ? 'Heat stress' : 'Heat watch',
    value: isFiniteNumber(high) ? `High ${Math.round(high)} C` : `${Math.round(current ?? 0)} C`,
    detail: highHeat
      ? 'Plan hydration and shaded breaks.'
      : 'Watch heat for extended outdoor work.',
    priority: highHeat ? 70 : 40,
  };
}

function freshnessState(
  weather: WeatherSnapshot,
  now: Date,
): { label: string; level: RiskLevel; driver: RiskDriver | null } {
  const observedAt = parseTime(weather.observed_at);
  if (!observedAt) {
    return { label: 'No observation time', level: 'unavailable', driver: null };
  }

  const ageMs = now.getTime() - observedAt.getTime();
  if (ageMs > TWELVE_HOURS_MS) {
    return { label: 'Older than 12 hours', level: 'unavailable', driver: null };
  }
  if (ageMs > TWO_HOURS_MS) {
    return {
      label: 'Older than 2 hours',
      level: 'moderate',
      driver: {
        key: 'freshness',
        level: 'moderate',
        label: 'Stale snapshot',
        value: '2h+',
        detail: 'Refresh before making time-sensitive decisions.',
        priority: 30,
      },
    };
  }

  return { label: 'Fresh snapshot', level: 'low', driver: null };
}

function coverageDriver(
  weather: WeatherSnapshot,
  unavailableSignals: Set<WeatherSignal>,
): RiskDriver | null {
  if (weather.data_quality?.status === 'partial' || unavailableSignals.size >= 3) {
    return {
      key: 'coverage',
      level: 'moderate',
      label: 'Partial data',
      value: `${unavailableSignals.size} missing`,
      detail: 'Some provider signals are unavailable in this snapshot.',
      priority: 20,
    };
  }
  if (weather.data_quality?.status === 'unknown') {
    return {
      key: 'coverage',
      level: 'moderate',
      label: 'Unknown data trust',
      value: 'legacy row',
      detail: 'Refresh to calculate current data coverage.',
      priority: 15,
    };
  }
  return null;
}

function inferredMissingSignals(weather: WeatherSnapshot): WeatherSignal[] {
  const missing: WeatherSignal[] = [];
  if (!weather.condition || weather.condition === 'Unavailable') missing.push('two_hour_forecast');
  if (!isFiniteNumber(weather.temperature_c)) missing.push('air_temperature');
  if (!isFiniteNumber(weather.humidity_percent)) missing.push('relative_humidity');
  if (!isFiniteNumber(weather.rainfall_mm)) missing.push('rainfall');
  if (!isFiniteNumber(weather.wind_speed_knots)) missing.push('wind_speed');
  if (!isFiniteNumber(weather.wind_direction_degrees)) missing.push('wind_direction');
  if (!isFiniteNumber(weather.uv_index)) missing.push('uv');
  if (!isFiniteNumber(weather.psi_twenty_four_hourly)) missing.push('psi');
  if (!isFiniteNumber(weather.pm25_one_hourly)) missing.push('pm25');
  if (!weather.forecast_periods?.length) missing.push('twenty_four_hour_forecast');
  if (!weather.daily_forecast?.length) missing.push('four_day_forecast');
  return missing;
}

function labelForLevel(level: RiskLevel): string {
  if (level === 'low') return 'Low';
  if (level === 'moderate') return 'Moderate';
  if (level === 'high') return 'High';
  return 'Unavailable';
}

function parseTime(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
