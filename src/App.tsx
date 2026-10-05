import { useState } from 'react'
import { DocumentTypeSelectScreen } from './screens/DocumentTypeSelectScreen'
import { IDScanScreen } from './screens/IDScanScreen'
import { LivenessScreen } from './screens/LivenessScreen'
import { ResultScreen } from './screens/ResultScreen'
import { FaceTecSDKLoader } from './components/FaceTecSDKLoader'
import { EventLogPanel } from './components/EventLogPanel'
import { match3D2DUploadedIDPhoto, setApiBase } from './services/facetecProxy'
import { notifyParentComplete } from './services/embedBridge'
import { buildFaceTecResultPayload, submitFaceTecResult } from './services/backendSubmission'
import { logSdkEvent } from './services/sdkEventLog'
import type { VerificationStep, FaceTecVerificationResult, IDScanResult, DocumentType } from './types/facetec'

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
  const [documentType, setDocumentType] = useState<DocumentType>('cni')
  const [result, setResult] = useState<FaceTecVerificationResult | null>(null)
  const [sdkLoaded, setSdkLoaded] = useState(false)
  const [idScanResult, setIDScanResult] = useState<IDScanResult | null>(null)
  const [matchResult, setMatchResult] = useState<Record<string, unknown> | null>(null)
  const [matchError, setMatchError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleDocumentTypeSelect = (type: DocumentType) => {
    setDocumentType(type);
    setIDScanResult(null);
    setScreen('id-scan');
  };

  const handleIDScanComplete = (r: IDScanResult) => {
    setIDScanResult(r);
    setScreen('liveness');
  };

  const handleLivenessComplete = async (r: FaceTecVerificationResult) => {
    setResult(r);

    // The real 3D:2D "does the live face match the ID photo" score comes from this call, not
    // from the liveness-only result above — it must be captured and sent, not just displayed.
    let match: Record<string, unknown> | null = null;
    if (idScanResult) {
      try {
        const matchRes = await match3D2DUploadedIDPhoto(
          r.sessionId,
          idScanResult.documentData.photo ?? '',
          10,
        );
        if (matchRes.success && matchRes.data) {
          match = matchRes.data as Record<string, unknown>;
          setMatchResult(match);
        }
      } catch (err) {
        setMatchError(err instanceof Error ? err.message : 'Match failed');
      }
    }

    // Report straight to protegey-backend — this app has no Protegey session of its own, so the
    // one-time `token` (from the launch URL) is what authenticates this specific call instead of
    // a partner JWT. Sends everything FaceTec produced: every score (liveness, match/matchLevel,
    // confidence), both images (ID document + selfie), extracted document fields, and the raw SDK
    // responses for audit. No-ops when this app was opened without an enrollment (e.g. directly,
    // for local testing) — nothing to report to.
    if (enrollmentId && token) {
      setSubmitting(true);
      const payload = buildFaceTecResultPayload(r, idScanResult, match);
      const outcome = await submitFaceTecResult(apiBase, enrollmentId, token, payload);
      setSubmitError(outcome.success ? null : outcome.error ?? 'Échec de l’enregistrement du résultat');
      setSubmitting(false);

      // Only relevant if this app happens to be iframed rather than reached by direct navigation
      // (the primary mode) — a lightweight "done" signal, since the actual data already went to
      // the backend above, not through postMessage.
      notifyParentComplete(enrollmentId, r.passed, parentOrigin);
    }

    setScreen('result');
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

  const handleError = (_error: string) => {
    console.error('FaceTec Error:', _error);
    // Every onError(...) across the app (SDK load, init, capture) funnels through here — this is
    // the only way to see the real failure reason on a device with no attached devtools (e.g.
    // inside a mobile app's WebView), via the event panel's ✦ button.
    logSdkEvent('ERROR', _error);
  };

  const handleRestart = () => {
    setResult(null);
    setIDScanResult(null);
    setMatchResult(null);
    setMatchError(null);
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

      {screen === 'document-type-select' && (
        <DocumentTypeSelectScreen onSelect={handleDocumentTypeSelect} sdkReady={sdkLoaded} />
      )}

      {screen === 'id-scan' && (
        <IDScanScreen
          documentType={documentType}
          onIDScanComplete={handleIDScanComplete}
          onBack={handleGoToDocumentSelect}
          onError={handleError}
        />
      )}

      {screen === 'liveness' && (
        <LivenessScreen
          onComplete={handleLivenessComplete}
          onBack={() => setScreen('id-scan')}
          onError={handleError}
        />
      )}

      {screen === 'result' && result && (
        <ResultScreen
          result={result}
          matchResult={matchResult}
          matchError={matchError}
          onRestart={handleRestart}
          submitting={submitting}
          submitError={submitError}
          returnUrl={returnUrl}
          onReturnToPartner={handleReturnToPartner}
        />
      )}
    </div>
  )
}
