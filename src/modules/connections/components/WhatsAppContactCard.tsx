/**
 * WhatsAppContactCard
 * Rich contact card for WhatsApp-synced contacts
 *
 * Issue #92: feat(whatsapp): Exibir lista de contatos sincronizados com UI rica
 */

import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Star, Phone, Mail, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/dateUtils';
import { ContactAvatar } from '@/components/ui/ContactAvatar';
import { RelationshipScoreBadge } from '@/components/ui/RelationshipScoreBadge';
import type { ContactNetwork } from '@/types/memoryTypes';
import type { HealthScoreTrend } from '@/types/healthScore';

export interface WhatsAppContactCardProps {
  /** Contact data */
  contact: ContactNetwork;
  /** Whether this contact is favorited */
  isFavorite?: boolean;
  /** Click handler for opening contact details */
  onClick?: (contact: ContactNetwork) => void;
  /** Handler for chat action */
  onChatClick?: (contact: ContactNetwork) => void;
  /** Handler for favorite toggle */
  onFavoriteToggle?: (contact: ContactNetwork) => void;
  /** Handler for more options menu */
  onMoreClick?: (contact: ContactNetwork) => void;
  /** Card variant */
  variant?: 'default' | 'compact';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get relationship type label in Portuguese
 */
function getRelationshipLabel(type: ContactNetwork['relationship_type']): string {
  const labels: Record<string, string> = {
    colleague: 'Colega',
    client: 'Cliente',
    friend: 'Amigo',
    family: 'Familia',
    mentor: 'Mentor',
    mentee: 'Mentorado',
    vendor: 'Fornecedor',
    contact: 'Contato',
    group: 'Grupo',
    other: 'Outro',
  };
  return type ? labels[type] || 'Contato' : 'Contato';
}

/**
 * Format phone number for display
 * +5511999999999 → +55 11 99999-9999
 */
function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';

  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  // Brazilian format: +55 XX XXXXX-XXXX
  if (digits.length === 13 && digits.startsWith('55')) {
    const country = digits.slice(0, 2);
    const area = digits.slice(2, 4);
    const part1 = digits.slice(4, 9);
    const part2 = digits.slice(9, 13);
    return `+${country} ${area} ${part1}-${part2}`;
  }

  // Fallback: just add some spacing
  return phone;
}

export function WhatsAppContactCard({
  contact,
  isFavorite = false,
  onClick,
  onChatClick,
  onFavoriteToggle,
  onMoreClick,
  variant = 'default',
  className,
}: WhatsAppContactCardProps) {
  // Determine display name (prefer WhatsApp name if available)
  const displayName = contact.whatsapp_name || contact.name || 'Sem nome';

  // Determine phone number to display
  const displayPhone = contact.whatsapp_phone || contact.phone_number;

  // Last message timestamp
  const lastMessageAt = contact.last_whatsapp_message_at || contact.whatsapp_last_message_at || contact.last_interaction_at;

  // Health score trend
  const trend = contact.sentiment_trend as HealthScoreTrend | undefined;

  // Stop propagation for action buttons
  const handleChatClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChatClick?.(contact);
    },
    [contact, onChatClick]
  );

  const handleFavoriteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onFavoriteToggle?.(contact);
    },
    [contact, onFavoriteToggle]
  );

  const handleMoreClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onMoreClick?.(contact);
    },
    [contact, onMoreClick]
  );

  const isCompact = variant === 'compact';

  return (
    <motion.article
      onClick={() => onClick?.(contact)}
      className={cn(
        'ceramic-card group transition-all cursor-pointer',
        'hover:shadow-lg hover:scale-[1.01]',
        isCompact ? 'p-3' : 'p-4',
        className
      )}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.(contact)}
      aria-label={`Contato: ${displayName}`}
    >
      {/* Main content row */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <ContactAvatar
          name={displayName}
          whatsappProfilePicUrl={contact.whatsapp_profile_pic_url}
          avatarUrl={contact.avatar_url}
          size={isCompact ? 'md' : 'lg'}
          isOnline={contact.whatsapp_sync_status === 'synced'}
        />

        {/* Contact info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {/* Name */}
              <h3 className={cn(
                'font-semibold text-ceramic-text-primary truncate',
                isCompact ? 'text-sm' : 'text-base'
              )}>
                {displayName}
              </h3>

              {/* Relationship type */}
              <p className="text-xs text-ceramic-text-secondary truncate">
                {getRelationshipLabel(contact.relationship_type)}
              </p>
            </div>

            {/* Health score badge */}
            <RelationshipScoreBadge
              score={contact.health_score}
              trend={trend}
              size="sm"
              showTrend={!isCompact}
            />
          </div>

          {/* Phone and last message */}
          {!isCompact && (
            <div className="mt-2 space-y-1">
              {displayPhone && (
                <div className="flex items-center gap-1.5 text-ceramic-text-secondary">
                  <Phone className="w-3 h-3 flex-shrink-0" />
                  <span className="text-xs truncate">
                    {formatPhoneNumber(displayPhone)}
                  </span>
                </div>
              )}

              {lastMessageAt && (
                <p className="text-xs text-ceramic-text-secondary">
                  Ultima mensagem {formatRelativeTime(lastMessageAt, { useHaPrefix: true })}
                </p>
              )}

              {/* Issue #91: Message preview */}
              {contact.last_message_preview && (
                <div className="flex items-start gap-1 text-ceramic-text-secondary mt-1">
                  {contact.last_message_direction === 'outgoing' && (
                    <span className="text-xs font-medium text-ceramic-text-tertiary flex-shrink-0">Voce:</span>
                  )}
                  <p className="text-xs truncate max-w-[220px]">
                    {contact.last_message_preview}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions - only show on hover or focus for non-compact */}
      <div className={cn(
        'flex items-center justify-end gap-1 mt-3 pt-3 border-t border-ceramic-text-secondary/10',
        !isCompact && 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity'
      )}>
        {/* Chat button */}
        {onChatClick && (
          <button
            onClick={handleChatClick}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                       bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
            aria-label={`Abrir chat com ${displayName}`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Chat</span>
          </button>
        )}

        {/* Favorite button */}
        {onFavoriteToggle && (
          <button
            onClick={handleFavoriteClick}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              isFavorite
                ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            )}
            aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            aria-pressed={isFavorite}
          >
            <Star className={cn('w-4 h-4', isFavorite && 'fill-current')} />
          </button>
        )}

        {/* More options */}
        {onMoreClick && (
          <button
            onClick={handleMoreClick}
            className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
            aria-label="Mais opcoes"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Compact variant: Show last message inline */}
      {isCompact && lastMessageAt && (
        <p className="text-xs text-ceramic-text-secondary mt-2 truncate">
          {formatRelativeTime(lastMessageAt, { short: true })}
        </p>
      )}
    </motion.article>
  );
}

export default WhatsAppContactCard;
