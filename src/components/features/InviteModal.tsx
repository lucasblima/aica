/**
 * InviteModal Component
 *
 * Modal for managing and sharing invites.
 * Shows QR code, invite stats, generates links, and displays enriched history.
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
  Link2,
  QrCode,
  BarChart3,
  Sparkles
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useInviteSystem } from '../../hooks/useInviteSystem';
import type { EnrichedReferral } from '../../services/inviteSystemService';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function InviteeStatusBadge({ status, isActive }: { status: EnrichedReferral['status']; isActive: boolean }) {
  if (status === 'accepted') {
    if (isActive) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-ceramic-success/10 text-ceramic-success">
          Ativo
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-ceramic-cool text-ceramic-text-tertiary">
        Inativo
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-ceramic-warning/10 text-ceramic-warning">
        Pendente
      </span>
    );
  }
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-ceramic-cool text-ceramic-text-tertiary">
      Expirado
    </span>
  );
}

export function InviteModal({ isOpen, onClose }: InviteModalProps) {
  const {
    stats,
    dashboard,
    enrichedReferrals,
    conversionRate,
    loading,
    generating,
    revoking,
    currentUrl,
    currentCode,
    hasInvites,
    availableCount,
    generateInvite,
    copyLink,
    shareLink,
    refreshDashboard,
    revokeInvite
  } = useInviteSystem();

  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Load dashboard on open
  useEffect(() => {
    if (isOpen) {
      refreshDashboard();
    }
  }, [isOpen, refreshDashboard]);

  // Reset copied state
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  useEffect(() => {
    if (copiedCode) {
      const timer = setTimeout(() => setCopiedCode(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedCode]);

  const handleCopy = async () => {
    const success = await copyLink();
    if (success) setCopied(true);
  };

  const handleCopyCode = async () => {
    if (!currentCode) return;
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopiedCode(true);
    } catch {
      setCopiedCode(true);
    }
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
      refreshDashboard();
    }
  };

  const copyInviteUrl = async (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
    }
  };

  const formatCode = (code: string) =>
    code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;

  const getDaysRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
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
          className="relative w-full max-w-md ceramic-card p-6 overflow-y-auto max-h-[90vh]"
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
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
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

          {/* Stats Bar — 2x2 grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
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
              <div className="text-2xl font-bold text-ceramic-success">
                {stats?.total_accepted ?? 0}
              </div>
              <div className="text-xs text-ceramic-text-tertiary">Aceitos</div>
            </div>
            <div className="ceramic-concave p-3 text-center rounded-xl">
              <div className="text-2xl font-bold text-ceramic-info">
                {conversionRate > 0 ? `${Math.round(conversionRate * 100)}%` : '—'}
              </div>
              <div className="text-xs text-ceramic-text-tertiary">Taxa Conv.</div>
            </div>
          </div>

          {/* QR Code + Link Section */}
          {hasInvites ? (
            <div className="space-y-4">
              {currentUrl ? (
                <>
                  {/* QR + Code/Link side by side */}
                  <div className="ceramic-concave p-4 rounded-xl flex gap-4 items-start">
                    {/* QR Code */}
                    <div className="flex-shrink-0">
                      <QRCodeSVG
                        value={currentUrl}
                        size={128}
                        bgColor="#F5F4EF"
                        fgColor="#44403C"
                        level="M"
                      />
                    </div>

                    {/* Code + Link */}
                    <div className="flex-1 min-w-0 space-y-3">
                      {/* Invite Code */}
                      {currentCode && (
                        <div>
                          <div className="text-[10px] text-ceramic-text-tertiary font-medium mb-1">
                            Código
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-mono font-bold text-ceramic-text-primary tracking-wider">
                              {formatCode(currentCode)}
                            </span>
                            <button
                              onClick={handleCopyCode}
                              className="p-1 rounded hover:bg-ceramic-cool transition-colors"
                              title="Copiar código"
                            >
                              {copiedCode ? (
                                <Check className="w-3.5 h-3.5 text-ceramic-success" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-ceramic-text-tertiary" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Invite Link */}
                      <div>
                        <div className="text-[10px] text-ceramic-text-tertiary font-medium mb-1">
                          Link
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-ceramic-text-secondary font-mono truncate">
                            {currentUrl.replace(/^https?:\/\//, '').slice(0, 28)}...
                          </span>
                          <button
                            onClick={handleCopy}
                            className="p-1 rounded hover:bg-ceramic-cool transition-colors flex-shrink-0"
                            title="Copiar link"
                          >
                            {copied ? (
                              <Check className="w-3.5 h-3.5 text-ceramic-success" />
                            ) : (
                              <Link2 className="w-3.5 h-3.5 text-ceramic-text-tertiary" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Share button */}
                  <button
                    onClick={handleShare}
                    className="w-full p-3 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl shadow-md"
                  >
                    <Share2 className="w-4 h-4" />
                    Compartilhar convite
                  </button>

                  {/* Generate new */}
                  {availableCount > 0 && (
                    <button
                      onClick={handleGenerateNew}
                      disabled={generating}
                      className="w-full text-sm text-ceramic-text-tertiary hover:text-ceramic-accent transition-colors disabled:opacity-50"
                    >
                      {generating ? 'Gerando...' : `Gerar novo convite (${availableCount} restantes)`}
                    </button>
                  )}
                </>
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
                  <span className="font-bold">Gerar Convite</span>
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
                Você ganha +2 convites quando alguem aceita seu convite!
              </div>
            </div>
          )}

          {/* Invite History — always visible */}
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-ceramic-text-tertiary" />
              <h3 className="text-sm font-bold text-ceramic-text-primary">
                Histórico de Convites
              </h3>
              {enrichedReferrals.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-ceramic-cool text-ceramic-text-secondary">
                  {enrichedReferrals.length}
                </span>
              )}
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {enrichedReferrals.length === 0 ? (
                <div className="text-sm text-ceramic-text-tertiary text-center py-4 ceramic-concave rounded-xl">
                  Nenhum convite enviado ainda
                </div>
              ) : (
                enrichedReferrals.map((referral) => (
                  <div
                    key={referral.id}
                    className="ceramic-concave p-3 rounded-lg"
                  >
                    {referral.status === 'accepted' ? (
                      <div className="flex items-center gap-3">
                        {/* Avatar or icon */}
                        {referral.invitee_avatar ? (
                          <img
                            src={referral.invitee_avatar}
                            alt={referral.invitee_name ?? ''}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-ceramic-success/10 flex items-center justify-center flex-shrink-0">
                            <UserPlus className="w-4 h-4 text-ceramic-success" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-ceramic-text-primary truncate">
                              {referral.invitee_name ?? 'Usuario'}
                            </span>
                            <InviteeStatusBadge status="accepted" isActive={referral.is_active} />
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-ceramic-text-tertiary">
                            {referral.invitee_plan && (
                              <span className="font-medium">{referral.invitee_plan}</span>
                            )}
                            <span>
                              Aceito {new Date(referral.accepted_at!).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs font-bold text-ceramic-success flex-shrink-0">
                          +{referral.xp_awarded} XP
                        </div>
                      </div>
                    ) : referral.status === 'pending' ? (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-ceramic-warning/10 flex items-center justify-center flex-shrink-0">
                          <Clock className="w-4 h-4 text-ceramic-warning" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {referral.invite_code && (
                              <span className="text-xs font-mono font-bold text-ceramic-text-primary">
                                {formatCode(referral.invite_code)}
                              </span>
                            )}
                            <InviteeStatusBadge status="pending" isActive={false} />
                          </div>
                          <div className="text-[10px] text-ceramic-text-tertiary">
                            {getDaysRemaining(referral.expires_at)} dias restantes
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => copyInviteUrl(referral.invite_token)}
                            className="p-1.5 rounded-lg hover:bg-ceramic-cool transition-colors"
                            title="Copiar link"
                          >
                            <Copy className="w-3.5 h-3.5 text-ceramic-text-tertiary" />
                          </button>
                          <button
                            onClick={() => handleRevoke(referral.id)}
                            disabled={revoking === referral.id}
                            className="p-1.5 rounded-lg hover:bg-ceramic-error/5 transition-colors disabled:opacity-50"
                            title="Revogar convite"
                          >
                            {revoking === referral.id ? (
                              <Loader2 className="w-3.5 h-3.5 text-ceramic-error animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5 text-ceramic-error" />
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Expired */
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-ceramic-cool flex items-center justify-center flex-shrink-0">
                          <Clock className="w-4 h-4 text-ceramic-text-tertiary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {referral.invite_code && (
                              <span className="text-xs font-mono font-bold text-ceramic-text-secondary">
                                {formatCode(referral.invite_code)}
                              </span>
                            )}
                            <InviteeStatusBadge status="expired" isActive={false} />
                          </div>
                          <div className="text-[10px] text-ceramic-text-tertiary">
                            {new Date(referral.expires_at).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bonus info */}
          <div className="mt-6 p-4 bg-gradient-to-r from-ceramic-warning/10 to-ceramic-accent/10 rounded-xl border border-ceramic-warning/20">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-ceramic-warning/15 flex items-center justify-center flex-shrink-0">
                <Gift className="w-4 h-4 text-ceramic-warning" />
              </div>
              <div>
                <div className="text-sm font-bold text-ceramic-text-primary">
                  Bonus por indicacao
                </div>
                <div className="text-xs text-ceramic-text-secondary">
                  Quando alguem aceita seu convite, você ganha{' '}
                  <strong>+50 XP</strong> e <strong>+2 convites</strong> extras!
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default InviteModal;
