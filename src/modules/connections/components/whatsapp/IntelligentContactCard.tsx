/**
 * IntelligentContactCard
 * People Page Redesign — Progressive Intelligence Display
 *
 * Shows contact information with progressive intelligence levels:
 * L0: Avatar + name + phone (synced only)
 * L1: + message count badge + last activity (has messages)
 * L2: + 1-line dossier summary + topic pills (has dossier)
 * L3: + amber dot "action needed" indicator (has pending entities)
 * L4: + participant count + activity score (group)
 */

import React from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  MessageCircle,
  Phone,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ContactNetwork } from '@/types/memoryTypes'

export interface IntelligentContactCardProps {
  contact: ContactNetwork
  hasPendingEntities?: boolean
  onClick?: (contact: ContactNetwork) => void
  className?: string
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
}

function getAvatarColor(name: string): string {
  const colors = [
    'from-amber-400 to-amber-600',
    'from-blue-400 to-blue-600',
    'from-emerald-400 to-emerald-600',
    'from-purple-400 to-purple-600',
    'from-rose-400 to-rose-600',
    'from-teal-400 to-teal-600',
    'from-orange-400 to-orange-600',
    'from-indigo-400 to-indigo-600',
  ]
  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'agora'
  if (diffMins < 60) return `${diffMins}min`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}sem`
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export const IntelligentContactCard: React.FC<IntelligentContactCardProps> = ({
  contact,
  hasPendingEntities = false,
  onClick,
  className,
}) => {
  const isGroup = contact.relationship_type === 'group'
  const hasMessages = (contact.whatsapp_message_count || 0) > 0
  const hasDossier = !!contact.dossier_summary
  const isAiEnabled = contact.ai_processing_enabled && !hasDossier
  const lastActivity = contact.last_interaction_at || contact.whatsapp_last_message_at

  return (
    <motion.button
      onClick={() => onClick?.(contact)}
      className={cn(
        'w-full text-left px-4 py-3 flex items-start gap-3',
        'hover:bg-ceramic-cool/40 active:bg-ceramic-cool/60 transition-colors duration-150',
        className
      )}
      whileTap={{ scale: 0.99 }}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {contact.avatar_url || contact.whatsapp_profile_pic_url ? (
          <img
            src={contact.avatar_url || contact.whatsapp_profile_pic_url}
            alt={contact.name}
            className="w-11 h-11 rounded-full object-cover"
          />
        ) : (
          <div
            className={cn(
              'w-11 h-11 rounded-full flex items-center justify-center bg-gradient-to-br text-white text-sm font-semibold',
              getAvatarColor(contact.name)
            )}
          >
            {isGroup ? (
              <Users className="w-5 h-5" />
            ) : (
              getInitials(contact.name)
            )}
          </div>
        )}

        {/* L3: Pending entity indicator */}
        {hasPendingEntities && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-500 rounded-full border-2 border-ceramic-base" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ceramic-text-primary truncate">
            {contact.name}
          </span>

          {/* L4: Group participant count */}
          {isGroup && contact.participant_count && (
            <span className="text-[10px] text-ceramic-text-tertiary flex items-center gap-0.5 flex-shrink-0">
              <Users className="w-3 h-3" />
              {contact.participant_count}
            </span>
          )}
        </div>

        {/* L2: Dossier summary preview */}
        {hasDossier ? (
          <p className="text-xs text-ceramic-text-secondary truncate mt-0.5">
            {contact.dossier_summary}
          </p>
        ) : hasMessages ? (
          <p className="text-xs text-ceramic-text-tertiary truncate mt-0.5">
            {contact.last_message_preview || (
              contact.phone_number || contact.whatsapp_phone || ''
            )}
          </p>
        ) : (
          <p className="text-xs text-ceramic-text-tertiary truncate mt-0.5">
            {contact.phone_number || contact.whatsapp_phone || ''}
          </p>
        )}

        {/* L2: Topic pills (max 3) */}
        {hasDossier && contact.dossier_topics && contact.dossier_topics.length > 0 && (
          <div className="flex items-center gap-1 mt-1.5 overflow-hidden">
            {contact.dossier_topics.slice(0, 3).map((topic, i) => (
              <span
                key={i}
                className="inline-flex items-center px-1.5 py-0.5 bg-ceramic-info/8 text-ceramic-info text-[10px] rounded-full font-medium truncate max-w-[80px]"
              >
                {topic}
              </span>
            ))}
            {contact.dossier_topics.length > 3 && (
              <span className="text-[10px] text-ceramic-text-tertiary">
                +{contact.dossier_topics.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right column: metadata */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {/* Last activity time */}
        {lastActivity && (
          <span className="text-[10px] text-ceramic-text-tertiary">
            {formatRelativeTime(lastActivity)}
          </span>
        )}

        {/* L1: Message count badge */}
        {hasMessages && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-ceramic-text-tertiary">
            <MessageCircle className="w-3 h-3" />
            {contact.whatsapp_message_count}
          </span>
        )}

        {/* AI enabled but pending processing */}
        {isAiEnabled && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-500">
            <Sparkles className="w-3 h-3" />
          </span>
        )}

        {/* L4: Group activity score */}
        {isGroup && contact.group_activity_score != null && contact.group_activity_score > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600">
            <Sparkles className="w-3 h-3" />
            {contact.group_activity_score}
          </span>
        )}
      </div>
    </motion.button>
  )
}

export default IntelligentContactCard
