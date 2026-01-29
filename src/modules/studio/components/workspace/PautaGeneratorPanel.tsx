/**
 * PautaGeneratorPanel - AI-powered pauta generation panel
 *
 * Integrates with pautaGeneratorService to generate complete pautas
 * using Gemini Deep Research. Provides preview, editing, and save workflow.
 *
 * Features:
 * - AI pauta generation from guest research data
 * - Real-time progress feedback during generation
 * - Preview mode with editable topics
 * - Category-based organization
 * - Integration with workspace context
 * - Save to database workflow
 *
 * Design: Ceramic Design System with WCAG 2.1 AA compliance
 *
 * @see pautaGeneratorService for generation logic
 * @see PautaStage for parent integration
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wand2,
  Sparkles,
  Loader2,
  Check,
  X,
  Edit3,
  Save,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FileText,
  Clock,
  Target,
  Lightbulb,
  Snowflake,
  Gift,
  Mic
} from 'lucide-react';
import { usePodcastWorkspace } from '@/modules/studio/context/PodcastWorkspaceContext';
import pautaGeneratorService, {
  type GeneratedPauta,
  type PautaGenerationRequest,
  type PautaStyle,
  type PautaQuestion
} from '@/modules/studio/services/pautaGeneratorService';
import type { Topic, TopicCategory } from '@/modules/studio/types';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('PautaGeneratorPanel');

// ============================================
// TYPES
// ============================================

interface PautaGeneratorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onPautaGenerated: (topics: Topic[], categories: TopicCategory[]) => void;
}

interface GenerationProgress {
  step: string;
  percentage: number;
}

type PautaTone = 'formal' | 'casual' | 'investigativo' | 'humano';
type PautaDepth = 'shallow' | 'medium' | 'deep';

// ============================================
// CATEGORY CONFIGURATION
// ============================================

const CATEGORY_CONFIG: Record<string, {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ElementType;
  emoji: string;
  label: string;
}> = {
  'quebra-gelo': {
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    icon: Snowflake,
    emoji: '\\u2744\\ufe0f',
    label: 'Quebra-Gelo'
  },
  'geral': {
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: Mic,
    emoji: '\\ud83c\\udfa4',
    label: 'Geral'
  },
  'abertura': {
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: Lightbulb,
    emoji: '\\ud83d\\udca1',
    label: 'Abertura'
  },
  'aprofundamento': {
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    icon: Target,
    emoji: '\\ud83c\\udfaf',
    label: 'Aprofundamento'
  },
  'fechamento': {
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    icon: Check,
    emoji: '\\u2705',
    label: 'Fechamento'
  },
  'patrocinador': {
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    icon: Gift,
    emoji: '\\ud83c\\udf81',
    label: 'Patrocinador'
  },
  'polemicas': {
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: AlertCircle,
    emoji: '\\u26a0\\ufe0f',
    label: 'Polemicas'
  }
};

// ============================================
// MAIN COMPONENT
// ============================================

export const PautaGeneratorPanel: React.FC<PautaGeneratorPanelProps> = ({
  isOpen,
  onClose,
  onPautaGenerated
}) => {
  const { state } = usePodcastWorkspace();
  const { setup, research, episodeId } = state;

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Generated pauta state
  const [generatedPauta, setGeneratedPauta] = useState<GeneratedPauta | null>(null);
  const [editedQuestions, setEditedQuestions] = useState<PautaQuestion[]>([]);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Configuration state
  const [tone, setTone] = useState<PautaTone>('casual');
  const [depth, setDepth] = useState<PautaDepth>('medium');
  const [duration, setDuration] = useState(60);
  const [additionalContext, setAdditionalContext] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Preview sections
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['questions']));

  // Check if we have required data
  const hasRequiredData = useMemo(() => {
    return setup.guestName && setup.guestName.trim().length > 0;
  }, [setup.guestName]);

  const hasResearchData = useMemo(() => {
    return research.dossier !== null;
  }, [research.dossier]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleGenerate = useCallback(async () => {
    if (!hasRequiredData) {
      setError('Nome do convidado e obrigatorio para gerar a pauta');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgress({ step: 'Iniciando geracao...', percentage: 0 });

    try {
      const request: PautaGenerationRequest = {
        guestName: setup.guestName,
        theme: setup.theme || undefined,
        context: additionalContext || undefined,
        style: {
          tone,
          depth
        },
        duration
      };

      log.debug('Generating pauta with request:', request);

      const pauta = await pautaGeneratorService.generateCompletePauta(
        request,
        (step, percentage) => {
          setProgress({ step, percentage });
        }
      );

      log.debug('Pauta generated successfully:', pauta);

      setGeneratedPauta(pauta);
      setEditedQuestions([...pauta.questions]);
      setProgress(null);

    } catch (err) {
      log.error('Error generating pauta:', err);
      setError(err instanceof Error ? err.message : 'Erro ao gerar pauta');
      setProgress(null);
    } finally {
      setIsGenerating(false);
    }
  }, [hasRequiredData, setup.guestName, setup.theme, additionalContext, tone, depth, duration]);

  const handleSavePauta = useCallback(() => {
    if (!generatedPauta || !editedQuestions.length) {
      setError('Nenhuma pauta para salvar');
      return;
    }

    // Convert questions to topics and categories
    const { topics, categories } = pautaGeneratorService.questionsToTopics(
      editedQuestions,
      episodeId
    );

    // Add ice breakers as quebra-gelo topics
    if (generatedPauta.iceBreakers && generatedPauta.iceBreakers.length > 0) {
      const iceBreakersAsTopics: Topic[] = generatedPauta.iceBreakers.map((ib, idx) => ({
        id: `icebreaker-${Date.now()}-${idx}`,
        text: ib,
        completed: false,
        order: idx,
        archived: false,
        categoryId: 'quebra-gelo'
      }));

      // Ensure quebra-gelo category exists
      if (!categories.find(c => c.id === 'quebra-gelo')) {
        categories.unshift({
          id: 'quebra-gelo',
          name: 'Quebra-Gelo',
          color: '#06B6D4',
          episode_id: episodeId
        });
      }

      topics.unshift(...iceBreakersAsTopics);
    }

    log.debug('Saving pauta with topics:', topics.length, 'categories:', categories.length);

    onPautaGenerated(topics, categories);
    onClose();
  }, [generatedPauta, editedQuestions, episodeId, onPautaGenerated, onClose]);

  const handleEditQuestion = useCallback((questionId: string) => {
    const question = editedQuestions.find(q => q.id === questionId);
    if (question) {
      setEditingQuestionId(questionId);
      setEditText(question.text);
    }
  }, [editedQuestions]);

  const handleSaveEdit = useCallback(() => {
    if (!editingQuestionId || !editText.trim()) return;

    setEditedQuestions(prev =>
      prev.map(q =>
        q.id === editingQuestionId ? { ...q, text: editText.trim() } : q
      )
    );
    setEditingQuestionId(null);
    setEditText('');
  }, [editingQuestionId, editText]);

  const handleCancelEdit = useCallback(() => {
    setEditingQuestionId(null);
    setEditText('');
  }, []);

  const handleRemoveQuestion = useCallback((questionId: string) => {
    setEditedQuestions(prev => prev.filter(q => q.id !== questionId));
  }, []);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  }, []);

  // Group questions by category for display
  const questionsByCategory = useMemo(() => {
    const grouped = new Map<string, PautaQuestion[]>();
    editedQuestions.forEach(q => {
      const category = q.category || 'geral';
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(q);
    });
    return grouped;
  }, [editedQuestions]);

  // ============================================
  // RENDER
  // ============================================

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-labelledby="pauta-generator-title"
      aria-modal="true"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-ceramic-surface rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ceramic-border bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md">
              <Wand2 className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <h2 id="pauta-generator-title" className="text-xl font-bold text-ceramic-primary">
                Gerador de Pauta com IA
              </h2>
              <p className="text-sm text-ceramic-secondary">
                Estilo NotebookLM - Pesquisa profunda e perguntas inteligentes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-ceramic-border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
            aria-label="Fechar painel"
          >
            <X className="w-5 h-5 text-ceramic-secondary" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!generatedPauta ? (
            /* Configuration View */
            <div className="space-y-6">
              {/* Guest Info Summary */}
              <div className="p-4 rounded-xl bg-ceramic-base border border-ceramic-border">
                <h3 className="text-sm font-semibold text-ceramic-primary mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" aria-hidden="true" />
                  Informacoes do Convidado
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-ceramic-tertiary">Nome:</span>
                    <span className="ml-2 font-medium text-ceramic-primary">
                      {setup.guestName || 'Nao informado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-ceramic-tertiary">Tema:</span>
                    <span className="ml-2 font-medium text-ceramic-primary">
                      {setup.theme || 'Automatico'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-ceramic-tertiary">Pesquisa:</span>
                    <span className={`ml-2 font-medium ${hasResearchData ? 'text-green-600' : 'text-amber-600'}`}>
                      {hasResearchData ? 'Dossier disponivel' : 'Sem dossier (sera gerado)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Duration Selector */}
              <div>
                <label htmlFor="duration" className="block text-sm font-semibold text-ceramic-primary mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" aria-hidden="true" />
                  Duracao Estimada
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="duration"
                    type="range"
                    min={15}
                    max={180}
                    step={15}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="flex-1 h-2 bg-ceramic-border rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                  <span className="w-20 text-center px-3 py-1 bg-orange-100 text-orange-700 rounded-lg font-bold text-sm">
                    {duration} min
                  </span>
                </div>
              </div>

              {/* Tone Selector */}
              <div>
                <label className="block text-sm font-semibold text-ceramic-primary mb-2">
                  Tom da Entrevista
                </label>
                <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Selecionar tom">
                  {(['casual', 'formal', 'investigativo', 'humano'] as PautaTone[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      role="radio"
                      aria-checked={tone === t}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        tone === t
                          ? 'bg-orange-500 text-white shadow-md'
                          : 'bg-ceramic-base text-ceramic-secondary hover:bg-ceramic-border'
                      }`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Depth Selector */}
              <div>
                <label className="block text-sm font-semibold text-ceramic-primary mb-2">
                  Profundidade da Pesquisa
                </label>
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Selecionar profundidade">
                  {([
                    { value: 'shallow', label: 'Superficial', desc: 'Rapido, essencial' },
                    { value: 'medium', label: 'Moderada', desc: 'Equilibrado' },
                    { value: 'deep', label: 'Profunda', desc: 'Detalhado' }
                  ] as const).map(d => (
                    <button
                      key={d.value}
                      onClick={() => setDepth(d.value)}
                      role="radio"
                      aria-checked={depth === d.value}
                      className={`px-4 py-3 rounded-lg text-left transition-all ${
                        depth === d.value
                          ? 'bg-orange-500 text-white shadow-md'
                          : 'bg-ceramic-base text-ceramic-secondary hover:bg-ceramic-border'
                      }`}
                    >
                      <div className="font-medium">{d.label}</div>
                      <div className={`text-xs ${depth === d.value ? 'text-orange-100' : 'text-ceramic-tertiary'}`}>
                        {d.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Options */}
              <div>
                <button
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="flex items-center gap-2 text-sm text-ceramic-secondary hover:text-ceramic-primary transition-colors"
                  aria-expanded={showAdvancedOptions}
                >
                  {showAdvancedOptions ? (
                    <ChevronUp className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="w-4 h-4" aria-hidden="true" />
                  )}
                  Opcoes Avancadas
                </button>

                <AnimatePresence>
                  {showAdvancedOptions && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 space-y-4">
                        <div>
                          <label htmlFor="additional-context" className="block text-sm font-medium text-ceramic-primary mb-2">
                            Contexto Adicional (opcional)
                          </label>
                          <textarea
                            id="additional-context"
                            value={additionalContext}
                            onChange={(e) => setAdditionalContext(e.target.value)}
                            placeholder="Adicione informacoes especificas que deseja explorar na entrevista..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl bg-ceramic-base border border-ceramic-border text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3" role="alert">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Progress */}
              {progress && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-3 mb-2">
                    <Loader2 className="w-5 h-5 text-amber-600 animate-spin" aria-hidden="true" />
                    <span className="text-sm font-medium text-amber-700">{progress.step}</span>
                  </div>
                  <div className="h-2 bg-amber-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-amber-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress.percentage}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Preview View */
            <div className="space-y-6">
              {/* Success Banner */}
              <div className="p-4 rounded-xl bg-green-50 border border-green-200 flex items-center gap-3">
                <Check className="w-5 h-5 text-green-600" aria-hidden="true" />
                <div>
                  <p className="font-medium text-green-700">Pauta gerada com sucesso!</p>
                  <p className="text-sm text-green-600">
                    {editedQuestions.length} perguntas em {questionsByCategory.size} categorias
                  </p>
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-ceramic-base border border-ceramic-border text-center">
                  <div className="text-2xl font-bold text-ceramic-primary">{generatedPauta.estimatedDuration}</div>
                  <div className="text-xs text-ceramic-tertiary">minutos</div>
                </div>
                <div className="p-3 rounded-lg bg-ceramic-base border border-ceramic-border text-center">
                  <div className="text-2xl font-bold text-ceramic-primary">{editedQuestions.length}</div>
                  <div className="text-xs text-ceramic-tertiary">perguntas</div>
                </div>
                <div className="p-3 rounded-lg bg-ceramic-base border border-ceramic-border text-center">
                  <div className="text-2xl font-bold text-ceramic-primary">{generatedPauta.confidenceScore}%</div>
                  <div className="text-xs text-ceramic-tertiary">confianca</div>
                </div>
              </div>

              {/* Questions Preview by Category */}
              <div>
                <button
                  onClick={() => toggleSection('questions')}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-ceramic-base hover:bg-ceramic-border transition-colors"
                  aria-expanded={expandedSections.has('questions')}
                >
                  <span className="font-semibold text-ceramic-primary flex items-center gap-2">
                    <FileText className="w-4 h-4" aria-hidden="true" />
                    Perguntas ({editedQuestions.length})
                  </span>
                  {expandedSections.has('questions') ? (
                    <ChevronUp className="w-4 h-4 text-ceramic-tertiary" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-ceramic-tertiary" aria-hidden="true" />
                  )}
                </button>

                <AnimatePresence>
                  {expandedSections.has('questions') && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 space-y-4 max-h-96 overflow-y-auto pr-2">
                        {Array.from(questionsByCategory.entries()).map(([category, questions]) => {
                          const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['geral'];
                          return (
                            <div key={category} className="space-y-2">
                              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.bgColor} ${config.borderColor} border`}>
                                <config.icon className={`w-4 h-4 ${config.color}`} aria-hidden="true" />
                                <span className={`font-semibold text-sm ${config.color}`}>
                                  {config.label} ({questions.length})
                                </span>
                              </div>
                              <div className="space-y-1 pl-2">
                                {questions.map(q => (
                                  <div
                                    key={q.id}
                                    className="flex items-start gap-2 p-3 rounded-lg bg-ceramic-surface border border-ceramic-border group hover:border-orange-200 transition-colors"
                                  >
                                    {editingQuestionId === q.id ? (
                                      <div className="flex-1 space-y-2">
                                        <textarea
                                          value={editText}
                                          onChange={(e) => setEditText(e.target.value)}
                                          className="w-full px-3 py-2 rounded-lg border border-orange-300 text-sm focus:ring-2 focus:ring-orange-500 resize-none"
                                          rows={2}
                                          autoFocus
                                        />
                                        <div className="flex gap-2">
                                          <button
                                            onClick={handleSaveEdit}
                                            className="px-3 py-1 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600"
                                          >
                                            Salvar
                                          </button>
                                          <button
                                            onClick={handleCancelEdit}
                                            className="px-3 py-1 text-xs bg-ceramic-border text-ceramic-primary rounded-lg hover:bg-ceramic-surface"
                                          >
                                            Cancelar
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <span className="flex-1 text-sm text-ceramic-primary">{q.text}</span>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={() => handleEditQuestion(q.id)}
                                            className="p-1 rounded hover:bg-orange-100 text-ceramic-tertiary hover:text-orange-600"
                                            aria-label={`Editar pergunta: ${q.text.substring(0, 30)}`}
                                          >
                                            <Edit3 className="w-4 h-4" aria-hidden="true" />
                                          </button>
                                          <button
                                            onClick={() => handleRemoveQuestion(q.id)}
                                            className="p-1 rounded hover:bg-red-100 text-ceramic-tertiary hover:text-red-600"
                                            aria-label={`Remover pergunta: ${q.text.substring(0, 30)}`}
                                          >
                                            <X className="w-4 h-4" aria-hidden="true" />
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Ice Breakers */}
              {generatedPauta.iceBreakers && generatedPauta.iceBreakers.length > 0 && (
                <div>
                  <button
                    onClick={() => toggleSection('icebreakers')}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-cyan-50 hover:bg-cyan-100 transition-colors border border-cyan-200"
                    aria-expanded={expandedSections.has('icebreakers')}
                  >
                    <span className="font-semibold text-cyan-700 flex items-center gap-2">
                      <Snowflake className="w-4 h-4" aria-hidden="true" />
                      Quebra-Gelo ({generatedPauta.iceBreakers.length})
                    </span>
                    {expandedSections.has('icebreakers') ? (
                      <ChevronUp className="w-4 h-4 text-cyan-500" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-cyan-500" aria-hidden="true" />
                    )}
                  </button>

                  <AnimatePresence>
                    {expandedSections.has('icebreakers') && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 space-y-2">
                          {generatedPauta.iceBreakers.map((ib, idx) => (
                            <div key={idx} className="p-3 rounded-lg bg-cyan-50 border border-cyan-200 text-sm text-cyan-800">
                              {ib}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Research Summary */}
              {generatedPauta.researchSummary && (
                <div>
                  <button
                    onClick={() => toggleSection('research')}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors border border-purple-200"
                    aria-expanded={expandedSections.has('research')}
                  >
                    <span className="font-semibold text-purple-700 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" aria-hidden="true" />
                      Resumo da Pesquisa
                    </span>
                    {expandedSections.has('research') ? (
                      <ChevronUp className="w-4 h-4 text-purple-500" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-purple-500" aria-hidden="true" />
                    )}
                  </button>

                  <AnimatePresence>
                    {expandedSections.has('research') && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 p-4 rounded-lg bg-purple-50 border border-purple-200 text-sm text-purple-800">
                          {generatedPauta.researchSummary}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-ceramic-border bg-ceramic-base">
          <button
            onClick={onClose}
            className="px-4 py-2 text-ceramic-secondary hover:text-ceramic-primary transition-colors font-medium"
          >
            Cancelar
          </button>

          <div className="flex gap-3">
            {generatedPauta && (
              <button
                onClick={() => {
                  setGeneratedPauta(null);
                  setEditedQuestions([]);
                  setError(null);
                }}
                className="px-4 py-2 rounded-lg bg-ceramic-border text-ceramic-primary hover:bg-ceramic-surface transition-colors font-medium flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                Regenerar
              </button>
            )}

            {!generatedPauta ? (
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !hasRequiredData}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
                aria-busy={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" aria-hidden="true" />
                    Gerar Pauta
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleSavePauta}
                disabled={editedQuestions.length === 0}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" aria-hidden="true" />
                Usar esta Pauta
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PautaGeneratorPanel;
