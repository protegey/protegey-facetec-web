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
  documentPhoto?: string;
  selfiePhoto?: string;
  /** FaceTec Server's complete, verbatim final `/process-request` response. */
  rawResponse: Record<string, unknown>;
}

/** Best-effort only — see the equivalent note in protegey-backend's FaceTecResultInterpreter.
 * Neither FaceTec's own Postman Core Test Suite nor a real captured session (checked directly
 * against the database) confirms the exact key names for the captured selfie/document images on
 * a live Device SDK session's /process-request response; these are the most plausible candidates,
 * kept out of the backend's decision-making entirely (`rawResponse` is sent in full regardless,
 * so nothing is lost if these miss). Revisit against a real, un-truncated session payload. */
function extractPhoto(raw: Record<string, unknown>, keys: string[]): string | undefined {
  const idScan = (raw.idScanResultsSoFar ?? {}) as Record<string, unknown>;
  for (const source of [raw, idScan]) {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.length > 0) return value;
    }
  }
  return undefined;
}

/** Packages everything FaceTec produced across the whole flow — one continuous session covering
 * the document scan, the face capture, and the 3D:2D match between them (see
 * startIDScanWithFaceMatch in useFaceTec.ts) — for the backend to interpret. Nothing FaceTec
 * reports is dropped: `rawResponse` travels verbatim for audit and as the only input to the
 * backend's decision logic. */
export function buildFaceTecResultPayload(verificationType: string, rawResponse: Record<string, unknown>): FaceTecResultPayload {
  return {
    verificationType,
    documentPhoto: extractPhoto(rawResponse, ['frontImage', 'documentImage', 'idScanFrontImage']),
    selfiePhoto: extractPhoto(rawResponse, ['auditTrailImage', 'auditTrailBase64']),
    rawResponse,
  };
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
