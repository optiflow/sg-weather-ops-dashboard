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

### `GET /api/locations`

List saved locations ordered by `created_at` descending, then `id` descending.

**Response** `200 OK`

```json
{
  "locations": [
    {
      "id": 1,
      "latitude": 1.35,
      "longitude": 103.85,
      "created_at": "2026-05-04T12:00:00",
      "weather": { "condition": "Cloudy", "area": "Bishan", "..." : "..." }
    }
  ]
}
```

---

### `POST /api/locations`

Create a new location from explicit coordinates. The request must use JSON numbers, not numeric strings.

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
    "created_at": "2026-05-04T12:00:00",
    "weather": { "condition": "Cloudy", "area": "Bishan", "...": "..." }
  },
  "created": true,
  "matched_area": { "name": "Bishan", "latitude": 1.352, "longitude": 103.849 }
}
```

If the matched forecast-area coordinate already exists, the endpoint is idempotent and returns `200 OK` with the existing location and `"created": false`.

If the weather refresh fails after a new canonical area is saved, the endpoint still returns `201 Created` with the saved location and default weather (`condition: "Not refreshed"`).

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

Log a frontend interaction event through Pino. The UI fires this for create, browser-position create, refresh, delete, and form-open events. Logging failures are not surfaced in the frontend.

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
  created_at: string;
  weather: WeatherSnapshot;
}
```

### `WeatherSnapshot`

```ts
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
}
```

## Error Format

All error responses use a consistent JSON format:

```json
{ "detail": "Human-readable error message" }
```

Unhandled errors return `500` with `{ "detail": "Internal server error" }`.
