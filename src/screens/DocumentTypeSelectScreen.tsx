import { useState } from 'react';
import type { DocumentType } from '../types/facetec';

interface Props {
  onSelect: (type: DocumentType) => void;
  onBack: () => void;
}

export function DocumentTypeSelectScreen({ onSelect, onBack }: Props) {
  const [selected, setSelected] = useState<DocumentType | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="mb-6">
          <button
            onClick={onBack}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium mb-3 cursor-pointer"
          >
            &larr; Back
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Type de document</h1>
          <p className="text-slate-500 mt-1">
            Sélectionnez le type de document à scanner
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
          <div className="space-y-3 mb-6">
            <button
              onClick={() => setSelected('cni')}
              className={`w-full p-4 rounded-xl border-2 transition-all cursor-pointer ${
                selected === 'cni'
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-200 hover:border-indigo-300'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                  selected === 'cni' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  🪪
                </div>
                <div>
                  <p className="font-semibold text-slate-800">CNI (Carte Nationale d'Identité)</p>
                  <p className="text-sm text-slate-500">Scan du document d'identité national</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setSelected('passport')}
              className={`w-full p-4 rounded-xl border-2 transition-all cursor-pointer ${
                selected === 'passport'
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-200 hover:border-indigo-300'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                  selected === 'passport' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  🛂
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Passport</p>
                  <p className="text-sm text-slate-500">Scan du passeport international</p>
                </div>
              </div>
            </button>
          </div>

          <button
            onClick={() => selected && onSelect(selected)}
            disabled={!selected}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-lg cursor-pointer"
          >
            Continuer
          </button>
        </div>
      </div>
    </div>
  );
}
