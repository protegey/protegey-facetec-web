import { useState, useCallback, useRef, useEffect } from 'react';
import type { FaceTecVerificationResult, VerificationType, IDScanResult } from '../types/facetec';
import { requestFaceTecProcessing } from '../services/facetecProxy';
import { applyProtegeyFaceTecTheme } from '../services/faceTecTheme';
import { faceTecFrenchStrings } from '../services/faceTecLocalization';
import { faceTecOcrLocalizationFr } from '../services/faceTecOcrLocalization';
import { logSdkEvent } from '../services/sdkEventLog';

interface UseFaceTecOptions {
  verificationType: VerificationType;
  onError: (error: string) => void;
}

/** Loosely typed on purpose — these mirror FaceTec's own FaceTecCustomization.d.ts (vendored
 * under FaceTecSDK-browser-10.1.18/, not an importable package), so re-declaring every property
 * here would just be a second, easily-stale copy of their types. Each nested object's real
 * properties are documented at the single call site that sets them (faceTecTheme.ts). */
type FaceTecCustomizationSection = Record<string, string | number | boolean>;

export interface FaceTecCustomizationInstance {
  frameCustomization: FaceTecCustomizationSection;
  overlayCustomization: FaceTecCustomizationSection;
  feedbackCustomization: FaceTecCustomizationSection;
  guidanceCustomization: FaceTecCustomizationSection;
  resultScreenCustomization: FaceTecCustomizationSection;
  ovalCustomization: FaceTecCustomizationSection;
  idScanCustomization: FaceTecCustomizationSection;
  initialLoadingAnimationCustomization: FaceTecCustomizationSection;
  ocrConfirmationCustomization: FaceTecCustomizationSection;
}

declare global {
  interface Window {
    FaceTecSDK?: {
      setResourceDirectory: (resourceDirectory: string) => void;
      setImagesDirectory: (imagesDirectory: string) => void;
      getTestingAPIHeader: () => string;
      initializeWithSessionRequest: (
        deviceKeyIdentifier: string,
        sessionRequestProcessor: FaceTecSessionRequestProcessor,
        callback: FaceTecInitializeCallback,
      ) => void;
      deinitialize: (callback: () => void) => void;
      FaceTecCustomization: new () => FaceTecCustomizationInstance;
      setCustomization: (customization: FaceTecCustomizationInstance) => void;
      configureLocalization: (localizationJSON: Record<string, string>) => void;
      configureOCRLocalization: (ocrLocalizationJSON: Record<string, unknown>) => void;
    };
  }
}

interface FaceTecSessionRequestProcessorCallback {
  processResponse: (responseBlob: string) => void;
  updateProgress: (uploadPercent: number) => void;
  abortOnCatastrophicError: () => void;
}

interface FaceTecSessionResult {
  status: number;
}

interface FaceTecSessionRequestProcessor {
  onSessionRequest: (requestBlob: string, requestCallback: FaceTecSessionRequestProcessorCallback) => void;
  onFaceTecExit: (result: FaceTecSessionResult) => void;
}

interface FaceTecInitializeCallback {
  onSuccess: (sdkInstance: FaceTecSDKInstance) => void;
  onError: (error: number) => void;
}

interface FaceTecSDKInstance {
  start3DLiveness(sessionRequestProcessor: FaceTecSessionRequestProcessor): void;
  startIDScanOnly(sessionRequestProcessor: FaceTecSessionRequestProcessor): void;
  // The one-session "scan the face, then scan the document, then match them" flow — startIDScanOnly
  // is literally ID-only (no face capture at all, confirmed against FaceTec's own
  // FaceTecPublicApi.d.ts JSDoc), which is why a document-only scan never led to a face prompt.
  // NOT startIDScanThen3D2DMatch — tried that first, but FaceTec's real server rejected it with
  // "requires an already enrolled 3D FaceMap, but one was not provided" (confirmed in backend
  // logs): that method matches the ID against a FaceMap enrolled in a SEPARATE prior session, it
  // doesn't capture one itself. start3DLivenessThen3D2DPhotoIDMatch captures the face live, in
  // this same session, which is what lets it work with no pre-enrollment step at all.
  start3DLivenessThen3D2DPhotoIDMatch(sessionRequestProcessor: FaceTecSessionRequestProcessor): void;
  startEnrollment?(externalDatabaseRefID: string): void;
}

// Diagnostic: checking whether FaceTec's real fraud/tampering signals (as opposed to the
// "Overall Quality" retry flag shown in their dashboard, which is just a UX signal — their SDK
// already forces a retry on quality issues before letting the session conclude, so a completed
// session has already cleared that) are actually present in what our Testing API integration
// receives. These field names are documented for Fraud List Search / Account Deduplication /
// Anti-Tampering, but those are separate FaceTec features that may need enabling on the account
// and may only ship through the full production Server SDK rather than the Testing API sandbox —
// logging here is how we find out, instead of guessing. Also dumps additionalSessionData in full,
// since that's the most likely place any of these would live if present at all.
const FRAUD_SIGNAL_KEYS = ['isLikelyOnFraudList', 'isLikelyDuplicate', 'CannotConfirmIDIsAuthentic', 'LikelyOriginalText'];
function logFraudSignals(result: Record<string, unknown>): void {
  const found: Record<string, unknown> = {};
  for (const key of FRAUD_SIGNAL_KEYS) {
    if (key in result) found[key] = result[key];
  }
  logSdkEvent(
    'INIT',
    `fraud signals: ${Object.keys(found).length ? JSON.stringify(found) : 'none of ' + FRAUD_SIGNAL_KEYS.join(', ') + ' present'}`,
  );
  if (result.additionalSessionData) {
    logSdkEvent('INIT', `additionalSessionData: ${JSON.stringify(result.additionalSessionData)}`);
  }
}

export function useFaceTec({ verificationType, onError }: UseFaceTecOptions) {
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const sdkInstanceRef = useRef<FaceTecSDKInstance | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  // FaceTec's Testing API has no /session-result/{id} endpoint (confirmed: their own server
  // returns 404 "No route found" for it) — the real final result arrives INLINE, in the `result`
  // field of whichever process-request response concludes the session (confirmed against
  // FaceTec's own sample app, SampleAppNetworkingRequest.ts). processSessionRequest below captures
  // it here as it comes in; start*() reads it once the native session has exited successfully.
  const latestSessionResultRef = useRef<Record<string, unknown> | null>(null);

  const processSessionRequest = useCallback(
    (requestBlob: string, requestCallback: FaceTecSessionRequestProcessorCallback): void => {
      setLoading(true);
      try {
        const doProcess = async () => {
          // sessionIdRef.current is set right before the native session starts (see startLiveness
          // / startIDScanOnly / startIDScanWithFaceMatch) and forwarded as externalDatabaseRefID on
          // every request of the session.
          const result = await requestFaceTecProcessing(requestBlob, verificationType, sessionIdRef.current ?? undefined);
          if (result.data) {
            logSdkEvent('INIT', `process-request keys: ${JSON.stringify(Object.keys(result.data))}`);
            if (result.data.result) {
              latestSessionResultRef.current = result.data.result;
              logFraudSignals(result.data.result);
            }
          }
          if (result.success && result.data) {
            requestCallback.processResponse(result.data.responseBlob);
          } else {
            requestCallback.abortOnCatastrophicError();
          }
        };
        doProcess().finally(() => setLoading(false));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Échec du traitement de la session';
        onError(msg);
        requestCallback.abortOnCatastrophicError();
        setLoading(false);
      }
    },
    [verificationType, onError],
  );

  const initializeFaceTec = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!window.FaceTecSDK) {
        onError('SDK non chargé');
        resolve(false);
        return;
      }

      // Calling initializeWithSessionRequest a second time without the SDK's own WASM runtime
      // ever being torn down (deinitialize() only runs when this screen unmounts — see below, not
      // between retries on the same screen) corrupts its Emscripten Module object: the next
      // attempt crashes with "Cannot assign to read only property 'locateFile'" instead of
      // actually retrying. Idempotent here: an existing instance means we already succeeded once,
      // so reuse it instead of re-initializing.
      if (sdkInstanceRef.current) {
        resolve(true);
        return;
      }

      const sessionRequestProcessor: FaceTecSessionRequestProcessor = {
        onSessionRequest: processSessionRequest,
        onFaceTecExit: (result: FaceTecSessionResult) => {
          onError(`Session interrompue (code ${result.status})`);
        },
      };

      const initializeCallback: FaceTecInitializeCallback = {
        onSuccess: (sdkInstance: FaceTecSDKInstance) => {
          sdkInstanceRef.current = sdkInstance;
          // Must run AFTER a successful init per FaceTec's own docs (unlike setCustomization,
          // which runs before) — this is what actually translates the live capture screen's
          // instruction text ("Scan Front of ID" etc.) into French.
          window.FaceTecSDK?.configureLocalization(faceTecFrenchStrings);
          window.FaceTecSDK?.configureOCRLocalization(faceTecOcrLocalizationFr);
          setInitialized(true);
          resolve(true);
        },
        onError: (error: number) => {
          onError(`Échec de l'initialisation du SDK (code ${error})`);
          resolve(false);
        },
      };

      // Required before initialization — without these the SDK can't locate its own .wasm/.data
      // resource bundles or OCR/UI images and every request for them 404s. Paths are absolute
      // from the site root since main.js is served from /core-sdk/main.js and the resource
      // folders sit right next to it at public/core-sdk/resources and public/core-sdk/FaceTec_images.
      window.FaceTecSDK.setResourceDirectory('/core-sdk/resources');
      window.FaceTecSDK.setImagesDirectory('/core-sdk/FaceTec_images');
      applyProtegeyFaceTecTheme();

      window.FaceTecSDK.initializeWithSessionRequest(
        import.meta.env.VITE_FACE_TEC_DEVICE_KEY ?? 'dlrL00OosNJyky981KCeSVtVW63vPvtM',
        sessionRequestProcessor,
        initializeCallback,
      );
    });
  }, [processSessionRequest, onError]);

  const startLiveness = useCallback(async (): Promise<FaceTecVerificationResult | null> => {
    const sdkInstance = sdkInstanceRef.current;
    // Deliberately NOT checking the `initialized` state here — callers always call
    // `await initializeFaceTec()` immediately before this, in the same function, with no render in
    // between. `initialized` (state) would still read stale/false at this point since React hasn't
    // re-rendered yet; `sdkInstanceRef` (a ref) is the only signal that's actually up to date here.
    if (!sdkInstance) {
      onError('SDK non initialisé');
      return null;
    }

    setLoading(true);
    // FaceTec's Browser SDK never hands back a session identifier of its own (confirmed against
    // the vendored FaceTecPublicApi.d.ts — FaceTecSessionResult only carries `status`) — generating
    // our own and passing it as externalDatabaseRefID on every request (see processSessionRequest)
    // is the documented way to give the session a stable ID, since FaceTec's Device SDK echoes it
    // back on every subsequent request of the same session.
    sessionIdRef.current = crypto.randomUUID();
    latestSessionResultRef.current = null;
    try {
      await new Promise<void>((resolve, reject) => {
        const sessionRequestProcessor: FaceTecSessionRequestProcessor = {
          onSessionRequest: processSessionRequest,
          onFaceTecExit: (result: FaceTecSessionResult) => {
            if (result.status === 0) {
              resolve();
            } else {
              reject(new Error(`Liveness session exited with status: ${result.status}`));
            }
          },
        };
        sdkInstance.start3DLiveness(sessionRequestProcessor);
      });

      const sessionId = sessionIdRef.current;
      const raw = latestSessionResultRef.current;
      if (!sessionId || !raw) {
        onError('Contrôle facial terminé sans résultat final');
        return null;
      }
      return buildVerificationResult(sessionId, raw, 'liveness');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Liveness check failed';
      onError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [onError, processSessionRequest]);

  const startIDScanOnly = useCallback(async (): Promise<IDScanResult | null> => {
    const sdkInstance = sdkInstanceRef.current;
    // See the matching comment in startLiveness — same stale-closure reason for not checking
    // `initialized` here.
    if (!sdkInstance) {
      onError('SDK non initialisé');
      return null;
    }

    setLoading(true);
    // See the matching comment in startLiveness — same reason for generating our own ID here.
    sessionIdRef.current = crypto.randomUUID();
    latestSessionResultRef.current = null;
    try {
      await new Promise<void>((resolve, reject) => {
        const sessionRequestProcessor: FaceTecSessionRequestProcessor = {
          onSessionRequest: processSessionRequest,
          onFaceTecExit: (result: FaceTecSessionResult) => {
            if (result.status === 0) {
              resolve();
            } else {
              reject(new Error(`ID Scan session exited with status: ${result.status}`));
            }
          },
        };
        sdkInstance.startIDScanOnly(sessionRequestProcessor);
      });

      const sessionId = sessionIdRef.current;
      const raw = latestSessionResultRef.current;
      if (!sessionId || !raw) {
        onError('Scan du document terminé sans résultat final');
        return null;
      }
      return buildIDScanResult(sessionId, raw);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ID Scan failed';
      onError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [onError, processSessionRequest]);

  /** The actual "verify this ID belongs to this person" flow: one continuous native FaceTec
   * session that captures a live 3D face, THEN scans the document, THEN matches them — per
   * FaceTec's start3DLivenessThen3D2DPhotoIDMatch. Replaces the previous two independent calls
   * (startIDScanOnly, then a separate start3DLiveness from a different screen/session) — those
   * were two disconnected FaceTec sessions with no matching between them at all, which is also why
   * a document-only scan was never going to prompt for a face capture: startIDScanOnly is ID-only
   * by design. (startIDScanThen3D2DMatch looked like the right name but actually expects a 3D
   * FaceMap already enrolled in a SEPARATE prior session — FaceTec's real server rejects it
   * otherwise with "requires an already enrolled 3D FaceMap, but one was not provided".) */
  const startIDScanWithFaceMatch = useCallback(async (): Promise<{
    idScan: IDScanResult;
    verification: FaceTecVerificationResult;
    raw: Record<string, unknown>;
  } | null> => {
    const sdkInstance = sdkInstanceRef.current;
    if (!sdkInstance) {
      onError('SDK non initialisé');
      return null;
    }

    setLoading(true);
    sessionIdRef.current = crypto.randomUUID();
    latestSessionResultRef.current = null;
    try {
      await new Promise<void>((resolve, reject) => {
        const sessionRequestProcessor: FaceTecSessionRequestProcessor = {
          onSessionRequest: processSessionRequest,
          onFaceTecExit: (result: FaceTecSessionResult) => {
            if (result.status === 0) {
              resolve();
            } else {
              reject(new Error(`ID Scan + Face Match session exited with status: ${result.status}`));
            }
          },
        };
        sdkInstance.start3DLivenessThen3D2DPhotoIDMatch(sessionRequestProcessor);
      });

      const sessionId = sessionIdRef.current;
      const raw = latestSessionResultRef.current;
      if (!sessionId || !raw) {
        onError('Vérification terminée sans résultat final');
        return null;
      }
      return {
        idScan: buildIDScanResult(sessionId, raw),
        verification: buildVerificationResult(sessionId, raw, 'match'),
        raw,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ID Scan + Face Match failed';
      onError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [onError, processSessionRequest]);

  const startEnrollment = useCallback(async (externalDatabaseRefID: string): Promise<FaceTecVerificationResult | null> => {
    const result = await startLiveness();
    if (result) {
      return { ...result, externalDatabaseRefID };
    }
    return null;
  }, [startLiveness]);

  useEffect(() => {
    return () => {
      if (window.FaceTecSDK) {
        window.FaceTecSDK.deinitialize(() => {});
      }
    };
  }, []);

  return {
    loading,
    initialized,
    initializeFaceTec,
    startLiveness,
    startEnrollment,
    startIDScanOnly,
    startIDScanWithFaceMatch,
    sessionIdRef,
    sdkInstanceRef,
  };
}

function buildIDScanResult(sessionId: string, raw: Record<string, unknown>): IDScanResult {
  const documentData = (raw.documentData as Record<string, unknown>) ?? {};
  return {
    success: raw.success as boolean ?? false,
    documentData: {
      fullName: String(documentData.fullName ?? documentData.name ?? ''),
      documentNumber: String(documentData.documentNumber ?? documentData.idNumber ?? ''),
      documentType: String(documentData.documentType ?? ''),
      dateOfBirth: String(documentData.dateOfBirth ?? ''),
      expirationDate: String(documentData.expirationDate ?? ''),
      nationality: String(documentData.nationality ?? ''),
      issuingState: String(documentData.issuingState ?? ''),
      photo: String(documentData.photo ?? documentData.idPhoto ?? ''),
    },
    photoIDNextStepEnumInt: Number(raw.photoIDNextStepEnumInt ?? 0),
    sessionId,
    externalDatabaseRefID: String(raw.externalDatabaseRefID ?? ''),
  };
}

function buildVerificationResult(
  sessionId: string,
  raw: Record<string, unknown>,
  type: string,
): FaceTecVerificationResult {
  const faceScan = (raw.faceScan ?? raw.livenessCheck ?? {}) as Record<string, unknown>;
  const device = (raw.deviceInfo ?? {}) as Record<string, unknown>;
  const livenessProbability = Number(faceScan.livenessProbability ?? faceScan.probability ?? 0);
  const matchLevel = Number(raw.matchLevel ?? 0);
  // FaceTec's own matchLevel scale: 0 means no match (fail); any level above 0 is a genuine
  // successful match, the number just says how strict a threshold it cleared (e.g. Match Level 7
  // ≈ 1-in-500,000 false-accept rate) — confirmed against FaceTec's own published match-level
  // table. This used to be divided by 10 and treated as a 0-1 confidence fraction requiring 0.85+
  // to "pass" — effectively demanding Match Level 8.5+, which silently declined perfectly good
  // matches (a real Match Level 7 — checkmarked as a pass on FaceTec's own dashboard — scored
  // 0.7 under that formula and got rejected). The match itself already encodes pass/fail; a
  // completed start3DLivenessThen3D2DPhotoIDMatch session reaching this point has already had its
  // liveness verified by FaceTec as a prerequisite of the flow, so matchLevel alone decides it.
  const confidence = type === 'enrollment' || type === 'liveness'
    ? livenessProbability
    : Math.min(1, matchLevel / 10);
  const passed = type === 'enrollment' || type === 'liveness'
    ? livenessProbability >= 0.85
    : matchLevel > 0;

  return {
    sessionId,
    passed,
    confidenceScore: Math.round(Math.min(1, Math.max(0, confidence)) * 10000) / 10000,
    livenessScore: livenessProbability,
    matchScore: type !== 'liveness' ? Math.round(confidence * 100) / 100 : undefined,
    riskFactors: {
      livenessProbability,
      matchLevel,
      rootedDevice: Boolean(device.isRooted ?? device.isJailbroken ?? false),
      emulator: Boolean(device.isEmulator ?? false),
      spoofAttempts: Number((raw.additionalSessionData as Record<string, unknown>)?.spoofAttempts ?? 0),
    },
    deviceInfo: device.model ? {
      model: String(device.model),
      sdkVersion: String(device.sdkVersion ?? ''),
      platform: String(device.platform ?? 'web'),
    } : undefined,
    ageEstimate: raw.ageEstimateGroup ? Number(raw.ageEstimateGroup) : undefined,
    // The actual base64 selfie image — previously this built an object URL from an EMPTY blob
    // (a bug: the real image data was discarded and the URL was invalid off-page anyway, since a
    // blob: URL can't be sent to the backend). `selfiePhoto` carries the real base64 string; keep
    // `auditTrailUrl` only as a data: URL, usable for an on-screen <img> if ever needed.
    selfiePhoto: typeof raw.auditTrailImage === 'string' ? raw.auditTrailImage : undefined,
    auditTrailUrl: typeof raw.auditTrailImage === 'string' ? `data:image/jpeg;base64,${raw.auditTrailImage}` : undefined,
    rawResponse: raw,
  };
}
