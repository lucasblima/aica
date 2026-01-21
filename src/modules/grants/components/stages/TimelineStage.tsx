/**
 * TimelineStage - Stage 5: External Timeline View
 * Shows the edital's external phases (Submission, Evaluation, Results, etc.)
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarClock,
  Sparkles,
  Plus,
  Loader2,
  Check,
  Circle,
  Clock,
  AlertCircle,
  Trash2,
  Edit3,
  X,
  Square,
  CheckSquare,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { StageDependencyHint } from '../shared/StageDependencyHint';
import type { EditalPhase } from '../../types/workspace';

import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('Timelinestage');

// Unique ID generator
const generateId = () => `phase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const TimelineStage: React.FC = () => {
  const { state, dispatch, actions } = useWorkspace();
  const { timeline, pdfUpload } = state;
  const [isExtracting, setIsExtracting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPhase, setNewPhase] = useState({ name: '', date: '', description: '' });
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPhaseIds, setSelectedPhaseIds] = useState<Set<string>>(new Set());

  const hasPdfContent = pdfUpload.textContent && pdfUpload.textContent.length > 0;
  const hasPhases = timeline.phases.length > 0;

  /**
   * Extract timeline from PDF using AI
   */
  const handleExtractTimeline = async () => {
    if (!hasPdfContent) {
      alert('Faca upload do PDF do edital primeiro.');
      return;
    }

    setIsExtracting(true);
    dispatch({ type: 'UPDATE_TIMELINE', payload: { extractionStatus: 'extracting' } });

    try {
      // Import AI service for timeline extraction
      const { extractTimelinePhases } = await import('../../services/briefingAIService');

      const extractedPhases = await extractTimelinePhases(pdfUpload.textContent!);

      const phases: EditalPhase[] = extractedPhases.map((phase, index) => ({
        id: generateId(),
        name: phase.name,
        description: phase.description,
        date: phase.date,
        status: determinePhaseStatus(phase.date),
      }));

      dispatch({ type: 'SET_TIMELINE_PHASES', payload: phases });
    } catch (error) {
      log.error(Extract error:', error);
      dispatch({ type: 'UPDATE_TIMELINE', payload: { extractionStatus: 'error' } });
      alert('Erro ao extrair cronograma. Adicione manualmente.');
    } finally {
      setIsExtracting(false);
    }
  };

  /**
   * Add a new phase manually
   */
  const handleAddPhase = () => {
    if (!newPhase.name.trim() || !newPhase.date.trim()) return;

    const phase: EditalPhase = {
      id: generateId(),
      name: newPhase.name.trim(),
      description: newPhase.description.trim() || undefined,
      date: newPhase.date.trim(),
      status: determinePhaseStatus(newPhase.date.trim()),
    };

    dispatch({
      type: 'SET_TIMELINE_PHASES',
      payload: [...timeline.phases, phase].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    });

    setNewPhase({ name: '', date: '', description: '' });
    setShowAddForm(false);
  };

  /**
   * Remove a phase
   */
  const handleRemovePhase = (phaseId: string) => {
    const confirmed = confirm('Remover esta fase do cronograma?');
    if (!confirmed) return;

    dispatch({
      type: 'SET_TIMELINE_PHASES',
      payload: timeline.phases.filter((p) => p.id !== phaseId),
    });
  };

  /**
   * Toggle selection mode
   */
  const handleToggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedPhaseIds(new Set());
  };

  /**
   * Toggle individual phase selection
   */
  const handleToggleSelection = (phaseId: string) => {
    setSelectedPhaseIds(prev => {
      const next = new Set(prev);
      if (next.has(phaseId)) {
        next.delete(phaseId);
      } else {
        next.add(phaseId);
      }
      return next;
    });
  };

  /**
   * Select all phases
   */
  const handleSelectAll = () => {
    setSelectedPhaseIds(new Set(timeline.phases.map(p => p.id)));
  };

  /**
   * Deselect all phases
   */
  const handleDeselectAll = () => {
    setSelectedPhaseIds(new Set());
  };

  /**
   * Batch delete selected phases
   */
  const handleBatchDelete = () => {
    if (selectedPhaseIds.size === 0) return;
    const confirmed = confirm(`Remover ${selectedPhaseIds.size} fase(s) selecionada(s)?`);
    if (!confirmed) return;

    dispatch({
      type: 'SET_TIMELINE_PHASES',
      payload: timeline.phases.filter(p => !selectedPhaseIds.has(p.id)),
    });

    setSelectedPhaseIds(new Set());
    setSelectionMode(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="ceramic-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-[#5C554B]">
              Cronograma do Edital
            </h3>
            <p className="text-sm text-[#948D82]">
              Fases externas do processo (Inscricao, Avaliacao, Resultado, etc.)
            </p>
          </div>

          <div className="flex items-center gap-2">
            {hasPdfContent && !hasPhases && (
              <button
                onClick={handleExtractTimeline}
                disabled={isExtracting}
                className="ceramic-concave px-6 py-3 font-bold text-[#D97706] hover:scale-[0.98] disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Extraindo...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Extrair do PDF
                  </>
                )}
              </button>
            )}
            {hasPhases && (
              <button
                onClick={handleToggleSelectionMode}
                className="ceramic-concave px-4 py-2 font-bold text-[#5C554B] hover:scale-[0.98] transition-all flex items-center gap-2"
              >
                {selectionMode ? (
                  <>
                    <X className="w-4 h-4" />
                    Cancelar Selecao
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-4 h-4" />
                    Selecionar
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Timeline Visual */}
      {hasPhases ? (
        <div className="ceramic-card p-6">
          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-[#5C554B]/10" />

            {/* Phases */}
            <div className="space-y-6">
              <AnimatePresence>
                {timeline.phases.map((phase, index) => (
                  <TimelinePhaseCard
                    key={phase.id}
                    phase={phase}
                    index={index}
                    isFirst={index === 0}
                    isLast={index === timeline.phases.length - 1}
                    onRemove={() => handleRemovePhase(phase.id)}
                    selectionMode={selectionMode}
                    isSelected={selectedPhaseIds.has(phase.id)}
                    onToggleSelection={() => handleToggleSelection(phase.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Add Phase Button */}
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-6 w-full ceramic-tray p-4 flex items-center justify-center gap-2 text-sm font-bold text-[#948D82] hover:text-[#5C554B] hover:bg-black/5 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Adicionar Fase
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 ceramic-tray p-4 space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={newPhase.name}
                  onChange={(e) => setNewPhase({ ...newPhase, name: e.target.value })}
                  placeholder="Nome da fase (ex: Submissao)"
                  className="bg-white border border-[#5C554B]/20 rounded-lg px-3 py-2 text-sm text-[#5C554B] focus:outline-none focus:ring-2 focus:ring-[#D97706]/50"
                  autoFocus
                />
                <input
                  type="date"
                  value={newPhase.date}
                  onChange={(e) => setNewPhase({ ...newPhase, date: e.target.value })}
                  className="bg-white border border-[#5C554B]/20 rounded-lg px-3 py-2 text-sm text-[#5C554B] focus:outline-none focus:ring-2 focus:ring-[#D97706]/50"
                />
              </div>
              <input
                type="text"
                value={newPhase.description}
                onChange={(e) => setNewPhase({ ...newPhase, description: e.target.value })}
                placeholder="Descricao (opcional)"
                className="w-full bg-white border border-[#5C554B]/20 rounded-lg px-3 py-2 text-sm text-[#5C554B] focus:outline-none focus:ring-2 focus:ring-[#D97706]/50"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewPhase({ name: '', date: '', description: '' });
                  }}
                  className="px-4 py-2 text-xs font-bold text-[#948D82] hover:text-[#5C554B] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddPhase}
                  disabled={!newPhase.name.trim() || !newPhase.date.trim()}
                  className="ceramic-concave px-4 py-2 text-xs font-bold text-[#D97706] hover:scale-95 disabled:opacity-50 transition-transform"
                >
                  Adicionar
                </button>
              </div>
            </motion.div>
          )}
        </div>
      ) : (
        // Empty State
        <div className="ceramic-card p-8 text-center">
          <div className="w-16 h-16 bg-[#F0EFE9] rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarClock className="w-8 h-8 text-[#948D82]" />
          </div>
          <h3 className="text-lg font-bold text-[#5C554B] mb-2">
            Cronograma nao definido
          </h3>
          <p className="text-sm text-[#948D82] mb-6 max-w-md mx-auto">
            {hasPdfContent
              ? 'Extraia o cronograma do PDF ou adicione as fases manualmente.'
              : 'Faca upload do PDF para extrair automaticamente, ou adicione manualmente.'}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {hasPdfContent && (
              <button
                onClick={handleExtractTimeline}
                disabled={isExtracting}
                className="ceramic-concave px-6 py-3 font-bold text-[#D97706] hover:scale-[0.98] disabled:opacity-50 transition-all flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Extrair do PDF
              </button>
            )}
            <button
              onClick={() => setShowAddForm(true)}
              className="ceramic-concave px-6 py-3 font-bold text-[#5C554B] hover:scale-[0.98] transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Adicionar Manualmente
            </button>
          </div>
        </div>
      )}

      {/* Dependency Hint */}
      {!hasPdfContent && (
        <StageDependencyHint
          message="Para extrair o cronograma automaticamente, faca upload do PDF do edital primeiro."
          suggestedStage="setup"
          onNavigate={actions.setStage}
          variant="info"
        />
      )}

      {/* Batch Actions Toolbar */}
      <AnimatePresence>
        {selectionMode && hasPhases && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 ceramic-card p-4 flex items-center gap-4 shadow-lg z-50"
          >
            <span className="text-sm font-bold text-[#5C554B]">
              {selectedPhaseIds.size} selecionado(s)
            </span>
            <button onClick={handleSelectAll} className="text-xs font-bold text-[#D97706] hover:underline">
              Selecionar Todos
            </button>
            <button onClick={handleDeselectAll} className="text-xs font-bold text-[#948D82] hover:underline">
              Desmarcar
            </button>
            <button
              onClick={handleBatchDelete}
              disabled={selectedPhaseIds.size === 0}
              className="ceramic-concave px-4 py-2 text-xs font-bold text-red-600 disabled:opacity-50 hover:scale-95 transition-transform flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              Excluir Selecionados
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Parse date string in multiple formats
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Try ISO format first
  let date = new Date(dateStr);
  if (!isNaN(date.getTime())) return date;

  // Try DD/MM/YYYY format (common in Brazil)
  const brMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (brMatch) {
    date = new Date(parseInt(brMatch[3]), parseInt(brMatch[2]) - 1, parseInt(brMatch[1]));
    if (!isNaN(date.getTime())) return date;
  }

  // Try DD-MM-YYYY format
  const dashMatch = dateStr.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (dashMatch) {
    date = new Date(parseInt(dashMatch[3]), parseInt(dashMatch[2]) - 1, parseInt(dashMatch[1]));
    if (!isNaN(date.getTime())) return date;
  }

  return null;
}

/**
 * Determine phase status based on date
 */
function determinePhaseStatus(dateStr: string): EditalPhase['status'] {
  const phaseDate = parseDate(dateStr);
  if (!phaseDate) return 'pending'; // Invalid date defaults to pending

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  phaseDate.setHours(0, 0, 0, 0);

  if (phaseDate < today) return 'completed';
  if (phaseDate.getTime() === today.getTime()) return 'active';
  return 'pending';
}

/**
 * Individual timeline phase card
 */
interface TimelinePhaseCardProps {
  phase: EditalPhase;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onRemove: () => void;
  selectionMode: boolean;
  isSelected: boolean;
  onToggleSelection: () => void;
}

const TimelinePhaseCard: React.FC<TimelinePhaseCardProps> = ({
  phase,
  index,
  isFirst,
  isLast,
  onRemove,
  selectionMode,
  isSelected,
  onToggleSelection,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedDate, setEditedDate] = useState(phase.date);
  const { dispatch, state } = useWorkspace();

  const getStatusConfig = () => {
    switch (phase.status) {
      case 'completed':
        return {
          icon: Check,
          bgColor: 'bg-green-500',
          textColor: 'text-green-700',
          label: 'Concluido',
        };
      case 'active':
        return {
          icon: Clock,
          bgColor: 'bg-[#D97706]',
          textColor: 'text-[#D97706]',
          label: 'Hoje',
        };
      case 'pending':
      default:
        return {
          icon: Circle,
          bgColor: 'bg-[#948D82]',
          textColor: 'text-[#948D82]',
          label: 'Pendente',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;
  const formattedDate = formatDate(phase.date);
  const daysRemaining = calculateDaysRemaining(phase.date);
  const isInvalidDate = parseDate(phase.date) === null;

  const handleSaveDate = () => {
    const updatedPhases = state.timeline.phases.map((p) =>
      p.id === phase.id
        ? { ...p, date: editedDate, status: determinePhaseStatus(editedDate) }
        : p
    );
    dispatch({ type: 'SET_TIMELINE_PHASES', payload: updatedPhases });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedDate(phase.date);
    setIsEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.1 }}
      className="relative flex items-start gap-4 pl-2"
    >
      {/* Selection Checkbox */}
      {selectionMode && (
        <button
          onClick={onToggleSelection}
          className="mt-2 text-[#5C554B] hover:text-[#D97706] transition-colors"
        >
          {isSelected ? (
            <CheckSquare className="w-5 h-5 text-[#D97706]" />
          ) : (
            <Square className="w-5 h-5" />
          )}
        </button>
      )}

      {/* Status Indicator */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center z-10 ${config.bgColor}`}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>

      {/* Content */}
      <div className="flex-1 ceramic-tray p-4 -mt-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-bold text-[#5C554B]">{phase.name}</h4>
              {phase.status === 'active' && (
                <span className="px-2 py-0.5 bg-[#D97706]/10 text-[#D97706] text-[10px] font-bold rounded-full animate-pulse">
                  HOJE
                </span>
              )}
              {isInvalidDate && (
                <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  DATA INVALIDA
                </span>
              )}
            </div>

            {/* Date Display/Edit */}
            {isEditing ? (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="date"
                  value={editedDate}
                  onChange={(e) => setEditedDate(e.target.value)}
                  className="bg-white border border-[#5C554B]/20 rounded-lg px-2 py-1 text-xs text-[#5C554B] focus:outline-none focus:ring-2 focus:ring-[#D97706]/50"
                  autoFocus
                />
                <button
                  onClick={handleSaveDate}
                  className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                  title="Salvar"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Cancelar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className={`text-xs font-medium ${isInvalidDate ? 'text-red-600' : config.textColor}`}>
                  {formattedDate}
                  {daysRemaining !== null && phase.status === 'pending' && !isInvalidDate && (
                    <span className="ml-2 text-[#948D82]">
                      ({daysRemaining}d restantes)
                    </span>
                  )}
                </p>
                {isInvalidDate && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1 text-[#D97706] hover:bg-[#D97706]/10 rounded transition-colors"
                    title="Corrigir data"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {phase.description && (
              <p className="text-xs text-[#948D82] mt-2">{phase.description}</p>
            )}
          </div>

          {!selectionMode && (
            <button
              onClick={onRemove}
              className="p-2 text-[#948D82] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Remover"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  const date = parseDate(dateStr);
  if (!date) return dateStr; // Return original if parsing fails
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Calculate days remaining until date
 */
function calculateDaysRemaining(dateStr: string): number | null {
  const targetDate = parseDate(dateStr);
  if (!targetDate) return null;

  const today = new Date();
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : null;
}

export default TimelineStage;
