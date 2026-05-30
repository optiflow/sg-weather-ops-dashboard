---
title: API Endpoints
description: REST API reference for the Weather Starter Express backend.
---

All endpoints are prefixed with `/api` and served by the Express backend.

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

List all saved locations, ordered by creation date (newest first).

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

Create a new location. Coordinates must be JSON numbers within Singapore's bounding box.

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

Returns the created location object with weather data. If the weather provider fails during the initial fetch, the location is still created with default weather (`condition: "Not refreshed"`).

---

### `POST /api/locations/from-position`

Create or select a location from browser-derived coordinates. The backend validates that the browser position is inside Singapore, resolves the nearest 2-hour forecast area from data.gov.sg metadata, and saves that forecast area's canonical label coordinate.

**Request Body**

```json
{ "latitude": 1.3001, "longitude": 103.8001 }
```

**Validation**

| Rule | Response |
| --- | --- |
| Missing lat/lon, non-number values, or numeric strings | `422` `{ "detail": "latitude and longitude are required" }` |
| Outside Singapore (lat 1.1–1.5, lon 103.6–104.1) | `422` `{ "detail": "Coordinates must be within Singapore..." }` |
| Forecast-area metadata unavailable | `502` `{ "detail": "Forecast response has no area metadata" }` |

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

**Response** `200 OK` or `404 Not Found`

---

### `DELETE /api/locations/:locationId`

Delete a location.

**Response** `204 No Content` or `404 Not Found`

---

### `POST /api/locations/:locationId/refresh`

Refresh weather data for a location by fetching from all data.gov.sg endpoints.

**Response** `200 OK` — Returns the updated location object.

**Error** `502 Bad Gateway` — The weather provider is unreachable or returned an error.

```json
{ "detail": "Weather provider rate limit reached (HTTP 429)" }
```

---

## Frontend Logging

### `POST /api/logs`

Log a frontend interaction event. Used for analytics.

**Request Body**

```json
{ "event": "location_created", "metadata": { "locationId": 1 }, "page": "/" }
```

**Validation**

- `event` must be a string matching `/^[a-z][a-z0-9_.:-]{1,63}$/`

**Response** `204 No Content` or `422 Unprocessable Entity`

---

## Error Format

All error responses use a consistent JSON format:

```json
{ "detail": "Human-readable error message" }
```

Unhandled errors return `500` with `{ "detail": "Internal server error" }`.
