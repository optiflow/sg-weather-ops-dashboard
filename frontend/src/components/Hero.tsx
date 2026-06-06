import { coordinatesText } from '../locationDisplay';
import { useSelectedLocation } from '../state/store';
import { DataTrustStrip } from './DataTrustStrip';
import { formatTemperature, formatTime } from './format';
import { HourlyStrip } from './HourlyStrip';
import { MapCard } from './MapCard';
import { RiskBrief } from './RiskBrief';
import { TenDayForecast } from './TenDayForecast';
import { TileGrid } from './Tiles';
import { TrendPanel } from './TrendPanel';

export function Hero() {
  const selected = useSelectedLocation();

  if (!selected) {
    return (
      <main className="flex min-w-0 flex-1 flex-col p-6 pt-16 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-2xl font-light text-white/85">Select a location</p>
            <p className="mt-2 text-sm text-white/60">
              Add a Singapore forecast area from the sidebar to see its weather.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const coordinates = coordinatesText(selected);
  const forecastArea = selected.weather?.area || null;
  const customLabel = selected.label?.trim() ?? '';
  const area = customLabel || forecastArea || coordinates;
  const secondaryArea = customLabel ? forecastArea || coordinates : null;
  const condition = selected.weather?.condition || 'Conditions unavailable';
  const observed = formatTime(selected.weather?.observed_at);
  const validPeriod = selected.weather?.valid_period_text;
  const source = selected.weather?.source;
  const temperature = formatTemperature(selected.weather?.temperature_c);
  const high = formatTemperature(selected.weather?.forecast_high_c);
  const low = formatTemperature(selected.weather?.forecast_low_c);

  return (
    <main className="min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 p-4 pt-14 sm:p-6 md:pt-6 lg:p-8">
        <header className="flex flex-col items-center pb-2 pt-4 text-center md:pt-6">
          <h1 className="text-3xl font-light leading-tight text-white sm:text-4xl">{area}</h1>
          {secondaryArea && <p className="mt-1 text-sm text-white/65">{secondaryArea}</p>}
          <div className="mt-2 text-6xl font-extralight leading-none tracking-tight text-white sm:text-[6.5rem]">
            {temperature}
          </div>
          <div className="mt-1 text-lg text-white/90">{condition}</div>
          <div className="mt-1 text-sm text-white/70 tabular-nums">
            H:{high} L:{low}
          </div>
          {observed && <div className="mt-3 text-xs text-white/55">Updated {observed}</div>}
        </header>

        {validPeriod && (
          <p className="px-2 pb-1 text-center text-xs text-white/65">{validPeriod}</p>
        )}

        <RiskBrief area={area} weather={selected.weather} />
        <DataTrustStrip locationId={selected.id} weather={selected.weather} />
        <TrendPanel locationId={selected.id} />
        <HourlyStrip periods={selected.weather?.forecast_periods} />
        <TenDayForecast weather={selected.weather} />
        <MapCard />
        <TileGrid weather={selected.weather} />

        <footer className="mt-2 flex flex-col items-center gap-3 pb-8 text-xs text-white/55">
          <p>
            Weather for {area}
            {secondaryArea ? ` · ${secondaryArea}` : ''}
            {source ? ` · ${source}` : ''}
          </p>
        </footer>
      </div>
    </main>
  );
}
