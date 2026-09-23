import { useState } from 'react';
import { useFaceTec } from '../hooks/useFaceTec';
import type { FaceTecVerificationResult } from '../types/facetec';
import { FaceTecOverlay } from '../components/FaceTecOverlay';
import { PageShell } from '../components/PageShell';
import { StepIndicator } from '../components/StepIndicator';
import { ScanFrame } from '../components/ScanFrame';
import { logSdkEvent } from '../services/sdkEventLog';

interface Props {
  onComplete: (result: FaceTecVerificationResult) => void;
  onBack: () => void;
  onError: (error: string) => void;
}

export function LivenessScreen({ onComplete, onBack, onError }: Props) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const { initializeFaceTec, startLiveness, loading } = useFaceTec({
    verificationType: 'liveness',
    onError,
  });

  const handleStartLiveness = async () => {
    if (error) logSdkEvent('FV_RETRY', 'Nouvelle tentative de contrôle de vivacité');
    setShowOverlay(true);
    setProcessing(true);
    setError(null);

    try {
      const initialized = await initializeFaceTec();
      if (!initialized) {
        setError('Échec de l’initialisation du SDK');
        setShowOverlay(false);
        setProcessing(false);
        return;
      }
      const result = await startLiveness();
      if (result) {
        logSdkEvent('CAPTURE_DONE', 'Contrôle de vivacité terminé');
        onComplete(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec du contrôle de vivacité');
      setShowOverlay(false);
    } finally {
      setProcessing(false);
      setShowOverlay(false);
    }
  };

  return (
    <PageShell
      onBack={onBack}
      title="Prouvez que c'est vous"
      description="Un scan 3D vérifie qu'une personne réelle se trouve devant la caméra — pas une photo, pas une vidéo."
      rail={<StepIndicator steps={[{ label: 'Document' }, { label: 'Visage' }, { label: 'Résultat' }]} currentStep={2} />}
    >
      <ScanFrame active={processing} tone={error ? 'danger' : 'accent'}>
        <span className="text-3xl" aria-hidden="true">
          &#128064;
        </span>
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

      {showOverlay && (
        <FaceTecOverlay active={showOverlay} onClose={() => setShowOverlay(false)}>
          <div className="flex flex-1 items-center justify-center p-4">
            <div className="text-center">
              <div className="mx-auto mb-4 h-14 w-14 animate-spin rounded-full border-2 border-border border-t-accent" />
              <p className="font-display font-semibold text-ink">Initialisation…</p>
              <p className="mt-1 text-sm text-muted">Autorisez l'accès à la caméra</p>
            </div>
          </div>
        </FaceTecOverlay>
      )}
    </PageShell>
  );
}
