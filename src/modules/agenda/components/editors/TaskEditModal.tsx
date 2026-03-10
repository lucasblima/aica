import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Calendar, Clock, Link2, AlertCircle, FileText, FileText as FileTextIcon, ListChecks, Tag, Repeat } from 'lucide-react';
import { Task } from '@/types';
import { Accordion } from '@/components/ui';
import { SubtaskList, Subtask } from '@/components/ui';
import { TagInput } from '@/components/ui';
import { RecurrenceEditor } from './RecurrenceEditor';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('TaskEditModal');

interface TaskEditModalProps {
    taskId: string;
    initialData: Task;
    isOpen: boolean;
    onSave: (taskId: string, updates: Partial<Task>) => Promise<void>;
    onCancel: () => void;
}

export const TaskEditModal: React.FC<TaskEditModalProps> = ({
    taskId,
    initialData,
    isOpen,
    onSave,
    onCancel
}) => {
    // Form state - Core Fields
    const [title, setTitle] = useState(initialData.title);
    const [dueDate, setDueDate] = useState(initialData.due_date || '');
    const [estimatedDuration, setEstimatedDuration] = useState(initialData.estimated_duration?.toString() || '');
    const [scheduledTime, setScheduledTime] = useState(initialData.scheduled_time || '');

    // Form state - Advanced Fields
    const [description, setDescription] = useState(initialData.description || '');
    const [subtasks, setSubtasks] = useState<Subtask[]>([]);
    const [tags, setTags] = useState<string[]>(initialData.tags || []);
    const [recurrenceRule, setRecurrenceRule] = useState(initialData.recurrence_rule || undefined);

    // UI state
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);

    // Reset form when task changes
    useEffect(() => {
        setTitle(initialData.title);
        setDueDate(initialData.due_date || '');
        setEstimatedDuration(initialData.estimated_duration?.toString() || '');
        setScheduledTime(initialData.scheduled_time || '');
        setDescription(initialData.description || '');
        setTags(initialData.tags || []);
        setRecurrenceRule(initialData.recurrence_rule || undefined);
        setSubtasks([]); // Will be loaded from DB
        setErrors({});
    }, [initialData]);

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

        // Duration validation
        if (estimatedDuration && (isNaN(Number(estimatedDuration)) || Number(estimatedDuration) <= 0)) {
            newErrors.estimatedDuration = 'Duração deve ser um número positivo';
        }

        // Time validation (HH:MM format)
        if (scheduledTime && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(scheduledTime)) {
            newErrors.scheduledTime = 'Formato inválido. Use HH:MM (ex: 14:30)';
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
            const updates: Partial<Task> = {
                title: title.trim(),
                due_date: dueDate || undefined,
                estimated_duration: estimatedDuration ? Number(estimatedDuration) : undefined,
                scheduled_time: scheduledTime || undefined,
                description: description.trim() || undefined,
                tags: tags.length > 0 ? tags : undefined,
                recurrence_rule: recurrenceRule || undefined,
            };

            await onSave(taskId, updates);
            onCancel();
        } catch (error) {
            log.error('Error saving task:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onCancel();
        } else if (e.key === 'Enter' && e.ctrlKey) {
            handleSave();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 backdrop-blur-[4px]">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-ceramic-base w-full max-w-lg max-h-[90vh] rounded-3xl shadow-2xl relative border border-ceramic-text-secondary/10 flex flex-col"
                        onKeyDown={handleKeyDown}
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
                                onClick={onCancel}
                                className="p-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="space-y-4">
                                {/* Core Fields - Always Visible */}
                                <div className="space-y-3">
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
                                            className={`w-full px-4 py-3 rounded-xl ceramic-inset text-ceramic-text-primary placeholder:text-ceramic-text-tertiary focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all ${
                                                errors.title ? 'border border-ceramic-error' : ''
                                            }`}
                                            autoFocus
                                        />
                                        {errors.title && (
                                            <p className="text-sm text-ceramic-error flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                {errors.title}
                                            </p>
                                        )}
                                    </div>

                                    {/* Due Date */}
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
                                            className={`w-full px-4 py-3 rounded-xl ceramic-inset text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all ${
                                                errors.dueDate ? 'border border-ceramic-error' : ''
                                            }`}
                                        />
                                        {errors.dueDate && (
                                            <p className="text-sm text-ceramic-error flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                {errors.dueDate}
                                            </p>
                                        )}
                                    </div>

                                    {/* Estimated Duration */}
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                                            <Clock className="w-4 h-4" />
                                            Duração Estimada (minutos)
                                        </label>
                                        <input
                                            type="number"
                                            value={estimatedDuration}
                                            onChange={(e) => {
                                                setEstimatedDuration(e.target.value);
                                                if (errors.estimatedDuration) {
                                                    setErrors({ ...errors, estimatedDuration: '' });
                                                }
                                            }}
                                            placeholder="60"
                                            min="1"
                                            className={`w-full px-4 py-3 rounded-xl ceramic-inset text-ceramic-text-primary placeholder:text-ceramic-text-tertiary focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all ${
                                                errors.estimatedDuration ? 'border border-ceramic-error' : ''
                                            }`}
                                        />
                                        {errors.estimatedDuration && (
                                            <p className="text-sm text-ceramic-error flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                {errors.estimatedDuration}
                                            </p>
                                        )}
                                    </div>

                                    {/* Scheduled Time */}
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                                            <Clock className="w-4 h-4" />
                                            Horário Agendado
                                        </label>
                                        <input
                                            type="time"
                                            value={scheduledTime}
                                            onChange={(e) => {
                                                setScheduledTime(e.target.value);
                                                if (errors.scheduledTime) {
                                                    setErrors({ ...errors, scheduledTime: '' });
                                                }
                                            }}
                                            className={`w-full px-4 py-3 rounded-xl ceramic-inset text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all ${
                                                errors.scheduledTime ? 'border border-ceramic-error' : ''
                                            }`}
                                        />
                                        {errors.scheduledTime && (
                                            <p className="text-sm text-ceramic-error flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                {errors.scheduledTime}
                                            </p>
                                        )}
                                    </div>

                                    {/* Association (read-only) */}
                                    {initialData.associations && (
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                                                <Link2 className="w-4 h-4" />
                                                Associação
                                            </label>
                                            <div className="w-full px-4 py-3 rounded-xl ceramic-inset text-ceramic-text-secondary bg-ceramic-text-secondary/5">
                                                {initialData.associations.name}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Accordion Sections */}
                                <div className="space-y-3">
                                    {/* Description */}
                                    <Accordion
                                        title="Descrição"
                                        icon={FileTextIcon}
                                        defaultExpanded={!!initialData.description}
                                        id="accordion-description"
                                    >
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Adicione detalhes sobre a tarefa..."
                                            maxLength={5000}
                                            className="w-full px-4 py-3 rounded-lg ceramic-inset text-ceramic-text-primary placeholder:text-ceramic-text-tertiary focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all resize-none"
                                            rows={4}
                                        />
                                        <div className="text-right text-xs text-ceramic-text-tertiary">
                                            {description.length} / 5000
                                        </div>
                                    </Accordion>

                                    {/* Subtasks */}
                                    <Accordion
                                        title="Subtarefas"
                                        icon={ListChecks}
                                        id="accordion-subtasks"
                                    >
                                        <SubtaskList
                                            subtasks={subtasks}
                                            onChange={setSubtasks}
                                        />
                                    </Accordion>

                                    {/* Tags */}
                                    <Accordion
                                        title="Etiquetas"
                                        icon={Tag}
                                        defaultExpanded={tags.length > 0}
                                        id="accordion-tags"
                                    >
                                        <TagInput
                                            tags={tags}
                                            onChange={setTags}
                                        />
                                    </Accordion>

                                    {/* Recurrence */}
                                    <Accordion
                                        title="Repetir"
                                        icon={Repeat}
                                        defaultExpanded={!!initialData.recurrence_rule}
                                        id="accordion-recurrence"
                                    >
                                        <RecurrenceEditor
                                            value={recurrenceRule ?? null}
                                            onChange={(rrule) => setRecurrenceRule(rrule ?? undefined)}
                                        />
                                    </Accordion>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex gap-4 p-6 border-t border-ceramic-text-secondary/10">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="flex-1 px-6 py-3 rounded-xl ceramic-card font-bold text-ceramic-text-secondary hover:scale-105 transition-all"
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isSaving || !title.trim()}
                                className="flex-1 px-8 py-3 rounded-xl bg-ceramic-text-primary text-ceramic-base font-bold shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center justify-center gap-2"
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
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
