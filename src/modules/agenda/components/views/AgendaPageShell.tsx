/**
 * AgendaPageShell — Thin orchestrator for the "Meu Dia" page
 *
 * Manages mode state, hooks, DnD context, and swipe gestures.
 * Delegates ALL view rendering to child view components:
 *   - TimelineView (agenda mode)
 *   - ListView (list mode)
 *   - KanbanView (kanban mode)
 *   - MatrixView (matrix mode)
 *   - CalendarView (calendar mode)
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  CollisionDetection,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';

import { createNamespacedLogger } from '@/lib/logger';
import { supabase } from '@/services/supabaseClient';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { pageTransitionVariants } from '@/lib/animations/ceramic-motion';

import { CalendarStatusDot } from '@/components/ui/CalendarStatusDot';
import { AgendaModeToggle } from '@/modules/agenda/components/shared';
import type { AgendaMode } from '@/modules/agenda/components/shared';
import { TaskFilterBar } from '@/modules/agenda/components/shared';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { EisenhowerMatrix } from '@/components/features/visualizations';
import type { MatrixTask } from '@/components/features/visualizations';
import { detectEventCategory, calculateTimeUntil } from '@/components/features/NextTwoDaysView';

import { useTaskFilters } from '@/modules/agenda/hooks/useTaskFilters';
import { useTaskCompletion } from '@/modules/agenda/hooks/useTaskCompletion';
import { useGoogleCalendarEvents } from '@/modules/agenda/hooks/useGoogleCalendarEvents';
import { useFluxAgendaEvents } from '@/modules/flux/hooks/useFluxAgendaEvents';
import { useTourAutoStart } from '@/hooks/useTourAutoStart';
import { useWeatherInsight } from '@/hooks/useWeatherInsight';

import type { TimelineEvent } from '@/modules/agenda/services/googleCalendarService';
import { connectGoogleCalendar, disconnectGoogleCalendar, isGoogleCalendarConnected } from '@/services/googleAuthService';
import { notificationService } from '@/services/notificationService';
import { syncEntityToGoogle, unsyncEntityFromGoogle } from '@/modules/agenda/services/calendarSyncService';
import { atlasTaskToGoogleEvent } from '@/modules/agenda/services/calendarSyncTransforms';

import type { Task, Quadrant } from '@/types';

import { TimelineView } from './TimelineView';
import { TaskListView } from './ListView';
import { TaskKanbanView } from './KanbanView';
import { CalendarView } from './CalendarView';

const log = createNamespacedLogger('AgendaPageShell');

/** Extract HH:MM from either "HH:MM", "HH:MM:SS" or full timestamptz string */
const extractTimeHHMM = (ts: string): string | null => {
  try {
    const timeMatch = ts.match(/^(\d{2}):(\d{2})/);
    if (timeMatch) return `${timeMatch[1]}:${timeMatch[2]}`;
    const d = new Date(ts);
    if (isNaN(d.getTime())) return null;
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  } catch {
    return null;
  }
};

/** Get local YYYY-MM-DD string (avoids UTC offset issues from toISOString) */
const toLocalDateStr = (d: Date): string => {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
};

export interface AgendaPageShellProps {
  userId: string;
  userEmail?: string;
  onLogout: () => void;
}

export const AgendaPageShell: React.FC<AgendaPageShellProps> = ({ userId, userEmail, onLogout }) => {
  useTourAutoStart('atlas-first-visit');
  const { weather } = useWeatherInsight();
  const isDesktop = useIsDesktop();
  const [mobileMode, setMobileMode] = useState<AgendaMode>('agenda');

  const MOBILE_VIEWS: AgendaMode[] = ['agenda', 'list', 'kanban', 'matrix', 'calendar'];
  const SWIPE_THRESHOLD = 60;
  const SWIPE_VELOCITY = 100;

  const handleSwipe = useCallback((_: unknown, info: PanInfo) => {
    if (isDesktop) return;
    const currentIndex = MOBILE_VIEWS.indexOf(mobileMode);
    if (info.offset.x < -SWIPE_THRESHOLD && info.velocity.x < -SWIPE_VELOCITY && currentIndex < MOBILE_VIEWS.length - 1) {
      setMobileMode(MOBILE_VIEWS[currentIndex + 1]);
    } else if (info.offset.x > SWIPE_THRESHOLD && info.velocity.x > SWIPE_VELOCITY && currentIndex > 0) {
      setMobileMode(MOBILE_VIEWS[currentIndex - 1]);
    }
  }, [mobileMode, isDesktop]);

  // Tick counter — increments every 60s so time-dependent useMemos recalculate
  const [timeTick, setTimeTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTimeTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const [matrixTasks, setMatrixTasks] = useState<Record<Quadrant, Task[]>>({
    'urgent-important': [],
    'important': [],
    'urgent': [],
    'low': []
  });
  const [timelineTasks, setTimelineTasks] = useState<Task[]>([]);
  const [allDueDateTasks, setAllDueDateTasks] = useState<any[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [skippedEvents, setSkippedEvents] = useState<Set<string>>(new Set());
  const completionTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Task filters for Lista/Kanban views
  const {
    filters: taskFilters,
    filteredTasks,
    availableTags,
    taskCounts,
    activeFilterCount,
    setStatus: setFilterStatus,
    setPriority: setFilterPriority,
    setSearchQuery: setFilterSearch,
    setSortBy: setFilterSort,
    toggleTag: toggleFilterTag,
    clearFilters,
  } = useTaskFilters(allTasks);

  // Task completion hook
  const {
    handleComplete,
    handleUncomplete,
    completedTodayTasks,
    isLoadingCompleted,
    loadCompletedToday,
    completingTaskIds,
  } = useTaskCompletion({ onRefresh: () => loadAllTasks(undefined, { silent: true }) });

  // Google Calendar Integration
  const dateRange = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    return { today, nextWeek };
  }, []);

  const {
    events: googleCalendarEvents,
    isConnected: isCalendarConnected,
    isLoading: isLoadingCalendar,
    error: calendarError,
    sync: syncCalendar,
    lastSyncTime,
    isTokenExpired
  } = useGoogleCalendarEvents({
    autoSync: true,
    syncInterval: 300,
    startDate: dateRange.today,
    endDate: dateRange.nextWeek
  });

  // Flux workout slots as calendar events
  const { events: fluxEvents } = useFluxAgendaEvents();

  // Merge Google Calendar + Flux workout events
  const calendarEvents = useMemo(() => {
    const externalGoogleEvents = googleCalendarEvents.filter(e => !e.aicaModule);
    return [...externalGoogleEvents, ...fluxEvents].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );
  }, [googleCalendarEvents, fluxEvents]);

  const calendarGridEvents = useMemo(() => {
    return calendarEvents.map(e => ({
      id: e.id,
      date: e.startTime.split('T')[0],
      title: e.title,
      color: e.color || '#f59e0b',
      time: extractTimeHHMM(e.startTime) || undefined,
    }));
  }, [calendarEvents]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Custom collision detection that prioritizes quadrant containers
  const customCollisionDetection: CollisionDetection = (args) => {
    const rectIntersectionCollisions = rectIntersection(args);
    if (!rectIntersectionCollisions || rectIntersectionCollisions.length === 0) {
      return rectIntersectionCollisions;
    }
    const containerCollisions = rectIntersectionCollisions.filter(collision => {
      const id = collision.id.toString();
      return ['urgent-important', 'important', 'urgent', 'low'].includes(id) || id.startsWith('kanban-');
    });
    if (containerCollisions.length > 0) return containerCollisions;
    return rectIntersectionCollisions;
  };

  // Load tasks on mount and date change
  useEffect(() => {
    loadAllTasks();
    loadCompletedToday();
  }, [userId]);

  useEffect(() => {
    loadAllTasks(selectedDate);
  }, [selectedDate]);

  // Log Google Calendar events for debugging
  useEffect(() => {
    log.debug('Google Calendar status:', {
      isConnected: isCalendarConnected,
      isLoading: isLoadingCalendar,
      eventsCount: calendarEvents.length,
      error: calendarError,
      events: calendarEvents
    });
  }, [calendarEvents, isCalendarConnected, isLoadingCalendar, calendarError]);

  // Sync on tab visibility change
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isCalendarConnected && !isTokenExpired) {
        log.debug('Aba visivel - sincronizando Google Calendar...');
        try {
          await syncCalendar();
        } catch (error) {
          log.warn('Erro ao sincronizar (visibility change):', error);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isCalendarConnected, isTokenExpired, syncCalendar]);

  // Transform Google Calendar events to Task format
  const transformCalendarEventToTask = (event: TimelineEvent): Task => {
    const startDate = new Date(event.startTime);
    if (isNaN(startDate.getTime())) {
      log.warn('Invalid startTime:', event.startTime);
      return {
        id: event.id,
        title: event.title,
        scheduled_time: undefined,
        estimated_duration: event.duration,
        due_date: event.startTime.split('T')[0],
        priority_quadrant: undefined,
      };
    }
    const scheduled_time = event.isAllDay
      ? undefined
      : `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`;
    return {
      id: event.id,
      title: event.title,
      scheduled_time,
      estimated_duration: event.duration,
      due_date: event.startTime.split('T')[0],
      priority_quadrant: undefined,
    };
  };

  // Merge Google Calendar events with timeline tasks
  const mergedTimelineTasks = useMemo(() => {
    const dateStr = toLocalDateStr(selectedDate);
    const selectedDateCalendarEvents = calendarEvents
      .filter(event => event.startTime.startsWith(dateStr))
      .map(transformCalendarEventToTask);
    const merged = [...timelineTasks, ...selectedDateCalendarEvents];
    merged.sort((a, b) => {
      if (!a.scheduled_time) return 1;
      if (!b.scheduled_time) return -1;
      return a.scheduled_time.localeCompare(b.scheduled_time);
    });
    return merged;
  }, [timelineTasks, calendarEvents, selectedDate]);

  // Identify next event and rest of day
  const { nextEvent, restOfDay } = useMemo(() => {
    const now = new Date();
    const dateStr = toLocalDateStr(now);
    const todayEvents = calendarEvents
      .filter(event => event.startTime.startsWith(dateStr))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    const nextEventData = todayEvents.find(event => {
      const endTime = new Date(event.endTime);
      return endTime > now;
    });
    const restEvents = nextEventData
      ? todayEvents.filter(event => event.id !== nextEventData.id && new Date(event.startTime) > new Date(nextEventData.startTime))
      : todayEvents;
    const restTimeline = restEvents.map(event => ({
      id: event.id,
      title: event.title,
      startTime: event.startTime,
      endTime: event.endTime,
      type: 'event' as const,
      location: (event as any).location,
      color: event.color || '#D97706'
    }));
    const todayTasks = timelineTasks
      .filter(task => {
        if (!task.scheduled_time) return false;
        const timeHHMM = extractTimeHHMM(task.scheduled_time);
        if (!timeHHMM) return false;
        const taskDate = new Date(`${dateStr}T${timeHHMM}:00`);
        return taskDate > now;
      })
      .map(task => {
        const timeHHMM = extractTimeHHMM(task.scheduled_time!) || '23:59';
        return {
          id: task.id,
          title: task.title,
          startTime: `${dateStr}T${timeHHMM}:00`,
          endTime: undefined,
          type: 'task' as const,
          isCompleted: !!task.completed_at,
          checklist: task.checklist || null
        };
      });
    const nextTwoDaysIds = new Set(restEvents.map(e => e.id));
    const combinedRest = [...restTimeline, ...todayTasks]
      .filter(item => !nextTwoDaysIds.has(item.id))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    const isNow = nextEventData &&
      new Date(nextEventData.startTime) <= now &&
      now < new Date(nextEventData.endTime);
    return {
      nextEvent: nextEventData ? {
        id: nextEventData.id,
        title: nextEventData.title,
        startTime: nextEventData.startTime,
        endTime: nextEventData.endTime,
        description: nextEventData.description,
        location: (nextEventData as any).location,
        attendees: nextEventData.attendees,
        organizer: nextEventData.organizer,
        isNow
      } : undefined,
      restOfDay: combinedRest
    };
  }, [calendarEvents, timelineTasks, timeTick]);

  // Prepare next 2 days events with categories
  const nextTwoDaysEvents = useMemo(() => {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const calendarFiltered = calendarEvents
      .filter(event => {
        const eventDate = new Date(event.startTime);
        return eventDate >= today && eventDate < threeDaysFromNow;
      })
      .map(event => {
        const eventDate = new Date(event.startTime);
        const isToday = eventDate >= today && eventDate < tomorrow;
        const isTomorrow = eventDate >= tomorrow && eventDate < dayAfterTomorrow;
        return {
          id: event.id,
          title: event.title,
          startTime: event.startTime,
          endTime: event.endTime,
          description: event.description,
          location: (event as any).location,
          category: detectEventCategory(event.title, event.description),
          isToday,
          isTomorrow,
          timeUntil: isToday ? calculateTimeUntil(event.startTime, event.endTime) : undefined,
          skipped: skippedEvents.has(event.id)
        };
      });

    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const dayAfterStr = dayAfterTomorrow.toISOString().split('T')[0];

    const taskEvents = allDueDateTasks
      .filter(task => task.due_date === todayStr || task.due_date === tomorrowStr || task.due_date === dayAfterStr)
      .map(task => {
        const isTaskToday = task.due_date === todayStr;
        const isTaskTomorrow = task.due_date === tomorrowStr;
        const timeHHMM = task.scheduled_time ? extractTimeHHMM(task.scheduled_time) : null;
        const startTime = timeHHMM
          ? `${task.due_date}T${timeHHMM}:00`
          : `${task.due_date}T23:59:00`;
        return {
          id: `task-${task.id}`,
          title: `📋 ${task.title}`,
          startTime,
          endTime: startTime,
          description: task.description || undefined,
          location: undefined,
          category: 'Tarefa',
          isToday: isTaskToday,
          isTomorrow: isTaskTomorrow,
          timeUntil: isTaskToday && timeHHMM ? calculateTimeUntil(startTime) : undefined,
          skipped: false,
          isTask: true,
          isCompleted: !!task.completed_at,
          checklist: task.checklist || null,
          is_urgent: task.is_urgent,
          is_important: task.is_important,
        };
      });

    return [...calendarFiltered, ...taskEvents]
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [calendarEvents, skippedEvents, allDueDateTasks, timeTick]);

  // ─── Data loading ───────────────────────────────────────────────

  const loadAllTasks = async (forDate?: Date, { silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) setIsLoading(true);
      const targetDate = forDate || selectedDate;
      const dateStr = targetDate.toISOString().split('T')[0];
      log.debug('Carregando tasks para:', dateStr);

      const { data, error } = await supabase
        .from('work_items')
        .select(`
          id, title, description, due_date, priority_quadrant,
          is_urgent, is_important, estimated_duration, scheduled_time,
          completed_at, priority, task_type, checklist, status, created_at, archived,
          associations(name)
        `)
        .is('completed_at', null)
        .eq('archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const matrix: Record<Quadrant, Task[]> = {
        'urgent-important': [], 'important': [], 'urgent': [], 'low': []
      };
      const timeline: Task[] = [];
      const flat: Task[] = [];

      data?.forEach((task: any) => {
        flat.push(task);
        if (task.due_date === dateStr) {
          timeline.push(task);
        } else {
          let quadrant: Quadrant = 'low';
          if (task.is_urgent && task.is_important) quadrant = 'urgent-important';
          else if (!task.is_urgent && task.is_important) quadrant = 'important';
          else if (task.is_urgent && !task.is_important) quadrant = 'urgent';
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
  };

  // ─── DnD handlers ──────────────────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = event.active.id as string;
    let task: Task | undefined;
    for (const tasks of Object.values(matrixTasks) as Task[][]) {
      task = tasks.find(t => t.id === taskId);
      if (task) break;
    }
    if (!task) task = mergedTimelineTasks.find(t => t.id === taskId);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;
    const isSourceMatrix = (Object.values(matrixTasks) as Task[][]).some(tasks => tasks.some(t => t.id === taskId));
    const isDestTimeline = overId.startsWith('timeline-slot-');
    const isDestMatrix = ['urgent-important', 'important', 'urgent', 'low'].includes(overId);
    const isDestKanban = overId.startsWith('kanban-');

    if (isDestKanban) {
      const newStatus = overId.replace('kanban-', '');
      const dbStatus = newStatus === 'todo' ? 'pending' : newStatus;
      handleMoveTask(taskId, dbStatus);
    } else if (isSourceMatrix && isDestTimeline) {
      const time = overId.replace('timeline-slot-', '');
      await scheduleTask(taskId, time);
    } else if (isSourceMatrix && isDestMatrix) {
      await updateTaskQuadrant(taskId, overId as Quadrant);
    } else if (!isSourceMatrix && isDestMatrix) {
      await unscheduleTask(taskId, overId as Quadrant);
    }
  };

  const handleMoveTask = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('work_items')
        .update({ status: newStatus })
        .eq('id', taskId);
      if (error) throw error;
      log.debug('Task status updated:', { taskId, newStatus });
      loadAllTasks(undefined, { silent: true });
    } catch (error) {
      log.error('Error moving task:', { error });
    }
  };

  const scheduleTask = async (taskId: string, time: string) => {
    const today = new Date().toISOString().split('T')[0];
    let task: Task | undefined;
    let fromQuadrant: Quadrant | undefined;
    for (const [q, tasks] of Object.entries(matrixTasks) as [Quadrant, Task[]][]) {
      task = tasks.find(t => t.id === taskId);
      if (task) { fromQuadrant = q; break; }
    }
    if (!task || !fromQuadrant) return;

    const updatedTask = { ...task, scheduled_time: time, due_date: today };
    setMatrixTasks(prev => ({
      ...prev,
      [fromQuadrant!]: prev[fromQuadrant!].filter(t => t.id !== taskId)
    }));
    setTimelineTasks(prev => [...prev, updatedTask]);

    await supabase
      .from('work_items')
      .update({ scheduled_time: time, due_date: today })
      .eq('id', taskId);

    isGoogleCalendarConnected().then((connected) => {
      if (!connected) return;
      const eventData = atlasTaskToGoogleEvent({
        id: taskId,
        title: task!.title,
        description: task!.description,
        scheduled_time: time,
        due_date: today,
      });
      syncEntityToGoogle('atlas', taskId, eventData).catch((err) =>
        log.warn('Calendar sync failed for scheduled task:', err)
      );
    });
  };

  const updateTaskQuadrant = async (taskId: string, newQuadrant: Quadrant) => {
    let task: Task | undefined;
    let fromQuadrant: Quadrant | undefined;
    for (const [q, tasks] of Object.entries(matrixTasks) as [Quadrant, Task[]][]) {
      task = tasks.find(t => t.id === taskId);
      if (task) { fromQuadrant = q; break; }
    }
    if (!task || !fromQuadrant || fromQuadrant === newQuadrant) return;

    let is_urgent: boolean;
    let is_important: boolean;
    switch (newQuadrant) {
      case 'urgent-important': is_urgent = true; is_important = true; break;
      case 'important': is_urgent = false; is_important = true; break;
      case 'urgent': is_urgent = true; is_important = false; break;
      case 'low':
      default: is_urgent = false; is_important = false; break;
    }

    setMatrixTasks(prev => ({
      ...prev,
      [fromQuadrant!]: prev[fromQuadrant!].filter(t => t.id !== taskId),
      [newQuadrant]: [...prev[newQuadrant], { ...task, priority_quadrant: newQuadrant }]
    }));

    await supabase
      .from('work_items')
      .update({ is_urgent, is_important })
      .eq('id', taskId);
  };

  // ─── Event skip handlers ────────────────────────────────────────

  const handleSkipEvent = (eventId: string) => {
    setSkippedEvents(prev => {
      const newSet = new Set(prev);
      newSet.add(eventId);
      localStorage.setItem('skippedEvents', JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  };

  const handleUnskipEvent = (eventId: string) => {
    setSkippedEvents(prev => {
      const newSet = new Set(prev);
      newSet.delete(eventId);
      localStorage.setItem('skippedEvents', JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  };

  // Load skipped events from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('skippedEvents');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSkippedEvents(new Set(parsed));
      } catch (e) {
        log.error('Error parsing skipped events:', e);
      }
    }
  }, []);

  // ─── Task completion ────────────────────────────────────────────

  const handleTaskComplete = async (taskId: string) => {
    const success = await handleComplete(taskId);
    if (!success) return;
    const timer = setTimeout(() => {
      setMatrixTasks(prev => ({
        'urgent-important': prev['urgent-important'].filter(t => t.id !== taskId),
        'important': prev['important'].filter(t => t.id !== taskId),
        'urgent': prev['urgent'].filter(t => t.id !== taskId),
        'low': prev['low'].filter(t => t.id !== taskId),
      }));
      setTimelineTasks(prev => prev.filter(t => t.id !== taskId));
      setAllDueDateTasks(prev => prev.filter((t: any) => t.id !== taskId));
      completionTimers.current.delete(taskId);
    }, 2200);
    completionTimers.current.set(taskId, timer);
  };

  const unscheduleTask = async (taskId: string, targetQuadrant: Quadrant) => {
    const task = timelineTasks.find(t => t.id === taskId);
    if (!task) return;

    setTimelineTasks(prev => prev.filter(t => t.id !== taskId));
    setMatrixTasks(prev => ({
      ...prev,
      [targetQuadrant]: [...prev[targetQuadrant], { ...task, scheduled_time: undefined, priority_quadrant: targetQuadrant }]
    }));

    const { error } = await supabase
      .from('work_items')
      .update({ scheduled_time: null, priority_quadrant: targetQuadrant })
      .eq('id', taskId);

    if (!error) {
      notificationService.show({
        type: 'success',
        title: 'Tarefa removida da agenda',
        message: `"${task.title}" foi movida para a matriz de prioridades`,
        icon: '✅',
        duration: 3000
      });
      isGoogleCalendarConnected().then((connected) => {
        if (!connected) return;
        unsyncEntityFromGoogle('atlas', taskId).catch((err) =>
          log.warn('Calendar unsync failed for unscheduled task:', err)
        );
      });
    } else {
      log.error('Error unscheduling task:', error);
      notificationService.show({
        type: 'error',
        title: 'Erro ao remover tarefa',
        message: 'Nao foi possivel remover a tarefa da agenda',
        icon: '❌',
        duration: 5000
      });
      loadAllTasks(undefined, { silent: true });
    }
  };

  // ─── Calendar connection handlers ──────────────────────────────

  const handleConnectCalendar = async () => {
    log.debug('Conectando Google Calendar...');
    await connectGoogleCalendar();
  };

  const handleDisconnectCalendar = async () => {
    log.debug('Desconectando Google Calendar...');
    try {
      await disconnectGoogleCalendar();
      log.debug('Google Calendar desconectado com sucesso');
      window.location.reload();
    } catch (error) {
      log.error('Erro ao desconectar:', error);
    }
  };

  // ─── Render helpers ────────────────────────────────────────────

  const handleCompleteTaskFromList = (task: Task) => handleTaskComplete(task.id);

  const renderMatrixView = () => (
    <ErrorBoundary
      fallback={
        <div className="p-6 text-center text-ceramic-text-secondary">
          Erro ao carregar Matrix.{' '}
          <button onClick={() => window.location.reload()} className="underline text-amber-600">
            Recarregar
          </button>
        </div>
      }
    >
      <EisenhowerMatrix
        tasks={Object.fromEntries(
          Object.entries(matrixTasks).map(([q, tasks]) => [
            q,
            tasks.map((t: Task) => ({
              id: t.id,
              title: t.title,
              completed: !!t.completed_at,
              dueTime: t.scheduled_time ? (extractTimeHHMM(t.scheduled_time) || undefined) : undefined,
            })),
          ])
        ) as Record<'urgent-important' | 'important' | 'urgent' | 'low', MatrixTask[]>}
        onTaskComplete={(taskId) => handleTaskComplete(taskId)}
      />
    </ErrorBoundary>
  );

  // ─── Main render ───────────────────────────────────────────────

  return (
    <div className="h-screen w-full bg-ceramic-base flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-ceramic-text-secondary/10" data-tour="atlas-header">
        <div>
          <h1 className="text-2xl font-black text-ceramic-text-primary">Meu Dia</h1>
          <p className="text-sm text-ceramic-text-secondary">
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long'
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AgendaModeToggle mode={mobileMode} onModeChange={setMobileMode} />
          <CalendarStatusDot
            isConnected={isCalendarConnected}
            isSyncing={isLoadingCalendar}
            hasError={!!calendarError}
            lastSyncTime={lastSyncTime}
            onConnect={handleConnectCalendar}
            onSync={syncCalendar}
            onDisconnect={handleDisconnectCalendar}
          />
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {mobileMode === 'agenda' && isDesktop ? (
          /* Desktop agenda: full-width timeline */
          <main className="flex-1 overflow-y-auto px-6 pb-32 pt-6 space-y-6">
            <TimelineView
              userId={userId}
              nextTwoDaysEvents={nextTwoDaysEvents}
              restOfDay={restOfDay}
              completedTodayTasks={completedTodayTasks}
              isLoadingCompleted={isLoadingCompleted}
              completingTaskIds={completingTaskIds}
              forecast={weather?.forecast}
              onSkipEvent={handleSkipEvent}
              onUnskipEvent={handleUnskipEvent}
              onTaskComplete={handleComplete}
              onTaskCreated={() => loadAllTasks()}
              onUncomplete={handleUncomplete}
              completionTimers={completionTimers}
            />
          </main>
        ) : (
          /* All other modes: animated content */
          <AnimatePresence mode="wait">
            <motion.main
              key={mobileMode}
              drag={isDesktop ? false : "x"}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              dragDirectionLock
              onDragEnd={handleSwipe}
              variants={pageTransitionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex-1 overflow-y-auto px-4 pb-32 pt-6 space-y-6 touch-pan-y"
            >
              {mobileMode === 'agenda' ? (
                <TimelineView
                  userId={userId}
                  nextTwoDaysEvents={nextTwoDaysEvents}
                  restOfDay={restOfDay}
                  completedTodayTasks={completedTodayTasks}
                  isLoadingCompleted={isLoadingCompleted}
                  completingTaskIds={completingTaskIds}
                  forecast={weather?.forecast}
                  onSkipEvent={handleSkipEvent}
                  onUnskipEvent={handleUnskipEvent}
                  onTaskComplete={handleComplete}
                  onTaskCreated={() => loadAllTasks()}
                  onUncomplete={handleUncomplete}
                  completionTimers={completionTimers}
                />
              ) : (
                <>
                  {/* Filter bar — visible in list/kanban modes */}
                  <TaskFilterBar
                    filters={taskFilters}
                    taskCounts={taskCounts}
                    availableTags={availableTags}
                    activeFilterCount={activeFilterCount}
                    onStatusChange={setFilterStatus}
                    onPriorityChange={setFilterPriority}
                    onSearchChange={setFilterSearch}
                    onSortChange={setFilterSort}
                    onToggleTag={toggleFilterTag}
                    onClear={clearFilters}
                  />

                  {mobileMode === 'list' && (
                    <TaskListView
                      tasks={filteredTasks}
                      onOpenTask={(task) => log.debug('Open task:', task.id)}
                      onCompleteTask={handleCompleteTaskFromList}
                      isLoading={isLoading}
                    />
                  )}

                  {mobileMode === 'kanban' && (
                    <TaskKanbanView
                      tasks={filteredTasks}
                      onOpenTask={(task) => log.debug('Open task:', task.id)}
                      onCompleteTask={handleCompleteTaskFromList}
                      onMoveTask={handleMoveTask}
                      isLoading={isLoading}
                    />
                  )}

                  {mobileMode === 'matrix' && renderMatrixView()}

                  {mobileMode === 'calendar' && (
                    <CalendarView calendarGridEvents={calendarGridEvents} />
                  )}
                </>
              )}
            </motion.main>
          </AnimatePresence>
        )}

        <DragOverlay>
          {activeTask ? (
            <div className="ceramic-card p-3 w-64 shadow-2xl rotate-3 cursor-grabbing bg-[#F7F6F4] border-l-4 border-amber-400">
              <h4 className="text-sm font-bold text-ceramic-text-primary truncate">{activeTask.title}</h4>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
