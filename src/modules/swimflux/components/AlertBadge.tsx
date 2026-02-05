/**
 * AlertBadge - Visual indicator for athlete alerts
 *
 * Displays alert severity, type, and message preview.
 * Follows Ceramic Design System with severity-based coloring.
 */

import React from 'react';
import type { AlertBadgeProps } from '../types';
import { SEVERITY_COLORS } from '../types';
import { AlertCircle, Heart, Frown, UserX } from 'lucide-react';

export function AlertBadge({ alert, compact = false, onClick }: AlertBadgeProps) {
  // Icon mapping by alert type
  const getAlertIcon = () => {
    switch (alert.alert_type) {
      case 'health':
        return Heart;
      case 'motivation':
        return Frown;
      case 'absence':
        return UserX;
      default:
        return AlertCircle;
    }
  };

  const Icon = getAlertIcon();

  // Color mapping by severity
  const getSeverityClasses = () => {
    switch (alert.severity) {
      case 'critical':
        return {
          bg: 'bg-red-50',
          text: 'text-red-700',
          icon: 'text-red-600',
          border: 'border-red-200',
        };
      case 'high':
        return {
          bg: 'bg-orange-50',
          text: 'text-orange-700',
          icon: 'text-orange-600',
          border: 'border-orange-200',
        };
      case 'medium':
        return {
          bg: 'bg-amber-50',
          text: 'text-amber-700',
          icon: 'text-amber-600',
          border: 'border-amber-200',
        };
      case 'low':
        return {
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          icon: 'text-blue-600',
          border: 'border-blue-200',
        };
    }
  };

  const colors = getSeverityClasses();
  const isAcknowledged = !!alert.acknowledged_at;

  // Compact variant (for inline display in AthleteCard)
  if (compact) {
    return (
      <div
        onClick={onClick}
        className={`
          flex items-center gap-2 px-2 py-1.5 rounded-lg border
          ${colors.bg} ${colors.border}
          ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''}
          ${isAcknowledged ? 'opacity-60' : ''}
        `}
      >
        <Icon className={`w-3.5 h-3.5 ${colors.icon} flex-shrink-0`} />
        <p className={`text-[10px] font-medium ${colors.text} line-clamp-1 flex-1`}>
          {alert.message_preview}
        </p>
      </div>
    );
  }

  // Full variant (for AlertsView)
  return (
    <div
      onClick={onClick}
      className={`
        ceramic-card p-4 space-y-3
        ${onClick ? 'cursor-pointer hover:scale-[1.02] transition-transform' : ''}
        ${isAcknowledged ? 'opacity-60' : ''}
        relative overflow-hidden group
      `}
    >
      {/* Severity indicator bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${SEVERITY_COLORS[alert.severity]}`} />

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={`ceramic-inset p-2 ${colors.bg}`}>
          <Icon className={`w-5 h-5 ${colors.icon}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`
                px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                ${colors.bg} ${colors.text}
              `}
            >
              {alert.alert_type}
            </span>
            <span
              className={`
                px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                ${colors.bg} ${colors.text}
              `}
            >
              {alert.severity}
            </span>
          </div>

          <p className="text-sm font-medium text-ceramic-text-primary line-clamp-2">
            {alert.message_preview}
          </p>
        </div>
      </div>

      {/* Keywords */}
      {alert.keywords_detected && alert.keywords_detected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {alert.keywords_detected.slice(0, 3).map((keyword, index) => (
            <span
              key={index}
              className={`
                px-2 py-0.5 rounded-full text-[10px] font-medium
                bg-ceramic-text-secondary/10 text-ceramic-text-secondary
              `}
            >
              {keyword}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px] text-ceramic-text-secondary pt-2 border-t border-ceramic-text-secondary/10">
        <span>
          {new Date(alert.created_at).toLocaleString('pt-BR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>

        {isAcknowledged && (
          <span className="font-medium text-green-600">✓ Reconhecido</span>
        )}
      </div>
    </div>
  );
}
