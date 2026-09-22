const API_BASE = import.meta.env.VITE_API_BASE ?? '/api/v1';
const FACE_TEC_DEVICE_KEY = import.meta.env.VITE_FACE_TEC_DEVICE_KEY ?? 'dlrL00OosNJyky981KCeSVtVW63vPvtM';

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
      return { success: false, error: err.message ?? 'FaceTec proxy request failed' };
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
): Promise<ProxyResponse<{ responseBlob: string; sessionId: string }>> {
  return proxyRequest('face-process', {
    sessionRequestBlob,
    verificationType,
    externalDatabaseRefID,
  });
}

export async function getSessionResult(sessionId: string): Promise<ProxyResponse<Record<string, unknown>>> {
  return proxyRequest('face-session-result', { sessionId });
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

export function getFaceTecDeviceKey(): string {
  return FACE_TEC_DEVICE_KEY;
}
