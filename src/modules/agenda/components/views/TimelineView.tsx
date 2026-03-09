/**
 * TimelineView — "Agenda" mode rendering
 *
 * Renders the daily timeline with NextTwoDaysView, QuickAdd, AgendaTimeline,
 * and CompletedTasksSection. Used for both desktop and mobile "agenda" mode.
 */

import React from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import { NextTwoDaysView } from '@/components/features/NextTwoDaysView';
import { AgendaTimeline } from '@/modules/agenda/components/calendar';
import { TaskCreationQuickAdd } from '@/modules/agenda/components/editors';
import { CompletedTasksSection } from '@/modules/agenda/components/shared';
import { notificationService } from '@/services/notificationService';
import type { Task } from '@/types';
import type { WeatherData } from '@/lib/external-api';

const log = createNamespacedLogger('TimelineView');

interface TimelineRestOfDayEvent {
  id: string;
  title: string;
  startTime: string;
  endTime?: string;
  type: 'event' | 'task';
  location?: string;
  color?: string;
  isCompleted?: boolean;
  checklist?: any;
}

interface NextTwoDaysEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
  location?: string;
  category: string;
  isToday: boolean;
  isTomorrow: boolean;
  timeUntil?: string;
  skipped: boolean;
  isTask?: boolean;
  isCompleted?: boolean;
  checklist?: any;
  is_urgent?: boolean;
  is_important?: boolean;
}

export interface TimelineViewProps {
  userId: string;
  nextTwoDaysEvents: NextTwoDaysEvent[];
  restOfDay: TimelineRestOfDayEvent[];
  completedTodayTasks: Task[];
  isLoadingCompleted: boolean;
  completingTaskIds: Set<string>;
  forecast?: WeatherData['forecast'] | null;
  onSkipEvent: (eventId: string) => void;
  onUnskipEvent: (eventId: string) => void;
  onTaskComplete: (taskId: string) => Promise<boolean>;
  onTaskCreated: () => void;
  onUncomplete: (taskId: string) => Promise<boolean>;
  /** Ref map for cancelling completion animation timers */
  completionTimers: React.MutableRefObject<Map<string, ReturnType<typeof setTimeout>>>;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  userId,
  nextTwoDaysEvents,
  restOfDay,
  completedTodayTasks,
  isLoadingCompleted,
  completingTaskIds,
  forecast,
  onSkipEvent,
  onUnskipEvent,
  onTaskComplete,
  onTaskCreated,
  onUncomplete,
  completionTimers,
}) => {
  return (
    <>
      {/* PROXIMOS 2 DIAS */}
      <section className="w-full">
        <NextTwoDaysView
          events={nextTwoDaysEvents}
          onSkipEvent={onSkipEvent}
          onUnskipEvent={onUnskipEvent}
          onTaskComplete={async (taskId: string) => { await onTaskComplete(taskId); }}
          completingTaskIds={completingTaskIds}
          forecast={forecast}
        />
      </section>

      {/* Quick Add de Tarefas */}
      <section className="w-full" data-tour="add-task-button">
        <TaskCreationQuickAdd
          userId={userId}
          onTaskCreated={onTaskCreated}
        />
      </section>

      {/* TIMELINE: Mais Tarde */}
      {restOfDay.length > 0 && (
        <section className="w-full">
          <h2 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-widest mb-4 ml-1">
            Mais Tarde
          </h2>
          <AgendaTimeline
            events={restOfDay}
            onEventClick={(eventId) => {
              log.debug('Event clicked:', eventId);
            }}
            onTaskToggle={async (taskId) => {
              log.debug('Task toggled:', taskId);
              await onTaskComplete(taskId);
            }}
          />
        </section>
      )}

      {/* Completed Tasks Section */}
      <section className="w-full">
        <CompletedTasksSection
          tasks={completedTodayTasks}
          onUncomplete={async (taskId: string) => {
            // Cancel pending removal timer if user uncompletes within animation window
            const pendingTimer = completionTimers.current.get(taskId);
            if (pendingTimer) {
              clearTimeout(pendingTimer);
              completionTimers.current.delete(taskId);
            }
            const success = await onUncomplete(taskId);
            if (success) {
              notificationService.show({
                type: 'success',
                title: 'Tarefa restaurada',
                message: 'A tarefa voltou para sua lista ativa',
                icon: '↩️',
                duration: 3000,
              });
            } else {
              notificationService.show({
                type: 'error',
                title: 'Erro ao restaurar',
                message: 'Nao foi possivel desfazer a conclusao. Tente novamente.',
                icon: '❌',
                duration: 5000,
              });
            }
          }}
          isLoading={isLoadingCompleted}
        />
      </section>
    </>
  );
};
