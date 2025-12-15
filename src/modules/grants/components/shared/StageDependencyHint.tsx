/**
 * StageDependencyHint - Helper message for soft dependencies between stages
 * Shows guidance without blocking navigation
 */

import React from 'react';
import { Info, ArrowRight, Lightbulb } from 'lucide-react';
import type { StageId } from '../../types/workspace';

interface StageDependencyHintProps {
  message: string;
  suggestedStage?: StageId;
  onNavigate?: (stageId: StageId) => void;
  variant?: 'info' | 'tip' | 'warning';
}

const VARIANT_CONFIG = {
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    iconColor: 'text-blue-500',
  },
  tip: {
    icon: Lightbulb,
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    iconColor: 'text-amber-500',
  },
  warning: {
    icon: Info,
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-700',
    iconColor: 'text-orange-500',
  },
};

const STAGE_LABELS: Record<StageId, string> = {
  setup: 'Contexto & PDF',
  structure: 'Perguntas',
  drafting: 'Preenchimento IA',
  docs: 'Documentacao',
  timeline: 'Cronograma',
};

export const StageDependencyHint: React.FC<StageDependencyHintProps> = ({
  message,
  suggestedStage,
  onNavigate,
  variant = 'info',
}) => {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  return (
    <div
      className={`
        ceramic-card p-4 border ${config.borderColor} ${config.bgColor}
        flex items-start gap-3
      `}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${config.textColor}`}>{message}</p>
        {suggestedStage && onNavigate && (
          <button
            onClick={() => onNavigate(suggestedStage)}
            className={`
              mt-2 inline-flex items-center gap-1 text-xs font-bold
              ${config.iconColor} hover:underline
            `}
          >
            Ir para {STAGE_LABELS[suggestedStage]}
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};

export default StageDependencyHint;
