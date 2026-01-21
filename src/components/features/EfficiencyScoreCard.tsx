/**
 * Efficiency Score Card Component
 *
 * Displays user's daily/weekly efficiency metrics:
 * - Overall efficiency score
 * - Productivity, focus, consistency sub-scores
 * - Module performance breakdown
 * - Trend indicators
 * - Weekly comparison
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Zap,
  Target,
  BarChart3,
  Clock,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  getEfficiencyMetrics,
  getProductivityLevel,
  getProductivityColor,
  getProductivityEmoji,
  EfficiencyMetrics,
  ModuleEfficiency,
} from '@/services/efficiencyService';
import { cardElevationVariants } from '@/lib/animations/ceramic-motion';
import './EfficiencyScoreCard.css';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('EfficiencyScoreCard');

interface EfficiencyScoreCardProps {
  userId: string;
  compact?: boolean;
}

export const EfficiencyScoreCard: React.FC<EfficiencyScoreCardProps> = ({
  userId,
  compact = false,
}) => {
  const [metrics, setMetrics] = useState<EfficiencyMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(!compact);

  useEffect(() => {
    loadMetrics();
  }, [userId]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const data = await getEfficiencyMetrics(userId, today);
      setMetrics(data);
    } catch (error) {
      log.error('Error loading efficiency metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="efficiency-score-card animate-pulse">
        <div className="h-8 bg-ceramic-text-secondary/10 rounded w-1/2 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-ceramic-text-secondary/10 rounded"></div>
          <div className="h-4 bg-ceramic-text-secondary/10 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="efficiency-score-card">
        <p className="text-ceramic-text-secondary">Carregando dados de eficiência...</p>
      </div>
    );
  }

  const { score, moduleScores, weeklyAverage, monthlyAverage, streakDays, bestDay } = metrics;
  const productivityLevel = getProductivityLevel(score.overall);
  const productivityColor = getProductivityColor(productivityLevel);
  const productivityEmoji = getProductivityEmoji(productivityLevel);

  // Calculate weekly change
  const weeklyChange = weeklyAverage - monthlyAverage;
  const weeklyTrendDirection = weeklyChange > 0 ? 'up' : weeklyChange < 0 ? 'down' : 'stable';

  return (
    <motion.div
      className="efficiency-score-card cursor-pointer"
      variants={cardElevationVariants}
      initial="rest"
      whileHover="hover"
      whileTap="pressed"
    >
      {/* Header */}
      <div
        className="efficiency-header"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ cursor: 'pointer' }}
      >
        <div className="flex items-center gap-3">
          <div className="efficiency-score-badge" style={{ backgroundColor: productivityColor }}>
            <span className="efficiency-score-value">{score.overall}</span>
            <span className="efficiency-score-label">%</span>
          </div>
          <div>
            <p className="efficiency-title">Eficiência</p>
            <p className="efficiency-subtitle">
              {productivityEmoji} {productivityLevel.charAt(0).toUpperCase() + productivityLevel.slice(1)}
            </p>
          </div>
        </div>

        <div className="efficiency-trend-indicator">
          {score.trend === 'improving' && (
            <div className="trend-improving">
              <TrendingUp className="w-4 h-4" />
              <span>Melhorando</span>
            </div>
          )}
          {score.trend === 'declining' && (
            <div className="trend-declining">
              <TrendingDown className="w-4 h-4" />
              <span>Caindo</span>
            </div>
          )}
          {score.trend === 'stable' && (
            <div className="trend-stable">
              <BarChart3 className="w-4 h-4" />
              <span>Estável</span>
            </div>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-ceramic-text-secondary" />
          ) : (
            <ChevronDown className="w-5 h-5 text-ceramic-text-secondary" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="efficiency-expanded">
          {/* Subscores Grid */}
          <div className="subscores-grid">
            <div className="subscore-item">
              <div className="subscore-label">Produtividade</div>
              <div className="subscore-bar">
                <div
                  className="subscore-fill"
                  style={{
                    width: `${score.productivity}%`,
                    backgroundColor: '#667eea',
                  }}
                ></div>
              </div>
              <div className="subscore-value">{score.productivity}%</div>
            </div>

            <div className="subscore-item">
              <div className="subscore-label">Foco</div>
              <div className="subscore-bar">
                <div
                  className="subscore-fill"
                  style={{
                    width: `${score.focus}%`,
                    backgroundColor: '#f59e0b',
                  }}
                ></div>
              </div>
              <div className="subscore-value">{score.focus}%</div>
            </div>

            <div className="subscore-item">
              <div className="subscore-label">Consistência</div>
              <div className="subscore-bar">
                <div
                  className="subscore-fill"
                  style={{
                    width: `${score.consistency}%`,
                    backgroundColor: '#10b981',
                  }}
                ></div>
              </div>
              <div className="subscore-value">{score.consistency}%</div>
            </div>
          </div>

          {/* Weekly Comparison */}
          <div className="weekly-comparison">
            <div className="comparison-item">
              <span className="comparison-label">Esta Semana</span>
              <div className="comparison-value">{weeklyAverage}%</div>
            </div>
            <div className="comparison-change">
              {weeklyTrendDirection === 'up' && (
                <div className="change-positive">
                  <ArrowUpRight className="w-4 h-4" />
                  <span>+{Math.abs(weeklyChange).toFixed(0)}%</span>
                </div>
              )}
              {weeklyTrendDirection === 'down' && (
                <div className="change-negative">
                  <ArrowDownRight className="w-4 h-4" />
                  <span>-{Math.abs(weeklyChange).toFixed(0)}%</span>
                </div>
              )}
              {weeklyTrendDirection === 'stable' && (
                <div className="change-stable">
                  <span>Estável</span>
                </div>
              )}
            </div>
            <div className="comparison-item">
              <span className="comparison-label">Mês</span>
              <div className="comparison-value">{monthlyAverage}%</div>
            </div>
          </div>

          {/* Streak and Best Day */}
          <div className="metrics-row">
            <div className="metric-box">
              <div className="metric-icon" style={{ color: '#f59e0b' }}>
                🔥
              </div>
              <div>
                <div className="metric-label">Sequência</div>
                <div className="metric-value">{streakDays} dias</div>
              </div>
            </div>
            <div className="metric-box">
              <div className="metric-icon" style={{ color: '#667eea' }}>
                ⭐
              </div>
              <div>
                <div className="metric-label">Melhor Dia</div>
                <div className="metric-value">{bestDay ? new Date(bestDay).toLocaleDateString('pt-BR') : 'N/A'}</div>
              </div>
            </div>
          </div>

          {/* Module Performance */}
          {moduleScores.length > 0 && (
            <div className="modules-performance">
              <h4 className="modules-title">Desempenho por Área</h4>
              <div className="modules-list">
                {moduleScores.map(module => (
                  <ModulePerformanceItem key={module.moduleId} module={module} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

/**
 * Module Performance Item Component
 */
const ModulePerformanceItem: React.FC<{ module: ModuleEfficiency }> = ({ module }) => {
  const productivityLevel = getProductivityLevel(module.score);
  const productivityColor = getProductivityColor(productivityLevel);

  return (
    <div className="module-item">
      <div className="module-info">
        <div className="module-name">{module.moduleName}</div>
        <div className="module-stats">
          <span className="stat-badge">
            {module.tasksCompleted}/{module.tasksTotal} tarefas
          </span>
          {module.averageTimePerTask > 0 && (
            <span className="stat-badge">
              <Clock className="w-3 h-3" />
              {module.averageTimePerTask.toFixed(0)}min
            </span>
          )}
        </div>
      </div>
      <div className="module-score-display">
        <div className="module-bar">
          <div
            className="module-fill"
            style={{
              width: `${module.score}%`,
              backgroundColor: productivityColor,
            }}
          ></div>
        </div>
        <div className="module-score-text">{module.score}%</div>
      </div>
    </div>
  );
};

export default EfficiencyScoreCard;
