/**
 * ConsentManager Component
 *
 * LGPD-compliant consent management UI for WhatsApp data processing.
 * Allows users to grant/revoke consent for different types of data processing
 * and request data deletion.
 *
 * Related: Issue #12 - Privacy-First WhatsApp Integration
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Check,
  X,
  Info,
  Trash2,
  History as HistoryIcon,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import whatsappConsentService from '@/services/whatsappConsentService';
import { useWhatsAppGamification } from '../../hooks/useWhatsAppGamification';
import type { ConsentType, ConsentRecord } from '@/types/whatsapp';
import { ConfirmationModal } from '@/components/ui';
import { cardElevationVariants } from '@/lib/animations/ceramic-motion';
import { createNamespacedLogger } from '@/lib/logger';
const log = createNamespacedLogger('ConsentManager');

// ============================================================================
// TYPES
// ============================================================================

interface ConsentManagerProps {
  contactPhone: string;
  contactName?: string;
  onConsentChange?: (consentType: ConsentType, granted: boolean) => void;
  className?: string;
}

interface ConsentToggleState {
  data_collection: boolean;
  ai_processing: boolean;
  sentiment_analysis: boolean;
  notifications: boolean;
  data_retention: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CONSENT_TYPES: ConsentType[] = [
  'data_collection',
  'ai_processing',
  'sentiment_analysis',
  'notifications',
  'data_retention',
];

const CONSENT_LABELS: Record<ConsentType, string> = {
  data_collection: 'Coletar e Processar Mensagens',
  ai_processing: 'Análise com IA (Embeddings)',
  sentiment_analysis: 'Análise de Sentimento',
  notifications: 'Enviar Notificações',
  data_retention: 'Reter Dados Históricos',
  third_party_sharing: 'Compartilhar com Terceiros',
};

const CONSENT_DESCRIPTIONS: Record<ConsentType, string> = {
  data_collection: 'Permitir que o AICA processe suas mensagens do WhatsApp',
  ai_processing: 'Gerar embeddings vetoriais para análise semântica (sem texto bruto)',
  sentiment_analysis: 'Analisar o sentimento das suas conversas',
  notifications: 'Receber notificações sobre insights e alertas',
  data_retention: 'Manter histórico de análises e agregados',
  third_party_sharing: 'Compartilhar dados anonimizados para pesquisa',
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Individual consent toggle switch
 */
interface ConsentToggleProps {
  consentType: ConsentType;
  isGranted: boolean;
  onToggle: () => void;
  disabled: boolean;
}

const ConsentToggle: React.FC<ConsentToggleProps> = ({
  consentType,
  isGranted,
  onToggle,
  disabled,
}) => {
  return (
    <motion.div
      className="ceramic-card p-4 flex items-center justify-between rounded-xl"
      variants={cardElevationVariants}
      initial="rest"
      whileHover="hover"
      whileTap="pressed"
    >
      <div className="flex-1 pr-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-bold text-ceramic-text-primary cursor-pointer">
            {CONSENT_LABELS[consentType]}
          </label>
          {isGranted && (
            <Check className="w-4 h-4 text-ceramic-positive" />
          )}
        </div>
        <p className="text-xs text-ceramic-text-secondary mt-1">
          {CONSENT_DESCRIPTIONS[consentType]}
        </p>
      </div>

      <button
        onClick={onToggle}
        disabled={disabled}
        className={`
          relative inline-flex h-8 w-14 items-center rounded-full
          transition-colors duration-200
          ${isGranted ? 'bg-ceramic-positive' : 'bg-ceramic-cool'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        aria-label={`Toggle ${CONSENT_LABELS[consentType]}`}
      >
        <span
          className={`
            inline-block h-6 w-6 transform rounded-full bg-white
            transition-transform duration-200
            ${isGranted ? 'translate-x-7' : 'translate-x-1'}
          `}
        />
      </button>
    </motion.div>
  );
};

/**
 * Privacy notice information card
 */
const PrivacyNotice: React.FC = () => {
  return (
    <div className="p-4 bg-ceramic-info/10 border border-ceramic-info/20 rounded-xl">
      <div className="flex items-start gap-3">
        <div className="ceramic-concave w-10 h-10 flex items-center justify-center rounded-lg flex-shrink-0">
          <Shield className="w-5 h-5 text-ceramic-accent" />
        </div>
        <div>
          <p className="text-sm text-ceramic-text-primary font-bold mb-2">
            🔒 Privacidade Garantida
          </p>
          <ul className="text-xs text-ceramic-info space-y-1">
            <li>• Armazenamos apenas embeddings vetoriais, NUNCA mensagens completas</li>
            <li>• Seus dados são criptografados com SHA256</li>
            <li>• Você pode revogar consentimento a qualquer momento</li>
            <li>• Processamento compatível com LGPD (Lei Geral de Proteção de Dados)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

/**
 * Consent history timeline item
 */
interface ConsentHistoryItemProps {
  record: ConsentRecord;
}

const ConsentHistoryItem: React.FC<ConsentHistoryItemProps> = ({ record }) => {
  const isGranted = record.status === 'granted';
  const date = new Date(record.updated_at);
  const formattedDate = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="ceramic-inset p-3 rounded-lg flex items-start gap-3">
      <div className={`
        ceramic-concave w-8 h-8 flex items-center justify-center rounded-full
        ${isGranted ? 'bg-ceramic-success/10' : 'bg-ceramic-error/10'}
      `}>
        {isGranted ? (
          <Check className="w-4 h-4 text-ceramic-positive" />
        ) : (
          <X className="w-4 h-4 text-ceramic-negative" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold text-ceramic-text-primary">
            {CONSENT_LABELS[record.consent_type as ConsentType]}
          </p>
          <span className={`
            text-xs px-2 py-0.5 rounded-full font-medium
            ${isGranted ? 'bg-ceramic-success/15 text-ceramic-success' : 'bg-ceramic-error/15 text-ceramic-error'}
          `}>
            {isGranted ? 'Concedido' : 'Revogado'}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-ceramic-text-secondary">
          <Clock className="w-3 h-3" />
          <span>{formattedDate}</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ConsentManager: React.FC<ConsentManagerProps> = ({
  contactPhone,
  contactName,
  onConsentChange,
  className = '',
}) => {
  // State for consent toggles
  const [consentStates, setConsentStates] = useState<ConsentToggleState>({
    data_collection: false,
    ai_processing: false,
    sentiment_analysis: false,
    notifications: false,
    data_retention: false,
  });

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // History state
  const [showHistory, setShowHistory] = useState(false);
  const [consentHistory, setConsentHistory] = useState<ConsentRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Deletion modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Gamification tracking
  const { trackConsentGrant } = useWhatsAppGamification();

  // ============================================================================
  // LOAD CONSENT STATUS
  // ============================================================================

  const loadConsentStatus = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Load consent status for all types
      const statusPromises = CONSENT_TYPES.map(type =>
        whatsappConsentService.getConsentStatus(contactPhone, type)
      );

      const results = await Promise.all(statusPromises);

      // Update state with results
      const newStates: ConsentToggleState = {
        data_collection: results[0].granted,
        ai_processing: results[1].granted,
        sentiment_analysis: results[2].granted,
        notifications: results[3].granted,
        data_retention: results[4].granted,
      };

      setConsentStates(newStates);
    } catch (error) {
      log.error('[ConsentManager] Failed to load consent status:', error);
      setErrorMessage('Erro ao carregar status de consentimento');
    } finally {
      setIsLoading(false);
    }
  };

  // Load on mount and when contactPhone changes
  useEffect(() => {
    loadConsentStatus();
  }, [contactPhone]);

  // ============================================================================
  // LOAD CONSENT HISTORY
  // ============================================================================

  const loadConsentHistory = async () => {
    setIsLoadingHistory(true);

    try {
      const history = await whatsappConsentService.getConsentHistory(contactPhone);
      setConsentHistory(history.slice(0, 10)); // Show last 10 records
    } catch (error) {
      log.error('[ConsentManager] Failed to load history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Load history when expanding
  useEffect(() => {
    if (showHistory && consentHistory.length === 0) {
      loadConsentHistory();
    }
  }, [showHistory]);

  // ============================================================================
  // AUTO-CLEAR SUCCESS MESSAGE
  // ============================================================================

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // ============================================================================
  // TOGGLE CONSENT HANDLER
  // ============================================================================

  const handleToggleConsent = async (consentType: ConsentType) => {
    const isCurrentlyGranted = consentStates[consentType];
    setIsSaving(true);
    setErrorMessage(null);

    try {
      if (isCurrentlyGranted) {
        // Revoke consent
        await whatsappConsentService.revokeConsent(contactPhone, consentType);
        setConsentStates(prev => ({ ...prev, [consentType]: false }));
        setSuccessMessage(`Consentimento "${CONSENT_LABELS[consentType]}" revogado`);
      } else {
        // Grant consent
        await whatsappConsentService.grantConsent({
          contactPhone,
          contactName,
          consentType,
          consentMethod: 'web_form',
        });
        setConsentStates(prev => ({ ...prev, [consentType]: true }));

        // Award XP and check for badges
        await trackConsentGrant(consentType);

        setSuccessMessage(`Consentimento "${CONSENT_LABELS[consentType]}" concedido +20 XP ✨`);
      }

      // Trigger callback
      onConsentChange?.(consentType, !isCurrentlyGranted);

      // Reload history if visible
      if (showHistory) {
        loadConsentHistory();
      }
    } catch (error) {
      log.error('[ConsentManager] Toggle consent error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Erro ao atualizar consentimento');
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================================
  // DATA DELETION HANDLER
  // ============================================================================

  const handleRequestDeletion = async () => {
    setShowDeleteModal(false);
    setIsSaving(true);
    setErrorMessage(null);

    try {
      await whatsappConsentService.requestDataDeletion({
        contactPhone,
        requestType: 'partial_deletion',
        dataTypes: ['messages', 'embeddings'],
      });

      setSuccessMessage('Solicitação de exclusão criada. Dados serão removidos em 72 horas.');
    } catch (error) {
      log.error('[ConsentManager] Data deletion error:', error);
      setErrorMessage('Erro ao solicitar exclusão de dados');
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="ceramic-concave p-4 rounded-xl">
          <Shield className="w-6 h-6 text-ceramic-accent" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-ceramic-text-primary">
            Consentimento LGPD
          </h2>
          <p className="text-sm text-ceramic-text-secondary mt-1">
            Gerencie como processamos seus dados do WhatsApp
          </p>
        </div>
      </div>

      {/* Status Messages */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-ceramic-success/10 border border-ceramic-success/20 rounded-xl"
          >
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-ceramic-success" />
              <p className="text-sm text-ceramic-success font-medium">{successMessage}</p>
            </div>
          </motion.div>
        )}

        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-ceramic-error/10 border border-ceramic-error/20 rounded-xl"
          >
            <div className="flex items-center gap-2">
              <X className="w-5 h-5 text-ceramic-error" />
              <p className="text-sm text-ceramic-error font-medium">{errorMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      {isLoading ? (
        <div className="ceramic-card p-8 rounded-xl flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-ceramic-accent/30 border-t-ceramic-accent rounded-full animate-spin" />
          <p className="ml-3 text-ceramic-text-secondary">Carregando configurações...</p>
        </div>
      ) : (
        <>
          {/* Consent Toggles Section */}
          <div className="space-y-3">
            {CONSENT_TYPES.map(type => (
              <ConsentToggle
                key={type}
                consentType={type}
                isGranted={consentStates[type]}
                onToggle={() => handleToggleConsent(type)}
                disabled={isSaving}
              />
            ))}
          </div>

          {/* Privacy Notice */}
          <PrivacyNotice />

          {/* Consent History (Expandable) */}
          <div className="ceramic-card p-4 rounded-xl">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <HistoryIcon className="w-5 h-5 text-ceramic-accent" />
                <span className="text-sm font-bold text-ceramic-text-primary">
                  Histórico de Alterações
                </span>
              </div>
              {showHistory ? (
                <ChevronUp className="w-5 h-5 text-ceramic-text-secondary" />
              ) : (
                <ChevronDown className="w-5 h-5 text-ceramic-text-secondary" />
              )}
            </button>

            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 space-y-2 overflow-hidden"
                >
                  {isLoadingHistory ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="w-6 h-6 border-4 border-ceramic-accent/30 border-t-ceramic-accent rounded-full animate-spin" />
                    </div>
                  ) : consentHistory.length === 0 ? (
                    <p className="text-xs text-ceramic-text-secondary text-center py-4">
                      Nenhum histórico disponível
                    </p>
                  ) : (
                    consentHistory.map(record => (
                      <ConsentHistoryItem key={record.id} record={record} />
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Data Deletion Request */}
          <motion.button
            onClick={() => setShowDeleteModal(true)}
            disabled={isSaving}
            className="
              w-full ceramic-card px-6 py-4 rounded-xl
              bg-ceramic-negative text-white font-bold
              hover:scale-105 active:scale-95
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all flex items-center justify-center gap-2
            "
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Trash2 className="w-5 h-5" />
            Solicitar Exclusão de Dados (72h)
          </motion.button>
        </>
      )}

      {/* Deletion Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onConfirm={handleRequestDeletion}
        onCancel={() => setShowDeleteModal(false)}
        title="Solicitar Exclusão de Dados?"
        message={`Todos os seus dados relacionados ao contato ${contactName || contactPhone} serão permanentemente excluídos em 72 horas. Esta ação não pode ser desfeita.`}
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        variant="danger"
        icon={AlertTriangle}
      />
    </div>
  );
};

export default ConsentManager;
