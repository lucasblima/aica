/**
 * IntentTimelineCard Component
 *
 * Privacy-first WhatsApp intent display for Journey timeline
 * Shows semantic intent extracted from messages (NO raw text stored)
 *
 * Issue #186 - Fase 3: Create IntentTimelineCard frontend component
 *
 * Features:
 * - Category icons and labels
 * - Sentiment color indicators
 * - Urgency badges (1-5 scale with visual weight)
 * - Action required indicator
 * - Mentioned date/time display
 * - Compact and expanded views
 * - Ceramic design system styling
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  AlertCircle,
  MessageCircleQuestion,
  MessageCircleReply,
  FileText,
  Mic,
  Smile,
  ClipboardList,
  RefreshCw,
  Image as ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WhatsAppMessageWithIntent, IntentCategory, IntentSentiment } from '../types/intent';
import {
  INTENT_CATEGORY_ICONS,
  INTENT_SENTIMENT_COLORS,
  INTENT_CATEGORY_LABELS,
} from '../types/intent';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface IntentTimelineCardProps {
  /** WhatsApp message with extracted intent */
  message: WhatsAppMessageWithIntent;
  /** Contact name for display */
  contactName?: string;
  /** Card variant */
  variant?: 'default' | 'compact';
  /** Click handler */
  onClick?: (message: WhatsAppMessageWithIntent) => void;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// ICON MAPPING
// =============================================================================

/**
 * Map icon names to Lucide React components
 */
const ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageCircleQuestion,
  MessageCircleReply,
  Calendar,
  FileText,
  Mic,
  Smile,
  ClipboardList,
  RefreshCw,
  Image: ImageIcon,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get icon component for intent category
 */
function getCategoryIcon(category: IntentCategory | null): React.ReactNode {
  if (!category) return <MessageCircleQuestion className="w-5 h-5" />;

  const iconName = INTENT_CATEGORY_ICONS[category];
  const IconComponent = ICON_COMPONENTS[iconName];

  if (!IconComponent) return <MessageCircleQuestion className="w-5 h-5" />;

  return <IconComponent className="w-5 h-5" />;
}

/**
 * Get sentiment color class (Tailwind)
 */
function getSentimentColorClass(sentiment: IntentSentiment): string {
  return INTENT_SENTIMENT_COLORS[sentiment] || 'text-gray-600';
}

/**
 * Get urgency badge color and label
 */
function getUrgencyDisplay(urgency: number): {
  color: string;
  bgColor: string;
  label: string;
  weight: 'light' | 'medium' | 'heavy';
} {
  if (urgency >= 4) {
    return {
      color: 'text-red-700',
      bgColor: 'bg-red-100',
      label: 'Urgente',
      weight: 'heavy',
    };
  }
  if (urgency === 3) {
    return {
      color: 'text-orange-700',
      bgColor: 'bg-orange-100',
      label: 'Média',
      weight: 'medium',
    };
  }
  return {
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    label: 'Baixa',
    weight: 'light',
  };
}

/**
 * Format timestamp with relative time
 */
function formatEventTime(timestamp: string): { relative: string; absolute: string } {
  const date = new Date(timestamp);

  let relative: string;
  if (isToday(date)) {
    relative = `Hoje às ${format(date, 'HH:mm')}`;
  } else if (isYesterday(date)) {
    relative = `Ontem às ${format(date, 'HH:mm')}`;
  } else {
    relative = formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
  }

  const absolute = format(date, "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR });

  return { relative, absolute };
}

/**
 * Format mentioned date/time for display
 */
function formatMentionedDateTime(date?: string, time?: string): string | null {
  if (!date && !time) return null;

  if (date && time) {
    return `${format(new Date(date), "d 'de' MMMM", { locale: ptBR })} às ${time}`;
  }
  if (date) {
    return format(new Date(date), "d 'de' MMMM", { locale: ptBR });
  }
  if (time) {
    return `às ${time}`;
  }

  return null;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function IntentTimelineCard({
  message,
  contactName,
  variant = 'default',
  onClick,
  className,
}: IntentTimelineCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isCompact = variant === 'compact';

  // Format timestamps
  const { relative: relativeTime, absolute: absoluteTime } = formatEventTime(message.createdAt);
  const mentionedDateTime = formatMentionedDateTime(
    message.intentMentionedDate,
    message.intentMentionedTime
  );

  // Urgency display
  const urgency = getUrgencyDisplay(message.intentUrgency);

  // Category label
  const categoryLabel = message.intentCategory
    ? INTENT_CATEGORY_LABELS[message.intentCategory]
    : 'Mensagem';

  // Sentiment color
  const sentimentColor = getSentimentColorClass(message.intentSentiment);

  // Direction indicator
  const isOutgoing = message.direction === 'outgoing';

  // Handle click
  const handleClick = () => {
    if (onClick) {
      onClick(message);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'ceramic-tile p-4 transition-all duration-300 cursor-pointer',
        isHovered ? 'shadow-lg scale-[1.01]' : 'shadow-md',
        className
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      aria-label={`Mensagem de ${contactName || 'contato'}: ${message.intentSummary}`}
    >
      {/* Header: Icon, Contact Name, Category, Time */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Category Icon */}
          <motion.div
            className={cn('flex-shrink-0', sentimentColor)}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 10 }}
          >
            {getCategoryIcon(message.intentCategory)}
          </motion.div>

          {/* Contact Name and Category */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-[#5C554B] truncate">
              {isOutgoing ? 'Você' : contactName || 'Contato'}
            </h4>
            <p className="text-xs text-[#948D82]">{categoryLabel}</p>
          </div>
        </div>

        {/* Time and Expand Toggle */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-[#948D82]" title={absoluteTime}>
            {relativeTime}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="text-[#948D82] hover:text-[#5C554B] transition-colors"
            aria-label={isExpanded ? 'Recolher' : 'Expandir'}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Intent Summary */}
      <div className="mb-3">
        <p className="text-sm text-[#5C554B] leading-relaxed">
          {message.intentSummary}
        </p>
      </div>

      {/* Badges: Urgency, Action Required, Topic */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Urgency Badge (only show if medium or high) */}
        {message.intentUrgency >= 3 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              'ceramic-inset-shallow px-2 py-1 rounded-full flex items-center gap-1',
              urgency.bgColor,
              urgency.color
            )}
          >
            {urgency.weight === 'heavy' && <AlertCircle className="w-3 h-3" />}
            <span className="text-xs font-medium">{urgency.label}</span>
          </motion.div>
        )}

        {/* Action Required Badge */}
        {message.intentActionRequired && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="ceramic-inset-shallow px-2 py-1 rounded-full flex items-center gap-1 bg-blue-100 text-blue-700"
          >
            <ClipboardList className="w-3 h-3" />
            <span className="text-xs font-medium">Ação Necessária</span>
          </motion.div>
        )}

        {/* Topic Badge */}
        {message.intentTopic && !isCompact && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="ceramic-inset-shallow px-2 py-1 text-xs text-[#5C554B] rounded-full"
          >
            {message.intentTopic}
          </motion.span>
        )}

        {/* Mentioned Date/Time */}
        {mentionedDateTime && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="ceramic-inset-shallow px-2 py-1 rounded-full flex items-center gap-1"
          >
            <Calendar className="w-3 h-3 text-[#C4A574]" />
            <span className="text-xs text-[#5C554B]">{mentionedDateTime}</span>
          </motion.div>
        )}
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 pt-4 border-t border-[#E0DDD5]"
          >
            <div className="space-y-3">
              {/* Message Metadata */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Direction */}
                <div>
                  <span className="text-[#948D82]">Direção:</span>{' '}
                  <span className="font-medium text-[#5C554B]">
                    {isOutgoing ? 'Enviada' : 'Recebida'}
                  </span>
                </div>

                {/* Message Type */}
                <div>
                  <span className="text-[#948D82]">Tipo:</span>{' '}
                  <span className="font-medium text-[#5C554B]">
                    {message.messageType || 'text'}
                  </span>
                </div>

                {/* Sentiment */}
                <div>
                  <span className="text-[#948D82]">Sentimento:</span>{' '}
                  <span className={cn('font-medium', sentimentColor)}>
                    {message.intentSentiment}
                  </span>
                </div>

                {/* Confidence Score */}
                {message.intentConfidence > 0 && (
                  <div>
                    <span className="text-[#948D82]">Confiança:</span>{' '}
                    <span className="font-medium text-[#5C554B]">
                      {Math.round(message.intentConfidence * 100)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Processing Status */}
              {message.processingStatus !== 'completed' && (
                <div className="ceramic-inset-shallow px-3 py-2 rounded-lg">
                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="w-3 h-3 text-[#948D82]" />
                    <span className="text-[#948D82]">
                      Status: {message.processingStatus}
                    </span>
                  </div>
                </div>
              )}

              {/* Media Type */}
              {message.intentMediaType && (
                <div className="ceramic-inset-shallow px-3 py-2 rounded-lg">
                  <div className="flex items-center gap-2 text-xs">
                    <ImageIcon className="w-3 h-3 text-[#C4A574]" />
                    <span className="text-[#5C554B]">
                      Mídia: {message.intentMediaType}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

export default IntentTimelineCard;
