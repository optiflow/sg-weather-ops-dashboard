import { useStore } from '../state/store';
import type { Location } from '../types';
import { formatTemperature, formatTime } from './format';
import { CloseIcon, CloudIcon, HomeIcon } from './icons';

interface SidebarCardProps {
  location: Location;
  isHome: boolean;
}

export function SidebarCard({ location, isHome }: SidebarCardProps) {
  const { selectedId, select, remove } = useStore();
  const isSelected = selectedId === location.id;
  const observed = formatTime(location.weather.observed_at);
  const area =
    location.weather.area || `${location.latitude.toFixed(3)}, ${location.longitude.toFixed(3)}`;
  const condition = location.weather.condition || '-';
  const temperature = formatTemperature(location.weather.temperature_c);
  const high = formatTemperature(location.weather.forecast_high_c);
  const low = formatTemperature(location.weather.forecast_low_c);

  const onSelect = () => select(location.id);

  return (
    <div
      className={`group relative w-full cursor-pointer overflow-hidden rounded-2xl border text-left backdrop-blur-xl transition ${
        isSelected
          ? 'border-white/30 bg-white/20 shadow-lg shadow-black/20'
          : 'border-white/10 bg-white/[0.07] hover:bg-white/[0.12]'
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isSelected}
        aria-label={`Select ${area}`}
        className="block w-full text-left"
      >
        <div className="flex items-start justify-between gap-3 px-4 pb-0 pt-3 pr-12">
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold leading-tight text-white">{area}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/70">
              {isHome ? (
                <>
                  <span>My Location</span>
                  <span className="text-white/40">·</span>
                  <HomeIcon className="h-3 w-3" />
                  <span>Home</span>
                </>
              ) : observed ? (
                <span>{observed}</span>
              ) : (
                <span className="text-white/50">Not refreshed</span>
              )}
            </div>
          </div>
          <div className="text-3xl font-light tabular-nums text-white/90">{temperature}</div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-white/10 px-4 py-2 text-xs">
          <div className="flex min-w-0 items-center gap-2 text-white/80">
            <CloudIcon className="h-4 w-4 shrink-0 text-white/70" />
            <span className="truncate">{condition}</span>
          </div>
          <div className="shrink-0 text-white/60 tabular-nums">
            H:{high} L:{low}
          </div>
        </div>
      </button>
      <button
        type="button"
        onClick={() => void remove(location.id)}
        className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/10 text-white/55 opacity-100 transition hover:bg-white/10 hover:text-white md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100"
        aria-label={`Delete ${area}`}
      >
        <CloseIcon className="h-3 w-3" />
      </button>
    </div>
  );
}
