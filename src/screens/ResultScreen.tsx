import type { FaceTecVerificationResult } from '../types/facetec';

interface Props {
  result: FaceTecVerificationResult;
  onRestart: () => void;
}

export function ResultScreen({ result, onRestart }: Props) {
  const { passed, confidenceScore, livenessScore, riskFactors, deviceInfo, sessionId } = result;

  const icon = passed ? '\u2713' : '\u2717';
  const bgClass = passed ? 'bg-emerald-50' : 'bg-red-50';
  const borderClass = passed ? 'border-emerald-200' : 'border-red-200';
  const textClass = passed ? 'text-emerald-700' : 'text-red-700';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Result header */}
        <div className="text-center mb-6">
          <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${bgClass} border-2 ${borderClass} mb-4 shadow-lg`}>
            <span className={`text-5xl font-bold ${textClass}`}>{icon}</span>
          </div>
          <h1 className={`text-3xl font-bold ${textClass}`}>
            {passed ? 'Verification Passed' : 'Verification Failed'}
          </h1>
          <p className="text-slate-500 mt-2">
            Session ID: {sessionId}
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <StatCard title="Liveness Score" value={`${(livenessScore * 100).toFixed(1)}%`} status={passed} />
          <StatCard title="Confidence" value={`${(confidenceScore * 100).toFixed(1)}%`} status={passed} />
          <StatCard title="Risk Level" value={riskFactors.rootedDevice || riskFactors.emulator ? 'HIGH' : 'LOW'} status={!riskFactors.rootedDevice && !riskFactors.emulator} />
          <StatCard title="Device" value={deviceInfo?.model ?? 'Unknown'} status />
        </div>

        {/* Risk factors */}
        <div className={`rounded-xl border-2 ${borderClass} p-4 mb-6`}>
          <h3 className="font-semibold text-slate-800 mb-3">Risk Assessment</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <RiskItem label="Liveness Probability" value={`${(riskFactors.livenessProbability * 100).toFixed(1)}%`} ok={riskFactors.livenessProbability >= 0.85} />
            <RiskItem label="Match Level" value={`${riskFactors.matchLevel}`} ok={riskFactors.matchLevel >= 10} />
            <RiskItem label="Rooted Device" value={riskFactors.rootedDevice ? 'Yes' : 'No'} ok={!riskFactors.rootedDevice} />
            <RiskItem label="Emulator" value={riskFactors.emulator ? 'Yes' : 'No'} ok={!riskFactors.emulator} />
            <RiskItem label="Spoof Attempts" value={String(riskFactors.spoofAttempts)} ok={riskFactors.spoofAttempts === 0} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onRestart}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Verify Another Person
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="w-full py-3 bg-white border-2 border-slate-200 hover:border-slate-400 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, status }: { title: string; value: string; status: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{title}</p>
      <p className={`text-2xl font-bold mt-1 ${status ? 'text-emerald-600' : 'text-red-600'}`}>
        {value}
      </p>
    </div>
  );
}

function RiskItem({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-500">{label}</span>
      <span className={`font-bold text-sm ${ok ? 'text-emerald-600' : 'text-red-600'}`}>
        {value}
      </span>
    </div>
  );
}
