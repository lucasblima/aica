/**
 * TaskEditDrawer Component
 *
 * Drawer lateral (desktop) / bottom (mobile) para edição de tarefas.
 * Inspirado no design da Apple - transições suaves, contexto preservado.
 *
 * Features:
 * - Desktop: Slide-in da direita (600px width)
 * - Mobile: Slide-in de baixo (full-height)
 * - Backdrop translúcido (preserva contexto)
 * - Swipe to dismiss (mobile)
 * - Seções em accordion: Descrição, Subtarefas, Tags, Repetição
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue } from 'framer-motion';
import { X, Save, Calendar, Clock, Link2, AlertCircle, FileText, FileText as FileTextIcon, ListChecks, Tag, Repeat, Sparkles, Loader2, Check, Plus } from 'lucide-react';
import { Task } from '@/types';
import { Accordion } from '@/components/ui';
import { SubtaskList, Subtask } from '@/components/ui';
import { RecurrencePicker } from '@/components/ui';
import { TagInput } from '@/components/ui';
import { createNamespacedLogger } from '@/lib/logger';
import { decomposeTask, type TaskDecomposition } from '@/services/taskAIService';

const log = createNamespacedLogger('TaskEditDrawer');

interface TaskEditDrawerProps {
    taskId: string;
    initialData: Task;
    isOpen: boolean;
    onSave: (taskId: string, updates: Partial<Task>) => Promise<void>;
    onCancel: () => void;
}

export const TaskEditDrawer: React.FC<TaskEditDrawerProps> = ({
    taskId,
    initialData,
    isOpen,
    onSave,
    onCancel
}) => {
    // Extract HH:MM from a timestamptz string (e.g. "2026-02-18T12:00:00+00:00" → "12:00")
    const extractTimeFromTimestamp = (ts?: string): string => {
        if (!ts) return '';
        // If already HH:MM format, return as-is
        if (/^\d{2}:\d{2}$/.test(ts)) return ts;
        try {
            const d = new Date(ts);
            if (isNaN(d.getTime())) return ts;
            return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        } catch {
            return ts;
        }
    };

    // Form state - Core Fields
    const [title, setTitle] = useState(initialData.title);
    const [dueDate, setDueDate] = useState(initialData.due_date || '');
    const [estimatedDuration, setEstimatedDuration] = useState(initialData.estimated_duration?.toString() || '');
    const [scheduledTime, setScheduledTime] = useState(extractTimeFromTimestamp(initialData.scheduled_time));

    // Form state - Advanced Fields
    const [description, setDescription] = useState(initialData.description || '');
    const [subtasks, setSubtasks] = useState<Subtask[]>([]);
    const [tags, setTags] = useState<string[]>(initialData.tags || []);
    const [recurrenceRule, setRecurrenceRule] = useState(initialData.recurrence_rule || undefined);

    // Checklist state (for task_type === 'list')
    const [checklist, setChecklist] = useState<Array<{ text: string; done: boolean }>>(initialData.checklist || []);
    const [newChecklistItemText, setNewChecklistItemText] = useState('');

    // UI state
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // AI decomposition state
    const [isDecomposing, setIsDecomposing] = useState(false);

    // Swipe to dismiss (mobile)
    const y = useMotionValue(0);

    // Reset form when task changes
    useEffect(() => {
        setTitle(initialData.title);
        setDueDate(initialData.due_date || '');
        setEstimatedDuration(initialData.estimated_duration?.toString() || '');
        setScheduledTime(extractTimeFromTimestamp(initialData.scheduled_time));
        setDescription(initialData.description || '');
        setTags(initialData.tags || []);
        setRecurrenceRule(initialData.recurrence_rule || undefined);
        setChecklist(initialData.checklist || []);
        setNewChecklistItemText('');
        setSubtasks([]); // Will be loaded from DB
        setErrors({});
        setIsDirty(false);
    }, [initialData]);

    // Track dirty state
    useEffect(() => {
        const hasChanges =
            title !== initialData.title ||
            dueDate !== (initialData.due_date || '') ||
            estimatedDuration !== (initialData.estimated_duration?.toString() || '') ||
            scheduledTime !== extractTimeFromTimestamp(initialData.scheduled_time) ||
            description !== (initialData.description || '') ||
            JSON.stringify(tags) !== JSON.stringify(initialData.tags || []) ||
            JSON.stringify(checklist) !== JSON.stringify(initialData.checklist || []) ||
            recurrenceRule !== (initialData.recurrence_rule || undefined);

        setIsDirty(hasChanges);
    }, [title, dueDate, estimatedDuration, scheduledTime, description, tags, checklist, recurrenceRule, initialData]);

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
            // Build full ISO timestamp from date + time for scheduled_time
            let scheduledTimestamp: string | undefined;
            if (scheduledTime) {
                const baseDate = dueDate || new Date().toISOString().split('T')[0];
                scheduledTimestamp = `${baseDate}T${scheduledTime}:00`;
            }

            const updates: Partial<Task> = {
                title: title.trim(),
                due_date: dueDate || undefined,
                estimated_duration: estimatedDuration ? Number(estimatedDuration) : undefined,
                scheduled_time: scheduledTimestamp,
                description: description.trim() || undefined,
                tags: tags.length > 0 ? tags : undefined,
                recurrence_rule: recurrenceRule || undefined,
                checklist: checklist.length > 0 ? checklist : null,
            };

            await onSave(taskId, updates);
            onCancel();
        } catch (error) {
            log.error('Error saving task:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCloseClick = () => {
        if (isDirty) {
            const confirmed = window.confirm(
                'Você tem alterações não salvas. Deseja realmente sair?'
            );
            if (!confirmed) return;
        }
        onCancel();
    };

    const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        // Close drawer if dragged down >150px on mobile
        if (info.offset.y > 150) {
            handleCloseClick();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            handleCloseClick();
        } else if (e.key === 'Enter' && e.ctrlKey) {
            handleSave();
        }
    };

    const handleAiDecompose = async () => {
        if (!title.trim()) return;
        setIsDecomposing(true);
        try {
            const result = await decomposeTask(
                title.trim(),
                description.trim() || undefined,
                estimatedDuration ? Number(estimatedDuration) / 60 : undefined
            );
            // Convert AI subtasks to the UI Subtask format
            const aiSubtasks: Subtask[] = result.subtasks.map((s, i) => ({
                id: `ai-${Date.now()}-${i}`,
                title: s.title,
                is_completed: false,
                order: i,
            }));
            setSubtasks(prev => [...prev, ...aiSubtasks]);
            // Update estimated duration with AI total if not set
            if (!estimatedDuration && result.totalEstimate) {
                const totalMin = result.subtasks.reduce((sum, s) => sum + s.estimatedMinutes, 0);
                if (totalMin > 0) setEstimatedDuration(String(totalMin));
            }
        } catch (err) {
            log.error('AI decompose error:', err);
        } finally {
            setIsDecomposing(false);
        }
    };

    const errorCount = Object.keys(errors).length;
    const isFormValid = errorCount === 0 && title.trim().length >= 3;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
                        onClick={handleCloseClick}
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={0.2}
                        onDragEnd={handleDragEnd}
                        style={{ y }}
                        className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[600px] bg-ceramic-base shadow-2xl flex flex-col
                                   sm:rounded-l-2xl overflow-hidden"
                        onKeyDown={handleKeyDown}
                    >
                        {/* Mobile drag handle */}
                        <div className="sm:hidden flex justify-center py-2 bg-ceramic-base border-b border-ceramic-text-secondary/10">
                            <div className="w-12 h-1 rounded-full bg-ceramic-text-secondary/30" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-ceramic-text-secondary/10 bg-white/20">
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
                                onClick={handleCloseClick}
                                className="p-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content (scrollable) */}
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
                                        <button
                                            type="button"
                                            onClick={handleAiDecompose}
                                            disabled={isDecomposing || !title.trim()}
                                            className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            {isDecomposing ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Sparkles className="w-3.5 h-3.5" />
                                            )}
                                            {isDecomposing ? 'Decompondo...' : 'Decompor com IA'}
                                        </button>
                                    </Accordion>

                                    {/* Checklist (for task_type 'list') */}
                                    {(initialData.task_type === 'list' || checklist.length > 0) && (
                                        <Accordion
                                            title={`Checklist${checklist.length > 0 ? ` (${checklist.filter(i => i.done).length}/${checklist.length})` : ''}`}
                                            icon={ListChecks}
                                            defaultExpanded={true}
                                            id="accordion-checklist"
                                        >
                                            <div className="space-y-2">
                                                {checklist.map((item, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 ceramic-inset p-2.5 rounded-lg group">
                                                        <button
                                                            type="button"
                                                            onClick={() => setChecklist(prev => prev.map((it, i) => i === idx ? { ...it, done: !it.done } : it))}
                                                            className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                                                item.done ? 'bg-ceramic-accent border-ceramic-accent' : 'border-ceramic-text-secondary/30 hover:border-ceramic-accent'
                                                            }`}
                                                        >
                                                            {item.done && <Check className="w-3 h-3 text-white" />}
                                                        </button>
                                                        <input
                                                            type="text"
                                                            value={item.text}
                                                            onChange={(e) => setChecklist(prev => prev.map((it, i) => i === idx ? { ...it, text: e.target.value } : it))}
                                                            className={`flex-1 bg-transparent text-sm font-medium outline-none ${
                                                                item.done ? 'text-ceramic-text-secondary line-through' : 'text-ceramic-text-primary'
                                                            }`}
                                                            maxLength={200}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setChecklist(prev => prev.filter((_, i) => i !== idx))}
                                                            className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-ceramic-text-secondary hover:text-red-500"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={newChecklistItemText}
                                                        onChange={(e) => setNewChecklistItemText(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && newChecklistItemText.trim()) {
                                                                e.preventDefault();
                                                                setChecklist(prev => [...prev, { text: newChecklistItemText.trim(), done: false }]);
                                                                setNewChecklistItemText('');
                                                            }
                                                        }}
                                                        placeholder="+ Adicionar item (Enter)"
                                                        className="flex-1 ceramic-inset px-3 py-2 rounded-lg text-sm placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                                        maxLength={200}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (newChecklistItemText.trim()) {
                                                                setChecklist(prev => [...prev, { text: newChecklistItemText.trim(), done: false }]);
                                                                setNewChecklistItemText('');
                                                            }
                                                        }}
                                                        disabled={!newChecklistItemText.trim()}
                                                        className="flex-shrink-0 ceramic-concave p-2 hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <Plus className="w-4 h-4 text-ceramic-text-primary" />
                                                    </button>
                                                </div>
                                            </div>
                                        </Accordion>
                                    )}

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
                                        <RecurrencePicker
                                            value={recurrenceRule}
                                            onChange={setRecurrenceRule}
                                            baseDate={dueDate ? new Date(dueDate) : new Date()}
                                        />
                                    </Accordion>
                                </div>
                            </div>
                        </div>

                        {/* Footer (fixed) */}
                        <div className="flex items-center justify-between p-6 border-t border-ceramic-text-secondary/10 bg-white/20">
                            <div className="flex items-center gap-2">
                                {errorCount > 0 && (
                                    <div className="flex items-center gap-2 text-ceramic-error">
                                        <AlertCircle className="w-4 h-4" />
                                        <span className="text-sm font-medium">
                                            {errorCount} erro{errorCount > 1 ? 's' : ''}
                                        </span>
                                    </div>
                                )}
                                {isDirty && !errorCount && (
                                    <span className="text-xs text-ceramic-text-secondary">Alterações não salvas</span>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleCloseClick}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-ceramic-text-primary hover:bg-white/30 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={!isFormValid || isSaving}
                                    className="flex items-center gap-2 px-6 py-2 bg-ceramic-text-primary hover:bg-ceramic-text-primary/90 disabled:bg-ceramic-text-secondary/20 disabled:cursor-not-allowed text-ceramic-base rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                                >
                                    {isSaving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Salvando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            <span>Salvar</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
