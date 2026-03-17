/**
 * ContactDossierCard
 * WhatsApp Conversation Intelligence — Phase 1
 *
 * Displays a contact's living dossier: AI-generated summary, topic tags,
 * pending items, and structured context. Privacy-first — built from
 * intent summaries only, never raw messages.
 */

import React from 'react'
import { motion } from 'framer-motion'
import {
  Brain,
  RefreshCw,
  Tag,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Users,
  MessageCircle,
  Heart,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ContactDossier, DossierContext } from '../../hooks/useContactDossier'

// =============================================================================
// TYPES
// =============================================================================

export interface ContactDossierCardProps {
  dossier: ContactDossier | null
  isLoading: boolean
  isRefreshing: boolean
  hasDossier: boolean
  onRefresh: () => void
  error?: string | null
  className?: string
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

const TopicTag: React.FC<{ topic: string }> = ({ topic }) => (
  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-ceramic-info/10 text-ceramic-info text-xs rounded-full font-medium">
    <Tag className="w-3 h-3" />
    {topic}
  </span>
)

const PendingItem: React.FC<{ item: string }> = ({ item }) => (
  <li className="flex items-start gap-2 text-sm text-ceramic-text-secondary">
    <AlertCircle className="w-4 h-4 text-ceramic-warning flex-shrink-0 mt-0.5" />
    <span>{item}</span>
  </li>
)

interface ContextSectionProps {
  context: DossierContext
}

const ContextSection: React.FC<ContextSectionProps> = ({ context }) => {
  const [expanded, setExpanded] = React.useState(false)

  const hasContent = context.relationship_nature ||
    context.communication_style ||
    context.key_dates.length > 0 ||
    context.notable_patterns.length > 0

  if (!hasContent) return null

  return (
    <div className="border-t border-ceramic-border pt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-sm font-medium text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
      >
        <span className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Contexto detalhado
        </span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="mt-3 space-y-3"
        >
          {context.relationship_nature && (
            <div>
              <p className="text-xs font-medium text-ceramic-text-secondary mb-1">Natureza do relacionamento</p>
              <p className="text-sm text-ceramic-text-primary">{context.relationship_nature}</p>
            </div>
          )}

          {context.communication_style && (
            <div>
              <p className="text-xs font-medium text-ceramic-text-secondary mb-1">Estilo de comunicacao</p>
              <p className="text-sm text-ceramic-text-primary">{context.communication_style}</p>
            </div>
          )}

          {context.key_dates.length > 0 && (
            <div>
              <p className="text-xs font-medium text-ceramic-text-secondary mb-1">Datas importantes</p>
              <div className="flex flex-wrap gap-1.5">
                {context.key_dates.map((date, i) => (
                  <span key={i} className="px-2 py-0.5 bg-ceramic-inset rounded text-xs text-ceramic-text-secondary">
                    {date}
                  </span>
                ))}
              </div>
            </div>
          )}

          {context.notable_patterns.length > 0 && (
            <div>
              <p className="text-xs font-medium text-ceramic-text-secondary mb-1">Padrões notaveis</p>
              <ul className="space-y-1">
                {context.notable_patterns.map((pattern, i) => (
                  <li key={i} className="text-xs text-ceramic-text-secondary flex items-start gap-1.5">
                    <span className="text-ceramic-accent mt-0.5">•</span>
                    {pattern}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ContactDossierCard: React.FC<ContactDossierCardProps> = ({
  dossier,
  isLoading,
  isRefreshing,
  hasDossier,
  onRefresh,
  error,
  className,
}) => {
  // Loading state
  if (isLoading) {
    return (
      <div className={cn('ceramic-card p-6 rounded-2xl animate-pulse', className)}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-ceramic-inset rounded-lg" />
          <div className="h-5 bg-ceramic-inset rounded w-32" />
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-ceramic-inset rounded w-full" />
          <div className="h-4 bg-ceramic-inset rounded w-3/4" />
        </div>
      </div>
    )
  }

  // Empty state — no dossier yet
  if (!hasDossier) {
    return (
      <div className={cn('ceramic-card p-6 rounded-2xl', className)}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-ceramic-info/10 rounded-lg">
              <Brain className="w-5 h-5 text-ceramic-info" />
            </div>
            <h3 className="text-base font-semibold text-ceramic-text-primary">
              Dossie do Contato
            </h3>
          </div>
        </div>

        <div className="text-center py-6">
          <Brain className="w-10 h-10 text-ceramic-text-secondary/30 mx-auto mb-3" />
          <p className="text-sm text-ceramic-text-secondary mb-3">
            Nenhum dossiê gerado ainda. São necessárias pelo menos 3 mensagens com intenção extraída.
          </p>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-ceramic-info/10 text-ceramic-info rounded-lg text-sm font-medium hover:bg-ceramic-info/20 transition-colors disabled:opacity-50"
          >
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {isRefreshing ? 'Gerando...' : 'Gerar dossiê'}
          </button>
          {error && (
            <p className="mt-3 text-xs text-ceramic-error flex items-center justify-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </p>
          )}
        </div>
      </div>
    )
  }

  // Full dossier display
  return (
    <div className={cn('ceramic-card p-6 rounded-2xl space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-ceramic-info/10 rounded-lg">
            <Brain className="w-5 h-5 text-ceramic-info" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-ceramic-text-primary">
              Dossie do Contato
            </h3>
            {dossier?.dossier_updated_at && (
              <p className="text-xs text-ceramic-text-secondary flex items-center gap-1">
                <Clock className="w-3 h-3" />
                v{dossier.dossier_version} • Atualizado {new Date(dossier.dossier_updated_at).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-lg hover:bg-ceramic-cool transition-colors disabled:opacity-50"
          title="Atualizar dossie"
        >
          {isRefreshing ? (
            <Loader2 className="w-4 h-4 animate-spin text-ceramic-info" />
          ) : (
            <RefreshCw className="w-4 h-4 text-ceramic-text-secondary" />
          )}
        </button>
      </div>

      {/* Error feedback */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-ceramic-error/10 text-ceramic-error text-sm rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary */}
      {dossier?.dossier_summary && (
        <div className="ceramic-inset p-4 rounded-xl">
          <p className="text-sm text-ceramic-text-primary leading-relaxed">
            {dossier.dossier_summary}
          </p>
        </div>
      )}

      {/* Quick Stats */}
      <div className="flex items-center gap-4 text-xs text-ceramic-text-secondary">
        {dossier?.interaction_count != null && dossier.interaction_count > 0 && (
          <span className="flex items-center gap-1">
            <MessageCircle className="w-3.5 h-3.5" />
            {dossier.interaction_count} interacoes
          </span>
        )}
        {dossier?.health_score != null && (
          <span className="flex items-center gap-1">
            <Heart className="w-3.5 h-3.5" />
            Saúde: {dossier.health_score}/100
          </span>
        )}
        {dossier?.relationship_type === 'group' && (
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            Grupo
          </span>
        )}
      </div>

      {/* Topics */}
      {dossier?.dossier_topics && dossier.dossier_topics.length > 0 && (
        <div>
          <p className="text-xs font-medium text-ceramic-text-secondary mb-2">Topicos</p>
          <div className="flex flex-wrap gap-1.5">
            {dossier.dossier_topics.map((topic, i) => (
              <TopicTag key={i} topic={topic} />
            ))}
          </div>
        </div>
      )}

      {/* Pending Items */}
      {dossier?.dossier_pending_items && dossier.dossier_pending_items.length > 0 && (
        <div>
          <p className="text-xs font-medium text-ceramic-text-secondary mb-2">Itens pendentes</p>
          <ul className="space-y-2">
            {dossier.dossier_pending_items.map((item, i) => (
              <PendingItem key={i} item={item} />
            ))}
          </ul>
        </div>
      )}

      {/* Context (expandable) */}
      {dossier?.dossier_context && (
        <ContextSection context={dossier.dossier_context as DossierContext} />
      )}
    </div>
  )
}

export default ContactDossierCard
