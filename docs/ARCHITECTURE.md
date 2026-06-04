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
  - **Command**: `npm run docs` starts the dev server on port 4321.
