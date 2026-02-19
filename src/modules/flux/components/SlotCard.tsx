/**
 * SlotCard - Interactive workout slot with completion tracking
 *
 * Features:
 * - Checkbox for completion toggle
 * - Optimistic UI updates
 * - Real-time sync via useWorkoutSlots subscription
 * - Optional feedback input
 */

import React, { useState } from 'react';
import { Check, MessageCircle, Clock, Zap } from 'lucide-react';
import { WorkoutSlotService } from '../services';
import { supabase } from '@/services/supabaseClient';
import type { WorkoutSlot } from '../types/flow';
import { createNamespacedLogger } from '@/lib/logger';
import { useFluxGamification } from '../hooks/useFluxGamification';

const log = createNamespacedLogger('SlotCard');

interface SlotCardProps {
  slot: WorkoutSlot;
  onToggleComplete?: (slotId: string, isCompleted: boolean) => void;
  className?: string;
}

export function SlotCard({ slot, onToggleComplete, className = '' }: SlotCardProps) {
  const { trackWorkoutSupervised, trackFeedbackReviewed } = useFluxGamification();
  const [isLoading, setIsLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState(slot.athlete_feedback || '');
  const [rpe, setRpe] = useState<number>(slot.completion_data?.rpe_actual ?? slot.rpe ?? 5);
  const [actualDuration, setActualDuration] = useState<number>(
    slot.completion_data?.duration_actual ?? slot.duration ?? 0
  );

  const handleToggleCompletion = async (checked: boolean) => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      const { error } = await WorkoutSlotService.toggleSlotCompletion(
        slot.id,
        checked,
        checked && feedback ? feedback : undefined
      );

      if (error) throw error;

      // Callback for optimistic UI (optional - real-time subscription will update anyway)
      onToggleComplete?.(slot.id, checked);

      // Award XP when coach marks workout as completed (non-blocking)
      if (checked) {
        trackWorkoutSupervised().catch(() => {});
      }

      log.info('Completion toggled', { slotId: slot.id, isCompleted: checked });
    } catch (error) {
      log.error('Error toggling completion:', error);
      // TODO: Show error notification
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveFeedback = async () => {
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('workout_slots')
        .update({
          athlete_feedback: feedback.trim() || null,
          rpe,
          completion_data: {
            rpe_actual: rpe,
            duration_actual: actualDuration || null,
            notes: feedback.trim() || null,
          },
        })
        .eq('id', slot.id);

      if (error) throw error;

      setShowFeedback(false);

      // Award XP for reviewing feedback (non-blocking)
      trackFeedbackReviewed().catch(() => {});

      log.info('Feedback saved', { slotId: slot.id, rpe, actualDuration });
    } catch (error) {
      log.error('Error saving feedback:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`group relative ceramic-card p-3 transition-all duration-200 ${
        slot.completed ? 'border-l-4 border-ceramic-success' : ''
      } ${className}`}
    >
      {/* Completion Checkbox */}
      <div className="flex items-start gap-2 mb-2">
        <label className="relative flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={slot.completed}
            onChange={(e) => handleToggleCompletion(e.target.checked)}
            disabled={isLoading}
            className="sr-only peer"
          />
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
              slot.completed
                ? 'bg-ceramic-success border-ceramic-success'
                : 'border-ceramic-text-secondary/30 hover:border-ceramic-accent'
            } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
          >
            {slot.completed && <Check className="w-3 h-3 text-white" />}
          </div>
        </label>

        <div className="flex-1 min-w-0">
          {/* Workout Name */}
          <p
            className={`text-sm font-medium transition-all ${
              slot.completed
                ? 'text-ceramic-text-secondary line-through'
                : 'text-ceramic-text-primary'
            }`}
          >
            {slot.name}
          </p>

          {/* Metadata */}
          <div className="flex items-center gap-3 mt-1 text-xs text-ceramic-text-secondary">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {slot.duration}min
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {slot.intensity}
            </span>
          </div>
        </div>

        {/* Feedback Button */}
        <button
          onClick={() => setShowFeedback(!showFeedback)}
          className={`p-1 rounded transition-colors ${
            slot.athlete_feedback
              ? 'text-ceramic-accent bg-ceramic-accent/10'
              : 'text-ceramic-text-secondary hover:text-ceramic-accent hover:bg-ceramic-accent/5'
          }`}
          title={slot.athlete_feedback ? 'Edit feedback' : 'Add feedback'}
        >
          <MessageCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Feedback Input (Expandable) */}
      {showFeedback && (
        <div className="mt-2 pt-2 border-t border-ceramic-border space-y-3">
          {/* RPE Slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-ceramic-text-primary">
                Esforço (RPE)
              </label>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                rpe <= 3
                  ? 'bg-ceramic-success/20 text-ceramic-success'
                  : rpe <= 6
                    ? 'bg-amber-500/20 text-amber-600'
                    : 'bg-ceramic-error/20 text-ceramic-error'
              }`}>
                {rpe}/10
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={rpe}
              onChange={(e) => setRpe(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-amber-500"
              style={{
                background: `linear-gradient(to right, #22c55e 0%, #22c55e 22%, #f59e0b 44%, #f59e0b 55%, #ef4444 77%, #ef4444 100%)`,
              }}
            />
            <div className="flex justify-between mt-0.5">
              <span className="text-[10px] text-ceramic-text-secondary">Muito fácil</span>
              <span className="text-[10px] text-ceramic-text-secondary">Moderado</span>
              <span className="text-[10px] text-ceramic-text-secondary">Máximo esforço</span>
            </div>
          </div>

          {/* Actual Duration */}
          <div>
            <label className="text-xs font-bold text-ceramic-text-primary mb-1 block">
              Duração real
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={600}
                value={actualDuration || ''}
                onChange={(e) => setActualDuration(Number(e.target.value))}
                placeholder={String(slot.duration || 0)}
                className="w-16 px-2 py-1 text-xs text-center bg-ceramic-cool/30 border border-ceramic-border rounded focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
              />
              <span className="text-[10px] text-ceramic-text-secondary">min</span>
              {actualDuration > 0 && slot.duration > 0 && actualDuration !== slot.duration && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  actualDuration > slot.duration
                    ? 'bg-ceramic-info/20 text-ceramic-info'
                    : 'bg-ceramic-warning/20 text-ceramic-warning'
                }`}>
                  {actualDuration > slot.duration
                    ? `+${actualDuration - slot.duration}min`
                    : `${actualDuration - slot.duration}min`
                  }
                </span>
              )}
            </div>
          </div>

          {/* Notes */}
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Como foi o treino? Sensações, dificuldades..."
            className="w-full px-2 py-1 text-xs bg-ceramic-cool/30 border border-ceramic-border rounded focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50 resize-none"
            rows={2}
          />
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => {
                setFeedback(slot.athlete_feedback || '');
                setRpe(slot.completion_data?.rpe_actual ?? slot.rpe ?? 5);
                setActualDuration(slot.completion_data?.duration_actual ?? slot.duration ?? 0);
                setShowFeedback(false);
              }}
              className="px-2 py-1 text-xs text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveFeedback}
              disabled={isLoading}
              className="px-2 py-1 text-xs bg-ceramic-accent text-white rounded hover:bg-ceramic-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Salvar
            </button>
          </div>
        </div>
      )}

      {/* Completed Timestamp */}
      {slot.completed && slot.completed_at && (
        <p className="text-[10px] text-ceramic-text-secondary mt-2">
          Completed {new Date(slot.completed_at).toLocaleDateString('pt-BR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      )}

      {/* Existing Feedback Display */}
      {(slot.athlete_feedback || slot.rpe || slot.completion_data?.rpe_actual) && !showFeedback && (
        <div className="mt-2 pt-2 border-t border-ceramic-border space-y-1">
          {(slot.rpe || slot.completion_data?.rpe_actual) && (
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                (slot.completion_data?.rpe_actual ?? slot.rpe ?? 0) <= 3
                  ? 'bg-ceramic-success/20 text-ceramic-success'
                  : (slot.completion_data?.rpe_actual ?? slot.rpe ?? 0) <= 6
                    ? 'bg-amber-500/20 text-amber-600'
                    : 'bg-ceramic-error/20 text-ceramic-error'
              }`}>
                RPE {slot.completion_data?.rpe_actual ?? slot.rpe}/10
              </span>
              {slot.completion_data?.duration_actual && (
                <span className="text-[10px] text-ceramic-text-secondary">
                  {slot.completion_data.duration_actual}min
                </span>
              )}
            </div>
          )}
          {slot.athlete_feedback && (
            <p className="text-xs text-ceramic-text-secondary italic">{slot.athlete_feedback}</p>
          )}
        </div>
      )}
    </div>
  );
}
