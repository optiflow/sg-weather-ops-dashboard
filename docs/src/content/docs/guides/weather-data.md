---
title: Weather Data Pipeline
description: How SG Weather Ops Dashboard fetches and maps real-time Singapore weather data.
---

SG Weather Ops Dashboard uses the latest weather snapshot as the primary dashboard read model. A snapshot is fetched when a location is created and again when the user refreshes it. The latest snapshot is persisted in the `locations` row and rendered directly by the frontend; refresh attempts also append observation rows for the history endpoint.

## Data Pipeline

`SingaporeWeatherClient.getCurrentWeather(latitude, longitude)` merges multiple provider responses into one `WeatherSnapshot`.

```mermaid
graph TD
  Route["locations route\ncreate or refresh"] --> Client["SingaporeWeatherClient"]
  Client --> Forecast["2-hour forecast\ncondition, area, valid period"]
  Client --> Temperature["air-temperature\nnearest station"]
  Client --> Humidity["relative-humidity\nnearest station"]
  Client --> Rainfall["rainfall\nnearest station"]
  Client --> WindSpeed["wind-speed\nnearest station"]
  Client --> WindDirection["wind-direction\nnearest station"]
  Client --> UV["uv\nlatest national value"]
  Client --> PSI["psi\nnearest region"]
  Client --> PM25["pm25\nnearest region"]
  Client --> DayForecast["24-hour forecast\nnearest region periods"]
  Client --> FourDay["4-day forecast\nlegacy endpoint"]
  Forecast --> Snapshot["WeatherSnapshot"]
  Temperature --> Snapshot
  Humidity --> Snapshot
  Rainfall --> Snapshot
  WindSpeed --> Snapshot
  WindDirection --> Snapshot
  UV --> Snapshot
  PSI --> Snapshot
  PM25 --> Snapshot
  DayForecast --> Snapshot
  FourDay --> Snapshot
  Snapshot --> Db["updateWeather()\nlatest SQLite snapshot"]
  Snapshot --> History["weather_observations\nappend-only history"]
```

## API Endpoints Used

| Endpoint | Base | Provides |
| --- | --- | --- |
| `/v2/real-time/api/two-hr-forecast` | `api-open.data.gov.sg` | Condition text, area name, valid period |
| `/v2/real-time/api/air-temperature` | `api-open.data.gov.sg` | Temperature (°C) |
| `/v2/real-time/api/relative-humidity` | `api-open.data.gov.sg` | Humidity (%) |
| `/v2/real-time/api/rainfall` | `api-open.data.gov.sg` | Rainfall (mm) |
| `/v2/real-time/api/wind-speed` | `api-open.data.gov.sg` | Wind speed (knots) |
| `/v2/real-time/api/wind-direction` | `api-open.data.gov.sg` | Wind direction (degrees) |
| `/v2/real-time/api/uv` | `api-open.data.gov.sg` | UV index |
| `/v2/real-time/api/psi` | `api-open.data.gov.sg` | 24-hour PSI |
| `/v2/real-time/api/pm25` | `api-open.data.gov.sg` | 1-hour PM2.5 |
| `/v2/real-time/api/twenty-four-hr-forecast` | `api-open.data.gov.sg` | Forecast high/low temps, period forecasts |
| `/v1/environment/4-day-weather-forecast` | `api.data.gov.sg` _(legacy)_ | 4-day daily forecast |

The client sends `Accept: application/json`, a `sg-weather-ops-dashboard/0.1 (educational project)` user agent, and `x-api-key` only when `WEATHER_API_KEY` is configured.

## Forecast-Area Matching

The 2-hour forecast endpoint returns named forecast areas in `area_metadata`. Each area includes `label_location.latitude` and `label_location.longitude`.

`GET /api/forecast-areas` exposes this metadata as the sorted canonical forecast-area list used by the Add Location picker. Selecting a named area calls `POST /api/locations/from-area`, which stores the area's label coordinate in SQLite and returns the existing saved location when that coordinate is already present.

When the user clicks **Use my location**, the browser sends its current coordinates to `POST /api/locations/from-position`. The backend finds the nearest forecast area using squared Euclidean distance, then stores that area's label coordinate in SQLite. This keeps picker-derived and browser-derived locations canonical and makes duplicate adds idempotent.

## Nearest-Station Matching

Station-based readings (temperature, humidity, rainfall, wind) include a list of stations with lat/lon coordinates. The client finds the nearest station to the user's saved coordinate using squared Euclidean distance:

```
distance = (stationLat − userLat)² + (stationLon − userLon)²
```

Only stations that have a value in the latest reading are considered.

## Region Matching

Air-quality readings are fetched separately from the PSI and PM2.5 providers. The client picks the nearest provider region for each response and stores `psi_twenty_four_hourly`, `pm25_one_hourly`, and `air_quality_region` on the snapshot.

The 24-hour forecast uses five fixed Singapore regions: `west`, `north`, `central`, `south`, `east`. The client picks the nearest fixed region and reads that region's period forecast.

## Snapshot Shape

The backend and frontend share the same JSON field names for `WeatherSnapshot`:

| Field group | Fields |
| --- | --- |
| 2-hour forecast | `condition`, `observed_at`, `source`, `area`, `valid_period_text` |
| Station readings | `temperature_c`, `humidity_percent`, `rainfall_mm`, `wind_speed_knots`, `wind_direction_degrees` |
| Regional and national readings | `uv_index`, `psi_twenty_four_hourly`, `pm25_one_hourly`, `air_quality_region` |
| 24-hour forecast | `forecast_low_c`, `forecast_high_c`, `forecast_periods[]` |
| 4-day forecast | `daily_forecast[]` |
| Data trust | `data_quality.status`, `data_quality.last_refreshed_at`, `data_quality.unavailable_signals[]`, `data_quality.freshness_status`, `data_quality.stale_signals[]` |

The database stores scalar fields as SQLite columns and stores `forecast_periods`, `daily_forecast`, and `data_quality` as JSON text columns through Drizzle's typed JSON mode.

The latest snapshot remains on `locations` for backward-compatible `/api/locations*` responses. Refresh flows also write `refresh_attempts` and `weather_observations`, which support `GET /api/locations/:locationId/history` and the lightweight trend panel. Existing `locations` rows are not backfilled into historical observations.

## Data Quality Contract

Each persisted snapshot includes `weather.data_quality`:

```ts
type RefreshStatus = 'unknown' | 'not_refreshed' | 'complete' | 'partial' | 'unavailable';

interface WeatherDataQuality {
  status: RefreshStatus;
  last_refreshed_at: string | null;
  unavailable_signals: WeatherSignal[];
  freshness_status: 'unknown' | 'not_refreshed' | 'fresh' | 'stale';
  stale_signals: WeatherSignal[];
}
```

The statuses mean:

| Status | When it appears |
| --- | --- |
| `unknown` | Legacy rows migrated before refresh quality was tracked. |
| `not_refreshed` | Newly inserted default weather before any successful provider refresh. |
| `complete` | Every tracked provider signal returned a usable value or payload. |
| `partial` | At least one tracked signal was usable and at least one was unavailable. |
| `unavailable` | No tracked provider signal was usable in the refresh attempt. |

Tracked signals are the 2-hour forecast, temperature, humidity, rainfall, wind speed, wind direction, UV, PSI, PM2.5, 24-hour forecast, and 4-day forecast.

Freshness is tracked separately from coverage. A provider signal can be usable but stale when its provider timestamp is older than the client's freshness window. Stale signals appear in `data_quality.stale_signals`, and the snapshot-level `freshness_status` becomes `stale`.

## Provider Caching and Coalescing

`SingaporeWeatherClient` keeps an in-memory provider cache and coalesces concurrent identical provider requests. The cache is process-local and intentionally short-lived:

| Provider request | Cache TTL |
| --- | --- |
| 2-hour forecast | 5 minutes |
| 24-hour forecast | 5 minutes |
| 4-day forecast | 12 hours |
| Realtime readings, UV, PSI, PM2.5 | 1 minute |

This reduces repeated data.gov.sg calls during local use and overlapping refreshes, but it is not durable storage and is cleared when the Node process exits.

## Partial Failures

Each API call is settled individually. If one endpoint fails, the remaining data is still included in the snapshot, failed fields are set to `null`, and the missing signal is recorded in `data_quality.unavailable_signals`. This means the dashboard always renders; individual tiles simply show `--` when data is unavailable.

The first 2-hour forecast response supplies the base snapshot. If that forecast fails, the client starts from an `Unavailable` snapshot and still attempts the remaining readings.

`fetchJson` maps provider failures into `WeatherProviderError`:

| Failure | Result |
| --- | --- |
| Timeout | Aborts after 8 seconds by default. |
| HTTP 429 | `Weather provider rate limit reached (HTTP 429)` |
| HTTP 401 or 403 | `Weather provider rejected request (check API key)` |
| Other non-OK HTTP response | `Weather provider returned HTTP <status>` |
| Network or abort failure | `Unable to reach weather provider` |
| Provider JSON with non-zero `code` | Provider `errorMsg` when available. |

The route behavior depends on where the failure occurs:

| Workflow | Provider failure behavior |
| --- | --- |
| Manual create | Keeps the new location with default weather and returns `201`. |
| Browser-position create before area matching | Does not create a location and returns `502`. |
| Browser-position create after saving matched area | Keeps the new canonical location with default weather and returns `201`. |
| Manual refresh | Persists partial or `Unavailable` snapshots for settled endpoint failures. Returns `502` only when the weather client rejects outside that settled endpoint flow. |

Manual refreshes are also coalesced per location while a refresh is already in flight. Recent manual refreshes may be throttled by the route layer; create-triggered refreshes still run when a location is first inserted.

## Weather Risk Brief

The Weather Risk Brief is a pure frontend interpretation of the latest `WeatherSnapshot`; it does not call a new provider and does not persist a separate risk score. `frontend/src/weatherRisk.ts` derives an underlying `Low`, `Moderate`, `High`, or `Unavailable` state from:

- Rain/storm forecast text and rainfall.
- UV, PSI, PM2.5, wind speed, and heat indicators.
- Stale observations.
- Missing or unavailable provider signals from `data_quality`.

The component renders that state as plain-language decision support for everyday users: a status badge, a short headline, a recommended next step, confidence wording, and up to three things to watch. Technical refresh status and missing provider signals stay in `DataTrustStrip`. The brief is not a production alerting system and should not replace official safety advisories.

## Rendering Data

The frontend renders snapshot fields in these components:

| Component | Data used |
| --- | --- |
| `Hero` | Area, temperature, condition, high/low, observed time, and source. |
| `RiskBrief` | Latest snapshot metrics plus `data_quality` to derive the frontend risk level, user-facing recommendation, confidence wording, and things to watch. |
| `DataTrustStrip` | Refresh action plus `data_quality.status`, `last_refreshed_at`, missing signals, freshness status, stale signals, and observation time for technical data trust. |
| `TrendPanel` | Recent rows from `GET /api/locations/:locationId/history`; empty until refreshes create observations. |
| `HourlyStrip` | `forecast_periods` from the 24-hour regional forecast. |
| `TenDayForecast` | `daily_forecast`; the current provider returns 4 days. |
| `MapCard` | Saved coordinates and temperature/condition markers on Leaflet. |
| `TileGrid` | Air quality, wind, UV, temperature, rainfall, humidity, and forecast high. |
