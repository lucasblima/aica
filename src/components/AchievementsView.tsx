/**
 * Achievements View Component
 *
 * Displays all achievements with:
 * - Unlocked badges
 * - Locked/upcoming badges
 * - Progress towards badges
 * - Rarity classification
 */

import React, { useState, useEffect } from 'react';
import {
  Achievement,
  Badge,
  getUserAchievements,
  getBadgesCatalog,
  getRarityColor,
} from '../services/gamificationService';
import './AchievementsView.css';

interface AchievementsViewProps {
  userId: string;
  onClose?: () => void;
}

export const AchievementsView: React.FC<AchievementsViewProps> = ({
  userId,
  onClose,
}) => {
  const [unlockedAchievements, setUnlockedAchievements] = useState<Achievement[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAchievements();
  }, [userId]);

  async function loadAchievements() {
    try {
      setLoading(true);
      const achievements = await getUserAchievements(userId);
      const badges = getBadgesCatalog();

      setUnlockedAchievements(achievements);
      setAllBadges(badges);
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  }

  const unlockedIds = new Set(unlockedAchievements.map((a) => a.badge_id));

  const filteredBadges =
    selectedCategory === 'all'
      ? allBadges
      : allBadges.filter((b) => b.category === selectedCategory);

  const categories = Array.from(new Set(allBadges.map((b) => b.category)));

  if (loading) {
    return <div className="achievements-view loading">Loading achievements...</div>;
  }

  return (
    <div className="achievements-view">
      <div className="achievements-header">
        <h2>Achievements</h2>
        {onClose && <button onClick={onClose} className="close-btn">×</button>}
      </div>

      <div className="achievements-stats">
        <div className="stat">
          <span className="stat-value">{unlockedAchievements.length}</span>
          <span className="stat-label">Unlocked</span>
        </div>
        <div className="stat">
          <span className="stat-value">{allBadges.length}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat">
          <span className="stat-value">
            {Math.round((unlockedAchievements.length / allBadges.length) * 100)}%
          </span>
          <span className="stat-label">Complete</span>
        </div>
      </div>

      {/* Category Filter */}
      <div className="category-filter">
        <button
          className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category}
            className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category)}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      {/* Achievements Grid */}
      <div className="achievements-grid">
        {filteredBadges.map((badge) => {
          const isUnlocked = unlockedIds.has(badge.id);
          const unlockedAchievement = unlockedAchievements.find(
            (a) => a.badge_id === badge.id
          );

          return (
            <div
              key={badge.id}
              className={`achievement-card ${isUnlocked ? 'unlocked' : 'locked'} ${badge.rarity}`}
              style={{
                borderColor: isUnlocked ? getRarityColor(badge.rarity) : '#ccc',
              }}
            >
              <div className="achievement-glow"></div>

              <div className="achievement-icon">
                {isUnlocked ? badge.icon : '🔒'}
              </div>

              <div className="achievement-name">{badge.name}</div>

              <div className="achievement-description">{badge.description}</div>

              <div className="achievement-rarity">
                <span
                  className="rarity-badge"
                  style={{
                    background: getRarityColor(badge.rarity),
                  }}
                >
                  {badge.rarity.charAt(0).toUpperCase() + badge.rarity.slice(1)}
                </span>
              </div>

              <div className="achievement-xp">+{badge.xp_reward} XP</div>

              {isUnlocked && unlockedAchievement && (
                <div className="unlocked-date">
                  Unlocked {formatDate(unlockedAchievement.unlocked_at)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="achievements-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ background: getRarityColor('common') }}></span>
          <span>Common</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: getRarityColor('rare') }}></span>
          <span>Rare</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: getRarityColor('epic') }}></span>
          <span>Epic</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: getRarityColor('legendary') }}></span>
          <span>Legendary</span>
        </div>
      </div>
    </div>
  );
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default AchievementsView;
