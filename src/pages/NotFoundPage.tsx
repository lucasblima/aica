import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-ceramic-base px-6">
      <div className="ceramic-card p-10 text-center max-w-md">
        <p className="text-6xl font-black text-ceramic-text-primary mb-2">404</p>
        <p className="text-lg font-medium text-ceramic-text-secondary mb-6">
          Pagina nao encontrada
        </p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao inicio
        </button>
      </div>
    </div>
  );
}
