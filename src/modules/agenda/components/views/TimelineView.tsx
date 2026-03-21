/**
 * TimelineView — "Agenda" mode rendering
 *
 * Renders the daily timeline with NextTwoDaysView, QuickAdd, AgendaTimeline,
 * and CompletedTasksSection. Used for both desktop and mobile "agenda" mode.
 */

import React, { useState } from 'react';
import { LayoutTemplate } from 'lucide-react';
import { createNamespacedLogger } from '@/lib/logger';
import { NextTwoDaysView } from '@/components/features/NextTwoDaysView';
import { AgendaTimeline } from '@/modules/agenda/components/calendar';
import { TaskCreationQuickAdd, TemplateSelector, EventDetailModal } from '@/modules/agenda/components/editors';
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
  description?: string;
  isCompleted?: boolean;
  checklist?: any;
  source?: string;
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
  lastSyncTime?: Date | null;
  isCalendarConnected?: boolean;
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
  lastSyncTime,
  isCalendarConnected,
}) => {
  const [isTemplateSelectorOpen, setIsTemplateSelectorOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<TimelineRestOfDayEvent | null>(null);

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

      {/* Quick Add de Tarefas + Rotinas */}
      <section className="w-full space-y-2" data-tour="add-task-button">
        <TaskCreationQuickAdd
          userId={userId}
          onTaskCreated={onTaskCreated}
        />
        <button
          type="button"
          onClick={() => setIsTemplateSelectorOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2 text-ceramic-text-secondary hover:text-amber-600 transition-colors text-sm font-medium"
        >
          <LayoutTemplate className="w-4 h-4" />
          Modelos de Rotina
        </button>
      </section>

      <TemplateSelector
        isOpen={isTemplateSelectorOpen}
        onClose={() => setIsTemplateSelectorOpen(false)}
        userId={userId}
        onApplied={onTaskCreated}
      />

      {/* TIMELINE: Mais Tarde */}
      {restOfDay.length > 0 && (
        <section className="w-full">
          <h2 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-widest mb-4 ml-1">
            Mais Tarde
          </h2>
          {isCalendarConnected && lastSyncTime && (
            <div className="flex items-center gap-2 px-1 mb-2">
              <div className="w-2 h-2 rounded-full bg-ceramic-success animate-pulse" />
              <span className="text-xs text-ceramic-text-secondary">
                Sincronizado {lastSyncTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
          <AgendaTimeline
            events={restOfDay}
            onEventClick={(eventId) => {
              const event = restOfDay.find(e => e.id === eventId && e.type === 'event');
              if (event) setSelectedEvent(event);
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
                message: 'Não foi possível desfazer a conclusão. Tente novamente.',
                icon: '❌',
                duration: 5000,
              });
            }
          }}
          isLoading={isLoadingCompleted}
        />
      </section>

      <EventDetailModal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        event={selectedEvent ? {
          title: selectedEvent.title,
          startTime: selectedEvent.startTime,
          endTime: selectedEvent.endTime,
          description: selectedEvent.description,
          location: selectedEvent.location,
          color: selectedEvent.color,
          source: selectedEvent.source || 'manual',
        } : null}
      />
    </>
  );
};
