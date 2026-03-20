/**
 * AthleteCard - Athlete profile card with status indicators
 *
 * Displays athlete name, level, consistency rate, and alert count.
 * Uses Ceramic Design System with colorimetric status feedback.
 * Includes WhatsApp quick action for athlete follow-up.
 */

import React, { useState, useRef, useEffect } from 'react';
import type { AthleteCardProps, AthleteGroup } from '../types';
import { STATUS_CONFIG, MODALITY_CONFIG, getGroupColorClasses } from '../types';
import { AlertBadge } from './AlertBadge';
import { ParQStatusBadge } from './parq/ParQStatusBadge';
import { AlertCircle, MessageSquare, MoreVertical, Edit2, Trash2, Mail, Copy, Check, ClipboardEdit } from 'lucide-react';

const AVATAR_COLORS = [
  'bg-rose-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-violet-500', 'bg-teal-500', 'bg-pink-500', 'bg-indigo-500',
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/** Lightweight feedback shape from workout_slots (not the orphaned Feedback interface) */
export interface SlotFeedback {
  id: string;
  name: string;
  athlete_feedback: string;
  completed_at: string | null;
  rpe: number | null;
}

interface ExtendedAthleteCardProps extends Omit<AthleteCardProps, 'recentFeedbacks'> {
  recentFeedbacks?: SlotFeedback[];
  onWhatsAppClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSendInvite?: () => void;
  onCopyLink?: () => void;
  onPrescreverClick?: () => void;
  inviteStatus?: 'none' | 'sent' | 'delivered' | 'bounced' | 'failed';
  /** Group tags assigned to this athlete (from localStorage groups) */
  groupTags?: AthleteGroup[];
  /** Number of unread feedback entries from this athlete */
  unreadFeedbackCount?: number;
}

export function AthleteCard({
  athlete,
  recentFeedbacks = [],
  activeAlerts = [],
  adherenceRate: _adherenceRate = 0,
  onClick,
  onWhatsAppClick: _onWhatsAppClick,
  onEdit,
  onDelete,
  onSendInvite,
  onCopyLink,
  onPrescreverClick,
  inviteStatus = 'none',
  groupTags = [],
  unreadFeedbackCount = 0,
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

  // adherenceRate kept in props for backward compatibility but not displayed on card
  const hasActiveAlerts = activeAlerts.length > 0;
  const hasCriticalAlerts = activeAlerts.some((alert) => alert.severity === 'critical');

  return (
    <div
      onClick={onClick}
      className={`
        ceramic-card relative overflow-visible p-4
        hover:scale-[1.02] transition-all duration-300
        cursor-pointer group
        ${hasCriticalAlerts ? 'ring-2 ring-ceramic-error ring-offset-2' : ''}
        ${isMenuOpen ? 'z-50' : ''}
      `}
    >
      {/* Background gradient for visual interest */}
      <div className="absolute inset-0 bg-gradient-to-br from-ceramic-cool to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Content */}
      <div className="relative z-10 space-y-3">
        {/* Header: Avatar + Name + Status */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="ceramic-inset w-12 h-12 flex-shrink-0 flex items-center justify-center overflow-hidden rounded-xl">
            {athlete.avatar_url ? (
              <img
                src={athlete.avatar_url}
                alt={athlete.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`w-full h-full flex items-center justify-center ${getAvatarColor(athlete.name)} ${athlete.avatar_url ? 'hidden' : ''}`}>
              <span className="text-white font-bold text-sm">{getInitials(athlete.name)}</span>
            </div>
          </div>

          {/* Name + Level + Modality */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-bold text-ceramic-text-primary truncate">
                {athlete.name === 'Atleta (pendente)' ? 'Convite pendente' : athlete.name}
              </h3>
              {/* Status Indicators — #389 */}
              {athlete.financial_status && athlete.financial_status !== 'ok' && (
                <span
                  className="w-2.5 h-2.5 rounded-full bg-ceramic-error animate-pulse flex-shrink-0"
                  title={athlete.financial_status === 'overdue' ? 'Pagamento em atraso' : 'Pagamento pendente'}
                />
              )}
              {athlete.parq_clearance_status &&
               ['pending', 'blocked', 'expired'].includes(athlete.parq_clearance_status) && (
                <span
                  className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse flex-shrink-0"
                  title={
                    athlete.parq_clearance_status === 'blocked' ? 'Liberação medica necessaria' :
                    athlete.parq_clearance_status === 'expired' ? 'Documentos expirados' :
                    'Documentos pendentes'
                  }
                />
              )}
            </div>
            {/* Modality emoji icons — show all practiced modalities */}
            {(() => {
              const allModalities = athlete.practiced_modalities?.length
                ? athlete.practiced_modalities
                : athlete.modality
                  ? [athlete.modality]
                  : [];
              return allModalities.length > 0 ? (
                <div className="mt-0.5 flex items-center gap-1">
                  {allModalities.map((mod) => {
                    const config = MODALITY_CONFIG[mod as keyof typeof MODALITY_CONFIG];
                    return config ? (
                      <span key={mod} className="text-sm" title={config.label}>
                        {config.icon}
                      </span>
                    ) : null;
                  })}
                </div>
              ) : null;
            })()}
          </div>

          {/* Status Badge — #693: hover tooltip for ATIVO/INATIVO */}
          <div
            className={`
              px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex-shrink-0 cursor-default
              ${statusConfig.color === 'green' ? 'bg-ceramic-success/20 text-ceramic-success' : ''}
              ${statusConfig.color === 'yellow' ? 'bg-ceramic-warning/20 text-ceramic-warning' : ''}
              ${statusConfig.color === 'blue' ? 'bg-ceramic-info/20 text-ceramic-info' : ''}
              ${statusConfig.color === 'gray' ? 'bg-ceramic-cool text-ceramic-text-primary' : ''}
            `}
            title={
              athlete.status === 'active'
                ? 'Atleta conectado ao Aica e seguindo treinos prescritos'
                : athlete.status === 'churned'
                  ? 'Atleta inativo — não esta seguindo treinos prescritos'
                  : athlete.status === 'paused'
                    ? 'Atleta com treinos pausados temporariamente'
                    : 'Atleta em período de teste'
            }
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

        {/* Group Tags */}
        {groupTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {groupTags.map((group) => {
              const colors = getGroupColorClasses(group.color);
              return (
                <span
                  key={group.id}
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${colors.bg} ${colors.text}`}
                >
                  {group.name}
                </span>
              );
            })}
          </div>
        )}

        {/* Metrics Row — feedbacks + status indicators */}
        <div className="flex items-center gap-3 pt-2 border-t border-ceramic-text-secondary/10 flex-wrap">
          {/* Feedbacks summary + unread badge */}
          <div className="flex items-center gap-2">
            <div className="relative ceramic-inset p-1.5">
              <MessageSquare className={`w-3.5 h-3.5 ${unreadFeedbackCount > 0 ? 'text-ceramic-accent' : 'text-ceramic-text-secondary'}`} />
              {unreadFeedbackCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-ceramic-accent text-white text-[9px] font-bold shadow-sm">
                  {unreadFeedbackCount > 9 ? '9+' : unreadFeedbackCount}
                </span>
              )}
            </div>
            <div>
              <p className="text-[10px] text-ceramic-text-secondary font-medium uppercase tracking-wide">
                Feedbacks
              </p>
              {unreadFeedbackCount > 0 ? (
                <p className="text-xs font-bold text-ceramic-accent">
                  {unreadFeedbackCount} novo{unreadFeedbackCount > 1 ? 's' : ''}
                </p>
              ) : recentFeedbacks.length > 0 && recentFeedbacks[0].completed_at ? (
                <p className="text-xs font-bold text-ceramic-text-primary">
                  {recentFeedbacks.length} · {new Date(recentFeedbacks[0].completed_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                </p>
              ) : (
                <p className="text-xs font-medium text-ceramic-text-secondary">Nenhum</p>
              )}
            </div>
          </div>

          {/* PAR-Q Status */}
          {athlete.allow_parq_onboarding && athlete.parq_clearance_status && (
            <ParQStatusBadge status={athlete.parq_clearance_status} size="sm" />
          )}

          {/* Active Alerts */}
          {hasActiveAlerts && (
            <div className="flex items-center gap-2">
              <div className={`ceramic-inset p-1.5 ${hasCriticalAlerts ? 'bg-ceramic-error/10' : 'bg-ceramic-warning/10'}`}>
                <AlertCircle className={`w-3.5 h-3.5 ${hasCriticalAlerts ? 'text-ceramic-error' : 'text-ceramic-warning'}`} />
              </div>
              <div>
                <p className="text-[10px] text-ceramic-text-secondary font-medium uppercase tracking-wide">Alertas</p>
                <p className={`text-sm font-bold ${hasCriticalAlerts ? 'text-ceramic-error' : 'text-ceramic-warning'}`}>{activeAlerts.length}</p>
              </div>
            </div>
          )}
        </div>

        {/* Alert Preview (if critical) */}
        {hasCriticalAlerts && (
          <div className="pt-2 border-t border-ceramic-error/20">
            <AlertBadge alert={activeAlerts[0]} compact />
          </div>
        )}

        {/* Prescrever Treino — Primary CTA */}
        {onPrescreverClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrescreverClick();
            }}
            className="w-full mt-3 py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-md"
            title="Prescrever treino"
          >
            <ClipboardEdit className="w-4 h-4" />
            Prescrever Treino
          </button>
        )}
      </div>
    </div>
  );
}
