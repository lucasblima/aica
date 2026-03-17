/**
 * ProspectCard Component
 * Issue #101 - Card draggable para o Kanban de patrocinadores
 *
 * @module modules/grants/components/ProspectCard
 */

import React from 'react';
import {
  Building2,
  User,
  Clock,
  Calendar,
  Phone,
  Mail,
  MoreVertical,
  AlertCircle,
} from 'lucide-react';
import type { KanbanSponsorCard, ActivityType } from '../types/prospect';
import { ACTIVITY_TYPE_ICONS, ACTIVITY_TYPE_LABELS } from '../types/prospect';

interface ProspectCardProps {
  sponsor: KanbanSponsorCard;
  isDragging?: boolean;
  onClick?: () => void;
  onQuickAction?: (action: 'call' | 'email' | 'meeting') => void;
}

/**
 * Card de patrocinador para o Kanban
 */
export function ProspectCard({
  sponsor,
  isDragging = false,
  onClick,
  onQuickAction,
}: ProspectCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatRelativeDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dia${diffDays !== 1 ? 's' : ''} atras`;
    const weeks = Math.floor(diffDays / 7);
    if (diffDays < 30) return `${weeks} semana${weeks !== 1 ? 's' : ''} atras`;
    const months = Math.floor(diffDays / 30);
    return `${months} ${months === 1 ? 'mes' : 'meses'} atras`;
  };

  const getActivityIcon = (type: ActivityType | null) => {
    if (!type) return null;
    const iconName = ACTIVITY_TYPE_ICONS[type];
    // Retorna string para ser usado no CSS ou mapeamento posterior
    return iconName;
  };

  const isOverdue = sponsor.next_action_date && new Date(sponsor.next_action_date) < new Date();
  const isStale = sponsor.days_in_stage > 14; // Mais de 2 semanas no mesmo estagio

  return (
    <div
      className={`
        bg-ceramic-base rounded-lg border p-3 cursor-pointer
        transition-all duration-200
        ${isDragging ? 'shadow-lg rotate-2 opacity-90' : 'shadow-sm hover:shadow-md'}
        ${isStale ? 'border-amber-300' : 'border-ceramic-border'}
      `}
      onClick={onClick}
    >
      {/* Header com nome e valor */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-ceramic-text-primary truncate">
            {sponsor.company_name || sponsor.contact_name || 'Sem nome'}
          </h4>
          {sponsor.company_name && sponsor.contact_name && (
            <p className="text-xs text-ceramic-text-secondary truncate flex items-center gap-1">
              <User className="w-3 h-3" />
              {sponsor.contact_name}
            </p>
          )}
        </div>
        <span
          className="text-sm font-semibold px-2 py-0.5 rounded"
          style={{
            backgroundColor: sponsor.tier_color ? `${sponsor.tier_color}20` : '#f3f4f6',
            color: sponsor.tier_color || '#374151',
          }}
        >
          {formatCurrency(sponsor.value)}
        </span>
      </div>

      {/* Tier badge */}
      <div className="mb-2">
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: sponsor.tier_color ? `${sponsor.tier_color}15` : '#f3f4f6',
            color: sponsor.tier_color || '#6b7280',
          }}
        >
          {sponsor.tier_name}
        </span>
      </div>

      {/* Ultima atividade */}
      {sponsor.last_activity_date && (
        <div className="text-xs text-ceramic-text-secondary mb-2 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>
            {ACTIVITY_TYPE_LABELS[sponsor.last_activity_type!]} -{' '}
            {formatRelativeDate(sponsor.last_activity_date)}
          </span>
        </div>
      )}

      {/* Proxima ação */}
      {sponsor.next_action && (
        <div
          className={`
            text-xs p-2 rounded mb-2
            ${isOverdue ? 'bg-ceramic-error-bg text-ceramic-error' : 'bg-ceramic-info-bg text-ceramic-info'}
          `}
        >
          <div className="flex items-start gap-1">
            {isOverdue && <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />}
            <div>
              <span className="font-medium">Proxima ação:</span> {sponsor.next_action}
              {sponsor.next_action_date && (
                <span className="block mt-0.5">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  {new Date(sponsor.next_action_date).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer com ações rapidas */}
      <div className="flex items-center justify-between pt-2 border-t border-ceramic-border">
        <div className="flex items-center gap-1 text-ceramic-text-secondary">
          <span className="text-xs">
            {sponsor.days_in_stage}d neste estagio
          </span>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-1">
          <button
            className="p-1 hover:bg-ceramic-base rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onQuickAction?.('call');
            }}
            title="Registrar ligacao"
          >
            <Phone className="w-4 h-4 text-ceramic-text-secondary" />
          </button>
          <button
            className="p-1 hover:bg-ceramic-base rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onQuickAction?.('email');
            }}
            title="Registrar e-mail"
          >
            <Mail className="w-4 h-4 text-ceramic-text-secondary" />
          </button>
          <button
            className="p-1 hover:bg-ceramic-base rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
            }}
            title="Mais opções"
          >
            <MoreVertical className="w-4 h-4 text-ceramic-text-secondary" />
          </button>
        </div>
      </div>

      {/* Indicador de stale */}
      {isStale && !isOverdue && (
        <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Sem atividade recente
        </div>
      )}
    </div>
  );
}

export default ProspectCard;
