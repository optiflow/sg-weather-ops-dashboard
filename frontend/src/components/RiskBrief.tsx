import type { WeatherSnapshot } from '../types';
import { buildWeatherRiskBrief } from '../weatherRisk';

interface RiskBriefProps {
  area: string;
  weather: WeatherSnapshot;
}

const levelClasses = {
  low: 'border-emerald-200/25 bg-emerald-300/15 text-emerald-50',
  moderate: 'border-amber-200/30 bg-amber-300/18 text-amber-50',
  high: 'border-red-200/35 bg-red-400/20 text-red-50',
  unavailable: 'border-white/15 bg-white/[0.06] text-white/70',
} as const;

export function RiskBrief({ area, weather }: RiskBriefProps) {
  const brief = buildWeatherRiskBrief(weather, { area });

  return (
    <section className="rounded-2xl border border-white/15 bg-white/[0.08] p-4 backdrop-blur-xl">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
            Weather Risk Brief
          </p>
          <p className="mt-1 text-sm leading-snug text-white/85">{brief.summary}</p>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${levelClasses[brief.level]}`}
        >
          {brief.label}
        </span>
      </header>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/60">
        <span>{brief.freshnessLabel}</span>
        <span aria-hidden="true">·</span>
        <span>
          {brief.availableSignals}/{brief.totalSignals} signals available
        </span>
      </div>

      {brief.drivers.length > 0 && (
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {brief.drivers.map((driver) => (
            <li
              key={driver.key}
              className="min-w-0 rounded-lg border border-white/10 bg-white/[0.05] p-3"
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-white/85">{driver.label}</span>
                <span className="shrink-0 text-white/60">{driver.value}</span>
              </div>
              <p className="mt-1 text-xs leading-snug text-white/65">{driver.detail}</p>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[11px] leading-snug text-white/50">
        Derived from the latest snapshot; check official advisories for safety-critical decisions.
      </p>
    </section>
  );
}
