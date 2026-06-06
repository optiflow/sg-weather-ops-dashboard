import type { ComponentType, SVGProps } from 'react';
import {
  CloudIcon,
  DropletIcon,
  EyeIcon,
  MoonIcon,
  SunIcon,
  ThunderIcon,
  WindIcon,
} from './components/icons';

export type WeatherIconKind =
  | 'clear'
  | 'cloud'
  | 'rain'
  | 'thunder'
  | 'wind'
  | 'haze'
  | 'night'
  | 'unknown';

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

const iconByKind: Record<WeatherIconKind, IconComponent> = {
  clear: SunIcon,
  cloud: CloudIcon,
  rain: DropletIcon,
  thunder: ThunderIcon,
  wind: WindIcon,
  haze: EyeIcon,
  night: MoonIcon,
  unknown: CloudIcon,
};

export function weatherIconKind(condition: string | null | undefined): WeatherIconKind {
  const normalized = condition?.toLowerCase().trim() ?? '';
  if (!normalized || normalized === 'not refreshed' || normalized === 'unavailable') {
    return 'unknown';
  }
  if (/\b(thundery|thunder|lightning|storm|gust)\b/.test(normalized)) return 'thunder';
  if (/\b(showers?|rain|drizzle)\b/.test(normalized)) return 'rain';
  if (/\b(haze|hazy|mist)\b/.test(normalized)) return 'haze';
  if (/\b(windy|wind)\b/.test(normalized)) return 'wind';
  if (/\b(night)\b/.test(normalized)) return 'night';
  if (/\b(fair|sunny|clear)\b/.test(normalized)) return 'clear';
  return 'cloud';
}

export function WeatherConditionIcon({
  condition,
  className = 'h-5 w-5',
}: {
  condition: string | null | undefined;
  className?: string;
}) {
  const Icon = iconByKind[weatherIconKind(condition)];
  return <Icon className={className} aria-hidden="true" />;
}
