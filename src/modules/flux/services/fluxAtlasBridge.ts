/**
 * Flux ↔ Atlas Bridge
 *
 * Loose coupling: uses Supabase client directly to insert/update `work_items`
 * when microcycles are created or completed. This gives coaches visibility
 * of training blocks in the Atlas task management view.
 *
 * Uses `source='flux'` and `source_entity_id=microcycle.id` columns
 * to identify Flux-originated work_items.
 */

import { supabase } from '@/services/supabaseClient';
import type { Microcycle } from '../types/flow';
import type { Athlete } from '../types/flux';

/**
 * Creates a work_item in Atlas when a new microcycle is created.
 *
 * The task is non-blocking — errors are logged but never propagated.
 * Returns the created work_item ID for optional reference.
 */
export async function createMicrocycleTask(
  microcycle: Microcycle,
  athlete: Athlete
): Promise<{ data: { id: string } | null; error?: string }> {
  try {
    const title = `Acompanhar microciclo: ${athlete.name} - ${microcycle.name}`;
    const description = `Microciclo ${microcycle.start_date} a ${microcycle.end_date} para ${athlete.name} (${athlete.modality || 'geral'})`;

    const { data, error } = await supabase
      .from('work_items')
      .insert({
        user_id: microcycle.user_id,
        title,
        description,
        status: 'todo',
        priority: 'medium',
        due_date: microcycle.end_date,
        source: 'flux',
        source_entity_id: microcycle.id,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[FluxAtlasBridge] Error creating microcycle task:', error.message);
      return { data: null, error: error.message };
    }

    return { data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[FluxAtlasBridge] Unexpected error:', message);
    return { data: null, error: message };
  }
}

/**
 * Marks a microcycle-related work_item as completed in Atlas.
 *
 * Finds the work_item by source='flux' + source_entity_id=microcycleId,
 * then updates status to 'completed' and is_completed to true.
 */
export async function completeMicrocycleTask(
  microcycleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: items, error: findError } = await supabase
      .from('work_items')
      .select('id')
      .eq('source', 'flux')
      .eq('source_entity_id', microcycleId)
      .neq('status', 'completed')
      .limit(1);

    if (findError) {
      console.error('[FluxAtlasBridge] Error finding microcycle task:', findError.message);
      return { success: false, error: findError.message };
    }

    if (!items?.length) {
      // No matching task — may have been manually deleted, not an error
      return { success: true };
    }

    const { error: updateError } = await supabase
      .from('work_items')
      .update({
        status: 'completed',
        is_completed: true,
      })
      .eq('id', items[0].id);

    if (updateError) {
      console.error('[FluxAtlasBridge] Error completing microcycle task:', updateError.message);
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[FluxAtlasBridge] Unexpected error:', message);
    return { success: false, error: message };
  }
}
