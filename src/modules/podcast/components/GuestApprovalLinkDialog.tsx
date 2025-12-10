import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Mail,
  MessageSquare,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  Send,
  Link as LinkIcon,
} from 'lucide-react';
import { supabase } from '@/services/supabaseClient';

interface GuestApprovalLinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  episodeId: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  onSuccess?: () => void;
}

export const GuestApprovalLinkDialog: React.FC<GuestApprovalLinkDialogProps> = ({
  isOpen,
  onClose,
  episodeId,
  guestName,
  guestEmail,
  guestPhone,
  onSuccess,
}) => {
  const [method, setMethod] = useState<'email' | 'whatsapp' | 'link'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [approvalLink, setApprovalLink] = useState<string | null>(null);
  const [approvalToken, setApprovalToken] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [sendStatus, setSendStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Generate a secure approval token
  const generateApprovalToken = async (): Promise<string> => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return token;
  };

  // Build the approval URL
  const buildApprovalUrl = (token: string): string => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/podcast/approval/${episodeId}/${token}`;
  };

  // Save approval token to database
  const saveApprovalToken = async (token: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('podcast_episodes')
        .update({
          approval_token: token,
          approval_token_created_at: new Date().toISOString(),
        })
        .eq('id', episodeId);

      if (error) {
        console.error('Error saving approval token:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error saving approval token:', error);
      return false;
    }
  };

  // Generate and send the approval link
  const handleGenerateLink = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setSendStatus('idle');

    try {
      // Generate token
      const token = await generateApprovalToken();
      setApprovalToken(token);

      // Save to database
      const saved = await saveApprovalToken(token);
      if (!saved) {
        throw new Error('Falha ao salvar token de aprovação');
      }

      // Build URL
      const url = buildApprovalUrl(token);
      setApprovalLink(url);

      // If sending via email/whatsapp, send now
      if (method !== 'link') {
        await sendApprovalMessage(url, token);
      }

      setSendStatus('success');
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error generating approval link:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Erro ao gerar link');
      setSendStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Send approval message via email or WhatsApp
  const sendApprovalMessage = async (url: string, token: string) => {
    try {
      // Call edge function or API to send message
      const response = await fetch('/api/podcast/send-approval-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          episodeId,
          guestName,
          guestEmail: method === 'email' ? guestEmail : undefined,
          guestPhone: method === 'whatsapp' ? guestPhone : undefined,
          approvalUrl: url,
          approvalToken: token,
          method,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro ao enviar mensagem: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Erro ao enviar mensagem');
      }
    } catch (error) {
      console.error('Error sending approval message:', error);
      throw error;
    }
  };

  // Copy link to clipboard
  const handleCopyLink = () => {
    if (approvalLink) {
      navigator.clipboard.writeText(approvalLink);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Send generated link via selected method
  const handleSendLink = async () => {
    if (!approvalLink || !approvalToken) return;

    setIsLoading(true);
    try {
      await sendApprovalMessage(approvalLink, approvalToken);
      setSendStatus('success');
    } catch (error) {
      console.error('Error sending approval link:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Erro ao enviar');
      setSendStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <LinkIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-bold text-ceramic-text-primary">
                    Enviar Aprovação
                  </h2>
                  <p className="text-xs text-ceramic-text-secondary">
                    para {guestName}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-ceramic-text-tertiary" />
              </button>
            </div>

            {/* Main Content */}
            {!approvalLink ? (
              <div className="space-y-4">
                {/* Method Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-ceramic-text-primary">
                    Como deseja enviar o link?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'email' as const, label: 'Email', icon: Mail, available: !!guestEmail },
                      { id: 'whatsapp' as const, label: 'WhatsApp', icon: MessageSquare, available: !!guestPhone },
                      { id: 'link' as const, label: 'Link', icon: LinkIcon, available: true },
                    ].map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setMethod(option.id)}
                        disabled={!option.available}
                        className={`py-2 px-3 rounded-lg flex flex-col items-center gap-1 text-xs font-medium transition-all ${
                          method === option.id
                            ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                            : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                        } ${!option.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <option.icon className="w-4 h-4" />
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {method === 'email' && !guestEmail && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Email do convidado não disponível
                    </p>
                  )}
                  {method === 'whatsapp' && !guestPhone && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Telefone do convidado não disponível
                    </p>
                  )}
                </div>

                {/* Info Message */}
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-700">
                    <strong>O que acontecerá:</strong> Um link de aprovação será gerado e enviado para o convidado revisar sua biografia, ficha técnica e possíveis controvérsias.
                  </p>
                </div>

                {/* Error Message */}
                {errorMessage && (
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700">{errorMessage}</p>
                  </div>
                )}

                {/* Action Button */}
                <button
                  onClick={handleGenerateLink}
                  disabled={isLoading || (method === 'email' && !guestEmail) || (method === 'whatsapp' && !guestPhone)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Gerar e Enviar Link
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Success State */}
                {sendStatus === 'success' && (
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-center">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                      <Check className="w-6 h-6 text-green-600" />
                    </div>
                    <p className="text-sm font-bold text-green-700 mb-1">
                      Link enviado com sucesso!
                    </p>
                    <p className="text-xs text-green-600">
                      {method === 'email' && `Email enviado para ${guestEmail}`}
                      {method === 'whatsapp' && `Mensagem será enviada para ${guestPhone}`}
                      {method === 'link' && 'Link copiado e pronto para compartilhar'}
                    </p>
                  </div>
                )}

                {/* Error State */}
                {sendStatus === 'error' && (
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-red-700 mb-1">Erro ao enviar</p>
                        <p className="text-xs text-red-600">{errorMessage}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Link Display */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-ceramic-text-secondary">
                    Link de Aprovação:
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-50 p-2 rounded-lg border border-gray-200 overflow-hidden">
                      <p className="text-xs text-gray-600 truncate font-mono">
                        {approvalLink}
                      </p>
                    </div>
                    <button
                      onClick={handleCopyLink}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                      title="Copiar link"
                    >
                      {isCopied ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-ceramic-text-tertiary" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Send Options (if link-only method) */}
                {method === 'link' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-ceramic-text-secondary">
                      Ou enviar agora via:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setMethod('email');
                          handleSendLink();
                        }}
                        disabled={!guestEmail || isLoading}
                        className="py-2 px-3 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200 hover:bg-blue-100 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                      >
                        <Mail className="w-3 h-3" />
                        Email
                      </button>
                      <button
                        onClick={() => {
                          setMethod('whatsapp');
                          handleSendLink();
                        }}
                        disabled={!guestPhone || isLoading}
                        className="py-2 px-3 rounded-lg bg-green-50 text-green-700 text-xs font-medium border border-green-200 hover:bg-green-100 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3" />
                        WhatsApp
                      </button>
                    </div>
                  </div>
                )}

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="w-full py-2 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
                >
                  Fechar
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
