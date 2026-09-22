import { useState } from 'react'
import { WelcomeScreen } from './screens/WelcomeScreen'
import { DocumentTypeSelectScreen } from './screens/DocumentTypeSelectScreen'
import { IDScanScreen } from './screens/IDScanScreen'
import { LivenessScreen } from './screens/LivenessScreen'
import { ResultScreen } from './screens/ResultScreen'
import { FaceTecSDKLoader } from './components/FaceTecSDKLoader'
import { match3D2DUploadedIDPhoto } from './services/facetecProxy'
import type { VerificationStep, FaceTecVerificationResult, IDScanResult } from './types/facetec'

export function App() {
  const [screen, setScreen] = useState<VerificationStep>('welcome')
  const [result, setResult] = useState<FaceTecVerificationResult | null>(null)
  const [sdkLoaded, setSdkLoaded] = useState(false)
  const [idScanResult, setIDScanResult] = useState<IDScanResult | null>(null)
  const [matchResult, setMatchResult] = useState<Record<string, unknown> | null>(null)
  const [matchError, setMatchError] = useState<string | null>(null)

  const handleDocumentTypeSelect = (_type: string) => {
    setIDScanResult(null);
    setScreen('id-scan');
  };

  const handleIDScanComplete = (r: IDScanResult) => {
    setIDScanResult(r);
    setScreen('liveness');
  };

  const handleLivenessComplete = async (r: FaceTecVerificationResult) => {
    setResult(r);

    if (idScanResult) {
      try {
        const matchRes = await match3D2DUploadedIDPhoto(
          r.sessionId,
          idScanResult.documentData.photo ?? '',
          10,
        );
        if (matchRes.success && matchRes.data) {
          setMatchResult(matchRes.data as Record<string, unknown>);
        }
      } catch (err) {
        setMatchError(err instanceof Error ? err.message : 'Match failed');
      }
    }

    setScreen('result');
  };

  const handleError = (_error: string) => {
    console.error('FaceTec Error:', _error);
  };

  const handleRestart = () => {
    setResult(null);
    setIDScanResult(null);
    setMatchResult(null);
    setMatchError(null);
    setScreen('welcome');
  };

  const handleGoToDocumentSelect = () => {
    setScreen('document-type-select');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {!sdkLoaded && screen === 'welcome' && (
        <FaceTecSDKLoader onSDKLoaded={() => setSdkLoaded(true)} onError={handleError} />
      )}

      {screen === 'welcome' && (
        <WelcomeScreen
          onStart={handleGoToDocumentSelect}
          onContinueWithDidit={() => window.location.href = '/kyc'}
        />
      )}

      {screen === 'document-type-select' && (
        <DocumentTypeSelectScreen
          onSelect={handleDocumentTypeSelect}
          onBack={() => setScreen('welcome')}
        />
      )}

      {screen === 'id-scan' && (
        <IDScanScreen
          onIDScanComplete={handleIDScanComplete}
          onBack={handleGoToDocumentSelect}
          onError={handleError}
        />
      )}

      {screen === 'liveness' && (
        <LivenessScreen
          onComplete={handleLivenessComplete}
          onBack={() => setScreen('id-scan')}
          onError={handleError}
        />
      )}

      {screen === 'result' && result && (
        <ResultScreen result={result} matchResult={matchResult} matchError={matchError} onRestart={handleRestart} />
      )}
    </div>
  )
}
