import { useState } from 'react';
import { getBrowserPosition } from '../geolocation';
import { useStore } from '../state/store';
import { LocationIcon } from './icons';

type Status = {
  type: 'success' | 'error';
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
      setStatus({
        type: 'success',
        message: result.created
          ? `Added ${result.matched_area.name}.`
          : `${result.matched_area.name} was already saved.`,
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
          className={`rounded-md border px-2.5 py-1.5 text-xs ${
            status.type === 'error'
              ? 'border-red-300/30 bg-red-500/15 text-red-100'
              : 'border-emerald-300/30 bg-emerald-500/15 text-emerald-100'
          }`}
        >
          {status.message}
        </p>
      )}
    </div>
  );
}
