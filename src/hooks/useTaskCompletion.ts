/**
 * useTaskCompletion — Centralizes task completion/uncomplete logic
 *
 * Handles: DB update, animation state, recurrence (next occurrence),
 * Google Calendar unsync, and loading completed-today tasks.
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/services/supabaseClient';
import { isGoogleCalendarConnected } from '@/services/googleAuthService';
import { unsyncEntityFromGoogle } from '@/services/calendarSyncService';
import { generateNextOccurrence } from '@/services/taskRecurrenceService';
import { createNamespacedLogger } from '@/lib/logger';
import type { Task } from '@/types';

const log = createNamespacedLogger('useTaskCompletion');

interface UseTaskCompletionOptions {
  onRefresh: () => void;
}

export function useTaskCompletion({ onRefresh }: UseTaskCompletionOptions) {
  const [completingTaskIds, setCompletingTaskIds] = useState<Set<string>>(new Set());
  const [completedTodayTasks, setCompletedTodayTasks] = useState<Task[]>([]);
  const [isLoadingCompleted, setIsLoadingCompleted] = useState(false);
  const completingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const isCompleting = useCallback(
    (taskId: string) => completingTaskIds.has(taskId),
    [completingTaskIds]
  );

  /**
   * Mark a task as complete: update DB, animate, handle recurrence, unsync calendar.
   */
  const handleComplete = useCallback(async (taskId: string) => {
    const now = new Date().toISOString();

    // Update DB — set ALL completion-related fields for consistency
    const { data: updatedTask, error } = await supabase
      .from('work_items')
      .update({
        completed_at: now,
        is_completed: true,
        status: 'completed',
      })
      .eq('id', taskId)
      .select('*')
      .single();

    if (error) {
      log.error('Error completing task:', { error });
      return;
    }

    log.debug('Task completed:', taskId);

    // Add to animation set
    setCompletingTaskIds(prev => new Set(prev).add(taskId));

    // Clear animation after 1.5s
    const timer = setTimeout(() => {
      setCompletingTaskIds(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
      completingTimers.current.delete(taskId);
    }, 1500);
    completingTimers.current.set(taskId, timer);

    // Add to completedToday list
    if (updatedTask) {
      setCompletedTodayTasks(prev => [updatedTask as Task, ...prev]);
    }

    // Handle recurrence: create next occurrence if task has recurrence_rule
    if (updatedTask?.recurrence_rule) {
      try {
        const startDate = updatedTask.due_date
          ? new Date(updatedTask.due_date)
          : new Date();
        const nextDate = generateNextOccurrence(startDate, updatedTask.recurrence_rule);

        if (nextDate) {
          // Check if a future occurrence already exists
          const { data: existing } = await supabase
            .from('work_items')
            .select('id')
            .eq('user_id', updatedTask.user_id)
            .eq('title', updatedTask.title)
            .eq('recurrence_rule', updatedTask.recurrence_rule)
            .is('completed_at', null)
            .gte('due_date', new Date().toISOString().split('T')[0])
            .limit(1);

          if (!existing || existing.length === 0) {
            const { error: insertError } = await supabase
              .from('work_items')
              .insert({
                user_id: updatedTask.user_id,
                title: updatedTask.title,
                description: updatedTask.description,
                is_urgent: updatedTask.is_urgent,
                is_important: updatedTask.is_important,
                recurrence_rule: updatedTask.recurrence_rule,
                tags: updatedTask.tags,
                estimated_duration: updatedTask.estimated_duration,
                due_date: nextDate.toISOString().split('T')[0],
                status: 'pending',
              });

            if (insertError) {
              log.error('Error creating next recurrence:', { insertError });
            } else {
              log.debug('Created next occurrence for recurring task:', {
                taskId,
                nextDate: nextDate.toISOString(),
              });
            }
          }
        }
      } catch (recErr) {
        log.error('Error handling recurrence:', { recErr });
      }
    }

    // Unsync from Google Calendar (non-blocking)
    isGoogleCalendarConnected().then((connected) => {
      if (!connected) return;
      unsyncEntityFromGoogle('atlas', taskId).catch((err) =>
        log.warn('Calendar unsync failed for completed task:', err)
      );
    });

    onRefresh();
  }, [onRefresh]);

  /**
   * Undo a task completion: clear completed_at, remove from completedToday list.
   */
  const handleUncomplete = useCallback(async (taskId: string) => {
    const { error } = await supabase
      .from('work_items')
      .update({
        completed_at: null,
        is_completed: false,
        status: 'pending',
      })
      .eq('id', taskId);

    if (error) {
      log.error('Error uncompleting task:', { error });
      return;
    }

    log.debug('Task uncompleted:', taskId);

    // Remove from completedToday list
    setCompletedTodayTasks(prev => prev.filter(t => t.id !== taskId));

    onRefresh();
  }, [onRefresh]);

  /**
   * Load tasks completed today from DB.
   */
  const loadCompletedToday = useCallback(async () => {
    setIsLoadingCompleted(true);
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('work_items')
        .select('*')
        .gte('completed_at', todayStart.toISOString())
        .order('completed_at', { ascending: false });

      if (error) {
        log.error('Error loading completed tasks:', { error });
        return;
      }

      setCompletedTodayTasks((data || []) as Task[]);
    } finally {
      setIsLoadingCompleted(false);
    }
  }, []);

  return {
    completingTaskIds,
    completedTodayTasks,
    isLoadingCompleted,
    isCompleting,
    handleComplete,
    handleUncomplete,
    loadCompletedToday,
  };
}
