/**
 * PautaStage - Episode script and topics management
 * Complete implementation with:
 * - Drag-and-drop topic reordering
 * - Category-based topic organization
 * - AI-powered pauta generation
 * - Version history management
 * - Auto-save integration
 */

import React, { useState, useEffect, useMemo } from 'react';
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
  AlertCircle,
  X,
  ChevronDown,
  Wand2
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
import { usePodcastWorkspace } from '../../context/PodcastWorkspaceContext';
import { useAutoSave } from '../../hooks/useAutoSave';
import { useSavedPauta } from '../../hooks/useSavedPauta';
import { PautaGeneratorPanel } from '../PautaGeneratorPanel';
import type { Topic, TopicCategory } from '../../types';

// ============================================
// CATEGORY COLORS & ICONS
// ============================================

const CATEGORY_COLORS: Record<string, string> = {
  'quebra-gelo': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  'geral': 'bg-blue-100 text-blue-700 border-blue-200',
  'patrocinador': 'bg-amber-100 text-amber-700 border-amber-200',
  'polêmicas': 'bg-red-100 text-red-700 border-red-200',
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 rounded-lg hover:bg-[#F7F6F4] group transition-colors bg-white border border-transparent hover:border-[#E5E3DC]"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4 text-ceramic-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <button
        onClick={() => onToggle(topic.id)}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${topic.completed
          ? 'bg-green-500 border-green-500 text-white'
          : 'border-ceramic-text-tertiary hover:border-green-400'
        }`}
      >
        {topic.completed && <Check className="w-3 h-3" />}
      </button>

      {isEditing ? (
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
          className="flex-1 px-2 py-1 bg-white border border-amber-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
      ) : (
        <span
          onClick={() => setIsEditing(true)}
          className={`text-sm flex-1 cursor-text ${topic.completed ? 'line-through text-ceramic-text-tertiary' : 'text-ceramic-text-primary'
          }`}
        >
          {topic.text}
        </span>
      )}

      <button
        onClick={() => onDelete(topic.id)}
        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 transition-all"
        title="Remover tópico"
      >
        <Trash2 className="w-4 h-4 text-red-500" />
      </button>
    </div>
  );
};

// ============================================
// MAIN PAUTA STAGE COMPONENT
// ============================================

export default function PautaStage() {
  const { state, actions } = usePodcastWorkspace();
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
  const [showPautaGenerator, setShowPautaGenerator] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [isSwappingVersion, setIsSwappingVersion] = useState(false);

  // DnD Sensors
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
  }, []);

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
      id: `topic_${Date.now()}`,
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

  const handlePautaGenerated = (newTopics: Topic[], newCategories: TopicCategory[]) => {
    actions.setTopics(newTopics);
    actions.setCategories(newCategories);
    setShowPautaGenerator(false);
  };

  const handleSwapVersion = async (pautaId: string) => {
    setIsSwappingVersion(true);
    try {
      const success = await setActiveVersion(pautaId);
      if (!success) {
        alert('Erro ao carregar versão anterior');
      }
    } finally {
      setIsSwappingVersion(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-white">
      {/* Task 1: Layout Base - Header */}
      <div className="p-6 border-b border-[#E5E3DC]">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-md">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-ceramic-text-primary">
                  Pauta do Episódio
                </h1>
                <p className="text-sm text-ceramic-text-secondary">
                  {setup.guestName} • {setup.theme || 'Tema automático'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Task 7: Version History Indicator */}
            {versions.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                <History className="w-3 h-3" />
                <span>{versions.length} versão{versions.length > 1 ? 's' : ''}</span>
                <button
                  onClick={() => setShowVersionHistory(!showVersionHistory)}
                  className="ml-1 p-0.5 hover:bg-green-100 rounded transition-colors"
                  title="Ver histórico de versões"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Task 6: AI Generator Button */}
            <button
              onClick={() => setShowPautaGenerator(true)}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-bold flex items-center gap-2 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
              title="Gerar Pauta com IA (estilo NotebookLM)"
            >
              <Wand2 className="w-4 h-4" />
              {pauta.topics.length > 0 ? 'Regenerar' : 'Gerar com IA'}
            </button>
          </div>
        </div>

        {/* Completion Bar */}
        {pauta.topics.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-ceramic-text-secondary">
                Progresso: {completionStats.completed}/{completionStats.total}
              </span>
              <span className="font-bold text-amber-600">
                {completionStats.percentage}%
              </span>
            </div>
            <div className="h-2 bg-[#E5E3DC] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${completionStats.percentage}%` }}
                transition={{ duration: 0.3 }}
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
            className="overflow-hidden bg-green-50 border-b border-green-200"
          >
            <div className="p-4 space-y-2">
              <p className="text-xs font-medium text-green-700 uppercase">Versões Salvas</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {versions.map((version) => (
                  <button
                    key={version.pauta_id}
                    onClick={() => handleSwapVersion(version.pauta_id)}
                    disabled={isSwappingVersion}
                    className={`w-full p-2 rounded text-left text-xs transition-colors ${
                      activePauta?.pauta.id === version.pauta_id
                        ? 'bg-green-200 text-green-800 font-medium'
                        : 'bg-white text-ceramic-text-secondary hover:bg-green-100'
                    }`}
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
                      {isSwappingVersion && activePauta?.pauta.id === version.pauta_id && (
                        <Loader2 className="w-3 h-3 animate-spin" />
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
                <FileText className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-lg font-bold text-ceramic-text-primary mb-2">
                Nenhum tópico criado
              </h3>
              <p className="text-sm text-ceramic-text-secondary mb-6">
                Comece adicionando tópicos manualmente ou use IA para gerar uma pauta completa
              </p>
              <button
                onClick={() => setShowPautaGenerator(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold hover:shadow-lg transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Gerar Pauta com IA
              </button>
            </div>
          </motion.div>
        ) : (
          // Task 2: Lista de Tópicos por Categoria com Task 3: Drag-and-Drop
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-4 pb-4">
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
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${CATEGORY_COLORS[category.id] || 'bg-gray-100 text-gray-700'} border`}>
                      <span className="text-lg">{CATEGORY_ICONS[category.id] || '📌'}</span>
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
                        <div className="space-y-1 pl-2">
                          {categoryTopics.map((topic, index) => (
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
                      <div className="pl-2 py-2 text-xs text-ceramic-text-tertiary italic">
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
                <div className="flex items-center gap-2 p-2 rounded-lg bg-white shadow-xl border border-amber-200 opacity-90 cursor-grabbing">
                  <GripVertical className="w-4 h-4 text-ceramic-text-tertiary" />
                  <span className="text-sm text-ceramic-text-primary font-bold">
                    {pauta.topics.find(t => t.id === activeDragId)?.text}
                  </span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Task 5: Add Topic Form - Footer */}
      <div className="p-6 border-t border-[#E5E3DC] bg-white">
        <div className="space-y-3">
          {/* Category Selector */}
          <div className="flex gap-2 flex-wrap">
            {pauta.categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  selectedCategory === cat.id
                    ? CATEGORY_COLORS[cat.id] || 'bg-gray-200'
                    : 'bg-[#EBE9E4] text-ceramic-text-secondary hover:bg-white border border-transparent'
                }`}
              >
                {CATEGORY_ICONS[cat.id]} {cat.name}
              </button>
            ))}
          </div>

          {/* Add Topic Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newTopicText}
              onChange={(e) => setNewTopicText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()}
              placeholder="Nova pergunta ou tópico..."
              className="flex-1 px-4 py-3 rounded-xl bg-[#EBE9E4] text-sm text-ceramic-text-primary placeholder-ceramic-text-tertiary border-none focus:ring-2 focus:ring-amber-400/50 outline-none shadow-inner"
            />
            <button
              onClick={handleAddTopic}
              disabled={!newTopicText.trim()}
              className="p-3 rounded-xl bg-ceramic-text-primary text-ceramic-base disabled:opacity-50 transition-all hover:scale-105 active:scale-95 font-bold"
              title="Adicionar tópico (Enter)"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Next Stage Button */}
        {pauta.topics.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => actions.setStage('production')}
            className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            Próximo: Gravação
            <span>→</span>
          </motion.button>
        )}
      </div>

      {/* Task 6: AI Generator Panel Modal */}
      <AnimatePresence>
        {showPautaGenerator && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowPautaGenerator(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl max-h-[90vh] overflow-y-auto"
            >
              <PautaGeneratorPanel
                guestName={setup.guestName}
                initialTheme={setup.theme}
                projectId={episodeId}
                onPautaGenerated={(dossier, topics, categories) => {
                  handlePautaGenerated(topics, categories);
                }}
                onClose={() => setShowPautaGenerator(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
