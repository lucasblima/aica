/**
 * Quest Engine Service — Trigger quest generation and manage quest lifecycle.
 */

import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('QuestEngineService');

export class QuestEngineService {
  /**
   * Manually trigger quest generation for the current user's personas.
   */
  static async generateQuests(): Promise<{
    success: boolean;
    processed?: number;
    generated?: number;
    error?: string;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Not authenticated' };

      const { data, error } = await supabase.functions.invoke('generate-entity-quests', {
        body: { user_id: user.id },
      });

      if (error) throw error;
      return {
        success: data?.success ?? false,
        processed: data?.processed,
        generated: data?.generated,
        error: data?.error,
      };
    } catch (err) {
      log.error('Failed to generate quests', { err });
      return { success: false, error: (err as Error).message };
    }
  }

  /**
   * Create a manual (user-created) quest for a persona.
   */
  static async createManualQuest(input: {
    persona_id: string;
    title: string;
    description?: string;
    quest_type?: string;
    priority?: string;
    xp_reward?: number;
    due_date?: string;
    estimated_minutes?: number;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('entity_quests').insert({
        ...input,
        generated_by: 'user',
        status: 'accepted',
      });

      if (error) throw error;
      return { success: true };
    } catch (err) {
      log.error('Failed to create manual quest', { err });
      return { success: false, error: (err as Error).message };
    }
  }
}
