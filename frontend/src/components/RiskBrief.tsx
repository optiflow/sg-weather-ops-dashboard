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
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
            Weather Risk Brief
          </p>
          <p className="mt-2 text-xl font-semibold leading-tight text-white/95">{brief.headline}</p>
        </div>
        <span
          className={`w-fit shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${levelClasses[brief.level]}`}
        >
          {brief.label}
        </span>
      </header>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.05] p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
          Recommended
        </p>
        <p className="mt-1 text-sm leading-snug text-white/85">{brief.recommendation}</p>
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
        <div className="flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:gap-2">
          <span className="font-semibold text-white/75">{brief.confidenceLabel}</span>
          <span className="hidden text-white/35 sm:inline" aria-hidden="true">
            ·
          </span>
          <span className="text-white/60">{brief.confidenceDetail}</span>
        </div>
      </div>

      {brief.drivers.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
            What to watch
          </p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-3">
            {brief.drivers.map((driver) => (
              <li
                key={driver.key}
                className="min-w-0 rounded-xl border border-white/10 bg-white/[0.05] p-3"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-white/85">{driver.label}</span>
                  <span className="shrink-0 text-white/60">{driver.value}</span>
                </div>
                <p className="mt-1 text-xs leading-snug text-white/65">{driver.detail}</p>
                <p className="mt-2 text-xs leading-snug text-white/80">{driver.advice}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 text-[11px] leading-snug text-white/50">
        Quick guide only; follow official advisories for safety-critical decisions.
      </p>
    </section>
  );
}
