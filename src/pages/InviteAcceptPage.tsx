/**
 * InviteAcceptPage
 *
 * Landing page for invite links.
 * Validates token, shows inviter info, handles login flow.
 *
 * URL: /invite/:token
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Ticket, User, Check, AlertCircle, Loader2, LogIn } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  validateInviteToken,
  acceptInvite,
  storeInviteToken,
  type InviteValidation,
  type AcceptInviteResult
} from '../services/inviteSystemService';

type PageState = 'loading' | 'valid' | 'invalid' | 'accepting' | 'accepted' | 'error';

export function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [inviteData, setInviteData] = useState<InviteValidation | null>(null);
  const [acceptResult, setAcceptResult] = useState<AcceptInviteResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Validate token on mount
  useEffect(() => {
    async function validate() {
      if (!token) {
        setPageState('invalid');
        setErrorMessage('Token de convite não fornecido');
        return;
      }

      const result = await validateInviteToken(token);

      if (result.valid) {
        setInviteData(result);
        setPageState('valid');
      } else {
        setPageState('invalid');
        setErrorMessage(result.error || 'Convite inválido');
      }
    }

    validate();
  }, [token]);

  // Auto-accept if user is logged in and invite is valid
  useEffect(() => {
    async function tryAccept() {
      if (pageState === 'valid' && isAuthenticated && user && token) {
        setPageState('accepting');

        const result = await acceptInvite(token);

        if (result.success) {
          setAcceptResult(result);
          setPageState('accepted');
        } else {
          setPageState('error');
          setErrorMessage(result.error || 'Erro ao aceitar convite');
        }
      }
    }

    if (!authLoading) {
      tryAccept();
    }
  }, [pageState, isAuthenticated, user, token, authLoading]);

  // Handle login redirect
  const handleLogin = () => {
    if (token) {
      // Store token for post-login acceptance
      storeInviteToken(token);
    }
    navigate('/landing', { state: { from: `/invite/${token}` } });
  };

  // Handle continue to app
  const handleContinue = () => {
    navigate('/');
  };

  // Loading state
  if (pageState === 'loading' || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-ceramic-base to-ceramic-cool flex items-center justify-center p-4">
        <motion.div
          className="ceramic-card p-8 text-center max-w-md w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Loader2 className="w-12 h-12 mx-auto text-ceramic-accent animate-spin mb-4" />
          <p className="text-ceramic-text-secondary">Verificando convite...</p>
        </motion.div>
      </div>
    );
  }

  // Invalid token
  if (pageState === 'invalid') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-ceramic-base to-ceramic-cool flex items-center justify-center p-4">
        <motion.div
          className="ceramic-card p-8 text-center max-w-md w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-ceramic-error/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-ceramic-error" />
          </div>
          <h1 className="text-xl font-bold text-ceramic-text-primary mb-2">
            Convite Inválido
          </h1>
          <p className="text-ceramic-text-secondary mb-6">
            {errorMessage}
          </p>
          <button
            onClick={() => navigate('/')}
            className="ceramic-card px-6 py-3 text-ceramic-accent font-bold hover:scale-105 active:scale-95 transition-transform"
          >
            Ir para o início
          </button>
        </motion.div>
      </div>
    );
  }

  // Valid token - show invitation
  if (pageState === 'valid' && inviteData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-ceramic-base to-ceramic-cool flex items-center justify-center p-4">
        <motion.div
          className="ceramic-card p-8 text-center max-w-md w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Ticket decoration */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full animate-pulse opacity-30" />
            <div className="absolute inset-2 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center">
              <Ticket className="w-8 h-8 text-white" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-ceramic-text-primary mb-2">
            Você foi convidado!
          </h1>

          {/* Inviter info */}
          <div className="ceramic-concave p-4 rounded-xl my-6">
            <div className="flex items-center justify-center gap-3">
              {inviteData.inviter_avatar ? (
                <img
                  src={inviteData.inviter_avatar}
                  alt={inviteData.inviter_name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-ceramic-accent/20 flex items-center justify-center">
                  <User className="w-6 h-6 text-ceramic-accent" />
                </div>
              )}
              <div className="text-left">
                <div className="text-sm text-ceramic-text-tertiary">
                  Convidado por
                </div>
                <div className="text-lg font-bold text-ceramic-text-primary">
                  {inviteData.inviter_name}
                </div>
              </div>
            </div>
          </div>

          <p className="text-ceramic-text-secondary mb-6">
            Aica é seu assistente de vida inteligente. Organize tarefas, gerencie contatos e muito mais!
          </p>

          {/* Login button */}
          <button
            onClick={handleLogin}
            className="w-full ceramic-card p-4 bg-ceramic-accent text-white font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            <LogIn className="w-5 h-5" />
            Entrar para aceitar o convite
          </button>

          <p className="text-xs text-ceramic-text-tertiary mt-4">
            Ao entrar, você aceita automaticamente o convite
          </p>
        </motion.div>
      </div>
    );
  }

  // Accepting state
  if (pageState === 'accepting') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-ceramic-base to-ceramic-cool flex items-center justify-center p-4">
        <motion.div
          className="ceramic-card p-8 text-center max-w-md w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Loader2 className="w-12 h-12 mx-auto text-ceramic-accent animate-spin mb-4" />
          <p className="text-ceramic-text-secondary">Aceitando convite...</p>
        </motion.div>
      </div>
    );
  }

  // Accepted state
  if (pageState === 'accepted' && acceptResult) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-ceramic-base to-ceramic-cool flex items-center justify-center p-4">
        <motion.div
          className="ceramic-card p-8 text-center max-w-md w-full"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          {/* Success animation */}
          <motion.div
            className="w-20 h-20 mx-auto rounded-full bg-ceramic-success/10 flex items-center justify-center mb-6"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
          >
            <Check className="w-10 h-10 text-ceramic-success" />
          </motion.div>

          <h1 className="text-2xl font-bold text-ceramic-text-primary mb-2">
            Bem-vindo ao Aica!
          </h1>

          <p className="text-ceramic-text-secondary mb-4">
            Convite de <strong>{acceptResult.inviter_name}</strong> aceito com sucesso!
          </p>

          {/* XP bonus */}
          {acceptResult.xp_awarded && acceptResult.xp_awarded > 0 && (
            <motion.div
              className="ceramic-concave p-4 rounded-xl mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="text-3xl font-bold text-amber-500">
                +{acceptResult.xp_awarded} XP
              </div>
              <div className="text-sm text-ceramic-text-tertiary">
                Bônus de boas-vindas!
              </div>
            </motion.div>
          )}

          <button
            onClick={handleContinue}
            className="w-full ceramic-card p-4 bg-ceramic-accent text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            Começar a usar o Aica
          </button>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (pageState === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-ceramic-base to-ceramic-cool flex items-center justify-center p-4">
        <motion.div
          className="ceramic-card p-8 text-center max-w-md w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-ceramic-error/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-ceramic-error" />
          </div>
          <h1 className="text-xl font-bold text-ceramic-text-primary mb-2">
            Erro ao aceitar convite
          </h1>
          <p className="text-ceramic-text-secondary mb-6">
            {errorMessage}
          </p>
          <button
            onClick={handleContinue}
            className="ceramic-card px-6 py-3 text-ceramic-accent font-bold hover:scale-105 active:scale-95 transition-transform"
          >
            Ir para o início
          </button>
        </motion.div>
      </div>
    );
  }

  return null;
}

export default InviteAcceptPage;
