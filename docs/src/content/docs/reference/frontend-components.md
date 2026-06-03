---
title: Frontend Components
description: React component tree and state management in the Weather Starter dashboard.
---

The frontend is a React 18 single-page app built with Vite and Tailwind CSS. It uses React Context for app state and theme state, a small `fetch` wrapper for API calls, and Leaflet through `react-leaflet` for the map.

## Component Tree

```mermaid
graph TD
  Main["main.tsx"] --> App
  App --> ThemeProvider
  ThemeProvider --> StoreProvider
  StoreProvider --> Layout
  Layout --> ThemeSelector
  Layout --> Sidebar
  Layout --> Hero
  Sidebar --> SearchBox["Search Input"]
  Sidebar --> UseMyLocationButton
  Sidebar --> AddLocationForm
  Sidebar --> SidebarCard["SidebarCard ×N"]
  Hero --> HourlyStrip
  Hero --> TenDayForecast
  Hero --> MapCard
  Hero --> TileGrid
  TileGrid --> AirQualityTile
  TileGrid --> WindTile
  TileGrid --> UVTile
  TileGrid --> TemperatureTile
  TileGrid --> PrecipitationTile
  TileGrid --> HumidityTile
  TileGrid --> AveragesTile
```

## State Management

State is managed through two React Context providers. No external state library is used.

### `StoreProvider` (`state/store.tsx`)

Holds all application state for locations and exposes actions through a `StoreValue` context:

| Field | Type | Description |
| --- | --- | --- |
| `locations` | `Location[]` | All saved locations |
| `selectedId` | `number \| null` | Currently selected location ID |
| `isAdding` | `boolean` | Whether the add-location form is visible |
| `isLoading` | `boolean` | Initial load in progress |
| `refreshingId` | `number \| null` | Location currently being refreshed |
| `error` | `unknown` | Last error, if any |

**Actions:**

| Action | Description |
| --- | --- |
| `select(id)` | Select a location |
| `setAdding(flag)` | Toggle the add-location form |
| `create(payload)` | Create a location via the API |
| `createFromPosition(payload)` | Add/select a canonical forecast-area location from browser coordinates |
| `refresh(id)` | Refresh weather for a location |
| `remove(id)` | Delete a location |

### `ThemeProvider` (`state/themeStore.tsx`)

Manages the active visual theme. The selected theme is persisted in `localStorage` under the key `weather_starter_theme`.

Available themes: `apple`, `cotton-candy`, `night-city`, `pixel`, `terminal`.

The provider applies a `theme-{name}` CSS class to `document.body` on change.

## API Flow

```mermaid
sequenceDiagram
  participant Component as React component
  participant Store as StoreProvider
  participant API as frontend/src/api.ts
  participant Backend as Express /api

  Component->>Store: create / createFromPosition / refresh / remove
  Store->>API: Call typed API helper
  API->>Backend: fetch relative /api endpoint
  Backend-->>API: JSON or 204
  API-->>Store: Location data or error
  Store->>Store: reload list and adjust selectedId
  Store-->>Component: render updated state
```

The API helper treats non-JSON backend responses as server-unavailable failures, which catches cases where the request accidentally hits a dev proxy or Portless page instead of the Express API.

## Key Components

### `Sidebar`

The left panel that lists all locations as `SidebarCard` components. Includes a search input that filters locations by area name or condition (frontend-only filter), a **Use my location** action, and the `AddLocationForm` for manual coordinate entry.

### `Hero`

The main content area showing the selected location's weather. Displays:

- Area name and current temperature
- Condition text and high/low forecast
- Observation timestamp and source
- A **Refresh** button that triggers `POST /api/locations/:id/refresh`

### `HourlyStrip`

A grid of 24-hour forecast periods with each period's condition text. If no periods are available, it renders a compact unavailable state.

### `TenDayForecast`

Displays `daily_forecast` as a vertical list with daily high/low temperatures and condition text. The current provider data is a 4-day forecast even though the component name is broader.

### `MapCard`

An interactive Leaflet map showing all saved locations as markers. The normal card disables dragging and scroll zoom; an **Expand map** button opens a fullscreen map, which can be closed with the close button or Escape. `MapBoundsUpdater` fits the map bounds to all saved locations with `useEffect`.

### `TileGrid`

A responsive CSS Grid of weather metric tiles:

| Tile | Data Shown |
| --- | --- |
| Air Quality | 24-hr PSI, PM2.5, region, scale bar |
| Wind | Speed (km/h), direction (degrees), compass |
| UV Index | UV value, label (Low–Extreme), scale bar |
| Temperature | Current temperature from nearest station |
| Rainfall | Latest rainfall reading (mm) |
| Humidity | Relative humidity (%) |
| Averages | Forecast high temperature |

## API Client (`api.ts`)

The frontend communicates with the backend through a thin `fetch` wrapper in `src/api.ts`:

| Function | HTTP Method | Endpoint |
| --- | --- | --- |
| `listLocations()` | `GET` | `/api/locations` |
| `createLocation(payload)` | `POST` | `/api/locations` |
| `createLocationFromPosition(payload)` | `POST` | `/api/locations/from-position` |
| `deleteLocation(id)` | `DELETE` | `/api/locations/:id` |
| `refreshLocation(id)` | `POST` | `/api/locations/:id/refresh` |
| `logInteraction(event, metadata)` | `POST` | `/api/logs` |

## Geolocation

`frontend/src/geolocation.ts` wraps the browser Geolocation API. It rejects early when:

- The code is not running in a browser context.
- The origin is not secure and is not a local trusted origin.
- `navigator.geolocation` is unavailable.
- The browser denies, times out, or cannot provide a position.

The returned latitude/longitude is sent to the backend, where it is validated again and canonicalized to the nearest Singapore 2-hour forecast area.

## Styling and Themes

Most layout styling is in Tailwind utility classes. `frontend/src/index.css` defines the base page styles, Leaflet CSS import, and body theme classes:

| Theme | Body class |
| --- | --- |
| Apple | `theme-apple` |
| Cotton Candy | `theme-cotton-candy` |
| Night City | `theme-night-city` |
| Pixel | `theme-pixel` |
| Terminal | `theme-terminal` |

The theme selector writes the selected value to `localStorage` under `weather_starter_theme`.
