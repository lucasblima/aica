/**
 * ContactsView Page — "Pessoas"
 * Unified People hub with progressive WhatsApp intelligence.
 *
 * Design: Start minimal, intelligence surfaces as the system learns.
 * Like annotations appearing on notebook margins.
 *
 * Features:
 * - Search + filter (Todos | Pessoas | Grupos | Com pendencias)
 * - Entity inbox banner (pending suggestions from conversations)
 * - Intelligent contact cards with progressive L0-L4 levels
 * - Contact detail bottom sheet (dossier, timeline, group analytics)
 *
 * Updated: Removed Evolution API dependency — contacts come from WhatsApp export import.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, MessageCircle, X, Inbox, Sparkles, Upload } from 'lucide-react'
import { UnifiedHeader } from '@/components/layout/UnifiedHeader'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../services/supabaseClient'
import { createNamespacedLogger } from '@/lib/logger'
import type { ContactNetwork } from '../types/memoryTypes'

import { IntelligentContactCard } from '@/modules/connections/components/whatsapp/IntelligentContactCard'
import { ContactDetailSheet } from '@/modules/connections/components/whatsapp/ContactDetailSheet'
import { EntityInbox } from '@/modules/connections/components/whatsapp/EntityInbox'
import { useExtractedEntities } from '@/modules/connections/hooks/useExtractedEntities'

const log = createNamespacedLogger('ContactsView')

// Filter types
type FilterType = 'all' | 'people' | 'groups' | 'pending'

const FILTER_OPTIONS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'people', label: 'Pessoas' },
  { key: 'groups', label: 'Grupos' },
  { key: 'pending', label: 'Com pendencias' },
]

export function ContactsView() {
  const { user } = useAuth()
  const [contacts, setContacts] = useState<ContactNetwork[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Search and filter
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  // Contact detail sheet
  const [selectedContact, setSelectedContact] = useState<ContactNetwork | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Entity inbox
  const [isEntityInboxExpanded, setIsEntityInboxExpanded] = useState(false)

  // Entity inbox hook
  const {
    entities: pendingEntities,
    stats: entityStats,
    isLoading: isEntitiesLoading,
    isExtracting,
    acceptEntity,
    rejectEntity,
    extractEntities,
  } = useExtractedEntities()

  // Build set of contact IDs with pending entities
  const contactsWithPendingEntities = useMemo(() => {
    const ids = new Set<string>()
    for (const e of pendingEntities) {
      if (e.contact_name) {
        const match = contacts.find(c => c.name === e.contact_name)
        if (match) ids.add(match.id)
      }
    }
    return ids
  }, [pendingEntities, contacts])

  // Filtered and searched contacts
  const filteredContacts = useMemo(() => {
    let result = contacts

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.phone_number || '').includes(q) ||
        (c.whatsapp_phone || '').includes(q)
      )
    }

    switch (activeFilter) {
      case 'people':
        result = result.filter(c => c.relationship_type !== 'group')
        break
      case 'groups':
        result = result.filter(c => c.relationship_type === 'group')
        break
      case 'pending':
        result = result.filter(c => contactsWithPendingEntities.has(c.id))
        break
    }

    return result
  }, [contacts, searchQuery, activeFilter, contactsWithPendingEntities])

  // Load contacts from database
  useEffect(() => {
    if (user?.id) {
      loadContacts()
    }
  }, [user?.id])

  const loadContacts = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('contact_network')
        .select('*')
        .eq('user_id', user?.id)
        .order('last_interaction_at', { ascending: false, nullsFirst: false })

      if (fetchError) throw fetchError
      setContacts(data || [])
    } catch (err) {
      log.error('Error loading contacts:', err)
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleContactClick = useCallback((contact: ContactNetwork) => {
    setSelectedContact(contact)
    setIsDetailOpen(true)
  }, [])

  const hasContacts = contacts.length > 0

  return (
    <div className="min-h-screen bg-ceramic-base">
      <UnifiedHeader title="Pessoas" breadcrumbs={[]} />

      <main className="px-4 pt-3 pb-6 space-y-3 max-w-3xl mx-auto">
        {/* Entity Inbox Banner */}
        {pendingEntities.length > 0 && !isEntitiesLoading && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {!isEntityInboxExpanded ? (
              <button
                onClick={() => setIsEntityInboxExpanded(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors hover:bg-amber-50/80"
                style={{
                  background: 'rgba(245, 158, 11, 0.06)',
                  border: '1px solid rgba(245, 158, 11, 0.12)',
                }}
              >
                <div className="p-1.5 bg-amber-100 rounded-lg">
                  <Inbox className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ceramic-text-primary">
                    {pendingEntities.length} sugestao{pendingEntities.length !== 1 ? 'es' : ''} do WhatsApp
                  </p>
                  <p className="text-xs text-ceramic-text-secondary truncate">
                    Tarefas, eventos e valores detectados nas conversas
                  </p>
                </div>
                <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
              </button>
            ) : (
              <div className="rounded-xl overflow-hidden"
                style={{
                  background: 'rgba(255, 255, 255, 0.6)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(245, 158, 11, 0.12)',
                }}
              >
                <div className="flex items-center justify-between px-4 pt-3">
                  <span className="text-xs font-medium text-ceramic-text-secondary">Sugestoes do WhatsApp</span>
                  <button
                    onClick={() => setIsEntityInboxExpanded(false)}
                    className="p-1 rounded-full hover:bg-ceramic-cool/60 transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-ceramic-text-tertiary" />
                  </button>
                </div>
                <EntityInbox
                  entities={pendingEntities}
                  stats={entityStats}
                  isLoading={isEntitiesLoading}
                  isExtracting={isExtracting}
                  onAccept={acceptEntity}
                  onReject={rejectEntity}
                  onExtract={extractEntities}
                  className="border-none shadow-none"
                />
              </div>
            )}
          </motion.div>
        )}

        {/* Search Bar */}
        {hasContacts && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ceramic-text-tertiary pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar contatos..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-ceramic-cool/40 text-ceramic-text-primary placeholder-ceramic-text-tertiary outline-none focus:bg-ceramic-cool/60 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-ceramic-border/40 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-ceramic-text-tertiary" />
              </button>
            )}
          </div>
        )}

        {/* Filter Chips */}
        {hasContacts && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {FILTER_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setActiveFilter(opt.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  activeFilter === opt.key
                    ? 'bg-ceramic-text-primary text-ceramic-base'
                    : 'bg-ceramic-cool/40 text-ceramic-text-secondary hover:bg-ceramic-cool/60'
                }`}
              >
                {opt.label}
                {opt.key === 'pending' && pendingEntities.length > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold">
                    {pendingEntities.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 py-3 rounded-xl"
            style={{
              background: 'rgba(155, 77, 58, 0.06)',
              border: '1px solid rgba(155, 77, 58, 0.1)',
            }}
          >
            <p className="text-sm text-ceramic-negative font-medium">{error}</p>
          </motion.div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <motion.div
              className="w-8 h-8 rounded-full"
              style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
              animate={{
                scale: [1, 1.08, 1],
                boxShadow: [
                  '0 0 0 0 rgba(245, 158, 11, 0.3)',
                  '0 0 0 10px rgba(245, 158, 11, 0)',
                  '0 0 0 0 rgba(245, 158, 11, 0.3)',
                ],
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <p className="mt-6 text-sm text-ceramic-text-secondary">Carregando contatos...</p>
          </div>
        )}

        {/* Contact List */}
        {!isLoading && (
          <div
            className="rounded-2xl overflow-hidden divide-y divide-ceramic-border/40"
            style={{
              background: 'rgba(255, 255, 255, 0.5)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 4px 24px rgba(163, 158, 145, 0.06)',
            }}
          >
            {filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-5"
                  style={{ backgroundColor: 'rgba(148, 141, 130, 0.06)' }}
                >
                  {hasContacts ? (
                    <MessageCircle className="w-6 h-6 text-ceramic-text-secondary/40" />
                  ) : (
                    <Upload className="w-6 h-6 text-ceramic-text-secondary/40" />
                  )}
                </div>
                <h3 className="text-base font-semibold text-ceramic-text-primary mb-1.5">
                  {searchQuery
                    ? 'Nenhum resultado'
                    : !hasContacts
                      ? 'Nenhum contato ainda'
                      : 'Nenhum contato nesta categoria'
                  }
                </h3>
                <p className="text-sm text-ceramic-text-secondary max-w-xs">
                  {searchQuery
                    ? `Nenhum contato encontrado para "${searchQuery}"`
                    : !hasContacts
                      ? 'Importe conversas do WhatsApp em Conexoes > Importar para ver seus contatos aqui.'
                      : activeFilter === 'pending'
                        ? 'Nenhum contato com pendencias no momento.'
                        : 'Tente ajustar os filtros.'
                  }
                </p>
              </div>
            ) : (
              filteredContacts.map(contact => (
                <IntelligentContactCard
                  key={contact.id}
                  contact={contact}
                  hasPendingEntities={contactsWithPendingEntities.has(contact.id)}
                  onClick={handleContactClick}
                />
              ))
            )}
          </div>
        )}
      </main>

      {/* Contact Detail Bottom Sheet */}
      <ContactDetailSheet
        contact={selectedContact}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </div>
  )
}

export default ContactsView
