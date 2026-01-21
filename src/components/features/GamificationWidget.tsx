/**
 * Gamification Widget Component
 *
 * Displays user's game profile including:
 * - Level and XP progress
 * - Current streak
 * - Recent achievements
 * - Quick stats
 */

import React, { useState, useEffect } from 'react';
import {
  UserGameProfile,
  Achievement,
  StreakInfo,
  getUserGameProfile,
  getUserAchievements,
  getUserStreak,
  getLevelProgress,
  getXPToNextLevel,
  formatXP,
  getRarityColor,
} from '@/services/gamificationService';
import { createNamespacedLogger } from '@/lib/logger';
import './GamificationWidget.css';

const log = createNamespacedLogger('GamificationWidget');

interface GamificationWidgetProps {
  userId: string;
  compact?: boolean;
}

export const GamificationWidget: React.FC<GamificationWidgetProps> = ({
  userId,
  compact = false,
}) => {
  const [profile, setProfile] = useState<UserGameProfile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGameData();
  }, [userId]);

  async function loadGameData() {
    try {
      setLoading(true);
      const [gameProfile, userAchievements, userStreak] = await Promise.all([
        getUserGameProfile(userId),
        getUserAchievements(userId),
        getUserStreak(userId),
      ]);

      setProfile(gameProfile);
      setAchievements(userAchievements.slice(0, 6)); // Last 6 achievements
      setStreak(userStreak);
    } catch (error) {
      log.error('Error loading game data', { error });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="gamification-widget loading">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="gamification-widget">No profile found</div>;
  }

  const levelProgress = getLevelProgress(profile.total_xp);
  const xpToNextLevel = getXPToNextLevel(profile.total_xp);

  return (
    <div className={`gamification-widget ${compact ? 'compact' : 'full'}`} data-testid="gamification-widget">
      {/* Level Section */}
      <div className="level-section">
        <div className="level-badge" data-testid="level-badge">
          <div className="level-number">{profile.level}</div>
          <div className="level-label">LEVEL</div>
        </div>

        <div className="xp-container">
          <div className="xp-header">
            <span className="xp-label">Experience</span>
            <span className="xp-value">
              {formatXP(profile.current_xp)} / {formatXP(getXPToNextLevel(profile.current_xp))}
            </span>
          </div>
          <div className="xp-bar" data-testid="xp-progress-bar">
            <div className="xp-fill" style={{ width: `${levelProgress}%` }}></div>
          </div>
          <div className="total-xp" data-testid="total-xp">{formatXP(profile.total_xp)} Total XP</div>
        </div>
      </div>

      {/* Streak Section */}
      {streak && (
        <div className={`streak-section ${streak.active ? 'active' : 'inactive'}`} data-testid="streak-counter">
          <div className="streak-icon">🔥</div>
          <div className="streak-info">
            <div className="streak-number">{streak.current}</div>
            <div className="streak-label">Day Streak</div>
            <div className="streak-best">Best: {streak.longest}</div>
          </div>
        </div>
      )}

      {/* Badges Section */}
      {achievements.length > 0 && (
        <div className="badges-section">
          <h4>Recent Achievements</h4>
          <div className="badges-grid">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`badge badge-${achievement.rarity}`}
                title={`${achievement.badge_name}: ${achievement.description}`}
              >
                <div className="badge-icon">{achievement.icon}</div>
                <div className="badge-name">{achievement.badge_name}</div>
                <div className="badge-xp">+{achievement.xp_reward} XP</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {!compact && (
        <div className="quick-stats">
          <div className="stat">
            <span className="stat-label">Badges</span>
            <span className="stat-value">{profile.total_badges}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Best Streak</span>
            <span className="stat-value">{streak?.longest || 0}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GamificationWidget;
