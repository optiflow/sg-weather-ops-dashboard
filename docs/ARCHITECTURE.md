# Project Architecture

The `sg-weather-ops-dashboard` project is a monorepo managed via npm workspaces.

## Workspaces

- **`frontend/`**: A React single-page application.
  - **Tooling**: Vite
  - **Styling**: Tailwind CSS
  - **Mapping**: Leaflet (`react-leaflet`) for interactive weather maps.

- **`backend/`**: A Node.js/Express server.
  - **Database**: SQLite
  - **ORM**: Drizzle ORM (`drizzle-orm`, `drizzle-kit`) for schema management.

- **`scripts/`**: Custom Node.js scripts that manage the development lifecycle (e.g., dev server orchestration, state resets).

- **`docs/`**: An Astro Starlight documentation site.
  - **Tooling**: Astro + `@astrojs/starlight`
  - **Commands**: `npm run docs` starts the dev server on port 4321; `npm run docs:build` builds the static docs site.

## Runtime Flow

```mermaid
flowchart LR
  Browser["Browser\nReact dashboard"] --> Express["Express server\nAPI + Vite middleware"]
  Express --> Routes["locations routes"]
  Routes --> Weather["SingaporeWeatherClient"]
  Routes --> Db["SQLite via Drizzle"]
  Weather --> Gov["data.gov.sg weather APIs"]
  Db --> Routes
  Routes --> Browser
```

In development, the root `npm run dev` command starts Express with Vite middleware through Portless, so the frontend can call relative `/api` routes. In production, the compiled backend serves `frontend/dist` as static SPA assets.

## Location Model

Saved locations are anchored to Singapore forecast areas whenever the user chooses a named area or uses browser geolocation. The forecast-area picker is the primary add path; manual latitude/longitude entry remains available as a secondary mode for explicit coordinate testing.

Each saved location stores:

- Coordinates for the canonical forecast area or manual coordinate.
- Optional `label` copy for the user's own name for the place.
- `is_favorite`, which the frontend uses to keep favorites first while sorting by recent activity or name.
- One latest weather snapshot.

The backend exposes canonical forecast areas through `GET /api/forecast-areas`, creates or selects named areas through `POST /api/locations/from-area`, and updates label/favorite metadata through `PATCH /api/locations/:locationId`.

## Snapshot Model

The app stores one latest weather snapshot on each `locations` row. A location is inserted with default `not_refreshed` weather, then create and refresh flows attempt to replace that default snapshot with provider data.

`WeatherSnapshot` includes `data_quality`, which records the refresh status, refresh time, and unavailable provider signals. Legacy rows and migration defaults use `unknown`; new default rows use `not_refreshed`; provider refreshes classify the result as `complete`, `partial`, or `unavailable`.

The frontend treats the persisted snapshot as the source of truth. `DataTrustStrip` renders `data_quality` directly, while `RiskBrief` derives a lightweight decision-support summary from the same snapshot fields plus stale/missing-signal checks. There is no separate risk table, alert provider, or historical time-series model.

Historical readings and trend charts are deferred until the Risk Brief proves useful, because they require a different persistence model from the current single-row snapshot design.
