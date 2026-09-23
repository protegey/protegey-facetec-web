import type { ReactNode } from 'react';

interface ScanFrameProps {
  /** True while a capture is actually in progress — this is the one animated moment on the page. */
  active: boolean;
  /** Tone of the ring — 'accent' while working, 'success'/'danger' to settle on an outcome. */
  tone?: 'accent' | 'success' | 'danger';
  children: ReactNode;
}

const RING_TONE: Record<NonNullable<ScanFrameProps['tone']>, string> = {
  accent: 'border-accent/60',
  success: 'border-success/60',
  danger: 'border-danger/60',
};

const SWEEP_TONE: Record<NonNullable<ScanFrameProps['tone']>, string> = {
  accent: 'from-transparent via-accent/70 to-transparent',
  success: 'from-transparent via-success/70 to-transparent',
  danger: 'from-transparent via-danger/70 to-transparent',
};

/**
 * The capture visual used on both the document-scan and liveness screens — a stand-in for the
 * structured-light depth sweep FaceTec's Device SDK actually performs, so the page has one
 * legible "this is a 3D scan, not a photo" moment instead of a generic icon-in-a-square.
 */
export function ScanFrame({ active, tone = 'accent', children }: ScanFrameProps) {
  return (
    <div className="relative mx-auto h-44 w-44">
      <div
        className={`absolute inset-0 rounded-full border-2 ${RING_TONE[tone]} ${active ? 'scan-ring-active' : ''}`}
      />
      <div className="absolute inset-3 overflow-hidden rounded-full bg-surface-2">
        {active && (
          <div
            className={`scan-sweep-line absolute inset-x-0 h-1/3 bg-gradient-to-b ${SWEEP_TONE[tone]}`}
            aria-hidden="true"
          />
        )}
        <div className="relative flex h-full w-full items-center justify-center">{children}</div>
      </div>
    </div>
  );
}
