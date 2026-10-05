import { useState } from 'react';
import { PageShell } from '../components/PageShell';
import { StepIndicator } from '../components/StepIndicator';
import { IdCardIcon, PassportIcon } from '../components/DocumentIcons';
import type { DocumentType } from '../types/facetec';

interface Props {
  onSelect: (type: DocumentType) => void;
  // False until FaceTecSDKLoader has finished loading the SDK AND the camera preflight — on a
  // cold load (no browser cache, e.g. a fresh in-app WebView) this can take a couple of seconds,
  // long enough for someone to tap a card and "Continuer" before it's ready. Without this gate,
  // that lands IDScanScreen's initializeFaceTec() on a `window.FaceTecSDK` that doesn't exist yet
  // — "Échec de l'initialisation du SDK" even though the SDK was only ever a moment away.
  sdkReady: boolean;
}

const DOCUMENT_OPTIONS: { type: DocumentType; label: string; hint: string; icon: typeof IdCardIcon }[] = [
  { type: 'cni', label: "Carte nationale d'identité", hint: 'Recto puis verso', icon: IdCardIcon },
  { type: 'passport', label: 'Passeport', hint: 'Page principale uniquement', icon: PassportIcon },
];

export function DocumentTypeSelectScreen({ onSelect, sdkReady }: Props) {
  const [selected, setSelected] = useState<DocumentType | null>(null);

  return (
    <PageShell
      title="Quel document ?"
      description="Choisissez le document que vous allez présenter à la caméra."
      rail={<StepIndicator steps={[{ label: 'Document' }, { label: 'Visage' }, { label: 'Résultat' }]} currentStep={1} />}
    >
      <div className="grid grid-cols-2 gap-3">
        {DOCUMENT_OPTIONS.map((option) => {
          const isSelected = selected === option.type;
          const Icon = option.icon;
          return (
            <button
              key={option.type}
              onClick={() => setSelected(option.type)}
              aria-pressed={isSelected}
              className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border p-4 text-center transition-colors ${
                isSelected ? 'border-accent bg-accent-dim' : 'border-border bg-surface-2 hover:border-muted'
              }`}
            >
              <Icon className={`h-10 w-10 ${isSelected ? 'text-accent' : 'text-muted'}`} />
              <div>
                <p className="font-display text-sm font-semibold text-ink">{option.label}</p>
                <p className="mt-0.5 text-xs text-muted">{option.hint}</p>
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => selected && onSelect(selected)}
        disabled={!selected || !sdkReady}
        className="mt-6 w-full cursor-pointer rounded-xl bg-accent py-3.5 font-display font-semibold text-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
      >
        {selected && !sdkReady ? 'Préparation du scanner…' : 'Continuer'}
      </button>
    </PageShell>
  );
}
