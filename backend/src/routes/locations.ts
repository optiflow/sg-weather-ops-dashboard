import type { Response, Router } from 'express';
import { Router as createRouter } from 'express';
import {
  createLocation,
  deleteLocation,
  getLocation,
  getLocationByCoordinates,
  listLocations,
  updateLocationMetadata,
  updateWeather,
} from '../db.js';
import { logger } from '../logger.js';
import {
  SingaporeWeatherClient,
  type TwoHourForecastArea,
  WeatherProviderError,
  type WeatherSnapshot,
} from '../weather.js';

export interface WeatherClient {
  getCurrentWeather(latitude: number, longitude: number): Promise<WeatherSnapshot>;
  listTwoHourForecastAreas(): Promise<TwoHourForecastArea[]>;
  getTwoHourForecastAreaByName(name: string): Promise<TwoHourForecastArea>;
  getNearestTwoHourForecastArea(latitude: number, longitude: number): Promise<TwoHourForecastArea>;
}

interface LocationsRouterOptions {
  weatherClient?: WeatherClient;
}

export function createLocationsRouter(options: LocationsRouterOptions = {}): Router {
  const router: Router = createRouter();
  const weatherClient =
    options.weatherClient ?? new SingaporeWeatherClient({ apiKey: process.env.WEATHER_API_KEY });

  router.get('/locations', async (_request, response, next) => {
    try {
      response.json({ locations: await listLocations() });
    } catch (error) {
      next(error);
    }
  });

  router.get('/forecast-areas', async (_request, response, next) => {
    try {
      response.json({ areas: await weatherClient.listTwoHourForecastAreas() });
    } catch (error) {
      if (error instanceof WeatherProviderError) {
        response.status(502).json({ detail: error.message });
        return;
      }
      next(error);
    }
  });

  router.post('/locations/from-area', async (request, response, next) => {
    try {
      const body = request.body as { name?: unknown; label?: unknown } | undefined;
      if (typeof body?.name !== 'string' || body.name.trim().length === 0) {
        response.status(422).json({ detail: 'forecast area name is required' });
        return;
      }
      const label = parseOptionalLabel(body, response);
      if (label === invalidLabel) return;

      let matchedArea: TwoHourForecastArea;
      try {
        matchedArea = await weatherClient.getTwoHourForecastAreaByName(body.name);
      } catch (error) {
        if (error instanceof WeatherProviderError && error.message === 'Forecast area not found') {
          response.status(422).json({ detail: 'Forecast area not found' });
          return;
        }
        throw error;
      }

      const existingLocation = await getLocationByCoordinates(
        matchedArea.latitude,
        matchedArea.longitude,
      );
      if (existingLocation) {
        const location =
          label !== undefined
            ? ((await updateLocationMetadata(existingLocation.id, { label })) ?? existingLocation)
            : existingLocation;
        response.json({ location, created: false, matched_area: matchedArea });
        return;
      }

      let location: Awaited<ReturnType<typeof createLocation>>;
      try {
        location = await createLocation(matchedArea.latitude, matchedArea.longitude, { label });
      } catch (error) {
        if (isDuplicateLocationError(error)) {
          const duplicateLocation = await getLocationByCoordinates(
            matchedArea.latitude,
            matchedArea.longitude,
          );
          if (duplicateLocation) {
            const location =
              label !== undefined
                ? ((await updateLocationMetadata(duplicateLocation.id, { label })) ??
                  duplicateLocation)
                : duplicateLocation;
            response.json({ location, created: false, matched_area: matchedArea });
            return;
          }
        }
        throw error;
      }

      try {
        const snapshot = await weatherClient.getCurrentWeather(
          location.latitude,
          location.longitude,
        );
        const updated = await updateWeather(location.id, snapshot);
        response
          .status(201)
          .json({ location: updated ?? location, created: true, matched_area: matchedArea });
      } catch (error) {
        if (!(error instanceof WeatherProviderError)) throw error;
        const locationWithMatchedArea = (await updateWeather(location.id, {
          ...location.weather,
          area: matchedArea.name,
        })) ?? {
          ...location,
          weather: { ...location.weather, area: matchedArea.name },
        };
        logger.warn(
          { err: error, locationId: location.id },
          'weather refresh failed after location create from forecast area',
        );
        response
          .status(201)
          .json({ location: locationWithMatchedArea, created: true, matched_area: matchedArea });
      }
    } catch (error) {
      if (error instanceof WeatherProviderError) {
        response.status(502).json({ detail: error.message });
        return;
      }
      next(error);
    }
  });

  router.post('/locations/from-position', async (request, response, next) => {
    try {
      const body = request.body as { latitude?: unknown; longitude?: unknown } | undefined;
      const latitude = body?.latitude;
      const longitude = body?.longitude;

      if (!isFiniteNumber(latitude) || !isFiniteNumber(longitude)) {
        response.status(422).json({ detail: 'latitude and longitude are required' });
        return;
      }
      if (!isSingaporeCoordinate(latitude, longitude)) {
        response.status(422).json({
          detail: 'Coordinates must be within Singapore (lat 1.1-1.5, lon 103.6-104.1)',
        });
        return;
      }

      const matchedArea = await weatherClient.getNearestTwoHourForecastArea(latitude, longitude);
      const existingLocation = await getLocationByCoordinates(
        matchedArea.latitude,
        matchedArea.longitude,
      );
      if (existingLocation) {
        response.json({ location: existingLocation, created: false, matched_area: matchedArea });
        return;
      }

      let location: Awaited<ReturnType<typeof createLocation>>;
      try {
        location = await createLocation(matchedArea.latitude, matchedArea.longitude);
      } catch (error) {
        if (isDuplicateLocationError(error)) {
          const duplicateLocation = await getLocationByCoordinates(
            matchedArea.latitude,
            matchedArea.longitude,
          );
          if (duplicateLocation) {
            response.json({
              location: duplicateLocation,
              created: false,
              matched_area: matchedArea,
            });
            return;
          }
        }
        throw error;
      }

      try {
        const snapshot = await weatherClient.getCurrentWeather(
          location.latitude,
          location.longitude,
        );
        const updated = await updateWeather(location.id, snapshot);
        response
          .status(201)
          .json({ location: updated ?? location, created: true, matched_area: matchedArea });
      } catch (error) {
        if (!(error instanceof WeatherProviderError)) throw error;
        const locationWithMatchedArea = (await updateWeather(location.id, {
          ...location.weather,
          area: matchedArea.name,
        })) ?? {
          ...location,
          weather: { ...location.weather, area: matchedArea.name },
        };
        logger.warn(
          { err: error, locationId: location.id },
          'weather refresh failed after location create from browser position',
        );
        response
          .status(201)
          .json({ location: locationWithMatchedArea, created: true, matched_area: matchedArea });
      }
    } catch (error) {
      if (error instanceof WeatherProviderError) {
        response.status(502).json({ detail: error.message });
        return;
      }
      next(error);
    }
  });

  router.post('/locations', async (request, response, next) => {
    try {
      const body = request.body as
        | { latitude?: unknown; longitude?: unknown; label?: unknown }
        | undefined;
      const latitude = body?.latitude;
      const longitude = body?.longitude;
      const label = parseOptionalLabel(body, response);
      if (label === invalidLabel) return;

      if (!isFiniteNumber(latitude) || !isFiniteNumber(longitude)) {
        response.status(422).json({ detail: 'latitude and longitude are required' });
        return;
      }
      if (!(1.1 <= latitude && latitude <= 1.5 && 103.6 <= longitude && longitude <= 104.1)) {
        response.status(422).json({
          detail: 'Coordinates must be within Singapore (lat 1.1-1.5, lon 103.6-104.1)',
        });
        return;
      }

      const location = await createLocation(latitude, longitude, { label });

      try {
        const snapshot = await weatherClient.getCurrentWeather(
          location.latitude,
          location.longitude,
        );
        const updated = await updateWeather(location.id, snapshot);
        response.status(201).json(updated ?? location);
      } catch (error) {
        if (!(error instanceof WeatherProviderError)) throw error;
        logger.warn(
          { err: error, locationId: location.id },
          'weather refresh failed after location create',
        );
        response.status(201).json(location);
      }
    } catch (error) {
      if (isDuplicateLocationError(error)) {
        logger.warn({ err: error }, 'duplicate location rejected');
        response.status(409).json({ detail: error.message });
        return;
      }
      next(error);
    }
  });

  router.get('/locations/:locationId', async (request, response, next) => {
    try {
      const location = await getLocation(Number(request.params.locationId));
      if (!location) {
        response.status(404).json({ detail: 'Location not found' });
        return;
      }
      response.json(location);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/locations/:locationId', async (request, response, next) => {
    try {
      const locationId = Number(request.params.locationId);
      const location = await getLocation(locationId);
      if (!location) {
        response.status(404).json({ detail: 'Location not found' });
        return;
      }
      await deleteLocation(locationId);
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  router.patch('/locations/:locationId', async (request, response, next) => {
    try {
      const locationId = Number(request.params.locationId);
      const body = request.body as { label?: unknown; is_favorite?: unknown } | undefined;
      const metadata: { label?: string | null; isFavorite?: boolean } = {};

      if (body && Object.hasOwn(body, 'label')) {
        const label = parseOptionalLabel(body, response);
        if (label === invalidLabel) return;
        metadata.label = label ?? null;
      }
      if (body && Object.hasOwn(body, 'is_favorite')) {
        if (typeof body.is_favorite !== 'boolean') {
          response.status(422).json({ detail: 'is_favorite must be a boolean' });
          return;
        }
        metadata.isFavorite = body.is_favorite;
      }
      if (!Object.hasOwn(metadata, 'label') && !Object.hasOwn(metadata, 'isFavorite')) {
        response.status(422).json({ detail: 'label or is_favorite is required' });
        return;
      }

      const updated = await updateLocationMetadata(locationId, metadata);
      if (!updated) {
        response.status(404).json({ detail: 'Location not found' });
        return;
      }
      response.json(updated);
    } catch (error) {
      next(error);
    }
  });

  router.post('/locations/:locationId/refresh', async (request, response, next) => {
    try {
      const locationId = Number(request.params.locationId);
      const location = await getLocation(locationId);
      if (!location) {
        response.status(404).json({ detail: 'Location not found' });
        return;
      }

      const snapshot = await weatherClient.getCurrentWeather(location.latitude, location.longitude);
      const updated = await updateWeather(locationId, snapshot);
      if (!updated) {
        response.status(404).json({ detail: 'Location not found' });
        return;
      }
      response.json(updated);
    } catch (error) {
      if (error instanceof WeatherProviderError) {
        response.status(502).json({ detail: error.message });
        return;
      }
      next(error);
    }
  });

  return router;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isSingaporeCoordinate(latitude: number, longitude: number): boolean {
  return 1.1 <= latitude && latitude <= 1.5 && 103.6 <= longitude && longitude <= 104.1;
}

function isDuplicateLocationError(error: unknown): error is Error {
  return error instanceof Error && error.name === 'DuplicateLocationError';
}

const invalidLabel = Symbol('invalid label');

function parseOptionalLabel(
  body: { label?: unknown } | undefined,
  response: Response,
): string | null | undefined | typeof invalidLabel {
  if (!body || !Object.hasOwn(body, 'label')) return undefined;
  if (body.label === null) return null;
  if (typeof body.label !== 'string') {
    response.status(422).json({ detail: 'label must be a string or null' });
    return invalidLabel;
  }

  const label = body.label.trim();
  if (!label) return null;
  if (label.length > 40) {
    response.status(422).json({ detail: 'label must be 40 characters or fewer' });
    return invalidLabel;
  }
  return label;
}
