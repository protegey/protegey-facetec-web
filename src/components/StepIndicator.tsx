interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-50">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              i + 1 < currentStep
                ? 'bg-emerald-500 text-white'
                : i + 1 === currentStep
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-300'
                  : 'bg-slate-200 text-slate-500'
            }`}
          >
            {i + 1 < currentStep ? '\u2713' : i + 1}
          </div>
          {i < totalSteps - 1 && (
            <div
              className={`w-8 h-0.5 transition-colors ${
                i + 1 < currentStep ? 'bg-emerald-500' : 'bg-slate-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
