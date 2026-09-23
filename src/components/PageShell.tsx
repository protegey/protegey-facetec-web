import type { ReactNode } from 'react';

interface PageShellProps {
  onBack?: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Renders the flow rail above the title — only the three real capture screens pass this. */
  rail?: ReactNode;
}

/** Shared frame for every screen in the flow: consistent spacing, one card surface, a quiet dark
 * ground instead of the generic light gradient-card look. */
export function PageShell({ onBack, title, description, children, rail }: PageShellProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-accent/10 blur-[120px]"
        aria-hidden="true"
      />
      <div className="relative w-full max-w-sm">
        {rail}
        <div className="mb-6">
          {onBack && (
            <button
              onClick={onBack}
              className="mb-4 cursor-pointer text-sm font-medium text-muted transition-colors hover:text-ink"
            >
              &larr; Retour
            </button>
          )}
          <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
          {description && <p className="mt-1.5 max-w-[42ch] text-[15px] leading-relaxed text-muted">{description}</p>}
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6">{children}</div>
      </div>
    </div>
  );
}
