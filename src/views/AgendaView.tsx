import React, { useState, useEffect, useMemo } from 'react';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    rectIntersection,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    DragOverEvent,
    CollisionDetection,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';

import { createNamespacedLogger } from '@/lib/logger';
import { supabase } from '@/services/supabaseClient';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { pageTransitionVariants } from '@/lib/animations/ceramic-motion';

const log = createNamespacedLogger('AgendaView');
import { PriorityMatrix, DailyTimeline, HeaderGlobal, CalendarStatusDot, NextEventHero, AgendaTimeline, TaskCreationQuickAdd, AgendaModeToggle } from '../components';
import { NextTwoDaysView, detectEventCategory, calculateTimeUntil } from '../components';
import { CompletedTasksSection } from '../components/domain/CompletedTasksSection';
import { ModuleAgentChat, ModuleAgentFAB, getModuleAgentConfig } from '../components/features/ModuleAgentChat';
import { useModuleAgent } from '../hooks/useModuleAgent';
import { useTaskCompletion } from '../hooks/useTaskCompletion';
import { Task, Quadrant } from '@/types';
import { useGoogleCalendarEvents } from '../hooks/useGoogleCalendarEvents';
import { useFluxAgendaEvents } from '../modules/flux/hooks/useFluxAgendaEvents';
import { useTourAutoStart } from '../hooks/useTourAutoStart';
import { TimelineEvent } from '../services/googleCalendarService';
import { connectGoogleCalendar, disconnectGoogleCalendar, isGoogleCalendarConnected } from '../services/googleAuthService';
import { notificationService } from '../services/notificationService';
import { syncEntityToGoogle, unsyncEntityFromGoogle } from '../services/calendarSyncService';
import { atlasTaskToGoogleEvent } from '../services/calendarSyncTransforms';

interface AgendaViewProps {
    userId: string;
    userEmail?: string;
    onLogout: () => void;
}

const agendaAgentConfig = getModuleAgentConfig('agenda')!;

/** Extract HH:MM from either "HH:MM", "HH:MM:SS" or full timestamptz string */
const extractTimeHHMM = (ts: string): string | null => {
    try {
        // HH:MM or HH:MM:SS format
        const timeMatch = ts.match(/^(\d{2}):(\d{2})/);
        if (timeMatch) return `${timeMatch[1]}:${timeMatch[2]}`;

        const d = new Date(ts);
        if (isNaN(d.getTime())) return null;
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } catch { return null; }
};

export const AgendaView: React.FC<AgendaViewProps> = ({ userId, userEmail, onLogout }) => {
    useTourAutoStart('atlas-first-visit');
    const { isAgentOpen, openAgent, closeAgent } = useModuleAgent();
    const isDesktop = useIsDesktop();
    const [mobileMode, setMobileMode] = useState<'agenda' | 'organizar'>('agenda');

    const [matrixTasks, setMatrixTasks] = useState<Record<Quadrant, Task[]>>({
        'urgent-important': [],
        'important': [],
        'urgent': [],
        'low': []
    });
    const [timelineTasks, setTimelineTasks] = useState<Task[]>([]);
    const [allDueDateTasks, setAllDueDateTasks] = useState<any[]>([]);
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [skippedEvents, setSkippedEvents] = useState<Set<string>>(new Set());

    // Task completion hook — centralizes complete/uncomplete across the view
    const {
        handleComplete,
        handleUncomplete,
        completedTodayTasks,
        isLoadingCompleted,
        loadCompletedToday,
    } = useTaskCompletion({ onRefresh: () => loadAllTasks() });

    // Google Calendar Integration - Buscar proximos 7 dias
    // Usar useMemo para evitar recriar datas a cada render e causar loop
    const dateRange = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        return { today, nextWeek };
    }, []); // Sem dependencias - criar apenas uma vez por dia

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
        syncInterval: 300, // 5 minutos
        startDate: dateRange.today,
        endDate: dateRange.nextWeek
    });

    // Flux workout slots as calendar events
    const { events: fluxEvents } = useFluxAgendaEvents();

    // Merge Google Calendar + Flux workout events
    // Filter out AICA-originated events from Google Calendar that already appear in fluxEvents
    // (prevents duplicates when a workout slot is synced to Google Calendar then read back)
    const calendarEvents = useMemo(() => {
        const externalGoogleEvents = googleCalendarEvents.filter(e => !e.aicaModule);
        return [...externalGoogleEvents, ...fluxEvents].sort((a, b) =>
            a.startTime.localeCompare(b.startTime)
        );
    }, [googleCalendarEvents, fluxEvents]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Custom collision detection that prioritizes quadrant containers over task cards
    const customCollisionDetection: CollisionDetection = (args) => {
        // First, get all collisions using rectIntersection
        const rectIntersectionCollisions = rectIntersection(args);

        if (!rectIntersectionCollisions || rectIntersectionCollisions.length === 0) {
            return rectIntersectionCollisions;
        }

        // Filter for quadrant containers first
        const quadrantCollisions = rectIntersectionCollisions.filter(collision => {
            const id = collision.id.toString();
            return ['urgent-important', 'important', 'urgent', 'low'].includes(id);
        });

        // If we found quadrant containers, return those
        if (quadrantCollisions.length > 0) {
            return quadrantCollisions;
        }

        // Otherwise, return all collisions (for timeline slots, etc.)
        return rectIntersectionCollisions;
    };

    useEffect(() => {
        loadAllTasks();
        loadCompletedToday();
    }, [userId]);

    // Reload tasks when selected date changes
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

    // Sincronizar ao voltar para a aba (Visibility API)
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

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isCalendarConnected, isTokenExpired, syncCalendar]);

    // Transform Google Calendar events to Task format
    const transformCalendarEventToTask = (event: TimelineEvent): Task => {
        // Extract time from startTime (format: "HH:MM")
        const startDate = new Date(event.startTime);

        // Validate if date is valid
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
        const dateStr = selectedDate.toISOString().split('T')[0];

        // Filter calendar events for selected date
        const selectedDateCalendarEvents = calendarEvents
            .filter(event => event.startTime.startsWith(dateStr))
            .map(transformCalendarEventToTask);

        // Merge with Supabase timeline tasks
        const merged = [...timelineTasks, ...selectedDateCalendarEvents];

        // Sort by scheduled_time
        merged.sort((a, b) => {
            if (!a.scheduled_time) return 1;
            if (!b.scheduled_time) return -1;
            return a.scheduled_time.localeCompare(b.scheduled_time);
        });

        log.debug('Merged timeline tasks:', {
            selectedDate: dateStr,
            supabaseTasks: timelineTasks.length,
            calendarEvents: selectedDateCalendarEvents.length,
            total: merged.length,
            merged
        });

        return merged;
    }, [timelineTasks, calendarEvents, selectedDate]);

    // Identify next event and rest of day
    const { nextEvent, restOfDay } = useMemo(() => {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];

        // Get all calendar events for today
        const todayEvents = calendarEvents
            .filter(event => event.startTime.startsWith(dateStr))
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

        // Find next event (either happening now or upcoming)
        const nextEventData = todayEvents.find(event => {
            const endTime = new Date(event.endTime);
            return endTime > now; // Event hasn't ended yet
        });

        // Rest of events are those after the next event
        const restEvents = nextEventData
            ? todayEvents.filter(event => event.id !== nextEventData.id && new Date(event.startTime) > new Date(nextEventData.startTime))
            : todayEvents;

        // Transform to timeline event format
        const restTimeline = restEvents.map(event => ({
            id: event.id,
            title: event.title,
            startTime: event.startTime,
            endTime: event.endTime,
            type: 'event' as const,
            location: (event as any).location,
            color: event.color || '#D97706'
        }));

        // Add tasks to rest of day (only unscheduled or future tasks not already in NextTwoDaysView)
        const todayTasks = timelineTasks
            .filter(task => {
                // Only include tasks that have a scheduled_time in the future
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

        // Collect IDs already shown in NextTwoDaysView (restTimeline events + calendar)
        // to avoid duplicating items the hero section already covers
        const nextTwoDaysIds = new Set(restEvents.map(e => e.id));

        const combinedRest = [...restTimeline, ...todayTasks]
            .filter(item => !nextTwoDaysIds.has(item.id))
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

        // Check if next event is happening now
        const isNow = nextEventData && new Date(nextEventData.startTime) <= now;

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
    }, [calendarEvents, timelineTasks]);

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

        log.debug('Filtrando eventos dos proximos 2 dias:', {
            today: today.toISOString(),
            tomorrow: tomorrow.toISOString(),
            dayAfterTomorrow: dayAfterTomorrow.toISOString(),
            threeDaysFromNow: threeDaysFromNow.toISOString(),
            totalEvents: calendarEvents.length,
            events: calendarEvents.map(e => ({
                title: e.title,
                startTime: e.startTime,
                date: new Date(e.startTime).toLocaleDateString('pt-BR')
            }))
        });

        // Google Calendar events in range
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
                    timeUntil: isToday ? calculateTimeUntil(event.startTime) : undefined,
                    skipped: skippedEvents.has(event.id)
                };
            });

        // Tasks with due_date in the 3-day range
        const todayStr = today.toISOString().split('T')[0];
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        const dayAfterStr = dayAfterTomorrow.toISOString().split('T')[0];

        const taskEvents = allDueDateTasks
            .filter(task => {
                return task.due_date === todayStr || task.due_date === tomorrowStr || task.due_date === dayAfterStr;
            })
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

        const filtered = [...calendarFiltered, ...taskEvents]
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

        log.debug('Eventos filtrados:', {
            total: filtered.length,
            hoje: filtered.filter(e => e.isToday).length,
            amanha: filtered.filter(e => e.isTomorrow).length,
            depoisDeAmanha: filtered.filter(e => !e.isToday && !e.isTomorrow).length
        });

        return filtered;
    }, [calendarEvents, skippedEvents, allDueDateTasks]);

    const loadAllTasks = async (forDate?: Date) => {
        try {
            setIsLoading(true);
            const targetDate = forDate || selectedDate;
            const dateStr = targetDate.toISOString().split('T')[0];

            log.debug('Carregando tasks para:', dateStr);

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
                'low': []
            };
            const timeline: Task[] = [];

            data?.forEach((task: any) => {
                // If task has due_date matching selected date, it goes to timeline
                if (task.due_date === dateStr) {
                    timeline.push(task);
                } else {
                    // Otherwise it goes to matrix
                    // Use is_urgent and is_important to determine quadrant
                    let quadrant: Quadrant = 'low';
                    if (task.is_urgent && task.is_important) {
                        quadrant = 'urgent-important';
                    } else if (!task.is_urgent && task.is_important) {
                        quadrant = 'important';
                    } else if (task.is_urgent && !task.is_important) {
                        quadrant = 'urgent';
                    } else {
                        quadrant = 'low';
                    }
                    matrix[quadrant].push(task);
                }
            });

            setMatrixTasks(matrix);
            setTimelineTasks(timeline);
            setAllDueDateTasks((data || []).filter((t: any) => t.due_date));
        } catch (error) {
            log.error('Error loading tasks:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const taskId = active.id as string;

        // Find task in matrix or timeline
        let task: Task | undefined;

        // Check matrix
        for (const tasks of Object.values(matrixTasks) as Task[][]) {
            task = tasks.find(t => t.id === taskId);
            if (task) break;
        }

        // Check merged timeline if not found
        if (!task) {
            task = mergedTimelineTasks.find(t => t.id === taskId);
        }

        if (task) {
            setActiveTask(task);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);

        if (!over) return;

        const taskId = active.id as string;
        const overId = over.id as string;

        // Determine source and destination
        const isSourceMatrix = (Object.values(matrixTasks) as Task[][]).some(tasks => tasks.some(t => t.id === taskId));
        const isDestTimeline = overId.startsWith('timeline-slot-');
        const isDestMatrix = ['urgent-important', 'important', 'urgent', 'low'].includes(overId);

        if (isSourceMatrix && isDestTimeline) {
            // Move from Matrix to Timeline
            const time = overId.replace('timeline-slot-', '');
            await scheduleTask(taskId, time);
        } else if (isSourceMatrix && isDestMatrix) {
            // Move within Matrix (change quadrant)
            await updateTaskQuadrant(taskId, overId as Quadrant);
        } else if (!isSourceMatrix && isDestMatrix) {
            // Move from Timeline back to Matrix (unschedule)
            await unscheduleTask(taskId, overId as Quadrant);
        }
    };

    const scheduleTask = async (taskId: string, time: string) => {
        const today = new Date().toISOString().split('T')[0];

        // Find task
        let task: Task | undefined;
        let fromQuadrant: Quadrant | undefined;

        for (const [q, tasks] of Object.entries(matrixTasks) as [Quadrant, Task[]][]) {
            task = tasks.find(t => t.id === taskId);
            if (task) {
                fromQuadrant = q;
                break;
            }
        }

        if (!task || !fromQuadrant) return;

        // Optimistic update
        const updatedTask = { ...task, scheduled_time: time, due_date: today };

        setMatrixTasks(prev => ({
            ...prev,
            [fromQuadrant!]: prev[fromQuadrant!].filter(t => t.id !== taskId)
        }));
        setTimelineTasks(prev => [...prev, updatedTask]);

        // DB Update
        await supabase
            .from('work_items')
            .update({ scheduled_time: time, due_date: today })
            .eq('id', taskId);

        // Sync scheduled task to Google Calendar (non-blocking)
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
        // Find task
        let task: Task | undefined;
        let fromQuadrant: Quadrant | undefined;

        for (const [q, tasks] of Object.entries(matrixTasks) as [Quadrant, Task[]][]) {
            task = tasks.find(t => t.id === taskId);
            if (task) {
                fromQuadrant = q;
                break;
            }
        }

        if (!task || !fromQuadrant || fromQuadrant === newQuadrant) return;

        // Map quadrant to is_urgent and is_important booleans
        let is_urgent: boolean;
        let is_important: boolean;

        switch (newQuadrant) {
            case 'urgent-important':
                is_urgent = true;
                is_important = true;
                break;
            case 'important':
                is_urgent = false;
                is_important = true;
                break;
            case 'urgent':
                is_urgent = true;
                is_important = false;
                break;
            case 'low':
            default:
                is_urgent = false;
                is_important = false;
                break;
        }

        // Optimistic update
        setMatrixTasks(prev => ({
            ...prev,
            [fromQuadrant!]: prev[fromQuadrant!].filter(t => t.id !== taskId),
            [newQuadrant]: [...prev[newQuadrant], { ...task, priority_quadrant: newQuadrant }]
        }));

        // DB Update - use is_urgent and is_important (trigger will update priority_quadrant)
        await supabase
            .from('work_items')
            .update({ is_urgent, is_important })
            .eq('id', taskId);
    };

    // Handle skip event
    const handleSkipEvent = (eventId: string) => {
        setSkippedEvents(prev => {
            const newSet = new Set(prev);
            newSet.add(eventId);
            localStorage.setItem('skippedEvents', JSON.stringify(Array.from(newSet)));
            return newSet;
        });
    };

    // Handle unskip event
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

    // Handle task completion — delegates to useTaskCompletion hook
    const handleTaskComplete = async (taskId: string) => {
        await handleComplete(taskId);
    };

    const unscheduleTask = async (taskId: string, targetQuadrant: Quadrant) => {
        const task = timelineTasks.find(t => t.id === taskId);
        if (!task) return;

        // Optimistic update
        setTimelineTasks(prev => prev.filter(t => t.id !== taskId));
        setMatrixTasks(prev => ({
            ...prev,
            [targetQuadrant]: [...prev[targetQuadrant], { ...task, scheduled_time: undefined, priority_quadrant: targetQuadrant }]
        }));

        // DB Update
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

            // Unsync from Google Calendar (non-blocking)
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
            // Revert optimistic update
            loadAllTasks();
        }
    };

    // Handler para conectar Google Calendar
    const handleConnectCalendar = async () => {
        log.debug('Conectando Google Calendar...');
        await connectGoogleCalendar();
    };

    // Handler para desconectar Google Calendar
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

    // Timeline content (used in both desktop left panel and mobile agenda mode)
    const timelineContent = (
        <>
            {/* PROXIMOS 2 DIAS */}
            <section className="w-full">
                <NextTwoDaysView
                    events={nextTwoDaysEvents}
                    onSkipEvent={handleSkipEvent}
                    onUnskipEvent={handleUnskipEvent}
                    onTaskComplete={handleTaskComplete}
                />
            </section>

            {/* Quick Add de Tarefas */}
            <section className="w-full" data-tour="add-task-button">
                <TaskCreationQuickAdd
                    userId={userId}
                    onTaskCreated={loadAllTasks}
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
                            await handleComplete(taskId);
                        }}
                    />
                </section>
            )}

            {/* Completed Tasks Section */}
            <section className="w-full">
                <CompletedTasksSection
                    tasks={completedTodayTasks}
                    onUncomplete={handleUncomplete}
                    isLoading={isLoadingCompleted}
                />
            </section>
        </>
    );

    // Matrix content (used in both desktop right panel and mobile organizar mode)
    const matrixContent = (
        <div className="w-full" data-tour="eisenhower-matrix">
            <h2 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-widest mb-4 ml-1">
                Matriz de Prioridades
            </h2>
            <PriorityMatrix
                userId={userId}
                tasks={matrixTasks}
                isLoading={isLoading}
                onRefresh={loadAllTasks}
                compact={!isDesktop}
            />
        </div>
    );

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
                    {/* Mode toggle — only on mobile */}
                    {!isDesktop && (
                        <AgendaModeToggle
                            mode={mobileMode}
                            onModeChange={setMobileMode}
                        />
                    )}

                    {/* Calendar status */}
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
                {isDesktop ? (
                    /* ======== DESKTOP: side-by-side layout ======== */
                    <div className="flex-1 flex overflow-hidden">
                        {/* LEFT: Timeline — constrained width */}
                        <main className="w-[55%] min-w-[380px] overflow-y-auto px-6 pb-32 pt-6 space-y-6">
                            {timelineContent}
                        </main>

                        {/* RIGHT: Matrix — takes remaining space */}
                        <aside className="flex-1 min-w-[420px] overflow-y-auto border-l border-ceramic-text-secondary/10 px-5 py-6">
                            {matrixContent}
                        </aside>
                    </div>
                ) : (
                    /* ======== MOBILE: toggle between modes ======== */
                    <AnimatePresence mode="wait">
                        {mobileMode === 'agenda' ? (
                            <motion.main
                                key="agenda-view"
                                variants={pageTransitionVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className="flex-1 overflow-y-auto px-4 pb-32 pt-6 space-y-6"
                            >
                                {timelineContent}
                            </motion.main>
                        ) : (
                            <motion.main
                                key="organizar-view"
                                variants={pageTransitionVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className="flex-1 overflow-y-auto px-4 pb-32 pt-6"
                            >
                                {matrixContent}
                            </motion.main>
                        )}
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

            {/* Module Agent */}
            <ModuleAgentFAB onClick={openAgent} accentBg={agendaAgentConfig.accentBg} label="Agente Agenda" />
            <ModuleAgentChat
                isOpen={isAgentOpen}
                onClose={closeAgent}
                module={agendaAgentConfig.module}
                displayName={agendaAgentConfig.displayName}
                accentColor={agendaAgentConfig.accentColor}
                accentBg={agendaAgentConfig.accentBg}
                suggestedPrompts={agendaAgentConfig.suggestedPrompts}
                welcomeMessage={agendaAgentConfig.welcomeMessage}
                placeholder={agendaAgentConfig.placeholder}
            />
        </div>
    );
};
