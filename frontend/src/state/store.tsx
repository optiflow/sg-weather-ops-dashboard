import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  createLocation,
  createLocationFromArea,
  createLocationFromPosition,
  deleteLocation,
  listLocations,
  logInteraction,
  refreshLocation,
  updateLocation,
} from '../api';
import type {
  CreateLocationFromAreaPayload,
  CreateLocationPayload,
  Location,
  LocationFromAreaResponse,
  LocationFromPositionResponse,
  ProviderProps,
  StoreValue,
  UpdateLocationPayload,
} from '../types';

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: ProviderProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshingId, setRefreshingId] = useState<number | null>(null);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async (): Promise<Location[]> => {
    try {
      const data = await listLocations();
      setLocations(data.locations);
      setError(null);
      return data.locations;
    } catch (err) {
      setError(err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load().then((next) => {
      if (next.length > 0) setSelectedId((current) => current ?? next[0].id);
    });
  }, [load]);

  const effectiveSelectedId = (() => {
    if (locations.length === 0) return null;
    return locations.some((l) => l.id === selectedId) ? selectedId : locations[0].id;
  })();

  const create = useCallback(
    async (payload: CreateLocationPayload) => {
      setError(null);
      logInteraction('location_create_submitted', payload);
      try {
        const created = await createLocation(payload);
        const next = await load();
        const targetId = created?.id ?? next[next.length - 1]?.id;
        if (targetId) setSelectedId(targetId);
        setIsAdding(false);
        logInteraction('location_created', {
          locationId: targetId,
          latitude: created.latitude,
          longitude: created.longitude,
        });
      } catch (err) {
        setError(err);
        logInteraction('location_create_failed', {
          latitude: payload.latitude,
          longitude: payload.longitude,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        throw err;
      }
    },
    [load],
  );

  const createFromArea = useCallback(
    async (payload: CreateLocationFromAreaPayload): Promise<LocationFromAreaResponse> => {
      setError(null);
      logInteraction('location_from_area_submitted', {
        area: payload.name,
        hasLabel: Boolean(payload.label?.trim()),
      });
      try {
        const result = await createLocationFromArea(payload);
        await load();
        setSelectedId(result.location.id);
        setIsAdding(false);
        logInteraction('location_from_area_added', {
          locationId: result.location.id,
          area: result.matched_area.name,
          created: result.created,
          hasLabel: Boolean(result.location.label?.trim()),
        });
        return result;
      } catch (err) {
        setError(err);
        logInteraction('location_from_area_failed', {
          area: payload.name,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        throw err;
      }
    },
    [load],
  );

  const createFromPosition = useCallback(
    async (payload: CreateLocationPayload): Promise<LocationFromPositionResponse> => {
      setError(null);
      logInteraction('location_from_position_submitted');
      try {
        const result = await createLocationFromPosition(payload);
        await load();
        setSelectedId(result.location.id);
        logInteraction('location_from_position_added', {
          locationId: result.location.id,
          created: result.created,
        });
        return result;
      } catch (err) {
        logInteraction('location_from_position_failed', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        throw err;
      }
    },
    [load],
  );

  const update = useCallback(
    async (id: number, payload: UpdateLocationPayload): Promise<Location> => {
      setError(null);
      logInteraction('location_update_submitted', {
        locationId: id,
        hasLabel: payload.label === undefined ? undefined : Boolean(payload.label?.trim()),
        isFavorite: payload.is_favorite,
      });
      try {
        const updated = await updateLocation(id, payload);
        setLocations((current) =>
          current.map((location) => (location.id === updated.id ? updated : location)),
        );
        logInteraction('location_updated', {
          locationId: updated.id,
          hasLabel: Boolean(updated.label?.trim()),
          isFavorite: updated.is_favorite,
        });
        return updated;
      } catch (err) {
        setError(err);
        logInteraction('location_update_failed', {
          locationId: id,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        throw err;
      }
    },
    [],
  );

  const refresh = useCallback(
    async (id: number) => {
      setRefreshingId(id);
      setError(null);
      logInteraction('location_refresh_clicked', { locationId: id });
      try {
        await refreshLocation(id);
        await load();
        logInteraction('location_refreshed', { locationId: id });
      } catch (err) {
        setError(err);
        logInteraction('location_refresh_failed', {
          locationId: id,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      } finally {
        setRefreshingId(null);
      }
    },
    [load],
  );

  const remove = useCallback(
    async (id: number) => {
      setError(null);
      logInteraction('location_delete_submitted', { locationId: id });
      try {
        await deleteLocation(id);
        const next = await load();
        if (selectedId === id) {
          setSelectedId(next.length > 0 ? next[0].id : null);
        }
        logInteraction('location_deleted', { locationId: id });
      } catch (err) {
        setError(err);
        logInteraction('location_delete_failed', {
          locationId: id,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        throw err;
      }
    },
    [load, selectedId],
  );

  const value: StoreValue = {
    locations,
    selectedId: effectiveSelectedId,
    isAdding,
    isLoading,
    refreshingId,
    error,
    select: setSelectedId,
    setAdding: (nextIsAdding) => {
      setIsAdding(nextIsAdding);
      if (nextIsAdding) logInteraction('location_form_opened');
    },
    create,
    createFromArea,
    createFromPosition,
    update,
    refresh,
    remove,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

export function useSelectedLocation(): Location | null {
  const { locations, selectedId } = useStore();
  return locations.find((l) => l.id === selectedId) ?? null;
}
