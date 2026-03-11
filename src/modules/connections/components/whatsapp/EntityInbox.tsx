/**
 * EntityInbox
 * WhatsApp Conversation Intelligence — Phase 3
 *
 * Displays pending entity suggestions extracted from conversations.
 * Users can accept (route to module) or reject each suggestion.
 */

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Inbox,
  Check,
  X,
  ListTodo,
  Calendar,
  DollarSign,
  User,
  FolderKanban,
  Clock,
  Bell,
  Loader2,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ExtractedEntity, EntityStats } from '../../hooks/useExtractedEntities'

// =============================================================================
// HELPERS
// =============================================================================

const ENTITY_TYPE_CONFIG: Record<string, {
  icon: React.ComponentType<{ className?: string }>
  label: string
  color: string
  bgColor: string
}> = {
  task: { icon: ListTodo, label: 'Tarefa', color: 'text-ceramic-info', bgColor: 'bg-ceramic-info/10' },
  event: { icon: Calendar, label: 'Evento', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  monetary: { icon: DollarSign, label: 'Financeiro', color: 'text-ceramic-success', bgColor: 'bg-ceramic-success-bg' },
  person: { icon: User, label: 'Pessoa', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  project: { icon: FolderKanban, label: 'Projeto', color: 'text-ceramic-info', bgColor: 'bg-ceramic-info/10' },
  deadline: { icon: Clock, label: 'Prazo', color: 'text-ceramic-error', bgColor: 'bg-ceramic-error/10' },
  reminder: { icon: Bell, label: 'Lembrete', color: 'text-ceramic-warning', bgColor: 'bg-ceramic-warning/10' },
}

const MODULE_LABELS: Record<string, string> = {
  atlas: 'Atlas (Tarefas)',
  agenda: 'Agenda',
  finance: 'Finance',
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface EntityCardProps {
  entity: ExtractedEntity
  onAccept: (id: string) => void
  onReject: (id: string) => void
}

const EntityCard: React.FC<EntityCardProps> = ({ entity, onAccept, onReject }) => {
  const config = ENTITY_TYPE_CONFIG[entity.entity_type] || ENTITY_TYPE_CONFIG.task
  const TypeIcon = config.icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="ceramic-card p-4 rounded-xl"
    >
      <div className="flex items-start gap-3">
        {/* Type icon */}
        <div className={cn('p-2 rounded-lg', config.bgColor)}>
          <TypeIcon className={cn('w-4 h-4', config.color)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ceramic-text-primary">
                {entity.entity_summary}
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs text-ceramic-text-secondary">
                <span className={cn('px-1.5 py-0.5 rounded font-medium', config.bgColor, config.color)}>
                  {config.label}
                </span>
                {entity.routed_to_module && (
                  <>
                    <ArrowRight className="w-3 h-3" />
                    <span>{MODULE_LABELS[entity.routed_to_module] || entity.routed_to_module}</span>
                  </>
                )}
                {entity.confidence >= 0.8 && (
                  <span className="text-ceramic-success font-medium">
                    Alta confianca
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Source context */}
          {(entity.contact_name || entity.source_context) && (
            <p className="text-xs text-ceramic-text-tertiary mt-1">
              {entity.contact_name && `De: ${entity.contact_name}`}
              {entity.contact_name && entity.source_context && ' • '}
              {entity.source_context}
            </p>
          )}

          {/* Entity details preview */}
          {entity.entity_details && Object.keys(entity.entity_details).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Object.entries(entity.entity_details).slice(0, 3).map(([key, value]) => (
                value && (
                  <span key={key} className="px-2 py-0.5 bg-ceramic-inset rounded text-xs text-ceramic-text-secondary">
                    {key}: {String(value).substring(0, 30)}
                  </span>
                )
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onAccept(entity.entity_id)}
            className="p-2 rounded-lg bg-ceramic-success/10 text-ceramic-success hover:bg-ceramic-success/20 transition-colors"
            title="Aceitar e rotear"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={() => onReject(entity.entity_id)}
            className="p-2 rounded-lg bg-ceramic-error/10 text-ceramic-error hover:bg-ceramic-error/20 transition-colors"
            title="Rejeitar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export interface EntityInboxProps {
  entities: ExtractedEntity[]
  stats: EntityStats | null
  isLoading: boolean
  isExtracting: boolean
  onAccept: (entityId: string) => void
  onReject: (entityId: string) => void
  onExtract: () => void
  className?: string
}

export const EntityInbox: React.FC<EntityInboxProps> = ({
  entities,
  stats,
  isLoading,
  isExtracting,
  onAccept,
  onReject,
  onExtract,
  className,
}) => {
  // Loading
  if (isLoading) {
    return (
      <div className={cn('ceramic-card p-6 rounded-2xl', className)}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-50 rounded-lg">
            <Inbox className="w-5 h-5 text-amber-600" />
          </div>
          <h3 className="text-base font-semibold text-ceramic-text-primary">
            Caixa de Entidades
          </h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-ceramic-accent" />
        </div>
      </div>
    )
  }

  return (
    <div className={cn('ceramic-card p-6 rounded-2xl', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-50 rounded-lg">
            <Inbox className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-ceramic-text-primary">
              Caixa de Entidades
            </h3>
            <p className="text-xs text-ceramic-text-secondary">
              {entities.length} sugestoes pendentes
              {stats && ` • ${stats.accepted_count || 0} aceitas`}
            </p>
          </div>
        </div>

        <button
          onClick={onExtract}
          disabled={isExtracting}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors disabled:opacity-50"
        >
          {isExtracting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {isExtracting ? 'Extraindo...' : 'Extrair'}
        </button>
      </div>

      {/* Entity list */}
      {entities.length === 0 ? (
        <div className="text-center py-8">
          <Inbox className="w-10 h-10 text-ceramic-text-secondary/30 mx-auto mb-3" />
          <p className="text-sm text-ceramic-text-secondary">
            Nenhuma sugestao pendente. Clique em "Extrair" para analisar conversas recentes.
          </p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {entities.map(entity => (
              <EntityCard
                key={entity.entity_id}
                entity={entity}
                onAccept={onAccept}
                onReject={onReject}
              />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  )
}

export default EntityInbox
