/**
 * ConnectionsWhatsAppTab - Main WhatsApp Analytics View
 *
 * Privacy-first WhatsApp integration dashboard with emotional analytics,
 * LGPD consent management, and connection status.
 *
 * Features:
 * - Tab navigation (Overview, Consent, Analytics)
 * - Connection status with QR code
 * - LGPD consent management
 * - Emotional thermometer visualization
 * - Contact insights and sentiment scores
 * - Topic clustering and anomaly alerts
 *
 * Related: Issue #12 - Privacy-First WhatsApp Integration, Task 3.4
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Shield,
  TrendingUp,
  Users,
  Bell,
  Loader2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { CeramicTabSelector } from '@/components/ui';
import {
  ConnectionStatusCard,
  ConsentManager,
  EmotionalThermometer,
} from '../components/whatsapp';
import whatsappAnalyticsService, {
  ContactSentimentScore,
  AnomalyAlert,
} from '@/services/whatsappAnalyticsService';
import { staggerContainer, staggerItem } from '@/lib/animations/ceramic-motion';
import { useWhatsAppGamification } from '../hooks/useWhatsAppGamification';

// ============================================================================
// TYPES
// ============================================================================

type TabId = 'overview' | 'consent' | 'analytics';

interface ConnectionsWhatsAppTabProps {
  userId?: string;
  className?: string;
}

// ============================================================================
// CONTACT INSIGHT CARD COMPONENT
// ============================================================================

interface ContactInsightCardProps {
  contact: ContactSentimentScore;
  onClick?: () => void;
}

const ContactInsightCard: React.FC<ContactInsightCardProps> = ({ contact, onClick }) => {
  const getSentimentColor = (sentiment: number): string => {
    if (sentiment >= 0.3) return '#6B7B5C'; // Positive
    if (sentiment >= -0.3) return '#D4AF37'; // Neutral
    return '#9B4D3A'; // Negative
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
            style={{ backgroundColor: `${getSentimentColor(contact.overallSentiment)}20` }}
          >
            <Users className="w-5 h-5" style={{ color: getSentimentColor(contact.overallSentiment) }} />
          </div>
          <div>
            <p className="text-sm font-bold text-ceramic-text-primary">
              Contato {contact.contactHash.substring(0, 8)}...
            </p>
            <p className="text-xs text-ceramic-text-secondary">
              {contact.totalMessages} mensagens
            </p>
          </div>
        </div>
        <div className="text-right">
          <p
            className="text-lg font-bold"
            style={{ color: getSentimentColor(contact.overallSentiment) }}
          >
            {contact.overallSentiment.toFixed(2)}
          </p>
          <p className="text-xs text-ceramic-text-secondary">
            {getSentimentLabel(contact.overallSentiment)}
          </p>
        </div>
      </div>

      {/* Top Topics */}
      {contact.topTopics && contact.topTopics.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {contact.topTopics.slice(0, 3).map((topic, idx) => (
            <span
              key={idx}
              className="px-2 py-1 bg-ceramic-inset rounded text-xs text-ceramic-text-secondary"
            >
              {topic}
            </span>
          ))}
        </div>
      )}

      {/* Trend and Anomalies */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-ceramic-text-secondary">
          Tendência: <span className="font-bold">{contact.trend}</span>
        </span>
        {contact.recentAnomalies > 0 && (
          <span className="flex items-center gap-1 text-ceramic-accent">
            <Bell className="w-3 h-3" />
            {contact.recentAnomalies} alertas
          </span>
        )}
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
      case 'spike_positive':
        return '#6B7B5C';
      case 'spike_negative':
        return '#9B4D3A';
      case 'volume_surge':
        return '#D97706';
      default:
        return '#9CA3AF';
    }
  };

  return (
    <div className="ceramic-inset p-4 rounded-xl">
      <div className="flex items-start gap-3">
        <div
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${getAnomalyColor(alert.anomalyType)}20` }}
        >
          <AlertTriangle
            className="w-5 h-5"
            style={{ color: getAnomalyColor(alert.anomalyType) }}
          />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-ceramic-text-primary mb-1">
            {alert.description}
          </p>
          <p className="text-xs text-ceramic-text-secondary">
            {new Date(alert.date).toLocaleDateString('pt-BR')} • Contato:{' '}
            {alert.contactHash.substring(0, 8)}...
          </p>
          <div className="flex items-center gap-4 mt-2 text-xs">
            <span className="text-ceramic-text-secondary">
              Sentimento: <span className="font-bold">{alert.avgSentiment.toFixed(2)}</span>
            </span>
            <span className="text-ceramic-text-secondary">
              Mensagens: <span className="font-bold">{alert.messageCount}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ConnectionsWhatsAppTab: React.FC<ConnectionsWhatsAppTabProps> = ({
  userId,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [contacts, setContacts] = useState<ContactSentimentScore[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyAlert[]>([]);
  const [selectedContactHash, setSelectedContactHash] = useState<string | null>(null);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isLoadingAnomalies, setIsLoadingAnomalies] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Gamification tracking
  const { trackAnalyticsView, trackContactAnalysis } = useWhatsAppGamification();

  // Tab configuration
  const tabs = [
    { id: 'overview', label: 'Visão Geral' },
    { id: 'consent', label: 'Consentimento' },
    { id: 'analytics', label: 'Analytics' },
  ];

  // Load contacts on mount
  useEffect(() => {
    loadContacts();
    loadAnomalies();
  }, []);

  // Track analytics view when tab changes to 'analytics'
  useEffect(() => {
    if (activeTab === 'analytics') {
      trackAnalyticsView();
    }
  }, [activeTab, trackAnalyticsView]);

  const loadContacts = async () => {
    setIsLoadingContacts(true);
    setError(null);

    try {
      const contactsList = await whatsappAnalyticsService.getContactsList();
      setContacts(contactsList);

      // Auto-select first contact for thermometer
      if (contactsList.length > 0 && !selectedContactHash) {
        setSelectedContactHash(contactsList[0].contactHash);
      }
    } catch (err) {
      console.error('[ConnectionsWhatsAppTab] Error loading contacts:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar contatos');
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
      console.error('[ConnectionsWhatsAppTab] Error loading anomalies:', err);
    } finally {
      setIsLoadingAnomalies(false);
    }
  };

  // Handle contact selection with gamification tracking
  const handleContactSelect = async (contactHash: string) => {
    setSelectedContactHash(contactHash);
    await trackContactAnalysis(contactHash);
  };

  // Render loading state
  const renderLoading = () => (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="w-8 h-8 animate-spin text-ceramic-accent" />
    </div>
  );

  // Render error state
  const renderError = () => (
    <div className="ceramic-card p-8 rounded-3xl text-center">
      <AlertTriangle className="w-12 h-12 text-ceramic-negative mx-auto mb-4" />
      <h3 className="text-lg font-bold text-ceramic-text-primary mb-2">
        Erro ao carregar dados
      </h3>
      <p className="text-sm text-ceramic-text-secondary mb-4">{error}</p>
      <button
        onClick={loadContacts}
        className="ceramic-card px-6 py-3 rounded-xl font-bold text-ceramic-accent hover:scale-105 active:scale-95 transition-transform"
      >
        Tentar novamente
      </button>
    </div>
  );

  // Render empty state
  const renderEmptyState = () => (
    <motion.div
      className="ceramic-tray p-12 rounded-3xl text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="ceramic-inset w-24 h-24 flex items-center justify-center mx-auto mb-6 bg-blue-50">
        <MessageSquare className="w-12 h-12 text-ceramic-accent" />
      </div>
      <h3 className="text-xl font-bold text-ceramic-text-primary mb-3">
        Conecte seu WhatsApp
      </h3>
      <p className="text-sm text-ceramic-text-secondary max-w-md mx-auto mb-6">
        Escaneie o QR Code na seção "Visão Geral" para começar a analisar suas conversas
        de forma privada e segura.
      </p>
      <p className="text-xs text-ceramic-text-secondary">
        🔒 Armazenamos apenas embeddings vetoriais, nunca mensagens completas
      </p>
    </motion.div>
  );

  // Render Overview Tab
  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Connection Status */}
      <ConnectionStatusCard showQRCode={true} autoRefresh={true} />

      {/* Recent Anomalies */}
      {anomalies.length > 0 && (
        <div className="ceramic-card p-6 rounded-3xl space-y-4">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-ceramic-accent" />
            <h3 className="text-lg font-bold text-ceramic-text-primary">
              Alertas Recentes
            </h3>
            <span className="text-xs text-ceramic-text-secondary">
              (Últimos 7 dias)
            </span>
          </div>

          {isLoadingAnomalies ? (
            renderLoading()
          ) : (
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
              <Users className="w-5 h-5 text-ceramic-accent" />
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
                key={contact.contactHash}
                contact={contact}
                onClick={() => {
                  handleContactSelect(contact.contactHash);
                  setActiveTab('analytics');
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Render Consent Tab
  const renderConsentTab = () => (
    <div className="space-y-6">
      <div className="ceramic-card p-6 rounded-3xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="ceramic-concave p-4 rounded-xl">
            <Shield className="w-6 h-6 text-ceramic-accent" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-ceramic-text-primary">
              Gestão de Consentimento LGPD
            </h2>
            <p className="text-sm text-ceramic-text-secondary">
              Controle como seus dados do WhatsApp são processados
            </p>
          </div>
        </div>

        {/* Privacy Guarantee Notice */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl mb-6">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-blue-900 mb-1">
                Privacidade Garantida
              </p>
              <p className="text-xs text-blue-800">
                Armazenamos apenas embeddings vetoriais e agregados estatísticos.
                Suas mensagens NUNCA são salvas no sistema.
              </p>
            </div>
          </div>
        </div>

        {/* Select contact for consent management */}
        {contacts.length > 0 ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-ceramic-text-primary mb-2 block">
                Selecione um contato:
              </label>
              <select
                value={selectedContactHash || ''}
                onChange={(e) => setSelectedContactHash(e.target.value)}
                className="w-full ceramic-inset px-4 py-3 rounded-xl text-sm font-bold text-ceramic-text-primary bg-transparent border-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ceramic-accent"
              >
                <option value="">Selecione...</option>
                {contacts.map(contact => (
                  <option key={contact.contactHash} value={contact.contactHash}>
                    Contato {contact.contactHash.substring(0, 16)}... ({contact.totalMessages}{' '}
                    mensagens)
                  </option>
                ))}
              </select>
            </div>

            {selectedContactHash && (
              <ConsentManager
                contactPhone={selectedContactHash}
                contactName={`Contato ${selectedContactHash.substring(0, 8)}`}
              />
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-ceramic-text-secondary">
              Nenhum contato disponível. Conecte seu WhatsApp primeiro.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // Render Analytics Tab
  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      {/* Emotional Thermometer */}
      {selectedContactHash ? (
        <EmotionalThermometer
          contactHash={selectedContactHash}
          contactName={`Contato ${selectedContactHash.substring(0, 8)}`}
          defaultTimeWindow="week"
          showTimeWindowSelector={true}
          height={400}
        />
      ) : (
        <div className="ceramic-card p-12 rounded-3xl text-center">
          <TrendingUp className="w-12 h-12 text-ceramic-text-secondary mx-auto mb-4" />
          <p className="text-sm text-ceramic-text-secondary">
            Selecione um contato abaixo para visualizar o termômetro emocional
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
          <span className="text-xs text-ceramic-text-secondary">
            ({contacts.length})
          </span>
        </div>

        {isLoadingContacts ? (
          renderLoading()
        ) : contacts.length === 0 ? (
          renderEmptyState()
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {contacts.map(contact => (
              <motion.div key={contact.contactHash} variants={staggerItem}>
                <ContactInsightCard
                  contact={contact}
                  onClick={() => handleContactSelect(contact.contactHash)}
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
              WhatsApp Analytics
            </h1>
            <p className="text-sm text-ceramic-text-secondary mt-1">
              Insights emocionais das suas conversas
            </p>
          </div>
        </div>

        {/* Tab Selector */}
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
            {error && activeTab !== 'overview' ? (
              renderError()
            ) : (
              <>
                {activeTab === 'overview' && renderOverviewTab()}
                {activeTab === 'consent' && renderConsentTab()}
                {activeTab === 'analytics' && renderAnalyticsTab()}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default ConnectionsWhatsAppTab;
