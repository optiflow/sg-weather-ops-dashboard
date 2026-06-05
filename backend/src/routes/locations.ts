import type { Router } from 'express';
import { Router as createRouter } from 'express';
import {
  createLocation,
  deleteLocation,
  getLocation,
  getLocationByCoordinates,
  listLocations,
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
      const body = request.body as { latitude?: unknown; longitude?: unknown } | undefined;
      const latitude = body?.latitude;
      const longitude = body?.longitude;

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

      const location = await createLocation(latitude, longitude);

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
