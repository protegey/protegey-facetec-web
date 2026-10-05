import { useEffect, useRef, useState } from 'react';
import { useFaceTec } from '../hooks/useFaceTec';
import type { DocumentType, IDScanResult, FaceTecVerificationResult } from '../types/facetec';
import { PageShell } from '../components/PageShell';
import { StepIndicator } from '../components/StepIndicator';
import { ScanFrame } from '../components/ScanFrame';
import { IdCardIcon, PassportIcon } from '../components/DocumentIcons';
import { logSdkEvent } from '../services/sdkEventLog';

interface Props {
  documentType: DocumentType;
  // One continuous FaceTec session now covers the document scan AND the face match — see
  // startIDScanWithFaceMatch in useFaceTec.ts — so completion always carries both results at once.
  onComplete: (idScan: IDScanResult, verification: FaceTecVerificationResult, raw: Record<string, unknown>) => void;
  onBack: () => void;
  onError: (error: string) => void;
}

const COPY: Record<DocumentType, { title: string; description: string; captureLabel: string; icon: typeof IdCardIcon }> = {
  cni: {
    title: 'Scannez votre carte d’identité',
    description: 'Présentez le recto, puis le verso, puis votre visage pour vérifier la correspondance — bien à plat, dans le cadre, sous un bon éclairage.',
    captureLabel: 'Démarrer la vérification',
    icon: IdCardIcon,
  },
  passport: {
    title: 'Scannez votre passeport',
    description: 'Présentez la page principale (photo et informations), puis votre visage pour vérifier la correspondance — bien à plat, dans le cadre.',
    captureLabel: 'Démarrer la vérification',
    icon: PassportIcon,
  },
};

export function IDScanScreen({ documentType, onComplete, onBack, onError }: Props) {
  const copy = COPY[documentType];
  const Icon = copy.icon;
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  // True from mount until the auto-launch either fails (then we need the retry button and the
  // error message visible) or hands off to FaceTec's own UI (which covers everything anyway) — the
  // full "Démarrer le scan" screen has no reason to flash on screen first every single time.
  const [starting, setStarting] = useState(true);

  const { initializeFaceTec, startIDScanWithFaceMatch, loading } = useFaceTec({
    verificationType: 'match',
    onError,
  });

  const autoStarted = useRef(false);

  const handleStartIDScan = async () => {
    if (error) logSdkEvent('FV_RETRY', 'Nouvelle tentative de vérification');
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
      const result = await startIDScanWithFaceMatch();
      if (result) {
        logSdkEvent('CAPTURE_DONE', 'Scan du document et du visage terminé');
        onComplete(result.idScan, result.verification, result.raw);
      } else {
        setStarting(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la vérification');
      setStarting(false);
    } finally {
      setProcessing(false);
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

  if (starting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-border border-t-accent" />
          <p className="text-sm text-muted">Préparation du scan…</p>
        </div>
      </div>
    );
  }

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
    </PageShell>
  );
}
