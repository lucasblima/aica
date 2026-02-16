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

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calculator,
  Calendar,
  CalendarDays,
  Eye,
  EyeOff,
  RefreshCw,
  LayoutGrid,
  List,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFlux } from '../context/FluxContext';
import { useAthletes, type AthleteWithAdherence } from '../hooks/useAthletes';
import { useCanvasWorkouts } from '../hooks/useCanvasWorkouts';
import { useCanvasCalendar, type BusySlot } from '../hooks/useCanvasCalendar';
import { useWorkoutTemplates } from '../hooks/useWorkoutTemplates';
import type { Athlete } from '../types/flux';
import type { WorkoutTemplate, WorkoutSlot } from '../types/flow';
import type { WeekWorkout } from '../components/canvas/WeeklyGrid';

// Canvas components
import { WeeklyGrid } from '../components/canvas/WeeklyGrid';
import { MicrocycleGrid } from '../components/canvas/MicrocycleGrid';
import { WorkoutBlockEditor } from '../components/canvas/WorkoutBlockEditor';
import { LoadCalculatorPopover } from '../components/canvas/LoadCalculatorPopover';
import { PublishWhatsAppButton } from '../components/canvas/PublishWhatsAppButton';
import type { WorkoutBlockData } from '../components/canvas/WorkoutBlock';

// ============================================
// Types
// ============================================

type ViewMode = 'weekly' | 'microcycle';

// ============================================
// Athlete Selector (no athleteId in URL)
// ============================================

interface AthletePickerProps {
  athletes: AthleteWithAdherence[];
  isLoading: boolean;
  onSelect: (athlete: AthleteWithAdherence) => void;
}

const MODALITY_ICONS: Record<string, string> = {
  swimming: '🏊',
  running: '🏃',
  cycling: '🚴',
  strength: '💪',
  walking: '🚶',
};

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
          Canvas de Prescrição
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
          {athletes.filter(a => a.status === 'active' || a.status === 'trial').map((athlete) => (
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
              <div className="w-12 h-12 rounded-[14px] flex items-center justify-center text-xl"
                style={{
                  boxShadow: 'inset 3px 3px 6px rgba(163,158,145,0.2), inset -3px -3px 6px rgba(255,255,255,0.9)',
                }}
              >
                {MODALITY_ICONS[athlete.modality] || '🏃'}
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
// Calendar Toolbar
// ============================================

interface CalendarToolbarProps {
  isConnected: boolean;
  athleteCalendarConnected: boolean;
  showCoach: boolean;
  showAthlete: boolean;
  toggleCoach: () => void;
  toggleAthlete: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

const CalendarToolbar: React.FC<CalendarToolbarProps> = ({
  isConnected,
  athleteCalendarConnected,
  showCoach,
  showAthlete,
  toggleCoach,
  toggleAthlete,
  onRefresh,
  isLoading,
}) => {
  if (!isConnected && !athleteCalendarConnected) return null;

  return (
    <div className="flex items-center gap-2 text-[10px]">
      <Calendar className="w-3.5 h-3.5 text-ceramic-text-secondary" />

      {isConnected && (
        <button
          onClick={toggleCoach}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg font-bold uppercase tracking-wider transition-all ${
            showCoach
              ? 'bg-[#7B8FA2]/15 text-[#5F7185]'
              : 'bg-ceramic-text-secondary/5 text-ceramic-text-tertiary'
          }`}
        >
          {showCoach ? <Eye size={10} /> : <EyeOff size={10} />}
          Coach
        </button>
      )}

      {athleteCalendarConnected && (
        <button
          onClick={toggleAthlete}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg font-bold uppercase tracking-wider transition-all ${
            showAthlete
              ? 'bg-[#C4883A]/15 text-[#A06B2E]'
              : 'bg-ceramic-text-secondary/5 text-ceramic-text-tertiary'
          }`}
        >
          {showAthlete ? <Eye size={10} /> : <EyeOff size={10} />}
          Atleta
        </button>
      )}

      <button
        onClick={onRefresh}
        className="p-1 rounded-lg hover:bg-ceramic-text-secondary/10 transition-colors"
        title="Sincronizar calendarios"
      >
        <RefreshCw className={`w-3 h-3 text-ceramic-text-secondary ${isLoading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
};

// ============================================
// View Toggle
// ============================================

interface ViewToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const ViewToggle: React.FC<ViewToggleProps> = ({ mode, onChange }) => (
  <div
    className="flex rounded-[12px] p-1"
    style={{
      boxShadow: 'inset 2px 2px 5px rgba(163,158,145,0.2), inset -2px -2px 5px rgba(255,255,255,0.9)',
    }}
  >
    <button
      onClick={() => onChange('weekly')}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[10px] font-bold uppercase tracking-wider transition-all ${
        mode === 'weekly'
          ? 'bg-ceramic-base text-ceramic-text-primary'
          : 'text-ceramic-text-tertiary hover:text-ceramic-text-secondary'
      }`}
      style={
        mode === 'weekly'
          ? { boxShadow: '2px 2px 6px rgba(163,158,145,0.15), -2px -2px 6px rgba(255,255,255,0.9)' }
          : {}
      }
    >
      <List size={11} />
      Semana
    </button>
    <button
      onClick={() => onChange('microcycle')}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[10px] font-bold uppercase tracking-wider transition-all ${
        mode === 'microcycle'
          ? 'bg-ceramic-base text-ceramic-text-primary'
          : 'text-ceramic-text-tertiary hover:text-ceramic-text-secondary'
      }`}
      style={
        mode === 'microcycle'
          ? { boxShadow: '2px 2px 6px rgba(163,158,145,0.15), -2px -2px 6px rgba(255,255,255,0.9)' }
          : {}
      }
    >
      <LayoutGrid size={11} />
      Microciclo
    </button>
  </div>
);

// ============================================
// Template Library (connected to real data)
// ============================================

interface RealTemplateLibraryProps {
  modality: string;
  onTemplateSelect: (template: WorkoutTemplate) => void;
}

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  warmup: { label: 'Aquecimento', icon: '🔥' },
  main: { label: 'Principal', icon: '💪' },
  cooldown: { label: 'Desaquecimento', icon: '❄️' },
};

const INTENSITY_COLORS: Record<string, string> = {
  low: 'bg-[#6B7B5C]/15 text-[#6B7B5C]',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-[#9B4D3A]/15 text-[#9B4D3A]',
};

const RealTemplateLibrary: React.FC<RealTemplateLibraryProps> = ({
  modality,
  onTemplateSelect,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { templates, isLoading } = useWorkoutTemplates(
    modality ? { modality: modality as any } : undefined
  );

  const filtered = useMemo(() => {
    if (selectedCategory === 'all') return templates;
    return templates.filter((t) => t.category === selectedCategory);
  }, [templates, selectedCategory]);

  return (
    <div className="w-80 h-full bg-ceramic-base border-r border-ceramic-text-secondary/10 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-ceramic-text-secondary/10">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="p-2 rounded-[12px]"
            style={{
              boxShadow: 'inset 2px 2px 5px rgba(163,158,145,0.2), inset -2px -2px 5px rgba(255,255,255,0.9)',
            }}
          >
            <span className="text-xl">{MODALITY_ICONS[modality] || '🏃'}</span>
          </div>
          <div>
            <p className="text-[10px] text-ceramic-text-secondary font-medium uppercase tracking-wider">
              Biblioteca
            </p>
            <h3 className="text-lg font-bold text-ceramic-text-primary capitalize">
              {modality}
            </h3>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
              selectedCategory === 'all'
                ? 'bg-ceramic-base text-ceramic-text-primary'
                : 'text-ceramic-text-secondary hover:bg-ceramic-text-secondary/5'
            }`}
            style={
              selectedCategory === 'all'
                ? { boxShadow: '2px 2px 5px rgba(163,158,145,0.12), -2px -2px 5px rgba(255,255,255,0.9)' }
                : {}
            }
          >
            Todos
          </button>
          {Object.entries(CATEGORY_LABELS).map(([cat, cfg]) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                selectedCategory === cat
                  ? 'bg-ceramic-base text-ceramic-text-primary'
                  : 'text-ceramic-text-secondary hover:bg-ceramic-text-secondary/5'
              }`}
              style={
                selectedCategory === cat
                  ? { boxShadow: '2px 2px 5px rgba(163,158,145,0.12), -2px -2px 5px rgba(255,255,255,0.9)' }
                  : {}
              }
            >
              <span className="text-xs">{cfg.icon}</span>
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Template List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 rounded-[16px] bg-ceramic-text-secondary/8 animate-pulse"
                style={{ animationDelay: `${i * 60}ms` }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="p-6 rounded-[16px] text-center"
            style={{
              boxShadow: 'inset 2px 2px 5px rgba(163,158,145,0.15), inset -2px -2px 5px rgba(255,255,255,0.85)',
            }}
          >
            <p className="text-sm text-ceramic-text-secondary">Nenhum template nesta categoria</p>
          </div>
        ) : (
          filtered.map((template) => (
            <div
              key={template.id}
              onClick={() => onTemplateSelect(template)}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('templateId', template.id);
                e.dataTransfer.setData('text/plain', JSON.stringify(template));
              }}
              className="group relative flex flex-col gap-2 rounded-[16px] p-3 cursor-grab active:cursor-grabbing transition-all"
              style={{
                background: '#F0EFE9',
                boxShadow: '3px 3px 8px rgba(163,158,145,0.12), -3px -3px 8px rgba(255,255,255,0.9)',
              }}
            >
              {/* Category */}
              <span className="text-[9px] font-bold uppercase tracking-wider text-ceramic-text-tertiary">
                {CATEGORY_LABELS[template.category]?.label || template.category}
              </span>

              {/* Name */}
              <h4 className="font-semibold text-ceramic-text-primary text-sm leading-tight line-clamp-2">
                {template.name}
              </h4>

              {/* Duration + Intensity */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-ceramic-text-secondary font-medium">
                  {template.duration} min
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${INTENSITY_COLORS[template.intensity] || ''}`}
                >
                  {template.intensity === 'low' ? 'Leve' : template.intensity === 'medium' ? 'Media' : 'Alta'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-ceramic-text-secondary/10">
        <div className="flex items-center justify-between text-xs text-ceramic-text-secondary">
          <span className="font-medium">{filtered.length} template(s)</span>
          <span className="text-ceramic-text-tertiary">Arraste para o grid</span>
        </div>
      </div>
    </div>
  );
};

// ============================================
// Helper: Transform WorkoutSlot to WeekWorkout
// ============================================

function slotToWeekWorkout(slot: WorkoutSlot): WeekWorkout {
  return {
    id: slot.id,
    day_of_week: slot.day_of_week,
    name: slot.name,
    duration: slot.duration,
    intensity: slot.intensity as 'low' | 'medium' | 'high',
    modality: slot.modality as WeekWorkout['modality'],
    type: slot.modality?.substring(0, 3).toUpperCase(),
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
    type: slot.modality?.substring(0, 3).toUpperCase(),
    notes: slot.coach_notes,
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

  // All hooks MUST be called before any conditional return (React Rules of Hooks)
  const { athletes, isLoading: athletesLoading } = useAthletes();

  // Find selected athlete from list
  const athlete = athleteId ? athletes.find((a) => a.id === athleteId) : undefined;

  // Data hooks — always called, use placeholder athleteId when absent
  const {
    slots,
    weekWorkouts: weekWorkoutData,
    activeMicrocycle,
    isLoading: workoutsLoading,
    createSlotFromTemplate,
    updateSlot,
    deleteSlot,
  } = useCanvasWorkouts({ athleteId: athleteId || '__none__', weekNumber: currentWeek });

  // Calendar start date (Monday of current week within microcycle)
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

  // Transform slots to WeekWorkout format for the grid
  const gridWorkouts = useMemo<WeekWorkout[]>(
    () => weekWorkoutData.flatMap((wd) => wd.slots.map(slotToWeekWorkout)),
    [weekWorkoutData]
  );

  // All slots grouped by week (for MicrocycleGrid)
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
      // Find first empty day (no workouts)
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
    async (dayOfWeek: number, templateData: string) => {
      console.log('[Canvas] Drop received:', { dayOfWeek, templateData: templateData.substring(0, 100) });

      // Try to parse as JSON template
      try {
        const template = JSON.parse(templateData) as WorkoutTemplate;
        if (template.id && template.name) {
          console.log('[Canvas] Creating slot from template:', template.name, 'day:', dayOfWeek);
          const result = await createSlotFromTemplate(template, dayOfWeek);
          if (!result) {
            console.error('[Canvas] createSlotFromTemplate returned null — check activeMicrocycle and Supabase errors');
          } else {
            console.log('[Canvas] Slot created successfully:', result.id);
          }
          return;
        }
      } catch {
        // Not JSON, treat as templateId
        console.log('[Canvas] templateData is not JSON, trying as ID');
      }

      // Fallback: find template by ID from the templates list
      const { data: templates } = await import('../services/workoutTemplateService').then(
        (m) => m.WorkoutTemplateService.getTemplates({ modality: athlete?.modality as any })
      );
      const tmpl = templates?.find((t: WorkoutTemplate) => t.id === templateData);
      if (tmpl) {
        const result = await createSlotFromTemplate(tmpl, dayOfWeek);
        if (!result) {
          console.error('[Canvas] Fallback createSlotFromTemplate returned null');
        }
      } else {
        console.error('[Canvas] Template not found by ID:', templateData);
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
    async (workoutId: string, _fromDay: number, toDay: number) => {
      await updateSlot({ id: workoutId, day_of_week: toDay });
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
      await updateSlot({
        id: updated.id,
        name: updated.name,
        duration: updated.duration,
        intensity: updated.intensity,
        coach_notes: updated.notes,
      });
    },
    [updateSlot]
  );

  const handleWeekClick = useCallback((weekNumber: number) => {
    setCurrentWeek(weekNumber);
    setViewMode('weekly');
  }, []);

  // Loading — block UI until microcycle is loaded (prevents DnD before data is ready)
  if (workoutsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-ceramic-base">
        <div className="w-8 h-8 border-2 border-ceramic-info border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-ceramic-text-secondary font-medium">Preparando os treinos...</p>
      </div>
    );
  }

  // Microcycle failed to load or create
  if (!activeMicrocycle && !workoutsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-ceramic-base">
        <p className="text-lg font-bold text-ceramic-text-primary mb-2">Erro ao carregar microciclo</p>
        <p className="text-sm text-ceramic-text-secondary mb-6">
          Nao foi possivel criar o microciclo para este atleta.
        </p>
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

  // Not found
  if (!athlete && !athletesLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-ceramic-base">
        <p className="text-lg font-bold text-ceramic-text-primary mb-4">Atleta nao encontrado</p>
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

  const weekWorkoutsForPublish = gridWorkouts.map((w) => ({
    id: w.id,
    name: w.name,
    duration: w.duration,
    intensity: w.intensity,
    modality: w.modality,
    type: w.type,
  }));

  return (
    <div className="flex flex-col w-full h-screen bg-ceramic-base overflow-hidden">
      {/* Top Header */}
      <div className="p-6 border-b border-ceramic-text-secondary/10 bg-ceramic-base flex-shrink-0">
        <button
          onClick={handleBack}
          className="mb-4 flex items-center gap-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
        >
          <div
            className="w-8 h-8 flex items-center justify-center rounded-[10px]"
            style={{
              boxShadow: 'inset 2px 2px 4px rgba(163,158,145,0.2), inset -2px -2px 4px rgba(255,255,255,0.9)',
            }}
          >
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider">Voltar</span>
        </button>

        <div className="flex items-center justify-between">
          {/* Athlete Info */}
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-[16px] flex items-center justify-center text-2xl"
              style={{
                background: '#F0EFE9',
                boxShadow: '3px 3px 8px rgba(163,158,145,0.15), -3px -3px 8px rgba(255,255,255,0.9)',
              }}
            >
              {athlete?.name.split(' ').map((n) => n[0]).join('').substring(0, 2)}
            </div>
            <div>
              <p className="text-xs text-ceramic-text-secondary font-medium uppercase tracking-wider mb-0.5">
                Canvas de Prescricao
              </p>
              <h1 className="text-2xl font-black text-ceramic-text-primary">
                {athlete?.name}
              </h1>
              <p className="text-sm text-ceramic-text-secondary mt-0.5">
                Semana {currentWeek} de 3
                {activeMicrocycle && ` · ${activeMicrocycle.name || 'Microciclo'}`}
                {' · '}
                {athlete?.modality}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Calendar Toolbar */}
            <CalendarToolbar
              isConnected={calendarConnected}
              athleteCalendarConnected={athleteCalendarConnected}
              showCoach={showCoach}
              showAthlete={showAthlete}
              toggleCoach={toggleCoach}
              toggleAthlete={toggleAthlete}
              onRefresh={refreshCalendar}
              isLoading={calendarLoading}
            />

            {/* View Toggle */}
            <ViewToggle mode={viewMode} onChange={setViewMode} />

            {/* Week Navigator (weekly view only) */}
            {viewMode === 'weekly' && (
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-[14px]"
                style={{
                  background: '#F0EFE9',
                  boxShadow: '3px 3px 8px rgba(163,158,145,0.12), -3px -3px 8px rgba(255,255,255,0.9)',
                }}
              >
                <button
                  onClick={() => setCurrentWeek((w) => Math.max(1, w - 1))}
                  disabled={currentWeek === 1}
                  className="p-1.5 disabled:opacity-30 hover:bg-ceramic-text-secondary/10 transition-colors rounded-lg"
                  style={{
                    boxShadow: 'inset 2px 2px 4px rgba(163,158,145,0.15), inset -2px -2px 4px rgba(255,255,255,0.85)',
                  }}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-bold text-ceramic-text-primary px-2">
                  S{currentWeek}
                </span>
                <button
                  onClick={() => setCurrentWeek((w) => Math.min(3, w + 1))}
                  disabled={currentWeek === 3}
                  className="p-1.5 disabled:opacity-30 hover:bg-ceramic-text-secondary/10 transition-colors rounded-lg"
                  style={{
                    boxShadow: 'inset 2px 2px 4px rgba(163,158,145,0.15), inset -2px -2px 4px rgba(255,255,255,0.85)',
                  }}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Calculate Load */}
            <button
              onClick={() => setIsCalculatorOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-[14px] transition-transform hover:scale-105"
              style={{
                background: '#F0EFE9',
                boxShadow: '3px 3px 8px rgba(163,158,145,0.12), -3px -3px 8px rgba(255,255,255,0.9)',
              }}
            >
              <Calculator className="w-4 h-4 text-[#7B8FA2]" />
              <span className="text-sm font-bold text-ceramic-text-primary">Calcular Cargas</span>
            </button>

            {/* Publish WhatsApp */}
            {athlete && (
              <PublishWhatsAppButton
                athleteId={athlete.id}
                athleteName={athlete.name}
                athletePhone={athlete.phone}
                weekNumber={currentWeek}
                weekWorkouts={weekWorkoutsForPublish}
                onPublishSuccess={() => {}}
              />
            )}
          </div>
        </div>
      </div>

      {/* Main Content: 3-Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Template Library */}
        {athlete && (
          <RealTemplateLibrary
            modality={athlete.modality}
            onTemplateSelect={handleTemplateSelect}
          />
        )}

        {/* Center: Grid View */}
        <div className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            {viewMode === 'weekly' ? (
              <motion.div
                key="weekly"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                <WeeklyGrid
                  weekNumber={currentWeek}
                  workouts={gridWorkouts}
                  calendarEvents={busySlots}
                  onWorkoutClick={handleWorkoutClick}
                  onDropWorkout={handleDropWorkout}
                  onReorderWorkout={handleReorderWorkout}
                  startDate={weekStartDate}
                  isLoading={workoutsLoading}
                />
              </motion.div>
            ) : (
              <motion.div
                key="microcycle"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="p-6"
              >
                {activeMicrocycle ? (
                  <MicrocycleGrid
                    microcycle={{
                      id: activeMicrocycle.id,
                      title: activeMicrocycle.name || 'Microciclo',
                      start_date: activeMicrocycle.start_date,
                      focus: activeMicrocycle.week_1_focus || '',
                    }}
                    workoutsByWeek={workoutsByWeek}
                    calendarEvents={busySlots}
                    currentWeek={currentWeek}
                    onWorkoutClick={handleWorkoutClick}
                    onDropWorkout={handleMicrocycleDropWorkout}
                    onWeekClick={handleWeekClick}
                    isLoading={workoutsLoading}
                  />
                ) : (
                  <MicrocycleGrid
                    microcycle={{
                      id: '',
                      title: 'Carregando Microciclo...',
                      start_date: new Date().toISOString(),
                      focus: '',
                    }}
                    workoutsByWeek={{ 1: [], 2: [], 3: [] }}
                    currentWeek={currentWeek}
                    onWeekClick={handleWeekClick}
                    isLoading={true}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Drawer: Workout Editor (conditional) */}
        <WorkoutBlockEditor
          workout={selectedWorkout}
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setSelectedWorkout(null);
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
          onApplySuggestions={(adjustments) => {
            setIsCalculatorOpen(false);
          }}
        />
      )}
    </div>
  );
}
