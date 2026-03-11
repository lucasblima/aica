/**
 * ConnectionsWhatsAppTab - Main WhatsApp Integration View
 *
 * Import-first WhatsApp integration dashboard. Users import conversations
 * via WhatsApp's native export feature (100% legal, zero ban risk).
 *
 * Tabs:
 * - Importar: WhatsApp export upload (main entry point)
 * - Contatos: Imported contacts with dossier + group analytics
 * - Inteligencia: EntityInbox + ConversationTimeline + threads
 * - Analytics: Sentiment scores + anomaly alerts + emotional thermometer
 *
 * Evolution API removed — all data comes from manual export import.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  TrendingUp,
  Users,
  Bell,
  Loader2,
  AlertTriangle,
  Sparkles,
  Phone,
  Clock,
  ArrowUp,
  ArrowDown,
  SortAsc,
  Brain,
  CheckCircle2,
  Circle,
  Trash2,
  Lock,
} from 'lucide-react';
import { CeramicTabSelector, ContactAvatar, ConfirmationModal } from '@/components/ui';
import {
  EmotionalThermometer,
  ContactDossierCard,
  ConversationTimeline,
  EntityInbox,
  GroupAnalyticsCard,
  WhatsAppExportUpload,
  ContactDetailSheet,
} from '../components/whatsapp';
import { GoogleContextPanel } from '@/modules/google-hub/components/GoogleContextPanel';
import { deleteContacts } from '@/services/contactNetworkService';
import { useContactDossier } from '../hooks/useContactDossier';
import { useConversationThreads } from '../hooks/useConversationThreads';
import { useExtractedEntities } from '../hooks/useExtractedEntities';
import type { ContactNetwork } from '@/types/memoryTypes';
import whatsappAnalyticsService, {
  ContactSentimentScore,
  AnomalyAlert,
} from '@/services/whatsappAnalyticsService';
import { cn } from '@/lib/utils';
import { staggerContainer, staggerItem } from '@/lib/animations/ceramic-motion';
import { useWhatsAppGamification } from '../hooks/useWhatsAppGamification';
import { useConsciousnessPoints } from '@/hooks/useConsciousnessPoints';
import { supabase } from '@/services/supabaseClient';
import TelegramLinkCard from '../components/telegram/TelegramLinkCard';
import { createNamespacedLogger } from '@/lib/logger';
const log = createNamespacedLogger('ConnectionsWhatsAppTab');

// ============================================================================
// TYPES
// ============================================================================

type TabId = 'import' | 'contacts' | 'intelligence' | 'analytics';

// Minimum CP required to unlock intelligence features
const MIN_CP_FOR_INTELLIGENCE = 50;

interface ConnectionsWhatsAppTabProps {
  userId?: string;
  className?: string;
}

// Contact type (from contact_network table)
interface ImportedContact {
  id: string;
  name: string;
  phone: string;
  whatsapp_id: string | null;
  whatsapp_phone: string | null;
  whatsapp_name: string | null;
  whatsapp_profile_pic_url: string | null;
  whatsapp_message_count: number;
  last_whatsapp_message_at: string | null;
}

type ContactSortField = 'name' | 'message_count' | 'last_activity';
type ContactSortOrder = 'asc' | 'desc';

// ============================================================================
// CONTACT INSIGHT CARD COMPONENT
// ============================================================================

interface ContactInsightCardProps {
  contact: ContactSentimentScore;
  onClick?: () => void;
}

const ContactInsightCard: React.FC<ContactInsightCardProps> = ({ contact, onClick }) => {
  const getSentimentColor = (sentiment: number): string => {
    if (sentiment >= 0.3) return '#6B7B5C';
    if (sentiment >= -0.3) return '#D4AF37';
    return '#9B4D3A';
  };

  const getSentimentLabel = (sentiment: number): string => {
    if (sentiment >= 0.3) return 'Positivo';
    if (sentiment >= -0.3) return 'Neutro';
    return 'Negativo';
  };

  return (
    <motion.div
      className="ceramic-card p-4 rounded-xl cursor-pointer hover:scale-[1.02] transition-transform"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center ceramic-concave"
            style={{ backgroundColor: `${getSentimentColor(contact.sentimentScore)}20` }}
          >
            <Users className="w-5 h-5" style={{ color: getSentimentColor(contact.sentimentScore) }} />
          </div>
          <div>
            <p className="text-sm font-bold text-ceramic-text-primary">
              {contact.contactName}
            </p>
            <p className="text-xs text-ceramic-text-secondary">
              {contact.messageCount} mensagens
            </p>
          </div>
        </div>
        <div className="text-right">
          <p
            className="text-lg font-bold"
            style={{ color: getSentimentColor(contact.sentimentScore) }}
          >
            {contact.sentimentScore.toFixed(2)}
          </p>
          <p className="text-xs text-ceramic-text-secondary">
            {getSentimentLabel(contact.sentimentScore)}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================================
// ANOMALY ALERT CARD COMPONENT
// ============================================================================

interface AnomalyAlertCardProps {
  alert: AnomalyAlert;
}

const AnomalyAlertCard: React.FC<AnomalyAlertCardProps> = ({ alert }) => {
  const getAnomalyColor = (type: string): string => {
    switch (type) {
      case 'message_volume': return '#D97706';
      case 'sentiment_drop': return '#9B4D3A';
      case 'contact_silence': return '#6B7B5C';
      default: return '#9CA3AF';
    }
  };

  return (
    <div className="ceramic-inset p-4 rounded-xl">
      <div className="flex items-start gap-3">
        <div
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${getAnomalyColor(alert.type)}20` }}
        >
          <AlertTriangle className="w-5 h-5" style={{ color: getAnomalyColor(alert.type) }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-ceramic-text-primary mb-1">{alert.message}</p>
          <p className="text-xs text-ceramic-text-secondary">
            {new Date(alert.timestamp).toLocaleDateString('pt-BR')} • Severidade: {alert.severity}
          </p>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// IMPORTED CONTACT CARD
// ============================================================================

interface ImportedContactCardProps {
  contact: ImportedContact;
  onClick?: () => void;
}

const ImportedContactCard: React.FC<ImportedContactCardProps> = ({ contact, onClick }) => {
  const formatPhone = (phone: string): string => {
    if (!phone) return '';
    const cleaned = phone.replace(/^\+?55/, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const formatLastActivity = (timestamp: string | null): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const displayName = contact.whatsapp_name || contact.name || 'Contato';
  const messageCount = contact.whatsapp_message_count || 0;

  return (
    <motion.div
      className="ceramic-card p-4 rounded-xl cursor-pointer hover:scale-[1.02] transition-transform"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center gap-3">
        <ContactAvatar
          name={displayName}
          whatsappProfilePicUrl={contact.whatsapp_profile_pic_url}
          size="lg"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-ceramic-text-primary truncate">{displayName}</p>
          <div className="flex items-center gap-2 text-xs text-ceramic-text-secondary">
            <Phone className="w-3 h-3" />
            <span>{formatPhone(contact.whatsapp_phone || contact.phone)}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {messageCount > 0 && (
            <span className="px-2 py-0.5 bg-ceramic-info/10 text-ceramic-info text-xs rounded-full font-medium">
              {messageCount} msg
            </span>
          )}
          {contact.last_whatsapp_message_at && (
            <span className="text-xs text-ceramic-text-secondary">
              {formatLastActivity(contact.last_whatsapp_message_at)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ConnectionsWhatsAppTab: React.FC<ConnectionsWhatsAppTabProps> = ({
  userId,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('import');
  const [contacts, setContacts] = useState<ContactSentimentScore[]>([]);
  const [importedContacts, setImportedContacts] = useState<ImportedContact[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyAlert[]>([]);
  const [selectedAnalyticsId, setSelectedAnalyticsId] = useState<string | null>(null);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isLoadingImported, setIsLoadingImported] = useState(true);
  const [isLoadingAnomalies, setIsLoadingAnomalies] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Gamification tracking
  const { trackAnalyticsView, trackContactAnalysis } = useWhatsAppGamification();

  // Consciousness Points gate
  const { balance } = useConsciousnessPoints({ autoFetch: true });
  const currentCP = balance.total_cp;
  const isIntelligenceUnlocked = currentCP >= MIN_CP_FOR_INTELLIGENCE;

  // Local sorting state
  const [sortBy, setSortBy] = useState<ContactSortField>('last_activity');
  const [sortOrder, setSortOrder] = useState<ContactSortOrder>('desc');

  // Select mode for batch delete
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  // Contact detail sheet
  const [detailContact, setDetailContact] = useState<ImportedContact | null>(null);

  // Selected contact for dossier (Conversation Intelligence Phase 1)
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const { dossier, isLoading: isDossierLoading, isRefreshing: isDossierRefreshing, hasDossier, refreshDossier, error: dossierError } = useContactDossier(selectedContactId);
  const { threads, isLoading: isThreadsLoading, isBuilding: isThreadsBuilding, hasMore: hasMoreThreads, loadMore: loadMoreThreads, buildThreads } = useConversationThreads(selectedContactId);

  // Entity extraction (Conversation Intelligence Phase 3)
  const { entities, stats: entityStats, isLoading: isEntitiesLoading, isExtracting, acceptEntity, rejectEntity, extractEntities } = useExtractedEntities();

  // Tab configuration — show lock icon on gated tabs when CP is below threshold
  const lockIcon = !isIntelligenceUnlocked ? <Lock className="w-3.5 h-3.5 text-ceramic-text-secondary" /> : undefined;
  const tabs = [
    { id: 'import', label: 'Importar' },
    { id: 'contacts', label: 'Contatos', icon: lockIcon },
    { id: 'intelligence', label: 'Inteligencia', icon: lockIcon },
    { id: 'analytics', label: 'Analytics', icon: lockIcon },
  ];

  // Load data on mount
  useEffect(() => {
    loadAnalyticsContacts();
    loadAnomalies();
    loadImportedContacts();
  }, []);

  // Reload imported contacts when sorting changes
  useEffect(() => {
    loadImportedContacts();
  }, [sortBy, sortOrder]);

  // Track analytics view when tab changes to 'analytics'
  useEffect(() => {
    if (activeTab === 'analytics') {
      trackAnalyticsView();
    }
  }, [activeTab, trackAnalyticsView]);

  const loadAnalyticsContacts = async () => {
    setIsLoadingContacts(true);
    setError(null);
    try {
      const contactsList = await whatsappAnalyticsService.getContactsList();
      setContacts(contactsList);
      if (contactsList.length > 0 && !selectedAnalyticsId) {
        setSelectedAnalyticsId(contactsList[0].contactId);
      }
    } catch (err) {
      log.error('Error loading analytics contacts:', err);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const loadAnomalies = async () => {
    setIsLoadingAnomalies(true);
    try {
      const alerts = await whatsappAnalyticsService.getAnomalyAlerts(7, 5);
      setAnomalies(alerts);
    } catch (err) {
      log.error('Error loading anomalies:', err);
    } finally {
      setIsLoadingAnomalies(false);
    }
  };

  const loadImportedContacts = async () => {
    setIsLoadingImported(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const query = supabase
        .from('contact_network')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('sync_source', 'whatsapp');

      switch (sortBy) {
        case 'message_count':
          query.order('whatsapp_message_count', { ascending: sortOrder === 'asc', nullsFirst: false });
          break;
        case 'last_activity':
          query.order('last_whatsapp_message_at', { ascending: sortOrder === 'asc', nullsFirst: false });
          break;
        case 'name':
        default:
          query.order('whatsapp_name', { ascending: sortOrder === 'asc' });
          break;
      }

      const { data } = await query;
      setImportedContacts(data || []);
    } catch (err) {
      log.error('Error loading imported contacts:', err);
    } finally {
      setIsLoadingImported(false);
    }
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsBatchDeleting(true);
    try {
      await deleteContacts(Array.from(selectedIds));
      setShowBatchDeleteConfirm(false);
      setSelectedIds(new Set());
      setIsSelectMode(false);
      await loadImportedContacts();
    } catch (err) {
      log.error('Error batch deleting contacts:', err);
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const handleSingleDelete = async (contactId: string) => {
    setDetailContact(null);
    setSelectedContactId(null);
    await loadImportedContacts();
  };

  const handleContactSelect = async (contactId: string) => {
    setSelectedAnalyticsId(contactId);
    await trackContactAnalysis(contactId);
  };

  const renderLoading = () => (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="w-8 h-8 animate-spin text-ceramic-accent" />
    </div>
  );

  // ── Locked State (CP gate) ──
  const renderLockedState = () => {
    const progressPercent = Math.min((currentCP / MIN_CP_FOR_INTELLIGENCE) * 100, 100);

    return (
      <motion.div
        className="flex items-center justify-center py-16 px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="ceramic-card p-8 rounded-3xl max-w-md w-full text-center space-y-6">
          {/* Lock icon */}
          <div className="w-20 h-20 rounded-full bg-ceramic-cool flex items-center justify-center mx-auto">
            <Lock className="w-10 h-10 text-ceramic-text-secondary" />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-ceramic-text-primary">
              Recurso Bloqueado
            </h3>
            <p className="text-sm text-ceramic-text-secondary leading-relaxed">
              Desbloqueie com {MIN_CP_FOR_INTELLIGENCE} Pontos de Consciencia.
              Continue registrando momentos e respondendo perguntas para desbloquear.
            </p>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-ceramic-text-secondary">Progresso</span>
              <span className="text-ceramic-accent">
                {currentCP} / {MIN_CP_FOR_INTELLIGENCE} CP
              </span>
            </div>
            <div className="w-full h-3 bg-ceramic-cool rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-ceramic-accent rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <p className="text-xs text-ceramic-text-secondary">
              Faltam {Math.max(MIN_CP_FOR_INTELLIGENCE - currentCP, 0)} CP
            </p>
          </div>

          {/* CTA button */}
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-ceramic-accent text-white rounded-xl font-bold hover:scale-105 active:scale-95 transition-transform"
          >
            <Sparkles className="w-5 h-5" />
            Ir para Vida
          </a>
        </div>
      </motion.div>
    );
  };

  // ── Import Tab ──
  const renderImportTab = () => (
    <div className="space-y-6">
      <WhatsAppExportUpload />
      <TelegramLinkCard />
    </div>
  );

  // ── Contacts Tab ──
  const renderContactsTab = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="ceramic-card p-6 rounded-3xl">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-ceramic-accent" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-ceramic-text-primary">
              Contatos Importados
            </h2>
            <p className="text-sm text-ceramic-text-secondary">
              {importedContacts.length} contatos de conversas importadas
            </p>
          </div>
          {importedContacts.length > 0 && (
            <button
              onClick={() => {
                setIsSelectMode(prev => !prev);
                setSelectedIds(new Set());
              }}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                isSelectMode
                  ? 'bg-ceramic-error/10 text-ceramic-error hover:bg-ceramic-error/20'
                  : 'bg-ceramic-cool text-ceramic-text-secondary hover:bg-ceramic-cool/80'
              )}
            >
              {isSelectMode ? 'Cancelar' : 'Selecionar'}
            </button>
          )}
        </div>
      </div>

      {/* Sort Controls */}
      <div className="ceramic-card p-4 rounded-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-ceramic-text-secondary">
            <SortAsc className="w-4 h-4" />
            <span>Ordenar por:</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as ContactSortField)}
              className="ceramic-inset px-3 py-2 rounded-xl text-sm font-medium text-ceramic-text-primary bg-transparent border-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ceramic-accent"
            >
              <option value="name">Nome</option>
              <option value="message_count">Volume de mensagens</option>
              <option value="last_activity">Atividade recente</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="ceramic-card p-2 rounded-xl hover:scale-105 active:scale-95 transition-transform"
            >
              {sortOrder === 'asc' ? (
                <ArrowUp className="w-4 h-4 text-ceramic-text-secondary" />
              ) : (
                <ArrowDown className="w-4 h-4 text-ceramic-text-secondary" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Contacts List */}
      <div className="ceramic-card p-6 rounded-3xl space-y-4">
        {isLoadingImported ? (
          renderLoading()
        ) : importedContacts.length === 0 ? (
          <motion.div className="text-center py-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="w-20 h-20 rounded-full bg-ceramic-inset flex items-center justify-center mx-auto mb-4">
              <Upload className="w-10 h-10 text-ceramic-text-secondary" />
            </div>
            <h3 className="text-lg font-bold text-ceramic-text-primary mb-2">
              Nenhum contato importado
            </h3>
            <p className="text-sm text-ceramic-text-secondary max-w-sm mx-auto mb-4">
              Importe conversas do WhatsApp na aba "Importar" para ver contatos aqui.
            </p>
            <button
              onClick={() => setActiveTab('import')}
              className="px-6 py-3 bg-ceramic-accent text-white rounded-xl font-bold hover:scale-105 active:scale-95 transition-transform"
            >
              Importar Conversas
            </button>
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {importedContacts.map((contact) => (
              <motion.div key={contact.id} variants={staggerItem}>
                {isSelectMode ? (
                  <div
                    className={cn(
                      'ceramic-card p-4 rounded-xl cursor-pointer transition-all',
                      selectedIds.has(contact.id)
                        ? 'ring-2 ring-ceramic-accent bg-ceramic-accent/5'
                        : 'hover:scale-[1.02]'
                    )}
                    onClick={() => toggleSelectId(contact.id)}
                  >
                    <div className="flex items-center gap-3">
                      {selectedIds.has(contact.id) ? (
                        <CheckCircle2 className="w-6 h-6 text-ceramic-accent flex-shrink-0" />
                      ) : (
                        <Circle className="w-6 h-6 text-ceramic-text-secondary/40 flex-shrink-0" />
                      )}
                      <ContactAvatar
                        name={contact.whatsapp_name || contact.name || 'Contato'}
                        whatsappProfilePicUrl={contact.whatsapp_profile_pic_url}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-ceramic-text-primary truncate">
                          {contact.whatsapp_name || contact.name || 'Contato'}
                        </p>
                        <p className="text-xs text-ceramic-text-secondary">
                          {contact.whatsapp_message_count || 0} msg
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <ImportedContactCard
                    contact={contact}
                    onClick={() => {
                      const full = importedContacts.find(c => c.id === contact.id) || null;
                      setDetailContact(full);
                      setSelectedContactId(prev => prev === contact.id ? null : contact.id);
                    }}
                  />
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Contact Dossier + Conversation Timeline (inline, non-select mode) */}
      {selectedContactId && !isSelectMode && !detailContact && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-4"
        >
          <ContactDossierCard
            dossier={dossier}
            isLoading={isDossierLoading}
            isRefreshing={isDossierRefreshing}
            hasDossier={hasDossier}
            onRefresh={refreshDossier}
            error={dossierError}
          />
          {importedContacts.find(c => c.id === selectedContactId)?.whatsapp_id?.includes('@g.us') && (
            <GroupAnalyticsCard groupContactId={selectedContactId} />
          )}
          <ConversationTimeline
            threads={threads}
            isLoading={isThreadsLoading}
            isBuilding={isThreadsBuilding}
            hasMore={hasMoreThreads}
            onLoadMore={loadMoreThreads}
            onBuildThreads={buildThreads}
          />
        </motion.div>
      )}

      {/* Floating batch delete button */}
      <AnimatePresence>
        {isSelectMode && selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30"
          >
            <button
              onClick={() => setShowBatchDeleteConfirm(true)}
              className="flex items-center gap-2 px-6 py-3 bg-ceramic-error text-white rounded-2xl font-bold shadow-lg hover:scale-105 active:scale-95 transition-transform"
            >
              <Trash2 className="w-5 h-5" />
              Remover {selectedIds.size} contato{selectedIds.size > 1 ? 's' : ''}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Batch delete confirmation */}
      <ConfirmationModal
        isOpen={showBatchDeleteConfirm}
        variant="danger"
        title="Remover contatos"
        message={`Tem certeza que deseja remover ${selectedIds.size} contato${selectedIds.size > 1 ? 's' : ''}? Todas as mensagens, threads e dados associados serão removidos permanentemente.`}
        confirmText={`Remover ${selectedIds.size}`}
        isLoading={isBatchDeleting}
        onConfirm={handleBatchDelete}
        onCancel={() => setShowBatchDeleteConfirm(false)}
      />

      {/* Contact Detail Sheet */}
      <ContactDetailSheet
        contact={detailContact as unknown as ContactNetwork}
        isOpen={!!detailContact}
        onClose={() => {
          setDetailContact(null);
          setSelectedContactId(null);
          // Refresh contact list so dossier_summary is fresh on next open
          loadImportedContacts();
        }}
        onDelete={handleSingleDelete}
      />
    </div>
  );

  // Build context for Google Contextual Search from imported contacts
  const googleContextPeople = useMemo(
    () => importedContacts
      .slice(0, 10)
      .map(c => c.whatsapp_name || c.name)
      .filter(Boolean),
    [importedContacts]
  );

  // ── Intelligence Tab ──
  const renderIntelligenceTab = () => (
    <div className="space-y-6">
      {/* Google Contextual Search */}
      <GoogleContextPanel
        module="connections"
        context={{
          people: googleContextPeople,
          keywords: ['whatsapp', 'conversa', 'contato'],
        }}
        compact
      />

      {/* Entity Inbox */}
      <EntityInbox
        entities={entities}
        stats={entityStats}
        isLoading={isEntitiesLoading}
        isExtracting={isExtracting}
        onAccept={acceptEntity}
        onReject={rejectEntity}
        onExtract={() => extractEntities()}
      />

      {/* Recent Anomalies */}
      {anomalies.length > 0 && (
        <div className="ceramic-card p-6 rounded-3xl space-y-4">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-ceramic-accent" />
            <h3 className="text-lg font-bold text-ceramic-text-primary">
              Alertas Recentes
            </h3>
            <span className="text-xs text-ceramic-text-secondary">(Ultimos 7 dias)</span>
          </div>
          {isLoadingAnomalies ? renderLoading() : (
            <div className="space-y-3">
              {anomalies.map(alert => (
                <AnomalyAlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Top Contacts Preview */}
      {contacts.length > 0 && (
        <div className="ceramic-card p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-ceramic-accent" />
              <h3 className="text-lg font-bold text-ceramic-text-primary">
                Principais Contatos
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('analytics')}
              className="text-sm text-ceramic-accent hover:underline"
            >
              Ver todos
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {contacts.slice(0, 4).map(contact => (
              <ContactInsightCard
                key={contact.contactId}
                contact={contact}
                onClick={() => {
                  handleContactSelect(contact.contactId);
                  setActiveTab('analytics');
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {entities.length === 0 && anomalies.length === 0 && contacts.length === 0 && !isEntitiesLoading && (
        <motion.div className="ceramic-tray p-12 rounded-3xl text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="ceramic-inset w-24 h-24 flex items-center justify-center mx-auto mb-6 bg-ceramic-info/10">
            <Brain className="w-12 h-12 text-ceramic-accent" />
          </div>
          <h3 className="text-xl font-bold text-ceramic-text-primary mb-3">
            Inteligencia de Conversas
          </h3>
          <p className="text-sm text-ceramic-text-secondary max-w-md mx-auto">
            Importe conversas do WhatsApp para que o AICA detecte tarefas, eventos e
            insights automaticamente.
          </p>
        </motion.div>
      )}
    </div>
  );

  // ── Analytics Tab ──
  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      {/* Emotional Thermometer */}
      {selectedAnalyticsId ? (
        <EmotionalThermometer
          contactHash={selectedAnalyticsId}
          contactName={contacts.find(c => c.contactId === selectedAnalyticsId)?.contactName || 'Contato'}
          defaultTimeWindow="week"
          showTimeWindowSelector={true}
          height={400}
        />
      ) : (
        <div className="ceramic-card p-12 rounded-3xl text-center">
          <TrendingUp className="w-12 h-12 text-ceramic-text-secondary mx-auto mb-4" />
          <p className="text-sm text-ceramic-text-secondary">
            Selecione um contato abaixo para visualizar o termometro emocional
          </p>
        </div>
      )}

      {/* Contact List */}
      <div className="ceramic-card p-6 rounded-3xl space-y-4">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-ceramic-accent" />
          <h3 className="text-lg font-bold text-ceramic-text-primary">
            Todos os Contatos
          </h3>
          <span className="text-xs text-ceramic-text-secondary">({contacts.length})</span>
        </div>

        {isLoadingContacts ? renderLoading() : contacts.length === 0 ? (
          <motion.div className="ceramic-tray p-12 rounded-3xl text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="ceramic-inset w-24 h-24 flex items-center justify-center mx-auto mb-6 bg-ceramic-info/10">
              <Upload className="w-12 h-12 text-ceramic-accent" />
            </div>
            <h3 className="text-xl font-bold text-ceramic-text-primary mb-3">
              Importe Conversas
            </h3>
            <p className="text-sm text-ceramic-text-secondary max-w-md mx-auto">
              Importe conversas do WhatsApp na aba "Importar" para ver analytics aqui.
            </p>
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {contacts.map(contact => (
              <motion.div key={contact.contactId} variants={staggerItem}>
                <ContactInsightCard
                  contact={contact}
                  onClick={() => handleContactSelect(contact.contactId)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );

  // Main render
  return (
    <div className={`h-screen w-full bg-ceramic-base flex flex-col overflow-hidden ${className}`}>
      {/* Header */}
      <header className="px-6 pt-6 pb-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-ceramic-text-primary text-etched">
              WhatsApp
            </h1>
            <p className="text-sm text-ceramic-text-secondary mt-1">
              Importe e analise suas conversas
            </p>
          </div>
        </div>

        <CeramicTabSelector
          tabs={tabs}
          activeTab={activeTab}
          onChange={(tabId) => setActiveTab(tabId as TabId)}
        />
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-6 pb-40">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'import' && renderImportTab()}
            {activeTab === 'contacts' && (isIntelligenceUnlocked ? renderContactsTab() : renderLockedState())}
            {activeTab === 'intelligence' && (isIntelligenceUnlocked ? renderIntelligenceTab() : renderLockedState())}
            {activeTab === 'analytics' && (isIntelligenceUnlocked ? renderAnalyticsTab() : renderLockedState())}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default ConnectionsWhatsAppTab;
