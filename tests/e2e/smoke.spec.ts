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
  created_at: string;
  weather: WeatherSnapshot;
}

interface MatchedArea {
  name: string;
  latitude: number;
  longitude: number;
}

interface FromPositionResponse {
  location: Location;
  created: boolean;
  matched_area: MatchedArea;
}

interface ApiMockOptions {
  fromPosition?: (payload: { latitude: number; longitude: number }) => FromPositionResponse;
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

  const sidebarBox = await sidebar.boundingBox();
  const searchBox = await page.getByLabel('Search saved locations').boundingBox();
  const themeBox = await page.getByLabel('Theme').boundingBox();
  expect(sidebarBox?.width).toBeLessThanOrEqual(375);
  expect(searchBox?.y ?? 0).toBeGreaterThan((themeBox?.y ?? 0) + (themeBox?.height ?? 0));
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
});

test('opens the add location form accessibly', async ({ page }) => {
  await mockLocationApi(page, []);
  await page.goto('/');
  await page.getByRole('button', { name: 'Add Location' }).click();

  await expect(page.getByText('New coordinate')).toBeVisible();
  await expect(page.getByLabel('Latitude')).toBeVisible();
  await expect(page.getByLabel('Longitude')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeVisible();
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
  await expect(riskBrief).toContainText('High');
  await expect(riskBrief).toContainText('Rain and storms');

  const dataTrust = page.locator('section', { hasText: 'Data Trust' });
  await expect(dataTrust).toContainText('Partial');
  await expect(dataTrust).toContainText('Missing UV');
  await expect(page.getByText('Home', { exact: true })).toHaveCount(0);
  await expect(page.getByText('My Location', { exact: true })).toHaveCount(0);
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

  await page.route('**/api/logs', (route) => route.fulfill({ status: 204, body: '' }));
  await page.route('https://*.basemaps.cartocdn.com/**', (route) =>
    route.fulfill({ status: 204, body: '' }),
  );

  await page.route('**/api/locations/from-position', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    const payload = route.request().postDataJSON() as { latitude: number; longitude: number };
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
  area: string,
  weatherOverrides: Partial<WeatherSnapshot> = {},
): Location {
  return {
    id,
    latitude: 1.352 + id / 1000,
    longitude: 103.849 + id / 1000,
    created_at: new Date().toISOString(),
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

function matchedArea(name: string): MatchedArea {
  return {
    name,
    latitude: 1.352,
    longitude: 103.849,
  };
}

function locationId(url: string): number {
  const match = new URL(url).pathname.match(/\/api\/locations\/(\d+)/);
  return match ? Number(match[1]) : Number.NaN;
}

function cloneLocation(value: Location): Location {
  return JSON.parse(JSON.stringify(value)) as Location;
}
