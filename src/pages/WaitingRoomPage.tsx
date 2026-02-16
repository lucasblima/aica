/**
 * WaitingRoomPage
 *
 * Elegant "Você está quase lá" experience for authenticated users
 * who haven't been activated via invite yet.
 *
 * Jony Ive philosophy: the wait should feel like being on a VIP list,
 * not being rejected. Premium, hopeful, beautiful.
 */

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, Share2, LogOut, Check, AlertCircle, Sparkles, Gift } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useActivationStatus } from '@/hooks/useActivationStatus';
import { Logo } from '@/components/ui';
import { InviteModal } from '@/components/features/InviteModal';

export function WaitingRoomPage() {
  const { user, signOut } = useAuth();
  const { activate } = useActivationStatus();

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(0);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Visitante';
  const avatarUrl = user?.user_metadata?.avatar_url;

  // Format code input: uppercase, auto-dash after 4 chars
  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (raw.length <= 8) {
      const formatted = raw.length > 4
        ? `${raw.slice(0, 4)}-${raw.slice(4)}`
        : raw;
      setCode(formatted);
      setError('');
    }
  }, []);

  // Submit invite code
  const handleSubmit = useCallback(async () => {
    const cleanCode = code.replace(/-/g, '').trim();
    if (cleanCode.length !== 8) {
      setError('Digite o código completo (8 caracteres)');
      return;
    }

    setActivating(true);
    setError('');

    const result = await activate(code);

    if (result.success) {
      setActivated(true);
      setXpAwarded(result.xp_awarded ?? 0);
    } else {
      setError(result.error || 'Código inválido ou expirado');
      setActivating(false);
    }
  }, [code, activate]);

  // Share / ask for invite
  const handleAskInvite = useCallback(async () => {
    const shareText = 'Me convida pro AICA! É um Life OS incrível. aica.guru';

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Me convida pro AICA!',
          text: shareText,
        });
      } catch {
        // User cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
      } catch {
        // Fallback: do nothing
      }
    }
  }, []);

  // Key handler for code input
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.replace(/-/g, '').length === 8) {
      handleSubmit();
    }
  }, [code, handleSubmit]);

  // Success state — brief celebration before redirect
  if (activated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-ceramic-base to-ceramic-cool flex items-center justify-center p-6">
        <motion.div
          className="max-w-md w-full text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            className="w-24 h-24 mx-auto rounded-full bg-ceramic-success/10 flex items-center justify-center mb-8"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2, stiffness: 200 }}
          >
            <Sparkles className="w-12 h-12 text-ceramic-success" />
          </motion.div>

          <motion.h1
            className="text-3xl font-black text-ceramic-text-primary mb-3 tracking-tight"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Bem-vindo ao AICA!
          </motion.h1>

          <motion.p
            className="text-ceramic-text-secondary mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Sua conta foi ativada com sucesso.
          </motion.p>

          {xpAwarded > 0 && (
            <motion.div
              className="ceramic-card p-4 rounded-xl mb-8 inline-block"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="text-3xl font-black text-amber-500">+{xpAwarded} XP</div>
              <div className="text-sm text-ceramic-text-tertiary">Bônus de boas-vindas</div>
            </motion.div>
          )}

          {/* CTA: Invite friends */}
          <motion.div
            className="flex flex-col items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <button
              onClick={() => window.location.reload()}
              className="px-10 py-4 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-lg transition-colors"
            >
              Começar
            </button>

            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center gap-2 text-sm text-ceramic-text-secondary hover:text-amber-600 transition-colors mt-2"
            >
              <Gift className="w-4 h-4" />
              Convidar amigos para o AICA
            </button>
          </motion.div>
        </motion.div>

        {/* Invite Modal */}
        <InviteModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-ceramic-base to-ceramic-cool flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Logo */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Logo variant="default" width={48} className="mx-auto rounded-xl mb-3" />
        </motion.div>

        {/* User avatar + greeting */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {avatarUrl ? (
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-pulse" />
              <img
                src={avatarUrl}
                alt={firstName}
                className="w-20 h-20 rounded-full object-cover relative z-10 ring-4 ring-white/50"
              />
            </div>
          ) : (
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-ceramic-cool flex items-center justify-center">
              <span className="text-3xl font-black text-ceramic-text-secondary">
                {firstName[0]}
              </span>
            </div>
          )}

          <h2 className="text-lg text-ceramic-text-secondary mb-1">
            Olá, {firstName}!
          </h2>
          <h1 className="text-3xl font-black text-ceramic-text-primary tracking-tight">
            Você está quase lá
          </h1>
        </motion.div>

        {/* Explanation */}
        <motion.p
          className="text-center text-ceramic-text-secondary mb-10 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          O AICA está em fase de acesso exclusivo por convite.
          <br />
          Peça a um amigo que já usa, ou digite seu código abaixo.
        </motion.p>

        {/* Code input card */}
        <motion.div
          className="ceramic-card p-8 rounded-2xl mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Ticket className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-ceramic-text-primary">
                Código de convite
              </h3>
              <p className="text-sm text-ceramic-text-tertiary">
                Formato: XXXX-XXXX
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                placeholder="XXXX-XXXX"
                maxLength={9}
                value={code}
                onChange={handleCodeChange}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-3.5 rounded-xl bg-ceramic-cool text-center font-mono text-xl tracking-[0.3em] uppercase text-ceramic-text-primary placeholder:text-ceramic-text-tertiary/40 placeholder:tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-shadow"
                style={{ boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.06), inset -2px -2px 4px rgba(255,255,255,0.7)' }}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={code.replace(/-/g, '').length !== 8 || activating}
              className="px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              {activating ? (
                <motion.div
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                />
              ) : (
                <Check className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Error / Success messages */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="flex items-center gap-2 mt-3 text-sm text-ceramic-error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-ceramic-border/50" />
          <span className="text-sm text-ceramic-text-tertiary font-medium">ou</span>
          <div className="flex-1 h-px bg-ceramic-border/50" />
        </div>

        {/* Ask for invite CTA */}
        <motion.button
          onClick={handleAskInvite}
          className="w-full ceramic-card p-4 rounded-xl flex items-center justify-center gap-3 text-ceramic-text-primary font-bold hover:scale-[1.01] active:scale-[0.99] transition-transform"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Share2 className="w-5 h-5 text-amber-500" />
          Pedir convite a um amigo
        </motion.button>

        {/* Sign out */}
        <motion.div
          className="text-center mt-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <button
            onClick={signOut}
            className="inline-flex items-center gap-2 text-sm text-ceramic-text-tertiary hover:text-ceramic-text-secondary transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </motion.div>
      </div>
    </div>
  );
}

export default WaitingRoomPage;
