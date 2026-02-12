import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Loader2, Calendar, Clock, X } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import { AudioRecorder } from '@/modules/journey/components/capture/AudioRecorder';
import { processVoiceToTask, type ExtractedTaskData } from '@/services/taskExtractionService';

const log = createNamespacedLogger('TaskCreationQuickAdd');

type Mode = 'closed' | 'input' | 'preview';

interface TaskCreationQuickAddProps {
  userId: string;
  onTaskCreated: () => void;
}

export const TaskCreationQuickAdd: React.FC<TaskCreationQuickAddProps> = ({
  userId,
  onTaskCreated
}) => {
  const [mode, setMode] = useState<Mode>('closed');
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcription, setTranscription] = useState('');

  // Preview fields
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewDescription, setPreviewDescription] = useState('');
  const [previewPriority, setPreviewPriority] = useState<ExtractedTaskData['priority']>('medium');
  const [previewDueDate, setPreviewDueDate] = useState('');
  const [previewDuration, setPreviewDuration] = useState('');
  const [previewIsUrgent, setPreviewIsUrgent] = useState(false);
  const [previewIsImportant, setPreviewIsImportant] = useState(false);

  const resetAll = () => {
    setMode('closed');
    setTitle('');
    setError(null);
    setTranscription('');
    setPreviewTitle('');
    setPreviewDescription('');
    setPreviewPriority('medium');
    setPreviewDueDate('');
    setPreviewDuration('');
    setPreviewIsUrgent(false);
    setPreviewIsImportant(false);
  };

  const fillPreview = (data: ExtractedTaskData) => {
    setPreviewTitle(data.title);
    setPreviewDescription(data.description || '');
    setPreviewPriority(data.priority);
    setPreviewDueDate(data.due_date || '');
    setPreviewDuration(data.estimated_duration?.toString() || '');
    setPreviewIsUrgent(data.is_urgent);
    setPreviewIsImportant(data.is_important);
    setMode('preview');
  };

  const handleRecordingComplete = async (blob: Blob) => {
    setIsTranscribing(true);
    setError(null);

    try {
      const { transcription: text, extractedTask } = await processVoiceToTask(blob);
      setTranscription(text);
      fillPreview(extractedTask);
    } catch (err) {
      log.error('Voice-to-task error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao processar audio.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createTask({ title: title.trim() });
  };

  const handlePreviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewTitle.trim()) return;

    await createTask({
      title: previewTitle.trim(),
      description: previewDescription.trim() || undefined,
      priority: previewPriority,
      due_date: previewDueDate || undefined,
      estimated_duration: previewDuration ? parseInt(previewDuration) : undefined,
      is_urgent: previewIsUrgent,
      is_important: previewIsImportant,
    });
  };

  const createTask = async (data: {
    title: string;
    description?: string;
    priority?: string;
    due_date?: string;
    estimated_duration?: number;
    is_urgent?: boolean;
    is_important?: boolean;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('work_items')
        .insert({
          user_id: userId,
          title: data.title,
          description: data.description || null,
          is_urgent: data.is_urgent ?? false,
          is_important: data.is_important ?? false,
          archived: false,
          status: 'todo',
          priority: data.priority || 'medium',
          due_date: data.due_date || null,
          estimated_duration: data.estimated_duration || null,
        });

      if (insertError) {
        log.error('Insert error:', insertError);
        setError('Erro ao criar tarefa. Tente novamente.');
        return;
      }

      resetAll();
      onTaskCreated();
    } catch (err) {
      log.error('Unexpected error:', err);
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ceramic-card p-4 rounded-2xl">
      <AnimatePresence mode="wait">
        {mode === 'closed' && (
          <motion.button
            key="add-button"
            onClick={() => setMode('input')}
            className="w-full flex items-center justify-center gap-2 py-2 text-ceramic-text-secondary hover:text-ceramic-accent transition-colors group"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="ceramic-concave w-8 h-8 flex items-center justify-center group-hover:bg-amber-50 transition-colors">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold">Adicionar tarefa</span>
          </motion.button>
        )}

        {mode === 'input' && (
          <motion.form
            key="input-form"
            onSubmit={handleTextSubmit}
            className="space-y-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="O que voce precisa fazer?"
                className="flex-1 px-4 py-3 bg-ceramic-base border-2 border-ceramic-text-secondary/20 rounded-xl text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:border-ceramic-accent transition-colors"
                autoFocus
                disabled={isLoading || isTranscribing}
                maxLength={500}
              />
              {isTranscribing ? (
                <div className="flex items-center gap-2 px-3 py-2">
                  <Loader2 className="w-5 h-5 animate-spin text-ceramic-accent" />
                  <span className="text-xs text-ceramic-text-secondary whitespace-nowrap">Processando...</span>
                </div>
              ) : (
                <AudioRecorder
                  onRecordingComplete={handleRecordingComplete}
                  disabled={isLoading}
                />
              )}
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-xs text-ceramic-error ml-1"
              >
                {error}
              </motion.p>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isLoading || !title.trim() || isTranscribing}
                className="flex-1 ceramic-card px-4 py-2.5 rounded-xl text-sm font-bold text-ceramic-accent hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Criar
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={resetAll}
                disabled={isLoading || isTranscribing}
                className="ceramic-inset px-4 py-2.5 rounded-xl text-sm font-medium text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </motion.form>
        )}

        {mode === 'preview' && (
          <motion.form
            key="preview-form"
            onSubmit={handlePreviewSubmit}
            className="space-y-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Transcription badge */}
            {transcription && (
              <div className="flex items-start gap-2 p-2 bg-ceramic-base/60 rounded-lg">
                <span className="text-[10px] font-medium text-ceramic-text-secondary uppercase tracking-wide mt-0.5 shrink-0">Voz</span>
                <p className="text-xs text-ceramic-text-secondary italic line-clamp-2">{transcription}</p>
              </div>
            )}

            {/* Title */}
            <input
              type="text"
              value={previewTitle}
              onChange={(e) => setPreviewTitle(e.target.value)}
              placeholder="Titulo da tarefa"
              className="w-full px-4 py-3 bg-ceramic-base border-2 border-ceramic-text-secondary/20 rounded-xl text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:border-ceramic-accent transition-colors"
              autoFocus
              disabled={isLoading}
              maxLength={500}
            />

            {/* Description */}
            <textarea
              value={previewDescription}
              onChange={(e) => setPreviewDescription(e.target.value)}
              placeholder="Descricao (opcional)"
              rows={2}
              className="w-full px-4 py-2 bg-ceramic-base border-2 border-ceramic-text-secondary/20 rounded-xl text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:border-ceramic-accent transition-colors resize-none"
              disabled={isLoading}
            />

            {/* Priority + Date + Duration row */}
            <div className="flex flex-wrap gap-2">
              <select
                value={previewPriority}
                onChange={(e) => setPreviewPriority(e.target.value as ExtractedTaskData['priority'])}
                className="flex-1 min-w-[120px] px-3 py-2 bg-ceramic-base border-2 border-ceramic-text-secondary/20 rounded-xl text-sm text-ceramic-text-primary focus:outline-none focus:border-ceramic-accent transition-colors"
                disabled={isLoading}
              >
                <option value="urgent">Urgente</option>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baixa</option>
              </select>

              <div className="flex items-center gap-1 flex-1 min-w-[140px] px-3 py-2 bg-ceramic-base border-2 border-ceramic-text-secondary/20 rounded-xl">
                <Calendar className="w-4 h-4 text-ceramic-text-secondary shrink-0" />
                <input
                  type="date"
                  value={previewDueDate}
                  onChange={(e) => setPreviewDueDate(e.target.value)}
                  className="w-full bg-transparent text-sm text-ceramic-text-primary focus:outline-none"
                  disabled={isLoading}
                />
              </div>

              <div className="flex items-center gap-1 min-w-[100px] px-3 py-2 bg-ceramic-base border-2 border-ceramic-text-secondary/20 rounded-xl">
                <Clock className="w-4 h-4 text-ceramic-text-secondary shrink-0" />
                <input
                  type="number"
                  value={previewDuration}
                  onChange={(e) => setPreviewDuration(e.target.value)}
                  placeholder="min"
                  min={1}
                  max={480}
                  className="w-full bg-transparent text-sm text-ceramic-text-primary focus:outline-none placeholder:text-ceramic-text-secondary/50"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Urgent / Important checkboxes */}
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={previewIsUrgent}
                  onChange={(e) => setPreviewIsUrgent(e.target.checked)}
                  className="w-4 h-4 rounded border-ceramic-text-secondary/30 text-ceramic-accent focus:ring-ceramic-accent"
                  disabled={isLoading}
                />
                <span className="text-sm text-ceramic-text-primary">Urgente</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={previewIsImportant}
                  onChange={(e) => setPreviewIsImportant(e.target.checked)}
                  className="w-4 h-4 rounded border-ceramic-text-secondary/30 text-ceramic-accent focus:ring-ceramic-accent"
                  disabled={isLoading}
                />
                <span className="text-sm text-ceramic-text-primary">Importante</span>
              </label>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-xs text-ceramic-error ml-1"
              >
                {error}
              </motion.p>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isLoading || !previewTitle.trim()}
                className="flex-1 ceramic-card px-4 py-2.5 rounded-xl text-sm font-bold text-ceramic-accent hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Criar tarefa
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={resetAll}
                disabled={isLoading}
                className="ceramic-inset p-2.5 rounded-xl text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors disabled:opacity-50"
                title="Cancelar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
};
