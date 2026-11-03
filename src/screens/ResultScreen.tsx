import { useEffect, useState } from 'react';
import { ScanFrame } from '../components/ScanFrame';
import type { FaceTecDecision } from '../types/facetec';

const AUTO_CLOSE_SECONDS = 5;

interface Props {
  // The backend's own answer — passed/scores are Protegey's business logic, computed once,
  // server-side, from FaceTec's raw signal. This screen only displays it; null while still
  // submitting, or if submission failed before a decision ever came back.
  enrollment: FaceTecDecision | null;
  onRestart: () => void;
  /** Whether the result is still being posted to protegey-backend. */
  submitting?: boolean;
  /** Set when the direct API submission to the backend failed — the capture itself still
   * succeeded, but nothing was persisted, so this must be visible, not silently swallowed. */
  submitError?: string | null;
  /** Present when launched by protegey-partner-web with a `returnUrl` — where to send the user
   * back once they're done here. */
  returnUrl?: string | null;
  onReturnToPartner?: () => void;
  /** Launched from a mobile SDK's in-app webview (no returnUrl) — the one thing the user needs to
   * do here is close this view and go back to the host app, so this becomes the primary action. */
  onClose?: () => void;
}

function pct(value: number): string {
  return `${Math.round(value)}%`;
}

export function ResultScreen({ enrollment, onRestart, submitting, submitError, returnUrl, onReturnToPartner, onClose }: Props) {
  const decision = enrollment?.decision;
  // decision.passed alone can't tell SUCCESS and MANUAL apart — both pass FaceTec's hard checks
  // (liveness, clean ID scan); MANUAL just means the match confidence is below the auto-approve
  // threshold and a human needs to review it. Showing a flat "Identité vérifiée" for a MANUAL
  // outcome would be misleading — the user isn't actually approved yet.
  const outcome = decision?.outcome;
  const tone = outcome === 'SUCCESS' ? 'success' : outcome === 'MANUAL' ? 'accent' : 'danger';

  // Only when launched from a mobile SDK's webview (no returnUrl), and only once submission has
  // actually finished successfully — auto-closing mid-submit, or over a failed save, would hide a
  // problem the user still needs to see and react to (Réessayer).
  const shouldAutoClose = !returnUrl && Boolean(onClose) && !submitting && !submitError && Boolean(enrollment);
  const [secondsLeft, setSecondsLeft] = useState(AUTO_CLOSE_SECONDS);

  useEffect(() => {
    if (!shouldAutoClose) return;
    if (secondsLeft <= 0) {
      onClose?.();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [shouldAutoClose, secondsLeft, onClose]);

  if (submitting || (!enrollment && !submitError)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-border border-t-accent" />
          <p className="text-sm text-muted">Enregistrement du résultat…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div
        className={`pointer-events-none absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full blur-[120px] ${
          outcome === 'SUCCESS' ? 'bg-success/10' : outcome === 'MANUAL' ? 'bg-accent/10' : 'bg-danger/10'
        }`}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-sm">
        <div className="mb-6 text-center">
          <ScanFrame active={false} tone={enrollment ? tone : 'danger'}>
            <span className={`text-4xl ${outcome === 'SUCCESS' ? 'text-success' : outcome === 'MANUAL' ? 'text-accent' : 'text-danger'}`} aria-hidden="true">
              {!enrollment ? '!' : outcome === 'SUCCESS' ? '✓' : outcome === 'MANUAL' ? '⏳' : '✕'}
            </span>
          </ScanFrame>
          <h1 className="mt-5 font-display text-2xl font-bold text-ink">
            {!enrollment
              ? 'Résultat indisponible'
              : outcome === 'SUCCESS'
                ? 'Identité vérifiée'
                : outcome === 'MANUAL'
                  ? 'Vérification en cours de revue'
                  : 'Vérification échouée'}
          </h1>
          {outcome === 'MANUAL' && (
            <p className="mt-1.5 text-sm text-muted">Votre identité a été capturée avec succès et sera examinée manuellement.</p>
          )}
          {enrollment && <p className="mt-1.5 font-mono text-xs text-muted">{enrollment.id}</p>}
        </div>

        {enrollment && decision && (
          <div className="mt-4 rounded-2xl border border-border bg-surface p-5">
            <p className="mb-3 font-display text-sm font-semibold text-ink">Scores</p>
            <ScoreRow label="Vivacité" value={enrollment.livenessScore ?? 0} />
            {decision.confidenceScore !== null && <ScoreRow label="Confiance" value={decision.confidenceScore * 100} />}
            {enrollment.faceMatchScore !== null && <ScoreRow label="Correspondance" value={enrollment.faceMatchScore} />}

            {decision.riskFactors && (
              <>
                <div className="my-4 h-px bg-border" />
                <p className="mb-3 font-display text-sm font-semibold text-ink">Facteurs de risque</p>
                <RiskRows riskFactors={decision.riskFactors} />
              </>
            )}
          </div>
        )}

        {enrollment && (enrollment.documentType || enrollment.country) && (
          <div className="mt-4 rounded-2xl border border-border bg-surface p-5">
            <p className="mb-3 font-display text-sm font-semibold text-ink">Document</p>
            <div className="space-y-2 text-sm">
              {enrollment.fullName && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted">Nom</span>
                  <span className="truncate text-ink">{enrollment.fullName}</span>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <span className="text-muted">Type</span>
                <span className="text-ink">{enrollment.documentType ?? '—'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted">Pays</span>
                <span className="text-ink">{enrollment.country ?? '—'}</span>
              </div>
            </div>
          </div>
        )}

        {submitError && <StatusBanner tone="danger">Le résultat n'a pas pu être enregistré ({submitError}). Réessayez ou contactez le support.</StatusBanner>}
        {!submitError && enrollment && returnUrl && <StatusBanner tone="success">Résultat enregistré avec succès.</StatusBanner>}

        <div className="mt-6 flex flex-col gap-2.5">
          {returnUrl && onReturnToPartner && (
            <button
              onClick={onReturnToPartner}
              className="w-full cursor-pointer rounded-xl bg-accent py-3.5 font-display font-semibold text-bg transition-opacity hover:opacity-90"
            >
              Retour au portail
            </button>
          )}
          {!returnUrl && onClose && (
            <button
              onClick={onClose}
              className="w-full cursor-pointer rounded-xl bg-accent py-3.5 font-display font-semibold text-bg transition-opacity hover:opacity-90"
            >
              {shouldAutoClose ? `Fermer (${secondsLeft}s)` : 'Fermer'}
            </button>
          )}
          <button
            onClick={onRestart}
            className={`w-full cursor-pointer rounded-xl py-3.5 font-display font-semibold transition-colors ${
              returnUrl || onClose
                ? 'border border-border bg-surface text-ink hover:border-muted'
                : 'bg-accent text-bg hover:opacity-90'
            }`}
          >
            Recommencer
          </button>
        </div>
      </div>
    </div>
  );
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="mb-2.5 flex items-center gap-3 text-sm last:mb-0">
      <span className="w-28 flex-shrink-0 text-muted">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent" style={{ width: pct(value) }} />
      </div>
      <span className="w-12 flex-shrink-0 text-right font-mono text-ink">{pct(value)}</span>
    </div>
  );
}

const RISK_LABELS: Record<string, string> = {
  rootedDevice: 'Appareil rooté',
  emulator: 'Émulateur détecté',
  platform: 'Plateforme',
  deviceModel: 'Appareil',
  matchLevel: 'Niveau de correspondance',
};

/** Renders whatever risk factors the backend computed — a fixed allowlist, not every raw key, so
 * an internal-only field (e.g. idScanStatusEnum) never leaks onto the screen unexplained. */
function RiskRows({ riskFactors }: { riskFactors: Record<string, unknown> }) {
  const rows = Object.entries(RISK_LABELS).filter(([key]) => riskFactors[key] !== undefined && riskFactors[key] !== null);
  if (rows.length === 0) return null;
  return (
    <>
      {rows.map(([key, label]) => (
        <RiskRow key={key} label={label} bad={riskFactors[key] === true} value={typeof riskFactors[key] === 'boolean' ? undefined : String(riskFactors[key])} />
      ))}
    </>
  );
}

function RiskRow({ label, bad, value }: { label: string; bad: boolean; value?: string }) {
  return (
    <div className="mb-2 flex items-center justify-between text-sm last:mb-0">
      <span className="text-muted">{label}</span>
      <span className={`font-mono ${bad ? 'text-danger' : 'text-ink'}`}>{value ?? (bad ? 'Oui' : 'Non')}</span>
    </div>
  );
}

function StatusBanner({ tone, children }: { tone: 'accent' | 'success' | 'danger'; children: React.ReactNode }) {
  const toneClass = {
    accent: 'border-accent/30 bg-accent-dim text-accent',
    success: 'border-success/30 bg-success-dim text-success',
    danger: 'border-danger/30 bg-danger-dim text-danger',
  }[tone];
  return <div className={`mt-4 rounded-lg border px-3 py-2.5 text-sm ${toneClass}`}>{children}</div>;
}
