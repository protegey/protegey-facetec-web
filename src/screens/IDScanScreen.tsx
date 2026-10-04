import { useEffect, useRef, useState } from 'react';
import { useFaceTec } from '../hooks/useFaceTec';
import type { DocumentType, IDScanResult } from '../types/facetec';
import { FaceTecOverlay } from '../components/FaceTecOverlay';
import { PageShell } from '../components/PageShell';
import { StepIndicator } from '../components/StepIndicator';
import { ScanFrame } from '../components/ScanFrame';
import { IdCardIcon, PassportIcon } from '../components/DocumentIcons';
import { logSdkEvent } from '../services/sdkEventLog';

interface Props {
  documentType: DocumentType;
  onIDScanComplete: (result: IDScanResult) => void;
  onBack: () => void;
  onError: (error: string) => void;
}

const COPY: Record<DocumentType, { title: string; description: string; captureLabel: string; icon: typeof IdCardIcon }> = {
  cni: {
    title: 'Scannez votre carte d’identité',
    description: 'Présentez le recto, puis le verso — bien à plat, dans le cadre, sous un bon éclairage.',
    captureLabel: 'Démarrer le scan',
    icon: IdCardIcon,
  },
  passport: {
    title: 'Scannez votre passeport',
    description: 'Présentez la page principale (photo et informations), bien à plat, dans le cadre.',
    captureLabel: 'Démarrer le scan',
    icon: PassportIcon,
  },
};

export function IDScanScreen({ documentType, onIDScanComplete, onBack, onError }: Props) {
  const copy = COPY[documentType];
  const Icon = copy.icon;
  const [showOverlay, setShowOverlay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const { initializeFaceTec, startIDScanOnly, loading } = useFaceTec({
    verificationType: 'match',
    onError,
  });

  const autoStarted = useRef(false);

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

  // Launch straight into the camera shortly after this screen appears — the document-type choice
  // was itself the user's "I'm ready" gesture, no need to make them tap a second button. The short
  // delay matters: FaceTecSDKLoader's onSDKLoaded fires once the script has executed, but the WASM
  // runtime's own async setup (compiling/instantiating) keeps running in the background after
  // that — calling into the SDK before it's actually settled is what was leaving one of its
  // resource fetches stuck at "pending" forever (a manual click happened to leave enough of a gap
  // for this not to show up before). The button stays below for the retry path regardless.
  useEffect(() => {
    if (autoStarted.current) return;
    autoStarted.current = true;
    // No cleanup returned on purpose — React StrictMode mounts, synthetically unmounts, then
    // re-mounts every component once in dev. A cleanup that clearTimeout()s this would cancel the
    // only scheduled call during that synthetic unmount, and the ref guard then blocks the re-mount
    // from scheduling a replacement — net result, handleStartIDScan silently never runs at all.
    setTimeout(() => void handleStartIDScan(), 1500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PageShell
      onBack={onBack}
      title={copy.title}
      description={copy.description}
      rail={<StepIndicator steps={[{ label: 'Document' }, { label: 'Visage' }, { label: 'Résultat' }]} currentStep={1} />}
    >
      <ScanFrame active={processing} tone={error ? 'danger' : 'accent'} shape="rect">
        <Icon />
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
        {loading || processing ? 'Scan en cours…' : error ? 'Réessayer' : copy.captureLabel}
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
