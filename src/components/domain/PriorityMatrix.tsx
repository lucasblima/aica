import React, { useState } from 'react';
import {
    useSensor,
    useSensors,
    PointerSensor,
    KeyboardSensor,
    useDroppable,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Sparkles, Calendar, Clock, Edit2, Trash2, Filter } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { Task, Quadrant } from '@/types';
import { TaskEditModal } from '@/components/domain';
import { ConfirmationModal } from '@/components/ui';
import { EmptyQuadrantState } from '@/components/domain';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('PriorityMatrix');

interface QuadrantConfig {
    id: Quadrant;
    title: string;
    subtitle: string;
    color: string;
    bgClass: string;
}

const QUADRANTS: QuadrantConfig[] = [
    {
        id: 'urgent-important',
        title: 'Urgente & Importante',
        subtitle: 'Faça Agora',
        color: '#D97706',
        bgClass: 'bg-gradient-to-br from-ceramic-error/5 to-amber-50'
    },
    {
        id: 'important',
        title: 'Importante, Não Urgente',
        subtitle: 'Agende',
        color: '#7B8FA2',
        bgClass: 'bg-gradient-to-br from-ceramic-info/5 to-ceramic-info/10'
    },
    {
        id: 'urgent',
        title: 'Urgente, Não Importante',
        subtitle: 'Delegue',
        color: '#FBBF24',
        bgClass: 'bg-gradient-to-br from-amber-50 to-amber-50'
    },
    {
        id: 'low',
        title: 'Nem Urgente, Nem Importante',
        subtitle: 'Elimine',
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
    onEditTask: (task: Task) => void;
    onDeleteTask: (task: Task) => void;
    children?: React.ReactNode;
}> = ({ quadrant, tasks, isLoading, onEditTask, onDeleteTask, children }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: quadrant.id,
    });

    return (
        <div
            ref={setNodeRef}
            data-container-type="quadrant"
            data-tour={getQuadrantTourTarget(quadrant.id)}
            className={`ceramic-tray p-4 min-h-[200px] rounded-2xl transition-all ${
                isOver ? 'ring-2 ring-amber-400 bg-amber-50/50' : ''
            }`}
            style={{ borderTop: `4px solid ${quadrant.color}` }}
        >
            {/* Quadrant Header */}
            <div className="mb-4">
                <h3 className="text-sm font-black text-ceramic-text-primary uppercase tracking-wide">
                    {quadrant.title}
                </h3>
                <p className="text-xs text-ceramic-text-secondary">
                    {quadrant.subtitle} • {tasks.length} tarefas
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
                        <TaskCard key={task.id} task={task} onEdit={onEditTask} onDelete={onDeleteTask} />
                    ))
                )}
            </SortableContext>
        </div>
    );
};

// Sortable Task Card Component
const TaskCard: React.FC<{ task: Task; isDragging?: boolean; onEdit: (task: Task) => void; onDelete: (task: Task) => void }> = ({ task, isDragging, onEdit, onDelete }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const isOverdue = task.due_date && new Date(task.due_date) < new Date();

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="ceramic-card p-3 mb-2 group hover:scale-[1.02] transition-all bg-[#F7F6F4] border-l-4 border-amber-400 shadow-sm"
        >
            <div className="flex items-start gap-2">
                <div className="cursor-move" {...attributes} {...listeners}>
                    <GripVertical className="w-4 h-4 text-ceramic-text-secondary mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-ceramic-text-primary truncate">
                        {task.title}
                    </h4>
                    {task.associations && (
                        <p className="text-xs text-ceramic-text-secondary truncate">
                            {task.associations.name}
                        </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                        {task.due_date && (
                            <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-ceramic-error' : 'text-ceramic-text-secondary'}`}>
                                <Calendar className="w-3 h-3" />
                                {new Date(task.due_date).toLocaleDateString('pt-BR')}
                            </span>
                        )}
                        {task.estimated_duration && (
                            <span className="text-xs text-ceramic-text-secondary flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {task.estimated_duration}min
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(task);
                        }}
                        className="p-1 rounded-lg hover:bg-ceramic-text-secondary/10 transition-all"
                        title="Editar tarefa"
                    >
                        <Edit2 className="w-4 h-4 text-ceramic-text-secondary" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(task);
                        }}
                        className="p-1 rounded-lg hover:bg-ceramic-error/5 transition-all"
                        title="Remover tarefa"
                    >
                        <Trash2 className="w-4 h-4 text-ceramic-error" />
                    </button>
                </div>
            </div>
        </div>
    );
};

// Main Priority Matrix Component
interface PriorityMatrixProps {
    userId: string;
    tasks: Record<Quadrant, Task[]>;
    isLoading: boolean;
    onRefresh: () => void;
}

export const PriorityMatrix: React.FC<PriorityMatrixProps> = ({ userId, tasks, isLoading, onRefresh }) => {
    const [isAicaWorking, setIsAicaWorking] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [deletingTask, setDeletingTask] = useState<Task | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedAssociation, setSelectedAssociation] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);

    const handleEditTask = (task: Task) => {
        setEditingTask(task);
        setIsEditModalOpen(true);
    };

    const handleSaveTask = async (taskId: string, updates: Partial<Task>) => {
        try {
            const { error } = await supabase
                .from('work_items')
                .update(updates)
                .eq('id', taskId);

            if (error) throw error;

            log.debug('Task updated:', taskId, updates);
            onRefresh();
        } catch (error) {
            log.error('Error updating task:', { error });
            throw error;
        }
    };

    const handleCancelEdit = () => {
        setIsEditModalOpen(false);
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
            onRefresh();
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {QUADRANTS.map(quadrant => (
                    <DroppableQuadrant
                        key={quadrant.id}
                        quadrant={quadrant}
                        tasks={filteredTasks[quadrant.id]}
                        isLoading={isLoading}
                        onEditTask={handleEditTask}
                        onDeleteTask={handleDeleteTask}
                    />
                ))}
            </div>

            {/* Edit Modal */}
            {editingTask && (
                <TaskEditModal
                    taskId={editingTask.id}
                    initialData={editingTask}
                    isOpen={isEditModalOpen}
                    onSave={handleSaveTask}
                    onCancel={handleCancelEdit}
                />
            )}

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
