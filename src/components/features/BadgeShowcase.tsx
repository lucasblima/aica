/**
 * Badge Showcase Component
 * Gamification 2.0: RECIPE-based badge display
 *
 * Features:
 * - Category tabs for filtering
 * - Progress bars for unearned badges
 * - Rarity-based styling with glow effects
 * - Favorite toggling
 * - Black Hat toggle (disabled by default)
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { badgeEvaluationService } from '@/services/badgeEvaluationService';
import type {
  BadgeCategory,
  BadgeWithProgress,
  BadgeRarity,
} from '@/types/badges';
import {
  BADGE_CATEGORY_INFO,
  BADGE_RARITY_INFO,
  getBadgeCategoryInfo,
  getBadgeRarityInfo,
} from '@/types/badges';
import './BadgeShowcase.css';

// ============================================================================
// TYPES
// ============================================================================

interface BadgeShowcaseProps {
  compact?: boolean;
  showCategories?: boolean;
  maxBadges?: number;
  onBadgeClick?: (badge: BadgeWithProgress) => void;
}

interface BadgeStats {
  total: number;
  earned: number;
  available: number;
  byCategory: Record<BadgeCategory, { total: number; earned: number }>;
  byRarity: Record<string, { total: number; earned: number }>;
  totalXpFromBadges: number;
  totalCpFromBadges: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const BadgeShowcase: React.FC<BadgeShowcaseProps> = ({
  compact = false,
  showCategories = true,
  maxBadges,
  onBadgeClick,
}) => {
  const { user } = useAuth();

  // State
  const [badges, setBadges] = useState<BadgeWithProgress[]>([]);
  const [stats, setStats] = useState<BadgeStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<BadgeCategory | 'all'>('all');
  const [showEarnedOnly, setShowEarnedOnly] = useState(false);
  const [blackHatEnabled, setBlackHatEnabled] = useState(false);
  const [blackHatToggling, setBlackHatToggling] = useState(false);

  // Fetch badges and Black Hat preference
  const fetchData = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const [badgesData, statsData] = await Promise.all([
        badgeEvaluationService.evaluateAllBadges(user.id),
        badgeEvaluationService.getBadgeStats(user.id),
      ]);

      setBadges(badgesData);
      setStats(statsData);

      // Read Black Hat preference from the badges data
      // If any black_hat badge has can_earn=true, the setting is enabled
      const hasBlackHatEnabled = badgesData.some(
        (b) => b.hat_type === 'black_hat' && b.can_earn
      );
      setBlackHatEnabled(hasBlackHatEnabled);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar badges';
      setError(message);
      console.error('[BadgeShowcase] Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  // Handle Black Hat toggle
  const handleBlackHatToggle = async () => {
    if (!user?.id || blackHatToggling) return;

    setBlackHatToggling(true);
    try {
      const newValue = !blackHatEnabled;
      await badgeEvaluationService.toggleBlackHatBadges(user.id, newValue);
      setBlackHatEnabled(newValue);
      // Refresh badges to reflect the new setting
      await fetchData();
    } catch (err) {
      console.error('[BadgeShowcase] Error toggling Black Hat:', err);
    } finally {
      setBlackHatToggling(false);
    }
  };

  // Filter badges
  const filteredBadges = badges.filter(badge => {
    if (selectedCategory !== 'all' && badge.category !== selectedCategory) {
      return false;
    }
    if (showEarnedOnly && !badge.earned) {
      return false;
    }
    return true;
  });

  // Apply max limit
  const displayBadges = maxBadges
    ? filteredBadges.slice(0, maxBadges)
    : filteredBadges;

  // Category tabs
  const categories: (BadgeCategory | 'all')[] = [
    'all',
    'reflection',
    'flow',
    'comeback',
    'connection',
    'mastery',
  ];

  if (isLoading) {
    return (
      <div className="badge-showcase loading">
        <div className="loading-spinner" />
        <span>Carregando badges...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="badge-showcase error">
        <span className="error-icon">⚠️</span>
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className={`badge-showcase ${compact ? 'compact' : 'full'}`}>
      {/* Header with Stats */}
      {!compact && stats && (
        <div className="badge-stats">
          <div className="stat-item main">
            <span className="stat-value">{stats.earned}/{stats.total}</span>
            <span className="stat-label">Conquistados</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.totalXpFromBadges}</span>
            <span className="stat-label">XP</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.totalCpFromBadges}</span>
            <span className="stat-label">CP</span>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      {showCategories && !compact && (
        <div className="badge-categories">
          {categories.map(cat => {
            const info = cat === 'all'
              ? { name: 'Todos', icon: '🏆', color: '#6B7280' }
              : BADGE_CATEGORY_INFO[cat];
            const count = cat === 'all'
              ? stats?.earned || 0
              : stats?.byCategory[cat]?.earned || 0;

            return (
              <button
                key={cat}
                className={`category-tab ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  '--category-color': info.color,
                } as React.CSSProperties}
              >
                <span className="category-icon">{info.icon}</span>
                <span className="category-name">{info.name}</span>
                <span className="category-count">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Filters */}
      {!compact && (
        <div className="badge-filters">
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={showEarnedOnly}
              onChange={(e) => setShowEarnedOnly(e.target.checked)}
            />
            <span>Apenas conquistados</span>
          </label>

          {/* Black Hat Badges Toggle */}
          <div className="black-hat-toggle">
            <button
              type="button"
              role="switch"
              aria-checked={blackHatEnabled}
              aria-label="Ativar badges de desafio (Black Hat)"
              className={`toggle-switch ${blackHatEnabled ? 'active' : ''} ${blackHatToggling ? 'loading' : ''}`}
              onClick={handleBlackHatToggle}
              disabled={blackHatToggling}
            >
              <span className="toggle-knob" />
            </button>
            <div className="black-hat-label">
              <span className="black-hat-title">Badges de Desafio (Black Hat)</span>
              <span className="black-hat-description">
                Ativa badges que criam urgência e desafios de tempo. Desativado por padrão.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Badge Grid */}
      <div className="badge-grid">
        <AnimatePresence>
          {displayBadges.map((badge, index) => (
            <BadgeCard
              key={badge.id}
              badge={badge}
              index={index}
              compact={compact}
              onClick={() => onBadgeClick?.(badge)}
            />
          ))}
        </AnimatePresence>

        {displayBadges.length === 0 && (
          <div className="no-badges">
            <span className="no-badges-icon">🎯</span>
            <p>Nenhum badge encontrado</p>
            {showEarnedOnly && (
              <button
                className="show-all-btn"
                onClick={() => setShowEarnedOnly(false)}
              >
                Ver todos os badges
              </button>
            )}
          </div>
        )}
      </div>

      {/* Show more link */}
      {maxBadges && filteredBadges.length > maxBadges && (
        <div className="show-more">
          <span>+{filteredBadges.length - maxBadges} badges</span>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// BADGE CARD SUB-COMPONENT
// ============================================================================

interface BadgeCardProps {
  badge: BadgeWithProgress;
  index: number;
  compact?: boolean;
  onClick?: () => void;
}

const BadgeCard: React.FC<BadgeCardProps> = ({
  badge,
  index,
  compact,
  onClick,
}) => {
  const rarityInfo = BADGE_RARITY_INFO[badge.rarity];
  const categoryInfo = BADGE_CATEGORY_INFO[badge.category];

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        delay: index * 0.05,
        duration: 0.3,
      },
    },
    exit: { opacity: 0, scale: 0.8 },
  };

  return (
    <motion.div
      className={`badge-card ${badge.earned ? 'earned' : 'locked'} ${badge.rarity} ${compact ? 'compact' : ''}`}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      onClick={onClick}
      style={{
        '--rarity-color': rarityInfo.color,
        '--rarity-glow': rarityInfo.glowColor,
        '--category-color': categoryInfo.color,
      } as React.CSSProperties}
    >
      {/* Badge Icon */}
      <div className="badge-icon-container">
        <span className={`badge-icon ${!badge.earned ? 'grayscale' : ''}`}>
          {badge.icon}
        </span>
        {badge.earned && badge.rarity !== 'common' && (
          <div className="badge-glow" />
        )}
        {!badge.can_earn && (
          <div className="badge-disabled-overlay" title="Black Hat desabilitado">
            🔒
          </div>
        )}
      </div>

      {/* Badge Info */}
      {!compact && (
        <div className="badge-info">
          <h4 className="badge-name">{badge.name}</h4>
          <p className="badge-description">{badge.description}</p>

          {/* Progress or Earned Status */}
          {badge.earned ? (
            <div className="badge-earned-status">
              <span className="earned-icon">✓</span>
              <span className="earned-text">Conquistado!</span>
            </div>
          ) : badge.can_earn ? (
            <div className="badge-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${badge.progress}%` }}
                />
              </div>
              <span className="progress-text">{badge.progress_display}</span>
            </div>
          ) : (
            <div className="badge-disabled">
              <span>Desabilitado</span>
            </div>
          )}

          {/* Rewards */}
          <div className="badge-rewards">
            {badge.xp_reward > 0 && (
              <span className="reward xp">+{badge.xp_reward} XP</span>
            )}
            {badge.cp_reward > 0 && badge.hat_type === 'white_hat' && (
              <span className="reward cp">+{badge.cp_reward} CP</span>
            )}
          </div>
        </div>
      )}

      {/* Rarity indicator */}
      <div className="badge-rarity-indicator" title={rarityInfo.name}>
        <div className="rarity-dot" />
      </div>

      {/* Category indicator */}
      {!compact && (
        <div className="badge-category-indicator" title={categoryInfo.name}>
          <span>{categoryInfo.icon}</span>
        </div>
      )}

      {/* Featured badge */}
      {badge.featured && (
        <div className="badge-featured" title="Badge em Destaque">
          ⭐
        </div>
      )}
    </motion.div>
  );
};

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Custom hook for badge management
 */
export function useBadges() {
  const { user } = useAuth();
  const [badges, setBadges] = useState<BadgeWithProgress[]>([]);
  const [stats, setStats] = useState<BadgeStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const [badgesData, statsData] = await Promise.all([
        badgeEvaluationService.evaluateAllBadges(user.id),
        badgeEvaluationService.getBadgeStats(user.id),
      ]);
      setBadges(badgesData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading badges');
    } finally {
      setIsLoading(false);
    }
  };

  const checkNewBadges = async () => {
    if (!user?.id) return [];
    return badgeEvaluationService.checkAndAwardBadges(user.id);
  };

  const toggleFavorite = async (badgeId: string) => {
    if (!user?.id) return false;
    return badgeEvaluationService.toggleBadgeFavorite(user.id, badgeId);
  };

  useEffect(() => {
    refresh();
  }, [user?.id]);

  return {
    badges,
    stats,
    isLoading,
    error,
    refresh,
    checkNewBadges,
    toggleFavorite,
  };
}

export default BadgeShowcase;
