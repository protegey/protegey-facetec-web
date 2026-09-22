import { useEffect, useRef, useState } from 'react';

interface FaceTecSDKLoaderProps {
  onSDKLoaded: () => void;
  onError: (error: string) => void;
}

export function FaceTecSDKLoader({ onSDKLoaded, onError }: FaceTecSDKLoaderProps) {
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Load FaceTec Browser SDK from core-sdk
    const sdkScript = document.createElement('script');
    sdkScript.src = '/core-sdk/main.js';
    sdkScript.async = true;
    sdkScript.onload = () => {
      setLoading(false);
      onSDKLoaded();
    };
    sdkScript.onerror = () => {
      setLoading(false);
      onError('FaceTec SDK failed to load');
    };
    document.body.appendChild(sdkScript);

    return () => {
      document.body.removeChild(sdkScript);
    };
  }, [onSDKLoaded, onError]);

  if (loading) {
    return (
      <div className="facetec-loading">
        <div>
          <div className="facetec-loading-spinner" />
          <p>Loading FaceTec...</p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="facetec-overlay" />;
}
