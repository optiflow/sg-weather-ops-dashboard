import type { CreateLocationPayload, Location, LocationFromPositionResponse } from './types';

const API_BASE = '/api';

interface LocationsResponse {
  locations: Location[];
}

interface ApiError {
  detail?: string;
}

const SERVER_UNAVAILABLE_MESSAGE = 'Weather server is not available. Restart npm run dev.';

function isJsonResponse(response: Response) {
  const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
  return contentType.includes('application/json') || contentType.includes('+json');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  }).catch(() => {
    throw new Error(SERVER_UNAVAILABLE_MESSAGE);
  });
  if (!response.ok) {
    if (!isJsonResponse(response)) {
      throw new Error(SERVER_UNAVAILABLE_MESSAGE);
    }
    const error = (await response.json().catch(() => ({}))) as ApiError;
    throw new Error(error.detail || 'Request failed');
  }
  if (response.status === 204) return null as T;
  if (!isJsonResponse(response)) {
    throw new Error(SERVER_UNAVAILABLE_MESSAGE);
  }
  return (await response.json()) as T;
}

export const listLocations = () => request<LocationsResponse>('/locations');

export const createLocation = (payload: CreateLocationPayload) =>
  request<Location>('/locations', { method: 'POST', body: JSON.stringify(payload) });

export const createLocationFromPosition = (payload: CreateLocationPayload) =>
  request<LocationFromPositionResponse>('/locations/from-position', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const deleteLocation = (id: number) =>
  request<void>(`/locations/${id}`, { method: 'DELETE' });

export const refreshLocation = (id: number) =>
  request<Location>(`/locations/${id}/refresh`, { method: 'POST' });

export function logInteraction(event: string, metadata: object = {}) {
  const page = typeof window === 'undefined' ? undefined : window.location.pathname;
  void fetch(`${API_BASE}/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, metadata, page }),
    keepalive: true,
  }).catch(() => {});
}
