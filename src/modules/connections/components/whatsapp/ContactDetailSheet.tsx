/**
 * ContactDetailSheet
 * People Page Redesign — Apple Contacts-style bottom sheet
 *
 * Tri-state intelligence display:
 * - Pristine: webhook stats + CTA "Processar conversas?" (zero AI tokens)
 * - Processing: stepper progress (dossier → threads → entities)
 * - Completed: dossier + threads + group analytics (data already processed)
 *
 * Reuses existing CI components: ContactDossierCard, ConversationTimeline,
 * GroupAnalyticsCard for maximum code reuse.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import {
  X,
  MessageCircle,
  Users,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ConfirmationModal } from '@/components/ui'
import { deleteContact } from '@/services/contactNetworkService'
import type { ContactNetwork } from '@/types/memoryTypes'
import { ContactDossierCard } from './ContactDossierCard'
import { ConversationTimeline } from './ConversationTimeline'
import { GroupAnalyticsCard } from './GroupAnalyticsCard'
import { ProcessingCTA } from './ProcessingCTA'
import { IntentTimeline } from './IntentTimeline'
import { useContactIntelligence } from '../../hooks/useContactIntelligence'
import { useIntentTimeline } from '../../hooks/useIntentTimeline'

export interface ContactDetailSheetProps {
  contact: ContactNetwork | null
  isOpen: boolean
  onClose: () => void
  onDelete?: (contactId: string) => void
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

export const ContactDetailSheet: React.FC<ContactDetailSheetProps> = ({
  contact,
  isOpen,
  onClose,
  onDelete,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null)
  const isGroup = contact?.relationship_type === 'group'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Tri-state intelligence hook — replaces auto-fetching useContactDossier + useConversationThreads
  const {
    state,
    currentDepth,
    progress,
    dossier,
    threads,
    error,
    activate,
    refreshAll,
  } = useContactIntelligence(contact, isOpen)

  // Intent timeline — only fetch when completed (privacy-first: only intent fields)
  const {
    intents,
    totalCount: intentCount,
    isLoading: isIntentsLoading,
    hasMore: hasMoreIntents,
    loadMore: loadMoreIntents,
  } = useIntentTimeline(contact?.id || null, state === 'completed')

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  const handleOpenWhatsApp = useCallback(() => {
    if (!contact) return
    const phone = contact.whatsapp_phone || contact.phone_number
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '')
      window.open(`https://wa.me/${cleanPhone}`, '_blank')
    }
  }, [contact])

  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    if (info.offset.y > 100 && info.velocity.y > 0) {
      onClose()
    }
  }, [onClose])

  const handleDelete = useCallback(async () => {
    if (!contact) return
    setIsDeleting(true)
    try {
      await deleteContact(contact.id)
      setShowDeleteConfirm(false)
      onClose()
      onDelete?.(contact.id)
    } catch {
      // Error already logged by service
    } finally {
      setIsDeleting(false)
    }
  }, [contact, onClose, onDelete])

  if (!contact) return null

  const messageCount = contact.whatsapp_message_count || 0
  const hasDossier = !!dossier?.dossier_summary
  const isRefreshing = state === 'processing' && !!dossier

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onClose}
          />

          {/* Sheet - Desktop: slide from right, Mobile: slide from bottom */}
          <motion.div
            key="sheet"
            ref={sheetRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[600px] bg-ceramic-base shadow-2xl flex flex-col overflow-hidden sm:rounded-l-2xl"
          >
            {/* Mobile drag handle */}
            <div className="sm:hidden flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
              <div className="w-10 h-1 rounded-full bg-ceramic-text-secondary/30" />
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 pb-6">
              {/* Header */}
              <div className="flex items-start gap-4 mb-6">
                {/* Avatar */}
                {contact.avatar_url || contact.whatsapp_profile_pic_url ? (
                  <img
                    src={contact.avatar_url || contact.whatsapp_profile_pic_url}
                    alt={contact.name}
                    className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className={cn(
                      'w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br text-white text-xl font-semibold flex-shrink-0',
                      getAvatarColor(contact.name)
                    )}
                  >
                    {isGroup ? (
                      <Users className="w-7 h-7" />
                    ) : (
                      getInitials(contact.name)
                    )}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-ceramic-text-primary truncate">
                    {contact.name}
                  </h2>
                  {(contact.phone_number || contact.whatsapp_phone) && (
                    <p className="text-sm text-ceramic-text-secondary mt-0.5">
                      {contact.phone_number || contact.whatsapp_phone}
                    </p>
                  )}
                  {isGroup && contact.participant_count && (
                    <p className="text-xs text-ceramic-text-tertiary mt-1 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {contact.participant_count} participantes
                    </p>
                  )}
                </div>

                {/* Close button */}
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-ceramic-cool/60 transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5 text-ceramic-text-secondary" />
                </button>
              </div>

              {/* Quick actions */}
              <div className="flex items-center gap-2 mb-6">
                {(contact.whatsapp_phone || contact.phone_number) && (
                  <button
                    onClick={handleOpenWhatsApp}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-ceramic-success/10 text-ceramic-success hover:bg-ceramic-success/20 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Abrir WhatsApp
                  </button>
                )}
                {state === 'completed' && (
                  <button
                    onClick={refreshAll}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-ceramic-cool text-ceramic-text-secondary hover:bg-ceramic-cool/80 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
                    {isRefreshing ? 'Atualizando...' : 'Atualizar dossiê'}
                  </button>
                )}
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-ceramic-error/10 text-ceramic-error hover:bg-ceramic-error/20 transition-colors ml-auto"
                >
                  <Trash2 className="w-4 h-4" />
                  Remover
                </button>
              </div>

              {/* ===== TRI-STATE CONTENT ===== */}

              {/* CTA: pristine (all options), processing (stepper), completed (upgrade) */}
              <ProcessingCTA
                messageCount={messageCount}
                state={state}
                currentDepth={currentDepth}
                progress={progress}
                error={error}
                onActivate={activate}
                className="mb-4"
              />

              {/* Webhook stats (always visible in pristine/processing) */}
              {state !== 'completed' && messageCount > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl bg-ceramic-cool/40 p-3 text-center">
                    <p className="text-lg font-bold text-ceramic-text-primary">
                      {messageCount.toLocaleString('pt-BR')}
                    </p>
                    <p className="text-[10px] text-ceramic-text-tertiary">Mensagens</p>
                  </div>
                  <div className="rounded-xl bg-ceramic-cool/40 p-3 text-center">
                    <p className="text-lg font-bold text-ceramic-text-primary">
                      {contact.interaction_count || 0}
                    </p>
                    <p className="text-[10px] text-ceramic-text-tertiary">Interações</p>
                  </div>
                  <div className="rounded-xl bg-ceramic-cool/40 p-3 text-center">
                    <p className="text-lg font-bold text-ceramic-text-primary">
                      {contact.health_score ?? '—'}
                    </p>
                    <p className="text-[10px] text-ceramic-text-tertiary">Saúde</p>
                  </div>
                </div>
              )}

              {/* Completed: Show full intelligence */}
              {state === 'completed' && (
                <>
                  {/* Dossier section */}
                  <ContactDossierCard
                    dossier={dossier}
                    isLoading={false}
                    isRefreshing={isRefreshing}
                    hasDossier={hasDossier}
                    onRefresh={refreshAll}
                    error={error}
                    className="mb-4"
                  />

                  {/* Group analytics (only for groups) */}
                  {isGroup && (
                    <GroupAnalyticsCard
                      groupContactId={contact.id}
                      className="mb-4"
                    />
                  )}

                  {/* Conversation timeline */}
                  <ConversationTimeline
                    threads={threads}
                    isLoading={false}
                    isBuilding={false}
                    hasMore={false}
                    onLoadMore={async () => {}}
                    onBuildThreads={async () => {}}
                    className="mb-4"
                  />

                  {/* Intent timeline (AI conversation view) */}
                  <IntentTimeline
                    intents={intents}
                    totalCount={intentCount}
                    isLoading={isIntentsLoading}
                    hasMore={hasMoreIntents}
                    onLoadMore={loadMoreIntents}
                    className="mb-4"
                  />
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

    <ConfirmationModal
      isOpen={showDeleteConfirm}
      variant="danger"
      title="Remover contato"
      message={`Tem certeza que deseja remover "${contact?.name}"? Todas as mensagens, threads e dados associados serão removidos permanentemente.`}
      confirmText="Remover"
      isLoading={isDeleting}
      onConfirm={handleDelete}
      onCancel={() => setShowDeleteConfirm(false)}
    />
    </>
  )
}

export default ContactDetailSheet
