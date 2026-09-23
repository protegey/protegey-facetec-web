interface Step {
  label: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

/** A labeled rail, not bare numbered circles — the label carries more information than a digit,
 * and the flow is a genuine sequence (document, then face, then result) so a rail is warranted. */
export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="mb-8 flex items-start gap-1.5">
      {steps.map((step, i) => {
        const stepNumber = i + 1;
        const state = stepNumber < currentStep ? 'done' : stepNumber === currentStep ? 'active' : 'upcoming';
        return (
          <div key={step.label} className="flex flex-1 flex-col gap-2">
            <div
              className={`h-1 rounded-full transition-colors duration-500 ${
                state === 'upcoming' ? 'bg-border' : 'bg-accent'
              }`}
            />
            <span
              className={`font-mono text-[11px] ${
                state === 'active' ? 'text-ink' : state === 'done' ? 'text-accent' : 'text-muted'
              }`}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
