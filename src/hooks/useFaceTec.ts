import { useState, useCallback, useRef, useEffect } from 'react';
import type { FaceTecVerificationResult, VerificationType, IDScanResult } from '../types/facetec';
import { requestFaceTecProcessing, getSessionResult } from '../services/facetecProxy';
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
  startEnrollment?(externalDatabaseRefID: string): void;
}

export function useFaceTec({ verificationType, onError }: UseFaceTecOptions) {
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const sdkInstanceRef = useRef<FaceTecSDKInstance | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const processSessionRequest = useCallback(
    (requestBlob: string, requestCallback: FaceTecSessionRequestProcessorCallback): void => {
      setLoading(true);
      try {
        const doProcess = async () => {
          // sessionIdRef.current is set right before the native session starts (see startLiveness
          // / startIDScanOnly) and forwarded as externalDatabaseRefID on every request of the
          // session — FaceTec's Device SDK automatically re-sends whatever we pass here on every
          // subsequent request within the same session, so this is also what later identifies the
          // session to getSessionResult() once it's done.
          const result = await requestFaceTecProcessing(requestBlob, verificationType, sessionIdRef.current ?? undefined);
          // Diagnostic: FaceTec's own sample app's response type includes an optional `result`
          // object carrying the final OCR/scan data INLINE on some responses (not via a separate
          // lookup) — logging every response's real top-level keys here to see whether that's
          // actually happening, since getSessionResult() afterwards has been coming back empty.
          if (result.data) {
            logSdkEvent('INIT', `process-request keys: ${JSON.stringify(Object.keys(result.data))}`);
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
    // back on every subsequent request of the same session. This is what getSessionResult() below
    // actually looks up afterwards.
    sessionIdRef.current = crypto.randomUUID();
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
      if (!sessionId) {
        onError('Session de contrôle facial terminée sans identifiant de session');
        return null;
      }
      const result = await getSessionResult(sessionId);
      logSdkEvent('INIT', `getSessionResult(liveness): success=${result.success} data=${result.data ? JSON.stringify(Object.keys(result.data)) : 'none'} error=${result.error ?? '—'}`);
      if (result.success && result.data) {
        const raw = result.data as Record<string, unknown>;
        return buildVerificationResult(sessionId, raw, 'liveness');
      }
      // Previously fell through to a silent `return null` here — the native capture had already
      // succeeded (we're past onFaceTecExit), so this failure is specifically the result lookup,
      // and swallowing it looked identical on screen to nothing having happened at all.
      onError(result.error ?? 'Résultat du contrôle facial introuvable');
      return null;
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
      if (!sessionId) {
        onError('Scan du document terminé sans identifiant de session');
        return null;
      }
      const result = await getSessionResult(sessionId);
      logSdkEvent('INIT', `getSessionResult(idScan): success=${result.success} data=${result.data ? JSON.stringify(Object.keys(result.data)) : 'none'} error=${result.error ?? '—'}`);
      if (result.success && result.data) {
        const raw = result.data as Record<string, unknown>;
        return buildIDScanResult(sessionId, raw);
      }
      // Previously fell through to a silent `return null` here — the native capture had already
      // succeeded (we're past onFaceTecExit), so this failure is specifically the result lookup,
      // and swallowing it looked identical on screen to nothing having happened at all.
      onError(result.error ?? 'Résultat du scan de document introuvable');
      return null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ID Scan failed';
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
  const confidence = type === 'enrollment' || type === 'liveness'
    ? livenessProbability
    : matchLevel / 10;

  return {
    sessionId,
    passed: livenessProbability >= 0.85 && confidence >= 0.85,
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
