import { useEffect, useState } from 'react';
import { listLocationHistory } from '../api';
import type { WeatherObservation } from '../types';
import { formatTemperature, formatTime } from './format';
import { TrendIcon } from './icons';

interface TrendPanelProps {
  locationId: number;
}

export function TrendPanel({ locationId }: TrendPanelProps) {
  const [observations, setObservations] = useState<WeatherObservation[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    listLocationHistory(locationId, 12)
      .then((result) => {
        if (cancelled) return;
        setObservations(result.observations);
        setStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [locationId]);

  return (
    <section className="rounded-2xl border border-white/15 bg-white/[0.08] p-4 backdrop-blur-xl">
      <header className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
        <TrendIcon />
        <span>Recent Trend</span>
      </header>
      {status === 'loading' ? (
        <p className="mt-3 text-sm text-white/60">Loading recent observations...</p>
      ) : status === 'error' ? (
        <p className="mt-3 text-sm text-white/60">Trend history is unavailable.</p>
      ) : observations.length === 0 ? (
        <p className="mt-3 text-sm text-white/60">
          Refresh this location to start building local trend history.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {observations.slice(0, 5).map((observation) => (
            <li
              key={observation.id}
              className="grid grid-cols-[5rem_1fr_4rem] items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
            >
              <span className="text-xs text-white/55">{formatTime(observation.captured_at)}</span>
              <span className="truncate text-white/80">
                {observation.weather.condition ?? 'Unavailable'}
              </span>
              <span className="text-right tabular-nums text-white/90">
                {formatTemperature(observation.weather.temperature_c)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
