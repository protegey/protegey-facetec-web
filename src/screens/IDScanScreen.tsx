import { useState } from 'react';
import { useFaceTec } from '../hooks/useFaceTec';
import type { IDScanResult } from '../types/facetec';
import { FaceTecOverlay } from '../components/FaceTecOverlay';
import { PageShell } from '../components/PageShell';
import { StepIndicator } from '../components/StepIndicator';
import { ScanFrame } from '../components/ScanFrame';
import { logSdkEvent } from '../services/sdkEventLog';

interface Props {
  onIDScanComplete: (result: IDScanResult) => void;
  onBack: () => void;
  onError: (error: string) => void;
}

export function IDScanScreen({ onIDScanComplete, onBack, onError }: Props) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const { initializeFaceTec, startIDScanOnly, loading } = useFaceTec({
    verificationType: 'match',
    onError,
  });

  const handleStartIDScan = async () => {
    if (error) logSdkEvent('FV_RETRY', 'Nouvelle tentative de scan du document');
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
      const result = await startIDScanOnly();
      if (result) {
        logSdkEvent('CAPTURE_DONE', 'Scan du document terminé');
        onIDScanComplete(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec du scan du document');
      setShowOverlay(false);
    } finally {
      setProcessing(false);
      setShowOverlay(false);
    }
  };

  return (
    <PageShell
      onBack={onBack}
      title="Scannez votre document"
      description="Placez le document bien à plat, dans le cadre, sous un bon éclairage."
      rail={<StepIndicator steps={[{ label: 'Document' }, { label: 'Visage' }, { label: 'Résultat' }]} currentStep={1} />}
    >
      <ScanFrame active={processing} tone={error ? 'danger' : 'accent'}>
        <span className="text-3xl" aria-hidden="true">
          &#128196;
        </span>
      </ScanFrame>

      <div className="mt-6 flex justify-center gap-4 font-mono text-[11px] text-muted">
        <span>Lecture OCR automatique</span>
        <span aria-hidden="true">·</span>
        <span>Données chiffrées</span>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-danger/30 bg-danger-dim px-3 py-2.5 text-sm text-danger">{error}</div>
      )}

      <button
        onClick={handleStartIDScan}
        disabled={loading || processing}
        className="mt-6 w-full cursor-pointer rounded-xl bg-accent py-3.5 font-display font-semibold text-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading || processing ? 'Scan en cours…' : error ? 'Réessayer' : 'Démarrer le scan'}
      </button>

      {showOverlay && (
        <FaceTecOverlay active={showOverlay} onClose={() => setShowOverlay(false)}>
          <div className="flex flex-1 items-center justify-center p-4">
            <div className="text-center">
              <div className="mx-auto mb-4 h-14 w-14 animate-spin rounded-full border-2 border-border border-t-accent" />
              <p className="font-display font-semibold text-ink">Scan du document…</p>
              <p className="mt-1 text-sm text-muted">Maintenez le document dans le cadre</p>
            </div>
          </div>
        </FaceTecOverlay>
      )}
    </PageShell>
  );
}
