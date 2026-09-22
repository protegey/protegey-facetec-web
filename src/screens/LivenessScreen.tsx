import { useState } from 'react';
import { useFaceTec } from '../hooks/useFaceTec';
import type { FaceTecVerificationResult } from '../types/facetec';
import { FaceTecOverlay } from '../components/FaceTecOverlay';

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
      await startLiveness().then((result) => {
        if (result) {
          onComplete(result);
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Liveness check failed');
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
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium mb-3 cursor-pointer"
          >
            &larr; Back
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Liveness Check</h1>
          <p className="text-slate-500 mt-1">
            We'll verify you're a real person using 3D face scanning
          </p>
        </div>

        {/* FaceTec preview card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
          {/* FaceTec device icon */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-5xl">&#x1F9D1;</span>
            </div>
          </div>

          {/* Instructions */}
          <div className="text-center mb-6 space-y-2">
            <h3 className="text-lg font-semibold text-slate-800">
              3D Face Scan
            </h3>
            <p className="text-sm text-slate-500">
              Position your face in the frame. The system will guide you through the liveness challenge.
            </p>
            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                No registration needed
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Secure & private
              </span>
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Start button */}
          <button
            onClick={handleStartLiveness}
            disabled={loading || processing}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-lg cursor-pointer"
          >
            {loading || processing ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner />
                Verifying...
              </span>
            ) : (
              'Start Face Scan'
            )}
          </button>

          {/* Privacy note */}
          <div className="mt-4 flex items-start gap-2 text-xs text-slate-400">
            <span>&#x1F512;</span>
            <p>Your biometric data is processed securely and never stored on our servers</p>
          </div>
        </div>
      </div>

      {/* FaceTec Overlay */}
      {showOverlay && (
        <FaceTecOverlay active={showOverlay} onClose={handleCloseOverlay}>
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin mx-auto mb-4" />
              <p className="text-white text-lg font-semibold">Initializing FaceTec...</p>
              <p className="text-white/60 text-sm mt-1">Please allow camera access</p>
            </div>
          </div>
        </FaceTecOverlay>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
