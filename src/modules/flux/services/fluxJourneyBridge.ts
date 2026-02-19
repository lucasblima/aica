/**
 * Flux ↔ Journey Bridge
 *
 * Loose coupling: uses Supabase client directly to insert into the `moments` table
 * when a workout is completed. This captures training events in the coach's
 * Journey timeline as body-awareness / coaching consciousness moments.
 *
 * The moment is created for the COACH's user_id (tracking coaching activity).
 */

import { supabase } from '@/services/supabaseClient';
import type { WorkoutSlot } from '../types/flow';
import type { Athlete } from '../types/flux';

/**
 * Maps workout intensity to an emotion value.
 * Uses normalized emotion values from the moments table.
 */
function mapIntensityToEmotion(slot: WorkoutSlot): string {
  const rpe = slot.completion_data?.rpe_actual ?? slot.rpe;

  if (rpe !== undefined) {
    if (rpe >= 8) return 'determined';
    if (rpe >= 6) return 'excited';
    if (rpe >= 4) return 'calm';
    return 'grateful';
  }

  // Fallback to intensity level
  switch (slot.intensity) {
    case 'high':
      return 'determined';
    case 'medium':
      return 'excited';
    case 'low':
      return 'calm';
    default:
      return 'excited';
  }
}

/**
 * Builds a Portuguese content summary for the training moment.
 */
function buildMomentContent(slot: WorkoutSlot, athlete: Athlete): string {
  const actual = slot.completion_data?.duration_actual;
  const duration = actual ?? slot.duration;
  const notes = slot.completion_data?.notes;

  let content = `Treino supervisionado: ${athlete.name} completou "${slot.name}" (${slot.modality}, ${duration}min, ${slot.intensity})`;

  if (notes) {
    content += `. Obs: ${notes.substring(0, 120)}`;
  }

  return content;
}

/**
 * Creates a Journey moment when a workout slot is completed.
 *
 * Stores workout metadata in `sentiment_data` JSONB (the only flexible
 * column available on the remote `moments` table). Uses `type='text'`
 * since the CHECK constraint only allows 'audio'|'text'|'both'.
 *
 * This function is non-blocking — errors are logged but never propagated.
 */
export async function createTrainingMoment(
  slot: WorkoutSlot,
  athlete: Athlete
): Promise<{ success: boolean; error?: string }> {
  try {
    const emotion = mapIntensityToEmotion(slot);
    const content = buildMomentContent(slot, athlete);

    const { error } = await supabase.from('moments').insert({
      user_id: slot.user_id,
      type: 'text',
      content,
      emotion,
      tags: ['flux', 'treino', slot.modality],
      sentiment_data: {
        source: 'flux',
        workout_slot_id: slot.id,
        athlete_id: athlete.id,
        athlete_name: athlete.name,
        modality: slot.modality,
        intensity: slot.intensity,
        duration: slot.duration,
        duration_actual: slot.completion_data?.duration_actual,
        rpe_actual: slot.completion_data?.rpe_actual,
      },
    });

    if (error) {
      console.error('[FluxJourneyBridge] Error creating training moment:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[FluxJourneyBridge] Unexpected error:', message);
    return { success: false, error: message };
  }
}

// Legacy export for backward compatibility with barrel
export const recordWorkoutCompletion = createTrainingMoment;
