---
title: API Endpoints
description: REST API reference for the SG Weather Ops Dashboard Express backend.
---

The Express app is created in `backend/src/server.ts`. Location routes are mounted under `/api` from `backend/src/routes/locations.ts`. The health route is intentionally not prefixed.

All JSON request bodies are limited to `10kb` outside `/frontman` paths. Backend responses include these headers:

| Header | Value |
| --- | --- |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |

## Health Check

### `GET /health`

Returns server health status. Not prefixed with `/api`.

**Response** `200 OK`

```json
{ "status": "healthy" }
```

---

## Locations

### `GET /api/forecast-areas`

List canonical Singapore 2-hour forecast areas sorted by name. These are the same area names and label coordinates used by `POST /api/locations/from-area` and browser-position canonicalization.

**Response** `200 OK`

```json
{
  "areas": [
    { "name": "Ang Mo Kio", "latitude": 1.37, "longitude": 103.85 },
    { "name": "Bedok", "latitude": 1.324, "longitude": 103.924 }
  ]
}
```

---

### `GET /api/locations`

List saved locations. The default API order is recent first, with favorites before non-favorites. The frontend can also sort the returned list by Recent or Name while keeping favorites first.

**Response** `200 OK`

```json
{
  "locations": [
    {
      "id": 1,
      "latitude": 1.35,
      "longitude": 103.85,
      "label": "Office",
      "is_favorite": true,
      "created_at": "2026-05-04T12:00:00",
      "weather": {
        "condition": "Cloudy",
        "area": "Bishan",
        "data_quality": {
          "status": "complete",
          "last_refreshed_at": "2026-05-04T12:00:02.000Z",
          "unavailable_signals": []
        }
      }
    }
  ]
}
```

---

### `POST /api/locations/from-area`

Create or select a saved location from a canonical forecast-area name. This is the primary Add Location path.

**Request Body**

```json
{ "name": "Bishan", "label": "Home" }
```

`label` is optional and may be a string or `null`. It is trimmed before persistence; empty strings clear the label. Later label and favorite edits use `PATCH /api/locations/:locationId`.

**Validation**

| Rule | Response |
| --- | --- |
| Missing or non-string `name` | `422` `{ "detail": "forecast area name is required" }` |
| Unknown forecast-area name | `422` `{ "detail": "Forecast area not found" }` |
| `label` is present and not a string or `null` | `422` `{ "detail": "label must be a string or null" }` |
| `label` exceeds 40 characters after trimming | `422` `{ "detail": "label must be 40 characters or fewer" }` |
| Forecast-area lookup fails before insert | `502` with the provider error detail |

**Response** `201 Created`

```json
{
  "location": {
    "id": 1,
    "latitude": 1.352,
    "longitude": 103.849,
    "label": "Home",
    "is_favorite": false,
    "created_at": "2026-05-04T12:00:00",
    "weather": { "condition": "Cloudy", "area": "Bishan", "...": "..." }
  },
  "created": true,
  "matched_area": { "name": "Bishan", "latitude": 1.352, "longitude": 103.849 }
}
```

If the canonical forecast-area coordinate already exists, the endpoint is idempotent and returns `200 OK` with the existing location and `"created": false`. If the request includes `label`, the existing location's label is updated before the response is returned.

If the weather refresh fails after a new canonical area is saved, the endpoint still returns `201 Created` with the saved location and default weather (`condition: "Not refreshed"`, `weather.data_quality.status: "not_refreshed"`). The matched forecast-area name is still persisted on `weather.area`.

---

### `POST /api/locations`

Create a new location from explicit coordinates. This manual coordinate endpoint is the secondary Add Location mode for explicit latitude/longitude testing. The request must use JSON numbers, not numeric strings.

**Request Body**

```json
{ "latitude": 1.35, "longitude": 103.85 }
```

**Validation**

| Rule | Response |
| --- | --- |
| Missing lat/lon, non-number values, or numeric strings | `422` `{ "detail": "latitude and longitude are required" }` |
| Outside Singapore (lat 1.1–1.5, lon 103.6–104.1) | `422` `{ "detail": "Coordinates must be within Singapore..." }` |
| Duplicate coordinates | `409` `{ "detail": "Location already exists" }` |

**Response** `201 Created`

Returns the created `Location` object. The backend inserts default weather first, then attempts the initial provider refresh. If the provider fails during that initial refresh, the location still exists and the response still returns `201` with default weather.

---

### `POST /api/locations/from-position`

Create or select a location from browser-derived coordinates. The backend validates the raw browser position, resolves the nearest 2-hour forecast area from data.gov.sg metadata, and stores that area's canonical label coordinate.

**Request Body**

```json
{ "latitude": 1.3001, "longitude": 103.8001 }
```

**Validation**

| Rule | Response |
| --- | --- |
| Missing lat/lon, non-number values, or numeric strings | `422` `{ "detail": "latitude and longitude are required" }` |
| Outside Singapore (lat 1.1–1.5, lon 103.6–104.1) | `422` `{ "detail": "Coordinates must be within Singapore..." }` |
| Forecast-area lookup fails before insert | `502` with the provider error detail |

**Response** `201 Created`

```json
{
  "location": {
    "id": 1,
    "latitude": 1.352,
    "longitude": 103.849,
    "label": null,
    "is_favorite": false,
    "created_at": "2026-05-04T12:00:00",
    "weather": { "condition": "Cloudy", "area": "Bishan", "...": "..." }
  },
  "created": true,
  "matched_area": { "name": "Bishan", "latitude": 1.352, "longitude": 103.849 }
}
```

If the matched forecast-area coordinate already exists, the endpoint is idempotent and returns `200 OK` with the existing location and `"created": false`.

If the weather refresh fails after a new canonical area is saved, the endpoint still returns `201 Created` with the saved location and default weather (`condition: "Not refreshed"`, `weather.data_quality.status: "not_refreshed"`). The matched forecast-area name is still persisted on `weather.area`.

---

### `GET /api/locations/:locationId`

Get a single location by ID.

**Response** `200 OK`

Returns a single `Location` object.

**Error** `404 Not Found`

```json
{ "detail": "Location not found" }
```

---

### `PATCH /api/locations/:locationId`

Update saved-location metadata. Omitted fields are left unchanged.

**Request Body**

```json
{ "label": "Office", "is_favorite": true }
```

Use `label: null` to clear a custom label.

**Validation**

| Rule | Response |
| --- | --- |
| `label` is present and not a string or `null` | `422` `{ "detail": "label must be a string or null" }` |
| `label` exceeds 40 characters after trimming | `422` `{ "detail": "label must be 40 characters or fewer" }` |
| `is_favorite` is present and not a boolean | `422` `{ "detail": "is_favorite must be a boolean" }` |
| No supported fields are provided | `422` `{ "detail": "label or is_favorite is required" }` |

**Response** `200 OK`

Returns the updated `Location` object.

**Error** `404 Not Found`

```json
{ "detail": "Location not found" }
```

---

### `DELETE /api/locations/:locationId`

Delete a location.

**Response** `204 No Content`

Returns no body.

**Error** `404 Not Found`

```json
{ "detail": "Location not found" }
```

---

### `POST /api/locations/:locationId/refresh`

Refresh weather data for a location by fetching from all data.gov.sg endpoints.

**Response** `200 OK` — Returns the updated location object.

Per-endpoint provider failures are settled inside the weather client. The endpoint can still return `200 OK` with a partial snapshot or an `Unavailable` base snapshot when individual provider calls fail.

**Errors**

| Status | Body |
| --- | --- |
| `404` | `{ "detail": "Location not found" }` |
| `502` | Weather-client rejection detail. This is for failures that escape the settled per-endpoint flow. |

```json
{ "detail": "Forecast response has no items" }
```

---

## Frontend Logging

### `POST /api/logs`

Log a frontend interaction event through Pino. The UI fires this for area create, manual-coordinate create, browser-position create, metadata update, refresh, delete, and form-open events. Logging failures are not surfaced in the frontend.

**Request Body**

```json
{ "event": "location_created", "metadata": { "locationId": 1 }, "page": "/" }
```

**Validation**

- `event` must be a string matching `/^[a-z][a-z0-9_.:-]{1,63}$/`
- `metadata` is included only when it is an object.
- `page` is included only when it is a string.

**Response** `204 No Content` or `422 Unprocessable Entity`

---

## Response Types

### `Location`

```ts
interface Location {
  id: number;
  latitude: number;
  longitude: number;
  label: string | null;
  is_favorite: boolean;
  created_at: string;
  weather: WeatherSnapshot;
}
```

### `ForecastArea`

```ts
interface ForecastArea {
  name: string;
  latitude: number;
  longitude: number;
}
```

### `WeatherSnapshot`

```ts
type RefreshStatus =
  | 'unknown'
  | 'not_refreshed'
  | 'complete'
  | 'partial'
  | 'unavailable';

type WeatherSignal =
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

interface WeatherDataQuality {
  status: RefreshStatus;
  last_refreshed_at: string | null;
  unavailable_signals: WeatherSignal[];
}

interface WeatherSnapshot {
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
  forecast_periods: Array<{ label: string; forecast: string }>;
  daily_forecast: Array<{
    date: string;
    forecast: string;
    temperature_low_c: number | null;
    temperature_high_c: number | null;
  }>;
  data_quality: WeatherDataQuality;
}
```

`weather.data_quality.status` uses these meanings:

| Status | Meaning |
| --- | --- |
| `unknown` | Legacy or migrated row without a calculated refresh result. |
| `not_refreshed` | New default row that has not successfully refreshed weather yet. |
| `complete` | Latest refresh populated every tracked provider signal. |
| `partial` | Latest refresh populated at least one signal and missed at least one signal. |
| `unavailable` | Latest refresh did not produce any usable tracked signal. |

## Error Format

All error responses use a consistent JSON format:

```json
{ "detail": "Human-readable error message" }
```

Unhandled errors return `500` with `{ "detail": "Internal server error" }`.
