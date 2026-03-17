/**
 * ParQFormView — Standalone page for PAR-Q+ questionnaire
 *
 * Route: /flux/parq/:athleteId
 * Business rule: PAR-Q must be filled ONLY by the athlete (via athlete portal).
 * This view now blocks coach access and shows an informational message.
 */

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function ParQFormView() {
  const navigate = useNavigate();
  const { athleteId } = useParams<{ athleteId: string }>();

  // Business rule: Coach should NEVER fill PAR-Q — only the athlete via their portal
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-ceramic-base px-6">
      <div className="ceramic-card p-8 max-w-md text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-ceramic-warning/10 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8 text-ceramic-warning" />
        </div>
        <h1 className="text-xl font-black text-ceramic-text-primary">
          Preenchimento pelo Atleta
        </h1>
        <p className="text-sm text-ceramic-text-secondary leading-relaxed">
          O questionario PAR-Q+ deve ser preenchido exclusivamente pelo atleta
          atraves do portal do atleta (<strong>/meu-treino</strong>).
          O coach pode acompanhar o status e revisar documentos na página do atleta.
        </p>
        <button
          onClick={() => navigate(athleteId ? `/flux/athlete/${athleteId}` : '/flux')}
          className="flex items-center gap-2 mx-auto px-6 py-3 ceramic-card text-sm font-bold text-ceramic-text-primary hover:scale-105 transition-transform"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
      </div>
    </div>
  );
}
