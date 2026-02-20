/**
 * AthletePortalView -- read-only training portal for athletes
 *
 * Route: /meu-treino
 * Shows the athlete's active microcycle with a weekly calendar layout,
 * workout cards with accordion expand, and coach availability.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import { useMyAthleteProfile } from '../hooks/useMyAthleteProfile';
import { useParQ } from '../hooks/useParQ';
import { useAthleteDocuments } from '../hooks/useAthleteDocuments';
import { useCanvasCalendar } from '../hooks/useCanvasCalendar';
import { WorkoutSlotService } from '../services/workoutSlotService';
import { AthleteWelcome } from '../components/AthleteWelcome';
import { ParQWizard } from '../components/parq/ParQWizard';
import { ProgressTimeline, WorkoutCard } from '../components/athlete';
import { WeeklyGrid, type WeekWorkout } from '../components/canvas/WeeklyGrid';
import type { FeedbackData } from '../components/athlete';
import { supabase } from '@/services/supabaseClient';
import { MODALITY_CONFIG } from '../types';
import { createNamespacedLogger } from '@/lib/logger';
import {
  Loader2,
  Dumbbell,
  ArrowLeft,
  Calendar,
  Clock,
  Leaf,
  LayoutGrid,
  List,
} from 'lucide-react';

const log = createNamespacedLogger('AthletePortalView');

const DAY_NAMES = ['', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'];
const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const WEEKDAY_LABELS_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];

interface CoachBusyBlock {
  start: string;
  end: string;
}

// ─── Coach Availability Card (kept inline) ─────────────────────────

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
  const HOURS_START = 6;
  const HOURS_END = 22;
  const TOTAL_HOURS = HOURS_END - HOURS_START;

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
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
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
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-ceramic-text-secondary" />
          <h3 className="text-sm font-bold text-ceramic-text-primary">Disponibilidade do Coach</h3>
        </div>
        <p className="text-xs text-ceramic-text-secondary">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-ceramic-text-secondary" />
        <h3 className="text-sm font-bold text-ceramic-text-primary">Disponibilidade do Coach</h3>
      </div>
      <p className="text-[10px] text-ceramic-text-secondary">
        Cinza = ocupado &middot; Branco = disponivel
      </p>

      <div className="flex gap-1">
        <div
          className="flex flex-col justify-between pt-5 pr-1"
          style={{ height: `${TOTAL_HOURS * 12 + 20}px` }}
        >
          {[HOURS_START, HOURS_START + 4, HOURS_START + 8, HOURS_START + 12, HOURS_END].map((h) => (
            <span key={h} className="text-[9px] text-ceramic-text-secondary leading-none">
              {h}h
            </span>
          ))}
        </div>

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
                      style={{ top: `${topPct}%`, height: `${heightPct}%` }}
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

// ─── Stagger animation variants ────────────────────────────────────

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.35, ease: [0.4, 0, 0.2, 1] },
  }),
};

// ─── Main View ─────────────────────────────────────────────────────

export default function AthletePortalView() {
  // ============ ALL HOOKS (unconditional) ============
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, isLoading, error, isLinked, refetch } = useMyAthleteProfile();

  // PAR-Q hooks (unconditional!)
  const parq = useParQ({ athleteId: profile?.athlete_id || '', filledByRole: 'athlete' });
  const docs = useAthleteDocuments({ athleteId: profile?.athlete_id || '' });
  const [parqCompleted, setParqCompleted] = useState(false);

  // UI state
  const [expandedSlotId, setExpandedSlotId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'canvas'>(() => {
    try { return (localStorage.getItem('flux_athlete_view_mode') as 'list' | 'canvas') || 'list'; }
    catch { return 'list'; }
  });

  // Welcome state
  const welcomeParam = searchParams.get('welcome') === 'true';
  const [showWelcome, setShowWelcome] = useState(
    () => welcomeParam || !AthleteWelcome.hasBeenShown()
  );

  // Coach availability state
  const [coachBusyBlocks, setCoachBusyBlocks] = useState<CoachBusyBlock[]>([]);
  const [coachAvailLoading, setCoachAvailLoading] = useState(false);
  const [coachAvailError, setCoachAvailError] = useState<string | null>(null);

  const weekStart = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
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

  // ============ HANDLERS ============

  const toggleExpand = (slotId: string) => {
    setExpandedSlotId(prev => (prev === slotId ? null : slotId));
  };

  const handleToggleComplete = async (slotId: string, currentlyCompleted: boolean) => {
    setUpdating(slotId);
    try {
      await supabase
        .from('workout_slots')
        .update({
          completed: !currentlyCompleted,
          completed_at: !currentlyCompleted ? new Date().toISOString() : null,
        })
        .eq('id', slotId);
      await refetch();
    } finally {
      setUpdating(null);
    }
  };

  const handleSubmitFeedback = async (slotId: string, data: FeedbackData) => {
    setUpdating(slotId);
    try {
      await supabase
        .from('workout_slots')
        .update({
          athlete_feedback: data.notes || null,
          rpe: data.rpe,
          completion_data: {
            rpe_actual: data.rpe,
            duration_actual: data.duration || null,
            notes: data.notes || null,
          },
        })
        .eq('id', slotId);
      await refetch();
    } finally {
      setUpdating(null);
    }
  };

  const handleReschedule = async (slotId: string, newDay: number, newTime: string) => {
    setUpdating(slotId);
    try {
      await supabase
        .from('workout_slots')
        .update({
          day_of_week: newDay,
          start_time: newTime,
        })
        .eq('id', slotId);
      await refetch();
    } finally {
      setUpdating(null);
    }
  };

  // ============ VIEW MODE ============

  const handleViewModeChange = useCallback((mode: 'list' | 'canvas') => {
    setViewMode(mode);
    try { localStorage.setItem('flux_athlete_view_mode', mode); } catch {}
  }, []);

  // ============ CANVAS HOOKS (must be before early returns) ============

  // Canvas view: current week start date for calendar integration
  const canvasWeekStart = useMemo(() => {
    const micro = profile?.active_microcycle;
    if (!micro?.start_date) return weekStart;
    const start = new Date(micro.start_date);
    const currentWeekOffset = ((micro.current_week || 1) - 1) * 7;
    const canvasStart = new Date(start);
    canvasStart.setDate(start.getDate() + currentWeekOffset);
    canvasStart.setHours(0, 0, 0, 0);
    return canvasStart;
  }, [profile?.active_microcycle?.start_date, profile?.active_microcycle?.current_week, weekStart]);

  // Canvas view: transform slots into WeekWorkout format for WeeklyGrid
  const canvasWorkouts = useMemo<WeekWorkout[]>(() => {
    const micro = profile?.active_microcycle;
    const currentWeekSlots = micro?.slots?.filter((s) => s.week_number === (micro?.current_week || 1)) || [];
    if (!currentWeekSlots.length) return [];
    return currentWeekSlots.map((slot) => ({
      id: slot.id,
      day_of_week: slot.day_of_week,
      start_time: slot.time_of_day || undefined,
      name: slot.template?.name || 'Treino',
      duration: slot.custom_duration || slot.template?.duration || 60,
      intensity: (['low', 'medium', 'high'].includes(slot.template?.intensity || '') ? slot.template.intensity : 'medium') as 'low' | 'medium' | 'high',
      modality: 'strength' as const,
    }));
  }, [profile?.active_microcycle]);

  // Canvas view: calendar integration (only active in canvas mode to avoid unnecessary API calls)
  const calendar = useCanvasCalendar({
    weekStartDate: canvasWeekStart,
    athleteId: viewMode === 'canvas' ? profile?.athlete_id : undefined,
  });

  // Canvas drag handler — reschedule workout via RPC (security checks + calendar sync reset)
  const handleCanvasReorder = useCallback(async (workoutId: string, _fromDay: number, toDay: number, toTime: string) => {
    setUpdating(workoutId);
    try {
      const { error } = await WorkoutSlotService.updateAthleteSchedule(workoutId, toDay, toTime);
      if (error) throw error;
      await refetch();
    } catch (err) {
      log.error('Error reordering workout:', err);
    } finally {
      setUpdating(null);
    }
  }, [refetch]);

  // ============ EARLY RETURNS ============

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-ceramic-base">
        <Loader2 className="w-8 h-8 text-ceramic-text-secondary animate-spin mb-4" />
        <p className="text-sm text-ceramic-text-secondary">Carregando seu treino...</p>
      </div>
    );
  }

  if (error || !isLinked || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-ceramic-base px-6">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm text-center space-y-4">
          <Dumbbell className="w-12 h-12 text-ceramic-text-secondary mx-auto" />
          <h1 className="text-xl font-black text-ceramic-text-primary">Meu Treino</h1>
          <p className="text-sm text-ceramic-text-secondary">
            {error || 'Nenhum treino vinculado a sua conta. Peca ao seu coach para adicionar seu email no cadastro.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 mx-auto px-4 py-2 bg-white rounded-xl shadow-sm text-sm font-bold text-ceramic-text-primary hover:scale-105 transition-transform"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // PAR-Q gate
  const parqRequired = profile.allow_parq_onboarding === true;
  const parqCleared =
    profile.parq_clearance_status === 'cleared' ||
    profile.parq_clearance_status === 'cleared_with_restrictions';
  const parqBlocked = profile.parq_clearance_status === 'blocked';

  // If PAR-Q answered with "Yes" to critical questions and status is blocked,
  // show a blocked message — athlete cannot access workouts until medical clearance
  if (parqRequired && parqBlocked && !parqCompleted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-ceramic-base px-6">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-ceramic-error/10 flex items-center justify-center mx-auto">
            <Dumbbell className="w-8 h-8 text-ceramic-error" />
          </div>
          <h1 className="text-xl font-black text-ceramic-text-primary">
            Liberacao Medica Necessaria
          </h1>
          <p className="text-sm text-ceramic-text-secondary leading-relaxed">
            Suas respostas no questionario PAR-Q+ indicaram condicoes que requerem
            liberacao medica antes de iniciar os treinos. Seu coach foi notificado.
          </p>
          <p className="text-xs text-ceramic-text-secondary">
            Envie o atestado medico pelo portal ou entre em contato com seu coach.
          </p>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 mx-auto px-4 py-2 bg-white rounded-xl shadow-sm text-sm font-bold text-ceramic-text-primary hover:scale-105 transition-transform"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // PAR-Q not yet filled — show wizard
  if (parqRequired && !parqCleared && !parqBlocked && !parqCompleted) {
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

  // Welcome onboarding
  if (showWelcome) {
    return (
      <AthleteWelcome
        profile={profile}
        onStartTraining={() => {
          setShowWelcome(false);
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

  // ============ DATA PROCESSING ============

  const micro = profile.active_microcycle;
  const modalityConfig = MODALITY_CONFIG[profile.modality];
  const completionPct = micro
    ? Math.round((micro.completed_slots / Math.max(micro.total_slots, 1)) * 100)
    : 0;

  // Build weeks for ProgressTimeline (4 weeks)
  const weeks = micro
    ? [1, 2, 3, 4].map((wk) => {
        // Calculate date range for this week
        let dateRange = '';
        if (micro.start_date) {
          const start = new Date(micro.start_date);
          const weekStart = new Date(start);
          weekStart.setDate(start.getDate() + (wk - 1) * 7);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          dateRange = `${weekStart.getDate().toString().padStart(2, '0')}/${(weekStart.getMonth() + 1).toString().padStart(2, '0')} - ${weekEnd.getDate().toString().padStart(2, '0')}/${(weekEnd.getMonth() + 1).toString().padStart(2, '0')}`;
        }
        return {
          weekNumber: wk,
          focus: (micro as Record<string, unknown>)[`week_${wk}_focus`] as string || '',
          totalSlots: micro.slots?.filter((s) => s.week_number === wk).length || 0,
          completedSlots: micro.slots?.filter((s) => s.week_number === wk && s.is_completed).length || 0,
          dateRange,
        };
      })
    : [];

  // Current week slots grouped by day_of_week
  const currentWeekSlots = micro?.slots?.filter((s) => s.week_number === (micro.current_week || 1)) || [];
  const slotsByDay = new Map<number, typeof currentWeekSlots>();
  for (const slot of currentWeekSlots) {
    const existing = slotsByDay.get(slot.day_of_week) || [];
    existing.push(slot);
    slotsByDay.set(slot.day_of_week, existing);
  }

  // Compute actual dates from microcycle start_date
  const getDateForDay = (dayOfWeek: number): Date | null => {
    if (!micro?.start_date) return null;
    const start = new Date(micro.start_date);
    const currentWeekOffset = ((micro.current_week || 1) - 1) * 7;
    const dayOffset = dayOfWeek - 1; // Mon=1 -> offset 0
    const date = new Date(start);
    date.setDate(start.getDate() + currentWeekOffset + dayOffset);
    return date;
  };

  // ============ RENDER ============

  return (
    <div className="flex flex-col w-full min-h-screen bg-ceramic-base pb-24">
      {/* Header */}
      <header className="pt-6 px-5 pb-2">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Meu Treino</span>
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-ceramic-cool/60">
            <button
              onClick={() => handleViewModeChange('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-ceramic-text-primary shadow-sm'
                  : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Lista
            </button>
            <button
              onClick={() => handleViewModeChange('canvas')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'canvas'
                  ? 'bg-white text-ceramic-text-primary shadow-sm'
                  : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Canvas
            </button>
          </div>
        </div>
      </header>

      {/* Profile Card */}
      <motion.section
        className="px-5 mb-4"
        custom={0}
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
      >
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
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

          {micro && (
            <div className="space-y-2 pt-3 border-t border-ceramic-border/30">
              <div className="flex items-center justify-between">
                <span className="text-xs text-ceramic-text-secondary">
                  Semana {micro.current_week}/4
                </span>
                <span className="text-xs font-bold text-ceramic-text-primary">
                  {completionPct}%
                </span>
              </div>
              <div className="h-1.5 bg-ceramic-cool rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-amber-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPct}%` }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                />
              </div>
              <p className="text-[10px] text-ceramic-text-secondary text-right">
                {micro.completed_slots}/{micro.total_slots} treinos
              </p>
            </div>
          )}
        </div>
      </motion.section>

      {/* Progress Timeline */}
      {micro && (
        <motion.section
          className="px-5 mb-6"
          custom={1}
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
        >
          <ProgressTimeline
            weeks={weeks}
            currentWeek={micro.current_week || 1}
            microcycleName={micro.name}
            status={micro.status}
          />
        </motion.section>
      )}

      {/* Draft Notice */}
      {micro?.status === 'draft' && (
        <motion.div
          className="px-5 mb-4"
          custom={2}
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
        >
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-3">
            <Clock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700 leading-relaxed">
              Este plano de treino esta sendo preparado pelo seu coach e pode sofrer alteracoes.
            </p>
          </div>
        </motion.div>
      )}

      {/* Weekly Calendar / Canvas */}
      {micro ? (
        viewMode === 'canvas' ? (
          /* ── Canvas View ── */
          <motion.section
            className="px-5 flex-1"
            custom={3}
            initial="hidden"
            animate="visible"
            variants={sectionVariants}
          >
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 340px)', minHeight: '500px' }}>
              <WeeklyGrid
                weekNumber={micro.current_week || 1}
                workouts={canvasWorkouts}
                calendarEvents={calendar.busySlots}
                onReorderWorkout={handleCanvasReorder}
                onWorkoutClick={(id) => setExpandedSlotId(expandedSlotId === id ? null : id)}
                startDate={canvasWeekStart}
                isLoading={calendar.isLoading}
              />
            </div>
            {/* Calendar legend */}
            <div className="flex items-center gap-4 mt-3 px-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#7B8FA2]/20" />
                <span className="text-[10px] text-ceramic-text-secondary">Coach ocupado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#C4883A]/20" />
                <span className="text-[10px] text-ceramic-text-secondary">Sua agenda</span>
              </div>
              <span className="text-[10px] text-ceramic-text-tertiary ml-auto">
                Arraste treinos para reorganizar
              </span>
            </div>
          </motion.section>
        ) : (
          /* ── List View ── */
          <motion.section
            className="px-5 space-y-1"
            custom={3}
            initial="hidden"
            animate="visible"
            variants={sectionVariants}
          >
            {[1, 2, 3, 4, 5, 6, 7].map((day) => {
              const daySlots = slotsByDay.get(day) || [];
              const date = getDateForDay(day);

              return (
                <div key={day}>
                  {/* Day Header */}
                  <div className="flex items-center gap-2 py-3">
                    <span className="text-xs font-black text-ceramic-text-primary uppercase">
                      {DAY_NAMES[day]}
                    </span>
                    {date && (
                      <span className="text-xs text-ceramic-text-secondary">
                        {date.getDate()} {MONTH_NAMES[date.getMonth()]}
                      </span>
                    )}
                  </div>

                  {daySlots.length > 0 ? (
                    <div className="space-y-2">
                      {daySlots.map((slot) => (
                        <WorkoutCard
                          key={slot.id}
                          slot={slot}
                          isExpanded={expandedSlotId === slot.id}
                          onToggleExpand={() => toggleExpand(slot.id)}
                          onToggleComplete={handleToggleComplete}
                          onSubmitFeedback={handleSubmitFeedback}
                          onReschedule={handleReschedule}
                          isUpdating={updating === slot.id}
                          modality={profile.modality}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 py-3 px-4 rounded-xl bg-ceramic-cool/50">
                      <Leaf className="w-4 h-4 text-green-400" />
                      <span className="text-xs text-ceramic-text-secondary italic">
                        Descanso
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </motion.section>
        )
      ) : (
        <motion.section
          className="px-5"
          custom={3}
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
        >
          <div className="bg-ceramic-cool/50 rounded-2xl p-8 text-center space-y-3">
            <Dumbbell className="w-10 h-10 text-ceramic-text-secondary/40 mx-auto" />
            <p className="text-sm font-medium text-ceramic-text-primary">
              Nenhum treino prescrito ainda
            </p>
            <p className="text-xs text-ceramic-text-secondary leading-relaxed">
              Seu coach ainda nao prescreveu treinos. Fique tranquilo, voce sera notificado quando houver novidades!
            </p>
          </div>
        </motion.section>
      )}

      {/* Coach Availability */}
      <motion.section
        className="px-5 mt-8"
        custom={4}
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
      >
        <CoachAvailabilityCard
          busyBlocks={coachBusyBlocks}
          isLoading={coachAvailLoading}
          error={coachAvailError}
          weekStart={weekStart}
        />
      </motion.section>
    </div>
  );
}
