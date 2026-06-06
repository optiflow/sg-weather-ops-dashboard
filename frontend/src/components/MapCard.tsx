import L from 'leaflet';
import { useCallback, useEffect, useRef, useState } from 'react';
import { renderToString } from 'react-dom/server';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import { coordinatesText, locationTitle } from '../locationDisplay';
import { useStore } from '../state/store';
import type { Location } from '../types';
import { WeatherConditionIcon } from '../weatherIcon';
import { CloseIcon, LocationIcon } from './icons';

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function formatTemperature(value: number | null | undefined): string {
  return isFiniteNumber(value) ? Math.round(value).toString() : '--';
}

function MapBoundsUpdater({ locations }: { locations: Location[] }) {
  const map = useMap();

  useEffect(() => {
    if (locations.length === 0) return;
    const bounds = L.latLngBounds(locations.map((loc) => [loc.latitude, loc.longitude]));
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
  }, [locations, map]);

  return null;
}

export function MapCard() {
  const { locations, selectedId, select } = useStore();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);

  const closeFullscreen = useCallback(() => {
    setIsFullscreen(false);
    window.setTimeout(() => expandButtonRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!isFullscreen) return;
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeFullscreen();
      if (event.key !== 'Tab') return;
      const focusable = [
        closeButtonRef.current,
        ...Array.from(trayRef.current?.querySelectorAll('button') ?? []),
      ].filter((element): element is HTMLButtonElement => Boolean(element));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [closeFullscreen, isFullscreen]);

  const center: [number, number] =
    locations.length > 0 ? [locations[0].latitude, locations[0].longitude] : [1.3521, 103.8198];
  const selectedLocation = locations.find((location) => location.id === selectedId);

  const mapContent = (
    <>
      <TileLayer
        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      {locations.map((loc) => {
        const temp = formatTemperature(loc.weather?.temperature_c);
        const isSelected = selectedId === loc.id;
        const iconHtml = renderToString(
          <div
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-white shadow-lg backdrop-blur-md border whitespace-nowrap ${
              isSelected
                ? 'border-emerald-100/70 bg-emerald-400/35 ring-2 ring-emerald-200/70'
                : 'border-white/20 bg-white/20'
            }`}
          >
            <WeatherConditionIcon condition={loc.weather?.condition} className="h-3.5 w-3.5" />
            <span>{temp}&deg;</span>
          </div>,
        );

        const customIcon = L.divIcon({
          className: 'weather-pin-icon',
          html: iconHtml,
          iconSize: [0, 0],
          iconAnchor: [30, 15],
        });

        return (
          <Marker
            key={loc.id}
            position={[loc.latitude, loc.longitude]}
            icon={customIcon}
            eventHandlers={{ click: () => select(loc.id) }}
          />
        );
      })}
      <MapBoundsUpdater locations={locations} />
    </>
  );

  if (isFullscreen) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-xl animate-in fade-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="map-dialog-title"
      >
        <header className="pointer-events-none absolute top-0 z-[1000] flex w-full items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-4">
          <h2
            id="map-dialog-title"
            className="pointer-events-auto flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80"
          >
            <LocationIcon className="h-3 w-3" />
            <span>Map Overview</span>
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close map"
            onClick={closeFullscreen}
            className="pointer-events-auto rounded-full bg-white/10 p-2 text-white/80 hover:bg-white/20 backdrop-blur-md transition-colors"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </header>
        <div className="relative h-full w-full flex-1">
          <MapContainer
            center={center}
            zoom={11}
            zoomControl={false}
            className="h-full w-full outline-none"
          >
            {mapContent}
          </MapContainer>
          <ul className="sr-only" aria-label="Saved weather map locations">
            {locations.map((location) => (
              <li key={location.id}>{locationTitle(location)}</li>
            ))}
          </ul>
          {locations.length > 0 && (
            <div
              ref={trayRef}
              className="absolute bottom-0 z-[1000] flex w-full gap-2 overflow-x-auto bg-gradient-to-t from-black/85 to-transparent p-4"
            >
              {locations.map((location) => {
                const title = locationTitle(location);
                const isSelected = selectedId === location.id;
                return (
                  <button
                    key={location.id}
                    type="button"
                    onClick={() => select(location.id)}
                    aria-pressed={isSelected}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      isSelected
                        ? 'border-emerald-100/70 bg-emerald-300/25 text-emerald-50'
                        : 'border-white/15 bg-white/10 text-white/75 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    {title}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <section className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] p-4 backdrop-blur-xl transition-colors hover:bg-white/[0.12]">
      <header className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
        <div className="flex items-center gap-1.5">
          <LocationIcon className="h-3.5 w-3.5" />
          <span>Map Overview</span>
        </div>
        <button
          ref={expandButtonRef}
          type="button"
          onClick={() => setIsFullscreen(true)}
          aria-haspopup="dialog"
          className="rounded-full border border-white/15 bg-white/[0.08] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/75 transition hover:bg-white/[0.16] hover:text-white"
        >
          Expand map
        </button>
      </header>

      <div className="relative h-48 w-full overflow-hidden rounded-xl border border-white/10 shadow-inner">
        <MapContainer
          center={center}
          zoom={10}
          zoomControl={false}
          dragging={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          className="h-full w-full"
        >
          {mapContent}
        </MapContainer>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
      </div>
      {locations.length > 0 && (
        <p className="text-xs text-white/55">
          Selected:{' '}
          {selectedLocation ? locationTitle(selectedLocation) : coordinatesText(locations[0])}
        </p>
      )}
    </section>
  );
}
