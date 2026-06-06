import type { Location } from './types';

export function coordinatesText(location: Pick<Location, 'latitude' | 'longitude'>): string {
  return `${location.latitude.toFixed(3)}, ${location.longitude.toFixed(3)}`;
}

export function locationTitle(location: Location): string {
  return location.label?.trim() || location.weather.area || coordinatesText(location);
}

export function locationSecondary(location: Location, fallback: string): string {
  const customLabel = location.label?.trim();
  if (customLabel) return location.weather.area || coordinatesText(location);
  return fallback;
}
