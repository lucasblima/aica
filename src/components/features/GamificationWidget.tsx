/**
 * Gamification Widget Component
 *
 * Displays user's game profile including:
 * - Level and XP progress
 * - Streak trend (47/50 dias format - Gamification 2.0)
 * - Grace period and recovery status
 * - Recent achievements
 * - Quick stats
 *
 * Gamification 2.0 Updates:
 * - Compassionate streak display: Shows "47/50 dias" instead of rigid streak
 * - Grace period indicator when active
 * - Recovery progress bar when recovering
 * - Compassionate messages for user encouragement
 */

import React, { useState, useEffect } from 'react';
import {
  UserGameProfile,
  Achievement,
  StreakTrendInfo,
  getUserGameProfile,
  getUserAchievements,
  getUserStreakTrend,
  getLevelProgress,
  getXPToNextLevel,
  formatXP,
  useGracePeriod,
  startStreakRecovery,
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
  const [streakTrend, setStreakTrend] = useState<StreakTrendInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadGameData();
  }, [userId]);

  async function loadGameData() {
    try {
      setLoading(true);
      const [gameProfile, userAchievements, userStreakTrend] = await Promise.all([
        getUserGameProfile(userId),
        getUserAchievements(userId),
        getUserStreakTrend(userId),
      ]);

      setProfile(gameProfile);
      setAchievements(userAchievements.slice(0, 6)); // Last 6 achievements
      setStreakTrend(userStreakTrend);
    } catch (error) {
      log.error('Error loading game data', { error });
    } finally {
      setLoading(false);
    }
  }

  async function handleUseGracePeriod() {
    try {
      setActionLoading(true);
      const result = await useGracePeriod(userId);
      setStreakTrend(result.streakInfo);
    } catch (error) {
      log.error('Error using grace period', { error });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleStartRecovery() {
    try {
      setActionLoading(true);
      const result = await startStreakRecovery(userId);
      setStreakTrend(result.streakInfo);
    } catch (error) {
      log.error('Error starting recovery', { error });
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return <div className="gamification-widget loading">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="gamification-widget">No profile found</div>;
  }

  const levelProgress = getLevelProgress(profile.total_xp);

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

      {/* Streak Trend Section (Gamification 2.0) */}
      {streakTrend && (
        <div
          className={`streak-section ${streakTrend.active ? 'active' : ''} ${streakTrend.isInGracePeriod ? 'grace-period' : ''} ${streakTrend.isRecovering ? 'recovering' : ''}`}
          data-testid="streak-counter"
        >
          {/* Trend Display */}
          <div className="streak-trend" style={{ color: streakTrend.trendColor }}>
            <div className="trend-icon">
              {streakTrend.isInGracePeriod ? '💚' : streakTrend.isRecovering ? '💪' : '🔥'}
            </div>
            <div className="trend-info">
              <div className="trend-display" data-testid="trend-display">
                {streakTrend.trendDisplay}
              </div>
              <div className="trend-label">
                {streakTrend.isInGracePeriod
                  ? 'Período de Descanso'
                  : streakTrend.isRecovering
                  ? 'Em Recuperação'
                  : 'Tendência Ativa'}
              </div>
            </div>
          </div>

          {/* Trend Progress Bar */}
          <div className="trend-progress-container">
            <div
              className="trend-progress-bar"
              style={{
                width: `${streakTrend.trendPercentage}%`,
                backgroundColor: streakTrend.trendColor,
              }}
            />
          </div>

          {/* Recovery Progress (if recovering) */}
          {streakTrend.isRecovering && (
            <div className="recovery-progress">
              <div className="recovery-label">
                Progresso: {streakTrend.recoveryProgress}/{streakTrend.recoveryProgress + streakTrend.recoveryTasksNeeded} tarefas
              </div>
              <div className="recovery-bar-container">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`recovery-step ${i < streakTrend.recoveryProgress ? 'completed' : ''}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Grace Period Info */}
          {streakTrend.isInGracePeriod && (
            <div className="grace-period-info">
              {streakTrend.gracePeriodRemaining} período{streakTrend.gracePeriodRemaining !== 1 ? 's' : ''} restante{streakTrend.gracePeriodRemaining !== 1 ? 's' : ''} este mês
            </div>
          )}

          {/* Compassionate Message */}
          {streakTrend.message && (
            <div className={`compassionate-message ${streakTrend.message.type}`}>
              <span className="message-emoji">{streakTrend.message.emoji}</span>
              <div className="message-content">
                <div className="message-title">{streakTrend.message.title}</div>
                <div className="message-text">{streakTrend.message.message}</div>
              </div>

              {/* Action Buttons */}
              {streakTrend.message.actionType && !actionLoading && (
                <button
                  className="message-action-btn"
                  onClick={
                    streakTrend.message.actionType === 'use_grace_period'
                      ? handleUseGracePeriod
                      : streakTrend.message.actionType === 'start_recovery'
                      ? handleStartRecovery
                      : undefined
                  }
                >
                  {streakTrend.message.actionLabel}
                </button>
              )}
              {actionLoading && (
                <span className="action-loading">Processando...</span>
              )}
            </div>
          )}

          {/* Best Streak (legacy compatibility) */}
          {!compact && (
            <div className="streak-best">
              Melhor sequência: {streakTrend.longest} dias
            </div>
          )}
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
            <span className="stat-label">Tendência</span>
            <span className="stat-value" style={{ color: streakTrend?.trendColor }}>
              {streakTrend?.trendPercentage || 0}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GamificationWidget;
