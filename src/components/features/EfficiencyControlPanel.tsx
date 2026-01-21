/**
 * Efficiency Control Panel Component
 *
 * Unified dashboard card combining efficiency metrics and gamification data
 * Following Ceramic Design System principles:
 * - Single ceramic-card container for cohesive presentation
 * - Hero metric (Efficiency Score) with supporting data grid
 * - Visual hierarchy through weight and spacing, not size
 * - Calm, focused aesthetic with generous whitespace
 */

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Zap,
  Target,
  Clock,
  Award,
} from 'lucide-react';
import {
  getEfficiencyMetrics,
  getProductivityLevel,
  getProductivityColor,
  getProductivityEmoji,
  EfficiencyMetrics,
} from '@/services/efficiencyService';
import {
  UserGameProfile,
  getUserGameProfile,
  getUserStreak,
  StreakInfo,
  getLevelProgress,
  formatXP,
} from '@/services/gamificationService';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('EfficiencyControlPanel');

interface EfficiencyControlPanelProps {
  userId: string;
  compact?: boolean;
}

export const EfficiencyControlPanel: React.FC<EfficiencyControlPanelProps> = ({
  userId,
  compact = false,
}) => {
  const [metrics, setMetrics] = useState<EfficiencyMetrics | null>(null);
  const [gameProfile, setGameProfile] = useState<UserGameProfile | null>(null);
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(!compact);

  useEffect(() => {
    loadAllMetrics();
  }, [userId]);

  const loadAllMetrics = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      const [efficiencyData, gameData, streakData] = await Promise.all([
        getEfficiencyMetrics(userId, today),
        getUserGameProfile(userId),
        getUserStreak(userId),
      ]);

      setMetrics(efficiencyData);
      setGameProfile(gameData);
      setStreak(streakData);
    } catch (error) {
      log.error('Error loading dashboard metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="ceramic-card p-6 rounded-3xl animate-pulse">
        <div className="h-12 bg-ceramic-text-secondary/10 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-ceramic-text-secondary/10 rounded"></div>
          <div className="h-4 bg-ceramic-text-secondary/10 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!metrics || !gameProfile) {
    return (
      <div className="ceramic-card p-6 rounded-3xl">
        <p className="text-ceramic-text-secondary text-sm">
          Carregando painel de controle...
        </p>
      </div>
    );
  }

  const { score, streakDays } = metrics;
  const productivityLevel = getProductivityLevel(score.overall);
  const productivityColor = getProductivityColor(productivityLevel);
  const productivityEmoji = getProductivityEmoji(productivityLevel);
  const levelProgress = getLevelProgress(gameProfile.total_xp);

  return (
    <div className="ceramic-card p-6 rounded-3xl space-y-6">
      {/* Header - Efficiency Score (Hero Metric) */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: productivityColor }}
          />
          <h3 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-widest">
            Painel de Eficiência
          </h3>
        </div>

        <div className="mb-1">
          <div className="text-5xl font-black text-ceramic-text-primary tracking-tighter leading-none">
            {score.overall}
          </div>
          <div className="text-xs text-ceramic-text-secondary uppercase tracking-wide mt-1">
            {productivityEmoji} {productivityLevel}
          </div>
        </div>

        {/* Trend Indicator */}
        <div className="flex items-center justify-center gap-2 mt-3">
          {score.trend === 'improving' && (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <TrendingUp className="w-4 h-4" />
              <span className="font-bold">Melhorando</span>
            </div>
          )}
          {score.trend === 'declining' && (
            <div className="flex items-center gap-1 text-xs text-red-600">
              <TrendingDown className="w-4 h-4" />
              <span className="font-bold">Caindo</span>
            </div>
          )}
          {score.trend === 'stable' && (
            <div className="flex items-center gap-1 text-xs text-ceramic-text-secondary">
              <BarChart3 className="w-4 h-4" />
              <span className="font-bold">Estável</span>
            </div>
          )}
        </div>
      </div>

      {/* Visual Separator */}
      <div className="border-t border-ceramic-text-secondary/10"></div>

      {/* Secondary Metrics Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Productivity */}
        <div className="text-center space-y-1">
          <div className="text-lg font-bold text-ceramic-accent">
            {score.productivity}
          </div>
          <div className="text-[10px] text-ceramic-text-secondary uppercase tracking-widest">
            Produtividade
          </div>
          <div className="ceramic-groove h-1 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-ceramic-accent to-amber-500 transition-all"
              style={{ width: `${score.productivity}%` }}
            />
          </div>
        </div>

        {/* Focus */}
        <div className="text-center space-y-1">
          <div className="text-lg font-bold text-blue-600">
            {score.focus}
          </div>
          <div className="text-[10px] text-ceramic-text-secondary uppercase tracking-widest">
            Foco
          </div>
          <div className="ceramic-groove h-1 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
              style={{ width: `${score.focus}%` }}
            />
          </div>
        </div>

        {/* Consistency */}
        <div className="text-center space-y-1">
          <div className="text-lg font-bold text-green-600">
            {score.consistency}
          </div>
          <div className="text-[10px] text-ceramic-text-secondary uppercase tracking-widest">
            Consistência
          </div>
          <div className="ceramic-groove h-1 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all"
              style={{ width: `${score.consistency}%` }}
            />
          </div>
        </div>
      </div>

      {/* Expandable Section Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-ceramic-text-secondary uppercase tracking-widest hover:text-ceramic-text-primary transition-colors"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="w-4 h-4" />
            Ocultar Detalhes
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            Ver Detalhes
          </>
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <>
          {/* Visual Separator */}
          <div className="border-t border-ceramic-text-secondary/10"></div>

          {/* Gamification Metrics */}
          <div className="grid grid-cols-2 gap-6">
            {/* Level & XP */}
            <div className="ceramic-inset p-4 rounded-2xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
                  <Award className="w-5 h-5 text-ceramic-accent" />
                </div>
                <div>
                  <div className="text-lg font-bold text-ceramic-text-primary">
                    Nível {gameProfile.level}
                  </div>
                  <div className="text-[10px] text-ceramic-text-secondary uppercase tracking-widest">
                    {formatXP(gameProfile.total_xp)} XP Total
                  </div>
                </div>
              </div>
              <div className="ceramic-groove h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all"
                  style={{ width: `${levelProgress}%` }}
                />
              </div>
              <div className="text-[10px] text-ceramic-text-secondary text-center mt-1">
                {levelProgress}% até o próximo nível
              </div>
            </div>

            {/* Streak */}
            <div className="ceramic-inset p-4 rounded-2xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
                  <div className="text-xl">🔥</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-ceramic-text-primary">
                    {streakDays} Dias
                  </div>
                  <div className="text-[10px] text-ceramic-text-secondary uppercase tracking-widest">
                    Sequência Ativa
                  </div>
                </div>
              </div>
              {streak && (
                <div className="text-[10px] text-ceramic-text-secondary text-center">
                  Recorde: {streak.longest} dias consecutivos
                </div>
              )}
            </div>
          </div>

          {/* Additional Stats Row */}
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="text-center">
              <div className="text-sm font-bold text-ceramic-text-primary">
                {metrics.weeklyAverage}%
              </div>
              <div className="text-[10px] text-ceramic-text-secondary uppercase tracking-widest">
                Média Semanal
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-ceramic-text-primary">
                {metrics.monthlyAverage}%
              </div>
              <div className="text-[10px] text-ceramic-text-secondary uppercase tracking-widest">
                Média Mensal
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-ceramic-text-primary">
                {gameProfile.total_badges}
              </div>
              <div className="text-[10px] text-ceramic-text-secondary uppercase tracking-widest">
                Conquistas
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EfficiencyControlPanel;
