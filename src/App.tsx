import { useState } from 'react'
import { WelcomeScreen } from './screens/WelcomeScreen'
import { LivenessScreen } from './screens/LivenessScreen'
import { EnrollmentScreen } from './screens/EnrollmentScreen'
import { ResultScreen } from './screens/ResultScreen'
import { FaceTecSDKLoader } from './components/FaceTecSDKLoader'
import type { VerificationStep, FaceTecVerificationResult } from './types/facetec'

export function App() {
  const [screen, setScreen] = useState<VerificationStep>('welcome')
  const [result, setResult] = useState<FaceTecVerificationResult | null>(null)
  const [sdkLoaded, setSdkLoaded] = useState(false)

  const handleLivenessComplete = (r: FaceTecVerificationResult) => {
    setResult(r)
    setScreen('result')
  }

  const handleEnrollmentComplete = (r: FaceTecVerificationResult) => {
    setResult(r)
    setScreen('result')
  }

  const handleError = (_error: string) => {
    console.error('FaceTec Error:', _error)
  }

  const handleRestart = () => {
    setResult(null)
    setScreen('welcome')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {!sdkLoaded && screen === 'welcome' && (
        <FaceTecSDKLoader onSDKLoaded={() => setSdkLoaded(true)} onError={handleError} />
      )}

      {screen === 'welcome' && (
        <WelcomeScreen
          onStart={() => setScreen('liveness')}
          onContinueWithDidit={() => window.location.href = '/kyc'}
        />
      )}

      {screen === 'liveness' && (
        <LivenessScreen
          onComplete={handleLivenessComplete}
          onBack={() => setScreen('welcome')}
          onError={handleError}
        />
      )}

      {screen === 'enrollment' && (
        <EnrollmentScreen
          onComplete={handleEnrollmentComplete}
          onBack={() => setScreen('welcome')}
          onError={handleError}
        />
      )}

      {screen === 'result' && result && (
        <ResultScreen result={result} onRestart={handleRestart} />
      )}
    </div>
  )
}
