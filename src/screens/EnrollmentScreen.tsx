import { useState } from 'react';
import { useFaceTec } from '../hooks/useFaceTec';
import type { FaceTecVerificationResult } from '../types/facetec';
import { FaceTecOverlay } from '../components/FaceTecOverlay';

interface Props {
  onComplete: (result: FaceTecVerificationResult) => void;
  onBack: () => void;
  onError: (error: string) => void;
}

export function EnrollmentScreen({ onComplete, onBack, onError }: Props) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const { initializeFaceTec, startEnrollment, loading } = useFaceTec({
    verificationType: 'enrollment',
    onError,
  });

  const handleEnroll = async () => {
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
      await startEnrollment('enrollment_ref_001').then((result) => {
        if (result) {
          onComplete(result);
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrollment failed');
      setShowOverlay(false);
    } finally {
      setProcessing(false);
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
          <h1 className="text-2xl font-bold text-slate-900">Enrollment</h1>
          <p className="text-slate-500 mt-1">
            Register your face for future verification
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
          <div className="flex items-center justify-center mb-6">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
              <span className="text-5xl">&#x1F487;</span>
            </div>
          </div>

          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-slate-800">Enroll Your Face</h3>
            <p className="text-sm text-slate-500 mt-1">
              Your 3D FaceMap will be securely stored for future verification
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleEnroll}
            disabled={loading || processing}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-lg cursor-pointer"
          >
            {loading || processing ? 'Enrolling...' : 'Enroll Face'}
          </button>
        </div>
      </div>

      {showOverlay && (
        <FaceTecOverlay active={showOverlay} onClose={handleCloseOverlay}>
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin mx-auto mb-4" />
              <p className="text-white text-lg font-semibold">Enrolling...</p>
            </div>
          </div>
        </FaceTecOverlay>
      )}
    </div>
  );
}
