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
import {
  sendApprovalLink,
  getOrCreateApprovalToken,
  validateEmail,
  validatePhoneNumber,
  formatPhoneForWhatsApp,
  ApprovalTokenData,
} from '@/services/guestApprovalService';

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
      console.error('Error loading approval token:', error);
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
      console.error('Error sending approval link:', error);
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
        console.error('Failed to copy URL:', error);
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
          className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-t-2xl relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold mb-1">Enviar Link de Aprovação</h2>
            <p className="text-blue-100 text-sm">
              Para <span className="font-semibold">{guestName}</span>
            </p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Loading Token State */}
            {isLoadingToken && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <span className="ml-3 text-gray-600">Gerando link...</span>
              </div>
            )}

            {/* Error Loading Token */}
            {!isLoadingToken && !approvalToken && submitState.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-900">Erro ao gerar link</p>
                  <p className="text-xs text-red-700 mt-1">{submitState.error}</p>
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
                    className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3"
                  >
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-900">
                        Link enviado com sucesso!
                      </p>
                      <p className="text-xs text-green-700 mt-1">
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
                    className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3"
                  >
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-900">Erro ao enviar</p>
                      <p className="text-xs text-red-700 mt-1">{submitState.error}</p>
                    </div>
                  </motion.div>
                )}

                {/* Method Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Método de Envio
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Email Option */}
                    <button
                      onClick={() => handleMethodSelect('email')}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        formState.method === 'email'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <Mail
                        className={`w-6 h-6 ${formState.method === 'email' ? 'text-blue-600' : 'text-gray-400'}`}
                      />
                      <span
                        className={`text-sm font-medium ${formState.method === 'email' ? 'text-blue-900' : 'text-gray-700'}`}
                      >
                        Email
                      </span>
                    </button>

                    {/* WhatsApp Option */}
                    <button
                      onClick={() => handleMethodSelect('whatsapp')}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        formState.method === 'whatsapp'
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                      }`}
                    >
                      <MessageCircle
                        className={`w-6 h-6 ${formState.method === 'whatsapp' ? 'text-green-600' : 'text-gray-400'}`}
                      />
                      <span
                        className={`text-sm font-medium ${formState.method === 'whatsapp' ? 'text-green-900' : 'text-gray-700'}`}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email do Convidado
                    </label>
                    <input
                      type="email"
                      value={formState.email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      placeholder="exemplo@email.com"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none text-gray-800"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telefone do Convidado
                    </label>
                    <input
                      type="tel"
                      value={formState.phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent outline-none text-gray-800"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Formato aceito: (11) 99999-9999 ou 11999999999
                    </p>
                  </motion.div>
                )}

                {/* URL Preview */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Link de Aprovação
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={approvalToken.url}
                      readOnly
                      className="flex-1 p-2 bg-white border border-gray-300 rounded text-xs text-gray-600 font-mono"
                    />
                    <button
                      onClick={handleCopyUrl}
                      className="p-2 hover:bg-gray-200 rounded transition-all"
                      title="Copiar link"
                    >
                      {copiedUrl ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                    <button
                      onClick={handleOpenUrl}
                      className="p-2 hover:bg-gray-200 rounded transition-all"
                      title="Abrir em nova aba"
                    >
                      <ExternalLink className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Expira em: {new Date(approvalToken.expiresAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={onClose}
                    disabled={submitState.isSubmitting}
                    className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={!formState.method || submitState.isSubmitting || submitState.success}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
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
