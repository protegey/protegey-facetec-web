import { useState } from 'react';
import { useSdkEventLog } from '../hooks/useSdkEventLog';
import type { SdkEventType } from '../services/sdkEventLog';

const DOT_TONE: Record<SdkEventType, string> = {
  INIT: 'bg-muted',
  UI_READY: 'bg-accent',
  CAPTURE_DONE: 'bg-success',
  FV_RETRY: 'bg-warn',
  ERROR: 'bg-danger',
};

function formatTime(at: number): string {
  return new Date(at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * Collapsed by default — a quiet way to see the Device SDK's own lifecycle events
 * (UI_READY / CAPTURE_DONE / FV_RETRY) actually firing, useful while validating the
 * client-side integration ahead of Server SDK access. Never blocks the main flow.
 */
export function EventLogPanel() {
  const events = useSdkEventLog();
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-40 font-mono text-xs">
      {open && (
        <div className="mb-2 w-72 rounded-xl border border-border bg-surface p-3 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)]">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-ink">Événements SDK</span>
            <span className="text-muted">{events.length}</span>
          </div>
          <div className="max-h-48 space-y-1.5 overflow-y-auto">
            {events.length === 0 && <p className="text-muted">En attente d'activité…</p>}
            {[...events].reverse().map((event) => (
              <div key={event.id} className="flex items-start gap-2">
                <span className={`mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full ${DOT_TONE[event.type]}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-ink">{event.type}</span>
                    <span className="flex-shrink-0 text-muted">{formatTime(event.at)}</span>
                  </div>
                  <p className="truncate text-muted">{event.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Journal des événements SDK"
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors hover:text-ink"
      >
        <span aria-hidden="true">&#10022;</span>
      </button>
    </div>
  );
}
