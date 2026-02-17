/**
 * PautaStage - Episode script and topics management
 *
 * Migrated from _deprecated/modules/podcast/components/stages/PautaStage.tsx
 * Wave 5 - Stream 2: Research & Pauta Components Migration
 *
 * Features:
 * - Drag-and-drop topic reordering with keyboard support
 * - Category-based topic organization
 * - AI-powered pauta generation via PautaGeneratorPanel
 * - Version history management
 * - Auto-save integration
 * - Progress tracking with completion stats
 * - Teleprompter integration for production mode
 *
 * UX Improvements:
 * - Ceramic Design System classes
 * - WCAG 2.1 AA accessibility compliance (keyboard drag, ARIA labels, focus indicators)
 * - Enhanced visual feedback for drag operations
 * - Improved loading states and error handling
 *
 * Integration (Issue #171):
 * - PautaGeneratorPanel for NotebookLM-style AI pauta generation
 * - Guest research data flows from ResearchStage
 * - Preview and edit before saving to workspace state
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Plus,
  Trash2,
  GripVertical,
  Check,
  Sparkles,
  History,
  Loader2,
  ChevronDown,
  Wand2,
  MonitorPlay
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { usePodcastWorkspace } from '@/modules/studio/context/PodcastWorkspaceContext';
import { useAutoSave } from '@/modules/studio/hooks/useAutoSave';
import { useSavedPauta } from '@/modules/studio/hooks/useSavedPauta';
import type { Topic, TopicCategory } from '@/modules/studio/types';
import { createNamespacedLogger } from '@/lib/logger';
import { PautaGeneratorPanel } from './PautaGeneratorPanel';
import { TeleprompterWindow } from '@/modules/studio/components/TeleprompterWindow';

const log = createNamespacedLogger('PautaStage');

// ============================================
// CATEGORY COLORS & ICONS
// ============================================

const CATEGORY_COLORS: Record<string, string> = {
  'quebra-gelo': 'bg-ceramic-info/10 text-ceramic-info border-ceramic-info/30',
  'geral': 'bg-ceramic-info-bg text-ceramic-info border-ceramic-info/30',
  'patrocinador': 'bg-amber-100 text-amber-700 border-amber-200',
  'polêmicas': 'bg-ceramic-error-bg text-ceramic-error border-ceramic-error/30',
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'geral': '🎙️',
  'quebra-gelo': '❄️',
  'patrocinador': '🎁',
  'polêmicas': '⚠️',
};

// ============================================
// SORTABLE TOPIC ITEM COMPONENT
// ============================================

interface SortableTopicItemProps {
  topic: Topic;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, text: string) => void;
}

const SortableTopicItem: React.FC<SortableTopicItemProps> = ({
  topic,
  onToggle,
  onDelete,
  onEdit
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(topic.text);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: topic.id, data: { type: 'Topic', topic } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = () => {
    if (editText.trim()) {
      onEdit(topic.id, editText);
      setIsEditing(false);
    }
  };

  // Keyboard drag support
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !isEditing) {
      e.preventDefault();
      // DnD-kit handles keyboard drag via KeyboardSensor
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-1 md:gap-2 p-2 md:p-3 rounded-lg hover:bg-ceramic-base group transition-colors bg-ceramic-surface border border-transparent hover:border-ceramic-border hover:scale-[1.01] transition-transform"
      role="listitem"
    >
      {/* Drag handle — 44px touch target on mobile, always visible on touch */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-orange-500 rounded flex items-center justify-center min-w-[44px] min-h-[44px] md:min-w-[28px] md:min-h-[28px] -ml-1 md:ml-0"
        tabIndex={0}
        role="button"
        aria-label={`Arrastar tópico: ${topic.text}`}
        onKeyDown={handleKeyDown}
      >
        <GripVertical className="w-5 h-5 md:w-4 md:h-4 text-ceramic-tertiary opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity" aria-hidden="true" />
      </div>

      <button
        onClick={() => onToggle(topic.id)}
        className={`min-w-[44px] min-h-[44px] md:min-w-[28px] md:min-h-[28px] w-6 h-6 md:w-5 md:h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors focus:outline-none focus:ring-2 focus:ring-ceramic-success ${topic.completed
          ? 'bg-ceramic-success border-ceramic-success text-white'
          : 'border-ceramic-tertiary hover:border-ceramic-success'
        }`}
        aria-label={topic.completed ? `Marcar tópico como não concluído: ${topic.text}` : `Marcar tópico como concluído: ${topic.text}`}
        aria-pressed={topic.completed}
      >
        {topic.completed && <Check className="w-3 h-3" aria-hidden="true" />}
      </button>

      {isEditing ? (
        <label className="flex-1">
          <span className="sr-only">Editar texto do tópico</span>
          <input
            autoFocus
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') setIsEditing(false);
            }}
            className="w-full px-2 py-1 bg-ceramic-surface border border-amber-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            aria-label="Editar tópico"
          />
        </label>
      ) : (
        <span
          onClick={() => setIsEditing(true)}
          className={`text-sm flex-1 cursor-text ${topic.completed ? 'line-through text-ceramic-tertiary' : 'text-ceramic-primary'
          }`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsEditing(true);
            }
          }}
          aria-label={`Editar tópico: ${topic.text}`}
        >
          {topic.text}
        </span>
      )}

      <button
        onClick={() => onDelete(topic.id)}
        className="min-w-[44px] min-h-[44px] md:min-w-[28px] md:min-h-[28px] p-2 md:p-1 rounded opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-ceramic-error-bg transition-all focus:outline-none focus:opacity-100 focus:ring-2 focus:ring-ceramic-error flex items-center justify-center flex-shrink-0"
        title="Remover tópico"
        aria-label={`Remover tópico: ${topic.text}`}
      >
        <Trash2 className="w-4 h-4 text-ceramic-error" aria-hidden="true" />
      </button>
    </div>
  );
};

// ============================================
// MAIN PAUTA STAGE COMPONENT
// ============================================

export default function PautaStage() {
  const { state, actions, dispatch } = usePodcastWorkspace();
  const { pauta, episodeId, setup } = state;

  // Auto-save hook
  useAutoSave({ state, enabled: true, debounceMs: 2000 });

  // Saved pauta hook
  const {
    activePauta,
    versions,
    isLoading: isLoadingPautas,
    setActiveVersion
  } = useSavedPauta(episodeId);

  // Local state
  const [newTopicText, setNewTopicText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('geral');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [isSwappingVersion, setIsSwappingVersion] = useState(false);

  // PautaGeneratorPanel state
  const [showGeneratorPanel, setShowGeneratorPanel] = useState(false);

  // Teleprompter state
  const [showTeleprompter, setShowTeleprompter] = useState(false);
  const [teleprompterIndex, setTeleprompterIndex] = useState(0);

  // DnD Sensors with keyboard support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Initialize default categories if empty
  useEffect(() => {
    if (pauta.categories.length === 0) {
      const defaultCategories: TopicCategory[] = [
        { id: 'quebra-gelo', name: 'Quebra-Gelo', color: '#06B6D4', episode_id: episodeId },
        { id: 'geral', name: 'Geral', color: '#3B82F6', episode_id: episodeId },
        { id: 'patrocinador', name: 'Patrocinador', color: '#F59E0B', episode_id: episodeId },
        { id: 'polêmicas', name: 'Polêmicas', color: '#EF4444', episode_id: episodeId },
      ];
      actions.setCategories(defaultCategories);
    }
  }, [pauta.categories.length, episodeId, actions]);

  // Group topics by category
  const topicsByCategory = useMemo(() => {
    const grouped = new Map<string, Topic[]>();
    pauta.categories.forEach(cat => {
      grouped.set(cat.id, pauta.topics.filter(t => t.categoryId === cat.id && !t.archived));
    });
    return grouped;
  }, [pauta.topics, pauta.categories]);

  // Calculate completion stats
  const completionStats = useMemo(() => {
    const total = pauta.topics.length;
    const completed = pauta.topics.filter(t => t.completed && !t.archived).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  }, [pauta.topics]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleAddTopic = () => {
    if (!newTopicText.trim()) return;

    const newTopic: Topic = {
      id: crypto.randomUUID(),  // ✅ FIX: Use proper UUID instead of topic_${Date.now()}
      text: newTopicText.trim(),
      completed: false,
      order: pauta.topics.filter(t => t.categoryId === selectedCategory).length,
      archived: false,
      categoryId: selectedCategory
    };

    actions.addTopic(newTopic);
    setNewTopicText('');
  };

  const handleToggleTopic = (id: string) => {
    const topic = pauta.topics.find(t => t.id === id);
    if (topic) {
      actions.updateTopic(id, { completed: !topic.completed });
    }
  };

  const handleDeleteTopic = (id: string) => {
    actions.removeTopic(id);
  };

  const handleEditTopic = (id: string, text: string) => {
    actions.updateTopic(id, { text });
  };

  // DnD Handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const activeTopic = pauta.topics.find(t => t.id === activeId);
    const overTopic = pauta.topics.find(t => t.id === overId);

    if (!activeTopic) return;

    // If dragging over a category, move to that category
    if (pauta.categories.some(c => c.id === overId)) {
      if (activeTopic.categoryId !== overId) {
        actions.updateTopic(activeId, { categoryId: overId });
      }
      return;
    }

    // If dragging over another topic, reorder
    if (overTopic && activeTopic.categoryId === overTopic.categoryId && activeId !== overId) {
      const oldIndex = pauta.topics.indexOf(activeTopic);
      const newIndex = pauta.topics.indexOf(overTopic);
      const newOrder = arrayMove(pauta.topics, oldIndex, newIndex);
      actions.reorderTopics(newOrder);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
  };

  const handleSwapVersion = async (pautaId: string) => {
    setIsSwappingVersion(true);
    try {
      const success = await setActiveVersion(pautaId);
      if (!success) {
        alert('Erro ao carregar versao anterior');
      }
    } finally {
      setIsSwappingVersion(false);
    }
  };

  // Handler for PautaGeneratorPanel - receives generated topics and categories
  const handlePautaGenerated = useCallback((topics: Topic[], categories: TopicCategory[]) => {
    log.debug('Pauta generated - topics:', topics.length, 'categories:', categories.length);

    // Update categories first
    actions.setCategories(categories);

    // Clear existing topics and add new ones
    // We dispatch directly to replace all topics at once
    dispatch({ type: 'SET_TOPICS', payload: topics });

    // Close the generator panel
    setShowGeneratorPanel(false);

    log.debug('Pauta applied to workspace state');
  }, [actions, dispatch]);

  // Get non-archived topics for teleprompter
  const teleprompterTopics = useMemo(() => {
    return pauta.topics
      .filter(t => !t.archived)
      .sort((a, b) => a.order - b.order);
  }, [pauta.topics]);

  // Handler for opening teleprompter
  const handleOpenTeleprompter = useCallback(() => {
    if (teleprompterTopics.length === 0) {
      alert('Adicione topicos a pauta antes de usar o teleprompter');
      return;
    }
    setTeleprompterIndex(0);
    setShowTeleprompter(true);
  }, [teleprompterTopics.length]);

  // Handler for teleprompter index change
  const handleTeleprompterIndexChange = useCallback((index: number) => {
    setTeleprompterIndex(index);
  }, []);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-ceramic-base to-ceramic-surface">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-ceramic-border">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-md flex-shrink-0">
                <FileText className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-xl md:text-3xl font-bold text-ceramic-primary">
                  Pauta do Episódio
                </h1>
                <p className="text-xs md:text-sm text-ceramic-secondary">
                  {setup.guestName} • {setup.theme || 'Tema automático'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Version History Indicator */}
            {versions.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-ceramic-success bg-ceramic-success-bg px-3 py-2 rounded-lg border border-ceramic-success/30">
                <History className="w-3 h-3" aria-hidden="true" />
                <span>{versions.length} versao{versions.length > 1 ? 'es' : ''}</span>
                <button
                  onClick={() => setShowVersionHistory(!showVersionHistory)}
                  className="ml-1 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 md:p-0.5 flex items-center justify-center hover:bg-ceramic-success/10 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-ceramic-success"
                  title="Ver historico de versoes"
                  aria-label="Ver historico de versoes da pauta"
                  aria-expanded={showVersionHistory}
                >
                  <ChevronDown className="w-4 h-4 md:w-3 md:h-3" aria-hidden="true" />
                </button>
              </div>
            )}

            {/* Teleprompter Button */}
            {pauta.topics.length > 0 && (
              <button
                onClick={handleOpenTeleprompter}
                className="px-4 py-2.5 min-h-[44px] rounded-lg bg-ceramic-primary text-white text-sm font-bold flex items-center gap-2 hover:bg-ceramic-primary/90 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-ceramic-primary focus:ring-offset-2"
                title="Abrir teleprompter para praticar"
                aria-label="Abrir teleprompter"
              >
                <MonitorPlay className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Teleprompter</span>
              </button>
            )}

            {/* AI Generator Button - Opens PautaGeneratorPanel */}
            <button
              onClick={() => setShowGeneratorPanel(true)}
              className="px-4 py-2.5 min-h-[44px] rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-bold flex items-center gap-2 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              title="Gerar Pauta com IA (estilo NotebookLM)"
              aria-label={pauta.topics.length > 0 ? 'Regenerar pauta com IA' : 'Gerar pauta com IA'}
            >
              <Wand2 className="w-4 h-4" aria-hidden="true" />
              {pauta.topics.length > 0 ? 'Regenerar' : 'Gerar com IA'}
            </button>
          </div>
        </div>

        {/* Completion Bar */}
        {pauta.topics.length > 0 && (
          <div className="space-y-2" role="status" aria-label="Progresso da pauta">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-ceramic-secondary">
                Progresso: {completionStats.completed}/{completionStats.total}
              </span>
              <span className="font-bold text-amber-600">
                {completionStats.percentage}%
              </span>
            </div>
            <div className="h-2 bg-ceramic-border rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${completionStats.percentage}%` }}
                transition={{ duration: 0.3 }}
                aria-hidden="true"
              />
            </div>
          </div>
        )}
      </div>

      {/* Version History Dropdown */}
      <AnimatePresence>
        {showVersionHistory && versions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-ceramic-success-bg border-b border-ceramic-success/30"
            role="region"
            aria-label="Histórico de versões da pauta"
          >
            <div className="p-4 space-y-2">
              <p className="text-xs font-medium text-ceramic-success uppercase">Versões Salvas</p>
              <div className="space-y-1 max-h-48 overflow-y-auto" role="list">
                {versions.map((version) => (
                  <button
                    key={version.id}
                    onClick={() => handleSwapVersion(version.id)}
                    disabled={isSwappingVersion}
                    className={`w-full p-2 rounded text-left text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-ceramic-success ${
                      activePauta?.pauta.id === version.id
                        ? 'bg-ceramic-success/20 text-ceramic-success font-medium'
                        : 'bg-ceramic-surface text-ceramic-secondary hover:bg-ceramic-success-bg'
                    }`}
                    role="listitem"
                    aria-label={`Versão ${version.version}, criada em ${new Date(version.created_at).toLocaleDateString('pt-BR')}`}
                    aria-current={activePauta?.pauta.id === version.id ? 'true' : undefined}
                  >
                    <div className="flex items-center justify-between">
                      <span>
                        v{version.version} - {new Date(version.created_at).toLocaleDateString('pt-BR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {isSwappingVersion && activePauta?.pauta.id === version.id && (
                        <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {pauta.topics.length === 0 ? (
          // Empty State
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full flex items-center justify-center"
          >
            <div className="text-center max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-amber-500" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-bold text-ceramic-primary mb-2">
                Nenhum tópico criado
              </h3>
              <p className="text-sm text-ceramic-secondary mb-6">
                Comece adicionando tópicos manualmente ou use IA para gerar uma pauta completa
              </p>
              <button
                onClick={() => setShowGeneratorPanel(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                aria-label="Gerar pauta com inteligência artificial"
              >
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                Gerar Pauta com IA
              </button>
            </div>
          </motion.div>
        ) : (
          // Topic List with Drag-and-Drop
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-4 pb-4" role="list" aria-label="Tópicos da pauta organizados por categoria">
              {pauta.categories.map((category) => {
                const categoryTopics = topicsByCategory.get(category.id) || [];

                return (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                  >
                    {/* Category Header */}
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${CATEGORY_COLORS[category.id] || 'bg-ceramic-base text-ceramic-text-primary'} border`} role="heading" aria-level={2}>
                      <span className="text-lg" aria-hidden="true">{CATEGORY_ICONS[category.id] || '📌'}</span>
                      <span className="font-bold text-sm">{category.name}</span>
                      <span className="text-xs opacity-70">
                        ({categoryTopics.filter(t => t.completed).length}/{categoryTopics.length})
                      </span>
                    </div>

                    {/* Topics in Category */}
                    {categoryTopics.length > 0 ? (
                      <SortableContext
                        items={categoryTopics.map(t => t.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-1 pl-2" role="list" aria-label={`Tópicos da categoria ${category.name}`}>
                          {categoryTopics.map((topic) => (
                            <SortableTopicItem
                              key={topic.id}
                              topic={topic}
                              onToggle={handleToggleTopic}
                              onDelete={handleDeleteTopic}
                              onEdit={handleEditTopic}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    ) : (
                      <div className="pl-2 py-2 text-xs text-ceramic-tertiary italic">
                        Nenhum tópico nesta categoria
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
              {activeDragId ? (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-ceramic-surface shadow-xl border border-amber-200 opacity-90 cursor-grabbing">
                  <GripVertical className="w-4 h-4 text-ceramic-tertiary" aria-hidden="true" />
                  <span className="text-sm text-ceramic-primary font-bold">
                    {pauta.topics.find(t => t.id === activeDragId)?.text}
                  </span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Add Topic Form - Footer */}
      <div className="p-4 md:p-6 border-t border-ceramic-border bg-ceramic-surface">
        <div className="space-y-3">
          {/* Category Selector */}
          <div className="flex gap-2 flex-wrap" role="group" aria-label="Selecionar categoria do tópico">
            {pauta.categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-2 min-h-[44px] md:py-1 md:min-h-0 rounded-full text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  selectedCategory === cat.id
                    ? CATEGORY_COLORS[cat.id] || 'bg-ceramic-cool'
                    : 'bg-ceramic-border text-ceramic-secondary hover:bg-ceramic-surface border border-transparent'
                }`}
                aria-label={`Categoria ${cat.name}`}
                aria-pressed={selectedCategory === cat.id}
              >
                {CATEGORY_ICONS[cat.id]} {cat.name}
              </button>
            ))}
          </div>

          {/* Add Topic Input */}
          <form onSubmit={(e) => { e.preventDefault(); handleAddTopic(); }} className="flex gap-2">
            <label htmlFor="new-topic-input" className="sr-only">Nova pergunta ou tópico</label>
            <input
              id="new-topic-input"
              type="text"
              value={newTopicText}
              onChange={(e) => setNewTopicText(e.target.value)}
              placeholder="Nova pergunta ou tópico..."
              className="flex-1 px-4 py-3 min-h-[44px] rounded-xl bg-ceramic-border text-sm text-ceramic-primary placeholder-ceramic-tertiary border-none focus:ring-2 focus:ring-amber-400/50 outline-none shadow-inner"
              aria-required="true"
            />
            <button
              type="submit"
              disabled={!newTopicText.trim()}
              className="min-w-[44px] min-h-[44px] p-3 rounded-xl bg-ceramic-primary text-ceramic-base disabled:opacity-50 transition-all hover:scale-105 active:scale-95 font-bold focus:outline-none focus:ring-2 focus:ring-ceramic-primary focus:ring-offset-2 flex items-center justify-center"
              title="Adicionar tópico (Enter)"
              aria-label="Adicionar novo tópico à pauta"
            >
              <Plus className="w-5 h-5" aria-hidden="true" />
            </button>
          </form>
        </div>

        {/* Next Stage Button */}
        {pauta.topics.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => actions.setStage('production')}
            className="w-full mt-4 px-6 py-3 min-h-[48px] bg-gradient-to-r from-ceramic-success to-ceramic-success/90 text-white font-bold rounded-xl hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-ceramic-success focus:ring-offset-2"
            aria-label="Ir para próxima etapa: Gravação"
          >
            Próximo: Gravação
            <span aria-hidden="true">→</span>
          </motion.button>
        )}
      </div>

      {/* Pauta Generator Panel Modal */}
      <PautaGeneratorPanel
        isOpen={showGeneratorPanel}
        onClose={() => setShowGeneratorPanel(false)}
        onPautaGenerated={handlePautaGenerated}
      />

      {/* Teleprompter Window */}
      {showTeleprompter && (
        <TeleprompterWindow
          topics={teleprompterTopics}
          currentIndex={teleprompterIndex}
          onIndexChange={handleTeleprompterIndexChange}
          onClose={() => setShowTeleprompter(false)}
        />
      )}
    </div>
  );
}
