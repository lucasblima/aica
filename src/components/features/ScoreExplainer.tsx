/**
 * ScoreExplainer — "How is this calculated?" Popover
 * Issue #575: Scientific foundations for AICA Life OS
 *
 * Displays methodology, formula, scale, and improvement tips
 * for any scientific score. Transparency is a core design principle.
 * Follows Ceramic Design System.
 */

import React from 'react';
import { X, BookOpen, AlertTriangle, Lightbulb, Beaker } from 'lucide-react';
import type { ScoreExplanation } from '@/services/scoring/types';

interface ScoreExplainerProps {
  explanation: ScoreExplanation;
  onClose: () => void;
}

export const ScoreExplainer: React.FC<ScoreExplainerProps> = ({
  explanation,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Como o ${explanation.title} é calculado`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative bg-ceramic-base rounded-2xl shadow-ceramic-elevated max-w-md w-full max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-ceramic-base rounded-t-2xl p-4 border-b border-ceramic-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Beaker size={18} className="text-ceramic-accent" />
            <h2 className="text-lg font-semibold text-ceramic-text-primary">
              {explanation.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-ceramic-cool transition-colors"
            aria-label="Fechar"
          >
            <X size={18} className="text-ceramic-text-secondary" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Summary */}
          <p className="text-sm text-ceramic-text-primary leading-relaxed">
            {explanation.summary}
          </p>

          {/* Methodology */}
          <div className="bg-ceramic-cool rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <BookOpen size={14} className="text-ceramic-info" />
              <span className="text-xs font-medium text-ceramic-text-secondary uppercase tracking-wide">
                Metodologia
              </span>
            </div>
            <p className="text-sm text-ceramic-text-primary">
              {explanation.methodology}
            </p>
            {explanation.brazilianValidation && (
              <p className="text-xs text-ceramic-text-secondary mt-1 italic">
                {explanation.brazilianValidation}
              </p>
            )}
          </div>

          {/* Formula */}
          <div>
            <span className="text-xs font-medium text-ceramic-text-secondary uppercase tracking-wide">
              Como é calculado
            </span>
            <p className="text-sm text-ceramic-text-primary mt-1">
              {explanation.formulaDescription}
            </p>
          </div>

          {/* Scale */}
          <div>
            <span className="text-xs font-medium text-ceramic-text-secondary uppercase tracking-wide">
              Escala
            </span>
            <p className="text-sm text-ceramic-text-primary mt-1">
              {explanation.scaleDescription}
            </p>
          </div>

          {/* Contested warning */}
          {explanation.isContested && (
            <div className="bg-ceramic-warning/10 border border-ceramic-warning/30 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle size={14} className="text-ceramic-warning" />
                <span className="text-xs font-medium text-ceramic-warning">
                  Evidência mista
                </span>
              </div>
              <p className="text-xs text-ceramic-text-secondary">
                {explanation.contestedNote ??
                  'Este modelo é usado como heurística prática. A evidência científica é mista e ele não deve ser interpretado como lei absoluta.'}
              </p>
            </div>
          )}

          {/* Improvement tips */}
          {explanation.improvementTips.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Lightbulb size={14} className="text-ceramic-accent" />
                <span className="text-xs font-medium text-ceramic-text-secondary uppercase tracking-wide">
                  Como melhorar
                </span>
              </div>
              <ul className="space-y-1.5">
                {explanation.improvementTips.map((tip, i) => (
                  <li
                    key={i}
                    className="text-sm text-ceramic-text-primary pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-ceramic-accent"
                  >
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
