---
title: Getting Started
description: Install dependencies and run the SG Weather Ops Dashboard development server.
---

SG Weather Ops Dashboard is an npm workspaces monorepo with three workspaces: `frontend`, `backend`, and `docs`. Run commands from the repository root unless a command explicitly uses `-w docs`, `-w frontend`, or `-w backend`.

## Prerequisites

- Node.js v22 or later. The backend uses the built-in `node:sqlite` module through `DatabaseSync`.
- npm v10 or later. The root `package-lock.json` is the dependency source of truth.

## Install

```bash
cd sg-weather-ops-dashboard
npm install
```

The install bootstraps the React frontend, Express backend, and Astro Starlight docs workspace in one step.

Install Playwright browser binaries before running the browser smoke test or pushing through the Lefthook `pre-push` hook:

```bash
npx playwright install
```

## Start the App

```bash
npm run dev
```

This runs `scripts/dev.mjs`, which starts:

- `portless run --name sg-weather-ops-dashboard`
- `tsx watch backend/src/server.ts`
- Express with Vite loaded as middleware in development mode

The frontend and backend run behind one stable local URL. Open the URL printed by Portless. By default it is:

```
http://sg-weather-ops-dashboard.localhost:1355
```

The browser uses relative `/api` requests, so no frontend proxy is needed in this default flow.

### Geolocation in Development

The **Use my location** button uses the browser Geolocation API. It requires a trusted origin. The app accepts `localhost`, `127.0.0.1`, `[::1]`, and `*.localhost` as local trusted origins when the browser allows them.

If the browser blocks geolocation over HTTP, start the app with HTTPS enabled through Portless:

```bash
PORTLESS_HTTPS=1 npm run dev
```

### Health Check

If the UI reports that the server is unavailable, verify the backend:

```bash
curl http://sg-weather-ops-dashboard.localhost:1355/health
```

Expected response:

```json
{ "status": "healthy" }
```

If the response is Portless HTML or says no app is registered, restart `npm run dev`.

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `WEATHER_API_KEY` | empty | Optional data.gov.sg API key. Sent as `x-api-key` by `SingaporeWeatherClient` when set. |
| `PORTLESS_PORT` | `1355` | Stable local Portless port used by `scripts/dev.mjs`. |
| `PORTLESS_HTTPS` | `0` | Set to `1` for local HTTPS. |
| `DATABASE_PATH` | `backend/weather.db` | SQLite database path used by `backend/src/db.ts`. |
| `LOG_LEVEL` | `info` in app runtime, `silent` in tests | Pino log level. |
| `LOG_FILE_PATH` | `backend/logs/app.log` | File destination for backend logs outside tests. |

Copy `.env.example` to `.env` when you want local overrides. The app works without a weather API key for light local usage.

The repository also includes `frontend/.env.local.example` for a standalone Vite frontend proxy workflow, but the normal root `npm run dev` path serves Vite through Express and does not require it.

## Useful Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the full app in development through Portless. |
| `npm run build` | Builds the frontend and type-checks the backend. |
| `npm run start` | Runs the compiled production server from `backend/dist/server.js`. |
| `npm test` | Runs Vitest and Supertest backend tests. |
| `npm run lint` | Runs Biome checks. |
| `npm run format` | Formats with Biome. |
| `npm run doctor` | Runs local diagnostics. |
| `npm run reset` | Resets local state such as the SQLite database. |
| `npm run db:generate` | Generates Drizzle migrations after schema changes. |
| `npm run db:migrate` | Applies Drizzle migrations. |
| `npm run docs` | Starts the Astro Starlight docs site. |

## Tests and Quality Gate

Run the focused docs build after editing documentation:

```bash
npm run build -w docs
```

Before completing a code or documentation task, run the root quality gate:

```bash
npm test
npm run build
npm run lint
```

Tests create a temporary SQLite database and inject a mock weather client, so they do not call data.gov.sg.

## Production Build

```bash
npm run build
npm run start
```

`npm run build` runs the frontend workspace build and `tsc -p backend/tsconfig.json`. `npm run start` sets `NODE_ENV=production` and starts `backend/dist/server.js`. In production mode, Express serves `frontend/dist` as static files and falls back to `index.html` for the SPA.

## Docs Site

```bash
npm run docs
```

This delegates to `npm run dev -w docs` and starts the Astro Starlight development server, normally at `http://localhost:4321`.
