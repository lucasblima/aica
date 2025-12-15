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
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { StageDependencyHint } from '../shared/StageDependencyHint';
import type { EditalPhase } from '../../types/workspace';

// Unique ID generator
const generateId = () => `phase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const TimelineStage: React.FC = () => {
  const { state, dispatch, actions } = useWorkspace();
  const { timeline, pdfUpload } = state;
  const [isExtracting, setIsExtracting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPhase, setNewPhase] = useState({ name: '', date: '', description: '' });

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
      console.error('[TimelineStage] Extract error:', error);
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
    </div>
  );
};

/**
 * Determine phase status based on date
 */
function determinePhaseStatus(dateStr: string): EditalPhase['status'] {
  try {
    const phaseDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    phaseDate.setHours(0, 0, 0, 0);

    if (phaseDate < today) return 'completed';
    if (phaseDate.getTime() === today.getTime()) return 'active';
    return 'pending';
  } catch {
    return 'pending';
  }
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
}

const TimelinePhaseCard: React.FC<TimelinePhaseCardProps> = ({
  phase,
  index,
  isFirst,
  isLast,
  onRemove,
}) => {
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

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.1 }}
      className="relative flex items-start gap-4 pl-2"
    >
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
            </div>
            <p className={`text-xs font-medium ${config.textColor}`}>
              {formattedDate}
              {daysRemaining !== null && phase.status === 'pending' && (
                <span className="ml-2 text-[#948D82]">
                  ({daysRemaining}d restantes)
                </span>
              )}
            </p>
            {phase.description && (
              <p className="text-xs text-[#948D82] mt-2">{phase.description}</p>
            )}
          </div>

          <button
            onClick={onRemove}
            className="p-2 text-[#948D82] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Remover"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Calculate days remaining until date
 */
function calculateDaysRemaining(dateStr: string): number | null {
  try {
    const targetDate = new Date(dateStr);
    const today = new Date();
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : null;
  } catch {
    return null;
  }
}

export default TimelineStage;
