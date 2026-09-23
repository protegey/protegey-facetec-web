// ── Optional embedding signal ────────────────────────────────────────────
//
// The actual result data travels straight from this app to protegey-backend
// via a direct, token-authenticated API call — see `backendSubmission.ts`.
// This file is only relevant if this app is ever opened inside an <iframe>
// rather than reached by a full-page redirect (the primary launch mode,
// given this app is meant to be hosted standalone — e.g. on Vercel — on a
// different origin from protegey-partner-web, precisely so the SDK-heavy
// capture flow doesn't add load to the main app servers).
//
// When iframed, a parent window has no reliable way to know the flow
// finished (no page navigation to observe), so this posts a tiny
// completion signal — no result payload, since that already went to the
// backend directly — letting the parent decide what to do next (close the
// frame, navigate away, refetch the enrollment to show the outcome).

export interface FaceTecCompleteMessage {
  type: 'facetec-complete';
  enrollmentId: string;
  passed: boolean;
}

/**
 * Notifies an embedding parent window that capture finished, if there is one. No-op when this
 * app is not running inside an iframe (the normal case — reached by direct navigation instead).
 */
export function notifyParentComplete(enrollmentId: string, passed: boolean, parentOrigin: string): boolean {
  if (typeof window === 'undefined' || window.parent === window) {
    return false;
  }

  const message: FaceTecCompleteMessage = { type: 'facetec-complete', enrollmentId, passed };
  window.parent.postMessage(message, parentOrigin);
  return true;
}
