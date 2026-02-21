import React, { useState } from 'react';
import {
    useDroppable,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Sparkles, Filter } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { Task, Quadrant } from '@/types';
import { SwipeableTaskCard } from '@/components/domain/SwipeableTaskCard';
import { TaskBottomSheet } from '@/components/domain/TaskBottomSheet';
import { ConfirmationModal } from '@/components/ui';
import { EmptyQuadrantState } from '@/components/domain';
import { createNamespacedLogger } from '@/lib/logger';
import { syncEntityToGoogle, unsyncEntityFromGoogle } from '@/services/calendarSyncService';
import { atlasTaskToGoogleEvent } from '@/services/calendarSyncTransforms';
import { isGoogleCalendarConnected } from '@/services/googleAuthService';

const log = createNamespacedLogger('PriorityMatrix');

interface QuadrantConfig {
    id: Quadrant;
    title: string;
    subtitle: string;
    emoji: string;
    color: string;
    bgClass: string;
}

const QUADRANTS: QuadrantConfig[] = [
    {
        id: 'urgent-important',
        title: 'Urgente & Importante',
        subtitle: 'Faça Agora',
        emoji: '\u{1F534}',
        color: '#D97706',
        bgClass: 'bg-gradient-to-br from-ceramic-error/5 to-amber-50'
    },
    {
        id: 'important',
        title: 'Importante, Não Urgente',
        subtitle: 'Agende',
        emoji: '\u{1F7E2}',
        color: '#7B8FA2',
        bgClass: 'bg-gradient-to-br from-ceramic-info/5 to-ceramic-info/10'
    },
    {
        id: 'urgent',
        title: 'Urgente, Não Importante',
        subtitle: 'Delegue',
        emoji: '\u{1F7E1}',
        color: '#FBBF24',
        bgClass: 'bg-gradient-to-br from-amber-50 to-amber-50'
    },
    {
        id: 'low',
        title: 'Nem Urgente, Nem Importante',
        subtitle: 'Elimine',
        emoji: '\u{26AA}',
        color: '#A89F91',
        bgClass: 'bg-gradient-to-br from-ceramic-cool to-ceramic-base'
    }
];

// Map quadrant ID to tour target
const getQuadrantTourTarget = (id: Quadrant): string => {
    switch (id) {
        case 'urgent-important': return 'quadrant-1';
        case 'important': return 'quadrant-2';
        case 'urgent': return 'quadrant-3';
        case 'low': return 'quadrant-4';
        default: return '';
    }
};

// Droppable Quadrant Container Component
const DroppableQuadrant: React.FC<{
    quadrant: QuadrantConfig;
    tasks: Task[];
    isLoading: boolean;
    onOpenTask: (task: Task) => void;
    onCompleteTask: (task: Task) => void;
    compact?: boolean;
    children?: React.ReactNode;
}> = ({ quadrant, tasks, isLoading, onOpenTask, onCompleteTask, compact = false, children }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: quadrant.id,
    });

    return (
        <div
            ref={setNodeRef}
            data-container-type="quadrant"
            data-tour={getQuadrantTourTarget(quadrant.id)}
            className={`ceramic-tray ${compact ? 'p-3 min-h-[120px]' : 'p-3 min-h-[160px]'} rounded-2xl transition-all ${
                isOver ? 'ring-2 ring-amber-400 bg-amber-50/50' : ''
            }`}
            style={{ borderLeft: `3px solid ${quadrant.color}` }}
        >
            {/* Quadrant Header */}
            <div className={compact ? 'mb-2' : 'mb-4'}>
                <h3 className={`${compact ? 'text-xs' : 'text-sm'} font-black text-ceramic-text-primary uppercase tracking-wide`}>
                    <span className="mr-1.5">{quadrant.emoji}</span>{quadrant.title}
                </h3>
                <p className="text-xs text-ceramic-text-secondary">
                    {quadrant.subtitle} • <span style={{ color: quadrant.color, fontWeight: 700 }}>{tasks.length}</span> tarefas
                </p>
            </div>

            {/* Task List */}
            <SortableContext
                id={quadrant.id}
                items={tasks.map(t => t.id)}
                strategy={verticalListSortingStrategy}
            >
                {isLoading ? (
                    <div className="space-y-2">
                        {[1, 2].map(i => (
                            <div key={i} className="ceramic-card p-3 animate-pulse">
                                <div className="h-4 bg-ceramic-text-secondary/10 rounded w-3/4 mb-2"></div>
                                <div className="h-3 bg-ceramic-text-secondary/10 rounded w-1/2"></div>
                            </div>
                        ))}
                    </div>
                ) : tasks.length === 0 ? (
                    <EmptyQuadrantState quadrantType={quadrant.id} />
                ) : (
                    tasks.map(task => (
                        <SwipeableTaskCard
                            key={task.id}
                            task={task}
                            onOpen={onOpenTask}
                            onComplete={onCompleteTask}
                            compact={compact}
                        />
                    ))
                )}
            </SortableContext>
        </div>
    );
};

// Main Priority Matrix Component
interface PriorityMatrixProps {
    userId: string;
    tasks: Record<Quadrant, Task[]>;
    isLoading: boolean;
    onRefresh: () => void;
    compact?: boolean;
    onOpenTask?: (task: Task) => void;
    onComplete?: (task: Task) => void;
    onTaskDeleted?: () => void;
}

export const PriorityMatrix: React.FC<PriorityMatrixProps> = ({ userId, tasks, isLoading, onRefresh, compact = false, onOpenTask: externalOnOpenTask, onComplete: externalOnComplete, onTaskDeleted }) => {
    const [isAicaWorking, setIsAicaWorking] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [deletingTask, setDeletingTask] = useState<Task | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedAssociation, setSelectedAssociation] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);

    const handleOpenTask = (task: Task) => {
        if (externalOnOpenTask) {
            externalOnOpenTask(task);
        } else {
            setEditingTask(task);
            setIsSheetOpen(true);
        }
    };

    const handleSaveTask = async (taskId: string, updates: Partial<Task>) => {
        try {
            const { error } = await supabase
                .from('work_items')
                .update(updates)
                .eq('id', taskId);

            if (error) throw error;

            log.debug('Task updated:', taskId, updates);

            // Re-sync to Google Calendar if task has due_date (non-blocking)
            const mergedTask = editingTask ? { ...editingTask, ...updates } : updates;
            const dueDate = mergedTask.due_date;
            if (dueDate) {
                isGoogleCalendarConnected().then((connected) => {
                    if (!connected) return;
                    const eventData = atlasTaskToGoogleEvent({
                        id: taskId,
                        title: (mergedTask.title as string) || '',
                        description: mergedTask.description as string | undefined,
                        scheduled_time: mergedTask.scheduled_time as string | undefined,
                        due_date: dueDate as string,
                        estimated_duration: mergedTask.estimated_duration as number | undefined,
                    });
                    if (eventData) {
                        syncEntityToGoogle('atlas', taskId, eventData).catch((err) =>
                            log.warn('Calendar sync failed for updated task:', err)
                        );
                    }
                });
            }

            onRefresh();
        } catch (error) {
            log.error('Error updating task:', { error });
            throw error;
        }
    };

    const handleCloseSheet = () => {
        setIsSheetOpen(false);
        setEditingTask(null);
    };

    const handleDeleteTask = (task: Task) => {
        setDeletingTask(task);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deletingTask) return;

        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from('work_items')
                .delete()
                .eq('id', deletingTask.id);

            if (error) throw error;

            log.debug('Task deleted:', deletingTask.id);

            // Unsync from Google Calendar (non-blocking)
            isGoogleCalendarConnected().then((connected) => {
                if (!connected) return;
                unsyncEntityFromGoogle('atlas', deletingTask.id).catch((err) =>
                    log.warn('Calendar unsync failed for deleted task:', err)
                );
            });

            onRefresh();
            onTaskDeleted?.();
            setIsDeleteModalOpen(false);
            setDeletingTask(null);
        } catch (error) {
            log.error('Error deleting task:', { error });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCancelDelete = () => {
        setIsDeleteModalOpen(false);
        setDeletingTask(null);
    };

    // Extract unique associations from tasks
    const uniqueAssociations = React.useMemo(() => {
        const allTasks = Object.values(tasks).flat();
        const associations = new Set<string>();
        allTasks.forEach(task => {
            if (task.associations?.name) {
                associations.add(task.associations.name);
            }
        });
        return Array.from(associations).sort();
    }, [tasks]);

    // Filter tasks based on selected association
    const filteredTasks = React.useMemo(() => {
        if (selectedAssociation === 'all') {
            return tasks;
        }

        const filtered: Record<Quadrant, Task[]> = {
            'urgent-important': [],
            'important': [],
            'urgent': [],
            'low': []
        };

        Object.entries(tasks).forEach(([quadrant, taskList]) => {
            filtered[quadrant as Quadrant] = taskList.filter(task =>
                task.associations?.name === selectedAssociation
            );
        });

        return filtered;
    }, [tasks, selectedAssociation]);

    const handleAicaAuto = async () => {
        setIsAicaWorking(true);
        try {
            // Simple rule-based logic (can be replaced with AI later)
            const allTasks = Object.values(tasks).flat();
            const now = new Date();
            const updates: { id: string; is_urgent: boolean; is_important: boolean }[] = [];

            allTasks.forEach(task => {
                let is_urgent = false;
                let is_important = false;

                if (task.due_date) {
                    const dueDate = new Date(task.due_date);
                    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                    // Task is urgent if due within 2 days
                    is_urgent = daysUntilDue <= 2;

                    // Task is important if estimated duration > 30 minutes (requires significant effort)
                    is_important = task.estimated_duration ? task.estimated_duration > 30 : false;
                } else {
                    // No due date = not urgent, low importance by default
                    is_urgent = false;
                    is_important = false;
                }

                updates.push({ id: task.id, is_urgent, is_important });
            });

            // Batch update - set is_urgent and is_important (trigger will update priority_quadrant)
            for (const update of updates) {
                await supabase
                    .from('work_items')
                    .update({
                        is_urgent: update.is_urgent,
                        is_important: update.is_important
                    })
                    .eq('id', update.id);
            }

            onRefresh();
        } catch (error) {
            log.error('AICA Auto error:', { error });
        } finally {
            setIsAicaWorking(false);
        }
    };

    return (
        <div className="ceramic-card p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-black text-ceramic-text-primary text-etched">
                        Matriz de Prioridades
                    </h2>
                    <p className="text-xs text-ceramic-text-secondary mt-1">
                        Eisenhower Matrix - Organize por Urgência & Importância
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="ceramic-card px-4 py-2 flex items-center gap-2 text-ceramic-text-primary font-bold hover:scale-105 transition-all"
                    >
                        <Filter className="w-4 h-4" />
                        Filtros
                    </button>
                    <button
                        onClick={handleAicaAuto}
                        disabled={isAicaWorking || isLoading}
                        className="ceramic-card px-4 py-2 flex items-center gap-2 text-ceramic-text-primary font-bold hover:scale-105 transition-all disabled:opacity-50"
                    >
                        <Sparkles className={`w-4 h-4 ${isAicaWorking ? 'animate-spin' : ''}`} />
                        AICA Auto
                    </button>
                </div>
            </div>

            {/* Filters Section */}
            {showFilters && (
                <div className="mb-6 p-4 ceramic-tray rounded-2xl" data-tour="task-filters">
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-bold text-ceramic-text-secondary">
                            Associação:
                        </label>
                        <select
                            value={selectedAssociation}
                            onChange={(e) => setSelectedAssociation(e.target.value)}
                            className="flex-1 max-w-xs px-4 py-2 rounded-xl ceramic-inset text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                        >
                            <option value="all">Todas as Associações</option>
                            {uniqueAssociations.map(association => (
                                <option key={association} value={association}>
                                    {association}
                                </option>
                            ))}
                        </select>
                        {selectedAssociation !== 'all' && (
                            <button
                                onClick={() => setSelectedAssociation('all')}
                                className="px-3 py-2 text-sm rounded-lg ceramic-card text-ceramic-text-secondary hover:text-ceramic-text-primary hover:scale-105 transition-all"
                            >
                                Limpar Filtro
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Matrix Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {QUADRANTS.map(quadrant => (
                    <DroppableQuadrant
                        key={quadrant.id}
                        quadrant={quadrant}
                        tasks={filteredTasks[quadrant.id]}
                        isLoading={isLoading}
                        onOpenTask={handleOpenTask}
                        onCompleteTask={externalOnComplete!}
                        compact={compact}
                    />
                ))}
            </div>

            {/* Task Detail Sheet */}
            <TaskBottomSheet
                task={editingTask}
                isOpen={isSheetOpen}
                onSave={handleSaveTask}
                onComplete={externalOnComplete!}
                onDelete={handleDeleteTask}
                onClose={handleCloseSheet}
            />

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                title="Remover Tarefa"
                message={`Tem certeza que deseja remover a tarefa "${deletingTask?.title}"? Esta ação não pode ser desfeita.`}
                confirmText="Remover"
                variant="danger"
                isOpen={isDeleteModalOpen}
                isLoading={isDeleting}
                onConfirm={handleConfirmDelete}
                onCancel={handleCancelDelete}
            />
        </div>
    );
};
