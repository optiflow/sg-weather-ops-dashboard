import { expect, type Page, type Route, test } from '@playwright/test';

type RefreshStatus = 'unknown' | 'not_refreshed' | 'complete' | 'partial' | 'unavailable';

type WeatherSignal =
  | 'two_hour_forecast'
  | 'air_temperature'
  | 'relative_humidity'
  | 'rainfall'
  | 'wind_speed'
  | 'wind_direction'
  | 'uv'
  | 'psi'
  | 'pm25'
  | 'twenty_four_hour_forecast'
  | 'four_day_forecast';

interface WeatherSnapshot {
  condition: string | null;
  observed_at: string | null;
  source: string | null;
  area: string | null;
  valid_period_text: string | null;
  temperature_c: number | null;
  humidity_percent: number | null;
  rainfall_mm: number | null;
  wind_speed_knots: number | null;
  wind_direction_degrees: number | null;
  forecast_low_c: number | null;
  forecast_high_c: number | null;
  uv_index: number | null;
  psi_twenty_four_hourly: number | null;
  pm25_one_hourly: number | null;
  air_quality_region: string | null;
  forecast_periods: Array<{ label: string; forecast: string }>;
  daily_forecast: Array<{
    date: string;
    forecast: string;
    temperature_low_c: number | null;
    temperature_high_c: number | null;
  }>;
  data_quality: {
    status: RefreshStatus;
    last_refreshed_at: string | null;
    unavailable_signals: WeatherSignal[];
  };
}

interface Location {
  id: number;
  latitude: number;
  longitude: number;
  label: string | null;
  is_favorite: boolean;
  created_at: string;
  weather: WeatherSnapshot;
}

interface ForecastArea {
  name: string;
  latitude: number;
  longitude: number;
}

interface MatchedArea {
  name: string;
  latitude: number;
  longitude: number;
}

interface CreateLocationPayload {
  latitude: number;
  longitude: number;
  label?: string | null;
}

interface FromAreaPayload {
  name: string;
  label?: string | null;
}

interface FromPositionResponse {
  location: Location;
  created: boolean;
  matched_area: MatchedArea;
}

type FromAreaResponse = FromPositionResponse;

interface LocationUpdatePayload {
  label?: string | null;
  is_favorite?: boolean;
}

interface ApiMockOptions {
  forecastAreas?: ForecastArea[];
  create?: (payload: CreateLocationPayload) => Location;
  fromArea?: (payload: FromAreaPayload) => FromAreaResponse;
  fromPosition?: (payload: CreateLocationPayload) => FromPositionResponse;
  update?: (id: number, payload: LocationUpdatePayload, current: Location) => Location;
  refresh?: (id: number) => Location;
}

test('loads the dashboard shell', async ({ page }) => {
  await mockLocationApi(page, []);
  await page.goto('/');

  await expect(page.getByLabel('Search saved locations')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Use my location' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Location' })).toBeVisible();
  await expect(page.getByLabel('Theme')).toBeVisible();
});

test('keeps the dashboard shell usable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mockLocationApi(page, [location(1, 'Bishan')]);
  await page.goto('/');

  const sidebar = page.locator('aside');
  await expect(sidebar).toBeVisible();
  await expect(page.getByLabel('Search saved locations')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Use my location' })).toBeVisible();
  await expect(page.getByRole('main').getByRole('heading', { name: 'Bishan' })).toBeVisible();
  await page.getByLabel('Theme').selectOption('cotton-candy');

  const sidebarBox = await sidebar.boundingBox();
  const searchBox = await page.getByLabel('Search saved locations').boundingBox();
  const themeBox = await page.getByLabel('Theme').boundingBox();
  expect(sidebarBox?.width).toBeLessThanOrEqual(375);
  expect(searchBox?.y ?? 0).toBeGreaterThan((themeBox?.y ?? 0) + (themeBox?.height ?? 0));
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
});

test('creates a forecast-area location with an optional label from the picker', async ({
  page,
}) => {
  const fromAreaRequests: FromAreaPayload[] = [];
  await mockLocationApi(page, [], {
    forecastAreas: [
      forecastArea('Bishan', 1.352, 103.849),
      forecastArea('Changi', 1.364, 103.991),
      forecastArea('Jurong West', 1.34, 103.706),
    ],
    fromArea: (payload) => {
      fromAreaRequests.push(payload);
      return {
        location: location(
          10,
          payload.name,
          { condition: 'Fair' },
          { label: payload.label ?? null, latitude: 1.352, longitude: 103.849 },
        ),
        created: true,
        matched_area: matchedArea(payload.name),
      };
    },
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Add Location' }).click();

  await expect(page.getByLabel('Search forecast areas')).toBeVisible();
  await expect(page.getByRole('option', { name: /Select Bishan/ })).toBeVisible();
  await expect(page.getByRole('option', { name: /Select Changi/ })).toBeVisible();

  await page.getByLabel('Search forecast areas').fill('chan');
  await expect(page.getByRole('option', { name: /Select Changi/ })).toBeVisible();
  await expect(page.getByRole('option', { name: /Select Bishan/ })).toHaveCount(0);

  await page.getByLabel('Search forecast areas').fill('bish');
  await page.getByRole('option', { name: /Select Bishan/ }).click();
  await locationLabelInput(page).fill('Office');
  await page.getByRole('button', { name: /Add selected area|Add forecast area/i }).click();

  await expect(page.locator('aside')).toContainText('Office');
  await expect(page.getByRole('main')).toContainText('Office');
  await expect(page.getByRole('main')).toContainText('Bishan');
  expect(fromAreaRequests).toEqual([{ name: 'Bishan', label: 'Office' }]);
});

test('keeps manual coordinate mode working', async ({ page }) => {
  const createRequests: CreateLocationPayload[] = [];
  await mockLocationApi(page, [], {
    create: (payload) => {
      createRequests.push(payload);
      return location(
        20,
        null,
        { condition: 'Not refreshed', data_quality: dataQuality('not_refreshed') },
        {
          latitude: payload.latitude,
          longitude: payload.longitude,
          label: payload.label ?? null,
        },
      );
    },
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Add Location' }).click();

  const manualModeButton = page.getByRole('button', { name: /Coordinates/i });
  if ((await manualModeButton.count()) > 0) {
    await manualModeButton.click();
  }

  await expect(page.getByText('New location')).toBeVisible();
  await expect(page.getByLabel('Latitude')).toBeVisible();
  await expect(page.getByLabel('Longitude')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeVisible();
  await page.getByLabel('Latitude').fill('1.346');
  await page.getByLabel('Longitude').fill('103.812');
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await expect(
    page.getByRole('main').getByRole('heading', { name: '1.346, 103.812' }),
  ).toBeVisible();
  expect(createRequests).toEqual([{ latitude: 1.346, longitude: 103.812 }]);
});

test('persists accessible theme selection', async ({ page }) => {
  await mockLocationApi(page, []);
  await page.goto('/');
  await page.getByLabel('Theme').selectOption('terminal');

  await expect(page.locator('body')).toHaveClass(/theme-terminal/);
});

test('renders selected-location risk and data trust without fake primary labels', async ({
  page,
}) => {
  await mockLocationApi(page, [
    location(1, 'Bishan', {
      condition: 'Thundery Showers',
      rainfall_mm: 14,
      uv_index: 9,
      data_quality: dataQuality('partial', ['uv']),
    }),
  ]);
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Bishan' })).toBeVisible();
  const riskBrief = page.locator('section', { hasText: 'Weather Risk Brief' });
  await expect(riskBrief).toContainText('Take care');
  await expect(riskBrief).toContainText('Rain or thunder could affect plans in Bishan.');
  await expect(riskBrief).toContainText(
    'Bring an umbrella and plan for shelter before heading out.',
  );

  const dataTrust = page.locator('section', { hasText: 'Data Trust' });
  await expect(dataTrust).toContainText('Partial');
  await expect(dataTrust).toContainText('Missing UV');
  await expect(page.getByText('Home', { exact: true })).toHaveCount(0);
  await expect(page.getByText('My Location', { exact: true })).toHaveCount(0);
});

test('shows saved labels in the sidebar and selected-location view', async ({ page }) => {
  await mockLocationApi(page, [
    location(1, 'Bishan', { condition: 'Cloudy' }, { label: 'Office' }),
  ]);
  await page.goto('/');

  await expect(page.locator('aside')).toContainText('Office');
  await expect(page.locator('aside')).toContainText('Bishan');
  await expect(page.getByRole('main').getByRole('heading', { name: 'Office' })).toBeVisible();
  await expect(page.getByRole('main')).toContainText('Bishan');
});

test('filters saved locations by accessible search', async ({ page }) => {
  await mockLocationApi(page, [
    location(1, 'Bishan', { condition: 'Cloudy' }),
    location(2, 'Changi', { condition: 'Showers' }),
  ]);
  await page.goto('/');

  await page.getByLabel('Search saved locations').fill('showers');

  await expect(page.getByRole('button', { name: /Select Changi/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Select Bishan/ })).toHaveCount(0);
});

test('renames, clears, favorites, unfavorites, and sorts saved locations', async ({ page }) => {
  const patchRequests: Array<{ id: number; payload: LocationUpdatePayload }> = [];
  await mockLocationApi(
    page,
    [
      location(1, 'Changi', {}, { created_at: '2026-06-05T03:00:00.000Z' }),
      location(2, 'Bishan', {}, { created_at: '2026-06-05T01:00:00.000Z', label: 'Office' }),
    ],
    {
      update: (id, payload, current) => {
        patchRequests.push({ id, payload });
        return updatedLocation(current, payload);
      },
    },
  );
  await page.goto('/');

  await page.getByRole('button', { name: /Select (Office|Bishan)/ }).click();
  await page.getByRole('button', { name: /Rename (Office|Bishan)/ }).click();
  await locationLabelInput(page).fill('Home base');
  await page.getByRole('button', { name: /Save label/i }).click();

  await expect(page.getByRole('main')).toContainText('Home base');
  expect(patchRequests).toContainEqual({ id: 2, payload: { label: 'Home base' } });

  await page.getByRole('button', { name: /Rename Home base/ }).click();
  await page.getByRole('button', { name: /Clear label/i }).click();
  await expect(page.getByRole('main').getByRole('heading', { name: 'Bishan' })).toBeVisible();
  await expect(page.getByRole('main')).not.toContainText('Home base');
  expect(patchRequests).toContainEqual({ id: 2, payload: { label: null } });

  await page.getByRole('button', { name: /Favorite Bishan/ }).click();
  await expect(page.getByRole('button', { name: /Unfavorite Bishan/ })).toBeVisible();
  expect(patchRequests).toContainEqual({ id: 2, payload: { is_favorite: true } });

  await page.getByRole('button', { name: /Unfavorite Bishan/ }).click();
  await expect(page.getByRole('button', { name: /Favorite Bishan/ })).toBeVisible();
  expect(patchRequests).toContainEqual({ id: 2, payload: { is_favorite: false } });

  await chooseLocationSort(page, 'Name');
  await expectSidebarOrder(page, /Select Bishan/, /Select Changi/);

  await chooseLocationSort(page, 'Recent');
  await expectSidebarOrder(page, /Select Changi/, /Select Bishan/);
});

test('reports browser geolocation partial-success locally', async ({ page }) => {
  const bishan = location(1, 'Bishan', {
    condition: 'Showers',
    data_quality: dataQuality('partial', ['uv']),
  });
  await mockBrowserGeolocationSuccess(page);
  await mockLocationApi(page, [], {
    fromPosition: () => ({
      location: bishan,
      created: true,
      matched_area: matchedArea('Bishan'),
    }),
  });
  await page.goto('/');

  await page.getByRole('button', { name: 'Use my location' }).click();

  await expect(page.getByText('Added Bishan with partial weather data.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Bishan' })).toBeVisible();
});

test('reports duplicate geolocation as an idempotent success', async ({ page }) => {
  const bishan = location(1, 'Bishan');
  await mockBrowserGeolocationSuccess(page);
  await mockLocationApi(page, [bishan], {
    fromPosition: () => ({
      location: bishan,
      created: false,
      matched_area: matchedArea('Bishan'),
    }),
  });
  await page.goto('/');

  await page.getByRole('button', { name: 'Use my location' }).click();

  await expect(page.getByText('Bishan was already saved.')).toBeVisible();
  await expect(page.getByText('Weather data could not be updated.')).toHaveCount(0);
});

test('keeps geolocation permission errors local to the button', async ({ page }) => {
  await mockBrowserGeolocationError(page, 1);
  await mockLocationApi(page, []);
  await page.goto('/');

  await page.getByRole('button', { name: 'Use my location' }).click();

  await expect(
    page.getByText('Allow location access to add your nearest forecast area.'),
  ).toBeVisible();
  await expect(page.getByText('Weather data could not be updated.')).toHaveCount(0);
});

test('refreshes a selected location and updates Data Trust', async ({ page }) => {
  const initial = location(1, 'Bishan', {
    condition: 'Cloudy',
    data_quality: dataQuality('partial', ['uv']),
  });
  const refreshed = location(1, 'Bishan', {
    condition: 'Fair',
    data_quality: dataQuality('complete'),
  });
  await mockLocationApi(page, [initial], {
    refresh: () => refreshed,
  });
  await page.goto('/');

  await page.getByRole('button', { name: 'Refresh' }).click();

  await expect(page.getByRole('main').getByText('Fair', { exact: true })).toBeVisible();
  await expect(page.locator('section', { hasText: 'Data Trust' })).toContainText('Complete');
});

test('requires confirmation before deleting a saved location', async ({ page }) => {
  await mockLocationApi(page, [location(1, 'Bishan'), location(2, 'Changi')]);
  await page.goto('/');

  await page.getByRole('button', { name: 'Delete Bishan' }).click();
  await expect(page.getByRole('button', { name: 'Confirm delete Bishan' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('button', { name: /Select Bishan/ })).toBeVisible();

  await page.getByRole('button', { name: 'Delete Bishan' }).click();
  await page.getByRole('button', { name: 'Confirm delete Bishan' }).click();

  await expect(page.getByRole('button', { name: /Select Bishan/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Select Changi/ })).toBeVisible();
});

test('opens and closes the fullscreen map as a dialog', async ({ page }) => {
  await mockLocationApi(page, [location(1, 'Bishan')]);
  await page.goto('/');

  await page.getByRole('button', { name: 'Expand map' }).click();
  await expect(page.getByRole('dialog', { name: 'Map Overview' })).toBeVisible();
  await expect(page.getByLabel('Saved weather map locations')).toContainText('Bishan');

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Map Overview' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Expand map' })).toBeFocused();
});

async function mockLocationApi(
  page: Page,
  initialLocations: Location[],
  options: ApiMockOptions = {},
) {
  let locations = initialLocations.map(cloneLocation);
  let nextLocationId = Math.max(0, ...locations.map((location) => location.id)) + 1;
  const forecastAreas = options.forecastAreas ?? [
    forecastArea('Bishan', 1.352, 103.849),
    forecastArea('Changi', 1.364, 103.991),
    forecastArea('Jurong West', 1.34, 103.706),
  ];

  await page.route('**/api/logs', (route) => route.fulfill({ status: 204, body: '' }));
  await page.route('https://*.basemaps.cartocdn.com/**', (route) =>
    route.fulfill({ status: 204, body: '' }),
  );

  await page.route('**/api/forecast-areas', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await fulfillJson(route, { areas: forecastAreas });
  });

  await page.route('**/api/locations/from-area', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    const payload = route.request().postDataJSON() as FromAreaPayload;
    const area = forecastAreas.find((candidate) => candidate.name === payload.name);
    const fallbackLocation = location(
      nextLocationId++,
      payload.name,
      { condition: 'Not refreshed', data_quality: dataQuality('not_refreshed') },
      {
        latitude: area?.latitude ?? 1.352,
        longitude: area?.longitude ?? 103.849,
        label: payload.label ?? null,
      },
    );
    const response = options.fromArea?.(payload) ?? {
      location: fallbackLocation,
      created: true,
      matched_area: matchedArea(payload.name, area),
    };
    locations = upsertLocation(locations, response.location);
    await fulfillJson(route, response, response.created ? 201 : 200);
  });

  await page.route('**/api/locations/from-position', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    const payload = route.request().postDataJSON() as CreateLocationPayload;
    const response = options.fromPosition?.(payload) ?? {
      location: locations[0],
      created: false,
      matched_area: matchedArea(locations[0]?.weather.area ?? 'Bishan'),
    };
    if (response.created) {
      locations = [
        cloneLocation(response.location),
        ...locations.filter((location) => location.id !== response.location.id),
      ];
    }
    await fulfillJson(route, response, response.created ? 201 : 200);
  });

  await page.route(/\/api\/locations\/\d+\/refresh$/, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    const id = locationId(route.request().url());
    const refreshed = options.refresh?.(id) ?? locations.find((location) => location.id === id);
    if (!refreshed) {
      await fulfillJson(route, { detail: 'Location not found' }, 404);
      return;
    }
    locations = locations.map((location) =>
      location.id === id ? cloneLocation(refreshed) : location,
    );
    await fulfillJson(route, refreshed);
  });

  await page.route(/\/api\/locations\/\d+$/, async (route) => {
    const id = locationId(route.request().url());
    if (route.request().method() === 'PATCH') {
      const payload = route.request().postDataJSON() as LocationUpdatePayload;
      const found = locations.find((location) => location.id === id);
      if (!found) {
        await fulfillJson(route, { detail: 'Location not found' }, 404);
        return;
      }
      const updated =
        options.update?.(id, payload, cloneLocation(found)) ?? updatedLocation(found, payload);
      locations = locations.map((location) =>
        location.id === id ? cloneLocation(updated) : location,
      );
      await fulfillJson(route, updated);
      return;
    }
    if (route.request().method() === 'DELETE') {
      locations = locations.filter((location) => location.id !== id);
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    const found = locations.find((location) => location.id === id);
    await fulfillJson(route, found ?? { detail: 'Location not found' }, found ? 200 : 404);
  });

  await page.route('**/api/locations', async (route) => {
    if (route.request().method() === 'GET') {
      await fulfillJson(route, { locations });
      return;
    }
    if (route.request().method() === 'POST') {
      const payload = route.request().postDataJSON() as CreateLocationPayload;
      const created =
        options.create?.(payload) ??
        location(
          nextLocationId++,
          null,
          { condition: 'Not refreshed', data_quality: dataQuality('not_refreshed') },
          {
            latitude: payload.latitude,
            longitude: payload.longitude,
            label: payload.label ?? null,
          },
        );
      locations = upsertLocation(locations, created);
      await fulfillJson(route, created, 201);
      return;
    }
    await fulfillJson(route, { detail: 'Unexpected test request' }, 500);
  });
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function mockBrowserGeolocationSuccess(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition(success: PositionCallback) {
          success({
            coords: {
              latitude: 1.35,
              longitude: 103.85,
              accuracy: 10,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
            },
            timestamp: Date.now(),
          });
        },
      },
    });
  });
}

async function mockBrowserGeolocationError(page: Page, code: number) {
  await page.addInitScript((errorCode) => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition(_success: PositionCallback, error: PositionErrorCallback) {
          error({
            code: errorCode,
            message: 'Denied by test',
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          });
        },
      },
    });
  }, code);
}

function location(
  id: number,
  area: string | null,
  weatherOverrides: Partial<WeatherSnapshot> = {},
  locationOverrides: Partial<Omit<Location, 'id' | 'weather'>> = {},
): Location {
  return {
    id,
    latitude: locationOverrides.latitude ?? 1.352 + id / 1000,
    longitude: locationOverrides.longitude ?? 103.849 + id / 1000,
    label: locationOverrides.label ?? null,
    is_favorite: locationOverrides.is_favorite ?? false,
    created_at: locationOverrides.created_at ?? new Date().toISOString(),
    weather: {
      condition: 'Cloudy',
      observed_at: new Date().toISOString(),
      source: 'test',
      area,
      valid_period_text: 'Now',
      temperature_c: 29,
      humidity_percent: 80,
      rainfall_mm: 0,
      wind_speed_knots: 4,
      wind_direction_degrees: 180,
      forecast_low_c: 25,
      forecast_high_c: 32,
      uv_index: 7,
      psi_twenty_four_hourly: 42,
      pm25_one_hourly: 9,
      air_quality_region: 'central',
      forecast_periods: [{ label: 'Now', forecast: 'Cloudy' }],
      daily_forecast: [
        {
          date: '2026-05-05',
          forecast: 'Cloudy',
          temperature_low_c: 25,
          temperature_high_c: 32,
        },
      ],
      data_quality: dataQuality('complete'),
      ...weatherOverrides,
    },
  };
}

function dataQuality(
  status: RefreshStatus,
  unavailableSignals: WeatherSignal[] = [],
): WeatherSnapshot['data_quality'] {
  return {
    status,
    last_refreshed_at: status === 'not_refreshed' ? null : new Date().toISOString(),
    unavailable_signals: unavailableSignals,
  };
}

function forecastArea(name: string, latitude: number, longitude: number): ForecastArea {
  return {
    name,
    latitude,
    longitude,
  };
}

function matchedArea(name: string, area?: ForecastArea): MatchedArea {
  return {
    name,
    latitude: area?.latitude ?? 1.352,
    longitude: area?.longitude ?? 103.849,
  };
}

function locationId(url: string): number {
  const match = new URL(url).pathname.match(/\/api\/locations\/(\d+)/);
  return match ? Number(match[1]) : Number.NaN;
}

function updatedLocation(location: Location, payload: LocationUpdatePayload): Location {
  return {
    ...cloneLocation(location),
    label: payload.label === undefined ? location.label : payload.label,
    is_favorite: payload.is_favorite === undefined ? location.is_favorite : payload.is_favorite,
  };
}

function upsertLocation(locations: Location[], next: Location): Location[] {
  return [
    cloneLocation(next),
    ...locations.filter((location) => location.id !== next.id).map(cloneLocation),
  ];
}

function locationLabelInput(page: Page) {
  return page.getByLabel(/^(Label \(optional\)|Location label)$/i);
}

async function chooseLocationSort(page: Page, label: 'Recent' | 'Name') {
  const sortSelect = page.getByLabel('Sort locations');
  if ((await sortSelect.count()) > 0) {
    await sortSelect.selectOption({ label });
    return;
  }
  await page.getByRole('button', { name: new RegExp(`^(Sort by )?${label}$`, 'i') }).click();
}

async function expectSidebarOrder(page: Page, first: RegExp, second: RegExp) {
  const locationButtons = page.locator('aside').getByRole('button', { name: /^Select / });
  await expect(locationButtons.nth(0)).toHaveAccessibleName(first);
  await expect(locationButtons.nth(1)).toHaveAccessibleName(second);
}

function cloneLocation(value: Location): Location {
  return JSON.parse(JSON.stringify(value)) as Location;
}
