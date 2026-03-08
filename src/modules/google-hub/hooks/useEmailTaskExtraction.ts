/**
 * Hook for email task extraction and Atlas integration.
 *
 * Extracts actionable tasks from emails and allows accepting them
 * into Atlas (work_items table) or dismissing them.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/services/supabaseClient';
import {
  extractTasksFromEmails,
  getExtractedTasks,
  acceptTask as acceptTaskService,
  dismissTask as dismissTaskService,
} from '../services/emailIntelligenceService';
import type { ExtractedTask } from '../types';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('useEmailTaskExtraction');

interface UseEmailTaskExtractionReturn {
  tasks: ExtractedTask[];
  loading: boolean;
  extracting: boolean;
  error: string | null;
  extractFromMessages: (messageIds: string[]) => Promise<void>;
  acceptTask: (taskId: string) => Promise<boolean>;
  dismissTask: (taskId: string) => Promise<boolean>;
  pendingTasks: ExtractedTask[];
  refresh: () => Promise<void>;
}

export function useEmailTaskExtraction(): UseEmailTaskExtractionReturn {
  const [tasks, setTasks] = useState<ExtractedTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await getExtractedTasks();
      setTasks(results);
    } catch (err) {
      log.error('[fetchTasks]', { error: err });
      setError('Erro ao carregar tarefas extraídas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const extractFromMessages = useCallback(async (messageIds: string[]) => {
    setExtracting(true);
    setError(null);
    try {
      const result = await extractTasksFromEmails(messageIds);
      if (result.error) {
        setError(result.error);
      } else {
        await fetchTasks();
      }
    } catch (err) {
      log.error('[extractFromMessages]', { error: err });
      setError('Erro ao extrair tarefas');
    } finally {
      setExtracting(false);
    }
  }, [fetchTasks]);

  const acceptTask = useCallback(async (taskId: string): Promise<boolean> => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return false;

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        setError('Usuário não autenticado');
        return false;
      }

      // Create work_item in Atlas
      const { data: workItem, error: insertError } = await supabase
        .from('work_items')
        .insert({
          user_id: userId,
          title: task.task_description,
          description: task.source_subject
            ? `Extraído do email: ${task.source_subject} (de ${task.source_sender ?? 'desconhecido'})`
            : null,
          due_date: task.due_date,
          priority: task.priority === 'urgent' ? 'high' : task.priority,
          is_urgent: task.priority === 'urgent' || task.priority === 'high',
          is_important: task.priority === 'urgent' || task.priority === 'high',
          status: 'todo',
          archived: false,
        })
        .select('id')
        .single();

      if (insertError || !workItem) {
        log.error('[acceptTask] Insert work_item error:', { error: insertError });
        setError('Erro ao criar tarefa no Atlas');
        return false;
      }

      // Link extracted task to the work_item
      const success = await acceptTaskService(taskId, workItem.id);
      if (success) {
        setTasks(prev => prev.map(t =>
          t.id === taskId ? { ...t, status: 'accepted' as const, work_item_id: workItem.id } : t
        ));
      }
      return success;
    } catch (err) {
      log.error('[acceptTask] Exception:', { error: err });
      setError('Erro ao aceitar tarefa');
      return false;
    }
  }, [tasks]);

  const dismissTask = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const success = await dismissTaskService(taskId);
      if (success) {
        setTasks(prev => prev.map(t =>
          t.id === taskId ? { ...t, status: 'dismissed' as const } : t
        ));
      }
      return success;
    } catch (err) {
      log.error('[dismissTask] Exception:', { error: err });
      setError('Erro ao descartar tarefa');
      return false;
    }
  }, []);

  const pendingTasks = useMemo(
    () => tasks.filter(t => t.status === 'pending'),
    [tasks],
  );

  return {
    tasks,
    loading,
    extracting,
    error,
    extractFromMessages,
    acceptTask,
    dismissTask,
    pendingTasks,
    refresh: fetchTasks,
  };
}
