/**
 * ConversationThreadCard
 * WhatsApp Conversation Intelligence — Phase 2
 *
 * Displays a single conversation thread with summary, topic, decisions,
 * action items, and sentiment arc.
 */

import React from 'react'
import { motion } from 'framer-motion'
import {
  MessageSquare,
  CheckCircle2,
  ListTodo,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Zap,
  Coffee,
  Handshake,
  HelpCircle,
  Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ConversationThread } from '../../hooks/useConversationThreads'

// =============================================================================
// HELPERS
// =============================================================================

const THREAD_TYPE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  general: { icon: MessageSquare, label: 'Geral', color: 'text-ceramic-text-secondary' },
  planning: { icon: Target, label: 'Planejamento', color: 'text-ceramic-info' },
  decision: { icon: Zap, label: 'Decisao', color: 'text-amber-600' },
  social: { icon: Coffee, label: 'Social', color: 'text-ceramic-success' },
  support: { icon: HelpCircle, label: 'Suporte', color: 'text-purple-500' },
  negotiation: { icon: Handshake, label: 'Negociacao', color: 'text-ceramic-warning' },
}

const SENTIMENT_ARC_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  improving: { icon: TrendingUp, label: 'Melhorando', color: 'text-ceramic-success' },
  declining: { icon: TrendingDown, label: 'Declinando', color: 'text-ceramic-error' },
  neutral: { icon: Minus, label: 'Neutro', color: 'text-ceramic-text-secondary' },
  mixed: { icon: TrendingUp, label: 'Misto', color: 'text-amber-500' },
  positive: { icon: TrendingUp, label: 'Positivo', color: 'text-ceramic-success' },
  negative: { icon: TrendingDown, label: 'Negativo', color: 'text-ceramic-error' },
}

function formatThreadTime(start: string, end: string): string {
  const startDate = new Date(start)
  const endDate = new Date(end)

  const dateStr = startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  const startTime = startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const endTime = endDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return `${dateStr}, ${startTime} — ${endTime}`
}

// =============================================================================
// COMPONENT
// =============================================================================

export interface ConversationThreadCardProps {
  thread: ConversationThread
  onClick?: (thread: ConversationThread) => void
  className?: string
}

export const ConversationThreadCard: React.FC<ConversationThreadCardProps> = ({
  thread,
  onClick,
  className,
}) => {
  const typeConfig = THREAD_TYPE_CONFIG[thread.thread_type] || THREAD_TYPE_CONFIG.general
  const sentimentConfig = SENTIMENT_ARC_CONFIG[thread.sentiment_arc] || SENTIMENT_ARC_CONFIG.neutral
  const TypeIcon = typeConfig.icon
  const SentimentIcon = sentimentConfig.icon

  return (
    <motion.article
      onClick={() => onClick?.(thread)}
      className={cn(
        'ceramic-card p-4 rounded-xl cursor-pointer hover:shadow-lg transition-all',
        className
      )}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn('p-1.5 rounded-lg bg-ceramic-inset', typeConfig.color)}>
            <TypeIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-ceramic-text-primary truncate">
              {thread.topic || 'Conversa'}
            </h4>
            <p className="text-xs text-ceramic-text-secondary flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatThreadTime(thread.thread_start, thread.thread_end)}
            </p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="px-2 py-0.5 bg-ceramic-inset rounded text-xs text-ceramic-text-secondary font-medium">
            {thread.message_count} msg
          </span>
          <span className={cn('flex items-center gap-0.5 text-xs', sentimentConfig.color)}>
            <SentimentIcon className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* Summary */}
      {thread.summary && (
        <p className="text-sm text-ceramic-text-secondary leading-relaxed mb-3">
          {thread.summary}
        </p>
      )}

      {/* Decisions */}
      {thread.decisions && thread.decisions.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-medium text-ceramic-success flex items-center gap-1 mb-1">
            <CheckCircle2 className="w-3 h-3" />
            Decisoes ({thread.decisions.length})
          </p>
          <ul className="space-y-0.5">
            {thread.decisions.slice(0, 3).map((d, i) => (
              <li key={i} className="text-xs text-ceramic-text-secondary pl-4">
                • {d}
              </li>
            ))}
            {thread.decisions.length > 3 && (
              <li className="text-xs text-ceramic-text-tertiary pl-4">
                +{thread.decisions.length - 3} mais
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Action Items */}
      {thread.action_items && thread.action_items.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-medium text-ceramic-warning flex items-center gap-1 mb-1">
            <ListTodo className="w-3 h-3" />
            Acoes pendentes ({thread.action_items.length})
          </p>
          <ul className="space-y-0.5">
            {thread.action_items.slice(0, 3).map((a, i) => (
              <li key={i} className="text-xs text-ceramic-text-secondary pl-4">
                • {a}
              </li>
            ))}
            {thread.action_items.length > 3 && (
              <li className="text-xs text-ceramic-text-tertiary pl-4">
                +{thread.action_items.length - 3} mais
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Participants (for groups) */}
      {thread.is_group && thread.participants && thread.participants.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-ceramic-text-secondary pt-2 border-t border-ceramic-border">
          <Users className="w-3 h-3" />
          <span>{thread.participants.slice(0, 3).join(', ')}</span>
          {thread.participants.length > 3 && (
            <span className="text-ceramic-text-tertiary">+{thread.participants.length - 3}</span>
          )}
        </div>
      )}
    </motion.article>
  )
}

export default ConversationThreadCard
