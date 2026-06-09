import { useMemo, useState } from 'react';
import { coordinatesText, locationTitle } from '../locationDisplay';
import { useStore } from '../state/store';
import type { Location } from '../types';
import { AddLocationForm } from './AddLocationForm';
import { SearchIcon } from './icons';
import { SidebarCard } from './SidebarCard';
import { UseMyLocationButton } from './UseMyLocationButton';

type SortMode = 'recent' | 'name';

function errorMessage(error: unknown): string {
  if (!error) return '';
  return error instanceof Error ? error.message : 'Weather data could not be updated.';
}

function createdAtTimestamp(location: Location): number {
  const timestamp = Date.parse(location.created_at);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function compareFavorites(a: Location, b: Location): number {
  return Number(b.is_favorite) - Number(a.is_favorite);
}

function compareByName(a: Location, b: Location): number {
  const titleCompare = locationTitle(a).localeCompare(locationTitle(b), undefined, {
    sensitivity: 'base',
  });
  return titleCompare || createdAtTimestamp(b) - createdAtTimestamp(a) || b.id - a.id;
}

function compareByRecent(a: Location, b: Location): number {
  return createdAtTimestamp(b) - createdAtTimestamp(a) || compareByName(a, b);
}

function searchText(location: Location): string {
  return [
    location.label,
    location.weather.area,
    location.weather.condition,
    coordinatesText(location),
    location.latitude.toString(),
    location.longitude.toString(),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function Sidebar() {
  const { locations, isLoading, error, isAdding } = useStore();
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [isMobileListOpen, setIsMobileListOpen] = useState(false);
  const message = errorMessage(error);
  const shouldShowMobileList = isMobileListOpen || isAdding || locations.length === 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? locations.filter((location) => searchText(location).includes(q))
      : locations;
    return [...matched].sort((a, b) => {
      const favoriteCompare = compareFavorites(a, b);
      if (favoriteCompare) return favoriteCompare;
      return sortMode === 'name' ? compareByName(a, b) : compareByRecent(a, b);
    });
  }, [locations, query, sortMode]);

  return (
    <aside className="flex max-h-[62vh] w-full shrink-0 flex-col gap-3 overflow-hidden border-b border-white/5 bg-black/20 p-4 pt-16 backdrop-blur-2xl has-[form]:max-h-[72vh] md:h-full md:max-h-none md:min-h-0 md:w-[22rem] md:border-b-0 md:border-r md:pt-4">
      <div className="relative">
        <label htmlFor="location-search" className="sr-only">
          Search saved locations
        </label>
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
        <input
          id="location-search"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim()) setIsMobileListOpen(true);
          }}
          placeholder="Search saved locations"
          className="w-full rounded-lg border border-white/10 bg-white/[0.08] py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/50"
        />
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-white/[0.05] p-1">
        <button
          type="button"
          onClick={() => setSortMode('recent')}
          aria-pressed={sortMode === 'recent'}
          className={`rounded-md px-2 py-1.5 text-xs font-semibold ${
            sortMode === 'recent'
              ? 'bg-white/90 text-slate-900'
              : 'text-white/65 hover:bg-white/10 hover:text-white'
          }`}
        >
          Recent
        </button>
        <button
          type="button"
          onClick={() => setSortMode('name')}
          aria-pressed={sortMode === 'name'}
          className={`rounded-md px-2 py-1.5 text-xs font-semibold ${
            sortMode === 'name'
              ? 'bg-white/90 text-slate-900'
              : 'text-white/65 hover:bg-white/10 hover:text-white'
          }`}
        >
          Name
        </button>
      </div>

      <UseMyLocationButton />
      <AddLocationForm />
      {message && (
        <p className="status-message status-message-error" aria-live="polite">
          {message}
        </p>
      )}

      <button
        type="button"
        onClick={() => setIsMobileListOpen((current) => !current)}
        aria-expanded={shouldShowMobileList}
        className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-white/75 md:hidden"
      >
        <span>Saved locations</span>
        <span>{filtered.length}</span>
      </button>

      <div
        className={`min-h-[5rem] flex-1 flex-col gap-2 overflow-y-auto pr-1 md:flex md:min-h-0 ${
          shouldShowMobileList ? 'flex' : 'hidden'
        }`}
      >
        {isLoading && locations.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-sm text-white/70">
            Loading locations…
          </p>
        ) : filtered.length === 0 && locations.length > 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-center text-sm text-white/60">
            No matches
          </p>
        ) : filtered.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 bg-white/[0.04] p-6 text-center text-sm text-white/60">
            No locations yet. Add one above.
          </p>
        ) : (
          filtered.map((location) => (
            <SidebarCard
              key={location.id}
              location={location}
              onSelected={() => setIsMobileListOpen(false)}
            />
          ))
        )}
      </div>
    </aside>
  );
}
