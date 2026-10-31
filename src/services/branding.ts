/**
 * Read-only counterpart to submitFaceTecResult (backendSubmission.ts) — same token-scoped
 * endpoint family, called once at launch rather than at the end of the flow. Returns null on
 * anything other than a clean 200 (no logo uploaded for this partner, invalid/expired token, no
 * network, or this app opened directly for local testing with no enrollmentId/token at all) —
 * PageShell falls back to the Protegey default logo in every one of those cases, the same "try
 * the partner's own branding, otherwise ours" behavior already used for KYB emails and the
 * partner portal's own favicon.
 */
export async function fetchPartnerLogoUrl(apiBase: string, enrollmentId: string, token: string): Promise<string | null> {
  try {
    const res = await fetch(`${apiBase}/kyc/sessions/${encodeURIComponent(enrollmentId)}/branding?token=${encodeURIComponent(token)}`);
    if (!res.ok) return null;
    const blob = await res.blob();
    // Never revoked: this is a single short-lived page (one capture flow, then the tab closes or
    // navigates away per handleReturnToPartner/handleClose in App.tsx) — not a long-lived SPA
    // where leaking one object URL per navigation would actually matter.
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}
