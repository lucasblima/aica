/**
 * AlertBadge - Visual indicator for athlete alerts
 *
 * Displays alert severity, type, and message preview.
 * Follows Ceramic Design System with severity-based coloring.
 */

import React from 'react';
import type { AlertBadgeProps } from '../types';
import { SEVERITY_COLORS } from '../types';
import { AlertCircle, Heart, Frown, UserX, MessageSquare, FileText, DollarSign } from 'lucide-react';

/* eslint-disable react-hooks/static-components */
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
      case 'documents':
        return FileText;
      case 'financial':
        return DollarSign;
      case 'feedback_received':
        return MessageSquare;
      default:
        return AlertCircle;
    }
  };

  const Icon = getAlertIcon();

  // Severity indicator text (accessibility: not color-only)
  const SEVERITY_INDICATOR: Record<string, string> = {
    critical: '!!',
    high: '!',
    medium: '!',
    low: 'i',
  };

  // Color mapping by severity
  const getSeverityClasses = () => {
    switch (alert.severity) {
      case 'critical':
        return {
          bg: 'bg-ceramic-error/10',
          text: 'text-ceramic-error',
          icon: 'text-ceramic-error',
          border: 'border-ceramic-error/20',
        };
      case 'high':
        return {
          bg: 'bg-ceramic-warning/10',
          text: 'text-ceramic-warning',
          icon: 'text-ceramic-warning',
          border: 'border-ceramic-warning/20',
        };
      case 'medium':
        return {
          bg: 'bg-ceramic-warning/10',
          text: 'text-ceramic-warning',
          icon: 'text-ceramic-warning',
          border: 'border-ceramic-warning/20',
        };
      case 'low':
        return {
          bg: 'bg-ceramic-info/10',
          text: 'text-ceramic-info',
          icon: 'text-ceramic-info',
          border: 'border-ceramic-info/20',
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
        <span className={`text-[9px] font-black ${colors.text} flex-shrink-0`} title={alert.severity}>
          {SEVERITY_INDICATOR[alert.severity]}
        </span>
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
              title={`Severity: ${alert.severity}`}
            >
              {SEVERITY_INDICATOR[alert.severity]} {alert.severity}
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
          <span className="font-medium text-ceramic-success">Reconhecido</span>
        )}
      </div>
    </div>
  );
}
