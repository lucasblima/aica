/**
 * AthleteCard - Athlete profile card with status indicators
 *
 * Displays athlete name, level, adherence rate, and alert count.
 * Uses Ceramic Design System with colorimetric status feedback.
 */

import React from 'react';
import type { AthleteCardProps } from '../types';
import { LEVEL_LABELS, STATUS_CONFIG } from '../types';
import { LevelBadge } from './LevelBadge';
import { AlertBadge } from './AlertBadge';
import { User, AlertCircle, TrendingUp, Calendar } from 'lucide-react';

export function AthleteCard({
  athlete,
  recentFeedbacks = [],
  activeAlerts = [],
  adherenceRate = 0,
  onClick,
}: AthleteCardProps) {
  // Status configuration
  const statusConfig = STATUS_CONFIG[athlete.status];

  // Adherence color logic (colorimetric feedback)
  const getAdherenceColor = (rate: number): string => {
    if (rate >= 80) return 'text-green-600 bg-green-50';
    if (rate >= 60) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  const adherenceColorClass = getAdherenceColor(adherenceRate);
  const hasActiveAlerts = activeAlerts.length > 0;
  const hasCriticalAlerts = activeAlerts.some((alert) => alert.severity === 'critical');

  return (
    <div
      onClick={onClick}
      className={`
        ceramic-card relative overflow-hidden p-4
        hover:scale-[1.02] transition-all duration-300
        cursor-pointer group
        ${hasCriticalAlerts ? 'ring-2 ring-red-500 ring-offset-2' : ''}
      `}
    >
      {/* Background gradient for visual interest */}
      <div className="absolute inset-0 bg-gradient-to-br from-ceramic-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Content */}
      <div className="relative z-10 space-y-3">
        {/* Header: Avatar + Name + Status */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="ceramic-inset w-12 h-12 flex-shrink-0 flex items-center justify-center">
            <User className="w-6 h-6 text-ceramic-text-secondary" />
          </div>

          {/* Name + Level */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-ceramic-text-primary truncate">
              {athlete.name}
            </h3>
            <div className="mt-1">
              <LevelBadge level={athlete.level} size="sm" />
            </div>
          </div>

          {/* Status Badge */}
          <div
            className={`
              px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider
              ${statusConfig.color === 'green' ? 'bg-green-100 text-green-700' : ''}
              ${statusConfig.color === 'yellow' ? 'bg-amber-100 text-amber-700' : ''}
              ${statusConfig.color === 'blue' ? 'bg-blue-100 text-blue-700' : ''}
              ${statusConfig.color === 'gray' ? 'bg-gray-100 text-gray-700' : ''}
            `}
          >
            {statusConfig.label}
          </div>
        </div>

        {/* Metrics Row */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-ceramic-text-secondary/10">
          {/* Adherence Rate */}
          <div className="flex items-center gap-2">
            <div className={`ceramic-inset p-1.5 ${adherenceColorClass}`}>
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[10px] text-ceramic-text-secondary font-medium uppercase tracking-wide">
                Adesao
              </p>
              <p className={`text-sm font-bold ${adherenceColorClass}`}>
                {adherenceRate}%
              </p>
            </div>
          </div>

          {/* Last Feedback */}
          {recentFeedbacks.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="ceramic-inset p-1.5">
                <Calendar className="w-3.5 h-3.5 text-ceramic-text-secondary" />
              </div>
              <div>
                <p className="text-[10px] text-ceramic-text-secondary font-medium uppercase tracking-wide">
                  Ultimo
                </p>
                <p className="text-xs font-bold text-ceramic-text-primary">
                  {new Date(recentFeedbacks[0].created_at).toLocaleDateString('pt-BR', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
              </div>
            </div>
          )}

          {/* Active Alerts */}
          {hasActiveAlerts && (
            <div className="flex items-center gap-2">
              <div
                className={`
                  ceramic-inset p-1.5
                  ${hasCriticalAlerts ? 'bg-red-50' : 'bg-amber-50'}
                `}
              >
                <AlertCircle
                  className={`w-3.5 h-3.5 ${hasCriticalAlerts ? 'text-red-600' : 'text-amber-600'}`}
                />
              </div>
              <div>
                <p className="text-[10px] text-ceramic-text-secondary font-medium uppercase tracking-wide">
                  Alertas
                </p>
                <p
                  className={`text-sm font-bold ${hasCriticalAlerts ? 'text-red-600' : 'text-amber-600'}`}
                >
                  {activeAlerts.length}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Alert Preview (if critical) */}
        {hasCriticalAlerts && (
          <div className="pt-2 border-t border-red-500/20">
            <AlertBadge alert={activeAlerts[0]} compact />
          </div>
        )}
      </div>
    </div>
  );
}
