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
import type { WorkoutSlot } from '../types/flow';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('SlotCard');

interface SlotCardProps {
  slot: WorkoutSlot;
  onToggleComplete?: (slotId: string, isCompleted: boolean) => void;
  className?: string;
}

export function SlotCard({ slot, onToggleComplete, className = '' }: SlotCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState(slot.athlete_feedback || '');

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

      log.info('Completion toggled', { slotId: slot.id, isCompleted: checked });
    } catch (error) {
      log.error('Error toggling completion:', error);
      // TODO: Show error notification
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveFeedback = async () => {
    if (!feedback.trim()) {
      setShowFeedback(false);
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await WorkoutSlotService.toggleSlotCompletion(
        slot.id,
        slot.completed,
        feedback
      );

      if (error) throw error;

      setShowFeedback(false);
      log.info('Feedback saved', { slotId: slot.id });
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
        <div className="mt-2 pt-2 border-t border-ceramic-border">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="How did this workout feel?"
            className="w-full px-2 py-1 text-xs bg-ceramic-cool/30 border border-ceramic-border rounded focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50 resize-none"
            rows={2}
          />
          <div className="flex items-center justify-end gap-2 mt-1">
            <button
              onClick={() => {
                setFeedback(slot.athlete_feedback || '');
                setShowFeedback(false);
              }}
              className="px-2 py-1 text-xs text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveFeedback}
              disabled={isLoading || !feedback.trim()}
              className="px-2 py-1 text-xs bg-ceramic-accent text-white rounded hover:bg-ceramic-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
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
      {slot.athlete_feedback && !showFeedback && (
        <div className="mt-2 pt-2 border-t border-ceramic-border">
          <p className="text-xs text-ceramic-text-secondary italic">{slot.athlete_feedback}</p>
        </div>
      )}
    </div>
  );
}
