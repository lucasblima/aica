/**
 * TaskBottomSheet Component
 *
 * Responsive task detail/edit sheet.
 * - Mobile (< lg): Bottom sheet from bottom (iOS-style, drag to dismiss)
 * - Desktop (>= lg): Side sheet from right (like TaskEditDrawer)
 *
 * Extracts form fields from TaskEditDrawer with RecurrencePicker
 * more prominent (not buried in accordion).
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue } from 'framer-motion';
import {
  X, Save, Trash2, Calendar, Clock, Link2, AlertCircle,
  FileText, ListChecks, Tag, Repeat, Sparkles, Loader2,
  Check, Plus,
} from 'lucide-react';
import type { Task } from '@/types';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { useHolidays } from '@/hooks/useHolidays';
import { notificationService } from '@/services/notificationService';
import { Accordion, SubtaskList, RecurrencePicker, TagInput } from '@/components/ui';
import type { Subtask } from '@/components/ui/SubtaskList';
import { createNamespacedLogger } from '@/lib/logger';
import { decomposeTask } from '@/services/taskAIService';

const log = createNamespacedLogger('TaskBottomSheet');

// Spring configs matching AuthSheet / ceramic-motion
const sheetSpring = {
  type: 'spring' as const,
  damping: 30,
  stiffness: 300,
  mass: 0.8,
};

const DISMISS_THRESHOLD = 100;
const VELOCITY_THRESHOLD = 500;

interface TaskBottomSheetProps {
  task: Task | null;
  isOpen: boolean;
  onSave: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onComplete: (task: Task) => void;
  onDelete: (task: Task) => void;
  onClose: () => void;
}

export const TaskBottomSheet: React.FC<TaskBottomSheetProps> = ({
  task,
  isOpen,
  onSave,
  onComplete,
  onDelete,
  onClose,
}) => {
  const isDesktop = useIsDesktop();
  const { isHoliday } = useHolidays();

  // ---- helpers ----
  const extractTimeFromTimestamp = (ts?: string | null): string => {
    if (!ts) return '';
    if (/^\d{2}:\d{2}$/.test(ts)) return ts;
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } catch {
      return ts;
    }
  };

  // ---- Form state ----
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [description, setDescription] = useState('');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [recurrenceRule, setRecurrenceRule] = useState<string | undefined>(undefined);
  const [checklist, setChecklist] = useState<Array<{ text: string; done: boolean }>>([]);
  const [newChecklistItemText, setNewChecklistItemText] = useState('');

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const isDirtyRef = useRef(isDirty);
  const [isDecomposing, setIsDecomposing] = useState(false);

  // Drag
  const y = useMotionValue(0);

  // ---- Reset form when task changes ----
  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDueDate(task.due_date || '');
    setEstimatedDuration(task.estimated_duration?.toString() || '');
    setScheduledTime(extractTimeFromTimestamp(task.scheduled_time));
    setDescription(task.description || '');
    setTags(task.tags || []);
    setRecurrenceRule(task.recurrence_rule || undefined);
    setChecklist(task.checklist || []);
    setNewChecklistItemText('');
    setSubtasks([]);
    setErrors({});
    setIsDirty(false);
  }, [task]);

  // ---- Track dirty ----
  useEffect(() => {
    if (!task) return;
    const hasChanges =
      title !== task.title ||
      dueDate !== (task.due_date || '') ||
      estimatedDuration !== (task.estimated_duration?.toString() || '') ||
      scheduledTime !== extractTimeFromTimestamp(task.scheduled_time) ||
      description !== (task.description || '') ||
      JSON.stringify(tags) !== JSON.stringify(task.tags || []) ||
      JSON.stringify(checklist) !== JSON.stringify(task.checklist || []) ||
      recurrenceRule !== (task.recurrence_rule || undefined);
    setIsDirty(hasChanges);
    isDirtyRef.current = hasChanges;
  }, [title, dueDate, estimatedDuration, scheduledTime, description, tags, checklist, recurrenceRule, task]);

  // ---- Keyboard ----
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (isDirty) {
          const confirmed = window.confirm('Voce tem alteracoes nao salvas. Deseja sair?');
          if (!confirmed) return;
        }
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, isDirty, onClose]);

  // ---- Validate ----
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) {
      newErrors.title = 'O titulo e obrigatorio';
    } else if (title.trim().length < 3) {
      newErrors.title = 'O titulo deve ter pelo menos 3 caracteres';
    }
    if (dueDate) {
      const d = new Date(dueDate);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (d < today) newErrors.dueDate = 'A data nao pode ser no passado';
    }
    if (estimatedDuration && (isNaN(Number(estimatedDuration)) || Number(estimatedDuration) <= 0)) {
      newErrors.estimatedDuration = 'Duracao deve ser um numero positivo';
    }
    if (scheduledTime && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(scheduledTime)) {
      newErrors.scheduledTime = 'Formato invalido. Use HH:MM';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ---- Save ----
  const handleSave = async () => {
    if (!task || !validateForm()) return;
    setIsSaving(true);
    try {
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
      await onSave(task.id, updates);

      // Holiday warning
      if (dueDate) {
        const holiday = isHoliday(dueDate);
        if (holiday) {
          const dateFormatted = new Date(dueDate + 'T12:00:00').toLocaleDateString('pt-BR');
          notificationService.show({
            type: 'warning',
            title: 'Feriado detectado',
            message: `${dateFormatted} e ${holiday.name}. Considere ajustar a data limite.`,
            duration: 6000,
          });
        }
      }

      onClose();
    } catch (error) {
      log.error('Error saving task:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseClick = useCallback(() => {
    if (isDirty) {
      const confirmed = window.confirm('Voce tem alteracoes nao salvas. Deseja sair?');
      if (!confirmed) return;
    }
    onClose();
  }, [isDirty, onClose]);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const shouldDismiss =
        info.offset.y > DISMISS_THRESHOLD || info.velocity.y > VELOCITY_THRESHOLD;
      if (shouldDismiss) handleCloseClick();
    },
    [handleCloseClick]
  );

  // AI decompose
  const handleAiDecompose = async () => {
    if (!title.trim()) return;
    setIsDecomposing(true);
    try {
      const result = await decomposeTask(
        title.trim(),
        description.trim() || undefined,
        estimatedDuration ? Number(estimatedDuration) / 60 : undefined
      );
      const aiSubtasks: Subtask[] = result.subtasks.map((s, i) => ({
        id: `ai-${Date.now()}-${i}`,
        title: s.title,
        is_completed: false,
        order: subtasks.length + i,
      }));
      setSubtasks(prev => [...prev, ...aiSubtasks]);
      if (!estimatedDuration && result.subtasks.length > 0) {
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

  if (!task) return null;

  // ---- Shared form content ----
  const formContent = (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="space-y-4">
        {/* Core Fields */}
        <div className="space-y-3">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
              Titulo *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors({ ...errors, title: '' });
              }}
              placeholder="Titulo da tarefa"
              className={`w-full px-4 py-3 rounded-xl ceramic-inset text-ceramic-text-primary placeholder:text-ceramic-text-tertiary focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all ${
                errors.title ? 'border border-ceramic-error' : ''
              }`}
              autoFocus={isDesktop}
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
                if (errors.dueDate) setErrors({ ...errors, dueDate: '' });
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

          {/* Time + Duration row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                <Clock className="w-4 h-4" />
                Horario
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => {
                  setScheduledTime(e.target.value);
                  if (errors.scheduledTime) setErrors({ ...errors, scheduledTime: '' });
                }}
                className={`w-full px-4 py-3 rounded-xl ceramic-inset text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all ${
                  errors.scheduledTime ? 'border border-ceramic-error' : ''
                }`}
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                <Clock className="w-4 h-4" />
                Duracao (min)
              </label>
              <input
                type="number"
                value={estimatedDuration}
                onChange={(e) => {
                  setEstimatedDuration(e.target.value);
                  if (errors.estimatedDuration) setErrors({ ...errors, estimatedDuration: '' });
                }}
                placeholder="60"
                min="1"
                className={`w-full px-4 py-3 rounded-xl ceramic-inset text-ceramic-text-primary placeholder:text-ceramic-text-tertiary focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all ${
                  errors.estimatedDuration ? 'border border-ceramic-error' : ''
                }`}
              />
            </div>
          </div>

          {/* Association (read-only) */}
          {task.associations && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                <Link2 className="w-4 h-4" />
                Associacao
              </label>
              <div className="w-full px-4 py-3 rounded-xl ceramic-inset text-ceramic-text-secondary bg-ceramic-text-secondary/5">
                {task.associations.name}
              </div>
            </div>
          )}
        </div>

        {/* Recurrence — prominent, not buried */}
        <div className="ceramic-tray p-4 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
            <Repeat className="w-4 h-4" />
            Repetir
          </div>
          <RecurrencePicker
            value={recurrenceRule}
            onChange={setRecurrenceRule}
            baseDate={dueDate ? new Date(dueDate) : new Date()}
          />
        </div>

        {/* Accordion sections */}
        <div className="space-y-3">
          {/* Description */}
          <Accordion
            title="Descricao"
            icon={FileText}
            defaultExpanded={!!task.description}
            id="sheet-accordion-description"
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
          <Accordion title="Subtarefas" icon={ListChecks} id="sheet-accordion-subtasks">
            <SubtaskList subtasks={subtasks} onChange={setSubtasks} />
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

          {/* Checklist */}
          {(task.task_type === 'list' || checklist.length > 0) && (
            <Accordion
              title={`Checklist${checklist.length > 0 ? ` (${checklist.filter(i => i.done).length}/${checklist.length})` : ''}`}
              icon={ListChecks}
              defaultExpanded={true}
              id="sheet-accordion-checklist"
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
            defaultExpanded={(tags?.length ?? 0) > 0}
            id="sheet-accordion-tags"
          >
            <TagInput tags={tags} onChange={setTags} />
          </Accordion>
        </div>
      </div>
    </div>
  );

  // ---- Footer ----
  const footer = (
    <div className="flex items-center justify-between p-4 border-t border-ceramic-text-secondary/10 bg-white/20"
         style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center gap-2">
        {/* Complete button */}
        <button
          type="button"
          onClick={() => { onComplete(task); onClose(); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-green-700 bg-green-50 hover:bg-green-100 transition-all"
        >
          <Check className="w-4 h-4" />
          Concluir
        </button>
        {/* Delete */}
        <button
          type="button"
          onClick={() => onDelete(task)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold text-ceramic-error hover:bg-ceramic-error/5 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        {isDirty && !errorCount && (
          <span className="text-xs text-ceramic-text-secondary hidden sm:block">Alteracoes nao salvas</span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={!isFormValid || isSaving}
          className="flex items-center gap-2 px-5 py-2 bg-ceramic-text-primary hover:bg-ceramic-text-primary/90 disabled:bg-ceramic-text-secondary/20 disabled:cursor-not-allowed text-ceramic-base rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
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
    </div>
  );

  // ---- Render ----
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40"
            style={{
              backgroundColor: 'rgba(240, 239, 233, 0.7)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleCloseClick}
            aria-hidden="true"
          />

          {isDesktop ? (
            /* ---- Desktop: Side sheet from right ---- */
            <motion.div
              className="fixed right-0 top-0 bottom-0 z-50 w-[600px] bg-ceramic-base shadow-2xl flex flex-col rounded-l-2xl overflow-hidden"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={sheetSpring}
              role="dialog"
              aria-modal="true"
              aria-labelledby="task-sheet-title"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-ceramic-text-secondary/10 bg-white/20">
                <div className="flex items-center gap-3">
                  <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-ceramic-text-primary" />
                  </div>
                  <h2 id="task-sheet-title" className="text-xl font-bold text-ceramic-text-primary">
                    Detalhes da Tarefa
                  </h2>
                </div>
                <button
                  onClick={handleCloseClick}
                  className="p-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {formContent}
              {footer}
            </motion.div>
          ) : (
            /* ---- Mobile: Bottom sheet ---- */
            <motion.div
              className="fixed inset-x-0 bottom-0 z-50 flex flex-col"
              style={{ maxHeight: '90vh' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={sheetSpring}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.4 }}
              onDragEnd={handleDragEnd}
              role="dialog"
              aria-modal="true"
              aria-labelledby="task-sheet-title-mobile"
            >
              <div
                className="bg-ceramic-base rounded-t-[32px] overflow-hidden flex flex-col"
                style={{ boxShadow: '0 -8px 32px rgba(163, 158, 145, 0.25)', maxHeight: '90vh' }}
              >
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
                  <motion.div
                    className="w-10 h-1 rounded-full"
                    style={{ backgroundColor: 'rgba(148, 141, 130, 0.4)' }}
                    whileHover={{ scaleX: 1.2, backgroundColor: 'rgba(148, 141, 130, 0.6)' }}
                    transition={{ duration: 0.15 }}
                  />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-6 pb-3">
                  <h2 id="task-sheet-title-mobile" className="text-lg font-bold text-ceramic-text-primary">
                    Detalhes da Tarefa
                  </h2>
                  <button
                    onClick={handleCloseClick}
                    className="p-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {formContent}
                {footer}
              </div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
};
