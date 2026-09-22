import { StepIndicator } from './StepIndicator';

interface FaceTecOverlayProps {
  active: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function FaceTecOverlay({ active, onClose, children }: FaceTecOverlayProps) {
  if (!active) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
        <h2 className="text-lg font-bold text-slate-800">FaceTec Identity Verification</h2>
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-xl transition-colors cursor-pointer"
          aria-label="Close verification"
        >
          &times;
        </button>
      </div>

      {/* Step indicator */}
      <StepIndicator currentStep={2} totalSteps={3} />

      {/* Content */}
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
