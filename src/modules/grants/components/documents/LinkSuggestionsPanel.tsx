/**
 * LinkSuggestionsPanel Component
 * Issue #115 - Classification and Automatic Linking
 *
 * Displays link suggestions for a document with confirm/reject actions.
 *
 * @module modules/grants/components/documents/LinkSuggestionsPanel
 */

import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
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
  LinkIcon,
} from 'lucide-react';
import type { LinkSuggestion } from '../../services/documentProcessingService';

// =============================================================================
// TYPES
// =============================================================================

export interface LinkSuggestionsPanelProps {
  suggestions: LinkSuggestion[];
  isLoading?: boolean;
  onConfirm?: (suggestionId: string) => Promise<void>;
  onReject?: (suggestionId: string) => Promise<void>;
  emptyMessage?: string;
  className?: string;
}

type MatchReason = 'cnpj' | 'name_similarity' | 'pronac' | 'context';
type EntityType = 'organization' | 'project' | 'opportunity';

// =============================================================================
// CONSTANTS
// =============================================================================

const ENTITY_TYPE_CONFIG: Record<
  EntityType,
  { icon: React.FC<{ className?: string }>; label: string; color: string; bgColor: string }
> = {
  organization: {
    icon: Building2,
    label: 'Organizacao',
    color: 'text-ceramic-accent',
    bgColor: 'bg-ceramic-accent/15',
  },
  project: {
    icon: FolderOpen,
    label: 'Projeto',
    color: 'text-ceramic-info',
    bgColor: 'bg-ceramic-info-bg',
  },
  opportunity: {
    icon: Target,
    label: 'Oportunidade',
    color: 'text-ceramic-success',
    bgColor: 'bg-ceramic-success-bg',
  },
};

const MATCH_REASON_CONFIG: Record<
  MatchReason,
  { icon: React.FC<{ className?: string }>; label: string; description: string }
> = {
  cnpj: {
    icon: Hash,
    label: 'CNPJ',
    description: 'CNPJ encontrado no documento',
  },
  name_similarity: {
    icon: Type,
    label: 'Nome similar',
    description: 'Nome similar ao cadastro',
  },
  pronac: {
    icon: FileSearch,
    label: 'PRONAC',
    description: 'Número PRONAC identificado',
  },
  context: {
    icon: MessageSquare,
    label: 'Contexto',
    description: 'Inferido pelo contexto do documento',
  },
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100);
  let colorClass = 'bg-ceramic-error-bg text-ceramic-error';

  if (percentage >= 80) {
    colorClass = 'bg-ceramic-success-bg text-ceramic-success';
  } else if (percentage >= 60) {
    colorClass = 'bg-ceramic-warning/10 text-ceramic-warning';
  } else if (percentage >= 40) {
    colorClass = 'bg-ceramic-warning/10 text-ceramic-warning';
  }

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorClass}`}>
      {percentage}% match
    </span>
  );
}

function MatchReasonBadge({ reason }: { reason: MatchReason }) {
  const config = MATCH_REASON_CONFIG[reason];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <span
      className="inline-flex items-center gap-1 text-xs text-ceramic-text-secondary px-2 py-0.5 bg-ceramic-base rounded-full"
      title={config.description}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

// =============================================================================
// SUGGESTION ITEM COMPONENT
// =============================================================================

interface SuggestionItemProps {
  suggestion: LinkSuggestion;
  onConfirm?: (suggestionId: string) => Promise<void>;
  onReject?: (suggestionId: string) => Promise<void>;
  index: number;
}

function SuggestionItem({ suggestion, onConfirm, onReject, index }: SuggestionItemProps) {
  const [isConfirming, setIsConfirming] = React.useState(false);
  const [isRejecting, setIsRejecting] = React.useState(false);

  const entityConfig = ENTITY_TYPE_CONFIG[suggestion.entity_type] || ENTITY_TYPE_CONFIG.project;
  const EntityIcon = entityConfig.icon;

  const handleConfirm = useCallback(async () => {
    if (!onConfirm || isConfirming || isRejecting) return;
    setIsConfirming(true);
    try {
      await onConfirm(suggestion.id);
    } finally {
      setIsConfirming(false);
    }
  }, [onConfirm, suggestion.id, isConfirming, isRejecting]);

  const handleReject = useCallback(async () => {
    if (!onReject || isConfirming || isRejecting) return;
    setIsRejecting(true);
    try {
      await onReject(suggestion.id);
    } finally {
      setIsRejecting(false);
    }
  }, [onReject, suggestion.id, isConfirming, isRejecting]);

  const isProcessing = isConfirming || isRejecting;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ delay: index * 0.05 }}
      className={`
        flex items-center justify-between p-4 bg-ceramic-base rounded-lg border
        hover:border-ceramic-border hover:shadow-sm transition-all
        ${isProcessing ? 'opacity-75' : ''}
      `}
    >
      {/* Entity Info */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={`p-2.5 rounded-lg ${entityConfig.bgColor} flex-shrink-0`}>
          <EntityIcon className={`w-5 h-5 ${entityConfig.color}`} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-medium text-ceramic-text-primary truncate">
            {suggestion.entity_name || `${entityConfig.label} ${suggestion.entity_id.slice(0, 8)}`}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-ceramic-text-secondary">{entityConfig.label}</span>
            <span className="text-ceramic-text-secondary">|</span>
            <ConfidenceBadge confidence={suggestion.confidence} />
            <MatchReasonBadge reason={suggestion.match_reason} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
        <button
          onClick={handleConfirm}
          disabled={isProcessing}
          className={`
            inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
            bg-amber-500 text-white rounded-lg
            hover:bg-amber-600 active:bg-amber-700
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          `}
        >
          {isConfirming ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          Vincular
        </button>

        <button
          onClick={handleReject}
          disabled={isProcessing}
          className={`
            inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
            text-ceramic-text-secondary bg-ceramic-base rounded-lg
            hover:bg-ceramic-cool active:bg-ceramic-cool
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          `}
        >
          {isRejecting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          Ignorar
        </button>
      </div>
    </motion.div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function LinkSuggestionsPanel({
  suggestions,
  isLoading = false,
  onConfirm,
  onReject,
  emptyMessage = 'Nenhuma sugestão de vinculacao encontrada',
  className = '',
}: LinkSuggestionsPanelProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="w-5 h-5 text-ceramic-text-secondary" />
          <span className="font-medium text-ceramic-text-primary">Sugestoes de Vinculacao</span>
          <Loader2 className="w-4 h-4 text-ceramic-info animate-spin ml-2" />
        </div>

        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 bg-ceramic-base rounded-lg border animate-pulse"
          >
            <div className="w-10 h-10 bg-ceramic-cool rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-ceramic-cool rounded w-3/4" />
              <div className="h-3 bg-ceramic-cool rounded w-1/2" />
            </div>
            <div className="flex gap-2">
              <div className="w-20 h-8 bg-ceramic-cool rounded-lg" />
              <div className="w-20 h-8 bg-ceramic-cool rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (suggestions.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="inline-flex items-center justify-center w-12 h-12 bg-ceramic-base rounded-full mb-4">
          <LinkIcon className="w-6 h-6 text-ceramic-text-secondary" />
        </div>
        <p className="text-ceramic-text-secondary text-sm">{emptyMessage}</p>
      </div>
    );
  }

  // Render suggestions
  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-ceramic-info" />
          <span className="font-medium text-ceramic-text-primary">Sugestoes de Vinculacao</span>
          <span className="text-xs text-ceramic-text-secondary bg-ceramic-base px-2 py-0.5 rounded-full">
            {suggestions.length} {suggestions.length === 1 ? 'sugestão' : 'sugestoes'}
          </span>
        </div>
      </div>

      {/* Suggestions List */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {suggestions.map((suggestion, index) => (
            <SuggestionItem
              key={suggestion.id}
              suggestion={suggestion}
              onConfirm={onConfirm}
              onReject={onReject}
              index={index}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Helper text */}
      <p className="mt-4 text-xs text-ceramic-text-secondary text-center">
        Vincule documentos a organizações ou projetos para facilitar a busca e organizacao.
      </p>
    </div>
  );
}

export default LinkSuggestionsPanel;
