/**
 * CanvasEditorView - Fully Functional Canvas Prescription Interface
 *
 * Features:
 * - 3-column layout: Library (sidebar) + Grid (center) + Editor (drawer)
 * - Dual view: Weekly (7 days) or Microcycle (3 weeks)
 * - Framer Motion drag-and-drop with magnetic snap
 * - Google Calendar integration (coach + athlete events)
 * - Real data from Supabase workout_slots + microcycles
 * - Athlete selector when no athleteId in URL
 *
 * Usage: /flux/canvas/:athleteId/:blockId?  OR  /flux/canvas/
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useFlux } from '../context/FluxContext';
import { useAthletes, type AthleteWithAdherence } from '../hooks/useAthletes';
import { useCanvasWorkouts } from '../hooks/useCanvasWorkouts';
import { useCanvasCalendar } from '../hooks/useCanvasCalendar';
import { useCalendarSync } from '@/hooks/useCalendarSync';
import { isGoogleCalendarConnected } from '@/services/googleAuthService';
import { hasCalendarWriteScope } from '@/services/googleCalendarTokenService';
import type { WorkoutTemplate, WorkoutSlot } from '../types/flow';
import type { WeekWorkout } from '../components/canvas/WeeklyGrid';

// Canvas components
import { WorkoutBlockEditor } from '../components/canvas/WorkoutBlockEditor';
import { LoadCalculatorPopover } from '../components/canvas/LoadCalculatorPopover';
import { CanvasLibrarySidebar } from '../components/canvas/CanvasLibrarySidebar';
import { CanvasGridContainer } from '../components/canvas/CanvasGridContainer';
import { CanvasEditorDrawer } from '../components/canvas/CanvasEditorDrawer';
import type { WorkoutBlockData } from '../components/canvas/WorkoutBlock';
import { ErrorBoundary, ModuleErrorFallback } from '@/components/ui/ErrorBoundary';

// ============================================
// Types
// ============================================

type ViewMode = 'weekly' | 'microcycle';
type SyncState = 'disconnected' | 'readonly' | 'ready' | 'syncing' | 'done';

// ============================================
// Athlete Selector (no athleteId in URL)
// ============================================

const MODALITY_ICONS: Record<string, string> = {
  swimming: '\u{1F3CA}',
  running: '\u{1F3C3}',
  cycling: '\u{1F6B4}',
  strength: '\u{1F4AA}',
  walking: '\u{1F6B6}',
};

interface AthletePickerProps {
  athletes: AthleteWithAdherence[];
  isLoading: boolean;
  onSelect: (athlete: AthleteWithAdherence) => void;
}

const AthletePicker: React.FC<AthletePickerProps> = ({ athletes, isLoading, onSelect }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-ceramic-base">
        <div className="w-8 h-8 border-2 border-ceramic-info border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-ceramic-text-secondary font-medium">Carregando atletas...</p>
      </div>
    );
  }

  if (athletes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-ceramic-base">
        <p className="text-lg font-bold text-ceramic-text-primary mb-2">Nenhum atleta encontrado</p>
        <p className="text-sm text-ceramic-text-secondary mb-6">
          Adicione atletas no Dashboard do Flux para usar o Canvas.
        </p>
        <a
          href="/flux"
          className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-[16px] text-sm font-bold transition-colors"
        >
          Ir ao Dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-ceramic-base">
      <div className="p-8 border-b border-ceramic-text-secondary/10">
        <p className="text-[11px] text-ceramic-text-secondary font-medium uppercase tracking-wider mb-1">
          Canvas de Prescricao
        </p>
        <h1 className="text-3xl font-black text-ceramic-text-primary">Selecione o Atleta</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-8">
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.06 } },
          }}
        >
          {athletes
            .filter((a) => a.status === 'active' || a.status === 'trial')
            .map((athlete) => (
              <motion.button
                key={athlete.id}
                onClick={() => onSelect(athlete)}
                className="flex items-center gap-4 p-5 rounded-[20px] text-left transition-all"
                style={{
                  background: '#F0EFE9',
                  boxShadow:
                    '4px 4px 10px rgba(163, 158, 145, 0.15), -4px -4px 10px rgba(255, 255, 255, 0.9)',
                }}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0 },
                }}
                whileHover={{
                  scale: 1.02,
                  boxShadow:
                    '6px 6px 14px rgba(163, 158, 145, 0.2), -6px -6px 14px rgba(255, 255, 255, 0.95)',
                }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              >
                <div
                  className="w-12 h-12 rounded-[14px] flex items-center justify-center text-xl"
                  style={{
                    boxShadow:
                      'inset 3px 3px 6px rgba(163,158,145,0.2), inset -3px -3px 6px rgba(255,255,255,0.9)',
                  }}
                >
                  {MODALITY_ICONS[athlete.modality] || '\u{1F3C3}'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-ceramic-text-primary truncate">
                    {athlete.name}
                  </h3>
                  <p className="text-[11px] text-ceramic-text-secondary font-medium">
                    {athlete.modality} · {athlete.level.replace('_', ' ')}
                  </p>
                </div>
                {athlete.adherence_rate > 0 && (
                  <span className="text-[10px] font-bold text-ceramic-text-secondary">
                    {athlete.adherence_rate}%
                  </span>
                )}
              </motion.button>
            ))}
        </motion.div>
      </div>
    </div>
  );
};

// ============================================
// Helpers
// ============================================

const MODALITY_PT_LABELS: Record<string, string> = {
  swimming: 'Natacao',
  running: 'Corrida',
  cycling: 'Ciclismo',
  strength: 'Musculacao',
  walking: 'Caminhada',
};

function slotToWeekWorkout(slot: WorkoutSlot): WeekWorkout {
  return {
    id: slot.id,
    day_of_week: slot.day_of_week,
    start_time: slot.start_time,
    name: slot.name,
    duration: slot.duration,
    intensity: slot.intensity as 'low' | 'medium' | 'high',
    modality: slot.modality as WeekWorkout['modality'],
    type: MODALITY_PT_LABELS[slot.modality] || slot.modality,
    templateId: slot.template_id,
  };
}

function slotToWorkoutBlockData(slot: WorkoutSlot): WorkoutBlockData {
  return {
    id: slot.id,
    name: slot.name,
    duration: slot.duration,
    intensity: slot.intensity as 'low' | 'medium' | 'high',
    modality: slot.modality as WorkoutBlockData['modality'],
    type: MODALITY_PT_LABELS[slot.modality] || slot.modality,
    notes: slot.coach_notes,
    ftp_percentage: slot.ftp_percentage,
    pace_zone: slot.pace_zone,
    css_percentage: slot.css_percentage,
  };
}

// ============================================
// Main CanvasEditorView
// ============================================

export default function CanvasEditorView() {
  const navigate = useNavigate();
  const { athleteId } = useParams<{ athleteId: string; blockId?: string }>();
  const { actions } = useFlux();

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [currentWeek, setCurrentWeek] = useState(1);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutBlockData | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [pendingSlotTarget, setPendingSlotTarget] = useState<{
    dayOfWeek: number;
    startTime: string;
  } | null>(null);
  const [calSyncState, setCalSyncState] = useState<SyncState>('disconnected');

  // Calendar sync hook
  const {
    bulkSyncFlux,
    isSyncing: calSyncing,
    syncStats: calSyncStats,
    scopeUpgradeNeeded,
    requestScopeUpgrade,
  } = useCalendarSync();

  // Detect calendar connection + scope state on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const connected = await isGoogleCalendarConnected();
        if (cancelled) return;
        if (!connected) {
          setCalSyncState('disconnected');
          return;
        }
        const hasWrite = await hasCalendarWriteScope();
        if (cancelled) return;
        setCalSyncState(hasWrite ? 'ready' : 'readonly');
      } catch {
        if (!cancelled) setCalSyncState('disconnected');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (scopeUpgradeNeeded) setCalSyncState('readonly');
  }, [scopeUpgradeNeeded]);

  // All hooks MUST be called before any conditional return
  const { athletes, isLoading: athletesLoading } = useAthletes();
  const athlete = athleteId ? athletes.find((a) => a.id === athleteId) : undefined;

  const {
    slots,
    weekWorkouts: weekWorkoutData,
    activeMicrocycle,
    isLoading: workoutsLoading,
    createSlot,
    createSlotFromTemplate,
    updateSlot,
    deleteSlot,
  } = useCanvasWorkouts({ athleteId: athleteId || '__none__', weekNumber: currentWeek });

  const weekStartDate = useMemo(() => {
    if (!activeMicrocycle?.start_date) return new Date();
    const start = new Date(activeMicrocycle.start_date);
    start.setDate(start.getDate() + (currentWeek - 1) * 7);
    return start;
  }, [activeMicrocycle?.start_date, currentWeek]);

  const {
    busySlots,
    isConnected: calendarConnected,
    athleteCalendarConnected,
    showCoach,
    showAthlete,
    toggleCoach,
    toggleAthlete,
    isLoading: calendarLoading,
    refresh: refreshCalendar,
  } = useCanvasCalendar({ weekStartDate, athleteId });

  // If no athleteId, show athlete picker (after all hooks)
  if (!athleteId) {
    return (
      <AthletePicker
        athletes={athletes}
        isLoading={athletesLoading}
        onSelect={(a) => navigate(`/flux/canvas/${a.id}`)}
      />
    );
  }

  // Derived data
  const gridWorkouts = useMemo<WeekWorkout[]>(
    () => weekWorkoutData.flatMap((wd) => wd.slots.map(slotToWeekWorkout)),
    [weekWorkoutData]
  );

  const workoutsByWeek = useMemo<Record<number, WeekWorkout[]>>(() => {
    const map: Record<number, WeekWorkout[]> = { 1: [], 2: [], 3: [] };
    for (const slot of slots) {
      const ww = slotToWeekWorkout(slot);
      if (map[slot.week_number]) {
        map[slot.week_number].push(ww);
      }
    }
    return map;
  }, [slots]);

  // Handlers
  const handleBulkSync = useCallback(async () => {
    if (!activeMicrocycle) return;
    await bulkSyncFlux(activeMicrocycle.id, activeMicrocycle.start_date);
  }, [activeMicrocycle, bulkSyncFlux]);

  const handleBack = useCallback(() => {
    if (athlete) {
      actions.viewAthleteDetail(athlete.id);
      navigate(`/flux/athlete/${athlete.id}`);
    } else {
      actions.viewDashboard();
      navigate('/flux');
    }
  }, [athlete, actions, navigate]);

  const handleTemplateSelect = useCallback(
    async (template: WorkoutTemplate) => {
      const occupiedDays = new Set(gridWorkouts.map((w) => w.day_of_week));
      let targetDay = 1;
      for (let d = 1; d <= 7; d++) {
        if (!occupiedDays.has(d)) {
          targetDay = d;
          break;
        }
      }
      await createSlotFromTemplate(template, targetDay);
    },
    [gridWorkouts, createSlotFromTemplate]
  );

  const handleDropWorkout = useCallback(
    async (dayOfWeek: number, startTime: string, templateData: string) => {
      try {
        const template = JSON.parse(templateData) as WorkoutTemplate;
        if (template.id && template.name) {
          await createSlotFromTemplate(template, dayOfWeek, undefined, startTime);
          return;
        }
      } catch {
        // Not JSON, treat as templateId
      }
      const { data: templates } = await import('../services/workoutTemplateService').then(
        (m) =>
          m.WorkoutTemplateService.getTemplates({
            modality: athlete?.modality as 'swimming' | 'running' | 'cycling' | 'strength' | 'walking',
          })
      );
      const tmpl = templates?.find((t: WorkoutTemplate) => t.id === templateData);
      if (tmpl) {
        await createSlotFromTemplate(tmpl, dayOfWeek, undefined, startTime);
      }
    },
    [createSlotFromTemplate, athlete?.modality]
  );

  const handleMicrocycleDropWorkout = useCallback(
    async (weekNumber: number, dayOfWeek: number, templateData: string) => {
      try {
        const template = JSON.parse(templateData) as WorkoutTemplate;
        if (template.id && template.name) {
          await createSlotFromTemplate(template, dayOfWeek, weekNumber);
          return;
        }
      } catch {
        // fallback
      }
    },
    [createSlotFromTemplate]
  );

  const handleReorderWorkout = useCallback(
    async (workoutId: string, _fromDay: number, toDay: number, toTime: string) => {
      await updateSlot({ id: workoutId, day_of_week: toDay, start_time: toTime });
    },
    [updateSlot]
  );

  const handleWorkoutClick = useCallback(
    (workoutId: string) => {
      const slot = slots.find((s) => s.id === workoutId);
      if (!slot) return;
      setSelectedWorkout(slotToWorkoutBlockData(slot));
      setIsEditorOpen(true);
    },
    [slots]
  );

  const handleSaveWorkout = useCallback(
    async (updated: WorkoutBlockData) => {
      if (!updated.id && pendingSlotTarget) {
        await createSlot({
          week_number: currentWeek,
          day_of_week: pendingSlotTarget.dayOfWeek,
          start_time: pendingSlotTarget.startTime,
          name: updated.name || 'Novo treino',
          duration: updated.duration,
          intensity: updated.intensity,
          modality: updated.modality || athlete?.modality || 'running',
        });
        setPendingSlotTarget(null);
      } else {
        await updateSlot({
          id: updated.id,
          name: updated.name,
          duration: updated.duration,
          intensity: updated.intensity,
          coach_notes: updated.notes,
          ftp_percentage: updated.ftp_percentage,
          pace_zone: updated.pace_zone,
          css_percentage: updated.css_percentage,
        });
      }
    },
    [updateSlot, createSlot, pendingSlotTarget, currentWeek, athlete?.modality]
  );

  const handleDeleteWorkout = useCallback(
    async (workoutId: string) => {
      await deleteSlot(workoutId);
    },
    [deleteSlot]
  );

  const handleEmptySlotClick = useCallback(
    (dayOfWeek: number, startTime: string) => {
      setSelectedWorkout({
        id: '',
        name: '',
        duration: 60,
        intensity: 'medium',
        modality: (athlete?.modality as WorkoutBlockData['modality']) || 'running',
        type: MODALITY_PT_LABELS[athlete?.modality || 'running'] || 'Corrida',
      });
      setIsEditorOpen(true);
      setPendingSlotTarget({ dayOfWeek, startTime });
    },
    [athlete?.modality]
  );

  const handleWeekClick = useCallback((weekNumber: number) => {
    setCurrentWeek(weekNumber);
    setViewMode('weekly');
  }, []);

  // Loading states
  if (workoutsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-ceramic-base">
        <div className="w-8 h-8 border-2 border-ceramic-info border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-ceramic-text-secondary font-medium">
          Preparando os treinos...
        </p>
      </div>
    );
  }

  if (!activeMicrocycle && !workoutsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-ceramic-base">
        <p className="text-lg font-bold text-ceramic-text-primary mb-2">
          Erro ao carregar microciclo
        </p>
        <p className="text-sm text-ceramic-text-secondary mb-6">
          Nao foi possivel criar o microciclo para este atleta.
        </p>
        <button
          onClick={() => navigate('/flux')}
          className="px-6 py-3 rounded-[16px] text-sm font-bold text-ceramic-text-primary transition-transform hover:scale-105"
          style={{
            background: '#F0EFE9',
            boxShadow:
              '4px 4px 10px rgba(163,158,145,0.15), -4px -4px 10px rgba(255,255,255,0.9)',
          }}
        >
          Voltar ao Dashboard
        </button>
      </div>
    );
  }

  if (!athlete && !athletesLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-ceramic-base">
        <p className="text-lg font-bold text-ceramic-text-primary mb-4">
          Atleta nao encontrado
        </p>
        <button
          onClick={() => navigate('/flux')}
          className="px-6 py-3 rounded-[16px] text-sm font-bold text-ceramic-text-primary transition-transform hover:scale-105"
          style={{
            background: '#F0EFE9',
            boxShadow:
              '4px 4px 10px rgba(163,158,145,0.15), -4px -4px 10px rgba(255,255,255,0.9)',
          }}
        >
          Voltar ao Dashboard
        </button>
      </div>
    );
  }

  const weekWorkoutsForPublish = gridWorkouts.map((w) => ({
    id: w.id,
    name: w.name,
    duration: w.duration,
    intensity: w.intensity,
    modality: w.modality,
    type: w.type,
  }));

  return (
    <ErrorBoundary fallback={<ModuleErrorFallback moduleName="Canvas de Treinos" />}>
    <div className="flex flex-col w-full h-screen bg-ceramic-base overflow-hidden">
      {/* Top Header */}
      <CanvasEditorDrawer
        athlete={athlete}
        currentWeek={currentWeek}
        setCurrentWeek={setCurrentWeek}
        viewMode={viewMode}
        setViewMode={setViewMode}
        activeMicrocycleName={activeMicrocycle?.name || 'Microciclo'}
        weekWorkoutsForPublish={weekWorkoutsForPublish}
        microcycleId={activeMicrocycle?.id}
        calendarConnected={calendarConnected}
        athleteCalendarConnected={athleteCalendarConnected}
        showCoach={showCoach}
        showAthlete={showAthlete}
        toggleCoach={toggleCoach}
        toggleAthlete={toggleAthlete}
        calendarLoading={calendarLoading}
        refreshCalendar={refreshCalendar}
        calSyncState={calSyncState}
        calSyncing={calSyncing}
        calSyncStats={calSyncStats}
        requestScopeUpgrade={requestScopeUpgrade}
        handleBulkSync={handleBulkSync}
        onBack={handleBack}
        onOpenCalculator={() => setIsCalculatorOpen(true)}
      />

      {/* Main Content: 3-Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        {athlete && (
          <CanvasLibrarySidebar
            athlete={athlete}
            onTemplateSelect={handleTemplateSelect}
          />
        )}

        {/* Center: Grid View */}
        <CanvasGridContainer
          viewMode={viewMode}
          currentWeek={currentWeek}
          weekStartDate={weekStartDate}
          gridWorkouts={gridWorkouts}
          workoutsByWeek={workoutsByWeek}
          busySlots={busySlots}
          activeMicrocycle={activeMicrocycle}
          isLoading={workoutsLoading}
          onWorkoutClick={handleWorkoutClick}
          onWorkoutDelete={handleDeleteWorkout}
          onEmptySlotClick={handleEmptySlotClick}
          onDropWorkout={handleDropWorkout}
          onReorderWorkout={handleReorderWorkout}
          onMicrocycleDropWorkout={handleMicrocycleDropWorkout}
          onWeekClick={handleWeekClick}
        />

        {/* Right Drawer: Workout Editor */}
        <WorkoutBlockEditor
          workout={selectedWorkout}
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setSelectedWorkout(null);
            setPendingSlotTarget(null);
          }}
          onSave={handleSaveWorkout}
        />
      </div>

      {/* Load Calculator Modal */}
      {athlete && (
        <LoadCalculatorPopover
          isOpen={isCalculatorOpen}
          onClose={() => setIsCalculatorOpen(false)}
          weekWorkouts={weekWorkoutsForPublish}
          athleteProfile={{
            level: athlete.level,
            ftp: athlete.ftp,
            pace_threshold: athlete.pace_threshold,
          }}
          onApplySuggestions={() => {
            setIsCalculatorOpen(false);
          }}
        />
      )}
    </div>
    </ErrorBoundary>
  );
}
