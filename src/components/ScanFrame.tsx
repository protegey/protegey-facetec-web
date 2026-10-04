import type { ReactNode } from 'react';

interface ScanFrameProps {
  /** True while a capture is actually in progress — this is the one animated moment on the page. */
  active: boolean;
  /** Tone of the ring — 'accent' while working, 'success'/'danger' to settle on an outcome. */
  tone?: 'accent' | 'success' | 'danger';
  /** 'rect' for a physical document held flat to the camera (ID card, passport page);
   * 'oval' for the face/liveness capture. */
  shape?: 'rect' | 'oval';
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

const CORNER_TONE: Record<NonNullable<ScanFrameProps['tone']>, string> = {
  accent: 'border-accent',
  success: 'border-success',
  danger: 'border-danger',
};

const SHAPE_CLASS: Record<NonNullable<ScanFrameProps['shape']>, { outer: string; ring: string; inner: string }> = {
  rect: { outer: 'h-36 w-60', ring: 'rounded-2xl', inner: 'inset-[7px] rounded-xl' },
  oval: { outer: 'h-52 w-40', ring: 'rounded-[50%]', inner: 'inset-3 rounded-[50%]' },
};

/** Four L-shaped viewfinder brackets at the corners of the frame — the "this is an active scanner,
 * not a static icon" cue, independent of whichever shape sits inside. */
function CornerBrackets({ tone }: { tone: NonNullable<ScanFrameProps['tone']> }) {
  const base = `absolute h-5 w-5 border-[2.5px] ${CORNER_TONE[tone]}`;
  return (
    <>
      <span className={`${base} -left-1.5 -top-1.5 rounded-tl-lg border-b-0 border-r-0`} aria-hidden="true" />
      <span className={`${base} -right-1.5 -top-1.5 rounded-tr-lg border-b-0 border-l-0`} aria-hidden="true" />
      <span className={`${base} -bottom-1.5 -left-1.5 rounded-bl-lg border-t-0 border-r-0`} aria-hidden="true" />
      <span className={`${base} -bottom-1.5 -right-1.5 rounded-br-lg border-t-0 border-l-0`} aria-hidden="true" />
    </>
  );
}

/**
 * The capture visual used on the document-scan and liveness screens — a stand-in for the
 * structured-light depth sweep FaceTec's Device SDK actually performs, so the page has one
 * legible "this is a 3D scan, not a photo" moment instead of a generic icon-in-a-box. Shape
 * follows what's actually being framed: a landscape rect for a document held flat, an oval for
 * a face.
 */
export function ScanFrame({ active, tone = 'accent', shape = 'oval', children }: ScanFrameProps) {
  const sizing = SHAPE_CLASS[shape];
  return (
    <div className={`relative mx-auto ${sizing.outer}`}>
      <CornerBrackets tone={tone} />
      <div className={`absolute inset-0 border-2 ${sizing.ring} ${RING_TONE[tone]} ${active ? 'scan-ring-active' : ''}`} />
      <div className={`absolute overflow-hidden bg-surface-2 ${sizing.inner}`}>
        {active && (
          <div
            className={`scan-sweep-line absolute inset-x-0 h-1/3 bg-gradient-to-b ${SWEEP_TONE[tone]}`}
            aria-hidden="true"
          />
        )}
        <div className="relative flex h-full w-full items-center justify-center text-muted">{children}</div>
      </div>
    </div>
  );
}
