import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Trash2, Calendar, Zap, Target, Clock, List, AlertCircle, FileText } from 'lucide-react';
import { AtlasTask, TaskCategory } from '../types/plane';

interface TaskEditModalProps {
    task: AtlasTask;
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: AtlasTask) => void;
    onDelete: (taskId: string) => void;
}

// Eisenhower Matrix Quadrants (same as TaskCreationInput)
const PRIORITY_QUADRANTS = [
    {
        id: 'urgent-important',
        label: 'Urgente + Importante',
        subtitle: 'Fazer Agora',
        icon: Zap,
        isUrgent: true,
        isImportant: true,
        color: 'bg-red-50 hover:bg-red-100 border-red-300 text-red-700',
        activeColor: 'bg-red-100 border-red-500 ring-2 ring-red-500',
        priority: 'urgent' as const
    },
    {
        id: 'important',
        label: 'Importante',
        subtitle: 'Planejar',
        icon: Target,
        isUrgent: false,
        isImportant: true,
        color: 'bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700',
        activeColor: 'bg-blue-100 border-blue-500 ring-2 ring-blue-500',
        priority: 'high' as const
    },
    {
        id: 'urgent',
        label: 'Urgente',
        subtitle: 'Delegar',
        icon: Clock,
        isUrgent: true,
        isImportant: false,
        color: 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-700',
        activeColor: 'bg-amber-100 border-amber-500 ring-2 ring-amber-500',
        priority: 'medium' as const
    },
    {
        id: 'low',
        label: 'Nem um nem outro',
        subtitle: 'Eliminar',
        icon: List,
        isUrgent: false,
        isImportant: false,
        color: 'bg-gray-50 hover:bg-gray-100 border-gray-300 text-gray-700',
        activeColor: 'bg-gray-100 border-gray-500 ring-2 ring-gray-500',
        priority: 'low' as const
    }
];

const CATEGORIES: TaskCategory[] = ['Trabalho', 'Pessoal', 'Saúde', 'Educação', 'Finanças', 'Outros'];

export const TaskEditModal: React.FC<TaskEditModalProps> = ({
    task,
    isOpen,
    onClose,
    onSave,
    onDelete
}) => {
    // Form state
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || '');
    const [dueDate, setDueDate] = useState(task.target_date || '');
    const [selectedCategory, setSelectedCategory] = useState<TaskCategory | undefined>(task.category);
    const [selectedQuadrant, setSelectedQuadrant] = useState<typeof PRIORITY_QUADRANTS[0] | null>(null);

    // UI state
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Initialize quadrant selection based on task priority
    useEffect(() => {
        const quadrant = PRIORITY_QUADRANTS.find(q => q.priority === task.priority);
        setSelectedQuadrant(quadrant || null);
    }, [task.priority]);

    // Reset form when task changes
    useEffect(() => {
        setTitle(task.title);
        setDescription(task.description || '');
        setDueDate(task.target_date || '');
        setSelectedCategory(task.category);
        const quadrant = PRIORITY_QUADRANTS.find(q => q.priority === task.priority);
        setSelectedQuadrant(quadrant || null);
        setErrors({});
        setShowDeleteConfirm(false);
    }, [task]);

    if (!isOpen) return null;

    // Validate form
    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Title validation
        if (!title.trim()) {
            newErrors.title = 'O título é obrigatório';
        } else if (title.trim().length < 3) {
            newErrors.title = 'O título deve ter pelo menos 3 caracteres';
        } else if (title.length > 500) {
            newErrors.title = 'O título deve ter no máximo 500 caracteres';
        }

        // Date validation
        if (dueDate) {
            const selectedDate = new Date(dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (selectedDate < today) {
                newErrors.dueDate = 'A data não pode ser no passado';
            }
        }

        // Description validation
        if (description && description.length > 5000) {
            newErrors.description = 'A descrição deve ter no máximo 5000 caracteres';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) {
            return;
        }

        setIsSaving(true);
        try {
            const updatedTask: AtlasTask = {
                ...task,
                title: title.trim(),
                description: description.trim() || undefined,
                target_date: dueDate || undefined,
                category: selectedCategory,
                priority: selectedQuadrant?.priority || task.priority,
                is_urgent: selectedQuadrant?.isUrgent,
                is_important: selectedQuadrant?.isImportant
            };

            await onSave(updatedTask);
            onClose();
        } catch (error) {
            console.error('Error saving task:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = () => {
        onDelete(task.id);
        setShowDeleteConfirm(false);
        onClose();
    };

    const handleQuadrantSelect = (quadrant: typeof PRIORITY_QUADRANTS[0]) => {
        setSelectedQuadrant(selectedQuadrant?.id === quadrant.id ? null : quadrant);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 backdrop-blur-[4px]">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-ceramic-base w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl relative border border-ceramic-text-secondary/10 flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-ceramic-text-secondary/10">
                    <div className="flex items-center gap-3">
                        <div className="ceramic-concave w-12 h-12 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-ceramic-text-primary" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-ceramic-text-primary">
                                Editar Tarefa
                            </h2>
                            <p className="text-sm text-ceramic-text-secondary">
                                Atualize os detalhes da tarefa
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-6">
                        {/* Title */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                                Título *
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => {
                                    setTitle(e.target.value);
                                    if (errors.title) {
                                        setErrors({ ...errors, title: '' });
                                    }
                                }}
                                placeholder="Título da tarefa"
                                className={`w-full px-4 py-3 rounded-xl ceramic-inset text-ceramic-text-primary placeholder:text-ceramic-text-tertiary focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all ${
                                    errors.title ? 'border border-red-500' : ''
                                }`}
                                autoFocus
                            />
                            {errors.title && (
                                <p className="text-sm text-red-600 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    {errors.title}
                                </p>
                            )}
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                                Descrição
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => {
                                    setDescription(e.target.value);
                                    if (errors.description) {
                                        setErrors({ ...errors, description: '' });
                                    }
                                }}
                                placeholder="Adicione detalhes sobre a tarefa..."
                                rows={4}
                                maxLength={5000}
                                className={`w-full px-4 py-3 rounded-xl ceramic-inset text-ceramic-text-primary placeholder:text-ceramic-text-tertiary focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none ${
                                    errors.description ? 'border border-red-500' : ''
                                }`}
                            />
                            <div className="flex justify-between items-center">
                                {errors.description && (
                                    <p className="text-sm text-red-600 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        {errors.description}
                                    </p>
                                )}
                                <p className={`text-xs text-ceramic-text-tertiary ${errors.description ? '' : 'ml-auto'}`}>
                                    {description.length}/5000 caracteres
                                </p>
                            </div>
                        </div>

                        {/* Date Picker */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                                <Calendar className="w-4 h-4" />
                                Data Limite
                            </label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => {
                                    setDueDate(e.target.value);
                                    if (errors.dueDate) {
                                        setErrors({ ...errors, dueDate: '' });
                                    }
                                }}
                                min={new Date().toISOString().split('T')[0]}
                                className={`w-full px-4 py-3 rounded-xl ceramic-inset text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all ${
                                    errors.dueDate ? 'border border-red-500' : ''
                                }`}
                            />
                            {errors.dueDate && (
                                <p className="text-sm text-red-600 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    {errors.dueDate}
                                </p>
                            )}
                        </div>

                        {/* Eisenhower Matrix Priority Grid */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                                <Zap className="w-4 h-4" />
                                Prioridade (Matriz Eisenhower)
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {PRIORITY_QUADRANTS.map((quadrant) => {
                                    const Icon = quadrant.icon;
                                    const isSelected = selectedQuadrant?.id === quadrant.id;

                                    return (
                                        <button
                                            key={quadrant.id}
                                            type="button"
                                            onClick={() => handleQuadrantSelect(quadrant)}
                                            className={`p-3 rounded-xl border-2 transition-all text-left ${
                                                isSelected ? quadrant.activeColor : quadrant.color
                                            }`}
                                        >
                                            <div className="flex items-start gap-2 mb-1">
                                                <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold leading-tight">
                                                        {quadrant.label}
                                                    </p>
                                                    <p className="text-[10px] opacity-70 mt-0.5">
                                                        {quadrant.subtitle}
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Category Dropdown */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                                <List className="w-4 h-4" />
                                Categoria
                            </label>
                            <select
                                value={selectedCategory || ''}
                                onChange={(e) => setSelectedCategory(e.target.value as TaskCategory || undefined)}
                                className="w-full px-4 py-3 rounded-xl ceramic-inset text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            >
                                <option value="">Selecione uma categoria (opcional)</option>
                                {CATEGORIES.map((category) => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Task Metadata */}
                        {(task.created_at || task.updated_at) && (
                            <div className="p-4 rounded-xl bg-ceramic-text-secondary/5 border border-ceramic-text-secondary/10">
                                <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                                    Informações
                                </p>
                                <div className="space-y-1 text-sm text-ceramic-text-secondary">
                                    {task.created_at && (
                                        <p>
                                            Criada em: {new Date(task.created_at).toLocaleString('pt-BR')}
                                        </p>
                                    )}
                                    {task.updated_at && (
                                        <p>
                                            Atualizada em: {new Date(task.updated_at).toLocaleString('pt-BR')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-4 p-6 border-t border-ceramic-text-secondary/10">
                    {/* Delete Confirmation */}
                    {showDeleteConfirm ? (
                        <>
                            <div className="flex-1 flex items-center gap-2 px-4 py-2 bg-red-50 rounded-xl border border-red-200">
                                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                                <p className="text-sm font-medium text-red-700">
                                    Tem certeza que deseja excluir?
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-6 py-3 rounded-xl ceramic-card font-bold text-ceramic-text-secondary hover:scale-105 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="px-6 py-3 rounded-xl bg-red-600 text-white font-bold shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Excluir
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(true)}
                                className="px-6 py-3 rounded-xl ceramic-card text-red-600 font-bold hover:bg-red-50 transition-all flex items-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Deletar
                            </button>

                            <div className="flex-1" />

                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-3 rounded-xl ceramic-card font-bold text-ceramic-text-secondary hover:scale-105 transition-all"
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isSaving || !title.trim()}
                                className="px-8 py-3 rounded-xl bg-ceramic-text-primary text-ceramic-base font-bold shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center gap-2"
                            >
                                {isSaving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Salvar
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
};
