// ── FaceTec Browser SDK types ──────────────────────────────────────────

export interface FaceTecSessionResult {
  success: boolean;
  livenessProbability?: number;
  matchLevel?: number;
  sessionId: string;
  externalDatabaseRefID?: string;
  auditTrailImage?: string;
  faceScan?: {
    livenessProbability: number;
    is3D: boolean;
  };
  deviceInfo?: {
    model: string;
    sdkVersion: string;
    platform: string;
    isRooted: boolean;
    isJailbroken: boolean;
    isEmulator: boolean;
  };
  ageEstimateGroup?: number;
  additionalSessionData?: {
    spoofAttempts: number;
  };
  faceMatchScore?: number;
}

export interface FaceTecSessionRequest {
  sessionRequestBlob: string;
  externalDatabaseRefID?: string;
}

export interface FaceTecSessionResponse {
  responseBlob: string;
  sessionId: string;
  success: boolean;
  error?: string;
}

/** What protegey-backend's `POST /kyc/sessions/:id/facetec-result` hands back once it has
 * computed the decision — the saved KycEnrollment, serialized. This app never computes
 * passed/scores itself; this is the ONLY source of what gets displayed on the result screen. */
export interface FaceTecDecision {
  id: string;
  status: string;
  livenessScore: number | null;
  faceMatchScore: number | null;
  idDocumentType: string | null;
  documentType: string | null;
  country: string | null;
  fullName: string | null;
  decision: {
    source: string;
    /** 'SUCCESS' = auto-approved, 'MANUAL' = passed liveness/ID-scan but below the confidence
     * threshold, a human needs to review it, 'FAILED' = liveness/ID-scan itself failed. */
    outcome: 'SUCCESS' | 'MANUAL' | 'FAILED';
    passed: boolean;
    confidenceScore: number | null;
    livenessScore: number | null;
    matchScore: number | null;
    matchLevel: number | null;
    riskFactors: Record<string, unknown> | null;
  } | null;
}

// ── Verification types ─────────────────────────────────────────────────

export type VerificationStep = 'document-type-select' | 'id-scan' | 'result';

export type DocumentType = 'cni' | 'passport';

export type VerificationType = 'liveness' | 'enrollment' | 're-verification' | 'match';

export interface FaceTecProxyRequest {
  sessionRequestBlob: string;
  verificationType: VerificationType;
  externalDatabaseRefID?: string;
}

export interface FaceTecProxyResponse {
  responseBlob: string;
  sessionId: string;
  success: boolean;
}

export interface LivenessResult {
  passed: boolean;
  confidence: number;
  sessionId: string;
  livenessProbability: number;
  deviceInfo: {
    model: string;
    sdkVersion: string;
    platform: string;
    isRooted: boolean;
    isEmulator: boolean;
  };
  spoofAttempts: number;
  auditTrailUrl?: string;
}

export interface EnrollmentResult {
  passed: boolean;
  confidence: number;
  sessionId: string;
  externalDatabaseRefID: string;
  livenessProbability: number;
  deviceInfo: {
    model: string;
    sdkVersion: string;
    platform: string;
  };
  auditTrailUrl?: string;
}
