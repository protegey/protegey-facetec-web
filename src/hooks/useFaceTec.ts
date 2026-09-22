import { useState, useCallback, useRef, useEffect } from 'react';
import type { FaceTecVerificationResult, VerificationType } from '../types/facetec';
import { requestFaceTecProcessing, getSessionResult } from '../services/facetecProxy';

interface UseFaceTecOptions {
  verificationType: VerificationType;
  onError: (error: string) => void;
}

declare global {
  interface Window {
    FaceTecSDK?: {
      initializeWithSessionRequest: (
        deviceKeyIdentifier: string,
        sessionRequestProcessor: FaceTecSessionRequestProcessor,
      ) => Promise<boolean>;
      start3DLiveness: () => Promise<void>;
      startEnrollment: (externalDatabaseRefID: string) => Promise<void>;
      processResponse: (responseBlob: string) => Promise<void>;
    };
  }
}

interface FaceTecSessionRequestProcessor {
  onSessionRequest: (sessionRequestBlob: string) => Promise<string>;
  processResponse: (responseBlob: string) => Promise<void>;
}

export function useFaceTec({ verificationType, onError }: UseFaceTecOptions) {
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const sessionIdRef = useRef<string | null>(null);

  const processSessionRequest = useCallback(
    async (sessionRequestBlob: string): Promise<string> => {
      setLoading(true);
      try {
        const result = await requestFaceTecProcessing(sessionRequestBlob, verificationType);
        if (result.success && result.data) {
          return result.data.responseBlob;
        }
        throw new Error(result.error ?? 'FaceTec processing failed');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to process FaceTec session';
        onError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [verificationType, onError],
  );

  const processResponse = useCallback(async (responseBlob: string): Promise<void> => {
    try {
      if (window.FaceTecSDK) {
        await window.FaceTecSDK.processResponse(responseBlob);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to process FaceTec response';
      onError(msg);
      throw err;
    }
  }, [onError]);

  const initializeFaceTec = useCallback(async (): Promise<boolean> => {
    if (!window.FaceTecSDK) {
      onError('FaceTec SDK not loaded');
      return false;
    }

    try {
      const sessionRequestProcessor: FaceTecSessionRequestProcessor = {
        onSessionRequest: processSessionRequest,
        processResponse: processResponse,
      };

      const success = await window.FaceTecSDK.initializeWithSessionRequest(
        'dlrL00OosNJyky981KCeSVtVW63vPvtM',
        sessionRequestProcessor,
      );

      if (success) {
        setInitialized(true);
      } else {
        onError('FaceTec initialization failed');
      }
      return success;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'FaceTec initialization error';
      onError(msg);
      return false;
    }
  }, [processSessionRequest, processResponse, onError]);

  const startLiveness = useCallback(async (): Promise<FaceTecVerificationResult | null> => {
    if (!window.FaceTecSDK || !initialized) {
      onError('FaceTec SDK not initialized');
      return null;
    }

    setLoading(true);
    try {
      await window.FaceTecSDK.start3DLiveness();

      const sessionId = sessionIdRef.current;
      if (sessionId) {
        const result = await getSessionResult(sessionId);
        if (result.success && result.data) {
          const raw = result.data as Record<string, unknown>;
          return buildVerificationResult(sessionId, raw, 'liveness');
        }
      }
      return null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Liveness check failed';
      onError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [initialized, onError]);

  const startEnrollment = useCallback(
    async (externalDatabaseRefID: string): Promise<FaceTecVerificationResult | null> => {
      if (!window.FaceTecSDK || !initialized) {
        onError('FaceTec SDK not initialized');
        return null;
      }

      setLoading(true);
      try {
        await window.FaceTecSDK.startEnrollment(externalDatabaseRefID);
        sessionIdRef.current = externalDatabaseRefID;

        const result = await getSessionResult(externalDatabaseRefID);
        if (result.success && result.data) {
          const raw = result.data as Record<string, unknown>;
          return buildVerificationResult(externalDatabaseRefID, raw, 'enrollment');
        }
        return null;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Enrollment failed';
        onError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [initialized, onError],
  );

  useEffect(() => {
    return () => {
      // Cleanup
    };
  }, []);

  return {
    loading,
    initialized,
    initializeFaceTec,
    startLiveness,
    startEnrollment,
    sessionIdRef,
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
    auditTrailUrl: raw.auditTrailImage ? URL.createObjectURL(new Blob([])) : undefined,
    rawResponse: raw,
  };
}
