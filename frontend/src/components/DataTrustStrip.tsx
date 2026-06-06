import { useStore } from '../state/store';
import type { WeatherDataQuality, WeatherSignal, WeatherSnapshot } from '../types';
import { signalLabel } from '../weatherRisk';
import { formatTime } from './format';
import { RefreshIcon } from './icons';

interface DataTrustStripProps {
  locationId: number;
  weather: WeatherSnapshot;
}

const statusLabels: Record<WeatherDataQuality['status'], string> = {
  unknown: 'Unknown',
  not_refreshed: 'Not refreshed',
  complete: 'Complete',
  partial: 'Partial',
  unavailable: 'Unavailable',
};

const statusClasses: Record<WeatherDataQuality['status'], string> = {
  unknown: 'border-white/15 bg-white/[0.06] text-white/70',
  not_refreshed: 'border-white/15 bg-white/[0.06] text-white/70',
  complete: 'border-emerald-200/25 bg-emerald-300/15 text-emerald-50',
  partial: 'border-amber-200/30 bg-amber-300/18 text-amber-50',
  unavailable: 'border-red-200/35 bg-red-400/20 text-red-50',
};

export function DataTrustStrip({ locationId, weather }: DataTrustStripProps) {
  const { refresh, refreshingId } = useStore();
  const quality = weather.data_quality;
  const missing = quality.unavailable_signals;
  const missingText =
    missing.length === 0 ? 'No missing signals' : `Missing ${formatSignals(missing)}`;
  const stale = quality.stale_signals;
  const staleText =
    quality.freshness_status === 'stale'
      ? stale.length === 0
        ? 'Stale provider timestamps'
        : `Stale ${formatSignals(stale)}`
      : null;
  const refreshed = formatTime(quality.last_refreshed_at);
  const observed = formatTime(weather.observed_at);
  const isRefreshing = refreshingId === locationId;

  return (
    <section className="rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 backdrop-blur-xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
            Data Trust
          </p>
          <p className="mt-1 truncate text-xs text-white/70">
            {refreshed ? `Checked ${refreshed}` : 'Refresh status not yet recorded'}
            {observed ? ` · Observed ${observed}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses[quality.status]}`}
          >
            {statusLabels[quality.status]}
          </span>
          <button
            type="button"
            onClick={() => void refresh(locationId)}
            disabled={isRefreshing}
            aria-live="polite"
            className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.08] px-2.5 py-1 text-xs font-medium text-white/85 hover:bg-white/[0.14] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshIcon className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs leading-snug text-white/60">
        {staleText ? `${missingText} · ${staleText}` : missingText}
      </p>
    </section>
  );
}

function formatSignals(signals: WeatherSignal[]): string {
  const labels = signals.map(signalLabel);
  if (labels.length <= 3) return labels.join(', ');
  return `${labels.slice(0, 3).join(', ')} and ${labels.length - 3} more`;
}
