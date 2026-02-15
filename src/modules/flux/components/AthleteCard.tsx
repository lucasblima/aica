/**
 * AthleteCard - Athlete profile card with status indicators
 *
 * Displays athlete name, level, consistency rate, and alert count.
 * Uses Ceramic Design System with colorimetric status feedback.
 * Includes WhatsApp quick action for athlete follow-up.
 */

import React, { useState, useRef, useEffect } from 'react';
import type { AthleteCardProps } from '../types';
import { LEVEL_LABELS, STATUS_CONFIG, MODALITY_CONFIG } from '../types';
import { LevelBadge } from './LevelBadge';
import { AlertBadge } from './AlertBadge';
import { ConnectionStatusDot } from './ConnectionStatusDot';
import { User, AlertCircle, TrendingUp, Calendar, MessageCircle, MoreVertical, Edit2, Trash2, Mail, Copy, Check } from 'lucide-react';

interface ExtendedAthleteCardProps extends AthleteCardProps {
  onWhatsAppClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSendInvite?: () => void;
  onCopyLink?: () => void;
  inviteStatus?: 'none' | 'sent' | 'delivered' | 'bounced' | 'failed';
}

export function AthleteCard({
  athlete,
  recentFeedbacks = [],
  activeAlerts = [],
  adherenceRate = 0,
  onClick,
  onWhatsAppClick,
  onEdit,
  onDelete,
  onSendInvite,
  onCopyLink,
  inviteStatus = 'none',
}: ExtendedAthleteCardProps) {
  // Menu dropdown state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

  // Status configuration
  const statusConfig = STATUS_CONFIG[athlete.status];

  // Consistency color logic (colorimetric feedback)
  const getConsistencyColor = (rate: number): string => {
    if (rate >= 80) return 'text-ceramic-success bg-ceramic-success/10';
    if (rate >= 60) return 'text-ceramic-warning bg-ceramic-warning/10';
    return 'text-ceramic-error bg-ceramic-error/10';
  };

  const consistencyColorClass = getConsistencyColor(adherenceRate);
  const hasActiveAlerts = activeAlerts.length > 0;
  const hasCriticalAlerts = activeAlerts.some((alert) => alert.severity === 'critical');

  return (
    <div
      onClick={onClick}
      className={`
        ceramic-card relative overflow-hidden p-4
        hover:scale-[1.02] transition-all duration-300
        cursor-pointer group
        ${hasCriticalAlerts ? 'ring-2 ring-ceramic-error ring-offset-2' : ''}
      `}
    >
      {/* Background gradient for visual interest */}
      <div className="absolute inset-0 bg-gradient-to-br from-ceramic-cool to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Content */}
      <div className="relative z-10 space-y-3">
        {/* Header: Avatar + Name + Status */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="ceramic-inset w-12 h-12 flex-shrink-0 flex items-center justify-center">
            <User className="w-6 h-6 text-ceramic-text-secondary" />
          </div>

          {/* Name + Level + Modality */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-ceramic-text-primary truncate flex items-center gap-1.5">
              {athlete.name}
              <ConnectionStatusDot status={athlete.invitation_status} />
            </h3>
            <div className="mt-1 flex items-center gap-2">
              <LevelBadge level={athlete.level} size="sm" />
              {athlete.modality && (
                <span
                  className="text-sm"
                  title={MODALITY_CONFIG[athlete.modality]?.label}
                >
                  {MODALITY_CONFIG[athlete.modality]?.icon}
                </span>
              )}
            </div>
          </div>

          {/* Status Badge */}
          <div
            className={`
              px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider
              ${statusConfig.color === 'green' ? 'bg-ceramic-success/20 text-ceramic-success' : ''}
              ${statusConfig.color === 'yellow' ? 'bg-ceramic-warning/20 text-ceramic-warning' : ''}
              ${statusConfig.color === 'blue' ? 'bg-ceramic-info/20 text-ceramic-info' : ''}
              ${statusConfig.color === 'gray' ? 'bg-ceramic-cool text-ceramic-text-primary' : ''}
            `}
          >
            {statusConfig.label}
          </div>

          {/* Actions Menu */}
          {(onEdit || onDelete) && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(!isMenuOpen);
                }}
                className="ceramic-inset p-1.5 hover:bg-ceramic-cool transition-colors rounded-lg"
                title="Ações"
              >
                <MoreVertical className="w-4 h-4 text-ceramic-text-secondary" />
              </button>

              {/* Dropdown Menu */}
              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-1 ceramic-card border border-ceramic-border shadow-lg rounded-lg overflow-hidden z-50 min-w-[140px]">
                  {onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(false);
                        onEdit();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-ceramic-text-primary hover:bg-ceramic-cool transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-ceramic-info" />
                      <span>Editar</span>
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(false);
                        onDelete();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-ceramic-text-primary hover:bg-ceramic-error/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-ceramic-error" />
                      <span className="text-ceramic-error">Excluir</span>
                    </button>
                  )}

                  {/* Invite actions — show when athlete has email and is not connected */}
                  {athlete.email && athlete.invitation_status !== 'connected' && (
                    <>
                      <div className="border-t border-ceramic-border" />
                      {onCopyLink && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsMenuOpen(false);
                            navigator.clipboard.writeText('https://aica.guru/meu-treino').then(() => {
                              setLinkCopied(true);
                              setTimeout(() => setLinkCopied(false), 2000);
                            });
                            onCopyLink();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-ceramic-text-primary hover:bg-ceramic-cool transition-colors"
                        >
                          {linkCopied ? (
                            <>
                              <Check className="w-4 h-4 text-ceramic-success" />
                              <span className="text-ceramic-success">Link copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 text-ceramic-info" />
                              <span>Copiar Link</span>
                            </>
                          )}
                        </button>
                      )}
                      {onSendInvite && inviteStatus !== 'sent' && inviteStatus !== 'delivered' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsMenuOpen(false);
                            onSendInvite();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-ceramic-text-primary hover:bg-amber-500/10 transition-colors"
                        >
                          <Mail className="w-4 h-4 text-amber-600" />
                          <span>Enviar Convite</span>
                        </button>
                      )}
                      {(inviteStatus === 'sent' || inviteStatus === 'delivered') && (
                        <div className="flex items-center gap-2 px-3 py-2 text-sm text-ceramic-success">
                          <Check className="w-4 h-4" />
                          <span>Convite enviado</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Metrics Row */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-ceramic-text-secondary/10">
          {/* Consistency Rate */}
          <div className="flex items-center gap-2">
            <div className={`ceramic-inset p-1.5 ${consistencyColorClass}`}>
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[10px] text-ceramic-text-secondary font-medium uppercase tracking-wide">
                Adesao
              </p>
              <p className={`text-sm font-bold ${consistencyColorClass}`}>
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
                  ${hasCriticalAlerts ? 'bg-ceramic-error/10' : 'bg-ceramic-warning/10'}
                `}
              >
                <AlertCircle
                  className={`w-3.5 h-3.5 ${hasCriticalAlerts ? 'text-ceramic-error' : 'text-ceramic-warning'}`}
                />
              </div>
              <div>
                <p className="text-[10px] text-ceramic-text-secondary font-medium uppercase tracking-wide">
                  Alertas
                </p>
                <p
                  className={`text-sm font-bold ${hasCriticalAlerts ? 'text-ceramic-error' : 'text-ceramic-warning'}`}
                >
                  {activeAlerts.length}
                </p>
              </div>
            </div>
          )}

          {/* WhatsApp Quick Action */}
          {onWhatsAppClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onWhatsAppClick();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-ceramic-success/20 hover:bg-ceramic-success/30 rounded-lg transition-colors"
              title="Enviar mensagem via WhatsApp"
            >
              <MessageCircle className="w-4 h-4 text-ceramic-success" />
              <span className="text-xs font-bold text-ceramic-success">WhatsApp</span>
            </button>
          )}
        </div>

        {/* Alert Preview (if critical) */}
        {hasCriticalAlerts && (
          <div className="pt-2 border-t border-ceramic-error/20">
            <AlertBadge alert={activeAlerts[0]} compact />
          </div>
        )}
      </div>
    </div>
  );
}
