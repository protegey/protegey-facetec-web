interface FaceTecOverlayProps {
  active: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function FaceTecOverlay({ active, onClose, children }: FaceTecOverlayProps) {
  if (!active) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-display text-base font-semibold text-ink">Vérification FaceTec</h2>
        <button
          onClick={onClose}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border text-muted transition-colors hover:text-ink"
          aria-label="Fermer la vérification"
        >
          &times;
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
