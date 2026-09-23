import type { FaceTecVerificationResult, IDScanResult } from '../types/facetec';

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

export interface FaceTecResultPayload {
  passed: boolean;
  livenessScore?: number;
  matchScore?: number;
  matchLevel?: number;
  confidenceScore?: number;
  documentPhoto?: string;
  selfiePhoto?: string;
  idDocumentType?: string;
  idDocumentNumber?: string;
  country?: string;
  riskFactors?: Record<string, unknown>;
  rawResponse?: Record<string, unknown>;
}

/** Converts this app's internal 0-1 fraction scores to the backend's 0-100 scale. */
function toPercent(value: number | undefined): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.round(value * 100 * 100) / 100;
}

/**
 * Merges every piece of data FaceTec produced across the whole flow — liveness result, ID scan,
 * and the 3D:2D match call — into one payload. Nothing FaceTec reports should be silently
 * dropped: images, every score, and the raw SDK responses for audit all travel together.
 */
export function buildFaceTecResultPayload(
  result: FaceTecVerificationResult,
  idScanResult: IDScanResult | null | undefined,
  matchResult: Record<string, unknown> | null | undefined,
): FaceTecResultPayload {
  const documentData = idScanResult?.documentData;
  // The real 3D:2D match level comes from the separate match3D2DUploadedIDPhoto call
  // (`matchResult.matchLevel`), not from the liveness-only result — fall back to whatever the
  // verification result already carried if that call was never made or didn't return one.
  const matchLevel = matchResult && typeof matchResult.matchLevel !== 'undefined'
    ? Number(matchResult.matchLevel)
    : result.riskFactors.matchLevel || undefined;

  return {
    passed: result.passed,
    livenessScore: toPercent(result.livenessScore),
    matchScore: toPercent(result.matchScore),
    matchLevel,
    confidenceScore: toPercent(result.confidenceScore),
    documentPhoto: documentData?.photo || undefined,
    selfiePhoto: result.selfiePhoto || undefined,
    idDocumentType: documentData?.documentType || undefined,
    idDocumentNumber: documentData?.documentNumber || undefined,
    country: documentData?.issuingState || documentData?.nationality || undefined,
    riskFactors: { ...result.riskFactors },
    // Every raw SDK response, kept verbatim for audit — liveness, ID scan (minus the huge photo
    // field, already sent as `documentPhoto`), and the 3D:2D match call.
    rawResponse: {
      liveness: result.rawResponse,
      idScan: idScanResult ? { ...idScanResult, documentData: { ...idScanResult.documentData, photo: undefined } } : undefined,
      match: matchResult ?? undefined,
    },
  };
}

export interface SubmitOutcome {
  success: boolean;
  error?: string;
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
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur réseau lors de l\'envoi du résultat' };
  }
}
