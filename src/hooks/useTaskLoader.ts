/**
 * useTaskLoader — Extracts task loading logic from AgendaView
 *
 * Provides matrixTasks (grouped by quadrant), allTasks (flat list for List/Kanban),
 * timelineTasks (for selected date), and allDueDateTasks (for NextTwoDaysView).
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type { Task, Quadrant } from '@/types';

const log = createNamespacedLogger('useTaskLoader');

interface UseTaskLoaderOptions {
  userId: string;
  selectedDate: Date;
}

export function useTaskLoader({ userId, selectedDate }: UseTaskLoaderOptions) {
  const [matrixTasks, setMatrixTasks] = useState<Record<Quadrant, Task[]>>({
    'urgent-important': [],
    'important': [],
    'urgent': [],
    'low': [],
  });
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [timelineTasks, setTimelineTasks] = useState<Task[]>([]);
  const [allDueDateTasks, setAllDueDateTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAllTasks = useCallback(async (
    forDate?: Date,
    { silent = false }: { silent?: boolean } = {},
  ) => {
    try {
      if (!silent) setIsLoading(true);
      const targetDate = forDate || selectedDate;
      const dateStr = targetDate.toISOString().split('T')[0];

      log.debug('Loading tasks for:', dateStr);

      const { data, error } = await supabase
        .from('work_items')
        .select(`
          id,
          title,
          description,
          due_date,
          priority_quadrant,
          is_urgent,
          is_important,
          estimated_duration,
          scheduled_time,
          completed_at,
          priority,
          task_type,
          checklist,
          status,
          tags,
          created_at,
          archived,
          recurrence_rule,
          associations(name)
        `)
        .is('completed_at', null)
        .eq('archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const matrix: Record<Quadrant, Task[]> = {
        'urgent-important': [],
        'important': [],
        'urgent': [],
        'low': [],
      };
      const timeline: Task[] = [];
      const flat: Task[] = [];

      data?.forEach((task: any) => {
        flat.push(task);

        if (task.due_date === dateStr) {
          timeline.push(task);
        } else {
          let quadrant: Quadrant = 'low';
          if (task.is_urgent && task.is_important) {
            quadrant = 'urgent-important';
          } else if (!task.is_urgent && task.is_important) {
            quadrant = 'important';
          } else if (task.is_urgent && !task.is_important) {
            quadrant = 'urgent';
          }
          matrix[quadrant].push(task);
        }
      });

      setMatrixTasks(matrix);
      setTimelineTasks(timeline);
      setAllTasks(flat);
      setAllDueDateTasks((data || []).filter((t: any) => t.due_date));
    } catch (error) {
      log.error('Error loading tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  return {
    matrixTasks,
    setMatrixTasks,
    allTasks,
    timelineTasks,
    setTimelineTasks,
    allDueDateTasks,
    setAllDueDateTasks,
    isLoading,
    loadAllTasks,
  };
}
