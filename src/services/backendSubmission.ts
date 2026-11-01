// ── Direct backend submission (no iframe/postMessage required) ─────────────
//
// This app is meant to be hosted on its own (e.g. Vercel + Cloudflare), on a
// different origin from protegey-backend and protegey-partner-web — the
// point of that split is to keep this SDK-heavy capture flow off the main
// app servers. It has no Protegey login/session of its own, so it cannot
// call an authenticated `/*/me/*` endpoint directly.
//
// Instead, protegey-partner-web (already authenticated) creates the
// `KycEnrollment` for a facetec-provider partner and gets back a `captureUrl`
// carrying a one-time token:
//
//   https://facetec.protegey.app/?enrollmentId=<uuid>&token=<raw-token>&apiBase=https%3A%2F%2Fapi.protegey.app&returnUrl=<encoded>
//
// The partner portal redirects the browser here (a normal navigation, not an
// iframe). Once the capture flow finishes, THIS app calls the backend's
// PUBLIC endpoint directly over the network:
//
//   POST {apiBase}/kyc/sessions/{enrollmentId}/facetec-result?token={token}
//
// The token (not a JWT) is what authenticates this specific call — it's
// single-use and expires 30 minutes after the enrollment was created (see
// protegey-backend `KycService.applyFaceTecResultByToken`). No cookies, no
// CORS credentials — a plain JSON POST, which is why the backend has CORS
// open for this route already.
//
// This app never computes passed/scores itself — it only forwards FaceTec's
// own raw signal (`rawResponse`) and the captured images. The backend's
// FaceTecResultInterpreter is the only place that turns that into a KYC
// decision; the response to this POST (the saved enrollment) carries the
// computed result back for display.

export interface FaceTecResultPayload {
  verificationType: string;
  /** FaceTec Server's complete, verbatim final `/process-request` response. The backend's
   * FaceTecResultInterpreter reads the document photo(s) straight out of
   * `rawResponse.idScanResultsSoFar.photoIDFrontImage`/`photoIDBackImage` — real, confirmed field
   * names (see IDScanResultsSoFar.java on the self-hosted FaceTec Server), so this app no longer
   * needs to guess at extracting them itself. There's currently no equivalent field for the live
   * selfie/liveness capture image on this flow — a separate, not-yet-solved problem. */
  rawResponse: Record<string, unknown>;
}

export function buildFaceTecResultPayload(verificationType: string, rawResponse: Record<string, unknown>): FaceTecResultPayload {
  return { verificationType, rawResponse };
}

export interface SubmitOutcome {
  success: boolean;
  error?: string;
  /** The saved enrollment as the backend computed it (status/scores/decision) — the only source
   * of truth for what this app displays on the result screen. */
  enrollment?: Record<string, unknown>;
}

/**
 * Posts the finished result straight to protegey-backend's public, token-authenticated endpoint.
 * This is the actual data transport — not postMessage, which (see embedBridge.ts) is only used
 * as a lightweight "I'm done" signal for a parent window when this app happens to be iframed.
 */
export async function submitFaceTecResult(apiBase: string, enrollmentId: string, token: string, payload: FaceTecResultPayload): Promise<SubmitOutcome> {
  try {
    const res = await fetch(`${apiBase}/kyc/sessions/${encodeURIComponent(enrollmentId)}/facetec-result?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return { success: false, error: (body?.message as string) ?? `Le serveur a refusé le résultat (${res.status})` };
    }
    const enrollment = await res.json().catch(() => undefined);
    return { success: true, enrollment };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur réseau lors de l\'envoi du résultat' };
  }
}
