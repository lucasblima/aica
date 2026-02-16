/**
 * CanvasEditorView - Complete Canvas Prescription Interface
 *
 * **PHASE 1 - MOCKUP IMPLEMENTATION COMPLETE**
 *
 * Features:
 * - 3-column layout: Library (sidebar) + WeeklyGrid (center) + Editor (drawer)
 * - Workout templates drag-and-drop (visual mockup)
 * - Load calculator popover
 * - WhatsApp publish integration-ready
 * - All components from PRD integrated
 *
 * Usage: /flux/canvas/:athleteId/:blockId
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calculator, TrendingUp } from 'lucide-react';
import { useFlux } from '../context/FluxContext';
import { AthleteService } from '../services/athleteService';
import { MOCK_WORKOUT_BLOCKS } from '../mockData';
import { getTemplatesByModality, type WorkoutTemplate } from '../mockData/workoutTemplates';
import type { Athlete } from '../types/flux';

// Canvas components
import { WorkoutTemplateLibrary } from '../components/canvas/WorkoutTemplateLibrary';
import { WeeklyGrid, type WeekWorkout } from '../components/canvas/WeeklyGrid';
import { WorkoutBlockEditor } from '../components/canvas/WorkoutBlockEditor';
import { LoadCalculatorPopover } from '../components/canvas/LoadCalculatorPopover';
import { PublishWhatsAppButton } from '../components/canvas/PublishWhatsAppButton';
import type { WorkoutBlockData } from '../components/canvas/WorkoutBlock';

export default function CanvasEditorView() {
  const navigate = useNavigate();
  const { athleteId, blockId } = useParams<{ athleteId: string; blockId?: string }>();
  const { actions } = useFlux();

  // State
  const [currentWeek, setCurrentWeek] = useState(1);
  const [weekWorkouts, setWeekWorkouts] = useState<WeekWorkout[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutBlockData | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  // Fetch real athlete from Supabase
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!athleteId) { setLoading(false); return; }
    AthleteService.getAthleteById(athleteId).then(({ data }) => {
      setAthlete(data);
      setLoading(false);
    });
  }, [athleteId]);

  const block = blockId ? MOCK_WORKOUT_BLOCKS.find((b) => b.id === blockId) : null;

  // Mock workouts for current week (would come from database)
  const mockWeekWorkouts = useMemo<WeekWorkout[]>(() => {
    if (!athlete) return [];

    // Generate 3-5 random workouts for the week
    const templates = getTemplatesByModality(athlete.modality);
    const numWorkouts = 3 + Math.floor(Math.random() * 3); // 3-5 workouts
    const workouts: WeekWorkout[] = [];

    for (let i = 0; i < numWorkouts; i++) {
      const template = templates[Math.floor(Math.random() * templates.length)];
      const dayOfWeek = Math.floor(Math.random() * 7) + 1; // 1-7

      workouts.push({
        id: `workout-${currentWeek}-${i}`,
        day_of_week: dayOfWeek,
        name: template.name,
        duration: template.duration,
        intensity: template.intensity,
        modality: template.modality,
        type: template.modality.substring(0, 3).toUpperCase(),
      });
    }

    return workouts;
  }, [athlete, currentWeek]);

  // Handlers
  const handleBack = () => {
    if (athlete) {
      actions.viewAthleteDetail(athlete.id);
      navigate(`/flux/athlete/${athlete.id}`);
    } else {
      actions.viewDashboard();
      navigate('/flux');
    }
  };

  const handleTemplateSelect = (template: WorkoutTemplate) => {
    console.log('Template selected:', template.name);
    // Mock: Add to current week (in real app, would show day selector)
    const newWorkout: WeekWorkout = {
      id: `workout-new-${Date.now()}`,
      day_of_week: Math.floor(Math.random() * 7) + 1, // Random day (mock)
      name: template.name,
      duration: template.duration,
      intensity: template.intensity,
      modality: template.modality,
      type: template.modality.substring(0, 3).toUpperCase(),
    };
    setWeekWorkouts((prev) => [...prev, newWorkout]);
  };

  const handleWorkoutClick = (workoutId: string) => {
    const workout = [...weekWorkouts, ...mockWeekWorkouts].find((w) => w.id === workoutId);
    if (!workout) return;

    // Convert to WorkoutBlockData
    const workoutData: WorkoutBlockData = {
      id: workout.id,
      name: workout.name,
      duration: workout.duration,
      intensity: workout.intensity,
      modality: workout.modality,
      type: workout.type,
    };

    setSelectedWorkout(workoutData);
    setIsEditorOpen(true);
  };

  const handleDropWorkout = (dayOfWeek: number, templateId: string) => {
    console.log(`Dropped template ${templateId} on day ${dayOfWeek}`);
    // Mock: Would create workout from template and add to specific day
  };

  const handleSaveWorkout = (updated: WorkoutBlockData) => {
    console.log('Saving workout:', updated);
    // Mock: Would update workout in database
    setWeekWorkouts((prev) =>
      prev.map((w) => (w.id === updated.id ? { ...w, ...updated } : w))
    );
  };

  const handlePublishSuccess = () => {
    console.log('Workout plan published successfully!');
  };

  // Loading
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-ceramic-base">
        <div className="w-8 h-8 border-2 border-ceramic-info border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-ceramic-text-secondary">Carregando canvas...</p>
      </div>
    );
  }

  // Not found
  if (!athlete) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-ceramic-base">
        <p className="text-lg font-bold text-ceramic-text-primary mb-4">Atleta não encontrado</p>
        <button
          onClick={() => navigate('/flux')}
          className="px-6 py-3 ceramic-card text-sm font-bold text-ceramic-text-primary hover:scale-105 transition-transform"
        >
          Voltar ao Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-screen bg-ceramic-base overflow-hidden">
      {/* Top Header */}
      <div className="p-6 border-b border-stone-200 bg-white flex-shrink-0">
        <button
          onClick={handleBack}
          className="mb-4 flex items-center gap-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
        >
          <div className="w-8 h-8 ceramic-inset flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider">Voltar</span>
        </button>

        <div className="flex items-center justify-between">
          {/* Athlete Info */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 ceramic-card flex items-center justify-center text-2xl">
              {athlete.name.split(' ').map((n) => n[0]).join('').substring(0, 2)}
            </div>
            <div>
              <p className="text-xs text-ceramic-text-secondary font-medium uppercase tracking-wider mb-0.5">
                Canvas de Prescrição
              </p>
              <h1 className="text-2xl font-black text-ceramic-text-primary">{athlete.name}</h1>
              <p className="text-sm text-ceramic-text-secondary mt-0.5">
                Semana {currentWeek} de 12 • {athlete.modality}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Week Navigator */}
            <div className="flex items-center gap-2 ceramic-card px-4 py-2">
              <button
                onClick={() => setCurrentWeek((w) => Math.max(1, w - 1))}
                disabled={currentWeek === 1}
                className="ceramic-inset p-1.5 disabled:opacity-30 hover:bg-stone-100 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-sm font-bold text-ceramic-text-primary px-2">
                S{currentWeek}
              </span>
              <button
                onClick={() => setCurrentWeek((w) => Math.min(12, w + 1))}
                disabled={currentWeek === 12}
                className="ceramic-inset p-1.5 disabled:opacity-30 hover:bg-stone-100 transition-colors"
              >
                <TrendingUp className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Calculate Load */}
            <button
              onClick={() => setIsCalculatorOpen(true)}
              className="flex items-center gap-2 px-4 py-2 ceramic-card hover:scale-105 transition-transform"
            >
              <Calculator className="w-4 h-4 text-ceramic-info" />
              <span className="text-sm font-bold text-ceramic-text-primary">Calcular Cargas</span>
            </button>

            {/* Publish WhatsApp */}
            <PublishWhatsAppButton
              athleteId={athlete.id}
              athleteName={athlete.name}
              athletePhone={athlete.phone}
              weekNumber={currentWeek}
              weekWorkouts={[...weekWorkouts, ...mockWeekWorkouts].map((w) => ({
                id: w.id,
                name: w.name,
                duration: w.duration,
                intensity: w.intensity,
                modality: w.modality,
                type: w.type,
              }))}
              onPublishSuccess={handlePublishSuccess}
            />
          </div>
        </div>
      </div>

      {/* Main Content: 3-Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Template Library */}
        <WorkoutTemplateLibrary
          modality={athlete.modality}
          onTemplateSelect={handleTemplateSelect}
        />

        {/* Center: Weekly Grid */}
        <WeeklyGrid
          weekNumber={currentWeek}
          workouts={[...weekWorkouts, ...mockWeekWorkouts]}
          onWorkoutClick={handleWorkoutClick}
          onDropWorkout={handleDropWorkout}
        />

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
      <LoadCalculatorPopover
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        weekWorkouts={[...weekWorkouts, ...mockWeekWorkouts].map((w) => ({
          id: w.id,
          name: w.name,
          duration: w.duration,
          intensity: w.intensity,
          modality: w.modality,
          type: w.type,
        }))}
        athleteProfile={{
          level: athlete.level,
          ftp: athlete.ftp,
          pace_threshold: athlete.pace_threshold,
        }}
        onApplySuggestions={(adjustments) => {
          console.log('Applying load adjustments:', adjustments);
          setIsCalculatorOpen(false);
        }}
      />
    </div>
  );
}
