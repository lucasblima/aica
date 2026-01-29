/**
 * InviteModal Component
 *
 * Modal for managing and sharing invites.
 * Shows invite count, generates links, and displays history.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Ticket,
  Copy,
  Share2,
  Check,
  Clock,
  UserPlus,
  Gift,
  Loader2,
  Trash2,
  Link2
} from 'lucide-react';
import { useInviteSystem } from '../../hooks/useInviteSystem';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InviteModal({ isOpen, onClose }: InviteModalProps) {
  const {
    stats,
    referrals,
    pendingInvites,
    loading,
    generating,
    revoking,
    currentUrl,
    hasInvites,
    availableCount,
    pendingCount,
    generateInvite,
    copyLink,
    shareLink,
    refreshReferrals,
    refreshPendingInvites,
    revokeInvite
  } = useInviteSystem();

  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPending, setShowPending] = useState(false);

  // Load referral history when showing history tab
  useEffect(() => {
    if (showHistory) {
      refreshReferrals();
    }
  }, [showHistory, refreshReferrals]);

  // Load pending invites when showing pending tab
  useEffect(() => {
    if (showPending) {
      refreshPendingInvites();
    }
  }, [showPending, refreshPendingInvites]);

  // Load pending invites on mount if modal is open
  useEffect(() => {
    if (isOpen) {
      refreshPendingInvites();
    }
  }, [isOpen, refreshPendingInvites]);

  // Reset copied state
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopy = async () => {
    const success = await copyLink();
    if (success) setCopied(true);
  };

  const handleShare = async () => {
    await shareLink();
  };

  const handleGenerateNew = async () => {
    await generateInvite();
  };

  const handleRevoke = async (referralId: string) => {
    const success = await revokeInvite(referralId);
    if (success) {
      // Refresh pending invites list
      refreshPendingInvites();
    }
  };

  const copyInviteUrl = async (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-md ceramic-card p-6 overflow-hidden"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-ceramic-cool transition-colors"
          >
            <X className="w-5 h-5 text-ceramic-text-secondary" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Ticket className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-ceramic-text-primary">
                Seus Convites
              </h2>
              <p className="text-sm text-ceramic-text-secondary">
                Convide amigos para o Aica
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="ceramic-concave p-3 text-center rounded-xl">
              <div className="text-2xl font-bold text-ceramic-accent">
                {stats?.available ?? 0}
              </div>
              <div className="text-xs text-ceramic-text-tertiary">Disponíveis</div>
            </div>
            <div className="ceramic-concave p-3 text-center rounded-xl">
              <div className="text-2xl font-bold text-ceramic-text-primary">
                {stats?.total_sent ?? 0}
              </div>
              <div className="text-xs text-ceramic-text-tertiary">Enviados</div>
            </div>
            <div className="ceramic-concave p-3 text-center rounded-xl">
              <div className="text-2xl font-bold text-green-500">
                {stats?.total_accepted ?? 0}
              </div>
              <div className="text-xs text-ceramic-text-tertiary">Aceitos</div>
            </div>
          </div>

          {/* Invite Link Section */}
          {hasInvites ? (
            <div className="space-y-4">
              {/* Link display */}
              {currentUrl ? (
                <div className="ceramic-concave p-3 rounded-xl">
                  <div className="text-xs text-ceramic-text-tertiary mb-1">
                    Seu link de convite:
                  </div>
                  <div className="text-sm text-ceramic-text-primary font-mono truncate">
                    {currentUrl}
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleGenerateNew}
                  disabled={generating}
                  className="w-full ceramic-card p-4 flex items-center justify-center gap-2 text-ceramic-accent hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                  {generating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Gift className="w-5 h-5" />
                  )}
                  <span className="font-bold">Gerar Link de Convite</span>
                </button>
              )}

              {/* Action buttons */}
              {currentUrl && (
                <div className="flex gap-3">
                  <button
                    onClick={handleCopy}
                    className="flex-1 ceramic-card p-3 flex items-center justify-center gap-2 text-ceramic-text-primary hover:scale-[1.02] active:scale-[0.98] transition-transform"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-green-500">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span className="text-sm font-medium">Copiar</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex-1 ceramic-card p-3 flex items-center justify-center gap-2 bg-ceramic-accent text-white hover:scale-[1.02] active:scale-[0.98] transition-transform"
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="text-sm font-bold">Compartilhar</span>
                  </button>
                </div>
              )}

              {/* Generate new button */}
              {currentUrl && availableCount > 0 && (
                <button
                  onClick={handleGenerateNew}
                  disabled={generating}
                  className="w-full text-sm text-ceramic-text-tertiary hover:text-ceramic-accent transition-colors disabled:opacity-50"
                >
                  {generating ? 'Gerando...' : `Gerar novo link (${availableCount} restantes)`}
                </button>
              )}
            </div>
          ) : (
            <div className="ceramic-concave p-6 rounded-xl text-center">
              <div className="text-4xl mb-2">😢</div>
              <div className="text-ceramic-text-primary font-bold mb-1">
                Sem convites disponíveis
              </div>
              <div className="text-sm text-ceramic-text-secondary">
                Você ganha +2 convites quando alguém aceita seu convite!
              </div>
            </div>
          )}

          {/* Bonus info */}
          <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Gift className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <div className="text-sm font-bold text-amber-800">
                  Bônus por indicação
                </div>
                <div className="text-xs text-amber-700">
                  Quando alguém aceita seu convite, você ganha{' '}
                  <strong>+50 XP</strong> e <strong>+2 convites</strong> extras!
                </div>
              </div>
            </div>
          </div>

          {/* Pending invites toggle */}
          {pendingCount > 0 && (
            <button
              onClick={() => setShowPending(!showPending)}
              className="w-full mt-4 text-sm text-ceramic-accent hover:text-ceramic-accent/80 transition-colors flex items-center justify-center gap-1 font-medium"
            >
              <Link2 className="w-3 h-3" />
              {showPending ? 'Ocultar links pendentes' : `Gerenciar links pendentes (${pendingCount})`}
            </button>
          )}

          {/* Pending invites list */}
          <AnimatePresence>
            {showPending && pendingCount > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                  <div className="text-xs text-ceramic-text-tertiary mb-2">
                    Delete um link para recuperar 1 convite na sua quota
                  </div>
                  {pendingInvites.map((invite) => (
                    <div
                      key={invite.id}
                      className="ceramic-concave p-3 rounded-lg flex items-center justify-between gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-ceramic-text-primary font-mono truncate">
                          .../{invite.invite_token.slice(-8)}
                        </div>
                        <div className="text-[10px] text-ceramic-text-tertiary">
                          Criado em {new Date(invite.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyInviteUrl(invite.invite_token)}
                          className="p-1.5 rounded-lg hover:bg-ceramic-cool transition-colors"
                          title="Copiar link"
                        >
                          <Copy className="w-3.5 h-3.5 text-ceramic-text-tertiary" />
                        </button>
                        <button
                          onClick={() => handleRevoke(invite.id)}
                          disabled={revoking === invite.id}
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Deletar e recuperar quota"
                        >
                          {revoking === invite.id ? (
                            <Loader2 className="w-3.5 h-3.5 text-red-500 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* History toggle */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full mt-4 text-sm text-ceramic-text-secondary hover:text-ceramic-accent transition-colors flex items-center justify-center gap-1"
          >
            <Clock className="w-3 h-3" />
            {showHistory ? 'Ocultar histórico' : 'Ver histórico de convites'}
          </button>

          {/* History */}
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                  {referrals.length === 0 ? (
                    <div className="text-sm text-ceramic-text-tertiary text-center py-4">
                      Nenhum convite enviado ainda
                    </div>
                  ) : (
                    referrals.map((referral) => (
                      <div
                        key={referral.id}
                        className="ceramic-concave p-3 rounded-lg flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <UserPlus className="w-4 h-4 text-ceramic-text-tertiary" />
                          <div>
                            <div className="text-xs text-ceramic-text-primary">
                              {referral.status === 'accepted'
                                ? 'Aceito'
                                : referral.status === 'pending'
                                ? 'Pendente'
                                : 'Expirado'}
                            </div>
                            <div className="text-[10px] text-ceramic-text-tertiary">
                              {new Date(referral.created_at).toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                        </div>
                        <div
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            referral.status === 'accepted'
                              ? 'bg-green-100 text-green-600'
                              : referral.status === 'pending'
                              ? 'bg-amber-100 text-amber-600'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {referral.status === 'accepted' && `+${referral.xp_awarded} XP`}
                          {referral.status === 'pending' && 'Aguardando'}
                          {referral.status === 'expired' && 'Expirado'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default InviteModal;
