import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { listForecastAreas } from '../api';
import { useStore } from '../state/store';
import type { ForecastArea } from '../types';
import { PlusIcon } from './icons';

type AddMode = 'area' | 'manual';

export function AddLocationForm() {
  const { isAdding, setAdding, create, createFromArea } = useStore();
  const [mode, setMode] = useState<AddMode>('area');
  const [areas, setAreas] = useState<ForecastArea[]>([]);
  const [areasLoaded, setAreasLoaded] = useState(false);
  const [isLoadingAreas, setIsLoadingAreas] = useState(false);
  const [areaLoadError, setAreaLoadError] = useState<string | null>(null);
  const [areaQuery, setAreaQuery] = useState('');
  const [selectedAreaName, setSelectedAreaName] = useState('');
  const [label, setLabel] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadAreas = useCallback(async () => {
    setIsLoadingAreas(true);
    setAreaLoadError(null);
    try {
      const data = await listForecastAreas();
      setAreas(data.areas);
      setAreasLoaded(true);
    } catch (err) {
      setAreaLoadError(err instanceof Error ? err.message : 'Could not load forecast areas');
    } finally {
      setIsLoadingAreas(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdding || mode !== 'area' || areasLoaded || isLoadingAreas) return;
    void loadAreas();
  }, [areasLoaded, isAdding, isLoadingAreas, loadAreas, mode]);

  const filteredAreas = useMemo(() => {
    const query = areaQuery.trim().toLowerCase();
    if (!query) return areas;
    return areas.filter((area) => area.name.toLowerCase().includes(query));
  }, [areaQuery, areas]);

  useEffect(() => {
    if (!isAdding || mode !== 'area') return;
    if (filteredAreas.length === 0) {
      setSelectedAreaName('');
      return;
    }
    if (!filteredAreas.some((area) => area.name === selectedAreaName)) {
      setSelectedAreaName(filteredAreas[0].name);
    }
  }, [filteredAreas, isAdding, mode, selectedAreaName]);

  const cancel = () => {
    setMode('area');
    setAreaQuery('');
    setSelectedAreaName('');
    setLabel('');
    setLatitude('');
    setLongitude('');
    setSubmitError(null);
    setAdding(false);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    const trimmedLabel = label.trim();
    try {
      if (mode === 'area') {
        if (!selectedAreaName) {
          setSubmitError('Select a forecast area');
          return;
        }
        await createFromArea({
          name: selectedAreaName,
          label: trimmedLabel ? trimmedLabel : null,
        });
        setAreaQuery('');
        setSelectedAreaName('');
        setLabel('');
      } else {
        await create({
          latitude: Number(latitude),
          longitude: Number(longitude),
          label: trimmedLabel ? trimmedLabel : null,
        });
        setLatitude('');
        setLongitude('');
        setLabel('');
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not add location');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdding) {
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.07] px-3 py-2.5 text-sm font-medium text-white/85 backdrop-blur-xl hover:bg-white/[0.12]"
      >
        <PlusIcon />
        <span>Add Location</span>
      </button>
    );
  }

  const isAreaMode = mode === 'area';
  const submitDisabled =
    submitting || (isAreaMode && (!selectedAreaName || isLoadingAreas || Boolean(areaLoadError)));

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-2xl border border-white/15 bg-white/[0.1] p-3 backdrop-blur-xl"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
        New location
      </p>
      <div className="grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-white/[0.05] p-1">
        <button
          type="button"
          onClick={() => setMode('area')}
          aria-pressed={isAreaMode}
          className={`rounded-md px-2 py-1.5 text-xs font-semibold ${
            isAreaMode
              ? 'bg-white/90 text-slate-900'
              : 'text-white/65 hover:bg-white/10 hover:text-white'
          }`}
        >
          Forecast area
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          aria-pressed={!isAreaMode}
          className={`rounded-md px-2 py-1.5 text-xs font-semibold ${
            isAreaMode
              ? 'text-white/65 hover:bg-white/10 hover:text-white'
              : 'bg-white/90 text-slate-900'
          }`}
        >
          Coordinates
        </button>
      </div>

      {isAreaMode ? (
        <>
          <label className="grid min-w-0 gap-1">
            <span className="text-[11px] text-white/60">Search forecast areas</span>
            <input
              type="search"
              value={areaQuery}
              onChange={(e) => setAreaQuery(e.target.value)}
              placeholder="Filter areas"
              className="w-full min-w-0 rounded-md border border-white/15 bg-white/10 px-2 py-1.5 text-sm text-white placeholder:text-white/40"
            />
          </label>

          {isLoadingAreas ? (
            <p className="rounded-md border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-white/65">
              Loading forecast areas...
            </p>
          ) : areaLoadError ? (
            <div className="grid gap-2">
              <p className="status-message status-message-error">{areaLoadError}</p>
              <button
                type="button"
                onClick={() => void loadAreas()}
                className="justify-self-start rounded-md border border-white/15 bg-white/[0.08] px-2.5 py-1.5 text-xs font-semibold text-white/75 hover:bg-white/[0.14] hover:text-white"
              >
                Retry
              </button>
            </div>
          ) : filteredAreas.length === 0 ? (
            <p className="rounded-md border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-white/65">
              No forecast areas match.
            </p>
          ) : (
            <label className="grid min-w-0 gap-1">
              <span className="text-[11px] text-white/60">Forecast area</span>
              <select
                value={selectedAreaName}
                onChange={(event) => setSelectedAreaName(event.target.value)}
                className="w-full min-w-0 rounded-md border border-white/15 bg-white/10 px-2 py-1.5 text-sm text-white"
              >
                {filteredAreas.map((area) => (
                  <option key={area.name} value={area.name}>
                    {area.name} ({area.latitude.toFixed(3)}, {area.longitude.toFixed(3)})
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-white/45" aria-live="polite">
                {filteredAreas.length} matching forecast area
                {filteredAreas.length === 1 ? '' : 's'}
              </span>
            </label>
          )}

          <label className="grid min-w-0 gap-1">
            <span className="text-[11px] text-white/60">Label (optional)</span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Optional"
              maxLength={40}
              className="w-full min-w-0 rounded-md border border-white/15 bg-white/10 px-2 py-1.5 text-sm text-white placeholder:text-white/40"
            />
          </label>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid min-w-0 gap-1">
              <span className="text-[11px] text-white/60">Latitude</span>
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="1.3508"
                required
                className="w-full min-w-0 rounded-md border border-white/15 bg-white/10 px-2 py-1.5 text-sm text-white placeholder:text-white/40"
              />
            </label>
            <label className="grid min-w-0 gap-1">
              <span className="text-[11px] text-white/60">Longitude</span>
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="103.8390"
                required
                className="w-full min-w-0 rounded-md border border-white/15 bg-white/10 px-2 py-1.5 text-sm text-white placeholder:text-white/40"
              />
            </label>
          </div>
          <label className="grid min-w-0 gap-1">
            <span className="text-[11px] text-white/60">Label (optional)</span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Optional"
              maxLength={40}
              className="w-full min-w-0 rounded-md border border-white/15 bg-white/10 px-2 py-1.5 text-sm text-white placeholder:text-white/40"
            />
          </label>
        </>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={cancel}
          className="rounded-md px-2.5 py-1.5 text-xs font-medium text-white/70 hover:text-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitDisabled}
          className="rounded-md bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Adding...' : isAreaMode ? 'Add forecast area' : 'Add'}
        </button>
      </div>
      {submitError && <p className="status-message status-message-error">{submitError}</p>}
    </form>
  );
}
