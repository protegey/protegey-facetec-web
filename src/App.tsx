import { useEffect, useState } from 'react'
import { DocumentTypeSelectScreen } from './screens/DocumentTypeSelectScreen'
import { IDScanScreen } from './screens/IDScanScreen'
import { ResultScreen } from './screens/ResultScreen'
import { FaceTecSDKLoader } from './components/FaceTecSDKLoader'
import { EventLogPanel } from './components/EventLogPanel'
import { setApiBase } from './services/facetecProxy'
import { notifyParentComplete } from './services/embedBridge'
import { buildFaceTecResultPayload, submitFaceTecResult } from './services/backendSubmission'
import { fetchPartnerLogoUrl } from './services/branding'
import { logSdkEvent } from './services/sdkEventLog'
import type { VerificationStep, FaceTecDecision, DocumentType } from './types/facetec'

// ── Launch params ─────────────────────────────────────────────────────────
// protegey-partner-web creates the KycEnrollment (it's authenticated, this
// app isn't) and redirects the browser here with everything needed to
// capture and report the result directly to the backend — no shared
// session required:
//
//   https://facetec.protegey.app/?enrollmentId=...&token=...&apiBase=https%3A%2F%2Fapi.protegey.app&returnUrl=...
//
// `token` authenticates the one call to POST .../facetec-result (see
// src/services/backendSubmission.ts) — it is NOT a login/session token, it's
// single-use and scoped to this one enrollment. `returnUrl`, if given, is
// where we navigate back to once submission finishes (whether it succeeded
// or not — the partner portal re-fetches the enrollment either way to show
// the real status). `parentOrigin`/embedding via <iframe> is still supported
// as a fallback (see embedBridge.ts) but is not the primary launch mode.
// Read once at module load — these never change during a single launch.
function readLaunchParams() {
  const params = new URLSearchParams(window.location.search)
  const enrollmentId = params.get('enrollmentId')
  const token = params.get('token')
  const returnUrl = params.get('returnUrl')
  const parentOrigin = params.get('parentOrigin') ?? import.meta.env.VITE_PARENT_ORIGIN ?? '*'
  const apiBaseParam = params.get('apiBase')
  const apiBase = apiBaseParam ?? import.meta.env.VITE_API_BASE ?? '/api/v1'
  if (apiBaseParam) setApiBase(apiBaseParam)
  return { enrollmentId, token, returnUrl, parentOrigin, apiBase }
}

export function App() {
  const [{ enrollmentId, token, returnUrl, parentOrigin, apiBase }] = useState(readLaunchParams)
  const [screen, setScreen] = useState<VerificationStep>('document-type-select')
  // Fetched once at launch, same lifetime as the launch params above — stays null (PageShell's
  // own Protegey-default fallback) whenever there's no enrollment context at all, no logo
  // uploaded for that partner, or the fetch simply fails; see branding.ts.
  const [partnerLogoUrl, setPartnerLogoUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!enrollmentId || !token) return
    fetchPartnerLogoUrl(apiBase, enrollmentId, token).then(setPartnerLogoUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- launch params are read once (see readLaunchParams) and never change for the life of this tab
  }, [])
  const [documentType, setDocumentType] = useState<DocumentType>('cni')
  // Never computed locally — this app only drives the SDK; the decision (passed/scores) is
  // Protegey's own business logic, computed once by the backend from FaceTec's raw signal (see
  // FaceTecResultInterpreter), and handed back here purely for display.
  const [enrollment, setEnrollment] = useState<FaceTecDecision | null>(null)
  const [sdkLoaded, setSdkLoaded] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleDocumentTypeSelect = (type: DocumentType) => {
    setDocumentType(type);
    setScreen('id-scan');
  };

  // One continuous FaceTec session now does the document scan, the face capture, AND the 3D:2D
  // match between them (see startIDScanWithFaceMatch in useFaceTec.ts). `raw` is FaceTec's own
  // complete, unmodified session result — this app forwards it as-is; the backend is the only
  // place that turns it into a decision, and its response is the only thing displayed below.
  const handleVerificationComplete = async (raw: Record<string, unknown>) => {
    setScreen('result');

    // Report straight to protegey-backend — this app has no Protegey session of its own, so the
    // one-time `token` (from the launch URL) is what authenticates this specific call instead of
    // a partner JWT. No-ops when this app was opened without an enrollment (e.g. directly, for
    // local testing) — nothing to report to, and nothing to display either.
    if (enrollmentId && token) {
      setSubmitting(true);
      const payload = buildFaceTecResultPayload('match', raw);
      const outcome = await submitFaceTecResult(apiBase, enrollmentId, token, payload);
      const savedEnrollment = (outcome.enrollment as FaceTecDecision | undefined) ?? null;
      setSubmitError(outcome.success ? null : outcome.error ?? 'Échec de l’enregistrement du résultat');
      setEnrollment(savedEnrollment);
      setSubmitting(false);

      // Only relevant if this app happens to be iframed rather than reached by direct navigation
      // (the primary mode) — a lightweight "done" signal, since the actual data already went to
      // the backend above, not through postMessage.
      notifyParentComplete(enrollmentId, savedEnrollment?.decision?.passed ?? false, parentOrigin);
    }
  };

  const handleReturnToPartner = () => {
    if (!returnUrl) return;
    // protegey-partner-web now opens this app in a NEW TAB via window.open (never a same-tab
    // redirect, so the partner portal stays open and usable during capture) — that original tab
    // is still sitting on `returnUrl` already, so the right move here is to close THIS tab and
    // let the user land back on it, not navigate this one to `returnUrl` too (which would leave
    // two Protegey tabs open, one stale). `window.close()` only works on a window that was
    // actually opened by script, which is exactly the `window.opener`-having case here — anyone
    // who reached this page by pasting the link directly (no opener) falls back to navigating.
    if (window.opener) {
      window.close();
    } else {
      window.location.href = returnUrl;
    }
  };

  // Launched from a mobile SDK's in-app webview (no returnUrl, no window.opener) — window.close()
  // is a best-effort attempt; most WebView hosts don't let a page close itself, so the Close
  // button mainly exists for hosts that do. Either way it's harmless to attempt.
  const handleClose = () => {
    window.close();
  };

  const handleError = (_error: string) => {
    console.error('SDK Error:', _error);
    // Every onError(...) across the app (SDK load, init, capture) funnels through here — this is
    // the only way to see the real failure reason on a device with no attached devtools (e.g.
    // inside a mobile app's WebView), via the event panel's ✦ button.
    logSdkEvent('ERROR', _error);
  };

  const handleRestart = () => {
    setEnrollment(null);
    setSubmitError(null);
    setScreen('document-type-select');
  };

  const handleGoToDocumentSelect = () => {
    setScreen('document-type-select');
  };

  return (
    <div className="min-h-screen bg-bg">
      <EventLogPanel />
      {!sdkLoaded && screen === 'document-type-select' && (
        <FaceTecSDKLoader onSDKLoaded={() => setSdkLoaded(true)} onError={handleError} />
      )}

      {sdkLoaded && screen === 'document-type-select' && (
        <DocumentTypeSelectScreen onSelect={handleDocumentTypeSelect} logoUrl={partnerLogoUrl} />
      )}

      {screen === 'id-scan' && (
        <IDScanScreen
          documentType={documentType}
          onComplete={handleVerificationComplete}
          onBack={handleGoToDocumentSelect}
          onError={handleError}
          logoUrl={partnerLogoUrl}
        />
      )}

      {screen === 'result' && (
        <ResultScreen
          enrollment={enrollment}
          onRestart={handleRestart}
          submitting={submitting}
          submitError={submitError}
          returnUrl={returnUrl}
          onReturnToPartner={handleReturnToPartner}
          onClose={handleClose}
        />
      )}
    </div>
  )
}
