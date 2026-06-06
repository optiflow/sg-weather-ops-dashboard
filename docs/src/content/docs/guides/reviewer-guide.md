---
title: Reviewer Guide
description: A 15-minute path for reviewing SG Weather Ops Dashboard across product scope, trust, accessibility, and verification.
---

Use this guide when you want to review the repository quickly without relying on private chat history.

## 15-Minute Review Path

1. Read the [README](https://github.com/optiflow/sg-weather-ops-dashboard/blob/main/README.md) for the product scope, architecture sketch, commands, and project map.
2. Run the app with `npm install` and `npm run dev`, then open the Portless URL printed by the terminal.
3. Add a saved place through **Add Location** using the forecast-area search and native **Forecast area** select.
4. Try **Use my location** on a trusted local origin, then confirm the saved row uses the matched forecast-area coordinate rather than raw browser coordinates.
5. Refresh a selected location and inspect the named **Data Trust** region for refresh status, missing signals, last check, and provider observed time.
6. Review the [API Endpoints](/sg-weather-ops-dashboard/reference/api-endpoints/), [Frontend Components](/sg-weather-ops-dashboard/reference/frontend-components/), and [Weather Data Pipeline](/sg-weather-ops-dashboard/guides/weather-data/) pages for the implementation contracts behind those UI flows.
7. Run the verification gate listed below.

## What This Repo Is

- A compact full-stack TypeScript case study for saving Singapore forecast areas and viewing one latest weather snapshot per saved location.
- A reviewable agentic-delivery artifact with product framing, scoped plans, implementation, tests, docs, and repository-local agent guidance.
- A practical dashboard surface that exercises React, Express, SQLite, Drizzle ORM, Astro docs, Playwright, and Singapore data.gov.sg weather APIs.

## What This Repo Is Not

- It is not a production emergency alerting or safety-advisory system.
- It is not a historical weather analytics platform; trend charts are deferred because they need append-only observation storage.
- It is not a claim that AI independently owned the product. The case study demonstrates AI-assisted delivery under human product constraints and verification.

## Trust Checks

- Coordinate scope is Singapore-only. API validation rejects coordinates outside the project bounding box.
- Forecast-area and browser-location flows persist canonical forecast-area label coordinates.
- Browser-position creates send only latitude and longitude to `POST /api/locations/from-position`; the endpoint stores the matched forecast area.
- Manual-create telemetry records non-sensitive metadata such as coordinate source, label presence, location id, and error text without raw latitude or longitude.
- `/api/logs` keeps its request shape but recursively drops coordinate-like metadata keys before logging: `latitude`, `longitude`, `lat`, `lon`, `coords`, and `coordinates`.
- `weather.data_quality` is the source of truth for complete, partial, unavailable, and not-refreshed weather states.

## Accessibility Checks

- The forecast-area add flow uses a labelled search input plus a native labelled **Forecast area** select.
- Forecast-area loading, no-match, retry, submit-error, success, and warning states are local to the add form and exposed with `aria-live` or `role="alert"`.
- Browser geolocation status remains local to **Use my location**.
- Refresh failures render beside the selected location's **Refresh** button instead of as a generic sidebar error.
- The **Data Trust** section is an accessible named region.

## Definition Of Done

Run the core gate from the repository root before treating code or documentation changes as complete:

```bash
npm test
npm run build
npm run docs:build
npm run lint
```

For browser-facing changes or reviewer handoff, also run:

```bash
npm run test:e2e
```

CI already runs the full gate: Vitest, production build, docs build, Biome CI, and Playwright smoke. Local visual QA should cover Add Location, Data Trust, refresh error placement, and desktop/mobile overflow when frontend layout changes.
