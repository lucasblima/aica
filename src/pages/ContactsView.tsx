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
import { RefreshCw, MessageCircle, Settings2, X } from 'lucide-react';
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

  // Pairing flow expanded state — persisted to sessionStorage to survive tab-switch remounts
  const [isPairingExpanded, setIsPairingExpanded] = useState(() => {
    try { return sessionStorage.getItem('aica:pairingExpanded') === 'true' } catch { return false }
  });

  // Sync isPairingExpanded to sessionStorage
  useEffect(() => {
    try { sessionStorage.setItem('aica:pairingExpanded', String(isPairingExpanded)) } catch { /* ignore */ }
  }, [isPairingExpanded]);

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

  const handleContactClick = useCallback((contact: ContactNetwork) => {
    setSelectedContact(contact);
    setIsDetailModalOpen(true);
  }, []);

  const handleChatClick = useCallback((contact: ContactNetwork) => {
    const phone = contact.whatsapp_phone || contact.phone_number;
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
    }
  }, []);

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

  const handlePairingSuccess = async () => {
    setIsPairingExpanded(false);
    try { sessionStorage.removeItem('aica:pairingExpanded'); sessionStorage.removeItem('aica:pairingCode') } catch { /* ignore */ }
    if (isConnected) {
      loadContacts();
      loadSyncStatus();
    }
  };

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
      <HeaderGlobal
        title="Contatos"
        subtitle="Minha Rede de Conexões"
        userEmail={user?.email}
      />

      <main className="p-6 space-y-5 max-w-7xl mx-auto">
        {/* ── WhatsApp Connection Banner ── */}
        {(isPairingExpanded || (needsPairing && !isCheckingSession)) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden rounded-2xl"
            style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              boxShadow: '0 4px 24px rgba(163, 158, 145, 0.08)',
            }}
          >
            <AnimatePresence mode="wait">
              {!isPairingExpanded ? (
                /* ── Collapsed: elegant CTA ── */
                <motion.button
                  key="collapsed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsPairingExpanded(true)}
                  className="w-full p-6 flex items-center gap-5 hover:bg-white/40 transition-all duration-300 text-left group"
                >
                  {/* Breathing amber orb */}
                  <motion.div
                    className="relative w-12 h-12 flex-shrink-0 flex items-center justify-center"
                    animate={{
                      scale: [1, 1.04, 1],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <div
                      className="absolute inset-0 rounded-full opacity-20"
                      style={{
                        background: 'radial-gradient(circle, #F59E0B 0%, transparent 70%)',
                      }}
                    />
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        boxShadow: '0 4px 12px rgba(217, 119, 6, 0.25)',
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                    </div>
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-ceramic-text-primary">
                      Conectar WhatsApp
                    </h3>
                    <p className="text-sm text-ceramic-text-secondary mt-0.5">
                      Sincronize seus contatos e comece a gerenciar sua rede
                    </p>
                  </div>

                  <motion.span
                    className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium text-white"
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    }}
                    whileHover={{ scale: 1.03 }}
                  >
                    Conectar
                  </motion.span>
                </motion.button>
              ) : (
                /* ── Expanded: pairing flow ── */
                <motion.div
                  key="expanded"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Header with close */}
                  <div className="flex items-center justify-between px-6 pt-5 pb-0">
                    <div /> {/* spacer */}
                    <button
                      onClick={() => setIsPairingExpanded(false)}
                      className="p-2 rounded-full hover:bg-ceramic-cool/60 transition-colors"
                    >
                      <X className="w-4 h-4 text-ceramic-text-secondary" />
                    </button>
                  </div>
                  <div className="px-6 pb-8">
                    <WhatsAppPairingStep
                      onSuccess={handlePairingSuccess}
                      onBack={() => setIsPairingExpanded(false)}
                      session={whatsappSession}
                      isConnected={isConnected}
                      sessionStatus={whatsappSession?.status ?? null}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── Connected: actions row ── */}
        {!needsPairing && (
          <div className="flex items-start justify-between gap-4">
            <CreditBalanceWidget className="max-w-md" />

            <div className="flex items-center gap-2">
              <button
                onClick={handleReconnect}
                disabled={isReconnecting}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isReconnecting
                    ? 'bg-ceramic-cool text-ceramic-text-secondary cursor-not-allowed'
                    : 'bg-white/70 backdrop-blur-sm text-ceramic-text-primary hover:bg-white'
                }`}
                style={{
                  border: '1px solid rgba(163, 158, 145, 0.12)',
                  boxShadow: '0 2px 8px rgba(163, 158, 145, 0.06)',
                }}
                title="Reconectar WhatsApp"
              >
                <Settings2 className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
                <span>{isReconnecting ? 'Reconectando...' : 'Reconectar'}</span>
              </button>

              <button
                onClick={handleWhatsAppSync}
                disabled={isSyncing}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isSyncing
                    ? 'bg-ceramic-cool text-ceramic-text-secondary cursor-not-allowed'
                    : 'bg-white/70 backdrop-blur-sm text-ceramic-text-primary hover:bg-white'
                }`}
                style={{
                  border: '1px solid rgba(163, 158, 145, 0.12)',
                  boxShadow: '0 2px 8px rgba(163, 158, 145, 0.06)',
                }}
                title={syncStatus?.lastSyncAt ? `Ultima sincronizacao: ${new Date(syncStatus.lastSyncAt).toLocaleString('pt-BR')}` : 'Sincronizar contatos WhatsApp'}
              >
                {isSyncing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <MessageCircle className="w-3.5 h-3.5" />
                )}
                <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Sync Status */}
        {syncStatus && syncStatus.contactCount > 0 && (
          <div className="flex items-center gap-2 text-xs text-ceramic-text-secondary">
            <MessageCircle className="w-3 h-3" />
            <span>
              {syncStatus.contactCount} contatos
              {syncStatus.lastSyncAt && (
                <> &bull; {new Date(syncStatus.lastSyncAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</>
              )}
            </span>
          </div>
        )}

        {/* Auto-sync indicator */}
        {isAutoSyncing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 px-5 py-4 rounded-2xl"
            style={{
              background: 'rgba(255, 255, 255, 0.6)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(217, 119, 6, 0.1)',
            }}
          >
            <motion.div
              className="w-5 h-5 rounded-full"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              }}
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.7, 1, 0.7],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div>
              <p className="text-sm font-medium text-ceramic-text-primary">Sincronizando contatos...</p>
              <p className="text-xs text-ceramic-text-secondary">Primeira sincronização em andamento</p>
            </div>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-5 py-3.5 rounded-2xl"
            style={{
              background: 'rgba(155, 77, 58, 0.06)',
              border: '1px solid rgba(155, 77, 58, 0.1)',
            }}
          >
            <p className="text-sm text-ceramic-negative font-medium">{error}</p>
          </motion.div>
        )}

        {/* Loading state for initial session check */}
        {isCheckingSession && (
          <div className="flex flex-col items-center justify-center py-16">
            <motion.div
              className="w-8 h-8 rounded-full"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              }}
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
            <p className="mt-6 text-sm text-ceramic-text-secondary">Verificando conexão...</p>
          </div>
        )}

        {/* ── Contact List ── */}
        {!isCheckingSession && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.5)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 4px 24px rgba(163, 158, 145, 0.06)',
            }}
          >
            {needsPairing && contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-5"
                  style={{ backgroundColor: 'rgba(148, 141, 130, 0.06)' }}
                >
                  <MessageCircle className="w-6 h-6 text-ceramic-text-secondary/40" />
                </div>
                <h3 className="text-base font-semibold text-ceramic-text-primary mb-1.5">
                  Nenhum contato ainda
                </h3>
                <p className="text-sm text-ceramic-text-secondary max-w-xs">
                  Conecte seu WhatsApp para sincronizar contatos e gerenciar sua rede.
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
