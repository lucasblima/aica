/**
 * WorkoutBlock - Reusable workout card component
 *
 * Follows PRD design spec exactly:
 * - Border with accent line (modality color)
 * - GripVertical on hover
 * - Click to edit
 * - Drag support (visual mockup)
 */

import React from 'react';
import { GripVertical, Activity } from 'lucide-react';
import type { TrainingModality } from '../../types';
import type { WorkoutIntensity } from '../../mockData/workoutTemplates';

export interface WorkoutBlockData {
  id: string;
  name: string;
  duration: number; // minutes
  intensity: WorkoutIntensity;
  modality: TrainingModality;
  type?: string; // ex: "RUN", "SWIM", "CYCLE", "STRENGTH"
  category?: 'warmup' | 'main' | 'cooldown';
  sets?: number;
  reps?: string;
  rest?: string;
  notes?: string;
  ftp_percentage?: number;
  pace_zone?: string;
  css_percentage?: number;
}

interface WorkoutBlockProps {
  workout: WorkoutBlockData;
  onClick?: () => void;
  onDragStart?: (workout: WorkoutBlockData) => void;
  variant?: 'default' | 'compact'; // compact = mini card in grid
}

const MODALITY_COLORS: Record<TrainingModality, string> = {
  swimming: 'bg-blue-400',
  running: 'bg-orange-400',
  cycling: 'bg-emerald-400',
  strength: 'bg-purple-400',
  walking: 'bg-sky-400',
};

const MODALITY_LABELS: Record<TrainingModality, string> = {
  swimming: 'Natacao',
  running: 'Corrida',
  cycling: 'Ciclismo',
  strength: 'Musculacao',
  walking: 'Caminhada',
};

const INTENSITY_LABELS: Record<WorkoutIntensity, string> = {
  low: 'Leve',
  medium: 'Média',
  high: 'Alta',
};

export const WorkoutBlock: React.FC<WorkoutBlockProps> = ({
  workout,
  onClick,
  onDragStart,
  variant = 'default',
}) => {
  const accentColor = MODALITY_COLORS[workout.modality];

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('workoutId', workout.id);
    onDragStart?.(workout);
    console.log('Dragging workout:', workout.name);
  };

  if (variant === 'compact') {
    return <CompactCard workout={workout} onClick={onClick} accentColor={accentColor} />;
  }

  return (
    <div
      onClick={onClick}
      draggable
      onDragStart={handleDragStart}
      className="group relative flex flex-col gap-2 rounded-lg border border-ceramic-border bg-ceramic-base p-3 shadow-sm transition-all hover:border-ceramic-border hover:shadow-md cursor-grab active:cursor-grabbing"
    >
      {/* Header: Type + Grip */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ceramic-text-secondary">
          <Activity size={12} className="text-ceramic-text-secondary" />
          {MODALITY_LABELS[workout.modality] || workout.modality}
        </span>
        <GripVertical
          size={14}
          className="text-ceramic-border opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </div>

      {/* Title */}
      <div>
        <h4 className="font-medium text-ceramic-text-primary">{workout.name}</h4>
        <p className="text-sm text-ceramic-text-secondary mt-0.5">
          {workout.duration} min • Int: {INTENSITY_LABELS[workout.intensity]}
        </p>
      </div>

      {/* Technical Details (if available) */}
      {workout.sets && workout.reps && (
        <div className="text-xs text-ceramic-text-secondary pt-2 border-t border-ceramic-border/50">
          {workout.sets}x {workout.reps}
          {workout.rest && workout.rest !== '0' && ` • ${workout.rest} rest`}
        </div>
      )}

      {/* Notes Preview (if available) */}
      {workout.notes && (
        <div className="text-xs text-ceramic-text-secondary italic pt-2 border-t border-ceramic-border/50 line-clamp-2">
          {workout.notes}
        </div>
      )}

      {/* Accent Line (left border) */}
      <div
        className={`absolute left-0 top-2 h-8 w-1 rounded-r ${accentColor}`}
        style={{ opacity: 0.8 }}
      />
    </div>
  );
};

// ============================================
// Compact Variant (for grid columns)
// ============================================

interface CompactCardProps {
  workout: WorkoutBlockData;
  onClick?: () => void;
  accentColor: string;
}

const CompactCard: React.FC<CompactCardProps> = ({ workout, onClick, accentColor }) => {
  return (
    <div
      onClick={onClick}
      className="relative flex flex-col gap-1.5 rounded-lg border border-ceramic-border bg-ceramic-base p-2.5 shadow-sm transition-all hover:border-ceramic-border hover:shadow-md cursor-pointer"
    >
      {/* Modality Badge */}
      <span className="text-[9px] font-bold uppercase tracking-wider text-ceramic-text-secondary">
        {MODALITY_LABELS[workout.modality] || workout.modality}
      </span>

      {/* Name */}
      <h5 className="text-xs font-semibold text-ceramic-text-primary leading-tight line-clamp-2">
        {workout.name}
      </h5>

      {/* Duration + Intensity */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-ceramic-text-secondary">{workout.duration} min</span>
        <span className="text-[9px] text-ceramic-text-secondary">•</span>
        <span className="text-[10px] text-ceramic-text-secondary">{INTENSITY_LABELS[workout.intensity]}</span>
      </div>

      {/* Accent Line (modality color) */}
      <div
        className={`absolute left-0 top-1.5 h-8 w-1 rounded-r ${accentColor}`}
        style={{ opacity: 0.8 }}
      />
    </div>
  );
};
