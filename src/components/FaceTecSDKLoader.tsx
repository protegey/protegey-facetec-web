import { useEffect, useRef, useState } from 'react';
import { logSdkEvent } from '../services/sdkEventLog';

type LoadState = 'loading' | 'checking-camera' | 'ready' | 'error-unsupported' | 'error-camera-denied' | 'error-sdk';

interface FaceTecSDKLoaderProps {
  onSDKLoaded: () => void;
  onError: (error: string) => void;
}

/**
 * Loads the FaceTec Browser SDK, then runs a camera preflight check before handing control to the
 * capture screens — this is what actually distinguishes "camera permission denied" from "device
 * unsupported" from "SDK failed to load", each with its own recovery path, per the brief's ask #2.
 * The preflight stream is stopped immediately after the check so FaceTec's own SDK can acquire
 * the camera cleanly right after.
 */
export function FaceTecSDKLoader({ onSDKLoaded, onError }: FaceTecSDKLoaderProps) {
  const [state, setState] = useState<LoadState>('loading');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    logSdkEvent('INIT', 'Chargement du SDK Device FaceTec…');

    const sdkScript = document.createElement('script');
    sdkScript.src = '/core-sdk/main.js';
    sdkScript.async = true;

    sdkScript.onload = async () => {
      if (cancelled) return;

      if (!navigator.mediaDevices?.getUserMedia) {
        setState('error-unsupported');
        logSdkEvent('ERROR', 'Appareil non compatible — aucun accès caméra disponible');
        onError('Device does not support camera access');
        return;
      }

      setState('checking-camera');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((track) => track.stop()); // release — the SDK acquires its own stream next
        if (cancelled) return;
        setState('ready');
        logSdkEvent('UI_READY', 'SDK chargé, caméra autorisée');
        onSDKLoaded();
      } catch {
        if (cancelled) return;
        setState('error-camera-denied');
        logSdkEvent('ERROR', 'Accès caméra refusé par l’utilisateur');
        onError('Camera permission denied');
      }
    };

    sdkScript.onerror = () => {
      if (cancelled) return;
      setState('error-sdk');
      logSdkEvent('ERROR', 'Échec du chargement du SDK FaceTec');
      onError('FaceTec SDK failed to load');
    };

    document.body.appendChild(sdkScript);
    return () => {
      cancelled = true;
      document.body.removeChild(sdkScript);
    };
  }, [onSDKLoaded, onError]);

  if (state === 'ready') {
    return <div ref={containerRef} className="facetec-overlay" />;
  }

  if (state === 'error-unsupported' || state === 'error-camera-denied' || state === 'error-sdk') {
    return <PreflightError state={state} />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-border border-t-accent" />
        <p className="font-mono text-sm text-muted">
          {state === 'checking-camera' ? 'Vérification de la caméra…' : 'Chargement du SDK…'}
        </p>
      </div>
    </div>
  );
}

function PreflightError({ state }: { state: 'error-unsupported' | 'error-camera-denied' | 'error-sdk' }) {
  const copy = {
    'error-unsupported': {
      title: 'Appareil non compatible',
      body: 'Cet appareil ou ce navigateur ne fournit pas d’accès caméra. Essayez avec un navigateur récent (Chrome, Safari, Edge) sur ordinateur ou mobile.',
    },
    'error-camera-denied': {
      title: 'Accès caméra refusé',
      body: 'La vérification a besoin de la caméra pour le scan du document et le contrôle de vivacité. Autorisez l’accès dans les réglages du navigateur, puis rechargez la page.',
    },
    'error-sdk': {
      title: 'Le SDK n’a pas pu se charger',
      body: 'Vérifiez votre connexion réseau et rechargez la page. Si le problème persiste, contactez le support.',
    },
  }[state];

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-2xl border border-danger/30 bg-surface p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-dim text-danger">
          <span aria-hidden="true">!</span>
        </div>
        <h2 className="font-display text-lg font-semibold text-ink">{copy.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{copy.body}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-5 w-full cursor-pointer rounded-xl bg-surface-2 py-3 text-sm font-semibold text-ink transition-colors hover:bg-border"
        >
          Recharger la page
        </button>
      </div>
    </div>
  );
}
