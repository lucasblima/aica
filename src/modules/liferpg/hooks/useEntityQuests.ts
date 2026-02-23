/**
 * useEntityQuests — Load and manage quests for a persona
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type { EntityQuest, QuestStatus } from '../types/liferpg';

const log = createNamespacedLogger('useEntityQuests');

interface UseEntityQuestsOptions {
  personaId?: string;
  statusFilter?: QuestStatus[];
  autoLoad?: boolean;
}

interface UseEntityQuestsReturn {
  quests: EntityQuest[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  acceptQuest: (questId: string) => Promise<boolean>;
  completeQuest: (questId: string, notes?: string) => Promise<{ success: boolean; xpAwarded?: number; leveledUp?: boolean }>;
  skipQuest: (questId: string) => Promise<boolean>;
}

export function useEntityQuests({
  personaId,
  statusFilter,
  autoLoad = true,
}: UseEntityQuestsOptions = {}): UseEntityQuestsReturn {
  const [quests, setQuests] = useState<EntityQuest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQuests = useCallback(async () => {
    if (!personaId) return;
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('entity_quests')
        .select('*')
        .eq('persona_id', personaId)
        .order('priority', { ascending: false })
        .order('due_date', { ascending: true, nullsFirst: false });

      if (statusFilter && statusFilter.length > 0) {
        query = query.in('status', statusFilter);
      }

      const { data, error: queryError } = await query.limit(50);

      if (queryError) throw queryError;
      setQuests(data || []);
    } catch (err) {
      log.error('Failed to load quests', { err });
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [personaId, statusFilter]);

  const acceptQuest = useCallback(async (questId: string): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('entity_quests')
        .update({ status: 'accepted' })
        .eq('id', questId);

      if (updateError) throw updateError;

      setQuests((prev) =>
        prev.map((q) => (q.id === questId ? { ...q, status: 'accepted' as QuestStatus } : q))
      );
      return true;
    } catch (err) {
      log.error('Failed to accept quest', { err });
      return false;
    }
  }, []);

  const completeQuest = useCallback(
    async (questId: string, notes?: string) => {
      try {
        const { data, error: rpcError } = await supabase.rpc('complete_entity_quest', {
          p_quest_id: questId,
          p_completion_notes: notes || null,
          p_completion_photos: '[]',
        });

        if (rpcError) throw rpcError;
        if (!data?.success) throw new Error(data?.error || 'Failed to complete quest');

        // Update local state
        setQuests((prev) =>
          prev.map((q) =>
            q.id === questId
              ? { ...q, status: 'completed' as QuestStatus, completed_at: new Date().toISOString() }
              : q
          )
        );

        return {
          success: true,
          xpAwarded: data.xp_awarded,
          leveledUp: data.leveled_up,
        };
      } catch (err) {
        log.error('Failed to complete quest', { err });
        return { success: false };
      }
    },
    []
  );

  const skipQuest = useCallback(async (questId: string): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('entity_quests')
        .update({ status: 'skipped' })
        .eq('id', questId);

      if (updateError) throw updateError;

      setQuests((prev) =>
        prev.map((q) => (q.id === questId ? { ...q, status: 'skipped' as QuestStatus } : q))
      );
      return true;
    } catch (err) {
      log.error('Failed to skip quest', { err });
      return false;
    }
  }, []);

  useEffect(() => {
    if (autoLoad && personaId) {
      loadQuests();
    }
  }, [autoLoad, personaId, loadQuests]);

  return { quests, loading, error, reload: loadQuests, acceptQuest, completeQuest, skipQuest };
}
