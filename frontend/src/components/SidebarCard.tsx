import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { coordinatesText, locationSecondary, locationTitle } from '../locationDisplay';
import { useStore } from '../state/store';
import type { Location } from '../types';
import { formatTemperature, formatTime } from './format';
import { CloseIcon, CloudIcon, PencilIcon, StarIcon } from './icons';

interface SidebarCardProps {
  location: Location;
  onSelected?: () => void;
}

export function SidebarCard({ location, onSelected }: SidebarCardProps) {
  const { selectedId, select, remove, update } = useStore();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [draftLabel, setDraftLabel] = useState(location.label ?? '');
  const [isSavingLabel, setIsSavingLabel] = useState(false);
  const [isSavingFavorite, setIsSavingFavorite] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const isSelected = selectedId === location.id;
  const observed = formatTime(location.weather.observed_at);
  const coordinates = coordinatesText(location);
  const forecastArea = location.weather.area || null;
  const customLabel = location.label?.trim() ?? '';
  const title = locationTitle(location);
  const secondary = locationSecondary(location, observed || 'Not refreshed');
  const condition = location.weather.condition || '-';
  const temperature = formatTemperature(location.weather.temperature_c);
  const high = formatTemperature(location.weather.forecast_high_c);
  const low = formatTemperature(location.weather.forecast_low_c);
  const isFavorite = Boolean(location.is_favorite);

  const onSelect = () => {
    select(location.id);
    onSelected?.();
  };

  useEffect(() => {
    if (!isEditingLabel) setDraftLabel(location.label ?? '');
  }, [isEditingLabel, location.label]);

  const saveLabel = async (nextLabel: string | null) => {
    setIsSavingLabel(true);
    setUpdateError(null);
    try {
      await update(location.id, { label: nextLabel });
      setIsEditingLabel(false);
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Could not update label');
    } finally {
      setIsSavingLabel(false);
    }
  };

  const onSubmitLabel = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextLabel = draftLabel.trim();
    void saveLabel(nextLabel ? nextLabel : null);
  };

  const onToggleFavorite = async () => {
    setIsSavingFavorite(true);
    setUpdateError(null);
    try {
      await update(location.id, { is_favorite: !isFavorite });
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Could not update favorite');
    } finally {
      setIsSavingFavorite(false);
    }
  };

  return (
    <div
      className={`group relative w-full cursor-pointer overflow-hidden rounded-2xl border text-left backdrop-blur-xl transition ${
        isSelected
          ? 'border-white/30 bg-white/20 shadow-lg shadow-black/20'
          : 'border-white/10 bg-white/[0.07] hover:bg-white/[0.12]'
      }`}
    >
      <div className="flex items-start justify-between gap-3 px-4 pb-0 pt-3">
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={isSelected}
          aria-label={`Select ${title}`}
          className="min-w-0 flex-1 text-left"
        >
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold leading-tight text-white">{title}</div>
            <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-white/70">
              <span className="truncate">{secondary}</span>
              {customLabel && (
                <span className="shrink-0 text-white/50">{observed || 'Not refreshed'}</span>
              )}
            </div>
          </div>
        </button>
        <div className="flex shrink-0 items-start gap-2">
          <div className="text-3xl font-light tabular-nums text-white/90">{temperature}</div>
          {isConfirmingDelete ? (
            <div className="flex items-center gap-1 rounded-full bg-black/40 p-1 backdrop-blur-xl">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="rounded-full px-2 py-1 text-[10px] font-semibold text-white/70 hover:bg-white/10 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void remove(location.id)}
                className="rounded-full bg-red-400/90 px-2 py-1 text-[10px] font-semibold text-white hover:bg-red-300"
                aria-label={`Confirm delete ${title}`}
              >
                Delete
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onToggleFavorite}
                disabled={isSavingFavorite}
                aria-pressed={isFavorite}
                aria-label={`${isFavorite ? 'Unfavorite' : 'Favorite'} ${title}`}
                className={`flex h-8 w-8 items-center justify-center rounded-full bg-black/10 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 ${
                  isFavorite ? 'text-amber-200' : 'text-white/55 hover:text-white'
                }`}
              >
                <StarIcon className="h-3.5 w-3.5" filled={isFavorite} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditingLabel((current) => !current);
                  setIsConfirmingDelete(false);
                  setUpdateError(null);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10 text-white/55 transition hover:bg-white/10 hover:text-white"
                aria-label={`Rename ${title}`}
              >
                <PencilIcon className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsConfirmingDelete(true);
                  setIsEditingLabel(false);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10 text-white/55 transition hover:bg-white/10 hover:text-white"
                aria-label={`Delete ${title}`}
              >
                <CloseIcon className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onSelect}
        className="mt-3 flex w-full items-center justify-between border-t border-white/10 px-4 py-2 text-left text-xs"
      >
        <div className="flex min-w-0 items-center gap-2 text-white/80">
          <CloudIcon className="h-4 w-4 shrink-0 text-white/70" />
          <span className="truncate">{condition}</span>
        </div>
        <div className="shrink-0 text-white/60 tabular-nums">
          H:{high} L:{low}
        </div>
      </button>
      {isEditingLabel && (
        <form onSubmit={onSubmitLabel} className="grid gap-2 border-t border-white/10 px-4 py-3">
          <label className="grid gap-1">
            <span className="sr-only">Location label</span>
            <input
              type="text"
              value={draftLabel}
              onChange={(event) => setDraftLabel(event.target.value)}
              placeholder={forecastArea || coordinates}
              maxLength={40}
              className="w-full rounded-md border border-white/15 bg-white/10 px-2 py-1.5 text-sm text-white placeholder:text-white/40"
            />
          </label>
          <div className="flex items-center justify-between gap-2">
            {customLabel ? (
              <button
                type="button"
                onClick={() => void saveLabel(null)}
                disabled={isSavingLabel}
                className="rounded-md px-2 py-1.5 text-xs font-medium text-white/65 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Clear label
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditingLabel(false);
                  setUpdateError(null);
                }}
                className="rounded-md px-2 py-1.5 text-xs font-medium text-white/70 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingLabel}
                className="rounded-md bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingLabel ? 'Saving...' : 'Save label'}
              </button>
            </div>
          </div>
        </form>
      )}
      {updateError && (
        <p className="mx-4 mb-3 mt-2 status-message status-message-error">{updateError}</p>
      )}
    </div>
  );
}
