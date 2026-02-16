/**
 * ParQFormView — Standalone page for PAR-Q+ questionnaire
 *
 * Route: /flux/parq/:athleteId
 * Used by coaches to fill PAR-Q on behalf of athletes.
 */

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useParQ } from '../hooks/useParQ';
import { ParQWizard } from '../components/parq/ParQWizard';
import { useAthletes } from '../hooks/useAthletes';

export default function ParQFormView() {
  const navigate = useNavigate();
  const { athleteId } = useParams<{ athleteId: string }>();

  const { athletes, isLoading: athletesLoading } = useAthletes();
  const athlete = athletes.find((a) => a.id === athleteId);

  const parq = useParQ({
    athleteId: athleteId || '',
    filledByRole: 'coach',
  });

  if (athletesLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-ceramic-base">
        <div className="w-8 h-8 border-2 border-ceramic-info border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-ceramic-text-secondary font-medium">Carregando...</p>
      </div>
    );
  }

  if (!athleteId || !athlete) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-ceramic-base">
        <p className="text-lg font-bold text-ceramic-text-primary mb-2">Atleta nao encontrado</p>
        <button
          onClick={() => navigate('/flux')}
          className="px-6 py-3 rounded-[16px] text-sm font-bold text-ceramic-text-primary transition-transform hover:scale-105"
          style={{
            background: '#F0EFE9',
            boxShadow: '4px 4px 10px rgba(163,158,145,0.15), -4px -4px 10px rgba(255,255,255,0.9)',
          }}
        >
          Voltar ao Dashboard
        </button>
      </div>
    );
  }

  return (
    <ParQWizard
      athleteName={athlete.name}
      athleteId={athlete.id}
      step={parq.step}
      classicAnswers={parq.classicAnswers}
      followUpAnswers={parq.followUpAnswers}
      activeFollowUpCategories={parq.activeFollowUpCategories}
      calculatedRisk={parq.calculatedRisk}
      calculatedClearance={parq.calculatedClearance}
      restrictions={parq.restrictions}
      signatureText={parq.signatureText}
      isSubmitting={parq.isSubmitting}
      submitError={parq.submitError}
      setStep={parq.setStep}
      nextStep={parq.nextStep}
      prevStep={parq.prevStep}
      setClassicAnswer={parq.setClassicAnswer}
      setFollowUpAnswer={parq.setFollowUpAnswer}
      setSignatureText={parq.setSignatureText}
      submitParQ={parq.submitParQ}
      onComplete={() => navigate(`/flux/athlete/${athleteId}`)}
    />
  );
}
