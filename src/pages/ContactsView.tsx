/**
 * ContactsView Page
 * Dedicated page for viewing and managing contacts with WhatsApp sync.
 *
 * UX: Always shows the contacts list (even if empty). When WhatsApp is
 * not connected, shows an inline "Connect WhatsApp" card instead of
 * blocking the entire page with the pairing flow.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, MessageCircle, Loader2, Settings2, Smartphone, X, ChevronDown } from 'lucide-react';
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

  // Pairing flow expanded state (inline card)
  const [isPairingExpanded, setIsPairingExpanded] = useState(false);

  // Issue #91: Reconnect/reconfigure webhook state
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Use WhatsApp connection hook - single source of truth for session state
  const { configureWebhook, session: whatsappSession, isConnected, isLoading: isCheckingSession } = useWhatsAppConnection();

  const needsPairing = !whatsappSession || whatsappSession.status !== 'connected';

  // Load contacts from database
  useEffect(() => {
    if (user?.id && whatsappSession?.status === 'connected') {
      loadContacts();
      loadSyncStatus();
    }
  }, [user?.id, whatsappSession?.status]);

  // AUTO-SYNC: Only trigger when connected AND never synced before (lastSyncAt === null)
  useEffect(() => {
    const shouldAutoSync =
      whatsappSession?.status === 'connected' &&
      !isLoading &&
      !isCheckingSession &&
      syncStatus !== null &&
      syncStatus.lastSyncAt === null &&
      !hasAttemptedAutoSync &&
      !isSyncing &&
      !isAutoSyncing;

    if (shouldAutoSync) {
      log.debug('Auto-sync triggered: connected but never synced');
      setHasAttemptedAutoSync(true);
      setIsAutoSyncing(true);

      syncWhatsAppContacts()
        .then((result) => {
          log.debug('Auto-sync result:', result);
          if (result.success) {
            loadContacts();
            loadSyncStatus();
          } else {
            setError(`Erro ao sincronizar: ${result.errors.join(', ')}`);
          }
        })
        .catch((err) => {
          log.error('Auto-sync error:', err);
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
      log.error('Error loading contacts:', error);
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
      log.error('Error loading sync status:', err);
    }
  };

  const handleWhatsAppSync = async () => {
    setIsSyncing(true);
    setError(null);

    try {
      const result = await syncWhatsAppContacts();

      if (result.success) {
        log.debug('WhatsApp sync completed:', result);
        await loadContacts();
        await loadSyncStatus();
        alert(`Sincronização concluída!\n\n${result.contactsSynced} contatos sincronizados`);
      } else {
        throw new Error(result.errors.join(', '));
      }
    } catch (err) {
      const error = err as Error;
      log.error('WhatsApp sync error:', error);
      setError(`Erro ao sincronizar: ${error.message}`);
      alert(`Erro ao sincronizar:\n\n${error.message}`);
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
  }, []);

  const handleContactSave = async (updatedContact: Partial<ContactNetwork>) => {
    log.debug('Contact save:', updatedContact);
    setIsDetailModalOpen(false);
  };

  const handleContactUpdated = (contactId: string, healthScore: number) => {
    log.debug('Contact updated with health score:', contactId, healthScore);
    setContacts(prev => prev.map(c =>
      c.id === contactId
        ? { ...c, health_score: healthScore, last_analyzed_at: new Date().toISOString() }
        : c
    ));
    if (selectedContact?.id === contactId) {
      setSelectedContact(prev => prev ? { ...prev, health_score: healthScore, last_analyzed_at: new Date().toISOString() } : prev);
    }
  };

  // Handle WhatsApp pairing success
  const handlePairingSuccess = async () => {
    setIsPairingExpanded(false);
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
        alert(`Conexão reconfigurada!\n\nWebhook: ${result.webhookConfigured ? 'OK' : 'Fallback'}\nStatus: ${result.connectionState || 'unknown'}`);
      } else {
        throw new Error('Falha ao reconfigurar conexão');
      }
    } catch (err) {
      const error = err as Error;
      log.error('Reconnect error:', error);
      setError(`Erro ao reconectar: ${error.message}`);
      alert(`Erro ao reconectar:\n\n${error.message}`);
    } finally {
      setIsReconnecting(false);
    }
  };

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
        {/* WhatsApp Connection Banner - shown when not connected */}
        {needsPairing && !isCheckingSession && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="ceramic-card overflow-hidden"
          >
            {/* Collapsed state: compact banner */}
            {!isPairingExpanded ? (
              <button
                onClick={() => setIsPairingExpanded(true)}
                className="w-full p-5 flex items-center gap-4 hover:bg-ceramic-50/50 transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-ceramic-900">
                    Conectar WhatsApp
                  </h3>
                  <p className="text-sm text-ceramic-500 mt-0.5">
                    Sincronize seus contatos do WhatsApp para ver sua rede de conexões
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-medium text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
                    Configurar
                  </span>
                  <ChevronDown className="w-5 h-5 text-ceramic-400" />
                </div>
              </button>
            ) : (
              /* Expanded state: full pairing flow */
              <div>
                <div className="flex items-center justify-between p-4 border-b border-ceramic-100">
                  <h3 className="font-semibold text-ceramic-900 flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-green-600" />
                    Conectar WhatsApp
                  </h3>
                  <button
                    onClick={() => setIsPairingExpanded(false)}
                    className="p-1.5 rounded-lg hover:bg-ceramic-100 transition-colors"
                  >
                    <X className="w-5 h-5 text-ceramic-400" />
                  </button>
                </div>
                <div className="p-6">
                  <WhatsAppPairingStep
                    onSuccess={handlePairingSuccess}
                    onBack={() => setIsPairingExpanded(false)}
                    session={whatsappSession}
                    isConnected={isConnected}
                    sessionStatus={whatsappSession?.status ?? null}
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Connected status + actions row */}
        {!needsPairing && (
          <div className="flex items-start justify-between gap-4">
            <CreditBalanceWidget className="max-w-md" />

            {/* Button Group */}
            <div className="flex items-center gap-2">
              {/* Issue #91: Reconnect Button */}
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
        )}

        {/* Sync Status */}
        {syncStatus && syncStatus.contactCount > 0 && (
          <div className="flex items-center gap-2 text-xs text-ceramic-text-secondary">
            <MessageCircle className="w-3 h-3" />
            <span>
              {syncStatus.contactCount} contatos WhatsApp
              {syncStatus.lastSyncAt && (
                <> &bull; Ultima sincronizacao: {new Date(syncStatus.lastSyncAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</>
              )}
            </span>
          </div>
        )}

        {/* Auto-sync indicator */}
        {isAutoSyncing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 p-4 ceramic-card bg-blue-50/30"
          >
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            <div>
              <p className="text-sm font-medium text-blue-700">Sincronizando contatos...</p>
              <p className="text-xs text-blue-500">Primeira sincronização em andamento</p>
            </div>
          </motion.div>
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

        {/* Loading state for initial session check */}
        {isCheckingSession && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-green-500 animate-spin mx-auto mb-3" />
              <p className="text-sm text-ceramic-text-secondary">Verificando conexão WhatsApp...</p>
            </div>
          </div>
        )}

        {/* Contact List - always rendered */}
        {!isCheckingSession && (
          <div className="ceramic-card">
            {needsPairing && contacts.length === 0 ? (
              /* Empty state when not connected and no contacts */
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-ceramic-100 flex items-center justify-center mb-4">
                  <MessageCircle className="w-8 h-8 text-ceramic-400" />
                </div>
                <h3 className="text-lg font-semibold text-ceramic-700 mb-2">
                  Nenhum contato ainda
                </h3>
                <p className="text-sm text-ceramic-500 max-w-sm">
                  Conecte seu WhatsApp acima para sincronizar seus contatos e começar a gerenciar sua rede de conexões.
                </p>
              </div>
            ) : (
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
            )}
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
