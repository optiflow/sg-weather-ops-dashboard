import type { WeatherSignal, WeatherSnapshot } from './types';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'unavailable';

export interface RiskDriver {
  key: string;
  level: Exclude<RiskLevel, 'low' | 'unavailable'>;
  label: string;
  value: string;
  detail: string;
  advice: string;
  priority: number;
}

export interface WeatherRiskBrief {
  level: RiskLevel;
  label: string;
  headline: string;
  recommendation: string;
  confidenceLabel: string;
  confidenceDetail: string;
  drivers: RiskDriver[];
}

interface RiskOptions {
  area?: string;
  now?: Date;
}

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

  const freshness = freshnessState(weather, now);
  const confidence = confidenceState(weather, freshness, unavailableSignals);

  if (
    weather.data_quality?.status === 'not_refreshed' ||
    weather.condition === 'Not refreshed' ||
    weather.source === 'not-refreshed'
  ) {
    return unavailableBrief(area, confidence);
  }

  if (freshness.level === 'unavailable' || weather.data_quality?.status === 'unavailable') {
    return unavailableBrief(area, confidence);
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
  const headline =
    level === 'high'
      ? `${topDriver.label} could affect plans in ${area}.`
      : level === 'moderate'
        ? `${topDriver.label} may affect outdoor plans in ${area}.`
        : `Outdoor plans look okay in ${area}.`;
  const recommendation =
    topDriver?.advice ?? 'No special action needed; keep an eye on normal weather changes.';

  return {
    level,
    label,
    headline,
    recommendation,
    confidenceLabel: confidence.label,
    confidenceDetail: confidence.detail,
    drivers: drivers.slice(0, 3),
  };
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
      label: 'Rain or thunder',
      value: isFiniteNumber(rainfall)
        ? `${rainfall.toFixed(1)} mm`
        : weather.condition || 'storm risk',
      detail: 'Wet or thundery conditions may disrupt outdoor activity.',
      advice: 'Bring an umbrella and plan for shelter before heading out.',
      priority: 100,
    };
  }

  if (hasModerateText || (isFiniteNumber(rainfall) && rainfall >= 2.5)) {
    return {
      key: 'rain',
      level: 'moderate',
      label: 'Rain or thunder',
      value: isFiniteNumber(rainfall)
        ? `${rainfall.toFixed(1)} mm`
        : weather.condition || 'rain risk',
      detail: 'Monitor showers before outdoor movement.',
      advice: 'Carry rain gear and check the sky before longer outdoor trips.',
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
    label: 'Strong sun',
    value: uv.toFixed(0),
    detail: uv >= 8 ? 'Limit direct sun exposure.' : 'Plan shade for longer outdoor activity.',
    advice:
      uv >= 8
        ? 'Use shade, sunscreen, and a hat if you need to be outside.'
        : 'Use shade or sun protection for longer outdoor plans.',
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
      label: 'Air quality',
      value: isFiniteNumber(psi) ? `PSI ${psi.toFixed(0)}` : `PM2.5 ${pm25?.toFixed(0)}`,
      detail: 'Consider reducing prolonged outdoor exposure.',
      advice: 'Reduce prolonged outdoor activity, especially for sensitive groups.',
      priority: 80,
    };
  }
  if ((isFiniteNumber(psi) && psi >= 51) || (isFiniteNumber(pm25) && pm25 >= 35)) {
    return {
      key: 'air',
      level: 'moderate',
      label: 'Air quality',
      value: isFiniteNumber(psi) ? `PSI ${psi.toFixed(0)}` : `PM2.5 ${pm25?.toFixed(0)}`,
      detail: 'Air quality may affect sensitive outdoor plans.',
      advice: 'Keep outdoor plans flexible if air quality matters to you.',
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
    label: 'Wind',
    value: `${Math.round(speedKmh)} km/h`,
    detail: speedKmh >= 40 ? 'Secure loose outdoor items.' : 'Check exposed outdoor activity.',
    advice:
      speedKmh >= 40
        ? 'Secure loose items and take care in exposed areas.'
        : 'Take care with exposed outdoor activities.',
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
    label: 'Heat',
    value: isFiniteNumber(high) ? `High ${Math.round(high)} C` : `${Math.round(current ?? 0)} C`,
    detail: highHeat
      ? 'Plan hydration and shaded breaks.'
      : 'Watch heat for extended outdoor work.',
    advice: highHeat
      ? 'Hydrate often and plan shaded breaks.'
      : 'Bring water and take breaks during extended outdoor activity.',
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
        label: 'Old update',
        value: '2h+',
        detail: 'Refresh before making time-sensitive decisions.',
        advice: 'Tap Refresh before relying on this for time-sensitive plans.',
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
      label: 'Incomplete readings',
      value: `${unavailableSignals.size} missing`,
      detail: 'Some provider signals are unavailable in this snapshot.',
      advice: 'Use this as a lower-confidence guide and refresh when possible.',
      priority: 20,
    };
  }
  if (weather.data_quality?.status === 'unknown') {
    return {
      key: 'coverage',
      level: 'moderate',
      label: 'Incomplete readings',
      value: 'legacy row',
      detail: 'Refresh to calculate current data coverage.',
      advice: 'Tap Refresh to rebuild this brief with current readings.',
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
  if (level === 'low') return 'Looks okay';
  if (level === 'moderate') return 'Watch conditions';
  if (level === 'high') return 'Take care';
  return 'Refresh needed';
}

function unavailableBrief(area: string, confidence: ConfidenceState): WeatherRiskBrief {
  return {
    level: 'unavailable',
    label: labelForLevel('unavailable'),
    headline: `Refresh ${area} to see the latest weather risk brief.`,
    recommendation: 'Tap Refresh before relying on this location for outdoor plans.',
    confidenceLabel: confidence.label,
    confidenceDetail: confidence.detail,
    drivers: [],
  };
}

interface ConfidenceState {
  label: string;
  detail: string;
}

function confidenceState(
  weather: WeatherSnapshot,
  freshness: ReturnType<typeof freshnessState>,
  unavailableSignals: Set<WeatherSignal>,
): ConfidenceState {
  if (
    weather.data_quality?.status === 'not_refreshed' ||
    weather.condition === 'Not refreshed' ||
    weather.source === 'not-refreshed'
  ) {
    return {
      label: 'No current update',
      detail: 'Refresh this location to check current conditions.',
    };
  }

  if (freshness.level === 'unavailable' || weather.data_quality?.status === 'unavailable') {
    return {
      label: 'Refresh needed',
      detail: 'Current weather readings are not available for this brief.',
    };
  }

  if (freshness.driver) {
    return {
      label: 'Older update',
      detail: 'This observation is more than 2 hours old; refresh before time-sensitive plans.',
    };
  }

  if (weather.data_quality?.status === 'partial' || unavailableSignals.size >= 3) {
    return {
      label: 'Some readings missing',
      detail: 'A few weather readings are unavailable, so treat this as a quick guide.',
    };
  }

  if (weather.data_quality?.status === 'unknown') {
    return {
      label: 'Refresh recommended',
      detail: 'Refresh this saved location to confirm current data coverage.',
    };
  }

  return {
    label: 'Updated recently',
    detail: 'Readings are current enough for a quick outdoor check.',
  };
}

function parseTime(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
