import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2,
    Circle,
    Trash2,
    Edit3,
    Calendar,
    Tag,
    MoreVertical,
    Plus
} from 'lucide-react';
import { atlasService } from '../services/atlasService';
import { AtlasTask } from '../types/plane';

interface TaskListProps {
    onTaskCreated?: () => void;
}

export const TaskList: React.FC<TaskListProps> = ({ onTaskCreated }) => {
    const [tasks, setTasks] = useState<AtlasTask[]>([]);
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
    const [editingTask, setEditingTask] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');

    // Load tasks and categories
    const loadData = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Load tasks first
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
    }, [filter]);

    // Handle task completion toggle
    const handleToggleComplete = async (taskId: string) => {
        try {
            const updatedTask = await atlasService.toggleTaskCompletion(taskId);
            setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
        } catch (err) {
            console.error('Error toggling task:', err);
            setError(err instanceof Error ? err.message : 'Erro ao atualizar tarefa');
        }
    };

    // Handle task deletion
    const handleDelete = async (taskId: string) => {
        if (!confirm('Tem certeza que deseja deletar esta tarefa?')) return;

        try {
            await atlasService.deleteTask(taskId);
            setTasks(prev => prev.filter(t => t.id !== taskId));
        } catch (err) {
            console.error('Error deleting task:', err);
            setError(err instanceof Error ? err.message : 'Erro ao deletar tarefa');
        }
    };

    // Handle task edit
    const handleStartEdit = (task: AtlasTask) => {
        setEditingTask(task.id);
        setEditTitle(task.title);
    };

    const handleSaveEdit = async (taskId: string) => {
        if (editTitle.trim().length === 0) {
            setError('O título não pode ser vazio');
            return;
        }

        try {
            const updatedTask = await atlasService.updateTask(taskId, {
                title: editTitle.trim()
            });
            setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
            setEditingTask(null);
            setEditTitle('');
        } catch (err) {
            console.error('Error updating task:', err);
            setError(err instanceof Error ? err.message : 'Erro ao atualizar tarefa');
        }
    };

    const handleCancelEdit = () => {
        setEditingTask(null);
        setEditTitle('');
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

            {/* Error message */}
            {error && (
                <div className="ceramic-card p-4 rounded-2xl bg-red-50 border border-red-200">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            {/* Loading state */}
            {isLoading && (
                <div className="ceramic-tray p-8 rounded-2xl text-center">
                    <p className="text-ceramic-text-secondary">Carregando tarefas...</p>
                </div>
            )}

            {/* Empty state */}
            {!isLoading && tasks.length === 0 && (
                <div className="ceramic-tray p-8 rounded-2xl text-center">
                    <Plus className="w-12 h-12 mx-auto mb-3 text-ceramic-text-secondary/50" />
                    <p className="text-ceramic-text-secondary">
                        {filter === 'active' && 'Nenhuma tarefa ativa'}
                        {filter === 'completed' && 'Nenhuma tarefa concluída'}
                        {filter === 'all' && 'Nenhuma tarefa cadastrada'}
                    </p>
                    <p className="text-xs text-ceramic-text-tertiary mt-2">
                        Use o campo acima para adicionar uma nova tarefa
                    </p>
                </div>
            )}

            {/* Task list */}
            <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                    {tasks.map((task) => (
                        <motion.div
                            key={task.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -100 }}
                            className={`ceramic-card p-4 rounded-2xl ${
                                task.status === 'completed' ? 'opacity-60' : ''
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                {/* Checkbox */}
                                <button
                                    onClick={() => handleToggleComplete(task.id)}
                                    className="flex-shrink-0 mt-1 hover:scale-110 transition-transform"
                                >
                                    {task.status === 'completed' ? (
                                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                                    ) : (
                                        <Circle className="w-6 h-6 text-ceramic-text-secondary" />
                                    )}
                                </button>

                                {/* Task content */}
                                <div className="flex-1 min-w-0">
                                    {editingTask === task.id ? (
                                        <div className="space-y-2">
                                            <input
                                                type="text"
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSaveEdit(task.id);
                                                    if (e.key === 'Escape') handleCancelEdit();
                                                }}
                                                className="w-full px-3 py-2 rounded-xl border border-ceramic-text-secondary/20 focus:outline-none focus:ring-2 focus:ring-ceramic-accent"
                                                autoFocus
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleSaveEdit(task.id)}
                                                    className="px-3 py-1 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700"
                                                >
                                                    Salvar
                                                </button>
                                                <button
                                                    onClick={handleCancelEdit}
                                                    className="px-3 py-1 rounded-lg ceramic-tray text-sm font-bold"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <h4
                                                className={`text-base font-bold text-ceramic-text-primary mb-2 ${
                                                    task.status === 'completed' ? 'line-through' : ''
                                                }`}
                                            >
                                                {task.title}
                                            </h4>

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
                                                <p className="text-sm text-ceramic-text-secondary mt-2">
                                                    {task.description}
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Actions */}
                                {editingTask !== task.id && (
                                    <div className="flex-shrink-0 flex gap-2">
                                        <button
                                            onClick={() => handleStartEdit(task)}
                                            className="p-2 rounded-xl hover:bg-ceramic-text-secondary/10 transition-colors"
                                            title="Editar"
                                        >
                                            <Edit3 className="w-4 h-4 text-ceramic-text-secondary" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(task.id)}
                                            className="p-2 rounded-xl hover:bg-red-50 transition-colors"
                                            title="Deletar"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-600" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Task count */}
            {!isLoading && tasks.length > 0 && (
                <div className="text-center">
                    <p className="text-xs text-ceramic-text-tertiary">
                        {tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'}
                    </p>
                </div>
            )}
        </div>
    );
};
