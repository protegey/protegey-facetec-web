let API_BASE = import.meta.env.VITE_API_BASE ?? '/api/v1';
const FACE_TEC_DEVICE_KEY = import.meta.env.VITE_FACE_TEC_DEVICE_KEY ?? 'd086XGqbGS6UqnocWnCkH1B0LKgzcCX1';

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

async function proxyRequest<T>(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<ProxyResponse<T>> {
  try {
    const res = await fetch(`${API_BASE}/partner/pan-id/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
  // The complete FaceTec Server `/process-request` response — confirmed against FaceTec's own
  // sample app (SampleAppNetworkingRequest.ts) and Postman Core Test Suite, and the only real path
  // to the final result: there's no separate /session-result/{id} route, every session type
  // (liveness, enrollment, match, ID scan) shares this one /process-request call. `responseBlob`
  // drives the SDK's own UI forward; everything else (`result`, `idScanResultsSoFar`,
  // `additionalSessionData`, ...) is forwarded to the backend verbatim for it to interpret — this
  // app never reads past `responseBlob` itself.
): Promise<ProxyResponse<Record<string, unknown> & { responseBlob: string }>> {
  return proxyRequest('face-process', {
    sessionRequestBlob,
    verificationType,
    externalDatabaseRefID,
  });
}

export function getFaceTecDeviceKey(): string {
  return FACE_TEC_DEVICE_KEY;
}
