import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2,
    Circle,
    Trash2,
    Edit3,
    Calendar,
    Tag,
    MoreVertical,
    Plus,
    AlertCircle,
    Undo2
} from 'lucide-react';
import { atlasService } from '../services/atlasService';
import { AtlasTask } from '../types/plane';
import { TaskEditModal } from './TaskEditModal';
import { notificationService } from '../../../services/notificationService';

interface TaskListProps {
    tasks?: AtlasTask[];
    onTaskCreated?: () => void;
}

interface TaskWithUIState extends AtlasTask {
    isToggling?: boolean;
}

export const TaskList: React.FC<TaskListProps> = ({ tasks: providedTasks, onTaskCreated }) => {
    const [tasks, setTasks] = useState<TaskWithUIState[]>([]);
    const [categories, setCategories] = useState<Array<{
        id: string;
        name: string;
        color: string;
        icon?: string;
        is_system: boolean;
    }>>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');
    const [editingTaskModal, setEditingTaskModal] = useState<AtlasTask | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [pendingDeletes, setPendingDeletes] = useState<Map<string, NodeJS.Timeout>>(new Map());

    // Load tasks and categories
    const loadData = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // If tasks are provided via props, use them instead of fetching
            if (providedTasks) {
                setTasks(providedTasks);
                setIsLoading(false);
                return;
            }

            // Otherwise, load tasks from service
            const tasksData = await atlasService.getTasks({
                archived: false,
                completed: filter === 'completed' ? true : filter === 'active' ? false : undefined
            });

            setTasks(tasksData);

            // Try to load categories, but don't fail if they can't be loaded
            try {
                const categoriesData = await atlasService.getCategories();
                setCategories(categoriesData);
            } catch (catError) {
                console.warn('Could not load categories:', catError);
                setCategories([]);
            }
        } catch (err) {
            console.error('Error loading tasks:', err);
            setError(err instanceof Error ? err.message : 'Erro ao carregar tarefas');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [filter, providedTasks]);

    // Apply filter to tasks when using providedTasks
    const filteredTasks = useMemo(() => {
        if (!providedTasks) {
            return tasks; // If not using providedTasks, return tasks as-is (already filtered by loadData)
        }

        // Apply filter logic to providedTasks
        switch (filter) {
            case 'completed':
                return tasks.filter(t => t.status === 'completed');
            case 'active':
                return tasks.filter(t => t.status !== 'completed');
            case 'all':
            default:
                return tasks;
        }
    }, [tasks, filter, providedTasks]);

    // Auto-dismiss success message after 2.5 seconds
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 2500);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    // Cleanup pending deletes on unmount
    useEffect(() => {
        return () => {
            pendingDeletes.forEach(timeoutId => clearTimeout(timeoutId));
        };
    }, []);

    // Handle task completion toggle with optimistic update and proper status sync
    const handleToggleComplete = async (taskId: string) => {
        try {
            // Find the task being toggled
            const taskBeingToggled = tasks.find(t => t.id === taskId);
            if (!taskBeingToggled) return;

            // Set UI state to indicate toggling is in progress
            setTasks(prev => prev.map(t =>
                t.id === taskId ? { ...t, isToggling: true } : t
            ));

            // Optimistic update: toggle status immediately
            const newStatus = taskBeingToggled.status === 'completed' ? 'todo' : 'completed';
            const optimisticTask = {
                ...taskBeingToggled,
                status: newStatus,
                isToggling: true
            };
            setTasks(prev => prev.map(t => t.id === taskId ? optimisticTask : t));

            // Server update: sync with backend (now both is_completed and status are synced)
            const updatedTask = await atlasService.toggleTaskCompletion(taskId);

            // Reconcile: replace optimistic update with real server data
            setTasks(prev => prev.map(t => t.id === taskId ? { ...updatedTask, isToggling: false } : t));

            // Show success feedback
            const actionMsg = updatedTask.status === 'completed'
                ? 'Tarefa marcada como concluída!'
                : 'Tarefa reativada!';
            setSuccessMessage(actionMsg);

            console.log('[TaskList] Task toggled successfully:', {
                taskId,
                status: updatedTask.status,
                isCompleted: updatedTask.status === 'completed'
            });
        } catch (err) {
            // Revert optimistic update on error by reloading
            await loadData();
            console.error('Error toggling task:', err);
            setError(err instanceof Error ? err.message : 'Erro ao atualizar tarefa');
            setSuccessMessage(null);
        }
    };

    // Handle task deletion with soft delete and undo
    const handleDelete = async (taskId: string) => {
        try {
            // Optimistic update: remove from UI immediately
            const taskToDelete = tasks.find(t => t.id === taskId);
            if (!taskToDelete) return;

            setTasks(prev => prev.filter(t => t.id !== taskId));

            // Show notification with undo action
            const notificationId = notificationService.show({
                type: 'success',
                title: 'Tarefa excluída',
                message: 'Você tem 5 segundos para desfazer',
                icon: '🗑️',
                action: {
                    label: 'Desfazer',
                    callback: () => handleUndoDelete(taskId, taskToDelete)
                },
                duration: 5000 // 5 seconds to undo
            });

            // Schedule permanent deletion after 5 seconds
            const timeoutId = setTimeout(async () => {
                try {
                    await atlasService.deleteTask(taskId);
                    pendingDeletes.delete(taskId);
                    setPendingDeletes(new Map(pendingDeletes));
                    console.log('[TaskList] Task permanently deleted:', taskId);
                } catch (err) {
                    console.error('Error permanently deleting task:', err);
                    // Restore task on error
                    setTasks(prev => [...prev, taskToDelete]);
                    setError(err instanceof Error ? err.message : 'Erro ao deletar tarefa');
                }
            }, 5000);

            pendingDeletes.set(taskId, timeoutId);
            setPendingDeletes(new Map(pendingDeletes));
        } catch (err) {
            console.error('Error initiating task deletion:', err);
            setError(err instanceof Error ? err.message : 'Erro ao deletar tarefa');
        }
    };

    // Handle undo delete
    const handleUndoDelete = (taskId: string, task: AtlasTask) => {
        // Cancel pending deletion
        const timeoutId = pendingDeletes.get(taskId);
        if (timeoutId) {
            clearTimeout(timeoutId);
            pendingDeletes.delete(taskId);
            setPendingDeletes(new Map(pendingDeletes));
        }

        // Restore task to list
        setTasks(prev => [...prev, task].sort((a, b) =>
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        ));

        notificationService.show({
            type: 'info',
            title: 'Exclusão cancelada',
            message: 'A tarefa foi restaurada',
            icon: '↩️',
            duration: 3000
        });
    };

    // Handle task edit via modal
    const handleStartEdit = (task: AtlasTask) => {
        setEditingTaskModal(task);
    };

    const handleSaveEditModal = async (updatedTask: AtlasTask) => {
        try {
            const savedTask = await atlasService.updateTask(updatedTask.id, {
                title: updatedTask.title,
                description: updatedTask.description,
                target_date: updatedTask.target_date,
                category: updatedTask.category,
                priority: updatedTask.priority
            });
            setTasks(prev => prev.map(t => t.id === savedTask.id ? savedTask : t));
            setSuccessMessage('Tarefa atualizada com sucesso!');

            notificationService.show({
                type: 'success',
                title: 'Tarefa atualizada',
                message: 'As alterações foram salvas com sucesso',
                icon: '✓',
                duration: 3000
            });
        } catch (err) {
            console.error('Error updating task:', err);
            setError(err instanceof Error ? err.message : 'Erro ao atualizar tarefa');
        }
    };

    // Get priority color
    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent':
                return 'text-red-600 bg-red-50 border-red-200';
            case 'high':
                return 'text-orange-600 bg-orange-50 border-orange-200';
            case 'medium':
                return 'text-blue-600 bg-blue-50 border-blue-200';
            case 'low':
                return 'text-green-600 bg-green-50 border-green-200';
            default:
                return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const getPriorityLabel = (priority: string) => {
        const labels: Record<string, string> = {
            urgent: 'Urgente',
            high: 'Alta',
            medium: 'Média',
            low: 'Baixa',
            none: 'Sem prioridade'
        };
        return labels[priority] || priority;
    };

    // Format date
    const formatDate = (dateString?: string) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short'
        });
    };

    return (
        <div className="space-y-4">
            {/* Task Edit Modal */}
            {editingTaskModal && (
                <TaskEditModal
                    task={editingTaskModal}
                    isOpen={!!editingTaskModal}
                    onClose={() => setEditingTaskModal(null)}
                    onSave={handleSaveEditModal}
                    onDelete={handleDelete}
                />
            )}

            {/* Header with filters */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-ceramic-text-primary text-etched">
                    Minhas Tarefas
                </h2>

                {/* Filter buttons */}
                <div className="ceramic-card p-1 rounded-2xl flex gap-1">
                    <button
                        onClick={() => setFilter('active')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                            filter === 'active'
                                ? 'ceramic-concave text-ceramic-accent'
                                : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'
                        }`}
                    >
                        Ativas
                    </button>
                    <button
                        onClick={() => setFilter('completed')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                            filter === 'completed'
                                ? 'ceramic-concave text-ceramic-accent'
                                : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'
                        }`}
                    >
                        Concluídas
                    </button>
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                            filter === 'all'
                                ? 'ceramic-concave text-ceramic-accent'
                                : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'
                        }`}
                    >
                        Todas
                    </button>
                </div>
            </div>

            {/* Success message with animation */}
            <AnimatePresence>
                {successMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="ceramic-card p-4 rounded-2xl bg-green-50 border border-green-200"
                    >
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                            <p className="text-sm font-medium text-green-800">{successMessage}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error message with improved styling */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="ceramic-card p-4 rounded-2xl bg-red-50 border border-red-200"
                >
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        <p className="text-sm font-medium text-red-800">{error}</p>
                    </div>
                </motion.div>
            )}

            {/* Loading state */}
            {isLoading && (
                <div className="ceramic-tray p-8 rounded-2xl text-center">
                    <p className="text-ceramic-text-secondary">Carregando tarefas...</p>
                </div>
            )}

            {/* Empty state */}
            {!isLoading && filteredTasks.length === 0 && (
                <motion.div
                    className="ceramic-tray p-8 rounded-2xl text-center"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <motion.div
                        className="ceramic-inset w-16 h-16 flex items-center justify-center mx-auto mb-6 bg-blue-50"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    >
                        <Plus className="w-8 h-8 text-ceramic-accent" />
                    </motion.div>

                    <h3 className="text-lg font-bold text-ceramic-text-primary mb-2">
                        {filter === 'active' && 'Nenhuma tarefa ativa'}
                        {filter === 'completed' && 'Nenhuma tarefa concluída'}
                        {filter === 'all' && 'Nenhuma tarefa cadastrada'}
                    </h3>
                    <p className="text-sm text-ceramic-text-secondary mb-6">
                        {filter === 'active' && 'Comece adicionando uma tarefa para organizar seu trabalho'}
                        {filter === 'completed' && 'Suas tarefas concluídas aparecerão aqui'}
                        {filter === 'all' && 'Crie sua primeira tarefa para começar a planejar'}
                    </p>

                    {(filter === 'active' || filter === 'all') && (
                        <p className="text-xs text-ceramic-text-secondary/70">
                            Use o campo acima para adicionar uma nova tarefa
                        </p>
                    )}
                </motion.div>
            )}

            {/* Task list */}
            <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                    {filteredTasks.map((task) => (
                        <motion.div
                            key={task.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -100 }}
                            transition={{
                                layout: { type: 'spring', stiffness: 100, damping: 20 }
                            }}
                            className={`ceramic-card p-4 rounded-2xl transition-all ${
                                task.status === 'completed' ? 'opacity-70 bg-ceramic-text-primary/5' : ''
                            } ${task.isToggling ? 'scale-95' : 'scale-100'}`}
                        >
                            <div className="flex items-start gap-3">
                                {/* Checkbox with animation */}
                                <motion.button
                                    onClick={() => handleToggleComplete(task.id)}
                                    disabled={task.isToggling}
                                    className="flex-shrink-0 mt-1 hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <motion.div
                                        initial={false}
                                        animate={task.status === 'completed' ? 'complete' : 'incomplete'}
                                    >
                                        {task.status === 'completed' ? (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                exit={{ scale: 0 }}
                                                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                                            >
                                                <CheckCircle2 className="w-6 h-6 text-green-600" />
                                            </motion.div>
                                        ) : (
                                            <Circle className="w-6 h-6 text-ceramic-text-secondary" />
                                        )}
                                    </motion.div>
                                </motion.button>

                                {/* Task content */}
                                <div className="flex-1 min-w-0">
                                    <motion.h4
                                        className={`text-base font-bold text-ceramic-text-primary mb-2 transition-all ${
                                            task.status === 'completed' ? 'line-through text-ceramic-text-secondary/60' : ''
                                        }`}
                                        animate={{
                                            opacity: task.isToggling ? 0.6 : 1,
                                            textDecoration: task.status === 'completed' ? 'line-through' : 'none'
                                        }}
                                    >
                                        {task.title}
                                    </motion.h4>

                                    {/* Metadata */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        {/* Priority badge */}
                                        <span
                                            className={`px-2 py-1 rounded-lg text-xs font-bold border ${getPriorityColor(
                                                task.priority
                                            )}`}
                                        >
                                            {getPriorityLabel(task.priority)}
                                        </span>

                                        {/* Due date */}
                                        {task.target_date && (
                                            <span className="flex items-center gap-1 text-xs text-ceramic-text-secondary">
                                                <Calendar className="w-3 h-3" />
                                                {formatDate(task.target_date)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Description */}
                                    {task.description && (
                                        <motion.p
                                            className={`text-sm mt-2 ${
                                                task.status === 'completed'
                                                    ? 'text-ceramic-text-secondary/50'
                                                    : 'text-ceramic-text-secondary'
                                            }`}
                                            animate={{
                                                opacity: task.isToggling ? 0.6 : 1
                                            }}
                                        >
                                            {task.description}
                                        </motion.p>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex-shrink-0 flex gap-2">
                                    <button
                                        onClick={() => handleStartEdit(task)}
                                        disabled={task.isToggling}
                                        className="p-2 rounded-xl hover:bg-ceramic-text-secondary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Editar"
                                    >
                                        <Edit3 className="w-4 h-4 text-ceramic-text-secondary" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(task.id)}
                                        disabled={task.isToggling}
                                        className="p-2 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Deletar"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-600" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Task count and stats */}
            {!isLoading && filteredTasks.length > 0 && (
                <motion.div
                    className="text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <p className="text-xs text-ceramic-text-tertiary">
                        {filteredTasks.length} {filteredTasks.length === 1 ? 'tarefa' : 'tarefas'}
                        {filter === 'active' && ` - ${tasks.filter(t => t.status !== 'completed').length} ativa(s)`}
                        {filter === 'completed' && ` - ${tasks.filter(t => t.status === 'completed').length} concluída(s)`}
                    </p>
                </motion.div>
            )}
        </div>
    );
};
