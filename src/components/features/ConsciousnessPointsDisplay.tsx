/**
 * Consciousness Points Display Component
 *
 * Displays user's CP balance including:
 * - Total CP with formatted display
 * - Category breakdown with progress bars
 * - Daily/weekly earned stats
 * - Recent CP transactions
 *
 * Gamification 2.0: Separate from XP to emphasize quality over quantity
 */

import React from 'react';
import { useConsciousnessPoints } from '@/hooks/useConsciousnessPoints';
import { CPCategory } from '@/types/consciousnessPoints';
import './ConsciousnessPointsDisplay.css';

interface ConsciousnessPointsDisplayProps {
  userId: string;
  compact?: boolean;
  showHistory?: boolean;
}

export const ConsciousnessPointsDisplay: React.FC<ConsciousnessPointsDisplayProps> = ({
  userId,
  compact = false,
  showHistory = false,
}) => {
  const {
    balance,
    history,
    isLoading,
    error,
    totalCPFormatted,
    todayCPFormatted,
    weekCPFormatted,
    categoryBreakdown,
  } = useConsciousnessPoints({
    autoFetch: true,
    includeHistory: showHistory,
    historyLimit: 5,
  });

  if (isLoading) {
    return (
      <div className="cp-display loading">
        <div className="loading-spinner" />
        <span>Carregando CP...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cp-display error">
        <span className="error-icon">⚠️</span>
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className={`cp-display ${compact ? 'compact' : 'full'}`} data-testid="cp-display">
      {/* Main CP Counter */}
      <div className="cp-main">
        <div className="cp-icon">✨</div>
        <div className="cp-value-container">
          <div className="cp-value" data-testid="cp-total">
            {totalCPFormatted}
          </div>
          <div className="cp-label">Consciousness Points</div>
        </div>
      </div>

      {/* Daily/Weekly Stats */}
      <div className="cp-stats">
        <div className="cp-stat">
          <span className="stat-value">{todayCPFormatted}</span>
          <span className="stat-label">Hoje</span>
        </div>
        <div className="cp-stat">
          <span className="stat-value">{weekCPFormatted}</span>
          <span className="stat-label">Esta Semana</span>
        </div>
      </div>

      {/* Category Breakdown */}
      {!compact && (
        <div className="cp-categories">
          <h4>Distribuição por Categoria</h4>
          <div className="category-list">
            {categoryBreakdown.map((cat) => (
              <div key={cat.category} className="category-item">
                <div className="category-header">
                  <span className="category-icon">{cat.icon}</span>
                  <span className="category-name">{cat.displayName}</span>
                  <span className="category-amount" style={{ color: cat.color }}>
                    {cat.amount} CP
                  </span>
                </div>
                <div className="category-bar-container">
                  <div
                    className="category-bar"
                    style={{
                      width: `${cat.percentage}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>
                <span className="category-percentage">{cat.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      {showHistory && history.length > 0 && (
        <div className="cp-history">
          <h4>Atividade Recente</h4>
          <div className="history-list">
            {history.map((tx) => (
              <div key={tx.id} className="history-item">
                <div className="history-icon">
                  {getCategoryIconForTransaction(tx.category)}
                </div>
                <div className="history-details">
                  <span className="history-description">{tx.description}</span>
                  <span className="history-time">
                    {formatRelativeTime(tx.created_at)}
                  </span>
                </div>
                <span className="history-amount" style={{ color: getCategoryColor(tx.category) }}>
                  +{tx.amount} CP
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CP Philosophy */}
      {!compact && (
        <div className="cp-philosophy">
          <p>
            <strong>CP</strong> mede a <em>qualidade</em> da sua presença, não a quantidade.
            Ganhe CP através de reflexão, cuidado relacional e ações intencionais.
          </p>
        </div>
      )}
    </div>
  );
};

// Helper functions
function getCategoryIconForTransaction(category: CPCategory): string {
  const icons: Record<CPCategory, string> = {
    presence: '🧘',
    reflection: '📔',
    connection: '💚',
    intention: '🎯',
    growth: '🌱',
  };
  return icons[category] || '✨';
}

function getCategoryColor(category: CPCategory): string {
  const colors: Record<CPCategory, string> = {
    presence: '#8B5CF6',
    reflection: '#EC4899',
    connection: '#10B981',
    intention: '#F59E0B',
    growth: '#3B82F6',
  };
  return colors[category] || '#6B7280';
}

function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `${diffMins}min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;
  return then.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

export default ConsciousnessPointsDisplay;
