/**
 * ConversationTimeline
 * WhatsApp Conversation Intelligence — Phase 2
 *
 * Displays a vertical timeline of conversation threads for a contact.
 * Supports loading more threads and on-demand thread building.
 */

import React from 'react'
import { motion } from 'framer-motion'
import {
  GitBranch,
  RefreshCw,
  Loader2,
  MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ConversationThreadCard } from './ConversationThreadCard'
import type { ConversationThread } from '../../hooks/useConversationThreads'

// =============================================================================
// TYPES
// =============================================================================

export interface ConversationTimelineProps {
  threads: ConversationThread[]
  isLoading: boolean
  isBuilding: boolean
  hasMore: boolean
  onLoadMore: () => void
  onBuildThreads: () => void
  onThreadClick?: (thread: ConversationThread) => void
  className?: string
}

// =============================================================================
// COMPONENT
// =============================================================================

export const ConversationTimeline: React.FC<ConversationTimelineProps> = ({
  threads,
  isLoading,
  isBuilding,
  hasMore,
  onLoadMore,
  onBuildThreads,
  onThreadClick,
  className,
}) => {
  // Loading state
  if (isLoading && threads.length === 0) {
    return (
      <div className={cn('ceramic-card p-6 rounded-2xl', className)}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-ceramic-info/10 rounded-lg">
            <GitBranch className="w-5 h-5 text-ceramic-info" />
          </div>
          <h3 className="text-base font-semibold text-ceramic-text-primary">
            Threads de Conversa
          </h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-ceramic-accent" />
        </div>
      </div>
    )
  }

  // Empty state
  if (!isLoading && threads.length === 0) {
    return (
      <div className={cn('ceramic-card p-6 rounded-2xl', className)}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-ceramic-info/10 rounded-lg">
              <GitBranch className="w-5 h-5 text-ceramic-info" />
            </div>
            <h3 className="text-base font-semibold text-ceramic-text-primary">
              Threads de Conversa
            </h3>
          </div>
        </div>

        <div className="text-center py-8">
          <MessageSquare className="w-10 h-10 text-ceramic-text-secondary/30 mx-auto mb-3" />
          <p className="text-sm text-ceramic-text-secondary mb-3">
            Nenhuma thread de conversa encontrada. Clique para agrupar mensagens em sessões.
          </p>
          <button
            onClick={onBuildThreads}
            disabled={isBuilding}
            className="inline-flex items-center gap-2 px-4 py-2 bg-ceramic-info/10 text-ceramic-info rounded-lg text-sm font-medium hover:bg-ceramic-info/20 transition-colors disabled:opacity-50"
          >
            {isBuilding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <GitBranch className="w-4 h-4" />
            )}
            {isBuilding ? 'Construindo...' : 'Construir threads'}
          </button>
        </div>
      </div>
    )
  }

  // Timeline with threads
  return (
    <div className={cn('ceramic-card p-6 rounded-2xl', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-ceramic-info/10 rounded-lg">
            <GitBranch className="w-5 h-5 text-ceramic-info" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-ceramic-text-primary">
              Threads de Conversa
            </h3>
            <p className="text-xs text-ceramic-text-secondary">
              {threads.length} sessões agrupadas
            </p>
          </div>
        </div>

        <button
          onClick={onBuildThreads}
          disabled={isBuilding}
          className="p-2 rounded-lg hover:bg-ceramic-cool transition-colors disabled:opacity-50"
          title="Reconstruir threads"
        >
          {isBuilding ? (
            <Loader2 className="w-4 h-4 animate-spin text-ceramic-info" />
          ) : (
            <RefreshCw className="w-4 h-4 text-ceramic-text-secondary" />
          )}
        </button>
      </div>

      {/* Thread list */}
      <div className="space-y-3 relative">
        {/* Timeline line */}
        <div className="absolute left-[19px] top-0 bottom-0 w-px bg-ceramic-border" />

        {threads.map((thread, index) => (
          <motion.div
            key={thread.thread_id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="relative pl-10"
          >
            {/* Timeline dot */}
            <div className="absolute left-3 top-4 w-3 h-3 rounded-full bg-ceramic-info border-2 border-ceramic-base z-10" />

            <ConversationThreadCard
              thread={thread}
              onClick={onThreadClick}
            />
          </motion.div>
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-ceramic-accent hover:underline disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            Carregar mais threads
          </button>
        </div>
      )}
    </div>
  )
}

export default ConversationTimeline
