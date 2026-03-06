/**
 * CanvasEditorView - Fully Functional Canvas Prescription Interface
 *
 * Features:
 * - 3-column layout: Library (sidebar) + Grid (center) + Editor (drawer)
 * - Dual view: Weekly (7 days) or Microcycle (4 weeks)
 * - Framer Motion drag-and-drop with magnetic snap
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
import type { BusySlot } from '../hooks/useCanvasCalendar';
import type { WorkoutTemplate, WorkoutSlot } from '../types/flow';
import type { WeekWorkout } from '../components/canvas/WeeklyGrid';
import { MicrocycleService } from '../services/microcycleService';

// Canvas components
import { LoadCalculatorPopover } from '../components/canvas/LoadCalculatorPopover';
import { CanvasLibrarySidebar } from '../components/canvas/CanvasLibrarySidebar';
import { CanvasFilterToolbar } from '../components/canvas/CanvasFilterToolbar';
import { CanvasGridContainer } from '../components/canvas/CanvasGridContainer';
import { CanvasEditorDrawer } from '../components/canvas/CanvasEditorDrawer';
import TemplateFormDrawer from '../components/forms/TemplateFormDrawer';
import { ErrorBoundary, ModuleErrorFallback } from '@/components/ui/ErrorBoundary';

// ============================================
// Types
// ============================================

type ViewMode = 'weekly' | 'microcycle';

// ============================================
// Athlete Selector (no athleteId in URL)
// ============================================

const MODALITY_ICONS: Record<string, string> = {
  swimming: '\u{1F3CA}',
  running: '\u{1F3C3}',
  cycling: '\u{1F6B4}',
  strength: '\u{1F4AA}',
  walking: '\u{1F6B6}',
  triathlon: '\u{1F3C5}',
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
  triathlon: 'Triatleta',
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
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editingTemplateData, setEditingTemplateData] = useState<WorkoutTemplate | null>(null);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [pendingSlotTarget, setPendingSlotTarget] = useState<{
    dayOfWeek: number;
    startTime: string;
  } | null>(null);
  const [isReleasing, setIsReleasing] = useState(false);
  const [microcycleStatus, setMicrocycleStatus] = useState<string | undefined>(undefined);

  // Filter state (lifted from sidebar for shared toolbar)
  const [modalityFilter, setModalityFilter] = useState<string[]>([]);
  const [zoneFilter, setZoneFilter] = useState<string[]>([]);

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
    // Parse as local date to avoid UTC offset causing off-by-one day
    const dateStr = activeMicrocycle.start_date.split('T')[0];
    const [y, m, d] = dateStr.split('-').map(Number);
    const start = new Date(y, m - 1, d);
    start.setDate(start.getDate() + (currentWeek - 1) * 7);
    return start;
  }, [activeMicrocycle?.start_date, currentWeek]);

  // Calendar integration removed (issue #386) — pass empty busy slots
  const busySlots = useMemo<BusySlot[]>(() => [], []);

  // Track microcycle status for Liberar Treino button
  useEffect(() => {
    setMicrocycleStatus(activeMicrocycle?.status);
  }, [activeMicrocycle?.status]);

  // Handler: release microcycle (draft → active)
  const handleReleaseMicrocycle = useCallback(async () => {
    if (!activeMicrocycle?.id) return;
    setIsReleasing(true);
    try {
      const { data, error } = await MicrocycleService.activateMicrocycle(activeMicrocycle.id);
      if (error) {
        console.error('[CanvasEditorView] Error releasing microcycle:', error);
      } else if (data) {
        setMicrocycleStatus('active');
      }
    } finally {
      setIsReleasing(false);
    }
  }, [activeMicrocycle?.id]);

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
    const map: Record<number, WeekWorkout[]> = { 1: [], 2: [], 3: [], 4: [] };
    for (const slot of slots) {
      const ww = slotToWeekWorkout(slot);
      if (map[slot.week_number]) {
        map[slot.week_number].push(ww);
      }
    }
    return map;
  }, [slots]);

  // Handlers
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
      // Convert slot to WorkoutTemplate shape for TemplateFormDrawer
      const templateData: WorkoutTemplate = {
        id: slot.template_id || slot.id,
        user_id: slot.user_id,
        name: slot.name,
        description: '',
        category: 'main',
        modality: slot.modality,
        duration: slot.duration,
        intensity: slot.intensity,
        exercise_structure: slot.exercise_structure,
        ftp_percentage: slot.ftp_percentage,
        pace_zone: slot.pace_zone,
        css_percentage: slot.css_percentage,
        rpe: slot.rpe,
        coach_notes: slot.coach_notes,
        created_at: '',
        updated_at: '',
        usage_count: 0,
      };
      setEditingSlotId(slot.id);
      setEditingTemplateData(templateData);
      setIsEditorOpen(true);
    },
    [slots]
  );

  // Handler for TemplateFormDrawer save (maps template back to slot update or create)
  const handleTemplateFormSave = useCallback(
    async (template: WorkoutTemplate) => {
      if (editingSlotId) {
        // Editing existing slot
        await updateSlot({
          id: editingSlotId,
          name: template.name,
          duration: template.duration,
          intensity: template.intensity,
          modality: template.modality,
          exercise_structure: template.exercise_structure,
          coach_notes: template.coach_notes,
          ftp_percentage: template.ftp_percentage,
          pace_zone: template.pace_zone,
          css_percentage: template.css_percentage,
          rpe: template.rpe,
        });
      } else if (pendingSlotTarget) {
        // Creating new slot from empty cell
        await createSlot({
          week_number: currentWeek,
          day_of_week: pendingSlotTarget.dayOfWeek,
          start_time: pendingSlotTarget.startTime,
          name: template.name || 'Novo treino',
          duration: template.duration,
          intensity: template.intensity,
          modality: template.modality || athlete?.modality || 'running',
          exercise_structure: template.exercise_structure,
          coach_notes: template.coach_notes,
          ftp_percentage: template.ftp_percentage,
          pace_zone: template.pace_zone,
          css_percentage: template.css_percentage,
          rpe: template.rpe,
        });
        setPendingSlotTarget(null);
      }
      setIsEditorOpen(false);
      setEditingSlotId(null);
      setEditingTemplateData(null);
    },
    [editingSlotId, updateSlot, createSlot, pendingSlotTarget, currentWeek, athlete?.modality]
  );

  const handleDeleteWorkout = useCallback(
    async (workoutId: string) => {
      await deleteSlot(workoutId);
    },
    [deleteSlot]
  );

  const handleEmptySlotClick = useCallback(
    (dayOfWeek: number, startTime: string) => {
      // For new slots, open TemplateFormDrawer in create mode
      setEditingSlotId(null);
      setEditingTemplateData(null);
      setIsEditorOpen(true);
      setPendingSlotTarget({ dayOfWeek, startTime });
    },
    []
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
          Erro ao carregar ciclo
        </p>
        <p className="text-sm text-ceramic-text-secondary mb-6">
          Nao foi possivel criar o ciclo para este atleta.
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
        activeMicrocycleName={activeMicrocycle?.name || 'Ciclo'}
        weekStartDate={weekStartDate}
        weekWorkoutsForPublish={weekWorkoutsForPublish}
        microcycleId={activeMicrocycle?.id}
        microcycleStatus={microcycleStatus}
        onReleaseMicrocycle={handleReleaseMicrocycle}
        isReleasing={isReleasing}
        onBack={handleBack}
        onOpenCalculator={() => setIsCalculatorOpen(true)}
      />

      {/* Filter Toolbar */}
      <CanvasFilterToolbar
        modalityFilter={modalityFilter}
        onModalityToggle={(mod) =>
          setModalityFilter((prev) =>
            prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
          )
        }
        zoneFilter={zoneFilter}
        onZoneToggle={(zone) =>
          setZoneFilter((prev) =>
            prev.includes(zone) ? prev.filter((z) => z !== zone) : [...prev, zone]
          )
        }
        currentWeek={currentWeek}
        onWeekChange={setCurrentWeek}
        viewMode={viewMode}
      />

      {/* Main Content: 3-Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        {athlete && (
          <CanvasLibrarySidebar
            athlete={athlete}
            onTemplateSelect={handleTemplateSelect}
            modalityFilter={modalityFilter}
            zoneFilter={zoneFilter}
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

        {/* Right Drawer: Workout Editor (using TemplateFormDrawer for consistency with Biblioteca #611) */}
        <TemplateFormDrawer
          mode={editingSlotId ? 'edit' : 'create'}
          initialData={editingTemplateData || undefined}
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingSlotId(null);
            setEditingTemplateData(null);
            setPendingSlotTarget(null);
          }}
          onSave={handleTemplateFormSave}
          skipServiceSave
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
