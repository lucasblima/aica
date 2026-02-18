import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Loader2, Calendar, Clock, X, Sparkles, Check, XCircle, CheckCircle2, Mic, Brain, Save } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import { AudioRecorder } from '@/modules/journey/components/capture/AudioRecorder';
import { processVoiceToTask, type ExtractedTaskData } from '@/services/taskExtractionService';
import { suggestPriority, QUADRANT_MAP, type PrioritySuggestion } from '@/modules/atlas/services/atlasAIService';
import { syncEntityToGoogle } from '@/services/calendarSyncService';
import { atlasTaskToGoogleEvent } from '@/services/calendarSyncTransforms';
import { isGoogleCalendarConnected } from '@/services/googleAuthService';

const log = createNamespacedLogger('TaskCreationQuickAdd');

type Mode = 'closed' | 'input' | 'preview';

/** Processing pipeline stages for voice-to-task */
type ProcessingStage = 'transcribing' | 'extracting' | 'creating' | null;

const STAGE_CONFIG: Record<Exclude<ProcessingStage, null>, { icon: React.ElementType; label: string; color: string }> = {
  transcribing: { icon: Mic, label: 'Transcrevendo audio...', color: 'text-blue-500' },
  extracting: { icon: Brain, label: 'Extraindo dados da tarefa...', color: 'text-purple-500' },
  creating: { icon: Save, label: 'Criando tarefa...', color: 'text-amber-500' },
};

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

  const [previewScheduledTime, setPreviewScheduledTime] = useState('');

  // AI suggestion state
  const [aiSuggestion, setAiSuggestion] = useState<PrioritySuggestion | null>(null);
  const [isAiSuggesting, setIsAiSuggesting] = useState(false);

  // Voice processing pipeline feedback
  const [processingStage, setProcessingStage] = useState<ProcessingStage>(null);

  // Auto-create success feedback
  const [autoCreatedTitle, setAutoCreatedTitle] = useState<string | null>(null);
  const [autoCreatedDetails, setAutoCreatedDetails] = useState<string | null>(null);

  const resetAll = useCallback(() => {
    setMode('closed');
    setTitle('');
    setError(null);
    setTranscription('');
    setPreviewTitle('');
    setPreviewDescription('');
    setPreviewPriority('medium');
    setPreviewDueDate('');
    setPreviewScheduledTime('');
    setPreviewDuration('');
    setPreviewIsUrgent(false);
    setPreviewIsImportant(false);
    setAiSuggestion(null);
    setIsAiSuggesting(false);
  }, []);

  const fillPreview = (data: ExtractedTaskData) => {
    setPreviewTitle(data.title);
    setPreviewDescription(data.description || '');
    setPreviewPriority(data.priority);
    setPreviewDueDate(data.due_date || '');
    setPreviewScheduledTime(data.scheduled_time || '');
    setPreviewDuration(data.estimated_duration?.toString() || '');
    setPreviewIsUrgent(data.is_urgent);
    setPreviewIsImportant(data.is_important);
    setMode('preview');
  };

  const handleAiSuggest = async () => {
    const taskTitle = previewTitle.trim() || title.trim();
    if (!taskTitle) return;

    setIsAiSuggesting(true);
    setAiSuggestion(null);
    setError(null);

    try {
      const suggestion = await suggestPriority(
        taskTitle,
        previewDescription.trim() || undefined,
        previewDueDate || undefined
      );
      setAiSuggestion(suggestion);
    } catch (err) {
      log.error('AI suggest error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao sugerir prioridade.');
    } finally {
      setIsAiSuggesting(false);
    }
  };

  const acceptAiSuggestion = () => {
    if (!aiSuggestion) return;
    const mapped = QUADRANT_MAP[aiSuggestion.quadrant];
    setPreviewIsUrgent(mapped.is_urgent);
    setPreviewIsImportant(mapped.is_important);
    setAiSuggestion(null);
  };

  const dismissAiSuggestion = () => {
    setAiSuggestion(null);
  };

  const handleRecordingComplete = async (blob: Blob) => {
    setIsTranscribing(true);
    setError(null);
    setProcessingStage('transcribing');

    try {
      const { transcription: text, extractedTask } = await processVoiceToTask(blob, (stage) => {
        if (stage === 'extracting') setProcessingStage('extracting');
      });
      setTranscription(text);

      // Auto-create: voice input creates task immediately
      if (extractedTask.title) {
        setProcessingStage('creating');
        log.debug('Auto-creating task from voice:', extractedTask);
        await createTask({
          title: extractedTask.title,
          description: extractedTask.description,
          priority: extractedTask.priority,
          due_date: extractedTask.due_date,
          scheduled_time: extractedTask.scheduled_time,
          estimated_duration: extractedTask.estimated_duration,
          is_urgent: extractedTask.is_urgent,
          is_important: extractedTask.is_important,
        });

        // Build details string for success flash
        const details: string[] = [];
        if (extractedTask.due_date) {
          const [, m, d] = extractedTask.due_date.split('-');
          details.push(`${d}/${m}`);
        }
        if (extractedTask.scheduled_time) details.push(extractedTask.scheduled_time);

        setAutoCreatedTitle(extractedTask.title);
        setAutoCreatedDetails(details.length > 0 ? details.join(' as ') : null);
        setTimeout(() => { setAutoCreatedTitle(null); setAutoCreatedDetails(null); }, 4000);
      } else {
        // Fallback to preview if no title extracted
        fillPreview(extractedTask);
      }
    } catch (err) {
      log.error('Voice-to-task error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao processar audio.');
    } finally {
      setIsTranscribing(false);
      setProcessingStage(null);
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
      scheduled_time: previewScheduledTime || undefined,
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
    scheduled_time?: string;
    estimated_duration?: number;
    is_urgent?: boolean;
    is_important?: boolean;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      // Build full timestamptz from due_date + scheduled_time
      let scheduledTimestamp: string | null = null;
      if (data.scheduled_time && data.due_date) {
        scheduledTimestamp = `${data.due_date}T${data.scheduled_time}:00`;
      }

      const { data: newTask, error: insertError } = await supabase
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
          scheduled_time: scheduledTimestamp,
          estimated_duration: data.estimated_duration || null,
        })
        .select('id, title, description, due_date, scheduled_time, estimated_duration')
        .single();

      if (insertError) {
        log.error('Insert error:', insertError);
        setError('Erro ao criar tarefa. Tente novamente.');
        return;
      }

      // Sync to Google Calendar (non-blocking, fire-and-forget)
      if (newTask?.due_date) {
        isGoogleCalendarConnected().then((connected) => {
          if (!connected) return;
          const eventData = atlasTaskToGoogleEvent({
            id: newTask.id,
            title: newTask.title,
            description: newTask.description || undefined,
            scheduled_time: newTask.scheduled_time || undefined,
            due_date: newTask.due_date,
            estimated_duration: newTask.estimated_duration || undefined,
          });
          if (eventData) {
            syncEntityToGoogle('atlas', newTask.id, eventData).catch((err) =>
              log.warn('Calendar sync failed for new task:', err)
            );
          }
        });
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
      {/* Auto-create success flash */}
      <AnimatePresence>
        {autoCreatedTitle && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="flex items-center gap-2.5 p-3 mb-3 bg-green-50 border border-green-200 rounded-xl"
          >
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-green-700 font-bold truncate">
                {autoCreatedTitle}
              </p>
              {autoCreatedDetails && (
                <p className="text-xs text-green-600 mt-0.5">
                  Agendada para {autoCreatedDetails}
                </p>
              )}
            </div>
            <span className="text-[10px] text-green-500 font-medium uppercase tracking-wide shrink-0">Criada</span>
          </motion.div>
        )}
      </AnimatePresence>

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
              {!isTranscribing && (
                <AudioRecorder
                  onRecordingComplete={handleRecordingComplete}
                  disabled={isLoading}
                />
              )}
            </div>

            {/* Voice processing pipeline indicator */}
            <AnimatePresence>
              {processingStage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-3 p-3 bg-ceramic-base/80 rounded-xl border border-ceramic-text-secondary/10">
                    {/* Pipeline steps */}
                    {(['transcribing', 'extracting', 'creating'] as const).map((stage, idx) => {
                      const config = STAGE_CONFIG[stage];
                      const Icon = config.icon;
                      const isActive = stage === processingStage;
                      const isDone = (['transcribing', 'extracting', 'creating'] as const).indexOf(processingStage) > idx;

                      return (
                        <React.Fragment key={stage}>
                          {idx > 0 && (
                            <div className={`h-px flex-1 max-w-[20px] transition-colors duration-300 ${isDone ? 'bg-green-400' : 'bg-ceramic-text-secondary/20'}`} />
                          )}
                          <div className={`flex items-center gap-1.5 transition-all duration-300 ${isActive ? 'opacity-100 scale-100' : isDone ? 'opacity-60 scale-95' : 'opacity-30 scale-95'}`}>
                            {isActive ? (
                              <Loader2 className={`w-4 h-4 animate-spin ${config.color}`} />
                            ) : isDone ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <Icon className="w-4 h-4 text-ceramic-text-secondary/40" />
                            )}
                            <span className={`text-[11px] font-medium whitespace-nowrap ${isActive ? config.color : isDone ? 'text-green-600' : 'text-ceramic-text-secondary/40'}`}>
                              {isActive ? config.label : isDone ? 'Pronto' : stage === 'transcribing' ? 'Transcrever' : stage === 'extracting' ? 'Extrair' : 'Criar'}
                            </span>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-xs text-ceramic-error ml-1"
              >
                {error}
              </motion.p>
            )}

            {!isTranscribing && (
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isLoading || !title.trim()}
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
                  onClick={() => {
                    if (title.trim()) {
                      setPreviewTitle(title.trim());
                      setMode('preview');
                    }
                  }}
                  disabled={isLoading || !title.trim()}
                  className="ceramic-card px-3 py-2.5 rounded-xl text-amber-500 hover:bg-amber-50 hover:scale-[1.02] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Expandir com detalhes e IA"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={resetAll}
                  disabled={isLoading}
                  className="ceramic-inset px-4 py-2.5 rounded-xl text-sm font-medium text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            )}
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

              <div className="flex items-center gap-1 min-w-[110px] px-3 py-2 bg-ceramic-base border-2 border-ceramic-text-secondary/20 rounded-xl">
                <Clock className="w-4 h-4 text-ceramic-text-secondary shrink-0" />
                <input
                  type="time"
                  value={previewScheduledTime}
                  onChange={(e) => setPreviewScheduledTime(e.target.value)}
                  className="w-full bg-transparent text-sm text-ceramic-text-primary focus:outline-none"
                  disabled={isLoading}
                />
              </div>

              <div className="flex items-center gap-1 min-w-[80px] px-3 py-2 bg-ceramic-base border-2 border-ceramic-text-secondary/20 rounded-xl">
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

            {/* Urgent / Important checkboxes + AI suggest */}
            <div className="flex items-center gap-4">
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
              <button
                type="button"
                onClick={handleAiSuggest}
                disabled={isLoading || isAiSuggesting || !previewTitle.trim()}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                title="IA sugere quadrante da Matriz de Eisenhower"
              >
                {isAiSuggesting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                {isAiSuggesting ? 'Analisando...' : 'IA sugerir'}
              </button>
            </div>

            {/* AI Suggestion result */}
            {aiSuggestion && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl"
              >
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-amber-700">
                    {QUADRANT_MAP[aiSuggestion.quadrant].label}
                    <span className="font-normal text-amber-600 ml-1">
                      ({Math.round(aiSuggestion.confidence * 100)}%)
                    </span>
                  </p>
                  <p className="text-[11px] text-amber-600 truncate">{aiSuggestion.reasoning}</p>
                </div>
                <button
                  type="button"
                  onClick={acceptAiSuggestion}
                  className="p-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                  title="Aceitar sugestao"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={dismissAiSuggestion}
                  className="p-1.5 rounded-lg text-amber-400 hover:text-amber-600 hover:bg-amber-100 transition-colors"
                  title="Ignorar sugestao"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}

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
