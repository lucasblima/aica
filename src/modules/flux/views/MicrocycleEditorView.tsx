/**
 * MicrocycleEditorView - Editor de Microciclo (3 semanas)
 *
 * Tela 2 do Flow Module: Editor visual de 3 semanas com drag-and-drop de templates,
 * foco semanal (volume/intensity/recovery/test), cálculo de carga, e publish para WhatsApp.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/services/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  closestCenter,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowLeft,
  Save,
  Send,
  Calendar,
  TrendingUp,
  AlertCircle,
  Plus,
  GripVertical,
  MessageCircle,
} from 'lucide-react';
import { MicrocycleService } from '../services/microcycleService';
import { AthleteProfileService } from '../services/athleteProfileService';
import { WorkoutTemplateService } from '../services/workoutTemplateService';
import { AutomationService } from '../services/automationService';
import { ScheduleWhatsAppModal } from '../components/ScheduleWhatsAppModal';
import { ScheduledWorkoutStatus } from '../components/ScheduledWorkoutStatus';
import { SlotCard } from '../components/SlotCard';
import { MicrocycleProgressBar } from '../components/MicrocycleProgressBar';
import { DraggableTemplate } from '../components/DraggableTemplate';
import { DroppableCell } from '../components/DroppableCell';
import type {
  Microcycle,
  WorkoutSlot,
  WorkoutTemplate,
  FlowAthleteProfile,
  MicrocycleWeekFocus,
  ScheduledWorkout,
} from '../types/flow';
import { MODALITY_CONFIG } from '../types/flux';
import { useFluxGamification } from '../hooks/useFluxGamification';

const WEEK_FOCUS_LABELS: Record<MicrocycleWeekFocus, string> = {
  volume: 'Volume',
  intensity: 'Intensidade',
  recovery: 'Recuperação',
  test: 'Teste',
};

const WEEK_FOCUS_COLORS: Record<MicrocycleWeekFocus, string> = {
  volume: 'bg-ceramic-info/20 text-ceramic-info',
  intensity: 'bg-ceramic-error/20 text-ceramic-error',
  recovery: 'bg-ceramic-success/20 text-ceramic-success',
  test: 'bg-ceramic-warning/20 text-ceramic-warning',
};

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export default function MicrocycleEditorView() {
  const navigate = useNavigate();
  const { microcycleId } = useParams<{ microcycleId: string }>();
  const { trackMicrocycleCompleted } = useFluxGamification();

  // State
  const [microcycle, setMicrocycle] = useState<Microcycle | null>(null);
  const [athlete, setAthlete] = useState<FlowAthleteProfile | null>(null);
  const [slots, setSlots] = useState<WorkoutSlot[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [scheduledWorkouts, setScheduledWorkouts] = useState<ScheduledWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  // @dnd-kit sensors configuration
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    })
  );

  // WhatsApp scheduling state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<1 | 2 | 3>(1);

  // Real-time subscription
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Completion tracking
  const completionPercentage = Math.round(
    slots.length > 0 ? (slots.filter((s) => s.completed).length / slots.length) * 100 : 0
  );

  const weekStats = [1, 2, 3].map((weekNum) => {
    const weekSlots = slots.filter((s) => s.week_number === weekNum);
    return {
      week: weekNum,
      total: weekSlots.length,
      completed: weekSlots.filter((s) => s.completed).length,
    };
  });

  // Load data
  useEffect(() => {
    if (microcycleId) {
      loadMicrocycle();
    }
  }, [microcycleId]);

  // Real-time subscription for slot updates
  useEffect(() => {
    if (!microcycleId) return;

    let cancelled = false;

    const setupSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const channel = supabase
          .channel(`workout_slots_${microcycleId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'workout_slots',
              filter: `microcycle_id=eq.${microcycleId}`,
            },
            (payload) => {
              const newSlot = payload.new as WorkoutSlot | undefined;
              console.log('[MicrocycleEditor] Slot update:', payload.eventType, newSlot?.id);

              if ((payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') && newSlot) {

                setSlots((prev) => {
                  const filtered = prev.filter((s) => s.id !== newSlot.id);
                  return [...filtered, newSlot].sort((a, b) => {
                    if (a.week_number !== b.week_number) return a.week_number - b.week_number;
                    return a.day_of_week - b.day_of_week;
                  });
                });
              } else if (payload.eventType === 'DELETE') {
                setSlots((prev) => prev.filter((s) => s.id !== payload.old.id));
              }
            }
          )
          .subscribe();

        channelRef.current = channel;

        if (cancelled) {
          supabase.removeChannel(channel);
          channelRef.current = null;
        }
      } catch (err) {
        console.error('[MicrocycleEditor] Subscription error:', err);
      }
    };

    setupSubscription();

    return () => {
      cancelled = true;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [microcycleId]);

  const loadMicrocycle = async () => {
    if (!microcycleId) return;

    setLoading(true);

    const { data, error } = await MicrocycleService.getMicrocycleWithSlots(microcycleId);

    if (error || !data) {
      console.error('Error loading microcycle:', error);
      navigate('/flux');
      return;
    }

    setMicrocycle(data);
    setSlots(data.slots);

    // Load athlete
    if (data.athlete_id) {
      const { data: athleteData } = await AthleteProfileService.getProfilesByAthleteId(
        data.athlete_id
      );
      if (athleteData && athleteData.length > 0) {
        setAthlete(athleteData[0] as unknown as FlowAthleteProfile);

        // Load templates for athlete's modality
        const { data: templatesData } = await WorkoutTemplateService.getTemplates({
          modality: athleteData[0].modality,
        });
        if (templatesData) {
          setTemplates(templatesData);
        }
      }
    }

    // Load scheduled workouts
    const { data: scheduledData } = await AutomationService.getScheduledWorkoutsByMicrocycle(microcycleId);
    if (scheduledData) {
      setScheduledWorkouts(scheduledData);
    }

    setLoading(false);
  };

  const handleSave = async () => {
    if (!microcycle) return;

    setSaving(true);

    const { error } = await MicrocycleService.updateMicrocycle({
      id: microcycle.id,
      name: microcycle.name,
      description: microcycle.description,
      week_1_focus: microcycle.week_1_focus,
      week_2_focus: microcycle.week_2_focus,
      week_3_focus: microcycle.week_3_focus,
      target_weekly_load: microcycle.target_weekly_load,
    });

    if (!error) {
      // Show success notification
      console.log('Microcycle saved successfully');
    }

    setSaving(false);
  };

  const handleActivate = async () => {
    if (!microcycle) return;

    const { error } = await MicrocycleService.activateMicrocycle(microcycle.id);

    if (!error) {
      // Award XP for completing the microcycle cycle (non-blocking)
      trackMicrocycleCompleted().catch(() => {});
      navigate(`/flux/athlete/${microcycle.athlete_id}`);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTemplateId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTemplateId(null);

    if (!over || !microcycle) return;

    // Parse droppable ID: "week-1-day-3" format
    const overId = over.id as string;
    if (!overId.startsWith('week-')) return;

    const [, weekStr, , dayStr] = overId.split('-');
    const week = parseInt(weekStr);
    const day = parseInt(dayStr);

    // Find the template being dragged
    const template = templates.find((t) => t.id === active.id);
    if (!template) return;

    // Create new workout slot
    const { data, error } = await MicrocycleService.createSlot({
      microcycle_id: microcycle.id,
      template_id: template.id,
      week_number: week,
      day_of_week: day,
      name: template.name,
      duration: template.duration,
      intensity: template.intensity,
      modality: template.modality,
      exercise_structure: template.exercise_structure,
      ftp_percentage: template.ftp_percentage,
      pace_zone: template.pace_zone,
      css_percentage: template.css_percentage,
      rpe: template.rpe,
    });

    if (!error && data) {
      // Optimistic update (real-time subscription will sync)
      setSlots((prev) => [...prev, data]);
    }
  };

  const handleRemoveSlot = async (slotId: string) => {
    const { error } = await MicrocycleService.deleteSlot(slotId);

    if (!error) {
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
    }
  };

  const getSlotsForCell = (week: number, day: number) => {
    return slots.filter((s) => s.week_number === week && s.day_of_week === day);
  };

  const handleScheduleWeek = (week: 1 | 2 | 3) => {
    setSelectedWeek(week);
    setScheduleModalOpen(true);
  };

  const handleScheduleSuccess = () => {
    // Reload scheduled workouts
    if (microcycleId) {
      AutomationService.getScheduledWorkoutsByMicrocycle(microcycleId).then(({ data }) => {
        if (data) setScheduledWorkouts(data);
      });
    }
  };

  const handleCancelScheduled = async (id: string) => {
    await AutomationService.cancelScheduled(id);
    setScheduledWorkouts((prev) => prev.filter((sw) => sw.id !== id));
  };

  const calculateWeekLoad = (week: number): number => {
    const weekSlots = slots.filter((s) => s.week_number === week);
    return weekSlots.reduce((total, slot) => {
      const intensityMultiplier =
        slot.intensity === 'high' ? 1.0 : slot.intensity === 'medium' ? 0.75 : 0.5;
      return total + slot.duration * intensityMultiplier * 1.5;
    }, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-ceramic-base">
        <div className="text-ceramic-text-secondary">Carregando microciclo...</div>
      </div>
    );
  }

  if (!microcycle || !athlete) {
    return (
      <div className="flex items-center justify-center h-screen bg-ceramic-base">
        <div className="text-ceramic-text-primary">Microciclo não encontrado</div>
      </div>
    );
  }

  const activeTemplate = templates.find((t) => t.id === activeTemplateId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-screen bg-ceramic-base overflow-hidden">
        {/* Template Library Sidebar */}
        <div className="w-80 border-r border-ceramic-text-secondary/10 bg-white/30 flex flex-col">
          <div className="p-4 border-b border-ceramic-text-secondary/10">
            <h3 className="text-sm font-bold text-ceramic-text-primary mb-2">
              Templates Disponíveis
            </h3>
            <p className="text-xs text-ceramic-text-secondary">
              Arraste para a grade semanal
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {templates.map((template) => (
              <DraggableTemplate
                key={template.id}
                template={template}
                isDragging={activeTemplateId === template.id}
              />
            ))}
          </div>
        </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-ceramic-text-secondary/10 bg-white/30">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate(`/flux/athlete/${athlete.athlete_id}`)}
              className="flex items-center gap-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Voltar</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 ceramic-card hover:bg-white/50 rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {saving ? 'Salvando...' : 'Salvar'}
                </span>
              </button>

              <button
                onClick={handleActivate}
                className="flex items-center gap-2 px-6 py-2 bg-ceramic-success text-white rounded-lg hover:bg-ceramic-success/90 transition-colors"
              >
                <Send className="w-4 h-4" />
                <span className="font-bold">Ativar Microciclo</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-black text-ceramic-text-primary mb-1">
                {microcycle.name}
              </h1>
              <p className="text-sm text-ceramic-text-secondary">
                {athlete.name} • {MODALITY_CONFIG[athlete.modality as keyof typeof MODALITY_CONFIG]?.label}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <MicrocycleProgressBar
              completionPercentage={completionPercentage}
              weekStats={weekStats}
            />
          </div>
        </div>

        {/* 3-Week Grid */}
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            {[1, 2, 3].map((week) => {
              const focusKey = `week_${week}_focus` as keyof Microcycle;
              const focus = microcycle[focusKey] as MicrocycleWeekFocus;
              const targetLoad = microcycle.target_weekly_load?.[week - 1] || 0;
              const actualLoad = Math.round(calculateWeekLoad(week));

              return (
                <div key={week} className="ceramic-card p-4">
                  {/* Week Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-ceramic-text-primary">
                        Semana {week}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                          WEEK_FOCUS_COLORS[focus]
                        }`}
                      >
                        {WEEK_FOCUS_LABELS[focus]}
                      </span>
                      <button
                        onClick={() => handleScheduleWeek(week as 1 | 2 | 3)}
                        className="flex items-center gap-1.5 px-3 py-1.5 ceramic-inset hover:bg-white/50 rounded-lg transition-colors text-xs font-medium"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Agendar WhatsApp
                      </button>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-ceramic-text-secondary" />
                        <span className="text-ceramic-text-secondary">Carga:</span>
                        <span className="font-bold text-ceramic-text-primary">
                          {actualLoad} / {targetLoad} TSS
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Scheduled Workouts Status */}
                  <div className="mb-4">
                    <ScheduledWorkoutStatus
                      scheduledWorkouts={scheduledWorkouts}
                      weekNumber={week as 1 | 2 | 3}
                      onCancel={handleCancelScheduled}
                    />
                  </div>

                  {/* Day Grid */}
                  <div className="grid grid-cols-7 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                      const cellSlots = getSlotsForCell(week, day);

                      return (
                        <DroppableCell
                          key={day}
                          week={week}
                          day={day}
                          dayLabel={DAY_LABELS[day - 1]}
                          slots={cellSlots}
                          onRemoveSlot={handleRemoveSlot}
                          onToggleComplete={(slotId, isCompleted) => {
                            // Optimistic UI update (real-time subscription will sync)
                            setSlots((prev) =>
                              prev.map((s) =>
                                s.id === slotId
                                  ? { ...s, completed: isCompleted, completed_at: isCompleted ? new Date().toISOString() : null }
                                  : s
                              )
                            );
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
      </div>

        {/* Schedule WhatsApp Modal */}
        {microcycle && athlete && (
          <ScheduleWhatsAppModal
            isOpen={scheduleModalOpen}
            onClose={() => setScheduleModalOpen(false)}
            microcycle={microcycle}
            athleteId={athlete.athlete_id}
            athleteName={athlete.name}
            weekNumber={selectedWeek}
            onSuccess={handleScheduleSuccess}
          />
        )}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeTemplate ? (
          <div className="p-3 ceramic-card shadow-2xl rotate-3 scale-110">
            <div className="flex items-start gap-2">
              <GripVertical className="w-4 h-4 text-ceramic-text-secondary mt-1" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-ceramic-text-primary line-clamp-1">
                  {activeTemplate.name}
                </p>
                <p className="text-xs text-ceramic-text-secondary">
                  {activeTemplate.duration}min • {activeTemplate.intensity}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
