/**
 * Efficiency Breakdown Component
 * Gamification 2.0: Holistic productivity visualization
 *
 * Features:
 * - Overall efficiency score with level badge
 * - 5-component radar chart visualization
 * - Individual component progress bars
 * - Trend indicators and suggestions
 * - Period selector (daily, weekly, monthly)
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { unifiedEfficiencyService } from '@/services/unifiedEfficiencyService';
import type {
  UnifiedEfficiencyScore,
  EfficiencyComponent,
  EfficiencyStats,
} from '@/types/unifiedEfficiency';
import {
  EFFICIENCY_COMPONENT_INFO,
  EFFICIENCY_LEVEL_INFO,
  EFFICIENCY_WEIGHTS,
  getEfficiencyLevelInfo,
  getTrendDisplay,
  formatEfficiencyScore,
  DEFAULT_EFFICIENCY_SCORE,
} from '@/types/unifiedEfficiency';
import './EfficiencyBreakdown.css';

// ============================================================================
// TYPES
// ============================================================================

interface EfficiencyBreakdownProps {
  compact?: boolean;
  showChart?: boolean;
  showSuggestions?: boolean;
  onPeriodChange?: (period: 'daily' | 'weekly' | 'monthly') => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const EfficiencyBreakdown: React.FC<EfficiencyBreakdownProps> = ({
  compact = false,
  showChart = true,
  showSuggestions = true,
  onPeriodChange,
}) => {
  const { user } = useAuth();

  // State
  const [score, setScore] = useState<UnifiedEfficiencyScore | null>(null);
  const [stats, setStats] = useState<EfficiencyStats | null>(null);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data
  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [scoreData, statsData] = await Promise.all([
          unifiedEfficiencyService.calculateEfficiencyScore(user.id, period),
          unifiedEfficiencyService.getEfficiencyStats(user.id),
        ]);

        setScore(scoreData);
        setStats(statsData);

        // Save to history
        await unifiedEfficiencyService.saveEfficiencyScore(scoreData);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao calcular eficiência';
        setError(message);
        console.error('[EfficiencyBreakdown] Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id, period]);

  // Handle period change
  const handlePeriodChange = (newPeriod: 'daily' | 'weekly' | 'monthly') => {
    setPeriod(newPeriod);
    onPeriodChange?.(newPeriod);
  };

  if (isLoading) {
    return (
      <div className="efficiency-breakdown loading">
        <div className="loading-spinner" />
        <span>Calculando eficiência...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="efficiency-breakdown error">
        <span className="error-icon">⚠️</span>
        <span>{error}</span>
      </div>
    );
  }

  if (!score) {
    return null;
  }

  const levelInfo = EFFICIENCY_LEVEL_INFO[score.level];
  const trendInfo = getTrendDisplay(score.overall_trend);

  return (
    <div className={`efficiency-breakdown ${compact ? 'compact' : 'full'}`}>
      {/* Period Selector */}
      {!compact && (
        <div className="period-selector">
          {(['daily', 'weekly', 'monthly'] as const).map((p) => (
            <button
              key={p}
              className={`period-btn ${period === p ? 'active' : ''}`}
              onClick={() => handlePeriodChange(p)}
            >
              {p === 'daily' ? 'Hoje' : p === 'weekly' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>
      )}

      {/* Main Score Display */}
      <div className="score-main" style={{ '--level-color': levelInfo.color } as React.CSSProperties}>
        <div className="score-circle">
          <svg viewBox="0 0 100 100">
            <circle
              className="score-bg"
              cx="50"
              cy="50"
              r="45"
              fill="none"
              strokeWidth="8"
            />
            <motion.circle
              className="score-progress"
              cx="50"
              cy="50"
              r="45"
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              initial={{ strokeDasharray: '0 283' }}
              animate={{
                strokeDasharray: `${score.total_score * 2.83} 283`,
              }}
              transition={{ duration: 1, ease: 'easeOut' }}
              style={{ stroke: levelInfo.color }}
            />
          </svg>
          <div className="score-value">
            <span className="score-number">{score.total_score}</span>
            <span className="score-percent">%</span>
          </div>
        </div>

        <div className="score-info">
          <div className="level-badge" style={{ backgroundColor: levelInfo.color }}>
            <span className="level-emoji">{levelInfo.emoji}</span>
            <span className="level-name">{levelInfo.name}</span>
          </div>

          <div className="score-trend" style={{ color: trendInfo.color }}>
            <span className="trend-icon">{trendInfo.icon}</span>
            <span className="trend-text">{trendInfo.text}</span>
            {score.score_delta !== 0 && (
              <span className="trend-delta">
                ({score.score_delta > 0 ? '+' : ''}{score.score_delta}%)
              </span>
            )}
          </div>

          {!compact && (
            <p className="level-description">{levelInfo.description}</p>
          )}
        </div>
      </div>

      {/* Component Breakdown */}
      {!compact && (
        <div className="components-breakdown">
          <h4>Componentes</h4>
          <div className="component-list">
            {Object.entries(score.components).map(([key, comp]) => {
              const info = EFFICIENCY_COMPONENT_INFO[key as EfficiencyComponent];
              const compTrend = getTrendDisplay(comp.trend);

              return (
                <div key={key} className="component-item">
                  <div className="component-header">
                    <span className="component-icon">{info.icon}</span>
                    <span className="component-name">{info.name}</span>
                    <span className="component-weight">({comp.weight}%)</span>
                    <span
                      className="component-trend"
                      style={{ color: compTrend.color }}
                      title={compTrend.text}
                    >
                      {compTrend.icon}
                    </span>
                  </div>

                  <div className="component-bar-container">
                    <motion.div
                      className="component-bar"
                      initial={{ width: 0 }}
                      animate={{ width: `${comp.score}%` }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      style={{ backgroundColor: info.color }}
                    />
                  </div>

                  <div className="component-footer">
                    <span className="component-score">{comp.score}%</span>
                    <span className="component-desc">{info.description}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Radar Chart (simplified visual) */}
      {showChart && !compact && (
        <div className="efficiency-radar">
          <h4>Visão Geral</h4>
          <div className="radar-container">
            {Object.entries(score.components).map(([key, comp], index) => {
              const info = EFFICIENCY_COMPONENT_INFO[key as EfficiencyComponent];
              const angle = (index * 72 - 90) * (Math.PI / 180);
              const radius = (comp.score / 100) * 40;
              const x = 50 + radius * Math.cos(angle);
              const y = 50 + radius * Math.sin(angle);

              return (
                <div
                  key={key}
                  className="radar-point"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    backgroundColor: info.color,
                  }}
                  title={`${info.name}: ${comp.score}%`}
                />
              );
            })}
            <div className="radar-center">
              <span>{score.total_score}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions */}
      {showSuggestions && !compact && (
        <div className="efficiency-suggestions">
          <h4>Sugestão de Foco</h4>
          <div className="suggestion-card">
            <div className="suggestion-icon">
              {EFFICIENCY_COMPONENT_INFO[score.suggested_focus].icon}
            </div>
            <div className="suggestion-content">
              <h5>{EFFICIENCY_COMPONENT_INFO[score.suggested_focus].name}</h5>
              <p>{EFFICIENCY_COMPONENT_INFO[score.suggested_focus].tip}</p>
            </div>
          </div>

          {/* Strengths and weaknesses */}
          <div className="strength-weakness">
            <div className="strength">
              <span className="label">Ponto Forte</span>
              <span className="value">
                {EFFICIENCY_COMPONENT_INFO[score.strongest_component].icon}{' '}
                {EFFICIENCY_COMPONENT_INFO[score.strongest_component].name}
              </span>
            </div>
            <div className="weakness">
              <span className="label">Pode Melhorar</span>
              <span className="value">
                {EFFICIENCY_COMPONENT_INFO[score.weakest_component].icon}{' '}
                {EFFICIENCY_COMPONENT_INFO[score.weakest_component].name}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      {stats && !compact && (
        <div className="efficiency-stats">
          <div className="stat-item">
            <span className="stat-value">{stats.average_score}%</span>
            <span className="stat-label">Média 30d</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.highest_score}%</span>
            <span className="stat-label">Recorde</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.days_above_70}</span>
            <span className="stat-label">Dias 70%+</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.current_good_streak}</span>
            <span className="stat-label">Sequência</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// CUSTOM HOOK
// ============================================================================

/**
 * Hook for efficiency score management
 */
export function useEfficiencyScore(period: 'daily' | 'weekly' | 'monthly' = 'daily') {
  const { user } = useAuth();
  const [score, setScore] = useState<UnifiedEfficiencyScore | null>(null);
  const [stats, setStats] = useState<EfficiencyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const [scoreData, statsData] = await Promise.all([
        unifiedEfficiencyService.calculateEfficiencyScore(user.id, period),
        unifiedEfficiencyService.getEfficiencyStats(user.id),
      ]);

      setScore(scoreData);
      setStats(statsData);

      // Save to history and user stats
      await Promise.all([
        unifiedEfficiencyService.saveEfficiencyScore(scoreData),
        unifiedEfficiencyService.updateUserEfficiencyScore(user.id, scoreData),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error calculating efficiency');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [user?.id, period]);

  return {
    score,
    stats,
    isLoading,
    error,
    refresh,
  };
}

export default EfficiencyBreakdown;
