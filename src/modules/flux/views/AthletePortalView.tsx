/**
 * AthletePortalView -- training portal for athletes
 *
 * Route: /meu-treino
 * Shows the athlete's active microcycle with a weekly calendar layout,
 * workout cards, feedback tab (Momentos-style), and coach availability.
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
import { ProgressTimeline, WorkoutCard, AthleteFeedbackView, WeeklyFeedbackCard } from '../components/athlete';
import { WeeklyGrid, type WeekWorkout } from '../components/canvas/WeeklyGrid';
import type { FeedbackData } from '../components/athlete';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/services/supabaseClient';
import { MODALITY_CONFIG } from '../types';
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
  const { profile, isLoading, error, isLinked, refetch } = useMyAthleteProfile();
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

  const handleToggleComplete = async (slotId: string, currentlyCompleted: boolean) => {
    setUpdating(slotId);
    try {
      await supabase.from('workout_slots').update({ completed: !currentlyCompleted, completed_at: !currentlyCompleted ? new Date().toISOString() : null }).eq('id', slotId);
      await refetch();
    } finally { setUpdating(null); }
  };

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

  // ── Canvas hooks ──

  const canvasWeekStart = useMemo(() => {
    const micro = profile?.active_microcycle;
    if (!micro?.start_date) return weekStart;
    const start = new Date(micro.start_date);
    const weekOffset = (selectedWeek - 1) * 7;
    const canvasStart = new Date(start);
    canvasStart.setDate(start.getDate() + weekOffset);
    canvasStart.setHours(0, 0, 0, 0);
    return canvasStart;
  }, [profile?.active_microcycle?.start_date, selectedWeek, weekStart]);

  const canvasWorkouts = useMemo<WeekWorkout[]>(() => {
    const micro = profile?.active_microcycle;
    const selectedWeekSlots = micro?.slots?.filter((s) => s.week_number === selectedWeek) || [];
    if (!selectedWeekSlots.length) return [];
    return selectedWeekSlots.map((slot) => ({
      id: slot.id, day_of_week: slot.day_of_week, start_time: slot.time_of_day || undefined,
      name: slot.template?.name || 'Treino', duration: slot.custom_duration || slot.template?.duration || 60,
      intensity: (['low', 'medium', 'high'].includes(slot.template?.intensity || '') ? slot.template.intensity : 'medium') as 'low' | 'medium' | 'high',
      modality: (['swimming', 'running', 'cycling', 'strength'].includes(profile?.modality || '') ? profile?.modality : 'strength') as WeekWorkout['modality'],
    }));
  }, [profile?.active_microcycle, profile?.modality, selectedWeek]);

  const calendar = useCanvasCalendar({ weekStartDate: canvasWeekStart, athleteId: viewMode === 'canvas' ? profile?.athlete_id : undefined });

  const handleCanvasReorder = useCallback(async (workoutId: string, _fromDay: number, toDay: number, toTime: string) => {
    setUpdating(workoutId);
    try {
      const { error } = await WorkoutSlotService.updateAthleteSchedule(workoutId, toDay, toTime);
      if (error) throw error;
      await refetch();
    } catch (err) { log.error('Error reordering workout:', err); }
    finally { setUpdating(null); }
  }, [refetch]);

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
  const completionPct = micro ? Math.round((micro.completed_slots / Math.max(micro.total_slots, 1)) * 100) : 0;

  // Derive prescribed modalities from workout slot templates (only show what coach actually prescribed)
  const prescribedModalities = (() => {
    if (!micro?.slots?.length) return [profile.modality] as Array<keyof typeof MODALITY_CONFIG>;
    const categories = new Set<string>();
    for (const slot of micro.slots) {
      const cat = slot.template?.category?.toLowerCase();
      if (cat && cat in MODALITY_CONFIG) {
        categories.add(cat);
      }
    }
    // Always include the primary modality
    categories.add(profile.modality);
    return Array.from(categories) as Array<keyof typeof MODALITY_CONFIG>;
  })();

  const weeks = micro
    ? [1, 2, 3, 4].map((wk) => {
        let dateRange = '';
        if (micro.start_date) {
          const start = new Date(micro.start_date);
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

  // Weekly volume total (#383: display total volume per week)
  const weeklyVolume = currentWeekSlots.reduce((sum, s) => sum + (s.custom_duration || s.template.duration), 0);

  const getDateForDay = (dayOfWeek: number): Date | null => {
    if (!micro?.start_date) return null;
    const start = new Date(micro.start_date);
    const weekOffset = (selectedWeek - 1) * 7;
    const dayOffset = dayOfWeek - 1;
    const date = new Date(start);
    date.setDate(start.getDate() + weekOffset + dayOffset);
    return date;
  };

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
            <div className="flex items-center gap-1 p-1 rounded-xl bg-ceramic-cool/60">
              <button onClick={() => handleViewModeChange('list')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white text-ceramic-text-primary shadow-sm' : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'}`}>
                <List className="w-3.5 h-3.5" />Lista
              </button>
              <button onClick={() => handleViewModeChange('canvas')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'canvas' ? 'bg-white text-ceramic-text-primary shadow-sm' : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'}`}>
                <LayoutGrid className="w-3.5 h-3.5" />Canvas
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
            {(profile as unknown as Record<string, unknown>).avatar_url ? (
              <img
                src={(profile as unknown as Record<string, unknown>).avatar_url as string}
                alt={profile.athlete_name}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center ${getAvatarColor(profile.athlete_name)}`}>
                <span className="text-white font-bold">{getInitials(profile.athlete_name)}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-ceramic-text-primary truncate">
                {profile.athlete_name}
                {prescribedModalities.map((mod) => (
                  <span key={mod} className="ml-1" title={MODALITY_CONFIG[mod]?.label}>
                    {MODALITY_CONFIG[mod]?.icon}
                  </span>
                ))}
              </h1>
              <p className="text-xs text-ceramic-text-secondary">Prescrito por {profile.coach_name}</p>
            </div>
          </div>

          {/* Treinos Cumpridos — overall progress (#379: labeled section) */}
          {micro && (
            <div className="space-y-2 pt-3 border-t border-ceramic-border/30">
              <p className="text-[10px] font-bold text-ceramic-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-ceramic-text-secondary inline-block" />
                Treinos Cumpridos
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-ceramic-text-secondary">Semana {micro.current_week}/4</span>
                <span className="text-xs font-bold text-ceramic-text-primary">{completionPct}%</span>
              </div>
              <div className="h-1.5 bg-ceramic-cool rounded-full overflow-hidden">
                <motion.div className="h-full bg-amber-400 rounded-full" initial={{ width: 0 }} animate={{ width: `${completionPct}%` }} transition={{ duration: 0.6, delay: 0.2 }} />
              </div>
              <p className="text-[10px] text-ceramic-text-secondary text-right">{micro.completed_slots}/{micro.total_slots} treinos</p>
            </div>
          )}
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
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 400px)', minHeight: '500px' }}>
                  <WeeklyGrid weekNumber={selectedWeek} workouts={canvasWorkouts} calendarEvents={calendar.busySlots}
                    onReorderWorkout={handleCanvasReorder} onWorkoutClick={(id) => handleViewFeedback(id)}
                    startDate={canvasWeekStart} isLoading={calendar.isLoading} />
                </div>
                <div className="flex items-center gap-4 mt-3 px-1">
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#7B8FA2]/20" /><span className="text-[10px] text-ceramic-text-secondary">Coach ocupado</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#C4883A]/20" /><span className="text-[10px] text-ceramic-text-secondary">Sua agenda</span></div>
                  <span className="text-[10px] text-ceramic-text-tertiary ml-auto">Arraste treinos para reorganizar</span>
                </div>
              </motion.section>
            ) : (
              <motion.section className="px-5 space-y-1" custom={4} initial="hidden" animate="visible" variants={sectionVariants}>
                {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                  const daySlots = slotsByDay.get(day) || [];
                  const date = getDateForDay(day);
                  const dayVolume = daySlots.reduce((sum, s) => sum + (s.custom_duration || s.template.duration), 0);
                  return (
                    <div key={day}>
                      <div className="flex items-center gap-2 py-3">
                        <span className="text-xs font-black text-ceramic-text-primary uppercase">{DAY_NAMES[day]}</span>
                        {date && <span className="text-xs text-ceramic-text-secondary">{date.getDate()} {MONTH_NAMES[date.getMonth()]}</span>}
                        {daySlots.length > 0 && (
                          <span className="text-[10px] text-ceramic-text-secondary ml-auto">{dayVolume}min</span>
                        )}
                      </div>
                      {daySlots.length > 0 ? (
                        <div className="space-y-2">
                          {daySlots.map((slot) => (
                            <WorkoutCard key={slot.id} slot={slot}
                              onToggleComplete={handleToggleComplete}
                              isUpdating={updating === slot.id} modality={profile.modality} />
                          ))}
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

                {/* Weekly volume summary (#383) */}
                {currentWeekSlots.length > 0 && (
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-ceramic-border/30">
                    <span className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">Volume Semanal</span>
                    <span className="text-xs font-bold text-ceramic-text-primary">{weeklyVolume} min</span>
                  </div>
                )}
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

          {micro && user && (
            <motion.section className="px-5 mt-8" custom={5} initial="hidden" animate="visible" variants={sectionVariants}>
              <WeeklyFeedbackCard
                athleteId={profile.athlete_id}
                microcycleId={micro.id}
                weekNumber={selectedWeek}
                userId={user.id}
                currentWeek={micro.current_week || 1}
              />
            </motion.section>
          )}
        </>
      ) : (
        <motion.section className="px-5" custom={3} initial="hidden" animate="visible" variants={sectionVariants}>
          <AthleteFeedbackView profile={profile} onRefetch={refetch} highlightSlotId={feedbackSlotId} selectedWeek={selectedWeek} />
        </motion.section>
      )}
    </div>
  );
}
