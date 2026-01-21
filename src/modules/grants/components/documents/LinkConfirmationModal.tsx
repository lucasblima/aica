/**
 * LinkConfirmationModal Component
 * Issue #115 - Classification and Automatic Linking
 *
 * Modal for batch confirming/rejecting document link suggestions.
 * Supports individual actions and bulk operations.
 *
 * @module modules/grants/components/documents/LinkConfirmationModal
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Link2,
  Building2,
  FolderOpen,
  Target,
  CheckCircle,
  XCircle,
  Loader2,
  Hash,
  Type,
  FileSearch,
  MessageSquare,
  CheckCheck,
  XOctagon,
  AlertCircle,
} from 'lucide-react';
import type { LinkSuggestion } from '../../services/documentProcessingService';

import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('Linkconfirmationmodal');

// =============================================================================
// TYPES
// =============================================================================

export interface LinkConfirmationModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Document name for display */
  documentName: string;
  /** List of link suggestions */
  suggestions: LinkSuggestion[];
  /** Callback when a suggestion is confirmed */
  onConfirm: (suggestionId: string) => Promise<void>;
  /** Callback when a suggestion is rejected */
  onReject: (suggestionId: string) => Promise<void>;
  /** Callback when all high confidence suggestions are confirmed */
  onConfirmAllHighConfidence?: (threshold?: number) => Promise<void>;
  /** Callback when all low confidence suggestions are rejected */
  onRejectAllLowConfidence?: (threshold?: number) => Promise<void>;
  /** Callback when all operations are complete */
  onComplete?: () => void;
}

type MatchReason = 'cnpj' | 'name_similarity' | 'pronac' | 'context';
type EntityType = 'organization' | 'project' | 'opportunity';

interface ActionState {
  [suggestionId: string]: 'confirming' | 'rejecting' | 'confirmed' | 'rejected' | 'error';
}

// =============================================================================
// CONSTANTS
// =============================================================================

const ENTITY_TYPE_CONFIG: Record<
  EntityType,
  { icon: React.FC<{ className?: string }>; label: string; color: string; bgColor: string }
> = {
  organization: {
    icon: Building2,
    label: 'Organiza\u00e7\u00e3o',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  project: {
    icon: FolderOpen,
    label: 'Projeto',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  opportunity: {
    icon: Target,
    label: 'Oportunidade',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
};

const MATCH_REASON_CONFIG: Record<
  MatchReason,
  { icon: React.FC<{ className?: string }>; label: string }
> = {
  cnpj: { icon: Hash, label: 'CNPJ' },
  name_similarity: { icon: Type, label: 'Nome similar' },
  pronac: { icon: FileSearch, label: 'PRONAC' },
  context: { icon: MessageSquare, label: 'Contexto' },
};

const HIGH_CONFIDENCE_THRESHOLD = 0.8;
const LOW_CONFIDENCE_THRESHOLD = 0.5;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'bg-green-500';
  if (confidence >= 0.6) return 'bg-yellow-500';
  if (confidence >= 0.4) return 'bg-orange-500';
  return 'bg-red-500';
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return 'Alta';
  if (confidence >= 0.6) return 'M\u00e9dia';
  if (confidence >= 0.4) return 'Baixa';
  return 'Muito baixa';
}

// =============================================================================
// FOCUS TRAP HOOK
// =============================================================================

function useFocusTrap<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const focusableElements = element.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    element.addEventListener('keydown', handleKeyDown);
    return () => element.removeEventListener('keydown', handleKeyDown);
  }, []);

  return ref;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface SuggestionRowProps {
  suggestion: LinkSuggestion;
  actionState?: 'confirming' | 'rejecting' | 'confirmed' | 'rejected' | 'error';
  onConfirm: () => void;
  onReject: () => void;
}

function SuggestionRow({ suggestion, actionState, onConfirm, onReject }: SuggestionRowProps) {
  const entityConfig = ENTITY_TYPE_CONFIG[suggestion.entity_type as EntityType] || ENTITY_TYPE_CONFIG.organization;
  const matchConfig = MATCH_REASON_CONFIG[suggestion.match_reason as MatchReason] || MATCH_REASON_CONFIG.context;
  const EntityIcon = entityConfig.icon;
  const MatchIcon = matchConfig.icon;

  const isProcessing = actionState === 'confirming' || actionState === 'rejecting';
  const isCompleted = actionState === 'confirmed' || actionState === 'rejected';
  const hasError = actionState === 'error';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: isCompleted ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      className={`
        p-4 rounded-xl border transition-all
        ${isCompleted ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200 hover:border-gray-300'}
        ${hasError ? 'border-red-300 bg-red-50' : ''}
      `}
    >
      <div className="flex items-start gap-4">
        {/* Entity Icon */}
        <div className={`p-2 rounded-lg ${entityConfig.bgColor}`}>
          <EntityIcon className={`w-5 h-5 ${entityConfig.color}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900 truncate">
              {suggestion.entity_name || 'Entidade sem nome'}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${entityConfig.bgColor} ${entityConfig.color}`}>
              {entityConfig.label}
            </span>
          </div>

          <div className="flex items-center gap-3 text-sm text-gray-500">
            {/* Match Reason */}
            <div className="flex items-center gap-1">
              <MatchIcon className="w-3.5 h-3.5" />
              <span>{matchConfig.label}</span>
            </div>

            {/* Confidence */}
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${getConfidenceColor(suggestion.confidence)}`} />
              <span>
                {Math.round(suggestion.confidence * 100)}% ({getConfidenceLabel(suggestion.confidence)})
              </span>
            </div>
          </div>

          {/* Status Messages */}
          {actionState === 'confirmed' && (
            <div className="mt-2 flex items-center gap-1 text-green-600 text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>V\u00ednculo confirmado</span>
            </div>
          )}
          {actionState === 'rejected' && (
            <div className="mt-2 flex items-center gap-1 text-gray-500 text-sm">
              <XCircle className="w-4 h-4" />
              <span>Sugest\u00e3o rejeitada</span>
            </div>
          )}
          {hasError && (
            <div className="mt-2 flex items-center gap-1 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Erro ao processar</span>
            </div>
          )}
        </div>

        {/* Actions */}
        {!isCompleted && (
          <div className="flex items-center gap-2">
            <button
              onClick={onReject}
              disabled={isProcessing}
              className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Rejeitar sugest\u00e3o"
            >
              {actionState === 'rejecting' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={onConfirm}
              disabled={isProcessing}
              className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Confirmar sugest\u00e3o"
            >
              {actionState === 'confirming' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CheckCircle className="w-5 h-5" />
              )}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function LinkConfirmationModal({
  isOpen,
  onClose,
  documentName,
  suggestions,
  onConfirm,
  onReject,
  onConfirmAllHighConfidence,
  onRejectAllLowConfidence,
  onComplete,
}: LinkConfirmationModalProps) {
  const modalRef = useFocusTrap<HTMLDivElement>();
  const [actionStates, setActionStates] = useState<ActionState>({});
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setActionStates({});
      setIsBulkProcessing(false);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Calculate stats
  const highConfidenceCount = suggestions.filter(s => s.confidence >= HIGH_CONFIDENCE_THRESHOLD).length;
  const lowConfidenceCount = suggestions.filter(s => s.confidence < LOW_CONFIDENCE_THRESHOLD).length;
  const pendingCount = suggestions.filter(s => !actionStates[s.id] || actionStates[s.id] === 'error').length;
  const confirmedCount = Object.values(actionStates).filter(s => s === 'confirmed').length;
  const rejectedCount = Object.values(actionStates).filter(s => s === 'rejected').length;

  const handleConfirm = useCallback(async (suggestionId: string) => {
    setActionStates(prev => ({ ...prev, [suggestionId]: 'confirming' }));
    try {
      await onConfirm(suggestionId);
      setActionStates(prev => ({ ...prev, [suggestionId]: 'confirmed' }));
    } catch (error) {
      log.error('Error confirming suggestion:', error);
      setActionStates(prev => ({ ...prev, [suggestionId]: 'error' }));
    }
  }, [onConfirm]);

  const handleReject = useCallback(async (suggestionId: string) => {
    setActionStates(prev => ({ ...prev, [suggestionId]: 'rejecting' }));
    try {
      await onReject(suggestionId);
      setActionStates(prev => ({ ...prev, [suggestionId]: 'rejected' }));
    } catch (error) {
      log.error('Error rejecting suggestion:', error);
      setActionStates(prev => ({ ...prev, [suggestionId]: 'error' }));
    }
  }, [onReject]);

  const handleConfirmAllHighConfidence = useCallback(async () => {
    if (!onConfirmAllHighConfidence) return;
    setIsBulkProcessing(true);
    try {
      await onConfirmAllHighConfidence(HIGH_CONFIDENCE_THRESHOLD);
      // Update states for high confidence suggestions
      suggestions
        .filter(s => s.confidence >= HIGH_CONFIDENCE_THRESHOLD)
        .forEach(s => {
          setActionStates(prev => ({ ...prev, [s.id]: 'confirmed' }));
        });
    } catch (error) {
      log.error('Error confirming all high confidence:', error);
    } finally {
      setIsBulkProcessing(false);
    }
  }, [onConfirmAllHighConfidence, suggestions]);

  const handleRejectAllLowConfidence = useCallback(async () => {
    if (!onRejectAllLowConfidence) return;
    setIsBulkProcessing(true);
    try {
      await onRejectAllLowConfidence(LOW_CONFIDENCE_THRESHOLD);
      // Update states for low confidence suggestions
      suggestions
        .filter(s => s.confidence < LOW_CONFIDENCE_THRESHOLD)
        .forEach(s => {
          setActionStates(prev => ({ ...prev, [s.id]: 'rejected' }));
        });
    } catch (error) {
      log.error('Error rejecting all low confidence:', error);
    } finally {
      setIsBulkProcessing(false);
    }
  }, [onRejectAllLowConfidence, suggestions]);

  const handleComplete = useCallback(() => {
    onComplete?.();
    onClose();
  }, [onComplete, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-100">
                  <Link2 className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 id="modal-title" className="text-lg font-semibold text-gray-900">
                    Confirmar V\u00ednculos
                  </h2>
                  <p className="text-sm text-gray-500 truncate max-w-md">
                    {documentName}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Fechar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stats Bar */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-600">
                  {suggestions.length} sugest\u00f5es
                </span>
                {confirmedCount > 0 && (
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    {confirmedCount} confirmadas
                  </span>
                )}
                {rejectedCount > 0 && (
                  <span className="text-gray-500 flex items-center gap-1">
                    <XCircle className="w-4 h-4" />
                    {rejectedCount} rejeitadas
                  </span>
                )}
              </div>

              {/* Bulk Actions */}
              <div className="flex items-center gap-2">
                {highConfidenceCount > 0 && onConfirmAllHighConfidence && (
                  <button
                    onClick={handleConfirmAllHighConfidence}
                    disabled={isBulkProcessing}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 disabled:opacity-50 transition-colors"
                  >
                    {isBulkProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCheck className="w-4 h-4" />
                    )}
                    Confirmar alta confian\u00e7a ({highConfidenceCount})
                  </button>
                )}
                {lowConfidenceCount > 0 && onRejectAllLowConfidence && (
                  <button
                    onClick={handleRejectAllLowConfidence}
                    disabled={isBulkProcessing}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 disabled:opacity-50 transition-colors"
                  >
                    {isBulkProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XOctagon className="w-4 h-4" />
                    )}
                    Rejeitar baixa ({lowConfidenceCount})
                  </button>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {suggestions.length === 0 ? (
                <div className="text-center py-12">
                  <Link2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhuma sugest\u00e3o de v\u00ednculo encontrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {suggestions.map(suggestion => (
                      <SuggestionRow
                        key={suggestion.id}
                        suggestion={suggestion}
                        actionState={actionStates[suggestion.id]}
                        onConfirm={() => handleConfirm(suggestion.id)}
                        onReject={() => handleReject(suggestion.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-100 bg-gray-50">
              <p className="text-sm text-gray-500">
                {pendingCount > 0 ? (
                  `${pendingCount} sugest\u00f5es pendentes`
                ) : (
                  'Todas as sugest\u00f5es foram processadas'
                )}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Fechar
                </button>
                {pendingCount === 0 && (
                  <button
                    onClick={handleComplete}
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Concluir
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default LinkConfirmationModal;
