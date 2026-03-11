/**
 * DigitalSabbaticalPrompt — Digital Sabbatical Card
 * Sprint 7 — Cross-Module Intelligence
 * Issue #575: Scientific foundations for AICA Life OS
 *
 * Ceramic design card showing:
 * - If eligible (30+ active days): Prominent suggestion with amber background
 * - If on sabbatical: Calm green card with remaining days
 * - If not eligible: Small active days counter (or hidden)
 */

import React, { useState, useMemo } from 'react';
import {
  TreePalm,
  Calendar,
  Sun,
  ArrowRight,
  X,
  Timer,
} from 'lucide-react';
import type { SabbaticalState, SabbaticalSuggestion } from '@/hooks/useCrossModuleIntelligence';

// ============================================================================
// TYPES
// ============================================================================

interface DigitalSabbaticalPromptProps {
  /** Current sabbatical state */
  sabbatical: SabbaticalState | null;
  /** Sabbatical suggestion (null = not eligible) */
  suggestion: SabbaticalSuggestion | null;
  /** Start a sabbatical for N days */
  onStartSabbatical: (days: number) => Promise<void>;
  /** End current sabbatical early */
  onEndSabbatical: () => Promise<void>;
  /** Compact mode (smaller, inline) */
  compact?: boolean;
  /** Hide when not eligible */
  hideWhenInactive?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function getRemainingDays(endDate: string | null): number {
  if (!endDate) return 0;
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ============================================================================
// ACTIVE SABBATICAL CARD
// ============================================================================

function ActiveSabbaticalCard({
  sabbatical,
  onEndSabbatical,
}: {
  sabbatical: SabbaticalState;
  onEndSabbatical: () => Promise<void>;
}) {
  const [ending, setEnding] = useState(false);
  const remainingDays = getRemainingDays(sabbatical.sabbaticalEndDate);

  const handleEnd = async () => {
    setEnding(true);
    try {
      await onEndSabbatical();
    } finally {
      setEnding(false);
    }
  };

  return (
    <div className="bg-ceramic-success/10 border border-ceramic-success/30 rounded-xl p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-ceramic-success/15 flex items-center justify-center flex-shrink-0">
          <Sun size={20} className="text-ceramic-success" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-ceramic-success">
            Pausa Digital em Andamento
          </h3>
          <p className="text-xs text-ceramic-success/80 mt-1">
            Aproveite este tempo para recarregar. Suas métricas estão pausadas
            e não serão afetadas.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <Timer size={14} className="text-ceramic-success" />
            <span className="text-sm font-medium text-ceramic-success">
              {remainingDays} {remainingDays === 1 ? 'dia restante' : 'dias restantes'}
            </span>
          </div>
          <button
            onClick={handleEnd}
            disabled={ending}
            className="mt-3 text-xs text-ceramic-success/80 hover:text-ceramic-success transition-colors underline underline-offset-2 disabled:opacity-50"
          >
            {ending ? 'Encerrando...' : 'Encerrar pausa antecipadamente'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUGGESTION CARD
// ============================================================================

function SuggestionCard({
  sabbatical,
  suggestion,
  onStartSabbatical,
  onDismiss,
}: {
  sabbatical: SabbaticalState;
  suggestion: SabbaticalSuggestion;
  onStartSabbatical: (days: number) => Promise<void>;
  onDismiss: () => void;
}) {
  const [starting, setStarting] = useState(false);
  const [selectedDays, setSelectedDays] = useState(suggestion.suggestedDays);

  const handleStart = async () => {
    setStarting(true);
    try {
      await onStartSabbatical(selectedDays);
    } finally {
      setStarting(false);
    }
  };

  const dayOptions = [2, 3];

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <TreePalm size={20} className="text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-amber-800">
              Hora de uma Pausa?
            </h3>
            <p className="text-xs text-amber-700 mt-1">
              {suggestion.message}
            </p>
            <p className="text-xs text-amber-600 mt-2 italic">
              {suggestion.reason}
            </p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-amber-400 hover:text-amber-600 transition-colors flex-shrink-0 ml-2"
          title="Agora não"
        >
          <X size={16} />
        </button>
      </div>

      {/* Duration Selection */}
      <div className="mt-4 flex items-center gap-2">
        <Calendar size={14} className="text-amber-600" />
        <span className="text-xs text-amber-700">Duração:</span>
        {dayOptions.map(days => (
          <button
            key={days}
            onClick={() => setSelectedDays(days)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedDays === days
                ? 'bg-amber-500 text-white'
                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
            }`}
          >
            {days} dias
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleStart}
          disabled={starting}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {starting ? 'Iniciando...' : 'Iniciar Pausa'}
          <ArrowRight size={14} />
        </button>
        <button
          onClick={onDismiss}
          className="text-xs text-amber-600 hover:text-amber-800 transition-colors"
        >
          Agora não
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// INACTIVE COUNTER
// ============================================================================

function InactiveCounter({ activeDays }: { activeDays: number }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-ceramic-cool/50 rounded-lg">
      <Calendar size={14} className="text-ceramic-text-secondary" />
      <span className="text-xs text-ceramic-text-secondary">
        {activeDays} {activeDays === 1 ? 'dia ativo' : 'dias ativos'} consecutivos
      </span>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DigitalSabbaticalPrompt({
  sabbatical,
  suggestion,
  onStartSabbatical,
  onEndSabbatical,
  compact = false,
  hideWhenInactive = false,
}: DigitalSabbaticalPromptProps) {
  const [dismissed, setDismissed] = useState(false);

  // Don't render if no sabbatical data
  if (!sabbatical) return null;

  // Active sabbatical — show green card
  if (sabbatical.isOnSabbatical) {
    return (
      <ActiveSabbaticalCard
        sabbatical={sabbatical}
        onEndSabbatical={onEndSabbatical}
      />
    );
  }

  // Eligible for sabbatical — show suggestion
  if (suggestion?.eligible && !dismissed) {
    return (
      <SuggestionCard
        sabbatical={sabbatical}
        suggestion={suggestion}
        onStartSabbatical={onStartSabbatical}
        onDismiss={() => setDismissed(true)}
      />
    );
  }

  // Not eligible — show counter or hide
  if (hideWhenInactive || compact) return null;

  if (sabbatical.consecutiveActiveDays > 0) {
    return <InactiveCounter activeDays={sabbatical.consecutiveActiveDays} />;
  }

  return null;
}

export default DigitalSabbaticalPrompt;
