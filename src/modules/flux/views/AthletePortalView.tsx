/**
 * AthletePortalView -- training portal for athletes
 *
 * Route: /meu-treino
 * Shows the athlete's active microcycle with a weekly calendar layout,
 * workout cards, feedback tab (Momentos-style), and coach availability.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useMyAthleteProfile } from '../hooks/useMyAthleteProfile';
import { useParQ } from '../hooks/useParQ';
import { useAthleteDocuments } from '../hooks/useAthleteDocuments';
import { WorkoutSlotService } from '../services/workoutSlotService';
import { AthleteWelcome } from '../components/AthleteWelcome';
import { ParQWizard } from '../components/parq/ParQWizard';
import { ProgressTimeline, WorkoutCard, AthleteFeedbackView, ExerciseQuestionnaireSheet } from '../components/athlete';
import { WeeklyGrid, type WeekWorkout } from '../components/canvas/WeeklyGrid';
import type { FeedbackData } from '../components/athlete';
import { useAuth } from '@/hooks/useAuth';
import { useGoogleCalendarEvents } from '@/hooks/useGoogleCalendarEvents';
import { supabase } from '@/services/supabaseClient';
import { MODALITY_CONFIG } from '../types';
import type { BusySlot } from '../hooks/useCanvasCalendar';
import { createNamespacedLogger } from '@/lib/logger';
import {
  Loader2,
  Dumbbell,
  ArrowLeft,
  Clock,
  Eye,
  Leaf,
  LayoutGrid,
  List,
  MessageSquare,
  CheckCircle,
  FileText,
  CalendarDays,
  DollarSign,
  Heart,
  Lock,
  MoveHorizontal,
} from 'lucide-react';

const log = createNamespacedLogger('AthletePortalView');

const DAY_NAMES = ['', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'];
const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const AVATAR_COLORS = [
  'bg-rose-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-violet-500', 'bg-teal-500', 'bg-pink-500', 'bg-indigo-500',
];

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── Stagger animation variants ────────────────────────────────────

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.35, ease: [0.4, 0, 0.2, 1] },
  }),
};

// ─── Main View ─────────────────────────────────────────────────────

export default function AthletePortalView() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, avatarUrl, isLoading, error, isLinked, refetch } = useMyAthleteProfile();
  const { user } = useAuth();

  const parq = useParQ({ athleteId: profile?.athlete_id || '', filledByRole: 'athlete' });
  const docs = useAthleteDocuments({ athleteId: profile?.athlete_id || '' });
  const [parqCompleted, setParqCompleted] = useState(false);

  // UI state
  const [updating, setUpdating] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'treinos' | 'feedback'>('treinos');
  const [feedbackSlotId, setFeedbackSlotId] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'list' | 'canvas'>(() => {
    try { return (localStorage.getItem('flux_athlete_view_mode') as 'list' | 'canvas') || 'list'; }
    catch { return 'list'; }
  });

  const [highlightedSlotId, setHighlightedSlotId] = useState<string | null>(null);
  const slotRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [feedbackSheetDay, setFeedbackSheetDay] = useState<number | null>(null);
  const [dayFeedbackMap, setDayFeedbackMap] = useState<Record<string, boolean>>({});
  const [sheetSubmitting, setSheetSubmitting] = useState(false);

  const welcomeParam = searchParams.get('welcome') === 'true';
  const [showWelcome, setShowWelcome] = useState(() => welcomeParam || !AthleteWelcome.hasBeenShown());

  const weekStart = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }, []);

  // Sync selectedWeek when microcycle changes
  const microId = profile?.active_microcycle?.id;
  const microCurrentWeek = profile?.active_microcycle?.current_week;
  useEffect(() => {
    setSelectedWeek(microCurrentWeek || 1);
  }, [microId, microCurrentWeek]);

  // ── Handlers ──

  const handleViewFeedback = (slotId: string) => { setFeedbackSlotId(slotId); setActiveTab('feedback'); };

  // handleToggleComplete removed — athletes should not mark exercises as completed

  const handleSubmitFeedback = async (slotId: string, data: FeedbackData) => {
    setUpdating(slotId);
    try {
      await supabase.from('workout_slots').update({
        athlete_feedback: data.notes || null, rpe: data.rpe,
        completion_data: { rpe_actual: data.rpe, duration_actual: data.duration || null, notes: data.notes || null },
      }).eq('id', slotId);
      await refetch();
    } finally { setUpdating(null); }
  };

  const handleReschedule = async (slotId: string, newDay: number, newTime: string) => {
    setUpdating(slotId);
    try {
      await supabase.from('workout_slots').update({ day_of_week: newDay, start_time: newTime }).eq('id', slotId);
      await refetch();
    } finally { setUpdating(null); }
  };

  const handleViewModeChange = useCallback((mode: 'list' | 'canvas') => {
    setViewMode(mode);
    try { localStorage.setItem('flux_athlete_view_mode', mode); } catch { /* noop */ }
  }, []);

  const handleGridWorkoutClick = useCallback((slotId: string) => {
    handleViewModeChange('list');
    setHighlightedSlotId(slotId);
    setTimeout(() => {
      const el = slotRefs.current.get(slotId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    setTimeout(() => setHighlightedSlotId(null), 2100);
  }, [handleViewModeChange]);

  // ── Canvas hooks ──

  const canvasWeekStart = useMemo(() => {
    const micro = profile?.active_microcycle;
    if (!micro?.start_date) return weekStart;
    // Append T12:00:00 to avoid UTC midnight → previous day in BR timezone (UTC-3)
    const dateStr = micro.start_date.includes('T') ? micro.start_date : `${micro.start_date}T12:00:00`;
    const start = new Date(dateStr);
    const weekOffset = (selectedWeek - 1) * 7;
    const canvasStart = new Date(start);
    canvasStart.setDate(start.getDate() + weekOffset);
    canvasStart.setHours(0, 0, 0, 0);
    return canvasStart;
  }, [profile?.active_microcycle?.start_date, selectedWeek, weekStart]);

  const canvasWeekEnd = useMemo(() => {
    const end = new Date(canvasWeekStart);
    end.setDate(end.getDate() + 7);
    return end;
  }, [canvasWeekStart]);

  // Google Calendar integration (#796)
  const {
    events: calendarEvents,
    isConnected: calendarConnected,
  } = useGoogleCalendarEvents({
    autoSync: true,
    syncInterval: 300,
    startDate: canvasWeekStart,
    endDate: canvasWeekEnd,
  });

  const calendarBusySlots = useMemo<BusySlot[]>(() => {
    if (!calendarConnected || !calendarEvents.length) return [];
    return calendarEvents
      .filter((e) => !e.aicaModule) // exclude AICA events to avoid duplication
      .filter((e) => {
        const start = new Date(e.startTime);
        return start >= canvasWeekStart && start < canvasWeekEnd;
      })
      .map((e) => {
        const jsDay = new Date(e.startTime).getDay();
        const dayOfWeek = jsDay === 0 ? 7 : jsDay;
        const fmtTime = (iso: string) => {
          const d = new Date(iso);
          return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        };
        return {
          dayOfWeek,
          startTime: e.isAllDay ? '00:00' : fmtTime(e.startTime),
          endTime: e.isAllDay ? '23:59' : fmtTime(e.endTime),
          title: e.title,
          source: 'athlete' as const,
          isAllDay: e.isAllDay,
        };
      });
  }, [calendarEvents, calendarConnected, canvasWeekStart, canvasWeekEnd]);

  // Check if athlete has unscheduled workouts (no time set) (#796)
  const hasUnscheduledWorkouts = useMemo(() => {
    const micro = profile?.active_microcycle;
    if (!micro?.slots?.length) return false;
    const weekSlots = micro.slots.filter((s) => s.week_number === selectedWeek);
    return weekSlots.some((s) => !s.time_of_day);
  }, [profile?.active_microcycle, selectedWeek]);

  const canvasWorkouts = useMemo<WeekWorkout[]>(() => {
    const micro = profile?.active_microcycle;
    const selectedWeekSlots = micro?.slots?.filter((s) => s.week_number === selectedWeek) || [];
    if (!selectedWeekSlots.length) return [];
    return selectedWeekSlots.map((slot) => ({
      id: slot.id, day_of_week: slot.day_of_week, start_time: slot.time_of_day || undefined,
      name: slot.template?.name || 'Treino', duration: slot.custom_duration || slot.template?.duration || 60,
      intensity: (['low', 'medium', 'high'].includes(slot.template?.intensity || '') ? slot.template.intensity : 'medium') as 'low' | 'medium' | 'high',
      modality: (['swimming', 'running', 'cycling', 'strength', 'walking', 'triathlon'].includes(profile?.modality || '') ? profile?.modality : 'strength') as WeekWorkout['modality'],
    }));
  }, [profile?.active_microcycle, profile?.modality, selectedWeek]);

  const handleCanvasReorder = useCallback(async (workoutId: string, _fromDay: number, toDay: number, toTime: string) => {
    setUpdating(workoutId);
    try {
      const { error } = await WorkoutSlotService.updateAthleteSchedule(workoutId, toDay, toTime);
      if (error) throw error;
      await refetch();
    } catch (err) { log.error('Error reordering workout:', err); }
    finally { setUpdating(null); }
  }, [refetch]);

  // ── Hooks that MUST be above early returns (React Rules of Hooks) ──

  // Count feedbacks responded for this microcycle
  const [feedbackCount, setFeedbackCount] = useState(0);
  const totalFeedbackDays = useMemo(() => {
    const micro = profile?.active_microcycle;
    if (!micro?.slots?.length) return 0;
    // Count unique day_of_week+week_number combos that have slots (i.e., training days needing feedback)
    const days = new Set(micro.slots.map((s) => `${s.week_number}-${s.day_of_week}`));
    return days.size;
  }, [profile?.active_microcycle]);

  useEffect(() => {
    const micro = profile?.active_microcycle;
    if (!micro?.id) { setFeedbackCount(0); return; }
    supabase
      .from('athlete_feedback_entries')
      .select('id', { count: 'exact', head: true })
      .eq('microcycle_id', micro.id)
      .then(({ count }) => setFeedbackCount(count || 0));
  }, [profile?.active_microcycle?.id]);

  // Track which days already have daily feedback for the selected week
  useEffect(() => {
    const micro = profile?.active_microcycle;
    if (!micro?.id || !selectedWeek) return;
    let cancelled = false;
    supabase
      .from('athlete_feedback_entries')
      .select('day_of_week')
      .eq('microcycle_id', micro.id)
      .eq('week_number', selectedWeek)
      .eq('feedback_type', 'daily')
      .then(({ data }) => {
        if (cancelled || !data) return;
        const map: Record<string, boolean> = {};
        for (const row of data) {
          map[`${selectedWeek}-${row.day_of_week}`] = true;
        }
        setDayFeedbackMap(prev => ({ ...prev, ...map }));
      });
    return () => { cancelled = true; };
  }, [profile?.active_microcycle?.id, selectedWeek]);

  // Submit day feedback via ExerciseQuestionnaireSheet bottom sheet
  const handleDayFeedbackSubmit = useCallback(async (data: { slotId: string; questionnaire: Record<string, number | undefined>; notes: string }) => {
    if (!feedbackSheetDay || !user || !profile?.active_microcycle) return;
    setSheetSubmitting(true);
    try {
      const { error: insertErr } = await supabase.from('athlete_feedback_entries').insert({
        user_id: user.id,
        athlete_id: profile.athlete_id,
        microcycle_id: profile.active_microcycle.id,
        feedback_type: 'daily',
        week_number: selectedWeek,
        day_of_week: feedbackSheetDay,
        questionnaire: data.questionnaire,
        notes: data.notes.trim() || null,
      });
      if (insertErr) throw insertErr;
      setDayFeedbackMap(prev => ({ ...prev, [`${selectedWeek}-${feedbackSheetDay}`]: true }));
      setFeedbackSheetDay(null);
      setFeedbackCount(prev => prev + 1);
      refetch();
    } catch (err) {
      log.error('Failed to submit day feedback:', err);
    } finally {
      setSheetSubmitting(false);
    }
  }, [feedbackSheetDay, user, profile?.active_microcycle, profile?.athlete_id, selectedWeek, refetch]);

  const prescribedModalities = useMemo((): Array<keyof typeof MODALITY_CONFIG> => {
    const mod = profile?.modality as keyof typeof MODALITY_CONFIG;
    if (mod === 'triathlon') {
      return ['triathlon', 'swimming', 'running', 'cycling'];
    }
    return mod && MODALITY_CONFIG[mod] ? [mod] : ['strength'];
  }, [profile?.modality]);

  // ── Early returns ──

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
          <button onClick={() => navigate('/')} className="flex items-center gap-2 mx-auto px-4 py-2 bg-white rounded-xl shadow-sm text-sm font-bold text-ceramic-text-primary hover:scale-105 transition-transform">
            <ArrowLeft className="w-4 h-4" />Voltar
          </button>
        </div>
      </div>
    );
  }

  const parqRequired = profile.allow_parq_onboarding === true;
  const parqCleared = profile.parq_clearance_status === 'cleared' || profile.parq_clearance_status === 'cleared_with_restrictions';
  const parqBlocked = profile.parq_clearance_status === 'blocked';

  if (parqRequired && parqBlocked && !parqCompleted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-ceramic-base px-6">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-ceramic-error/10 flex items-center justify-center mx-auto">
            <Dumbbell className="w-8 h-8 text-ceramic-error" />
          </div>
          <h1 className="text-xl font-black text-ceramic-text-primary">Liberacao Medica Necessaria</h1>
          <p className="text-sm text-ceramic-text-secondary leading-relaxed">
            Suas respostas no questionario PAR-Q+ indicaram condicoes que requerem liberacao medica antes de iniciar os treinos. Seu coach foi notificado.
          </p>
          <p className="text-xs text-ceramic-text-secondary">Envie o atestado medico pelo portal ou entre em contato com seu coach.</p>
          <button onClick={() => navigate('/')} className="flex items-center gap-2 mx-auto px-4 py-2 bg-white rounded-xl shadow-sm text-sm font-bold text-ceramic-text-primary hover:scale-105 transition-transform">
            <ArrowLeft className="w-4 h-4" />Voltar
          </button>
        </div>
      </div>
    );
  }

  if (parqRequired && !parqCleared && !parqBlocked && !parqCompleted) {
    return (
      <ParQWizard athleteName={profile.athlete_name} athleteId={profile.athlete_id}
        step={parq.step} classicAnswers={parq.classicAnswers} followUpAnswers={parq.followUpAnswers}
        activeFollowUpCategories={parq.activeFollowUpCategories} calculatedRisk={parq.calculatedRisk}
        calculatedClearance={parq.calculatedClearance} restrictions={parq.restrictions}
        signatureText={parq.signatureText} isSubmitting={parq.isSubmitting} submitError={parq.submitError}
        setStep={parq.setStep} nextStep={parq.nextStep} prevStep={parq.prevStep}
        setClassicAnswer={parq.setClassicAnswer} setFollowUpAnswer={parq.setFollowUpAnswer}
        setSignatureText={parq.setSignatureText} submitParQ={parq.submitParQ}
        onComplete={() => { setParqCompleted(true); refetch(); }}
        onUploadDocument={(input) => docs.uploadDocument(input)} isUploading={docs.isUploading}
      />
    );
  }

  if (showWelcome) {
    return (
      <AthleteWelcome profile={profile}
        onStartTraining={() => { setShowWelcome(false); if (welcomeParam) { searchParams.delete('welcome'); setSearchParams(searchParams, { replace: true }); } }}
        onExplore={() => { setShowWelcome(false); navigate('/'); }}
      />
    );
  }

  // ── Data processing ──

  const micro = profile.active_microcycle;
  const modalityConfig = MODALITY_CONFIG[profile.modality];
  const completionPct = micro ? Math.round((feedbackCount / Math.max(totalFeedbackDays, 1)) * 100) : 0;

  const weeks = micro
    ? [1, 2, 3, 4].map((wk) => {
        let dateRange = '';
        if (micro.start_date) {
          // Append T12:00:00 to avoid UTC midnight → previous day in BR timezone (UTC-3)
          const dateStr = micro.start_date.includes('T') ? micro.start_date : `${micro.start_date}T12:00:00`;
          const start = new Date(dateStr);
          const ws = new Date(start); ws.setDate(start.getDate() + (wk - 1) * 7);
          const we = new Date(ws); we.setDate(ws.getDate() + 6);
          dateRange = `${ws.getDate().toString().padStart(2, '0')}/${(ws.getMonth() + 1).toString().padStart(2, '0')} - ${we.getDate().toString().padStart(2, '0')}/${(we.getMonth() + 1).toString().padStart(2, '0')}`;
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

  const currentWeekSlots = micro?.slots?.filter((s) => s.week_number === selectedWeek) || [];
  const slotsByDay = new Map<number, typeof currentWeekSlots>();
  for (const slot of currentWeekSlots) {
    const existing = slotsByDay.get(slot.day_of_week) || [];
    existing.push(slot);
    slotsByDay.set(slot.day_of_week, existing);
  }

  const getDateForDay = (dayOfWeek: number): Date | null => {
    if (!micro?.start_date) return null;
    // Append T12:00:00 to avoid UTC midnight → previous day in BR timezone (UTC-3)
    const dateStr = micro.start_date.includes('T') ? micro.start_date : `${micro.start_date}T12:00:00`;
    const start = new Date(dateStr);
    const weekOffset = (selectedWeek - 1) * 7;
    const dayOffset = dayOfWeek - 1;
    const date = new Date(start);
    date.setDate(start.getDate() + weekOffset + dayOffset);
    return date;
  };

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  // ── Render ──

  return (
    <div className="flex flex-col w-full min-h-screen bg-ceramic-base pb-24">
      {/* Header */}
      <header className="pt-6 px-5 pb-2">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => { window.history.length > 1 ? navigate(-1) : navigate('/'); }} className="flex items-center gap-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Meu Treino</span>
          </button>
          {activeTab === 'treinos' && (
            <div className="flex items-center gap-1 p-1 rounded-xl bg-ceramic-cool shadow-sm border border-ceramic-border/40">
              <button onClick={() => handleViewModeChange('list')} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'list' ? 'bg-white text-ceramic-text-primary shadow-md' : 'text-ceramic-text-secondary hover:text-ceramic-text-primary hover:bg-white/50'}`}>
                <List className="w-4 h-4" />Lista
              </button>
              <button onClick={() => handleViewModeChange('canvas')} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'canvas' ? 'bg-white text-ceramic-text-primary shadow-md' : 'text-ceramic-text-secondary hover:text-ceramic-text-primary hover:bg-white/50'}`}>
                <LayoutGrid className="w-4 h-4" />Grade
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Profile Card */}
      <motion.section className="px-5 mb-4" custom={0} initial="hidden" animate="visible" variants={sectionVariants}>
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-3">
            {/* Avatar with fallback to initials */}
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={profile.athlete_name}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center ${getAvatarColor(profile.athlete_name)}`}>
                <span className="text-white font-bold">{getInitials(profile.athlete_name)}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl font-black text-ceramic-text-primary truncate">
                  {profile.athlete_name}
                </h1>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  {prescribedModalities.map((mod) => (
                    <span key={mod} className="text-base" title={MODALITY_CONFIG[mod]?.label}>
                      {MODALITY_CONFIG[mod]?.icon}
                    </span>
                  ))}
                </div>
                {/* Alert badges for health/financial pending */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {profile.parq_clearance_status && ['pending', 'blocked', 'expired'].includes(profile.parq_clearance_status) && (
                    <span className="w-5 h-5 rounded-full bg-ceramic-error/10 flex items-center justify-center" title="Pendencia de saude">
                      <Heart className="w-3 h-3 text-ceramic-error" />
                    </span>
                  )}
                  {(profile as unknown as Record<string, unknown>).hasPendingPayment && (
                    <span className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center" title="Pendencia financeira">
                      <DollarSign className="w-3 h-3 text-amber-600" />
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-ceramic-text-secondary">Prescrito por {profile.coach_name}</p>
                <span className="text-ceramic-border">·</span>
                <p className="text-xs text-ceramic-text-secondary">
                  {prescribedModalities.map((mod) => MODALITY_CONFIG[mod]?.label).join(', ')}
                </p>
              </div>
            </div>
          </div>

        </div>
      </motion.section>

      {/* Progress Timeline */}
      {micro && (
        <motion.section className="px-5 mb-4" custom={1} initial="hidden" animate="visible" variants={sectionVariants}>
          <ProgressTimeline weeks={weeks} currentWeek={micro.current_week || 1} microcycleName={micro.name} status={micro.status} selectedWeek={selectedWeek} onWeekSelect={setSelectedWeek} />
        </motion.section>
      )}

      {/* Microcycle Status Badge — #381: PENDENTE / LIBERADO */}
      {micro && micro.status === 'draft' && (
        <motion.div className="px-5 mb-3" custom={1.5} initial="hidden" animate="visible" variants={sectionVariants}>
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-sm font-bold text-amber-700">Treino Pendente</span>
            <span className="text-xs text-amber-600">Aguardando liberacao do coach</span>
          </div>
        </motion.div>
      )}
      {micro && micro.status === 'active' && (
        <motion.div className="px-5 mb-3" custom={1.5} initial="hidden" animate="visible" variants={sectionVariants}>
          <div className="flex items-center gap-2 px-3 py-2 bg-ceramic-success/10 border border-ceramic-success/20 rounded-xl">
            <CheckCircle className="w-4 h-4 text-ceramic-success flex-shrink-0" />
            <span className="text-sm font-bold text-ceramic-success">Treino Liberado</span>
          </div>
        </motion.div>
      )}

      {/* Document Pending Banner — #381 */}
      {profile.parq_clearance_status &&
       ['pending', 'blocked', 'expired'].includes(profile.parq_clearance_status) && (
        <motion.div className="px-5 mb-3" custom={1.6} initial="hidden" animate="visible" variants={sectionVariants}>
          <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-800">Documentos Pendentes</p>
              <p className="text-xs text-blue-600">
                {profile.parq_clearance_status === 'expired'
                  ? 'Seus documentos de saude expiraram'
                  : profile.parq_clearance_status === 'blocked'
                  ? 'Liberacao medica necessaria'
                  : 'Complete seus documentos de saude'}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Week viewing indicator */}
      {micro && selectedWeek !== (micro.current_week || 1) && (
        <motion.div className="px-5 mb-2" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
          <div className="flex items-center justify-between bg-sky-50 border border-sky-200/60 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-sky-500" />
              <span className="text-xs text-sky-700 font-medium">
                Semana {selectedWeek} de 4 · Visualizando
              </span>
            </div>
            <button
              onClick={() => setSelectedWeek(micro.current_week || 1)}
              className="text-[10px] font-bold text-sky-600 hover:text-sky-800 transition-colors uppercase tracking-wider"
            >
              Voltar para atual
            </button>
          </div>
        </motion.div>
      )}

      {/* Tab Toggle: Treinos / Feedback */}
      <motion.div className="px-5 mb-4" custom={2} initial="hidden" animate="visible" variants={sectionVariants}>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-ceramic-cool/60">
          <button onClick={() => setActiveTab('treinos')} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'treinos' ? 'bg-white text-ceramic-text-primary shadow-sm' : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'}`}>
            <Dumbbell className="w-3.5 h-3.5" />Treinos
          </button>
          <button onClick={() => setActiveTab('feedback')} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'feedback' ? 'bg-white text-ceramic-text-primary shadow-sm' : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'}`}>
            <MessageSquare className="w-3.5 h-3.5" />Feedback
          </button>
        </div>
      </motion.div>

      {activeTab === 'treinos' ? (
        <>
          {micro?.status === 'draft' && (
            <motion.div className="px-5 mb-4" custom={3} initial="hidden" animate="visible" variants={sectionVariants}>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-3">
                <Clock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700 leading-relaxed">Este plano de treino esta sendo preparado pelo seu coach e pode sofrer alteracoes.</p>
              </div>
            </motion.div>
          )}

          {micro ? (
            viewMode === 'canvas' ? (
              <motion.section className="px-5 flex-1" custom={4} initial="hidden" animate="visible" variants={sectionVariants}>
                {/* Scheduling prompt (#796) */}
                {hasUnscheduledWorkouts && (
                  <div className="flex items-center gap-3 px-4 py-3 mb-3 bg-ceramic-info/10 border border-ceramic-info/20 rounded-xl">
                    <MoveHorizontal className="w-4 h-4 text-ceramic-info flex-shrink-0" />
                    <p className="text-xs text-blue-800 leading-relaxed">
                      <span className="font-bold">Organize seus horarios!</span> Arraste os treinos para os horarios que funcionam melhor para voce.
                      {!calendarConnected && ' Conecte o Google Calendar para ver seus compromissos.'}
                    </p>
                    {!calendarConnected && (
                      <a
                        href="/agenda?connect=google"
                        className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-ceramic-info text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-blue-600 transition-colors"
                      >
                        <CalendarDays className="w-3 h-3" />
                        Conectar
                      </a>
                    )}
                  </div>
                )}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 400px)', minHeight: '500px' }}>
                  <WeeklyGrid weekNumber={selectedWeek} workouts={canvasWorkouts} calendarEvents={calendarBusySlots}
                    onReorderWorkout={handleCanvasReorder} onWorkoutClick={(id) => handleGridWorkoutClick(id)}
                    startDate={canvasWeekStart} isLoading={false} />
                </div>
                <div className="flex items-center gap-4 mt-3 px-1">
                  {calendarConnected && (
                    <span className="text-[10px] text-ceramic-text-tertiary flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" /> Google Calendar sincronizado
                    </span>
                  )}
                  <span className="text-[10px] text-ceramic-text-tertiary ml-auto">Arraste treinos para reorganizar</span>
                </div>
              </motion.section>
            ) : (
              <motion.section className="px-5 space-y-1" custom={4} initial="hidden" animate="visible" variants={sectionVariants}>
                {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                  const daySlots = slotsByDay.get(day) || [];
                  const date = getDateForDay(day);
                  const isToday = date != null && date.getFullYear() === todayMidnight.getFullYear() && date.getMonth() === todayMidnight.getMonth() && date.getDate() === todayMidnight.getDate();
                  return (
                    <div key={day}>
                      <div className="flex items-center gap-2 py-3">
                        <span className="text-xs font-black text-ceramic-text-primary uppercase">{DAY_NAMES[day]}</span>
                        {date && <span className="text-xs text-ceramic-text-secondary">{date.getDate()} {MONTH_NAMES[date.getMonth()]}</span>}
                        {isToday && <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Hoje</span>}
                      </div>
                      {daySlots.length > 0 ? (
                        <div className="space-y-2">
                          {daySlots.map((slot) => (
                            <div
                              key={slot.id}
                              ref={(el) => { if (el) slotRefs.current.set(slot.id, el); }}
                              className={`transition-all duration-500 rounded-2xl ${highlightedSlotId === slot.id ? 'ring-2 ring-amber-400 bg-amber-50/50' : ''} ${isToday && highlightedSlotId !== slot.id ? 'ring-2 ring-amber-400/60' : ''}`}
                              style={isToday && highlightedSlotId !== slot.id ? { background: 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(251,191,36,0.04) 40%, transparent 70%)' } : undefined}
                            >
                              <WorkoutCard slot={slot}
                                isUpdating={updating === slot.id} modality={profile.modality} />
                            </div>
                          ))}
                          {/* Inline day feedback — compact button or submitted badge (#770) */}
                          {user && micro && (() => {
                            const feedbackKey = `${selectedWeek}-${day}`;
                            const hasFeedback = dayFeedbackMap[feedbackKey];
                            const isDayFuture = date ? date > todayMidnight : false;

                            if (hasFeedback) {
                              return (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-ceramic-success/10 border border-ceramic-success/20">
                                  <CheckCircle className="w-3.5 h-3.5 text-ceramic-success flex-shrink-0" />
                                  <span className="text-xs font-bold text-ceramic-success">Feedback enviado</span>
                                </div>
                              );
                            }

                            if (isDayFuture) {
                              return (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-ceramic-cool/40 opacity-50">
                                  <Lock className="w-3.5 h-3.5 text-ceramic-text-secondary/50 flex-shrink-0" />
                                  <span className="text-xs text-ceramic-text-secondary">Feedback disponivel no dia</span>
                                </div>
                              );
                            }

                            return (
                              <button
                                type="button"
                                onClick={() => setFeedbackSheetDay(day)}
                                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                                <span className="text-xs font-bold text-amber-700">Dar Feedback do Dia</span>
                              </button>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 py-3 px-4 rounded-xl bg-ceramic-cool/50">
                          <Leaf className="w-4 h-4 text-green-400" />
                          <span className="text-xs text-ceramic-text-secondary italic">Descanso</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Weekly volume removed (#692): formula not ready */}
              </motion.section>
            )
          ) : (
            <motion.section className="px-5" custom={4} initial="hidden" animate="visible" variants={sectionVariants}>
              <div className="bg-ceramic-cool/50 rounded-2xl p-8 text-center space-y-3">
                <Dumbbell className="w-10 h-10 text-ceramic-text-secondary/40 mx-auto" />
                <p className="text-sm font-medium text-ceramic-text-primary">Nenhum treino prescrito ainda</p>
                <p className="text-xs text-ceramic-text-secondary leading-relaxed">Seu coach ainda nao prescreveu treinos. Fique tranquilo, voce sera notificado quando houver novidades!</p>
              </div>
            </motion.section>
          )}

        </>
      ) : (
        <motion.section className="px-5" custom={3} initial="hidden" animate="visible" variants={sectionVariants}>
          <AthleteFeedbackView profile={profile} onRefetch={refetch} highlightSlotId={feedbackSlotId} selectedWeek={selectedWeek} />
        </motion.section>
      )}

      {/* Day feedback bottom sheet (#770) */}
      <AnimatePresence>
        {feedbackSheetDay && micro && (
          <ExerciseQuestionnaireSheet
            slotId={`day-${selectedWeek}-${feedbackSheetDay}`}
            slotName="Feedback do Dia"
            dayLabel={(() => {
              const dayDate = getDateForDay(feedbackSheetDay);
              return dayDate
                ? `${DAY_NAMES[feedbackSheetDay]}, ${dayDate.getDate()} ${MONTH_NAMES[dayDate.getMonth()]}`
                : DAY_NAMES[feedbackSheetDay];
            })()}
            onSubmit={handleDayFeedbackSubmit}
            onClose={() => setFeedbackSheetDay(null)}
            isSubmitting={sheetSubmitting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
