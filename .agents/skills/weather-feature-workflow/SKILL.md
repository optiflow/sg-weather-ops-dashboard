---
name: weather-feature-workflow
description: Implement SG Weather Ops Dashboard feature tasks that span Express routes, Drizzle/SQLite data, Singapore weather data, React state, and dashboard components.
---

# Weather Feature Workflow

Use this skill when adding or modifying user-facing weather app features, especially README feature tasks.

## Workflow

1. Read only the relevant context:
   - `docs/ARCHITECTURE.md`
   - `docs/TYPESCRIPT.md`
   - Existing files in `backend/src`, `frontend/src/state`, `frontend/src/api.ts`, and the component being changed.
2. Define the data contract first:
   - Backend response shape.
   - Frontend type in `frontend/src/types.ts`.
   - Whether persisted fields belong in `backend/src/schema.ts`.
3. Implement backend behavior:
   - Add or update Express routes under `backend/src/routes`.
   - Add database helpers in `backend/src/db.ts` when persistence changes.
   - Use `SingaporeWeatherClient` from `backend/src/weather.ts` for provider access.
4. Implement frontend behavior:
   - Add API helpers in `frontend/src/api.ts`.
   - Update store actions in `frontend/src/state/store.tsx` when the workflow changes shared app state.
   - Keep component changes typed and focused.
5. Add or update tests:
   - Prefer backend route tests with a fake weather client for API behavior.
   - Add frontend tests only if the project introduces a frontend test harness.
6. Update relevant docs and run the repo quality gate.

## Project Conventions

- Coordinates must remain constrained to Singapore unless the feature explicitly changes app scope.
- Prefer snapshot persistence for current weather. Use a separate history table only when the feature needs time-series data.
- Mirror backend and frontend weather field names deliberately. API JSON uses snake_case; TypeScript internals may use camelCase where Drizzle requires it.
- Keep external provider failures isolated: location creation may still succeed with placeholder weather, while manual refresh should return a provider error.
