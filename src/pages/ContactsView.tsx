/**
 * ContactsView Page
 * Dedicated page for viewing and managing contacts with WhatsApp sync
 *
 * Shows WhatsApp pairing flow if user hasn't connected their WhatsApp yet.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, MessageCircle, Loader2, Settings2 } from 'lucide-react';
import { HeaderGlobal, ContactDetailModal, CreditBalanceWidget } from '../components';
import { useAuth } from '../hooks/useAuth';
import { syncWhatsAppContacts, getSyncStatus } from '../services/whatsappContactSyncService';
import { supabase } from '../services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type { ContactNetwork } from '../types/memoryTypes';

// Issue #92: Rich WhatsApp contact list components
import { WhatsAppContactList } from '@/modules/connections/components';

const log = createNamespacedLogger('ContactsView');

// WhatsApp Onboarding Components
import { WhatsAppPairingStep } from '../modules/onboarding/components/WhatsAppPairingStep';
import { useWhatsAppConnection } from '../modules/connections/hooks/useWhatsAppConnection';

export function ContactsView() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<ContactNetwork[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactNetwork | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<{ lastSyncAt: string | null; contactCount: number } | null>(null);

  // Auto-sync state
  const [hasAttemptedAutoSync, setHasAttemptedAutoSync] = useState(false);
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);

  // Issue #91: Reconnect/reconfigure webhook state
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Refs to prevent infinite loops
  const hasAttemptedDatabaseSync = useRef(false);
  const configureWebhookRef = useRef<typeof configureWebhook | null>(null);

  // Use WhatsApp connection hook - single source of truth for session state
  const { configureWebhook, session: whatsappSession, isConnected, isLoading: isCheckingSession } = useWhatsAppConnection();

  // Keep configureWebhook ref updated without causing re-renders
  useEffect(() => {
    configureWebhookRef.current = configureWebhook;
  }, [configureWebhook]);

  // Load contacts from database
  useEffect(() => {
    if (user?.id && whatsappSession?.status === 'connected') {
      loadContacts();
      loadSyncStatus();
    }
  }, [user?.id, whatsappSession?.status]); // Use user?.id instead of user object to prevent re-renders

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
      log.debug(' Auto-sync triggered: connected but never synced');
      setHasAttemptedAutoSync(true);
      setIsAutoSyncing(true);

      syncWhatsAppContacts()
        .then((result) => {
          log.debug(' Auto-sync result:', result);
          if (result.success) {
            loadContacts();
            loadSyncStatus();
          } else {
            setError(`Erro ao sincronizar: ${result.errors.join(', ')}`);
          }
        })
        .catch((err) => {
          log.error(' Auto-sync error:', err);
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
      log.error(' Error loading contacts:', error);
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
      log.error(' Error loading sync status:', err);
    }
  };

  const handleWhatsAppSync = async () => {
    setIsSyncing(true);
    setError(null);

    try {
      const result = await syncWhatsAppContacts();

      if (result.success) {
        log.debug(' WhatsApp sync completed:', result);
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
      log.error(' WhatsApp sync error:', error);
      setError(`Erro ao sincronizar: ${error.message}`);
      alert(`❌ Erro ao sincronizar:\n\n${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle contact click - open detail modal
  const handleContactClick = useCallback((contact: ContactNetwork) => {
    setSelectedContact(contact);
    setIsDetailModalOpen(true);
  }, []);

  // Handle chat action - open WhatsApp
  const handleChatClick = useCallback((contact: ContactNetwork) => {
    const phone = contact.whatsapp_phone || contact.phone_number;
    if (phone) {
      // Remove non-digits and open WhatsApp
      const cleanPhone = phone.replace(/\D/g, '');
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
    }
  }, []);

  // Handle favorite toggle
  const handleFavoriteToggle = useCallback((contact: ContactNetwork) => {
    setFavoriteIds(prev =>
      prev.includes(contact.id)
        ? prev.filter(id => id !== contact.id)
        : [...prev, contact.id]
    );
    // TODO: Persist favorites to database
  }, []);

  const handleContactSave = async (updatedContact: Partial<ContactNetwork>) => {
    log.debug(' Contact save:', updatedContact);
    setIsDetailModalOpen(false);
  };

  const handleContactUpdated = (contactId: string, healthScore: number) => {
    log.debug(' Contact updated with health score:', contactId, healthScore);
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
    // The session is automatically refreshed via real-time subscription in useWhatsAppConnection
    // Just load contacts after successful pairing
    if (isConnected) {
      loadContacts();
      loadSyncStatus();
    }
  };

  // Issue #91: Handle reconnect/reconfigure webhook
  const handleReconnect = async () => {
    setIsReconnecting(true);
    setError(null);

    try {
      log.debug('Reconnecting WhatsApp - reconfiguring webhook...');

      const result = await configureWebhook();

      if (result?.success) {
        log.debug('Webhook reconfigured successfully:', result);

        // Session is automatically refreshed via real-time subscription in useWhatsAppConnection
        // Show success message
        alert(`✅ Conexão reconfigurada!\n\nWebhook: ${result.webhookConfigured ? 'OK' : 'Fallback'}\nStatus: ${result.connectionState || 'unknown'}`);
      } else {
        throw new Error('Falha ao reconfigurar conexão');
      }
    } catch (err) {
      const error = err as Error;
      log.error('Reconnect error:', error);
      setError(`Erro ao reconectar: ${error.message}`);
      alert(`❌ Erro ao reconectar:\n\n${error.message}`);
    } finally {
      setIsReconnecting(false);
    }
  };

  // Show loading while checking session or auto-syncing contacts
  if (isCheckingSession || isAutoSyncing) {
    return (
      <div className="min-h-screen bg-ceramic-base flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-green-500 animate-spin mx-auto mb-4" />
          <p className="text-ceramic-text-secondary">
            {isAutoSyncing
              ? 'Sincronizando contatos do WhatsApp...'
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
        {/* Credit Balance Widget + Sync Button Row */}
        <div className="flex items-start justify-between gap-4">
          <CreditBalanceWidget className="max-w-md" />

          {/* Button Group */}
          <div className="flex items-center gap-2">
            {/* Issue #91: Reconnect Button - reconfigures webhook with secret */}
            <button
              onClick={handleReconnect}
              disabled={isReconnecting}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all ${
                isReconnecting
                  ? 'ceramic-inset text-ceramic-text-secondary cursor-not-allowed'
                  : 'ceramic-card hover:scale-105 text-ceramic-text-primary'
              }`}
              title="Reconectar WhatsApp - reconfigura webhook para receber mensagens"
            >
              <Settings2 className={`w-4 h-4 ${isReconnecting ? 'animate-spin' : ''}`} />
              <span>{isReconnecting ? 'Reconectando...' : 'Reconectar'}</span>
            </button>

            {/* Sync Button */}
            <button
              onClick={handleWhatsAppSync}
              disabled={isSyncing}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all ${
                isSyncing
                  ? 'ceramic-inset text-ceramic-text-secondary cursor-not-allowed'
                  : 'ceramic-card hover:scale-105 text-ceramic-text-primary'
              }`}
              title={syncStatus?.lastSyncAt ? `Ultima sincronizacao: ${new Date(syncStatus.lastSyncAt).toLocaleString('pt-BR')}` : 'Sincronizar contatos WhatsApp'}
            >
              <MessageCircle className={`w-4 h-4 ${isSyncing ? 'animate-pulse' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
              {isSyncing && (
                <RefreshCw className="w-4 h-4 animate-spin" />
              )}
            </button>
          </div>
        </div>

        {/* Sync Status */}
        {syncStatus && syncStatus.contactCount > 0 && (
          <div className="flex items-center gap-2 text-xs text-ceramic-text-secondary">
            <MessageCircle className="w-3 h-3" />
            <span>
              {syncStatus.contactCount} contatos WhatsApp
              {syncStatus.lastSyncAt && (
                <> • Ultima sincronizacao: {new Date(syncStatus.lastSyncAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</>
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

        {/* Issue #92: Rich WhatsApp Contact List with filters and virtualization */}
        <div className="ceramic-card">
          <WhatsAppContactList
            contacts={contacts}
            favoriteIds={favoriteIds}
            isLoading={isLoading}
            error={error ? new Error(error) : null}
            onContactClick={handleContactClick}
            onChatClick={handleChatClick}
            onFavoriteToggle={handleFavoriteToggle}
            height="calc(100vh - 350px)"
          />
        </div>
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
