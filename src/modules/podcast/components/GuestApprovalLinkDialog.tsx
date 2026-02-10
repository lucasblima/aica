/**
 * Guest Approval Link Dialog Component
 *
 * Modal dialog for sending guest approval links via email or WhatsApp.
 * Integrated with PreProductionHub workflow.
 *
 * Features:
 * - Method selection (Email/WhatsApp)
 * - Contact field validation
 * - Approval URL preview
 * - Success/error feedback
 * - Integration with send-guest-approval-link Edge Function
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Mail,
  MessageCircle,
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { createNamespacedLogger } from '@/lib/logger';
import {
  sendApprovalLink,
  getOrCreateApprovalToken,
  validateEmail,
  validatePhoneNumber,
  formatPhoneForWhatsApp,
  ApprovalTokenData,
} from '@/services/guestApprovalService';

const log = createNamespacedLogger('GuestApprovalLinkDialog');

// ============================================================================
// TYPES
// ============================================================================

interface GuestApprovalLinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  episodeId: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
}

type DeliveryMethod = 'email' | 'whatsapp';

interface FormState {
  method: DeliveryMethod | null;
  email: string;
  phone: string;
}

interface SubmitState {
  isSubmitting: boolean;
  success: boolean;
  error: string | null;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const GuestApprovalLinkDialog: React.FC<GuestApprovalLinkDialogProps> = ({
  isOpen,
  onClose,
  episodeId,
  guestName,
  guestEmail = '',
  guestPhone = '',
}) => {
  // State
  const [formState, setFormState] = useState<FormState>({
    method: null,
    email: guestEmail,
    phone: guestPhone,
  });

  const [submitState, setSubmitState] = useState<SubmitState>({
    isSubmitting: false,
    success: false,
    error: null,
  });

  const [approvalToken, setApprovalToken] = useState<ApprovalTokenData | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Load approval token when dialog opens
  useEffect(() => {
    if (isOpen && episodeId) {
      loadApprovalToken();
    }
  }, [isOpen, episodeId]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const loadApprovalToken = async () => {
    setIsLoadingToken(true);
    try {
      const token = await getOrCreateApprovalToken(episodeId);
      if (token) {
        setApprovalToken(token);
      } else {
        setSubmitState({
          isSubmitting: false,
          success: false,
          error: 'Falha ao gerar link de aprovação',
        });
      }
    } catch (error) {
      log.error('Error loading approval token:', error);
      setSubmitState({
        isSubmitting: false,
        success: false,
        error: 'Erro ao carregar link de aprovação',
      });
    } finally {
      setIsLoadingToken(false);
    }
  };

  const resetForm = () => {
    setFormState({
      method: null,
      email: guestEmail,
      phone: guestPhone,
    });
    setSubmitState({
      isSubmitting: false,
      success: false,
      error: null,
    });
    setApprovalToken(null);
    setCopiedUrl(false);
  };

  const handleMethodSelect = (method: DeliveryMethod) => {
    setFormState({ ...formState, method });
    setSubmitState({ isSubmitting: false, success: false, error: null });
  };

  const handleEmailChange = (email: string) => {
    setFormState({ ...formState, email });
  };

  const handlePhoneChange = (phone: string) => {
    setFormState({ ...formState, phone });
  };

  const validateForm = (): string | null => {
    if (!formState.method) {
      return 'Selecione um método de envio';
    }

    if (formState.method === 'email') {
      if (!formState.email.trim()) {
        return 'Email é obrigatório';
      }
      if (!validateEmail(formState.email)) {
        return 'Email inválido';
      }
    }

    if (formState.method === 'whatsapp') {
      if (!formState.phone.trim()) {
        return 'Telefone é obrigatório';
      }
      if (!validatePhoneNumber(formState.phone)) {
        return 'Telefone inválido. Use formato: (11) 99999-9999 ou 11999999999';
      }
    }

    return null;
  };

  const handleSend = async () => {
    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setSubmitState({
        isSubmitting: false,
        success: false,
        error: validationError,
      });
      return;
    }

    setSubmitState({ isSubmitting: true, success: false, error: null });

    try {
      const result = await sendApprovalLink({
        episodeId,
        guestName,
        guestEmail: formState.method === 'email' ? formState.email : undefined,
        guestPhone:
          formState.method === 'whatsapp'
            ? formatPhoneForWhatsApp(formState.phone)
            : undefined,
        method: formState.method!,
      });

      if (result.success) {
        setSubmitState({
          isSubmitting: false,
          success: true,
          error: null,
        });
      } else {
        setSubmitState({
          isSubmitting: false,
          success: false,
          error: result.error || 'Erro ao enviar link',
        });
      }
    } catch (error) {
      log.error('Error sending approval link:', error);
      setSubmitState({
        isSubmitting: false,
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao enviar link',
      });
    }
  };

  const handleCopyUrl = async () => {
    if (approvalToken?.url) {
      try {
        await navigator.clipboard.writeText(approvalToken.url);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      } catch (error) {
        log.error('Failed to copy URL:', error);
      }
    }
  };

  const handleOpenUrl = () => {
    if (approvalToken?.url) {
      window.open(approvalToken.url, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-ceramic-base rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-ceramic-accent to-ceramic-accent/80 text-white p-6 rounded-t-2xl relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-ceramic-base hover:bg-opacity-20 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold mb-1">Enviar Link de Aprovação</h2>
            <p className="text-white/80 text-sm">
              Para <span className="font-semibold">{guestName}</span>
            </p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Loading Token State */}
            {isLoadingToken && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 text-ceramic-accent animate-spin" />
                <span className="ml-3 text-ceramic-text-secondary">Gerando link...</span>
              </div>
            )}

            {/* Error Loading Token */}
            {!isLoadingToken && !approvalToken && submitState.error && (
              <div className="bg-ceramic-error/10 border border-ceramic-error/30 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-ceramic-error flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-ceramic-text-primary">Erro ao gerar link</p>
                  <p className="text-xs text-ceramic-error mt-1">{submitState.error}</p>
                </div>
              </div>
            )}

            {/* Main Form */}
            {!isLoadingToken && approvalToken && (
              <>
                {/* Success State */}
                {submitState.success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-ceramic-success/10 border border-ceramic-success/30 rounded-lg p-4 flex items-start gap-3"
                  >
                    <CheckCircle className="w-5 h-5 text-ceramic-success flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-ceramic-text-primary">
                        Link enviado com sucesso!
                      </p>
                      <p className="text-xs text-ceramic-success mt-1">
                        O convidado receberá o link para aprovação via {formState.method}.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Error State */}
                {submitState.error && !submitState.success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-ceramic-error/10 border border-ceramic-error/30 rounded-lg p-4 flex items-start gap-3"
                  >
                    <AlertCircle className="w-5 h-5 text-ceramic-error flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-ceramic-text-primary">Erro ao enviar</p>
                      <p className="text-xs text-ceramic-error mt-1">{submitState.error}</p>
                    </div>
                  </motion.div>
                )}

                {/* Method Selection */}
                <div>
                  <label className="block text-sm font-medium text-ceramic-text-primary mb-3">
                    Método de Envio
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Email Option */}
                    <button
                      onClick={() => handleMethodSelect('email')}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        formState.method === 'email'
                          ? 'border-ceramic-accent bg-ceramic-accent/10'
                          : 'border-ceramic-border hover:border-ceramic-accent/40 hover:bg-ceramic-cool'
                      }`}
                    >
                      <Mail
                        className={`w-6 h-6 ${formState.method === 'email' ? 'text-ceramic-accent' : 'text-ceramic-text-tertiary'}`}
                      />
                      <span
                        className={`text-sm font-medium ${formState.method === 'email' ? 'text-ceramic-text-primary' : 'text-ceramic-text-primary'}`}
                      >
                        Email
                      </span>
                    </button>

                    {/* WhatsApp Option */}
                    <button
                      onClick={() => handleMethodSelect('whatsapp')}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        formState.method === 'whatsapp'
                          ? 'border-ceramic-success bg-ceramic-success/10'
                          : 'border-ceramic-border hover:border-ceramic-success/40 hover:bg-ceramic-cool'
                      }`}
                    >
                      <MessageCircle
                        className={`w-6 h-6 ${formState.method === 'whatsapp' ? 'text-ceramic-success' : 'text-ceramic-text-tertiary'}`}
                      />
                      <span
                        className={`text-sm font-medium ${formState.method === 'whatsapp' ? 'text-ceramic-text-primary' : 'text-ceramic-text-primary'}`}
                      >
                        WhatsApp
                      </span>
                    </button>
                  </div>
                </div>

                {/* Email Field */}
                {formState.method === 'email' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label className="block text-sm font-medium text-ceramic-text-primary mb-2">
                      Email do Convidado
                    </label>
                    <input
                      type="email"
                      value={formState.email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      placeholder="exemplo@email.com"
                      className="w-full p-3 border border-ceramic-border rounded-lg focus:ring-2 focus:ring-ceramic-accent focus:border-transparent outline-none text-ceramic-text-primary"
                    />
                  </motion.div>
                )}

                {/* Phone Field */}
                {formState.method === 'whatsapp' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label className="block text-sm font-medium text-ceramic-text-primary mb-2">
                      Telefone do Convidado
                    </label>
                    <input
                      type="tel"
                      value={formState.phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full p-3 border border-ceramic-border rounded-lg focus:ring-2 focus:ring-ceramic-success focus:border-transparent outline-none text-ceramic-text-primary"
                    />
                    <p className="text-xs text-ceramic-text-secondary mt-1">
                      Formato aceito: (11) 99999-9999 ou 11999999999
                    </p>
                  </motion.div>
                )}

                {/* URL Preview */}
                <div className="bg-ceramic-cool rounded-lg p-4 border border-ceramic-border">
                  <label className="block text-sm font-medium text-ceramic-text-primary mb-2">
                    Link de Aprovação
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={approvalToken.url}
                      readOnly
                      className="flex-1 p-2 bg-ceramic-base border border-ceramic-border rounded text-xs text-ceramic-text-secondary font-mono"
                    />
                    <button
                      onClick={handleCopyUrl}
                      className="p-2 hover:bg-ceramic-cool rounded transition-all"
                      title="Copiar link"
                    >
                      {copiedUrl ? (
                        <CheckCircle className="w-4 h-4 text-ceramic-success" />
                      ) : (
                        <Copy className="w-4 h-4 text-ceramic-text-secondary" />
                      )}
                    </button>
                    <button
                      onClick={handleOpenUrl}
                      className="p-2 hover:bg-ceramic-cool rounded transition-all"
                      title="Abrir em nova aba"
                    >
                      <ExternalLink className="w-4 h-4 text-ceramic-text-secondary" />
                    </button>
                  </div>
                  <p className="text-xs text-ceramic-text-secondary mt-2">
                    Expira em: {new Date(approvalToken.expiresAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={onClose}
                    disabled={submitState.isSubmitting}
                    className="flex-1 py-3 rounded-xl border-2 border-ceramic-border text-ceramic-text-primary font-medium hover:bg-ceramic-cool disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={!formState.method || submitState.isSubmitting || submitState.success}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-ceramic-accent to-ceramic-accent/80 text-white font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {submitState.isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Enviando...
                      </>
                    ) : submitState.success ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Enviado
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Enviar
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GuestApprovalLinkDialog;
