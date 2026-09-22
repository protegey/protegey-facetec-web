interface Props {
  onStart: () => void;
  onContinueWithDidit?: () => void;
}

export function WelcomeScreen({ onStart, onContinueWithDidit }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        {/* Logo */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-indigo-600 text-white text-4xl mb-4 shadow-lg">
            <span role="img" aria-label="shield">&#x1F6E1;</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Protegey</h1>
          <p className="text-slate-500 mt-1 text-sm">Identity Verification</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-2">
            Verify your identity
          </h2>
          <p className="text-slate-500 text-sm mb-8">
            Complete biometric verification to activate your account. Choose your preferred method below.
          </p>

          {/* Verification methods */}
          <div className="space-y-3 mb-8">
            <button
              onClick={onStart}
              className="w-full p-4 bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-200 hover:border-indigo-400 rounded-xl text-left transition-all cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xl">
                  &#x1F4CF;
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Scan Document</p>
                  <p className="text-sm text-slate-500">CNI ou Passport — FaceTec ID Scan</p>
                </div>
              </div>
            </button>

            {onContinueWithDidit && (
              <button
                onClick={onContinueWithDidit}
                className="w-full p-4 bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 hover:border-slate-400 rounded-xl text-left transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-600 text-white flex items-center justify-center text-xl">
                    &#x1F9D1;
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Standard KYC</p>
                    <p className="text-sm text-slate-500">Document verification — Didit</p>
                  </div>
                </div>
              </button>
            )}
          </div>

          {/* Steps preview */}
          <div className="border-t border-slate-100 pt-6">
            <p className="text-xs text-slate-400 mb-4 font-medium uppercase tracking-wider">
              How it works
            </p>
            <div className="space-y-3 text-left">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold mt-0.5">
                  1
                </div>
                <p className="text-sm text-slate-600">Scan your document (CNI ou Passport)</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold mt-0.5">
                  2
                </div>
                <p className="text-sm text-slate-600">Complete the 3D face scan</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold mt-0.5">
                  3
                </div>
                <p className="text-sm text-slate-600">Get verified instantly</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-400">Secured by FaceTec</span>
          </div>
        </div>
      </div>
    </div>
  );
}
