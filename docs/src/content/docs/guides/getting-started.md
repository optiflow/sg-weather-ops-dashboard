---
title: Getting Started
description: Install dependencies and run the Weather Starter development server.
---

## Prerequisites

- **Node.js** v22 or later (the project uses the built-in `node:sqlite` module)
- **npm** v10+

## Clone and Install

```bash
git clone <repo-url> weather-starter
cd weather-starter
npm install
```

`npm install` bootstraps all three workspaces — `frontend`, `backend`, and `docs` — in a single step.

## Start the Dev Server

```bash
npm run dev
```

This runs `scripts/dev.mjs`, which starts the Express backend with `tsx watch` behind [Portless](https://github.com/nicepkg/portless). Vite is loaded as Express middleware in development mode, so there is no separate frontend process.

Once started, open the URL printed to the terminal. By default it is:

```
http://weather-starter.localhost:1355
```

Browser geolocation for **Use my location** should work on `localhost` and `*.localhost` origins. If your browser requires HTTPS for local geolocation, start the app with:

```bash
PORTLESS_HTTPS=1 npm run dev
```

If **Use my location** reports that the weather server is unavailable, check that Portless has the app registered:

```bash
curl http://weather-starter.localhost:1355/health
```

The response should be JSON: `{ "status": "healthy" }`. If the request returns Portless HTML or a `No app registered` message, restart `npm run dev`.

## Environment Variables

Create a `.env` file in the project root (one is included by default):

| Variable | Default | Purpose |
| --- | --- | --- |
| `WEATHER_API_KEY` | _(empty)_ | Optional data.gov.sg API key for higher rate limits |
| `PORTLESS_PORT` | `1355` | Local port used by Portless |
| `PORTLESS_HTTPS` | `0` | Set to `1` for local HTTPS |
| `DATABASE_PATH` | `backend/weather.db` | Path to the SQLite database file |

The app works without an API key for light local usage.

## Run Tests

```bash
npm test
```

Tests use Vitest with Supertest. The test suite creates a temporary SQLite database and injects a mock weather client so no network calls are made.

## Lint and Format

```bash
npm run lint      # Biome check
npm run format    # Biome format
```

## Build for Production

```bash
npm run build
npm start
```

`npm run build` compiles the React frontend with Vite and type-checks the backend with `tsc`. `npm start` serves the built frontend as static files from Express.

## Run the Docs Site

```bash
npm run docs
```

Starts the Astro Starlight documentation site at `http://localhost:4321`.
