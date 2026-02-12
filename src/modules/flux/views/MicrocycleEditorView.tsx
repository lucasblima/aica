/**
 * MicrocycleEditorView - Editor de Microciclo (3 semanas)
 *
 * Tela 2 do Flow Module: Editor visual de 3 semanas com drag-and-drop de templates,
 * foco semanal (volume/intensity/recovery/test), cálculo de carga, e publish para WhatsApp.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Send,
  Calendar,
  TrendingUp,
  AlertCircle,
  Plus,
  GripVertical,
} from 'lucide-react';
import { MicrocycleService } from '../services/microcycleService';
import { AthleteProfileService } from '../services/athleteProfileService';
import { WorkoutTemplateService } from '../services/workoutTemplateService';
import type {
  Microcycle,
  WorkoutSlot,
  WorkoutTemplate,
  AthleteProfile,
  MicrocycleWeekFocus,
} from '../types/flow';
import { MODALITY_CONFIG } from '../types/flux';

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

  // State
  const [microcycle, setMicrocycle] = useState<Microcycle | null>(null);
  const [athlete, setAthlete] = useState<AthleteProfile | null>(null);
  const [slots, setSlots] = useState<WorkoutSlot[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggedTemplate, setDraggedTemplate] = useState<WorkoutTemplate | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<{ week: number; day: number } | null>(null);

  // Load data
  useEffect(() => {
    if (microcycleId) {
      loadMicrocycle();
    }
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
      const { data: athleteData } = await AthleteProfileService.getProfileByAthleteId(
        data.athlete_id
      );
      if (athleteData) {
        setAthlete(athleteData);

        // Load templates for athlete's modality
        const { data: templatesData } = await WorkoutTemplateService.getTemplates({
          modality: athleteData.modality,
        });
        if (templatesData) {
          setTemplates(templatesData);
        }
      }
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
      navigate(`/flux/athlete/${microcycle.athlete_id}`);
    }
  };

  const handleDragStart = (template: WorkoutTemplate) => {
    setDraggedTemplate(template);
  };

  const handleDragEnd = () => {
    setDraggedTemplate(null);
    setDragOverSlot(null);
  };

  const handleDragOver = (e: React.DragEvent, week: number, day: number) => {
    e.preventDefault();
    setDragOverSlot({ week, day });
  };

  const handleDrop = async (week: number, day: number) => {
    if (!draggedTemplate || !microcycle) return;

    // Create new workout slot
    const { data, error } = await MicrocycleService.createSlot({
      microcycle_id: microcycle.id,
      template_id: draggedTemplate.id,
      week_number: week,
      day_of_week: day,
      name: draggedTemplate.name,
      duration: draggedTemplate.duration,
      intensity: draggedTemplate.intensity,
      modality: draggedTemplate.modality,
      exercise_structure: draggedTemplate.exercise_structure,
      ftp_percentage: draggedTemplate.ftp_percentage,
      pace_zone: draggedTemplate.pace_zone,
      css_percentage: draggedTemplate.css_percentage,
      rpe: draggedTemplate.rpe,
    });

    if (!error && data) {
      setSlots((prev) => [...prev, data]);
    }

    setDraggedTemplate(null);
    setDragOverSlot(null);
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

  return (
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
            <div
              key={template.id}
              draggable
              onDragStart={() => handleDragStart(template)}
              onDragEnd={handleDragEnd}
              className={`p-3 ceramic-card cursor-move hover:scale-[1.02] transition-transform ${
                draggedTemplate?.id === template.id ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-start gap-2">
                <GripVertical className="w-4 h-4 text-ceramic-text-secondary mt-1" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ceramic-text-primary line-clamp-1">
                    {template.name}
                  </p>
                  <p className="text-xs text-ceramic-text-secondary">
                    {template.duration}min • {template.intensity}
                  </p>
                </div>
              </div>
            </div>
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
                {athlete.name} • {MODALITY_CONFIG[athlete.modality as any]?.label}
              </p>
            </div>
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

                  {/* Day Grid */}
                  <div className="grid grid-cols-7 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                      const cellSlots = getSlotsForCell(week, day);
                      const isDropTarget =
                        dragOverSlot?.week === week && dragOverSlot?.day === day;

                      return (
                        <div
                          key={day}
                          onDragOver={(e) => handleDragOver(e, week, day)}
                          onDrop={() => handleDrop(week, day)}
                          className={`min-h-24 p-2 ceramic-inset rounded-lg transition-all ${
                            isDropTarget
                              ? 'ring-2 ring-ceramic-accent bg-ceramic-accent/10'
                              : ''
                          }`}
                        >
                          <p className="text-[10px] text-ceramic-text-secondary font-medium uppercase tracking-wider mb-2">
                            {DAY_LABELS[day - 1]}
                          </p>

                          <div className="space-y-1">
                            {cellSlots.map((slot) => (
                              <div
                                key={slot.id}
                                className="p-2 bg-white/50 rounded border border-ceramic-text-secondary/10 group relative"
                              >
                                <p className="text-[10px] font-bold text-ceramic-text-primary line-clamp-2">
                                  {slot.name}
                                </p>
                                <p className="text-[9px] text-ceramic-text-secondary">
                                  {slot.duration}min
                                </p>

                                <button
                                  onClick={() => handleRemoveSlot(slot.id)}
                                  className="absolute -top-1 -right-1 w-4 h-4 bg-ceramic-error text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>

                          {cellSlots.length === 0 && draggedTemplate && (
                            <div className="flex items-center justify-center h-full">
                              <Plus className="w-4 h-4 text-ceramic-text-secondary opacity-50" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
