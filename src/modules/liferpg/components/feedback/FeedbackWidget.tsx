/**
 * FeedbackWidget — Non-intrusive floating widget (bottom-right).
 * Shows 1 question at a time with entity avatar.
 * Response types: free text, yes/no, multiple choice.
 * Skip/answer later options. Max 2 questions/day.
 */

import React, { useState } from 'react';
import { useFeedbackQueue } from '../../hooks/useFeedbackQueue';
import { ENTITY_EMOJI, type EntityType } from '../../types/liferpg';

export const FeedbackWidget: React.FC = () => {
  const {
    currentQuestion,
    loading,
    dailyLimitReached,
    answerQuestion,
    skipQuestion,
  } = useFeedbackQueue();

  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [minimized, setMinimized] = useState(false);

  if (loading || !currentQuestion || dailyLimitReached) {
    return null;
  }

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-amber-500 text-white shadow-lg flex items-center justify-center text-lg hover:bg-amber-600 transition-colors"
        title="Pergunta pendente"
      >
        ?
      </button>
    );
  }

  const persona = currentQuestion.entity_personas;
  const emoji = persona?.avatar_emoji || ENTITY_EMOJI[persona?.entity_type || 'habitat'];
  const name = persona?.persona_name || 'Entidade';

  const isYesNo = currentQuestion.question_type === 'state_verification' ||
    currentQuestion.question_type === 'decision';

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    setSubmitting(true);
    await answerQuestion(currentQuestion.id, answer);
    setAnswer('');
    setSubmitting(false);
  };

  const handleYesNo = async (value: string) => {
    setSubmitting(true);
    await answerQuestion(currentQuestion.id, value);
    setSubmitting(false);
  };

  const handleSkip = async () => {
    await skipQuestion(currentQuestion.id);
  };

  return (
    <div className="fixed bottom-20 right-4 z-40 w-80 bg-ceramic-base rounded-2xl shadow-2xl border border-ceramic-border overflow-hidden animate-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-ceramic-cool border-b border-ceramic-border">
        <span className="text-lg">{emoji}</span>
        <span className="text-xs font-semibold text-ceramic-text-primary flex-1">{name}</span>
        <button
          onClick={() => setMinimized(true)}
          className="text-ceramic-text-secondary hover:text-ceramic-text-primary text-xs"
        >
          Minimizar
        </button>
      </div>

      {/* Question */}
      <div className="p-4">
        <p className="text-sm text-ceramic-text-primary mb-3">{currentQuestion.question}</p>

        {/* Response area */}
        {isYesNo ? (
          <div className="flex gap-2">
            <button
              onClick={() => handleYesNo('Sim')}
              disabled={submitting}
              className="flex-1 text-sm py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              Sim
            </button>
            <button
              onClick={() => handleYesNo('Não')}
              disabled={submitting}
              className="flex-1 text-sm py-2 rounded-lg bg-ceramic-cool text-ceramic-text-primary hover:bg-ceramic-border transition-colors disabled:opacity-50"
            >
              Não
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Sua resposta..."
              className="w-full text-sm py-2 px-3 rounded-lg bg-ceramic-cool border border-ceramic-border focus:outline-none focus:border-amber-400"
              disabled={submitting}
            />
            <button
              onClick={handleSubmit}
              disabled={submitting || !answer.trim()}
              className="w-full text-sm py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Enviando...' : 'Responder'}
            </button>
          </div>
        )}

        {/* Skip */}
        <button
          onClick={handleSkip}
          className="w-full mt-2 text-[10px] text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
        >
          Pular esta pergunta
        </button>
      </div>
    </div>
  );
};
