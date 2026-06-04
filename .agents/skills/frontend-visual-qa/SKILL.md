---
name: frontend-visual-qa
description: Verify SG Weather Ops Dashboard frontend, responsive layout, theme, Leaflet map, and browser behavior after UI changes.
---

# Frontend Visual QA

Use this skill after dashboard, component, theme, responsive layout, or Leaflet map changes.

## Workflow

1. Start the app from the repo root:
   - `npm run dev`
2. Open the Portless URL printed by the dev server, usually `http://sg-weather-ops-dashboard.localhost:1355`.
3. Verify the core screens:
   - Empty state.
   - Location list with at least one saved location.
   - Selected location hero/details.
   - Add location form.
   - Map card and fullscreen map.
   - Theme selector.
4. Check responsive behavior:
   - Desktop width.
   - Mobile width.
   - Ensure text does not overlap or overflow controls.
5. Inspect browser console and network requests for errors.
6. Run the repo quality gate before final response.

## Local App Notes

- Frontend calls use relative `/api` paths, so test through the Express/Vite dev server rather than opening `frontend/index.html` directly.
- Leaflet tiles require network access. If map tiles fail because the environment blocks network requests, report that separately from application errors.
- Geolocation workflows may need HTTPS. Use `PORTLESS_HTTPS=1 npm run dev` when testing browser geolocation features.
