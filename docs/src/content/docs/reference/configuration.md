---
title: Configuration
description: Project configuration files and environment setup.
---

## Monorepo Structure

Weather Starter is an npm workspaces monorepo with three workspaces:

```mermaid
graph TD
  Root["package.json<br/>(workspace root)"]
  Root --> FE["frontend/<br/>React + Vite"]
  Root --> BE["backend/<br/>Express + SQLite"]
  Root --> Docs["docs/<br/>Astro Starlight"]
```

The root `package-lock.json` covers all workspaces. Do not introduce another package manager.

## Root Scripts

Defined in the root `package.json`:

| Script | Command | Description |
| --- | --- | --- |
| `dev` | `node scripts/dev.mjs` | Start dev server (Express + Vite middleware) |
| `build` | `npm run build -w frontend && tsc -p backend/tsconfig.json` | Build both workspaces |
| `start` | `node scripts/start.mjs` | Start production server |
| `docs` | `npm run dev -w docs` | Start Starlight docs site |
| `test` | `vitest run` | Run test suite |
| `test:watch` | `vitest` | Run tests in watch mode |
| `lint` | `biome check .` | Lint and format check with Biome |
| `format` | `biome format --write .` | Format with Biome |
| `db:generate` | `drizzle-kit generate` | Generate Drizzle migrations |
| `db:migrate` | `drizzle-kit migrate` | Apply Drizzle migrations |
| `doctor` | `node scripts/doctor.mjs` | Troubleshoot local state |
| `reset` | `node scripts/reset.mjs` | Clean local state |

## Workspace Scripts

| Workspace | Script | Command |
| --- | --- | --- |
| `frontend` | `dev` | `vite --host 127.0.0.1` |
| `frontend` | `build` | `tsc -p tsconfig.json && vite build` |
| `frontend` | `preview` | `vite preview` |
| `backend` | `dev` | `tsx watch src/server.ts` |
| `backend` | `build` | `tsc -p tsconfig.json` |
| `backend` | `start` | `node dist/server.js` |
| `docs` | `dev` / `start` | `astro dev` |
| `docs` | `build` | `astro build` |
| `docs` | `preview` | `astro preview` |

## TypeScript

Three separate `tsconfig.json` files:

| File | Target | Notes |
| --- | --- | --- |
| `frontend/tsconfig.json` | DOM + ESNext | Used by Vite for the React SPA |
| `backend/tsconfig.json` | Node ESNext | Emits to `backend/dist/` |
| `docs/tsconfig.json` | Astro strict | Extends `astro/tsconfigs/strict` |

The backend uses `tsx` for development (no compile step needed), and `tsc` only for the production build.

## Vite

The frontend Vite config (`frontend/vite.config.ts`) includes:

- `@vitejs/plugin-react` for JSX/React Fast Refresh
- `@frontman-ai/vite` with the frontend root as the project and source root.

The normal root `npm run dev` flow does not run Vite as a separate process. Express creates a Vite middleware server with:

- `root: frontend`
- `server.middlewareMode: true`
- `appType: "spa"`

`frontend/.env.local.example` exists for standalone frontend proxy configuration, but it is not needed when using the root dev server.

## Drizzle ORM

Configured in `drizzle.config.ts` at the project root:

- **Dialect**: `sqlite`
- **Schema**: `backend/src/schema.ts`
- **Migrations output**: `backend/drizzle/`
- **Database URL**: `DATABASE_PATH` env var or `./backend/weather.db`

## Biome

Uses `biome.json` at the root for both linting and formatting:

- Replaces both ESLint and Prettier
- Includes React hook rules
- Configured to mimic Prettier defaults (single quotes, trailing commas)
- `docs/**` is excluded from linting (uses separate Astro config)

## Astro Starlight Docs

The docs workspace lives under `docs/` and uses:

| Package | Purpose |
| --- | --- |
| `astro` | Docs app runtime and build. |
| `@astrojs/starlight` | Documentation theme and content collections. |
| `astro-mermaid` | Renders Mermaid fenced code blocks. |
| `mermaid` | Diagram renderer used by `astro-mermaid`. |
| `sharp` | Image processing dependency used by Astro. |

`docs/astro.config.mjs` registers Starlight first, then `mermaid()`. The sidebar is explicitly configured with the current guide and reference pages.

## Logging

The backend uses [Pino](https://getpino.io/) for structured JSON logging:

- **Output**: Writes to both `stdout` and `backend/logs/app.log`
- **HTTP logging**: Uses `pino-http` middleware (disabled in test)
- **Log level**: Defaults to `info`; set via `LOG_LEVEL` env var; `silent` in test

## Dev Server (Portless)

`scripts/dev.mjs` wraps the backend with [Portless](https://github.com/nicepkg/portless), which provides a stable local URL (`weather-starter.localhost:1355`) regardless of the actual port Express binds to.

Browser geolocation is expected to work on `localhost` and `*.localhost` local origins. If a browser blocks geolocation over HTTP during **Use my location** testing, set `PORTLESS_HTTPS=1` when running `npm run dev`.

## Environment Variables

| Variable | Used by | Purpose |
| --- | --- | --- |
| `WEATHER_API_KEY` | `SingaporeWeatherClient` | Optional provider API key sent as `x-api-key`. |
| `DATABASE_PATH` | `backend/src/db.ts`, `drizzle.config.ts` | SQLite database path. |
| `LOG_LEVEL` | `backend/src/logger.ts` | Pino log level. |
| `LOG_FILE_PATH` | `backend/src/logger.ts` | File path for application logs. |
| `PORT` | `backend/src/server.ts` | Direct Express listen port when running the compiled server manually. |
| `PORTLESS_PORT` | `scripts/dev.mjs` | Stable local Portless port. |
| `PORTLESS_HTTPS` | `scripts/dev.mjs` | Enables local HTTPS through Portless when set to `1`. |

## Runtime Modes

| Mode | Behavior |
| --- | --- |
| `NODE_ENV=test` | Disables request logging and frontend serving by default; tests inject a fake weather client and temp database. |
| Development | Express serves API routes and Vite middleware in one process. |
| Production | Express serves static files from `frontend/dist` and falls back to `index.html`. |
