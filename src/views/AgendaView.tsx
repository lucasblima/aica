import React, { useState, useEffect, useMemo } from 'react';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { supabase } from '../services/supabaseClient';
import { PriorityMatrix } from '../components/PriorityMatrix';
import { DailyTimeline } from '../components/DailyTimeline';
import { HeaderGlobal } from '../components/HeaderGlobal';
import GoogleCalendarConnect from '../components/GoogleCalendarConnect';
import { Task, Quadrant } from '../../types';
import { useAtlasTasks } from '../modules/atlas/hooks/useAtlasTasks';
import { TaskCreationInput } from '../modules/atlas/components/TaskCreationInput';
import { AtlasTask } from '../modules/atlas/types/plane';

interface AgendaViewProps {
    userId: string;
    userEmail?: string;
    onLogout: () => void;
}

export const AgendaView: React.FC<AgendaViewProps> = ({ userId, userEmail, onLogout }) => {
    const [matrixTasks, setMatrixTasks] = useState<Record<Quadrant, Task[]>>({
        'urgent-important': [],
        'important': [],
        'urgent': [],
        'low': []
    });
    const [timelineTasks, setTimelineTasks] = useState<Task[]>([]);
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Atlas Module Integration
    const { tasks: atlasTasks, addTask: addAtlasTask, isSyncing: isAtlasSyncing } = useAtlasTasks();

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

    useEffect(() => {
        loadAllTasks();
    }, [userId]);

    // Merge Atlas Tasks with Matrix Tasks
    const mergedMatrixTasks = useMemo(() => {
        const merged = { ...matrixTasks };

        atlasTasks.forEach(atlasTask => {
            // Map Atlas Priority to Quadrant
            let quadrant: Quadrant = 'low';
            if (atlasTask.priority === 'urgent') quadrant = 'urgent';
            else if (atlasTask.priority === 'high') quadrant = 'important';
            else if (atlasTask.priority === 'medium') quadrant = 'urgent-important';

            // Map AtlasTask to Task
            const task: Task = {
                id: atlasTask.id,
                title: atlasTask.title,
                priority_quadrant: quadrant,
                priority: atlasTask.priority,
                // Add visual indicator for optimistic/syncing state if needed
                // For now, we just treat it as a normal task
            };

            merged[quadrant] = [task, ...merged[quadrant]];
        });

        return merged;
    }, [matrixTasks, atlasTasks]);

    const loadAllTasks = async () => {
        try {
            setIsLoading(true);
            const today = new Date().toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('work_items')
                .select(`
                    id,
                    title,
                    due_date,
                    priority_quadrant,
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
                // If task has a scheduled time for today, it goes to timeline
                if (task.scheduled_time && task.due_date === today) {
                    timeline.push(task);
                } else {
                    // Otherwise it goes to matrix
                    const quadrant = (task.priority_quadrant || 'low') as Quadrant;
                    matrix[quadrant].push(task);
                }
            });

            setMatrixTasks(matrix);
            setTimelineTasks(timeline);
        } catch (error) {
            console.error('[AgendaView] Error loading tasks:', error);
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

        // Check timeline if not found
        if (!task) {
            task = timelineTasks.find(t => t.id === taskId);
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

        // Optimistic update
        setMatrixTasks(prev => ({
            ...prev,
            [fromQuadrant!]: prev[fromQuadrant!].filter(t => t.id !== taskId),
            [newQuadrant]: [...prev[newQuadrant], { ...task, priority_quadrant: newQuadrant }]
        }));

        // DB Update
        await supabase
            .from('work_items')
            .update({ priority_quadrant: newQuadrant })
            .eq('id', taskId);
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
        await supabase
            .from('work_items')
            .update({ scheduled_time: null, priority_quadrant: targetQuadrant })
            .eq('id', taskId);
    };

    return (
        <div className="h-screen w-full bg-ceramic-base flex flex-col overflow-hidden">
            <HeaderGlobal
                title="Meu Dia"
                subtitle="Maestro"
                userEmail={userEmail}
                onLogout={onLogout}
            />

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <main className="flex-1 overflow-y-auto px-6 pb-32 pt-4 space-y-6">
                    {/* Atlas Quick Add */}
                    <div className="flex-none max-w-2xl mx-auto w-full">
                        <TaskCreationInput
                            onAddTask={addAtlasTask}
                            isSyncing={isAtlasSyncing}
                        />
                    </div>

                    {/* Google Calendar Sync */}
                    <div className="flex-none max-w-2xl mx-auto w-full">
                        <GoogleCalendarConnect />
                    </div>

                    {/* Priority Matrix - Collapsible/Fixed Header feel */}
                    <div className="flex-none">
                        <PriorityMatrix
                            userId={userId}
                            tasks={mergedMatrixTasks}
                            isLoading={isLoading}
                            onRefresh={loadAllTasks}
                        />
                    </div>

                    {/* Liquid Timeline */}
                    <div className="flex-1">
                        <DailyTimeline
                            userId={userId}
                            tasks={timelineTasks}
                            isLoading={isLoading}
                            onRefresh={loadAllTasks}
                        />
                    </div>
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
