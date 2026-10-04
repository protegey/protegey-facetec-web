import { useEffect, useRef, useState } from 'react';
import { useFaceTec } from '../hooks/useFaceTec';
import type { FaceTecVerificationResult } from '../types/facetec';
import { PageShell } from '../components/PageShell';
import { StepIndicator } from '../components/StepIndicator';
import { ScanFrame } from '../components/ScanFrame';
import { FaceScanIcon } from '../components/DocumentIcons';
import { logSdkEvent } from '../services/sdkEventLog';

interface Props {
  onComplete: (result: FaceTecVerificationResult) => void;
  onBack: () => void;
  onError: (error: string) => void;
}

export function LivenessScreen({ onComplete, onBack, onError }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  // See the matching state in IDScanScreen — true until the auto-launch fails (show the retry UI)
  // or hands off to FaceTec's own UI (which covers everything anyway).
  const [starting, setStarting] = useState(true);

  const { initializeFaceTec, startLiveness, loading } = useFaceTec({
    verificationType: 'liveness',
    onError,
  });

  const autoStarted = useRef(false);

  const handleStartLiveness = async () => {
    if (error) logSdkEvent('FV_RETRY', 'Nouvelle tentative de contrôle de vivacité');
    setProcessing(true);
    setError(null);

    try {
      const initialized = await initializeFaceTec();
      if (!initialized) {
        setError('Échec de l’initialisation du SDK');
        setProcessing(false);
        setStarting(false);
        return;
      }
      const result = await startLiveness();
      if (result) {
        logSdkEvent('CAPTURE_DONE', 'Contrôle de vivacité terminé');
        onComplete(result);
      } else {
        setStarting(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec du contrôle de vivacité');
      setStarting(false);
    } finally {
      setProcessing(false);
    }
  };

  // Same reasoning and same StrictMode caveat as IDScanScreen (see its comment) — a short settle
  // delay before calling in, and deliberately no cleanup function so React's dev-mode synthetic
  // unmount/remount can't cancel the only scheduled call.
  useEffect(() => {
    if (autoStarted.current) return;
    autoStarted.current = true;
    setTimeout(() => void handleStartLiveness(), 1500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (starting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-border border-t-accent" />
          <p className="text-sm text-muted">Préparation du contrôle facial…</p>
        </div>
      </div>
    );
  }

  return (
    <PageShell
      onBack={onBack}
      title="Prouvez que c'est vous"
      description="Un scan 3D vérifie qu'une personne réelle se trouve devant la caméra — pas une photo, pas une vidéo."
      rail={<StepIndicator steps={[{ label: 'Document' }, { label: 'Visage' }, { label: 'Résultat' }]} currentStep={2} />}
    >
      <ScanFrame active={processing} tone={error ? 'danger' : 'accent'} shape="oval">
        <FaceScanIcon />
      </ScanFrame>

      <div className="mt-6 flex justify-center gap-4 font-mono text-[11px] text-muted">
        <span>Aucune donnée conservée</span>
        <span aria-hidden="true">·</span>
        <span>Traitement chiffré</span>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-danger/30 bg-danger-dim px-3 py-2.5 text-sm text-danger">{error}</div>
      )}

      <button
        onClick={handleStartLiveness}
        disabled={loading || processing}
        className="mt-6 w-full cursor-pointer rounded-xl bg-accent py-3.5 font-display font-semibold text-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading || processing ? 'Analyse en cours…' : error ? 'Réessayer' : 'Démarrer le scan facial'}
      </button>

      <p className="mt-4 text-center text-xs text-muted">
        Vos données biométriques sont traitées de façon sécurisée et jamais stockées sur cet appareil.
      </p>
    </PageShell>
  );
}
