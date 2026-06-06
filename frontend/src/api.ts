import type {
  BrowserPositionPayload,
  CreateLocationFromAreaPayload,
  CreateLocationPayload,
  ForecastArea,
  Location,
  LocationFromAreaResponse,
  LocationFromPositionResponse,
  LocationHistoryResponse,
  UpdateLocationPayload,
} from './types';

const API_BASE = '/api';

interface LocationsResponse {
  locations: Location[];
}

interface ForecastAreasResponse {
  areas: ForecastArea[];
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

export const listForecastAreas = () => request<ForecastAreasResponse>('/forecast-areas');

export const createLocation = (payload: CreateLocationPayload) =>
  request<Location>('/locations', { method: 'POST', body: JSON.stringify(payload) });

export const createLocationFromArea = (payload: CreateLocationFromAreaPayload) =>
  request<LocationFromAreaResponse>('/locations/from-area', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const createLocationFromPosition = (payload: BrowserPositionPayload) =>
  request<LocationFromPositionResponse>('/locations/from-position', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const deleteLocation = (id: number) =>
  request<void>(`/locations/${id}`, { method: 'DELETE' });

export const refreshLocation = (id: number) =>
  request<Location>(`/locations/${id}/refresh`, { method: 'POST' });

export const listLocationHistory = (id: number, limit = 24) =>
  request<LocationHistoryResponse>(`/locations/${id}/history?limit=${limit}`);

export const updateLocation = (id: number, payload: UpdateLocationPayload) =>
  request<Location>(`/locations/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });

export function logInteraction(event: string, metadata: object = {}) {
  const page = typeof window === 'undefined' ? undefined : window.location.pathname;
  void fetch(`${API_BASE}/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, metadata, page }),
    keepalive: true,
  }).catch(() => {});
}
