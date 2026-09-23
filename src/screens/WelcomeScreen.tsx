import { PageShell } from '../components/PageShell';

interface Props {
  onStart: () => void;
  onContinueWithDidit?: () => void;
}

export function WelcomeScreen({ onStart, onContinueWithDidit }: Props) {
  return (
    <PageShell
      title="Vérifiez votre identité"
      description="Un scan de document et un contrôle de vivacité en 3D — moins de deux minutes, aucune donnée biométrique conservée sur cet appareil."
    >
      <div className="mb-6 flex justify-center">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface-2">
          <span className="text-2xl" role="img" aria-label="Protegey">
            &#x1F6E1;&#xFE0F;
          </span>
        </div>
      </div>

      <div className="space-y-2.5">
        <button
          onClick={onStart}
          className="w-full cursor-pointer rounded-xl border border-accent/40 bg-accent-dim p-4 text-left transition-colors hover:border-accent"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display font-semibold text-ink">Scan biométrique FaceTec</p>
              <p className="mt-0.5 text-sm text-muted">Document + vivacité 3D</p>
            </div>
            <span className="text-accent" aria-hidden="true">
              &rarr;
            </span>
          </div>
        </button>

        {onContinueWithDidit && (
          <button
            onClick={onContinueWithDidit}
            className="w-full cursor-pointer rounded-xl border border-border bg-surface-2 p-4 text-left transition-colors hover:border-muted"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display font-semibold text-ink">Vérification standard</p>
                <p className="mt-0.5 text-sm text-muted">Document — via Didit</p>
              </div>
              <span className="text-muted" aria-hidden="true">
                &rarr;
              </span>
            </div>
          </button>
        )}
      </div>

      <div className="mt-6 flex items-center gap-2 border-t border-border pt-5 text-xs text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
        Session chiffrée de bout en bout
      </div>
    </PageShell>
  );
}
