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

import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('AgendaView');
import { PriorityMatrix, DailyTimeline, HeaderGlobal, CalendarStatusDot, NextEventHero, AgendaTimeline, TaskCreationQuickAdd } from '../components';
import { NextTwoDaysView, detectEventCategory, calculateTimeUntil } from '../components';
import { Task, Quadrant } from '../../types';
// REMOVED: Atlas module imports (deprecated - moved to _deprecated/modules/)
// import { useAtlasTasks } from '../modules/atlas/hooks/useAtlasTasks';
// import { TaskCreationInput } from '../modules/atlas/components/TaskCreationInput';
// import { TaskList } from '../modules/atlas/components/TaskList';
// import { ProjectList } from '../modules/atlas/components/ProjectList';
// import { AtlasTask } from '../modules/atlas/types/plane';
import { useGoogleCalendarEvents } from '../hooks/useGoogleCalendarEvents';
import { useFluxAgendaEvents } from '../modules/flux/hooks/useFluxAgendaEvents';
// TODO: Re-enable onboarding tour after app functionality is stable
// import { useTourAutoStart } from '../hooks/useTourAutoStart';
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

export const AgendaView: React.FC<AgendaViewProps> = ({ userId, userEmail, onLogout }) => {
    // TODO: Re-enable onboarding tour after app functionality is stable
    // useTourAutoStart('atlas-first-visit');

    const [matrixTasks, setMatrixTasks] = useState<Record<Quadrant, Task[]>>({
        'urgent-important': [],
        'important': [],
        'urgent': [],
        'low': []
    });
    const [timelineTasks, setTimelineTasks] = useState<Task[]>([]);
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [skippedEvents, setSkippedEvents] = useState<Set<string>>(new Set());

    // REMOVED: Atlas Module Integration (deprecated - moved to _deprecated/modules/)
    // const { tasks: atlasTasks, addTask: addAtlasTask, isSyncing: isAtlasSyncing } = useAtlasTasks();

    // REMOVED: Atlas task creation wrapper function
    // const handleAddTask = async (input: any) => {
    //     await addAtlasTask(input);
    //     await loadAllTasks(); // Refresh all data to sync TaskList
    // };

    // Google Calendar Integration - Buscar próximos 7 dias
    // Usar useMemo para evitar recriar datas a cada render e causar loop
    const dateRange = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        return { today, nextWeek };
    }, []); // Sem dependências - criar apenas uma vez por dia

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
    const calendarEvents = useMemo(() => {
        return [...googleCalendarEvents, ...fluxEvents].sort((a, b) =>
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
    }, [userId]);

    // Reload tasks when selected date changes
    useEffect(() => {
        loadAllTasks(selectedDate);
    }, [selectedDate]);

    // Log Google Calendar events for debugging
    useEffect(() => {
        log.debug(' 📅 Google Calendar status:', {
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
                log.debug(' 👁️ Aba visível - sincronizando Google Calendar...');
                try {
                    await syncCalendar();
                } catch (error) {
                    log.warn(' ⚠️ Erro ao sincronizar (visibility change):', error);
                    // Erro já tratado pelo hook, não precisa fazer nada
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
            log.warn(' Invalid startTime:', event.startTime);
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
            due_date: event.startTime.split('T')[0], // Extract date part
            // Google Calendar events don't have priority quadrant
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

        log.debug(' 🔀 Merged timeline tasks:', {
            selectedDate: dateStr,
            supabaseTasks: timelineTasks.length,
            calendarEvents: selectedDateCalendarEvents.length,
            total: merged.length,
            merged
        });

        return merged;
    }, [timelineTasks, calendarEvents, selectedDate]);

    // REMOVED: Atlas Tasks merging logic (deprecated - moved to _deprecated/modules/)
    // const mergedMatrixTasks = useMemo(() => {
    //     const merged = { ...matrixTasks };
    //     atlasTasks.forEach(atlasTask => {
    //         // Use Eisenhower Matrix dimensions (is_urgent, is_important) to determine quadrant
    //         let quadrant: Quadrant = 'low';
    //         if (atlasTask.is_urgent && atlasTask.is_important) {
    //             quadrant = 'urgent-important';
    //         } else if (!atlasTask.is_urgent && atlasTask.is_important) {
    //             quadrant = 'important';
    //         } else if (atlasTask.is_urgent && !atlasTask.is_important) {
    //             quadrant = 'urgent';
    //         } else {
    //             quadrant = 'low';
    //         }
    //         // Map AtlasTask to Task
    //         const task: Task = {
    //             id: atlasTask.id,
    //             title: atlasTask.title,
    //             priority_quadrant: quadrant,
    //             priority: atlasTask.priority,
    //         };
    //         merged[quadrant] = [task, ...merged[quadrant]];
    //     });
    //     return merged;
    // }, [matrixTasks, atlasTasks]);

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
            color: event.color || '#D97706' // Use event color (Flux modality) or default Amber
        }));

        // Add tasks to rest of day
        const todayTasks = timelineTasks.map(task => ({
            id: task.id,
            title: task.title,
            startTime: `${dateStr}T${task.scheduled_time}:00`,
            endTime: undefined,
            type: 'task' as const,
            isCompleted: !!task.completed_at
        }));

        const combinedRest = [...restTimeline, ...todayTasks].sort((a, b) =>
            a.startTime.localeCompare(b.startTime)
        );

        // Check if next event is happening now
        const isNow = nextEventData && new Date(nextEventData.startTime) <= now;

        return {
            nextEvent: nextEventData ? {
                id: nextEventData.id,
                title: nextEventData.title,
                startTime: nextEventData.startTime,
                endTime: nextEventData.endTime,
                description: nextEventData.description,
                location: nextEventData.location,
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

        log.debug(' 📅 Filtrando eventos dos próximos 2 dias:', {
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

        const filtered = calendarEvents
            .filter(event => {
                const eventDate = new Date(event.startTime);
                const isInRange = eventDate >= today && eventDate < threeDaysFromNow;
                log.debug(' Evento:', event.title, {
                    eventDate: eventDate.toISOString(),
                    isInRange
                });
                return isInRange;
            })
            .map(event => {
                const eventDate = new Date(event.startTime);
                const isToday = eventDate >= today && eventDate < tomorrow;
                const isTomorrow = eventDate >= tomorrow && eventDate < dayAfterTomorrow;

                log.debug(' Classificando evento:', event.title, {
                    isToday,
                    isTomorrow,
                    eventDate: eventDate.toISOString()
                });

                return {
                    id: event.id,
                    title: event.title,
                    startTime: event.startTime,
                    endTime: event.endTime,
                    description: event.description,
                    location: event.location,
                    category: detectEventCategory(event.title, event.description),
                    isToday,
                    isTomorrow,
                    timeUntil: isToday ? calculateTimeUntil(event.startTime) : undefined,
                    skipped: skippedEvents.has(event.id)
                };
            })
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

        log.debug(' ✅ Eventos filtrados:', {
            total: filtered.length,
            hoje: filtered.filter(e => e.isToday).length,
            amanha: filtered.filter(e => e.isTomorrow).length,
            depoisDeAmanha: filtered.filter(e => !e.isToday && !e.isTomorrow).length
        });

        return filtered;
    }, [calendarEvents, skippedEvents]);

    const loadAllTasks = async (forDate?: Date) => {
        try {
            setIsLoading(true);
            const targetDate = forDate || selectedDate;
            const dateStr = targetDate.toISOString().split('T')[0];

            log.debug(' 📅 Carregando tasks para:', dateStr);

            const { data, error } = await supabase
                .from('work_items')
                .select(`
                    id,
                    title,
                    due_date,
                    priority_quadrant,
                    is_urgent,
                    is_important,
                    estimated_duration,
                    scheduled_time,
                    completed_at,
                    priority,
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
                // If task has a scheduled time for selected date, it goes to timeline
                if (task.scheduled_time && task.due_date === dateStr) {
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
        } catch (error) {
            log.error(' Error loading tasks:', error);
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
                title: task.title,
                description: task.description,
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
            // Persist to localStorage
            localStorage.setItem('skippedEvents', JSON.stringify(Array.from(newSet)));
            return newSet;
        });
    };

    // Handle unskip event
    const handleUnskipEvent = (eventId: string) => {
        setSkippedEvents(prev => {
            const newSet = new Set(prev);
            newSet.delete(eventId);
            // Persist to localStorage
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
            // Show success notification
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
            log.error(' Error unscheduling task:', error);
            notificationService.show({
                type: 'error',
                title: 'Erro ao remover tarefa',
                message: 'Não foi possível remover a tarefa da agenda',
                icon: '❌',
                duration: 5000
            });
            // Revert optimistic update
            loadAllTasks();
        }
    };

    // Handler para conectar Google Calendar — delega ao serviço centralizado
    const handleConnectCalendar = async () => {
        log.debug(' Conectando Google Calendar...');
        await connectGoogleCalendar();
    };

    // Handler para desconectar Google Calendar
    const handleDisconnectCalendar = async () => {
        log.debug(' Desconectando Google Calendar...');
        try {
            await disconnectGoogleCalendar();
            log.debug(' ✅ Google Calendar desconectado com sucesso');
            // Força reload para atualizar estado de conexão
            window.location.reload();
        } catch (error) {
            log.error(' ❌ Erro ao desconectar:', error);
        }
    };

    return (
        <div className="h-screen w-full bg-ceramic-base flex flex-col overflow-hidden">
            {/* Header com Sync Indicator */}
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

                <div className="flex items-center gap-4">
                    {/* Status minimalista do Calendar */}
                    <CalendarStatusDot
                        isConnected={isCalendarConnected}
                        isSyncing={isLoadingCalendar}
                        hasError={!!calendarError}
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
                <main className="flex-1 overflow-y-auto px-6 pb-32 pt-8 space-y-12">
                    {/* PRÓXIMOS 2 DIAS: Foco Principal - Sempre visível */}
                    <section className="max-w-2xl mx-auto w-full">
                        <NextTwoDaysView
                            events={nextTwoDaysEvents}
                            onSkipEvent={handleSkipEvent}
                            onUnskipEvent={handleUnskipEvent}
                        />
                    </section>

                    {/* Quick Add de Tarefas */}
                    <section className="max-w-2xl mx-auto w-full" data-tour="add-task-button">
                        <TaskCreationQuickAdd
                            userId={userId}
                            onTaskCreated={loadAllTasks}
                        />
                    </section>

                    {/* TIMELINE: Mais Tarde */}
                    {restOfDay.length > 0 && (
                        <section className="max-w-2xl mx-auto w-full">
                            <h2 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-widest mb-4 ml-1">
                                Mais Tarde
                            </h2>
                            <AgendaTimeline
                                events={restOfDay}
                                onEventClick={(eventId) => {
                                    log.debug(' Event clicked:', eventId);
                                }}
                                onTaskToggle={async (taskId) => {
                                    log.debug(' Task toggled:', taskId);
                                    const { error } = await supabase
                                        .from('work_items')
                                        .update({ completed_at: new Date().toISOString() })
                                        .eq('id', taskId);

                                    if (!error) {
                                        // Unsync completed task from Google Calendar (non-blocking)
                                        isGoogleCalendarConnected().then((connected) => {
                                            if (!connected) return;
                                            unsyncEntityFromGoogle('atlas', taskId).catch((err) =>
                                                log.warn('Calendar unsync failed for completed task:', err)
                                            );
                                        });

                                        loadAllTasks();
                                    }
                                }}
                            />
                        </section>
                    )}

                    {/* Priority Matrix */}
                    <div className="flex-none max-w-4xl mx-auto w-full" data-tour="eisenhower-matrix">
                        <h2 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-widest mb-4 ml-1">
                            Matriz de Prioridades
                        </h2>
                        <PriorityMatrix
                            userId={userId}
                            tasks={matrixTasks}
                            isLoading={isLoading}
                            onRefresh={loadAllTasks}
                        />
                    </div>

                    {/* REMOVED: Atlas Task List (deprecated - moved to _deprecated/modules/) */}
                    {/* <div className="flex-none max-w-2xl mx-auto w-full">
                        <TaskList
                            tasks={Object.values(matrixTasks).flat().map(task => ({
                                id: task.id,
                                title: task.title,
                                description: undefined,
                                priority: task.priority || 'none',
                                status: task.completed_at ? 'completed' : 'todo',
                                target_date: task.due_date,
                                is_urgent: task.priority_quadrant === 'urgent-important' || task.priority_quadrant === 'urgent',
                                is_important: task.priority_quadrant === 'urgent-important' || task.priority_quadrant === 'important',
                                priority_quadrant: task.priority_quadrant,
                                created_at: undefined,
                                updated_at: undefined
                            }))}
                            onTaskCreated={loadAllTasks}
                        />
                    </div> */}

                    {/* REMOVED: Atlas Projects Section (deprecated - moved to _deprecated/modules/) */}
                    {/* <div className="flex-none max-w-4xl mx-auto w-full">
                        <ProjectList />
                    </div> */}
                </main>

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
