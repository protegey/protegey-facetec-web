let API_BASE = import.meta.env.VITE_API_BASE ?? '/api/v1';
const FACE_TEC_DEVICE_KEY = import.meta.env.VITE_FACE_TEC_DEVICE_KEY ?? 'dlrL00OosNJyky981KCeSVtVW63vPvtM';

/**
 * Overrides the API base used for the (unauthenticated) FaceTec Testing-API
 * proxy calls below. Used when this app is launched embedded with an
 * `apiBase` query param, in case the embedding environment's API differs
 * from this app's own `VITE_API_BASE` build-time default.
 */
export function setApiBase(base: string): void {
  API_BASE = base;
}

interface ProxyResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Required on every call to FaceTec's Testing API (not the regular Production Server SDK) — only
 * the browser-side SDK itself can compute this, so our backend can't generate it; it has to be
 * captured here and forwarded with each request. Computed fresh per call since FaceTec's own
 * sample app does the same rather than caching it. */
function getTestingApiHeader(): string {
  return window.FaceTecSDK?.getTestingAPIHeader?.() ?? '';
}

async function proxyRequest<T>(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<ProxyResponse<T>> {
  try {
    const res = await fetch(`${API_BASE}/partner/pan-id/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, testingApiHeader: getTestingApiHeader() }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Request failed' }));
      return { success: false, error: err.message ?? 'La requête SDK a échoué' };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

export async function requestFaceTecProcessing(
  sessionRequestBlob: string,
  verificationType: string,
  externalDatabaseRefID?: string,
  // `result` carries the final liveness/match/OCR data inline on whichever request concludes the
  // session — confirmed against FaceTec's own sample app (SampleAppNetworkingRequest.ts), and the
  // only real path to the final result: FaceTec's Testing API has no /session-result/{id} route
  // (confirmed 404 "No route found" from their own server — that endpoint never existed).
): Promise<ProxyResponse<{ responseBlob: string; result?: Record<string, unknown> }>> {
  return proxyRequest('face-process', {
    sessionRequestBlob,
    verificationType,
    externalDatabaseRefID,
  });
}

export async function enrollUser(
  sessionRequestBlob: string,
  externalDatabaseRefID: string,
): Promise<ProxyResponse<{ responseBlob: string; sessionId: string; externalDatabaseRefID: string }>> {
  return proxyRequest('face-enroll', {
    sessionRequestBlob,
    externalDatabaseRefID,
  });
}

export async function search3DDatabase(
  faceMapBase64: string,
  minMatchLevel = 10,
): Promise<ProxyResponse<{ results: Array<{ externalDatabaseRefID: string; score: number }> }>> {
  return proxyRequest('face-search', {
    faceMapBase64,
    minMatchLevel,
  });
}

export async function match3D2DUploadedIDPhoto(
  externalDatabaseRefID: string,
  idScanFrontImage: string,
  minMatchLevel = 10,
): Promise<ProxyResponse<Record<string, unknown>>> {
  return proxyRequest('face-match-3d-2d', {
    externalDatabaseRefID,
    idScanFrontImage,
    minMatchLevel,
  });
}

export function getFaceTecDeviceKey(): string {
  return FACE_TEC_DEVICE_KEY;
}
