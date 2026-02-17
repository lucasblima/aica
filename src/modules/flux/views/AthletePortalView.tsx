/**
 * AthletePortalView — read-only training portal for athletes
 *
 * Route: /meu-treino
 * Shows the athlete's active microcycle, weekly plan, and allows
 * marking workouts as completed + leaving feedback.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMyAthleteProfile } from '../hooks/useMyAthleteProfile';
import { useParQ } from '../hooks/useParQ';
import { useAthleteDocuments } from '../hooks/useAthleteDocuments';
import { AthleteWelcome } from '../components/AthleteWelcome';
import { ParQWizard } from '../components/parq/ParQWizard';
import { supabase } from '@/services/supabaseClient';
import { MODALITY_CONFIG } from '../types';
import { createNamespacedLogger } from '@/lib/logger';
import {
  Loader2,
  CheckCircle,
  Circle,
  MessageSquare,
  Dumbbell,
  ArrowLeft,
  Calendar,
} from 'lucide-react';

const log = createNamespacedLogger('AthletePortalView');

const DAY_LABELS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
const WEEKDAY_LABELS_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];

/** Extended slot fields returned by RPC but not yet in MyAthleteProfile type */
type SlotWithFeedback = {
  rpe?: number | null;
  completion_data?: {
    rpe_actual?: number;
    duration_actual?: number;
    notes?: string;
  } | null;
};

interface CoachBusyBlock {
  start: string; // ISO 8601
  end: string;   // ISO 8601
}

/** Compact weekly free/busy timeline for the coach */
function CoachAvailabilityCard({
  busyBlocks,
  isLoading,
  error,
  weekStart,
}: {
  busyBlocks: CoachBusyBlock[];
  isLoading: boolean;
  error: string | null;
  weekStart: Date;
}) {
  // Build 7 day columns (Mon-Sun), each with hour rows 6-22
  const HOURS_START = 6;
  const HOURS_END = 22;
  const TOTAL_HOURS = HOURS_END - HOURS_START;

  // Group busy blocks by day of week (0=Mon offset from weekStart)
  const blocksByDay = useMemo(() => {
    const days: CoachBusyBlock[][] = Array.from({ length: 7 }, () => []);
    for (const block of busyBlocks) {
      const blockDate = new Date(block.start);
      const dayOffset = Math.floor(
        (blockDate.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000)
      );
      if (dayOffset >= 0 && dayOffset < 7) {
        days[dayOffset].push(block);
      }
    }
    return days;
  }, [busyBlocks, weekStart]);

  if (isLoading) {
    return (
      <div className="ceramic-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-ceramic-text-secondary" />
          <h3 className="text-sm font-bold text-ceramic-text-primary">Disponibilidade do Coach</h3>
        </div>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 text-ceramic-text-secondary animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ceramic-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-ceramic-text-secondary" />
          <h3 className="text-sm font-bold text-ceramic-text-primary">Disponibilidade do Coach</h3>
        </div>
        <p className="text-xs text-ceramic-text-secondary">{error}</p>
      </div>
    );
  }

  return (
    <div className="ceramic-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-ceramic-text-secondary" />
        <h3 className="text-sm font-bold text-ceramic-text-primary">Disponibilidade do Coach</h3>
      </div>
      <p className="text-[10px] text-ceramic-text-secondary">
        Cinza = ocupado &middot; Branco = disponivel
      </p>

      {/* Weekly grid */}
      <div className="flex gap-1">
        {/* Hour labels column */}
        <div className="flex flex-col justify-between pt-5 pr-1" style={{ height: `${TOTAL_HOURS * 12 + 20}px` }}>
          {[HOURS_START, HOURS_START + 4, HOURS_START + 8, HOURS_START + 12, HOURS_END].map((h) => (
            <span key={h} className="text-[9px] text-ceramic-text-secondary leading-none">
              {h}h
            </span>
          ))}
        </div>

        {/* Day columns */}
        {WEEKDAY_LABELS_SHORT.map((label, dayIdx) => {
          const dayBlocks = blocksByDay[dayIdx] || [];
          return (
            <div key={dayIdx} className="flex-1 flex flex-col items-center">
              <span className="text-[10px] font-bold text-ceramic-text-secondary mb-1">{label}</span>
              <div
                className="w-full bg-white rounded relative border border-ceramic-border"
                style={{ height: `${TOTAL_HOURS * 12}px` }}
              >
                {dayBlocks.map((block, blockIdx) => {
                  const startDate = new Date(block.start);
                  const endDate = new Date(block.end);
                  const startHour = startDate.getHours() + startDate.getMinutes() / 60;
                  const endHour = endDate.getHours() + endDate.getMinutes() / 60;
                  const clampedStart = Math.max(startHour, HOURS_START);
                  const clampedEnd = Math.min(endHour, HOURS_END);
                  if (clampedEnd <= clampedStart) return null;

                  const topPct = ((clampedStart - HOURS_START) / TOTAL_HOURS) * 100;
                  const heightPct = ((clampedEnd - clampedStart) / TOTAL_HOURS) * 100;

                  return (
                    <div
                      key={blockIdx}
                      className="absolute left-0 right-0 bg-ceramic-text-secondary/20 rounded-sm"
                      style={{
                        top: `${topPct}%`,
                        height: `${heightPct}%`,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AthletePortalView() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, isLoading, error, isLinked, refetch } = useMyAthleteProfile();
  const [feedbackSlotId, setFeedbackSlotId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackRpe, setFeedbackRpe] = useState<number>(5);
  const [feedbackDuration, setFeedbackDuration] = useState<number>(0);
  const [updating, setUpdating] = useState<string | null>(null);

  // Coach availability state
  const [coachBusyBlocks, setCoachBusyBlocks] = useState<CoachBusyBlock[]>([]);
  const [coachAvailLoading, setCoachAvailLoading] = useState(false);
  const [coachAvailError, setCoachAvailError] = useState<string | null>(null);

  // Week boundaries for coach availability (Mon-Sun)
  const weekStart = useMemo(() => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const diff = day === 0 ? -6 : 1 - day; // offset to Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }, []);

  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 7);
    return end;
  }, [weekStart]);

  // Fetch coach availability when profile loads
  useEffect(() => {
    if (!profile?.athlete_id) return;

    let cancelled = false;

    const fetchCoachAvailability = async () => {
      setCoachAvailLoading(true);
      setCoachAvailError(null);

      try {
        // Get coach's user_id from athlete record (RLS allows athlete to read own record)
        const { data: athleteRow, error: athleteErr } = await supabase
          .from('athletes')
          .select('user_id')
          .eq('id', profile.athlete_id)
          .maybeSingle();

        if (athleteErr || !athleteRow?.user_id) {
          log.debug('Could not resolve coach user_id:', athleteErr);
          if (!cancelled) setCoachAvailError('Coach nao encontrado');
          return;
        }

        const { data: response, error: fnError } = await supabase.functions.invoke(
          'fetch-coach-availability',
          {
            body: {
              coachUserId: athleteRow.user_id,
              startDate: weekStart.toISOString(),
              endDate: weekEnd.toISOString(),
            },
          }
        );

        if (cancelled) return;

        if (fnError) {
          log.error('Error fetching coach availability:', fnError);
          setCoachAvailError('Erro ao buscar agenda do coach');
          return;
        }

        if (!response?.success) {
          // Not necessarily an error — coach may not have calendar connected
          log.debug('Coach availability not available:', response?.error);
          setCoachAvailError(response?.error || 'Agenda do coach indisponivel');
          return;
        }

        setCoachBusyBlocks(response.busySlots || []);
      } catch (err) {
        if (!cancelled) {
          log.error('Coach availability error:', err);
          setCoachAvailError('Erro ao carregar disponibilidade');
        }
      } finally {
        if (!cancelled) setCoachAvailLoading(false);
      }
    };

    fetchCoachAvailability();
    return () => { cancelled = true; };
  }, [profile?.athlete_id, weekStart, weekEnd]);

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

  // Submit feedback with RPE + duration
  const submitFeedback = async (slotId: string) => {
    if (!feedbackText.trim() && !feedbackRpe && !feedbackDuration) return;
    setUpdating(slotId);
    try {
      await supabase
        .from('workout_slots')
        .update({
          athlete_feedback: feedbackText.trim() || null,
          rpe: feedbackRpe,
          completion_data: {
            rpe_actual: feedbackRpe,
            duration_actual: feedbackDuration || null,
            notes: feedbackText.trim() || null,
          },
        })
        .eq('id', slotId);
      setFeedbackSlotId(null);
      setFeedbackText('');
      setFeedbackRpe(5);
      setFeedbackDuration(0);
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

  // PAR-Q gate: show wizard if PAR-Q onboarding is required but not completed
  const parqRequired = profile?.allow_parq_onboarding === true;
  const parqCleared = profile?.parq_clearance_status === 'cleared' ||
    profile?.parq_clearance_status === 'cleared_with_restrictions';

  const parq = useParQ({
    athleteId: profile?.athlete_id || '',
    filledByRole: 'athlete',
  });

  const docs = useAthleteDocuments({
    athleteId: profile?.athlete_id || '',
  });

  const [parqCompleted, setParqCompleted] = useState(false);

  if (profile && parqRequired && !parqCleared && !parqCompleted) {
    return (
      <ParQWizard
        athleteName={profile.athlete_name}
        athleteId={profile.athlete_id}
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
        onComplete={() => {
          setParqCompleted(true);
          refetch();
        }}
        onUploadDocument={(input) => docs.uploadDocument(input)}
        isUploading={docs.isUploading}
      />
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
                  {slots.map((baseSlot) => {
                    const slot = baseSlot as typeof baseSlot & SlotWithFeedback;
                    return (
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
                              setFeedbackRpe(slot.completion_data?.rpe_actual ?? slot.rpe ?? 5);
                              setFeedbackDuration(
                                slot.completion_data?.duration_actual ??
                                slot.custom_duration ?? slot.template.duration ?? 0
                              );
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
                        <div className="mt-3 pt-3 border-t border-ceramic-text-secondary/10 space-y-3">
                          {/* RPE Slider */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-xs font-bold text-ceramic-text-primary">
                                Esforço percebido (RPE)
                              </label>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                feedbackRpe <= 3
                                  ? 'bg-ceramic-success/20 text-ceramic-success'
                                  : feedbackRpe <= 6
                                    ? 'bg-amber-500/20 text-amber-600'
                                    : 'bg-ceramic-error/20 text-ceramic-error'
                              }`}>
                                {feedbackRpe}/10
                              </span>
                            </div>
                            <input
                              type="range"
                              min={1}
                              max={10}
                              step={1}
                              value={feedbackRpe}
                              onChange={(e) => setFeedbackRpe(Number(e.target.value))}
                              className="w-full h-2 rounded-full appearance-none cursor-pointer accent-amber-500"
                              style={{
                                background: `linear-gradient(to right, #22c55e 0%, #22c55e 22%, #f59e0b 44%, #f59e0b 55%, #ef4444 77%, #ef4444 100%)`,
                              }}
                            />
                            <div className="flex justify-between mt-0.5">
                              <span className="text-[10px] text-ceramic-text-secondary">Muito fácil</span>
                              <span className="text-[10px] text-ceramic-text-secondary">Moderado</span>
                              <span className="text-[10px] text-ceramic-text-secondary">Máximo esforço</span>
                            </div>
                          </div>

                          {/* Actual Duration */}
                          <div>
                            <label className="text-xs font-bold text-ceramic-text-primary mb-1 block">
                              Duração real
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                max={600}
                                value={feedbackDuration || ''}
                                onChange={(e) => setFeedbackDuration(Number(e.target.value))}
                                placeholder={String(slot.custom_duration || slot.template.duration || 0)}
                                className="w-20 ceramic-inset px-3 py-1.5 rounded-lg text-sm text-ceramic-text-primary text-center focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
                              />
                              <span className="text-xs text-ceramic-text-secondary">min</span>
                              {feedbackDuration > 0 && (slot.custom_duration || slot.template.duration) && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                  feedbackDuration > (slot.custom_duration || slot.template.duration)
                                    ? 'bg-ceramic-info/20 text-ceramic-info'
                                    : feedbackDuration < (slot.custom_duration || slot.template.duration)
                                      ? 'bg-ceramic-warning/20 text-ceramic-warning'
                                      : 'bg-ceramic-success/20 text-ceramic-success'
                                }`}>
                                  {feedbackDuration === (slot.custom_duration || slot.template.duration)
                                    ? 'No tempo'
                                    : feedbackDuration > (slot.custom_duration || slot.template.duration)
                                      ? `+${feedbackDuration - (slot.custom_duration || slot.template.duration)}min`
                                      : `${feedbackDuration - (slot.custom_duration || slot.template.duration)}min`
                                  }
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Notes */}
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
                              disabled={updating === slot.id}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-ceramic-accent hover:bg-ceramic-accent/90 disabled:bg-ceramic-text-secondary/20 disabled:cursor-not-allowed rounded-lg transition-colors"
                            >
                              {updating === slot.id ? 'Salvando...' : 'Salvar'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ); })}
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

      {/* Coach Availability */}
      <div className="px-6 mt-6">
        <CoachAvailabilityCard
          busyBlocks={coachBusyBlocks}
          isLoading={coachAvailLoading}
          error={coachAvailError}
          weekStart={weekStart}
        />
      </div>
    </div>
  );
}
