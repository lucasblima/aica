/**
 * AthletePortalView — read-only training portal for athletes
 *
 * Route: /meu-treino
 * Shows the athlete's active microcycle, weekly plan, and allows
 * marking workouts as completed + leaving feedback.
 */

import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMyAthleteProfile } from '../hooks/useMyAthleteProfile';
import { AthleteWelcome } from '../components/AthleteWelcome';
import { supabase } from '@/services/supabaseClient';
import { MODALITY_CONFIG } from '../types';
import {
  Loader2,
  CheckCircle,
  Circle,
  MessageSquare,
  Dumbbell,
  ArrowLeft,
} from 'lucide-react';

const DAY_LABELS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

export default function AthletePortalView() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, isLoading, error, isLinked, refetch } = useMyAthleteProfile();
  const [feedbackSlotId, setFeedbackSlotId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  // Show welcome screen on first visit or when ?welcome=true is present
  const welcomeParam = searchParams.get('welcome') === 'true';
  const [showWelcome, setShowWelcome] = useState(
    () => welcomeParam || !AthleteWelcome.hasBeenShown()
  );

  // Toggle workout completion
  const toggleCompleted = async (slotId: string, currentlyCompleted: boolean) => {
    setUpdating(slotId);
    try {
      await supabase
        .from('workout_slots')
        .update({
          is_completed: !currentlyCompleted,
          completed_at: !currentlyCompleted ? new Date().toISOString() : null,
        })
        .eq('id', slotId);
      await refetch();
    } finally {
      setUpdating(null);
    }
  };

  // Submit feedback
  const submitFeedback = async (slotId: string) => {
    if (!feedbackText.trim()) return;
    setUpdating(slotId);
    try {
      await supabase
        .from('workout_slots')
        .update({ athlete_feedback: feedbackText.trim() })
        .eq('id', slotId);
      setFeedbackSlotId(null);
      setFeedbackText('');
      await refetch();
    } finally {
      setUpdating(null);
    }
  };

  // Loading
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-ceramic-base">
        <Loader2 className="w-8 h-8 text-ceramic-text-secondary animate-spin mb-4" />
        <p className="text-sm text-ceramic-text-secondary">Carregando seu treino...</p>
      </div>
    );
  }

  // Error or not linked
  if (error || !isLinked || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-ceramic-base px-6">
        <div className="ceramic-card p-8 max-w-sm text-center space-y-4">
          <Dumbbell className="w-12 h-12 text-ceramic-text-secondary mx-auto" />
          <h1 className="text-xl font-black text-ceramic-text-primary">Meu Treino</h1>
          <p className="text-sm text-ceramic-text-secondary">
            {error || 'Nenhum treino vinculado à sua conta. Peça ao seu coach para adicionar seu email no cadastro.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 mx-auto px-4 py-2 ceramic-card text-sm font-bold text-ceramic-text-primary hover:scale-105 transition-transform"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // Athlete welcome onboarding screen
  if (showWelcome) {
    return (
      <AthleteWelcome
        profile={profile}
        onStartTraining={() => {
          setShowWelcome(false);
          // Remove ?welcome=true from URL without triggering navigation
          if (welcomeParam) {
            searchParams.delete('welcome');
            setSearchParams(searchParams, { replace: true });
          }
        }}
        onExplore={() => {
          setShowWelcome(false);
          navigate('/');
        }}
      />
    );
  }

  const micro = profile.active_microcycle;
  const modalityConfig = MODALITY_CONFIG[profile.modality];
  const completionPct = micro
    ? Math.round((micro.completed_slots / Math.max(micro.total_slots, 1)) * 100)
    : 0;

  // Group slots by week
  const slotsByWeek: Record<number, typeof micro extends null ? never : NonNullable<typeof micro>['slots']> = {};
  if (micro?.slots) {
    for (const slot of micro.slots) {
      if (!slotsByWeek[slot.week_number]) slotsByWeek[slot.week_number] = [];
      slotsByWeek[slot.week_number].push(slot);
    }
  }

  return (
    <div className="flex flex-col w-full min-h-screen bg-ceramic-base pb-16">
      {/* Header */}
      <div className="pt-8 px-6 pb-4">
        <button
          onClick={() => navigate('/')}
          className="mb-4 flex items-center gap-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
        >
          <div className="w-8 h-8 ceramic-inset flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider">Voltar</span>
        </button>

        {/* Profile Card */}
        <div className="ceramic-card p-5 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{modalityConfig?.icon || '🏋️'}</span>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-ceramic-text-primary truncate">
                {profile.athlete_name}
              </h1>
              <p className="text-xs text-ceramic-text-secondary">
                Treinado por {profile.coach_name} · {modalityConfig?.label || profile.modality}
              </p>
            </div>
          </div>

          {/* Microcycle Progress */}
          {micro && (
            <div className="space-y-2 pt-3 border-t border-ceramic-text-secondary/10">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-ceramic-text-primary">
                  {micro.name}
                </p>
                <span className="text-xs text-ceramic-text-secondary">
                  Semana {micro.current_week}/3
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-2 bg-ceramic-cool rounded-full overflow-hidden">
                <div
                  className="h-full bg-ceramic-success rounded-full transition-all duration-500"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
              <p className="text-xs text-ceramic-text-secondary text-right">
                {micro.completed_slots}/{micro.total_slots} treinos · {completionPct}%
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Workout Slots */}
      {micro ? (
        <div className="px-6 space-y-6">
          {Object.entries(slotsByWeek)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([weekNum, slots]) => (
              <div key={weekNum}>
                <h2 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-3">
                  Semana {weekNum}
                </h2>
                <div className="space-y-2">
                  {slots.map((slot) => (
                    <div
                      key={slot.id}
                      className={`ceramic-card p-4 transition-all ${
                        slot.is_completed ? 'opacity-70' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Toggle button */}
                        <button
                          onClick={() => toggleCompleted(slot.id, slot.is_completed)}
                          disabled={updating === slot.id}
                          className="flex-shrink-0"
                        >
                          {updating === slot.id ? (
                            <Loader2 className="w-5 h-5 text-ceramic-text-secondary animate-spin" />
                          ) : slot.is_completed ? (
                            <CheckCircle className="w-5 h-5 text-ceramic-success" />
                          ) : (
                            <Circle className="w-5 h-5 text-ceramic-text-secondary" />
                          )}
                        </button>

                        {/* Day label */}
                        <span className="text-xs font-bold text-ceramic-text-secondary w-8">
                          {DAY_LABELS[slot.day_of_week] || '—'}
                        </span>

                        {/* Workout info */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold truncate ${
                            slot.is_completed
                              ? 'text-ceramic-text-secondary line-through'
                              : 'text-ceramic-text-primary'
                          }`}>
                            {slot.template.name}
                          </p>
                          {slot.custom_notes && (
                            <p className="text-xs text-ceramic-text-secondary truncate">
                              {slot.custom_notes}
                            </p>
                          )}
                        </div>

                        {/* Duration */}
                        <span className="text-xs text-ceramic-text-secondary flex-shrink-0">
                          {slot.custom_duration || slot.template.duration}min
                        </span>

                        {/* Feedback toggle */}
                        <button
                          onClick={() => {
                            if (feedbackSlotId === slot.id) {
                              setFeedbackSlotId(null);
                            } else {
                              setFeedbackSlotId(slot.id);
                              setFeedbackText(slot.athlete_feedback || '');
                            }
                          }}
                          className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                            slot.athlete_feedback
                              ? 'text-ceramic-info bg-ceramic-info/10'
                              : 'text-ceramic-text-secondary hover:bg-ceramic-cool'
                          }`}
                          title="Feedback"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Feedback input (expanded) */}
                      {feedbackSlotId === slot.id && (
                        <div className="mt-3 pt-3 border-t border-ceramic-text-secondary/10 space-y-2">
                          <textarea
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder="Como foi o treino? Sensações, dificuldades..."
                            className="w-full ceramic-inset px-3 py-2 rounded-lg text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50 resize-none"
                            rows={2}
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setFeedbackSlotId(null)}
                              className="px-3 py-1.5 text-xs text-ceramic-text-secondary hover:bg-ceramic-cool rounded-lg transition-colors"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => submitFeedback(slot.id)}
                              disabled={!feedbackText.trim() || updating === slot.id}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-ceramic-accent hover:bg-ceramic-accent/90 disabled:bg-ceramic-text-secondary/20 disabled:cursor-not-allowed rounded-lg transition-colors"
                            >
                              {updating === slot.id ? 'Salvando...' : 'Salvar'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="px-6">
          <div className="ceramic-inset p-8 text-center">
            <p className="text-sm text-ceramic-text-secondary">
              Nenhum microciclo ativo no momento. Seu coach irá prescrever em breve.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
