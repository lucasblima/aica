/**
 * ContactsView Page
 * Dedicated page for viewing and managing contacts with WhatsApp sync
 *
 * Shows WhatsApp pairing flow if user hasn't connected their WhatsApp yet.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Users, Users2, Search, MessageCircle, Loader2, User, Briefcase, Heart, Home, GraduationCap, Package } from 'lucide-react';
import { HeaderGlobal, ContactCard, ContactDetailModal, CreditBalanceWidget } from '../components';
import { useAuth } from '../hooks/useAuth';
import { syncWhatsAppContacts, getSyncStatus } from '../services/whatsappContactSyncService';
import { supabase } from '../services/supabaseClient';
import type { ContactNetwork } from '../types/memoryTypes';

// WhatsApp Onboarding Components
import { WhatsAppPairingStep } from '../modules/onboarding/components/WhatsAppPairingStep';
import { getWhatsAppSession } from '../modules/onboarding/services/onboardingService';
import { useWhatsAppConnection } from '../modules/connections/hooks/useWhatsAppConnection';
import type { WhatsAppSession } from '../modules/onboarding/types';

export function ContactsView() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<ContactNetwork[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<ContactNetwork[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState<'all' | 'google' | 'whatsapp'>('all');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactNetwork | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<{ lastSyncAt: string | null; contactCount: number } | null>(null);

  // WhatsApp session state
  const [whatsappSession, setWhatsappSession] = useState<WhatsAppSession | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSyncingStatus, setIsSyncingStatus] = useState(false);

  // Auto-sync state
  const [hasAttemptedAutoSync, setHasAttemptedAutoSync] = useState(false);
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);

  // Use WhatsApp connection hook for configureWebhook
  const { configureWebhook, session: hookSession, isConnected } = useWhatsAppConnection();

  // Sync database status with Evolution API if needed
  const syncDatabaseWithEvolutionAPI = useCallback(async () => {
    if (!whatsappSession?.instance_name) return false;

    console.log('[ContactsView] Attempting to sync database status with Evolution API...');
    setIsSyncingStatus(true);

    try {
      const result = await configureWebhook();
      if (result?.success && result.connectionState === 'open') {
        console.log('[ContactsView] Database synced! Evolution API reports connected.');
        // Refresh the session after sync
        const session = await getWhatsAppSession(user!.id);
        setWhatsappSession(session);
        return true;
      }
      return false;
    } catch (err) {
      console.error('[ContactsView] Error syncing with Evolution API:', err);
      return false;
    } finally {
      setIsSyncingStatus(false);
    }
  }, [whatsappSession?.instance_name, configureWebhook, user]);

  // Check WhatsApp session status
  useEffect(() => {
    const checkWhatsAppSession = async () => {
      if (!user?.id) {
        setIsCheckingSession(false);
        return;
      }

      try {
        const session = await getWhatsAppSession(user.id);
        setWhatsappSession(session);

        // If session exists but status isn't 'connected', try to sync with Evolution API
        // This handles cases where the webhook didn't update the database properly
        if (session && session.status !== 'connected' && session.instance_name) {
          console.log('[ContactsView] Session exists but not connected. Checking Evolution API...');
        }
      } catch (err) {
        console.error('[ContactsView] Error checking WhatsApp session:', err);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkWhatsAppSession();
  }, [user?.id]);

  // Auto-sync when session exists but status isn't connected
  useEffect(() => {
    if (!isCheckingSession && whatsappSession && whatsappSession.status !== 'connected' && whatsappSession.instance_name && !isSyncingStatus) {
      syncDatabaseWithEvolutionAPI();
    }
  }, [isCheckingSession, whatsappSession, isSyncingStatus, syncDatabaseWithEvolutionAPI]);

  // Load contacts from database
  useEffect(() => {
    if (user && whatsappSession?.status === 'connected') {
      loadContacts();
      loadSyncStatus();
    }
  }, [user, whatsappSession?.status]);

  // AUTO-SYNC: Only trigger when connected AND never synced before (lastSyncAt === null)
  useEffect(() => {
    const shouldAutoSync =
      whatsappSession?.status === 'connected' &&
      !isLoading &&
      !isCheckingSession &&
      syncStatus !== null && // Wait until we know sync status
      syncStatus.lastSyncAt === null && // Only if NEVER synced before
      !hasAttemptedAutoSync &&
      !isSyncing &&
      !isAutoSyncing;

    if (shouldAutoSync) {
      console.log('[ContactsView] Auto-sync triggered: connected but never synced');
      setHasAttemptedAutoSync(true);
      setIsAutoSyncing(true);

      syncWhatsAppContacts()
        .then((result) => {
          console.log('[ContactsView] Auto-sync result:', result);
          if (result.success) {
            loadContacts();
            loadSyncStatus();
          } else {
            setError(`Erro ao sincronizar: ${result.errors.join(', ')}`);
          }
        })
        .catch((err) => {
          console.error('[ContactsView] Auto-sync error:', err);
          setError(`Erro ao sincronizar: ${err.message}`);
        })
        .finally(() => {
          setIsAutoSyncing(false);
        });
    }
  }, [
    whatsappSession?.status,
    isLoading,
    isCheckingSession,
    syncStatus,
    hasAttemptedAutoSync,
    isSyncing,
    isAutoSyncing,
  ]);

  const loadContacts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('contact_network')
        .select('*')
        .eq('user_id', user?.id)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;

      setContacts(data || []);
    } catch (err) {
      const error = err as Error;
      console.error('[ContactsView] Error loading contacts:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSyncStatus = async () => {
    try {
      const status = await getSyncStatus();
      setSyncStatus({
        lastSyncAt: status.lastSyncAt,
        contactCount: status.contactCount,
      });
    } catch (err) {
      console.error('[ContactsView] Error loading sync status:', err);
    }
  };

  const handleWhatsAppSync = async () => {
    setIsSyncing(true);
    setError(null);

    try {
      const result = await syncWhatsAppContacts();

      if (result.success) {
        console.log('[ContactsView] WhatsApp sync completed:', result);
        // Reload contacts after sync
        await loadContacts();
        await loadSyncStatus();

        // Show success message
        alert(`✅ Sincronização concluída!\n\n${result.contactsSynced} contatos sincronizados`);
      } else {
        throw new Error(result.errors.join(', '));
      }
    } catch (err) {
      const error = err as Error;
      console.error('[ContactsView] WhatsApp sync error:', error);
      setError(`Erro ao sincronizar: ${error.message}`);
      alert(`❌ Erro ao sincronizar:\n\n${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Calculate category counts
  const categoryCounts = contacts.reduce((acc, c) => {
    const category = c.relationship_type || 'other';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Filter contacts based on search, source, and category
  useEffect(() => {
    let filtered = contacts;

    if (filterSource !== 'all') {
      filtered = filtered.filter(c => c.sync_source === filterSource);
    }

    if (filterCategory) {
      filtered = filtered.filter(c => c.relationship_type === filterCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.phone_number?.includes(query)
      );
    }

    setFilteredContacts(filtered);
  }, [contacts, searchQuery, filterSource, filterCategory]);

  const handleContactSelect = (contact: ContactNetwork) => {
    setSelectedContact(contact);
    setIsDetailModalOpen(true);
  };

  const handleContactSave = async (updatedContact: Partial<ContactNetwork>) => {
    console.log('[ContactsView] Contact save:', updatedContact);
    setIsDetailModalOpen(false);
  };

  const handleContactUpdated = (contactId: string, healthScore: number) => {
    console.log('[ContactsView] Contact updated with health score:', contactId, healthScore);
    // Update the contact in the local state
    setContacts(prev => prev.map(c =>
      c.id === contactId
        ? { ...c, health_score: healthScore, last_analyzed_at: new Date().toISOString() }
        : c
    ));
    // Update selected contact if it's the same
    if (selectedContact?.id === contactId) {
      setSelectedContact(prev => prev ? { ...prev, health_score: healthScore, last_analyzed_at: new Date().toISOString() } : prev);
    }
  };

  // Handle WhatsApp pairing success
  const handlePairingSuccess = async () => {
    // Refresh session status
    if (user?.id) {
      const session = await getWhatsAppSession(user.id);
      setWhatsappSession(session);
      // Load contacts after successful pairing
      if (session?.status === 'connected') {
        loadContacts();
        loadSyncStatus();
      }
    }
  };

  // Show loading while checking session, syncing status, or auto-syncing contacts
  if (isCheckingSession || isSyncingStatus || isAutoSyncing) {
    return (
      <div className="min-h-screen bg-ceramic-base flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-green-500 animate-spin mx-auto mb-4" />
          <p className="text-ceramic-text-secondary">
            {isAutoSyncing
              ? 'Sincronizando contatos do WhatsApp...'
              : isSyncingStatus
              ? 'Sincronizando status com Evolution API...'
              : 'Verificando conexão WhatsApp...'}
          </p>
          {isAutoSyncing && (
            <p className="text-ceramic-text-tertiary text-sm mt-2">
              Primeira sincronização em andamento
            </p>
          )}
        </div>
      </div>
    );
  }

  // Show pairing flow if no connected session
  const needsPairing = !whatsappSession || whatsappSession.status !== 'connected';

  if (needsPairing) {
    return (
      <div className="min-h-screen bg-ceramic-base">
        <HeaderGlobal
          title="Conectar WhatsApp"
          subtitle="Configure sua conexão"
          userEmail={user?.email}
        />
        <main className="p-6 max-w-2xl mx-auto">
          <div className="ceramic-card p-8">
            <WhatsAppPairingStep
              onSuccess={handlePairingSuccess}
              onBack={() => window.history.back()}
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ceramic-base">
      {/* Header */}
      <HeaderGlobal
        title="Contatos"
        subtitle="Minha Rede de Conexões"
        userEmail={user?.email}
      />

      {/* Main Content */}
      <main className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Credit Balance Widget */}
        <CreditBalanceWidget className="max-w-md" />

        {/* Search and Filter Bar */}
        <div className="flex gap-3 items-end">
          {/* Search Input */}
          <div className="flex-1 relative">
            <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary mb-2">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ceramic-text-secondary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nome, email ou telefone..."
                className="w-full pl-10 px-4 py-3 rounded-xl ceramic-inset text-ceramic-text-primary placeholder:text-ceramic-text-tertiary focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
            </div>
          </div>

          {/* Filter Select */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary mb-2">
              Filtro
            </label>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value as 'all' | 'google' | 'whatsapp')}
              className="px-4 py-3 rounded-xl ceramic-inset text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-medium"
            >
              <option value="all">Todos</option>
              <option value="google">Google</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>

          {/* WhatsApp Sync Button */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary mb-2">
              Sincronizar
            </label>
            <button
              onClick={handleWhatsAppSync}
              disabled={isSyncing}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all ${
                isSyncing
                  ? 'ceramic-inset text-ceramic-text-secondary cursor-not-allowed'
                  : 'ceramic-card hover:scale-105 text-ceramic-text-primary'
              }`}
              title={syncStatus?.lastSyncAt ? `Última sincronização: ${new Date(syncStatus.lastSyncAt).toLocaleString('pt-BR')}` : 'Sincronizar contatos WhatsApp'}
            >
              <MessageCircle className={`w-4 h-4 ${isSyncing ? 'animate-pulse' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'WhatsApp'}</span>
              {isSyncing && (
                <RefreshCw className="w-4 h-4 animate-spin" />
              )}
            </button>
          </div>
        </div>

        {/* Category Chips */}
        {Object.keys(categoryCounts).length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterCategory(null)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                filterCategory === null
                  ? 'bg-green-500 text-white'
                  : 'ceramic-inset text-ceramic-text-secondary hover:text-ceramic-text-primary'
              }`}
            >
              <Users className="w-3 h-3" />
              Todos ({contacts.length})
            </button>
            {Object.entries(categoryCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([category, count]) => {
                const categoryConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
                  group: { icon: Users2, label: 'Grupos', color: 'bg-purple-500' },
                  contact: { icon: User, label: 'Contatos', color: 'bg-blue-500' },
                  colleague: { icon: Briefcase, label: 'Colegas', color: 'bg-amber-500' },
                  client: { icon: Briefcase, label: 'Clientes', color: 'bg-emerald-500' },
                  friend: { icon: Heart, label: 'Amigos', color: 'bg-pink-500' },
                  family: { icon: Home, label: 'Família', color: 'bg-red-500' },
                  mentor: { icon: GraduationCap, label: 'Mentores', color: 'bg-indigo-500' },
                  mentee: { icon: GraduationCap, label: 'Mentorados', color: 'bg-cyan-500' },
                  vendor: { icon: Package, label: 'Fornecedores', color: 'bg-orange-500' },
                  other: { icon: User, label: 'Outros', color: 'bg-gray-500' },
                };
                const config = categoryConfig[category] || { icon: User, label: category, color: 'bg-gray-500' };
                const Icon = config.icon;

                return (
                  <button
                    key={category}
                    onClick={() => setFilterCategory(filterCategory === category ? null : category)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      filterCategory === category
                        ? `${config.color} text-white`
                        : 'ceramic-inset text-ceramic-text-secondary hover:text-ceramic-text-primary'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {config.label} ({count})
                  </button>
                );
              })}
          </div>
        )}

        {/* Sync Status */}
        {syncStatus && syncStatus.contactCount > 0 && (
          <div className="flex items-center gap-2 text-xs text-ceramic-text-secondary">
            <MessageCircle className="w-3 h-3" />
            <span>
              {syncStatus.contactCount} contatos WhatsApp
              {syncStatus.lastSyncAt && (
                <> • Última sincronização: {new Date(syncStatus.lastSyncAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</>
              )}
            </span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="ceramic-card p-4 bg-red-500/10 border border-red-500/20"
          >
            <p className="text-sm text-red-300 font-medium">{error}</p>
          </motion.div>
        )}

        {/* Contact Grid */}
        {filteredContacts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="ceramic-card p-12 flex flex-col items-center justify-center text-center"
          >
            <Users className="w-16 h-16 text-ceramic-text-secondary/30 mb-4" />
            <p className="text-ceramic-text-secondary font-bold mb-2">
              {searchQuery || filterSource !== 'all'
                ? 'Nenhum contato encontrado'
                : 'Nenhum contato ainda'}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContacts.map((contact) => (
              <div key={contact.id}>
                <ContactCard
                  contact={contact}
                  onClick={() => handleContactSelect(contact)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Results Counter */}
        {filteredContacts.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t border-ceramic-text-secondary/10">
            <p className="text-xs text-ceramic-text-secondary font-medium">
              Mostrando {filteredContacts.length} contatos
            </p>
          </div>
        )}
      </main>

      {/* Contact Detail Modal */}
      <AnimatePresence>
        {isDetailModalOpen && selectedContact && (
          <ContactDetailModal
            contact={selectedContact}
            isOpen={isDetailModalOpen}
            onClose={() => setIsDetailModalOpen(false)}
            onSave={handleContactSave}
            onContactUpdated={handleContactUpdated}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default ContactsView;
