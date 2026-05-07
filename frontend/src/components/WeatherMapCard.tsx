import { useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { LatLngBoundsExpression, LatLngExpression, PointExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useStore } from '../state/store';
import { formatTemperature } from './format';
import type { Location } from '../types';

const SG_CENTER: LatLngExpression = [1.3521, 103.8198];
const SG_BOUNDS: LatLngBoundsExpression = [
  [1.1, 103.6],
  [1.5, 104.1],
];
const PIN_SIZE: PointExpression = [120, 48];
const PIN_ANCHOR: PointExpression = [60, 48];

function escapeHtml(value: string): string {
  return String(value).replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

function buildPinIcon(location: Location, isSelected: boolean) {
  const temp = escapeHtml(formatTemperature(location.weather.temperature_c));
  const html = `
    <div class="weather-pin-stack">
      <div class="map-chip ${isSelected ? 'is-selected' : ''}">${temp}</div>
      <div class="map-chip-dot"></div>
    </div>
  `;
  return L.divIcon({
    className: 'weather-pin',
    html,
    iconSize: PIN_SIZE,
    iconAnchor: PIN_ANCHOR,
  });
}

interface FitToLocationsProps {
  locations: Location[];
}

function FitToLocations({ locations }: FitToLocationsProps) {
  const map = useMap();
  useEffect(() => {
    if (locations.length === 0) {
      map.setView(SG_CENTER, 11, { animate: false });
      return;
    }
    if (locations.length === 1) {
      map.setView([locations[0].latitude, locations[0].longitude], 13, { animate: false });
      return;
    }
    const bounds = L.latLngBounds(locations.map((l) => [l.latitude, l.longitude]));
    map.fitBounds(bounds, { padding: [40, 40], animate: false });
  }, [locations, map]);
  return null;
}

interface ResizeOnExpandProps {
  expanded: boolean;
}

function ResizeOnExpand({ expanded }: ResizeOnExpandProps) {
  const map = useMap();
  useEffect(() => {
    const id = setTimeout(() => map.invalidateSize(), 250);
    return () => clearTimeout(id);
  }, [expanded, map]);
  return null;
}

export function WeatherMapCard() {
  const { locations, selectedId, select } = useStore();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [expanded]);

  const wrapperClass = expanded
    ? 'fixed inset-0 z-50 bg-slate-900'
    : 'relative h-56 w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] cursor-zoom-in';

  return (
    <div
      className={wrapperClass}
      onClick={expanded ? undefined : () => setExpanded(true)}
      role={expanded ? undefined : 'button'}
      aria-label={expanded ? undefined : 'Open map'}
      data-react-grab="ignore"
    >
      <MapContainer
        center={SG_CENTER}
        zoom={11}
        maxBounds={SG_BOUNDS}
        maxBoundsViscosity={1}
        zoomControl={expanded}
        dragging={expanded}
        scrollWheelZoom={expanded}
        doubleClickZoom={expanded}
        touchZoom={expanded}
        boxZoom={expanded}
        keyboard={expanded}
        attributionControl={expanded}
        style={{ height: '100%', width: '100%', background: '#1f2937' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <FitToLocations locations={locations} />
        <ResizeOnExpand expanded={expanded} />
        {locations.map((location) => (
          <Marker
            key={location.id}
            position={[location.latitude, location.longitude]}
            icon={buildPinIcon(location, location.id === selectedId)}
            eventHandlers={{
              click: (event) => {
                if (!expanded) return;
                L.DomEvent.stopPropagation(event.originalEvent);
                select(location.id);
              },
            }}
          />
        ))}
      </MapContainer>

      {expanded && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setExpanded(false);
          }}
          className="absolute right-4 top-4 z-[1000] rounded-full bg-black/65 px-3.5 py-1.5 text-sm font-medium text-white shadow-lg backdrop-blur hover:bg-black/80"
        >
          Close
        </button>
      )}
    </div>
  );
}
