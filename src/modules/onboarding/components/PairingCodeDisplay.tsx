/**
 * PairingCodeDisplay Component
 * Jony Ive-inspired design: breathing orb, glass panels, serif code display
 *
 * @see Issue #86 - PairingCodeDisplay Component
 * @see PR #120 - WhatsApp Onboarding Flow
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Clock, AlertCircle, KeyRound, Check } from 'lucide-react';
import { usePairingCode } from '@/hooks/usePairingCode';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('PairingCodeDisplay');

interface PairingCodeDisplayProps {
  phoneNumber: string;
  onCodeGenerated?: (code: string) => void;
  onPairingSuccess?: () => void;
  className?: string;
}

/** Map backend error messages to user-friendly PT-BR messages */
function friendlyErrorMessage(error: string): { message: string; hint: string } {
  const lower = error.toLowerCase();

  if (lower.includes('sessão expirada') || lower.includes('faça login') || lower.includes('não autenticado')) {
    return {
      message: 'Sua sessão expirou',
      hint: 'Recarregue a página e faça login novamente.',
    };
  }
  if (lower.includes('conexão') || lower.includes('network') || lower.includes('fetch')) {
    return {
      message: 'Erro de conexão',
      hint: 'Verifique sua internet e tente novamente.',
    };
  }
  if (lower.includes('pairing') || lower.includes('código')) {
    return {
      message: 'Falha ao gerar código',
      hint: 'Tente novamente em alguns segundos.',
    };
  }
  if (lower.includes('instance') || lower.includes('instância')) {
    return {
      message: 'Erro na instância',
      hint: 'Houve um problema ao preparar a conexão. Tente novamente.',
    };
  }

  return {
    message: 'Algo deu errado',
    hint: error,
  };
}

const steps = [
  { title: 'Abra o WhatsApp', hint: 'No seu celular' },
  { title: 'Dispositivos conectados', hint: 'Configurações > Dispositivos conectados' },
  { title: 'Conectar dispositivo', hint: 'Escolha "Conectar com número de telefone"' },
  { title: 'Digite o código', hint: 'Insira o código acima no WhatsApp' },
];

export function PairingCodeDisplay({
  phoneNumber,
  onCodeGenerated,
  onPairingSuccess,
  className = '',
}: PairingCodeDisplayProps) {
  const {
    generateCode,
    isLoading,
    error,
    code,
    secondsRemaining,
    isExpired,
    clearError,
    reset,
  } = usePairingCode();

  const [copied, setCopied] = useState(false);

  // CRITICAL: useRef for guards, NOT useState.
  // React StrictMode double-invokes effects within the same commit phase.
  const hasAttemptedRef = useRef(false);
  const hasAutoRetriedRef = useRef(false);
  const autoRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (autoRetryTimerRef.current) clearTimeout(autoRetryTimerRef.current);
    };
  }, []);

  // Generate code on mount - exactly once per phone number
  useEffect(() => {
    const phoneDigits = phoneNumber?.replace(/\D/g, '') || '';
    if (phoneDigits.length >= 12 && !code && !isLoading && !error && !hasAttemptedRef.current) {
      hasAttemptedRef.current = true;
      generateCode(phoneNumber).then((result) => {
        if (result?.code) {
          onCodeGenerated?.(result.code);
        }
      });
    }
  }, [phoneNumber]);

  // Auto-retry once on first failure
  useEffect(() => {
    if (error && hasAttemptedRef.current && !hasAutoRetriedRef.current && !code && !isLoading) {
      hasAutoRetriedRef.current = true;
      log.debug('First attempt failed, scheduling auto-retry in 3s...');
      autoRetryTimerRef.current = setTimeout(() => {
        log.debug('Auto-retrying pairing code generation...');
        reset();
        clearError();
        generateCode(phoneNumber).then((result) => {
          if (result?.code) {
            onCodeGenerated?.(result.code);
          }
        });
      }, 3000);
    }
  }, [error, code, isLoading]);

  const handleRetry = useCallback(async () => {
    if (autoRetryTimerRef.current) clearTimeout(autoRetryTimerRef.current);
    reset();
    clearError();
    hasAttemptedRef.current = true;
    hasAutoRetriedRef.current = true;
    const result = await generateCode(phoneNumber);
    if (result?.code) {
      onCodeGenerated?.(result.code);
    }
  }, [phoneNumber, generateCode, onCodeGenerated, reset, clearError]);

  const handleCopy = useCallback(async () => {
    if (code) {
      try {
        await navigator.clipboard.writeText(code.replace('-', ''));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        log.error('Failed to copy code:', err);
      }
    }
  }, [code]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const errorInfo = error ? friendlyErrorMessage(error) : null;
  const isAuthError = error?.toLowerCase().includes('sessão') || error?.toLowerCase().includes('login') || error?.toLowerCase().includes('autenticad');

  // Progress for timer ring (1.0 = full, 0.0 = expired)
  const progress = code && !isExpired ? secondsRemaining / 60 : 0;

  return (
    <div className={`${className}`}>
      {/* ── Loading State ── */}
      {isLoading && !code && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center justify-center py-16"
        >
          {/* Breathing orb loader */}
          <div className="relative w-20 h-20 flex items-center justify-center">
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.05) 70%, transparent 100%)',
              }}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.6, 0.3, 0.6],
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="w-10 h-10 rounded-full"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              }}
              animate={{
                scale: [1, 1.06, 1],
                boxShadow: [
                  '0 0 0 0 rgba(245, 158, 11, 0.3)',
                  '0 0 0 12px rgba(245, 158, 11, 0)',
                  '0 0 0 0 rgba(245, 158, 11, 0.3)',
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>

          <p className="mt-8 text-ceramic-text-secondary text-sm font-medium tracking-wide">
            Preparando conexão...
          </p>
        </motion.div>
      )}

      {/* ── Error State ── */}
      {!isLoading && error && !code && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="flex flex-col items-center py-12"
        >
          <motion.div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-6"
            style={{ backgroundColor: 'rgba(155, 77, 58, 0.08)' }}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          >
            {isAuthError ? (
              <KeyRound className="w-5 h-5 text-ceramic-negative" />
            ) : (
              <AlertCircle className="w-5 h-5 text-ceramic-negative" />
            )}
          </motion.div>

          <h3 className="text-base font-semibold text-ceramic-text-primary mb-1">
            {errorInfo?.message}
          </h3>
          <p className="text-sm text-ceramic-text-secondary text-center max-w-xs mb-8">
            {errorInfo?.hint}
          </p>

          <motion.button
            onClick={isAuthError ? () => window.location.reload() : handleRetry}
            className="px-6 py-2.5 rounded-full text-sm font-medium transition-all"
            style={{
              background: isAuthError ? '#5C554B' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white',
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            {isAuthError ? 'Recarregar página' : 'Tentar novamente'}
          </motion.button>
        </motion.div>
      )}

      {/* ── Code Display ── */}
      {code && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center"
        >
          {/* Code card with glass panel */}
          <motion.div
            className="relative w-full max-w-sm"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Breathing ambient glow */}
            {!isExpired && (
              <motion.div
                className="absolute inset-0 rounded-3xl -z-10"
                style={{
                  background: 'radial-gradient(ellipse at center, rgba(245, 158, 11, 0.12) 0%, transparent 70%)',
                  filter: 'blur(20px)',
                }}
                animate={{
                  scale: [0.95, 1.05, 0.95],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}

            {/* Glass card */}
            <div
              className={`
                relative rounded-3xl px-8 py-10 text-center transition-all duration-700
                ${isExpired
                  ? 'bg-ceramic-cool/60'
                  : 'bg-white/70 backdrop-blur-sm'
                }
              `}
              style={{
                border: '1px solid rgba(255, 255, 255, 0.4)',
                boxShadow: isExpired
                  ? 'none'
                  : '0 8px 32px rgba(163, 158, 145, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.2)',
              }}
            >
              {/* Label */}
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-ceramic-text-secondary mb-5">
                Código de pareamento
              </p>

              {/* The code itself */}
              <div
                className={`
                  text-5xl font-light tracking-[0.08em] mb-6 transition-colors duration-700
                  ${isExpired ? 'text-ceramic-text-secondary/40' : 'text-ceramic-text-primary'}
                `}
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                {code.split('-').map((part, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <span className="mx-3 text-3xl text-ceramic-text-secondary/30 font-sans">
                        ·
                      </span>
                    )}
                    <span>{part}</span>
                  </React.Fragment>
                ))}
              </div>

              {/* Timer */}
              <div className="flex items-center justify-center gap-2">
                {!isExpired && (
                  <svg width="16" height="16" viewBox="0 0 16 16" className="opacity-40">
                    <circle
                      cx="8" cy="8" r="6.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                      className="text-ceramic-text-secondary"
                    />
                    <circle
                      cx="8" cy="8" r="6.5"
                      fill="none"
                      stroke="#D97706"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeDasharray={`${progress * 40.84} 40.84`}
                      transform="rotate(-90 8 8)"
                      className="transition-all duration-1000"
                    />
                  </svg>
                )}
                <motion.span
                  className="text-xs text-ceramic-text-secondary"
                  animate={!isExpired ? { opacity: [0.5, 1, 0.5] } : {}}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  {isExpired ? 'Código expirado' : `Expira em ${formatTime(secondsRemaining)}`}
                </motion.span>
              </div>
            </div>

            {/* Action buttons below card */}
            <div className="flex items-center justify-center gap-3 mt-5">
              {!isExpired && (
                <motion.button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium
                    bg-white/80 backdrop-blur-sm text-ceramic-text-primary
                    hover:bg-white transition-all"
                  style={{
                    border: '1px solid rgba(163, 158, 145, 0.15)',
                    boxShadow: '0 2px 8px rgba(163, 158, 145, 0.08)',
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-ceramic-positive" />
                      <span className="text-ceramic-positive">Copiado</span>
                    </>
                  ) : (
                    <span>Copiar código</span>
                  )}
                </motion.button>
              )}

              {isExpired && (
                <motion.button
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={handleRetry}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium text-white"
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Gerar novo código
                </motion.button>
              )}
            </div>
          </motion.div>

          {/* ── Instructions ── */}
          {!isExpired && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="mt-12 w-full max-w-sm"
            >
              <p className="text-center text-xs text-ceramic-text-secondary mb-6 tracking-wide">
                No seu celular, siga os passos:
              </p>

              <ol className="space-y-5">
                {steps.map((step, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.08, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                    className="flex items-start gap-4"
                  >
                    <span
                      className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                      style={{
                        background: 'rgba(217, 119, 6, 0.08)',
                        color: '#D97706',
                      }}
                    >
                      {i + 1}
                    </span>
                    <div className="pt-0.5">
                      <p className="text-sm font-medium text-ceramic-text-primary leading-tight">
                        {step.title}
                      </p>
                      <p className="text-xs text-ceramic-text-secondary mt-0.5">
                        {step.hint}
                      </p>
                    </div>
                  </motion.li>
                ))}
              </ol>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}

export default PairingCodeDisplay;
