const LOGO_URL = 'https://protegey-bucket.s3.eu-north-1.amazonaws.com/public/constant/protegey_logo.svg';

/** The wordmark is white, so it always needs a dark backdrop regardless of the active theme —
 * same convention as protegey-partner-web's Logo.tsx. */
export function ProtegeyLogo({ className = 'h-4' }: { className?: string }) {
  return (
    <div className="inline-flex items-center rounded-md bg-[#0B1741] px-3 py-2">
      <img src={LOGO_URL} alt="Protegey" className={`w-auto ${className}`} />
    </div>
  );
}
