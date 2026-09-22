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

export interface FaceTecVerificationResult {
  sessionId: string;
  passed: boolean;
  confidenceScore: number;
  livenessScore: number;
  matchScore?: number;
  riskFactors: {
    livenessProbability: number;
    matchLevel: number;
    rootedDevice: boolean;
    emulator: boolean;
    spoofAttempts: number;
  };
  deviceInfo?: {
    model: string;
    sdkVersion: string;
    platform: string;
  };
  ageEstimate?: number;
  auditTrailUrl?: string;
  rawResponse: Record<string, unknown>;
}

// ── Verification types ─────────────────────────────────────────────────

export type VerificationStep = 'welcome' | 'document-type-select' | 'id-scan' | 'liveness' | 'result';

export type DocumentType = 'cni' | 'passport';

export type VerificationType = 'liveness' | 'enrollment' | 're-verification' | 'match';

export interface IDScanResult {
  success: boolean;
  documentData: {
    fullName: string;
    documentNumber: string;
    documentType: string;
    dateOfBirth?: string;
    expirationDate?: string;
    nationality?: string;
    issuingState?: string;
    photo?: string;
    [key: string]: unknown;
  };
  photoIDNextStepEnumInt: number;
  sessionId: string;
  externalDatabaseRefID?: string;
}

export interface KycEnrollment {
  id: string;
  partnerId: string;
  fullName: string | null;
  status: 'not_started' | 'in_progress' | 'awaiting_user' | 'in_review' | 'approved' | 'declined' | 'resubmitted' | 'abandoned' | 'expired';
  sessionId: string | null;
  faceTecSessionId: string | null;
  livenessScore: number | null;
  faceMatchScore: number | null;
  verificationType: VerificationType | null;
  externalDatabaseRefID: string | null;
  deviceModel: string | null;
  createdAt: string;
  updatedAt: string;
}

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
