import { useState } from 'react';
import { getBrowserPosition } from '../geolocation';
import { useStore } from '../state/store';
import { LocationIcon } from './icons';

type Status = {
  type: 'success' | 'warning' | 'error';
  message: string;
};

export function UseMyLocationButton() {
  const { createFromPosition } = useStore();
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);

  const onClick = async () => {
    setSubmitting(true);
    setStatus(null);
    try {
      const position = await getBrowserPosition();
      const result = await createFromPosition(position);
      const quality = result.location.weather.data_quality;
      const area = result.matched_area.name;
      const warning =
        quality.status === 'not_refreshed' || result.location.weather.condition === 'Not refreshed'
          ? `Added ${area}, but weather is not refreshed yet.`
          : quality.status === 'partial'
            ? `Added ${area} with partial weather data.`
            : quality.status === 'unavailable'
              ? `Added ${area}, but weather data is unavailable right now.`
              : null;
      const isWarning = result.created && Boolean(warning);
      setStatus({
        type: isWarning ? 'warning' : 'success',
        message: result.created ? (warning ?? `Added ${area}.`) : `${area} was already saved.`,
      });
    } catch (err) {
      setStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Could not use your location.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.07] px-3 py-2.5 text-sm font-medium text-white/85 backdrop-blur-xl hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LocationIcon className="h-4 w-4" />
        <span>{submitting ? 'Locating...' : 'Use my location'}</span>
      </button>
      {status && (
        <p
          aria-live="polite"
          className={`status-message ${
            status.type === 'error'
              ? 'status-message-error'
              : status.type === 'warning'
                ? 'status-message-warning'
                : 'status-message-success'
          }`}
        >
          {status.message}
        </p>
      )}
    </div>
  );
}
