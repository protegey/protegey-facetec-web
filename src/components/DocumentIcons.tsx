/** Hand-drawn line icons, no icon library dependency — stroke uses currentColor so each icon
 * inherits whatever text color its container sets (muted when idle, accent when selected/active). */

export function IdCardIcon({ className = 'h-8 w-11' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className={className}>
      <rect x="1.2" y="1.2" width="45.6" height="29.6" rx="4" />
      <circle cx="13" cy="16" r="5.2" />
      <line x1="23.5" y1="10.5" x2="41" y2="10.5" />
      <line x1="23.5" y1="16" x2="41" y2="16" />
      <line x1="23.5" y1="21.5" x2="34" y2="21.5" />
    </svg>
  );
}

export function PassportIcon({ className = 'h-11 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 44" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className={className}>
      <rect x="1.2" y="1.2" width="29.6" height="41.6" rx="3" />
      <circle cx="16" cy="17" r="6.5" />
      <path d="M16 11v12M10 17h12" />
      <line x1="8" y1="31" x2="24" y2="31" />
      <line x1="8" y1="35.5" x2="24" y2="35.5" />
    </svg>
  );
}

export function FaceScanIcon({ className = 'h-11 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 40" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className={className}>
      <ellipse cx="16" cy="20" rx="12.5" ry="17.5" />
      <circle cx="10.8" cy="17" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="21.2" cy="17" r="1.3" fill="currentColor" stroke="none" />
      <path d="M11 25.5c1.8 1.6 8.2 1.6 10 0" />
    </svg>
  );
}
