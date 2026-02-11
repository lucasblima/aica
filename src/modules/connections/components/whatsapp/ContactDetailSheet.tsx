/**
 * ContactDetailSheet
 * People Page Redesign — Apple Contacts-style bottom sheet
 *
 * Slides up from bottom with 3 snap points:
 * - Peek (30vh): Header + dossier summary
 * - Half (60vh): + group analytics + first thread
 * - Full (90vh): + full conversation timeline + actions
 *
 * Reuses existing CI components: ContactDossierCard, ConversationTimeline,
 * GroupAnalyticsCard for maximum code reuse.
 */

import React, { useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import {
  X,
  MessageCircle,
  Phone,
  Users,
  Brain,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ContactNetwork } from '@/types/memoryTypes'
import { ContactDossierCard } from './ContactDossierCard'
import { ConversationTimeline } from './ConversationTimeline'
import { GroupAnalyticsCard } from './GroupAnalyticsCard'
import { useContactDossier } from '../../hooks/useContactDossier'
import { useConversationThreads } from '../../hooks/useConversationThreads'

export interface ContactDetailSheetProps {
  contact: ContactNetwork | null
  isOpen: boolean
  onClose: () => void
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
}) => {
  const sheetRef = useRef<HTMLDivElement>(null)
  const isGroup = contact?.relationship_type === 'group'

  // Hooks — these fetch data when contact changes
  const {
    dossier,
    isLoading: isDossierLoading,
    isRefreshing: isDossierRefreshing,
    hasDossier,
    refreshDossier,
  } = useContactDossier(isOpen && contact ? contact.id : null)

  const {
    threads,
    isLoading: isThreadsLoading,
    isBuilding: isThreadsBuilding,
    hasMore: hasMoreThreads,
    loadMore: loadMoreThreads,
    buildThreads,
  } = useConversationThreads(isOpen && contact ? contact.id : null)

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
    // If user drags down more than 100px, close
    if (info.offset.y > 100 && info.velocity.y > 0) {
      onClose()
    }
  }, [onClose])

  if (!contact) return null

  return (
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

          {/* Sheet */}
          <motion.div
            key="sheet"
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: '10%' }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="fixed inset-x-0 bottom-0 z-50 bg-ceramic-base rounded-t-3xl shadow-2xl overflow-hidden"
            style={{ height: '90vh', maxHeight: '90vh' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
              <div className="w-10 h-1 rounded-full bg-ceramic-border" />
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto h-full pb-24 px-5">
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
                <button
                  onClick={refreshDossier}
                  disabled={isDossierRefreshing}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-ceramic-cool text-ceramic-text-secondary hover:bg-ceramic-cool/80 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={cn('w-4 h-4', isDossierRefreshing && 'animate-spin')} />
                  {isDossierRefreshing ? 'Atualizando...' : 'Atualizar dossiê'}
                </button>
              </div>

              {/* Dossier section */}
              <ContactDossierCard
                dossier={dossier}
                isLoading={isDossierLoading}
                isRefreshing={isDossierRefreshing}
                hasDossier={hasDossier}
                onRefresh={refreshDossier}
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
                isLoading={isThreadsLoading}
                isBuilding={isThreadsBuilding}
                hasMore={hasMoreThreads}
                onLoadMore={loadMoreThreads}
                onBuildThreads={buildThreads}
                className="mb-4"
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default ContactDetailSheet
