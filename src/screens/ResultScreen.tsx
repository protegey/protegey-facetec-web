import { ScanFrame } from '../components/ScanFrame';
import type { FaceTecVerificationResult } from '../types/facetec';

interface Props {
  result: FaceTecVerificationResult;
  matchResult?: Record<string, unknown> | null;
  matchError?: string | null;
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
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function ResultScreen({ result, matchResult, matchError, onRestart, submitting, submitError, returnUrl, onReturnToPartner }: Props) {
  const { passed, confidenceScore, livenessScore, riskFactors, deviceInfo, sessionId } = result;
  const matchLevel = matchResult ? Number(matchResult.matchLevel ?? 0) : undefined;
  const docData = matchResult && matchResult.documentData ? (matchResult.documentData as Record<string, unknown>) : null;
  const tone = passed ? 'success' : 'danger';

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div
        className={`pointer-events-none absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full blur-[120px] ${
          passed ? 'bg-success/10' : 'bg-danger/10'
        }`}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-sm">
        <div className="mb-6 text-center">
          <ScanFrame active={false} tone={tone}>
            <span className={`text-4xl ${passed ? 'text-success' : 'text-danger'}`} aria-hidden="true">
              {passed ? '✓' : '✕'}
            </span>
          </ScanFrame>
          <h1 className="mt-5 font-display text-2xl font-bold text-ink">
            {passed ? 'Identité vérifiée' : 'Vérification échouée'}
          </h1>
          <p className="mt-1.5 font-mono text-xs text-muted">{sessionId}</p>
        </div>

        <div className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-warn/30 bg-warn-dim px-3 py-2 text-xs text-warn">
          Mode test FaceTec — résultats issus de l'API de test, en attendant l'accès au Server SDK de production
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-surface p-5">
          <p className="mb-3 font-display text-sm font-semibold text-ink">Scores</p>
          <ScoreRow label="Vivacité" value={livenessScore} />
          <ScoreRow label="Confiance" value={confidenceScore} />
          {matchLevel !== undefined && <ScoreRow label="Correspondance" value={Math.min(1, matchLevel / 100)} raw={`${matchLevel}`} />}

          <div className="my-4 h-px bg-border" />

          <p className="mb-3 font-display text-sm font-semibold text-ink">Facteurs de risque</p>
          <RiskRow label="Appareil rooté" bad={riskFactors.rootedDevice} />
          <RiskRow label="Émulateur détecté" bad={riskFactors.emulator} />
          <RiskRow label="Tentatives de spoofing" bad={riskFactors.spoofAttempts > 0} value={String(riskFactors.spoofAttempts)} />
          {deviceInfo?.model && <RiskRow label="Appareil" bad={false} value={deviceInfo.model} />}
        </div>

        {matchResult && docData && (
          <div className="mt-4 rounded-2xl border border-border bg-surface p-5">
            <p className="mb-3 font-display text-sm font-semibold text-ink">Document</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted">Nom</span>
                <span className="truncate text-ink">{String(docData.fullName ?? '—')}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted">Numéro</span>
                <span className="truncate font-mono text-ink">{String(docData.documentNumber ?? '—')}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted">Type</span>
                <span className="text-ink">{String(docData.documentType ?? '—')}</span>
              </div>
            </div>
          </div>
        )}

        {matchError && <StatusBanner tone="danger">Correspondance document : {matchError}</StatusBanner>}
        {submitting && <StatusBanner tone="accent">Enregistrement du résultat…</StatusBanner>}
        {submitError && <StatusBanner tone="danger">Le résultat n'a pas pu être enregistré ({submitError}). Réessayez ou contactez le support.</StatusBanner>}
        {!submitting && !submitError && returnUrl && <StatusBanner tone="success">Résultat enregistré avec succès.</StatusBanner>}

        <div className="mt-6 flex flex-col gap-2.5">
          {returnUrl && onReturnToPartner && (
            <button
              onClick={onReturnToPartner}
              className="w-full cursor-pointer rounded-xl bg-accent py-3.5 font-display font-semibold text-bg transition-opacity hover:opacity-90"
            >
              Retour au portail
            </button>
          )}
          <button
            onClick={onRestart}
            className={`w-full cursor-pointer rounded-xl py-3.5 font-display font-semibold transition-colors ${
              returnUrl
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

function ScoreRow({ label, value, raw }: { label: string; value: number; raw?: string }) {
  return (
    <div className="mb-2.5 flex items-center gap-3 text-sm last:mb-0">
      <span className="w-28 flex-shrink-0 text-muted">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent" style={{ width: pct(value) }} />
      </div>
      <span className="w-12 flex-shrink-0 text-right font-mono text-ink">{raw ?? pct(value)}</span>
    </div>
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
