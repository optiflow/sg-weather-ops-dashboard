import type { WeatherDataQuality, WeatherSignal, WeatherSnapshot } from '../types';
import { signalLabel } from '../weatherRisk';
import { formatTime } from './format';

interface DataTrustStripProps {
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

export function DataTrustStrip({ weather }: DataTrustStripProps) {
  const quality = weather.data_quality;
  const missing = quality.unavailable_signals;
  const missingText =
    missing.length === 0 ? 'No missing signals' : `Missing ${formatSignals(missing)}`;
  const refreshed = formatTime(quality.last_refreshed_at);
  const observed = formatTime(weather.observed_at);

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
        <span
          className={`w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses[quality.status]}`}
        >
          {statusLabels[quality.status]}
        </span>
      </div>
      <p className="mt-2 text-xs leading-snug text-white/60">{missingText}</p>
    </section>
  );
}

function formatSignals(signals: WeatherSignal[]): string {
  const labels = signals.map(signalLabel);
  if (labels.length <= 3) return labels.join(', ');
  return `${labels.slice(0, 3).join(', ')} and ${labels.length - 3} more`;
}
