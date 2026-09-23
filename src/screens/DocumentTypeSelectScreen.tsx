import { useState } from 'react';
import { PageShell } from '../components/PageShell';
import { StepIndicator } from '../components/StepIndicator';
import type { DocumentType } from '../types/facetec';

interface Props {
  onSelect: (type: DocumentType) => void;
  onBack: () => void;
}

const DOCUMENT_OPTIONS: { type: DocumentType; label: string; hint: string }[] = [
  { type: 'cni', label: "Carte nationale d'identité", hint: 'Document national' },
  { type: 'passport', label: 'Passeport', hint: 'Document international' },
];

export function DocumentTypeSelectScreen({ onSelect, onBack }: Props) {
  const [selected, setSelected] = useState<DocumentType | null>(null);

  return (
    <PageShell
      onBack={onBack}
      title="Quel document ?"
      description="Choisissez le document que vous allez présenter à la caméra."
      rail={<StepIndicator steps={[{ label: 'Document' }, { label: 'Visage' }, { label: 'Résultat' }]} currentStep={1} />}
    >
      <div className="space-y-2.5">
        {DOCUMENT_OPTIONS.map((option) => {
          const isSelected = selected === option.type;
          return (
            <button
              key={option.type}
              onClick={() => setSelected(option.type)}
              className={`w-full cursor-pointer rounded-xl border p-4 text-left transition-colors ${
                isSelected ? 'border-accent bg-accent-dim' : 'border-border bg-surface-2 hover:border-muted'
              }`}
            >
              <p className="font-display font-semibold text-ink">{option.label}</p>
              <p className="mt-0.5 text-sm text-muted">{option.hint}</p>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => selected && onSelect(selected)}
        disabled={!selected}
        className="mt-6 w-full cursor-pointer rounded-xl bg-accent py-3.5 font-display font-semibold text-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
      >
        Continuer
      </button>
    </PageShell>
  );
}
