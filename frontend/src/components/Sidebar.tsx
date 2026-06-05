import { useMemo, useState } from 'react';
import { useStore } from '../state/store';
import { AddLocationForm } from './AddLocationForm';
import { SearchIcon } from './icons';
import { SidebarCard } from './SidebarCard';
import { UseMyLocationButton } from './UseMyLocationButton';

function errorMessage(error: unknown): string {
  if (!error) return '';
  return error instanceof Error ? error.message : 'Weather data could not be updated.';
}

export function Sidebar() {
  const { locations, isLoading, error } = useStore();
  const [query, setQuery] = useState('');
  const message = errorMessage(error);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return locations;
    return locations.filter((location) => {
      const area = location.weather.area?.toLowerCase() ?? '';
      const condition = location.weather.condition?.toLowerCase() ?? '';
      return area.includes(q) || condition.includes(q);
    });
  }, [locations, query]);

  return (
    <aside className="flex max-h-[62vh] w-full shrink-0 flex-col gap-3 border-b border-white/5 bg-black/20 p-4 pt-16 backdrop-blur-2xl md:h-full md:max-h-none md:min-h-0 md:w-[22rem] md:border-b-0 md:border-r md:pt-4">
      <div className="relative">
        <label htmlFor="location-search" className="sr-only">
          Search saved locations
        </label>
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
        <input
          id="location-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          className="w-full rounded-lg border border-white/10 bg-white/[0.08] py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/50"
        />
      </div>

      <UseMyLocationButton />
      <AddLocationForm />
      {message && (
        <p className="status-message status-message-error" aria-live="polite">
          {message}
        </p>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
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
          filtered.map((location) => <SidebarCard key={location.id} location={location} />)
        )}
      </div>
    </aside>
  );
}
