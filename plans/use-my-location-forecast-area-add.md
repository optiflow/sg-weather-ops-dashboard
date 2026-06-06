# Plan: Use My Location Forecast-Area Add

> Source PRD: Conversation PRD for adding a "Use my location" button that resolves browser coordinates to the nearest Singapore forecast area.
>
> Status: Implemented and archived. The current reviewer path is documented in [Reviewer Guide](../docs/src/content/docs/guides/reviewer-guide.md). Implemented API and user-flow behavior is documented in [API Endpoints](../docs/src/content/docs/reference/api-endpoints.md) and [Adding Locations](../docs/src/content/docs/guides/adding-locations.md).

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: Add `POST /api/locations/from-position` for browser-derived coordinates. Keep `POST /api/locations` unchanged for manual coordinate entry.
- **Schema**: Reuse the existing `locations` table and weather snapshot columns. No database migration is required.
- **Key models**: Return a wrapped result containing `location`, `created`, and `matched_area`.
- **Persistence**: Save the matched forecast-area label coordinate, not the raw browser coordinate.
- **Duplicate behavior**: Treat an existing canonical forecast-area coordinate as idempotent success and return the existing saved location.
- **Singapore scope**: Reject browser coordinates outside the existing Singapore bounding box. Do not map overseas coordinates to the closest Singapore area.
- **Provider boundary**: Keep data.gov.sg area metadata parsing and nearest-area matching in the backend.
- **Privacy**: Do not log raw browser latitude or longitude in frontend interaction events.
- **Manual flow**: Manual coordinate locations remain exact-coordinate entries and can coexist with canonical forecast-area entries.
- **Local development**: Browser geolocation must work on localhost or `*.localhost` without HTTPS where the browser treats the origin as trustworthy.

---

## Phase 1: Canonical Area Add API

**User stories**: 2, 3, 6, 7, 10

### What to build

Create the backend tracer bullet for adding a location from browser-derived coordinates. The endpoint accepts a latitude and longitude, validates that they are finite Singapore coordinates, resolves the nearest 2-hour forecast area from data.gov.sg metadata, saves the matched area label coordinate, refreshes weather for that saved coordinate, and returns a wrapped result. If the canonical area coordinate is already saved, the endpoint returns the existing location as a successful idempotent result.

### Acceptance criteria

- [ ] `POST /api/locations/from-position` accepts JSON browser coordinates and returns `{ location, created, matched_area }`.
- [ ] Valid in-Singapore coordinates are resolved to the nearest forecast-area label coordinate before persistence.
- [ ] The saved location's latitude and longitude are the matched area coordinates, not the raw browser coordinates.
- [ ] Duplicate canonical forecast-area coordinates return the existing location with `created: false`.
- [ ] Missing, non-number, and outside-Singapore inputs return the existing JSON error format and do not create a location.
- [ ] Forecast-area metadata lookup failure returns an error and does not create a location.
- [ ] Existing manual `POST /api/locations` behavior remains unchanged.
- [ ] Backend tests cover success, duplicate, invalid input, outside-Singapore input, lookup failure, and manual-create regression behavior.

---

## Phase 2: Sidebar Button Happy Path

**User stories**: 1, 2, 4, 8, 12

### What to build

Add an always-visible **Use my location** action to the sidebar. On click, the UI requests browser geolocation with balanced options, posts the returned coordinates to the new backend endpoint, reloads or updates saved locations, selects the returned location, and shows concise success feedback. The existing manual Add Location form remains available and unchanged.

### Acceptance criteria

- [ ] The sidebar shows a visible **Use my location** action without requiring the manual add form to be opened.
- [ ] The action calls browser geolocation with no high-accuracy requirement, a reasonable timeout, and cached position allowed for a few minutes.
- [ ] On success with a new canonical area, the returned location is selected and inline feedback says the area was added.
- [ ] On success with an existing canonical area, the returned location is selected and inline feedback says the area was already saved.
- [ ] The manual coordinate form still opens, submits, cancels, validates, and displays errors as before.
- [ ] The action works on localhost or `*.localhost` without HTTPS when the browser permits geolocation for the local origin.
- [ ] Frontend types and API helpers reflect the wrapped response shape.

---

## Phase 3: Failure And Privacy Handling

**User stories**: 3, 5, 6, 11

### What to build

Complete the failure and privacy behavior around the one-click location workflow. The UI should show clear inline messages for unsupported geolocation, insecure non-local context, permission denial, timeout, unavailable position, outside-Singapore backend rejection, duplicate/idempotent selection, and provider metadata failure. Interaction logging should avoid raw browser latitude and longitude while still recording useful action state.

### Acceptance criteria

- [ ] Unsupported browser geolocation shows an inline error and leaves manual add available.
- [ ] Non-local insecure HTTP shows an inline error before attempting geolocation.
- [ ] Permission denial shows a concise inline message and does not call the backend.
- [ ] Geolocation timeout or unavailable position shows a concise inline message and does not create a location.
- [ ] Backend validation errors and metadata lookup errors surface as inline messages.
- [ ] Loading state prevents duplicate button submissions while a geolocation or API request is in progress.
- [ ] Frontend interaction logs do not include raw browser latitude or longitude.
- [ ] Frontend behavior is verified for success and failure paths with mocked or controlled geolocation where practical.

---

## Phase 4: Documentation And Visual Verification

**User stories**: 4, 8, 12

### What to build

Document the new location-add workflow and verify the full user experience locally. The docs should explain the difference between manual coordinates and browser-location area matching, describe the new API contract, and note localhost geolocation expectations. Visual QA should confirm the sidebar layout remains responsive and the new button/status messages fit the existing design.

### Acceptance criteria

- [ ] API documentation includes `POST /api/locations/from-position`, request validation, response shape, idempotent duplicate behavior, and error behavior.
- [ ] The adding-locations guide describes manual coordinate entry and **Use my location** as separate flows.
- [ ] Frontend component/state documentation includes the new location action and response semantics.
- [ ] Local dev server verification confirms the button is visible and usable on the local app URL.
- [ ] Browser QA covers success, duplicate, permission denied, timeout/unavailable, outside-Singapore, and responsive sidebar layout.
- [ ] Final verification runs `npm test`, `npm run build`, and `npm run lint`.
