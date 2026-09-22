import { useState } from 'react';
import { useFaceTec } from '../hooks/useFaceTec';
import type { IDScanResult } from '../types/facetec';
import { FaceTecOverlay } from '../components/FaceTecOverlay';

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
    setShowOverlay(true);
    setProcessing(true);
    setError(null);

    try {
      const initialized = await initializeFaceTec();
      if (!initialized) {
        setError('Failed to initialize FaceTec');
        setShowOverlay(false);
        setProcessing(false);
        return;
      }
      const result = await startIDScanOnly();
      if (result) {
        onIDScanComplete(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ID Scan failed');
      setShowOverlay(false);
    } finally {
      setProcessing(false);
      setShowOverlay(false);
    }
  };

  const handleCloseOverlay = () => {
    setShowOverlay(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="mb-6">
          <button
            onClick={onBack}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium mb-3 cursor-pointer"
          >
            &larr; Back
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Scan du document</h1>
          <p className="text-slate-500 mt-1">
            Placez votre document devant la caméra pour le scanner
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
          <div className="flex items-center justify-center mb-6">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
              <span className="text-5xl">&#128221;</span>
            </div>
          </div>

          <div className="text-center mb-6 space-y-2">
            <h3 className="text-lg font-semibold text-slate-800">
              Capture du document
            </h3>
            <p className="text-sm text-slate-500">
              Le système va lire automatiquement les informations de votre document (OCR)
            </p>
            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Lecture automatique
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Données sécurisées
              </span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleStartIDScan}
            disabled={loading || processing}
            className="w-full py-4 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-lg cursor-pointer"
          >
            {loading || processing ? 'Scan en cours...' : 'Scanner le document'}
          </button>
        </div>
      </div>

      {showOverlay && (
        <FaceTecOverlay active={showOverlay} onClose={handleCloseOverlay}>
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full border-4 border-amber-500 border-t-transparent animate-spin mx-auto mb-4" />
              <p className="text-white text-lg font-semibold">Scan du document...</p>
              <p className="text-white/60 text-sm mt-1">Placez votre document dans le cadre</p>
            </div>
          </div>
        </FaceTecOverlay>
      )}
    </div>
  );
}
