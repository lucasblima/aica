/**
 * LoadCalculatorPopover - AI-powered training load calculator and optimizer
 *
 * Uses the flux-training-analysis Edge Function (Gemini 2.5 Flash) for
 * personalized load analysis. Falls back to local heuristic calculation
 * if AI is unavailable.
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { X, TrendingUp, AlertTriangle, CheckCircle, Zap, Sparkles, Loader2 } from 'lucide-react';
import type { WorkoutBlockData } from './WorkoutBlock';
import type { AthleteLevel } from '../../types';
import { FluxAIService, type LoadAnalysisResult, type LoadSuggestion } from '../../services/fluxAIService';

interface LoadCalculatorPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  weekWorkouts: WorkoutBlockData[];
  athleteProfile: {
    level: AthleteLevel;
    ftp?: number;
    pace_threshold?: string;
  };
  onApplySuggestions?: (adjustments: LoadAdjustment[]) => void;
}

export interface LoadAdjustment {
  dayOfWeek: number;
  workoutId: string;
  adjustment: 'reduce' | 'increase' | 'remove';
  percentage?: number;
  reason: string;
}

// ============================================
// Local fallback (used when AI is unavailable)
// ============================================

function computeLocalMetrics(weekWorkouts: WorkoutBlockData[]) {
  const totalVolume = weekWorkouts.reduce((sum, w) => sum + w.duration, 0);
  const avgIntensity =
    weekWorkouts.reduce(
      (sum, w) => sum + (w.intensity === 'high' ? 3 : w.intensity === 'medium' ? 2 : 1),
      0
    ) / (weekWorkouts.length || 1);

  const tss = weekWorkouts.reduce((sum, w) => {
    const multiplier = w.intensity === 'high' ? 1.5 : w.intensity === 'medium' ? 1.0 : 0.5;
    return sum + w.duration * multiplier;
  }, 0);

  const loadLevel: 'low' | 'moderate' | 'high' | 'overload' =
    tss < 300 ? 'low' : tss < 600 ? 'moderate' : tss < 900 ? 'high' : 'overload';

  return { totalVolume, totalDays: weekWorkouts.length > 0 ? 5 : 0, avgIntensity, tss: Math.round(tss), loadLevel };
}

function computeLocalSuggestions(
  loadLevel: string,
  athleteLevel: AthleteLevel,
): LoadSuggestion[] {
  if (loadLevel === 'overload') {
    return [
      { type: 'warning', text: 'Carga semanal excessiva - risco de overtraining' },
      { type: 'info', text: 'Reduzir 20% do volume no sabado para recuperacao' },
    ];
  } else if (loadLevel === 'high') {
    return [
      { type: 'success', text: `Carga alta adequada para atleta de nivel ${athleteLevel}` },
      { type: 'info', text: 'Manter recuperacao ativa no domingo' },
    ];
  } else if (loadLevel === 'moderate') {
    return [
      { type: 'success', text: 'Carga balanceada para progressao' },
      { type: 'info', text: 'Considerar adicionar 1 treino de intensidade media' },
    ];
  }
  return [
    { type: 'warning', text: 'Carga baixa - abaixo do ideal para progressao' },
    { type: 'info', text: 'Adicionar treino intervalado ou longao no fim de semana' },
  ];
}

// ============================================
// Main Component
// ============================================

export const LoadCalculatorPopover: React.FC<LoadCalculatorPopoverProps> = ({
  isOpen,
  onClose,
  weekWorkouts,
  athleteProfile,
  onApplySuggestions,
}) => {
  const [aiResult, setAiResult] = useState<LoadAnalysisResult | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Local fallback metrics (always computed for instant display)
  const localMetrics = useMemo(() => computeLocalMetrics(weekWorkouts), [weekWorkouts]);
  const localSuggestions = useMemo(
    () => computeLocalSuggestions(localMetrics.loadLevel, athleteProfile.level),
    [localMetrics.loadLevel, athleteProfile.level],
  );

  // Fetch AI analysis when popover opens
  const fetchAIAnalysis = useCallback(async () => {
    if (weekWorkouts.length === 0) return;

    setIsLoadingAI(true);
    setAiError(null);

    try {
      const result = await FluxAIService.analyzeLoad(weekWorkouts, athleteProfile);
      setAiResult(result);
    } catch (err) {
      console.warn('[LoadCalculator] AI analysis failed, using local fallback:', err);
      setAiError(err instanceof Error ? err.message : 'Erro na analise AI');
    } finally {
      setIsLoadingAI(false);
    }
  }, [weekWorkouts, athleteProfile]);

  useEffect(() => {
    if (isOpen) {
      setAiResult(null);
      setAiError(null);
      fetchAIAnalysis();
    }
  }, [isOpen, fetchAIAnalysis]);

  // Use AI results if available, otherwise fall back to local
  const displayMetrics = useMemo(() => {
    if (aiResult) {
      return {
        totalVolume: localMetrics.totalVolume,
        totalDays: localMetrics.totalDays,
        tss: aiResult.tssEstimate,
        loadLevel: aiResult.loadLevel,
      };
    }
    return localMetrics;
  }, [aiResult, localMetrics]);

  const displaySuggestions: LoadSuggestion[] = aiResult?.suggestions || localSuggestions;
  const isAIPowered = !!aiResult && !aiError;

  if (!isOpen) return null;

  const handleApplySuggestions = () => {
    if (aiResult?.adjustments && aiResult.adjustments.length > 0) {
      onApplySuggestions?.(aiResult.adjustments);
    } else {
      // Fallback mock adjustment
      const mockAdjustments: LoadAdjustment[] = [
        {
          dayOfWeek: 6,
          workoutId: 'mock-id',
          adjustment: 'reduce',
          percentage: 20,
          reason: 'Reduzir sobrecarga semanal',
        },
      ];
      onApplySuggestions?.(mockAdjustments);
    }
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-x-0 top-1/2 -translate-y-1/2 mx-auto w-full max-w-2xl bg-ceramic-base rounded-2xl shadow-2xl z-50 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-ceramic-border bg-gradient-to-r from-ceramic-info/10 to-ceramic-success/10">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="ceramic-card p-3">
                <Zap className="w-6 h-6 text-ceramic-info" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-ceramic-text-primary">
                  Calculadora de Cargas
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-sm text-ceramic-text-secondary">
                    Analise de volume e intensidade semanal
                  </p>
                  {isLoadingAI && (
                    <span className="inline-flex items-center gap-1 text-xs text-ceramic-info font-medium">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Analisando com IA...
                    </span>
                  )}
                  {isAIPowered && (
                    <span className="inline-flex items-center gap-1 text-xs text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded-full">
                      <Sparkles className="w-3 h-3" />
                      IA Gemini
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="ceramic-inset p-2 hover:bg-ceramic-cool transition-colors"
            >
              <X className="w-5 h-5 text-ceramic-text-secondary" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Load Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              label="Volume Total"
              value={`${displayMetrics.totalVolume} min`}
              icon={<TrendingUp className="w-5 h-5" />}
              color="text-ceramic-info"
            />
            <StatCard
              label="TSS Estimado"
              value={displayMetrics.tss}
              icon={<Zap className="w-5 h-5" />}
              color="text-amber-600"
            />
            <StatCard
              label="Dias de Treino"
              value={displayMetrics.totalDays}
              icon={<CheckCircle className="w-5 h-5" />}
              color="text-ceramic-success"
            />
          </div>

          {/* Load Level Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-ceramic-text-primary">Nivel de Carga</span>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  displayMetrics.loadLevel === 'overload'
                    ? 'bg-rose-100 text-rose-700'
                    : displayMetrics.loadLevel === 'high'
                    ? 'bg-amber-100 text-amber-700'
                    : displayMetrics.loadLevel === 'moderate'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {displayMetrics.loadLevel === 'overload'
                  ? 'Sobrecarga'
                  : displayMetrics.loadLevel === 'high'
                  ? 'Alta'
                  : displayMetrics.loadLevel === 'moderate'
                  ? 'Moderada'
                  : 'Baixa'}
              </span>
            </div>

            {/* Visual Load Bar */}
            <div className="h-4 bg-ceramic-cool rounded-full overflow-hidden">
              <div
                className={`h-full transition-all rounded-full ${
                  displayMetrics.loadLevel === 'overload'
                    ? 'bg-gradient-to-r from-rose-400 to-rose-600'
                    : displayMetrics.loadLevel === 'high'
                    ? 'bg-gradient-to-r from-amber-400 to-amber-600'
                    : displayMetrics.loadLevel === 'moderate'
                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                    : 'bg-gradient-to-r from-blue-400 to-blue-600'
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    displayMetrics.loadLevel === 'overload'
                      ? 100
                      : displayMetrics.loadLevel === 'high'
                      ? 75
                      : displayMetrics.loadLevel === 'moderate'
                      ? 50
                      : 25
                  )}%`,
                }}
              />
            </div>

            <div className="flex justify-between mt-1 text-[10px] text-ceramic-text-secondary">
              <span>Baixa</span>
              <span>Moderada</span>
              <span>Alta</span>
              <span>Sobrecarga</span>
            </div>
          </div>

          {/* AI Narrative (only when AI result available) */}
          {aiResult?.narrative && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <p className="text-sm text-purple-900">{aiResult.narrative}</p>
            </div>
          )}

          {/* Suggestions */}
          <div className="ceramic-inset p-5 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              {isAIPowered ? (
                <Sparkles className="w-5 h-5 text-purple-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              )}
              <h3 className="text-sm font-bold text-ceramic-text-primary uppercase tracking-wider">
                {isAIPowered ? 'Sugestoes da IA' : 'Sugestoes de Ajuste'}
              </h3>
            </div>
            <ul className="space-y-2">
              {displaySuggestions.map((sug, idx) => (
                <li key={idx} className="text-sm text-ceramic-text-primary flex items-start gap-2">
                  <span className="text-lg leading-none">
                    {sug.type === 'warning' ? '\u26A0\uFE0F' : sug.type === 'success' ? '\u2705' : '\u2139\uFE0F'}
                  </span>
                  <span>{sug.text}</span>
                </li>
              ))}
            </ul>
            {aiError && (
              <p className="text-xs text-ceramic-text-secondary mt-3 italic">
                Analise local (IA indisponivel: {aiError})
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-ceramic-border bg-ceramic-cool">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 ceramic-card text-sm font-bold text-ceramic-text-primary hover:scale-105 transition-transform"
            >
              Fechar
            </button>
            <button
              onClick={handleApplySuggestions}
              disabled={isLoadingAI}
              className="flex-1 py-3 bg-ceramic-info hover:bg-ceramic-info/90 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
            >
              {isLoadingAI ? 'Analisando...' : 'Aplicar Sugestoes'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// ============================================
// Helper Components
// ============================================

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color }) => (
  <div className="ceramic-card p-4 space-y-2">
    <div className={`ceramic-inset p-2 w-fit ${color}`}>{icon}</div>
    <div>
      <p className="text-xs text-ceramic-text-secondary font-medium uppercase tracking-wider">
        {label}
      </p>
      <p className="text-2xl font-bold text-ceramic-text-primary">{value}</p>
    </div>
  </div>
);
