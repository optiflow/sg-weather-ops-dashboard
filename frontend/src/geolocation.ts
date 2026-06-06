import type { BrowserPositionPayload } from './types';

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 10000,
  maximumAge: 300000,
};

export function getBrowserPosition(): Promise<BrowserPositionPayload> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return Promise.reject(new Error('Browser location is not available here.'));
  }
  if (!isTrustedGeolocationOrigin()) {
    return Promise.reject(new Error('Use HTTPS or localhost to access browser location.'));
  }
  if (!navigator.geolocation) {
    return Promise.reject(new Error('Browser location is not supported.'));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(new Error(messageForGeolocationError(error)));
      },
      GEOLOCATION_OPTIONS,
    );
  });
}

function isTrustedGeolocationOrigin(): boolean {
  if (window.isSecureContext) return true;

  const hostname = window.location.hostname.toLowerCase();
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname.endsWith('.localhost')
  );
}

function messageForGeolocationError(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) {
    return 'Allow location access to add your nearest forecast area.';
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return 'Your location is unavailable right now.';
  }
  if (error.code === error.TIMEOUT) {
    return 'Location request timed out. Try again.';
  }
  return 'Could not read your browser location.';
}
