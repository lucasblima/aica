/**
 * PairingCodeDisplay Component
 * Sprint: "Ordem ao Caos do WhatsApp"
 *
 * Displays the WhatsApp pairing code with:
 * - XXXX-XXXX format
 * - Expiration countdown timer
 * - Copy to clipboard functionality
 * - Regenerate button
 * - Step-by-step instructions
 * - Clear error states with retry
 *
 * @see Issue #86 - PairingCodeDisplay Component
 * @see PR #120 - WhatsApp Onboarding Flow
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, RefreshCw, Clock, AlertCircle, KeyRound } from 'lucide-react';
import { usePairingCode } from '@/hooks/usePairingCode';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('PairingCodeDisplay');

interface PairingCodeDisplayProps {
  /** Phone number to generate code for */
  phoneNumber: string;
  /** Callback when code is successfully generated */
  onCodeGenerated?: (code: string) => void;
  /** Callback when pairing is successful */
  onPairingSuccess?: () => void;
  /** Optional className */
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
      hint: 'A instância WhatsApp pode estar em estado inconsistente. Tente novamente em alguns segundos.',
    };
  }
  if (lower.includes('instance') || lower.includes('instância')) {
    return {
      message: 'Erro na instância WhatsApp',
      hint: 'Houve um problema ao preparar a conexão. Tente novamente.',
    };
  }

  return {
    message: 'Erro inesperado',
    hint: error,
  };
}

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

  // CRITICAL: useRef for guards, NOT useState.
  // React StrictMode double-invokes effects within the same commit phase.
  // useState updates are batched and not visible to the second invocation,
  // causing generateCode to fire twice → race condition → 400 error.
  // useRef mutations are synchronous and immediately visible.
  const hasAttemptedRef = useRef(false);
  const hasAutoRetriedRef = useRef(false);
  const autoRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoRetryTimerRef.current) clearTimeout(autoRetryTimerRef.current);
    };
  }, []);

  // Generate code on mount - exactly once per phone number
  useEffect(() => {
    const phoneDigits = phoneNumber?.replace(/\D/g, '') || '';
    if (phoneDigits.length >= 12 && !code && !isLoading && !error && !hasAttemptedRef.current) {
      hasAttemptedRef.current = true; // Synchronous - blocks StrictMode second invoke
      generateCode(phoneNumber).then((result) => {
        if (result?.code) {
          onCodeGenerated?.(result.code);
        }
      });
    }
  }, [phoneNumber]); // Minimal dependencies - only phoneNumber

  // Auto-retry once: if first attempt failed (instance may need time to initialize)
  useEffect(() => {
    if (error && hasAttemptedRef.current && !hasAutoRetriedRef.current && !code && !isLoading) {
      hasAutoRetriedRef.current = true; // Synchronous guard
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

  // Handle manual regenerate / retry
  const handleRetry = useCallback(async () => {
    if (autoRetryTimerRef.current) clearTimeout(autoRetryTimerRef.current);
    reset();
    clearError();
    hasAttemptedRef.current = true;
    hasAutoRetriedRef.current = true; // Don't auto-retry after manual retry
    const result = await generateCode(phoneNumber);
    if (result?.code) {
      onCodeGenerated?.(result.code);
    }
  }, [phoneNumber, generateCode, onCodeGenerated, reset, clearError]);

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    if (code) {
      try {
        await navigator.clipboard.writeText(code.replace('-', ''));
      } catch (err) {
        log.error('Failed to copy code:', err);
      }
    }
  }, [code]);

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const errorInfo = error ? friendlyErrorMessage(error) : null;
  const isAuthError = error?.toLowerCase().includes('sessão') || error?.toLowerCase().includes('login') || error?.toLowerCase().includes('autenticad');

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Code Display */}
      <div className="relative">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-8"
            >
              <div className="w-12 h-12 border-4 border-ceramic-200 border-t-green-500 rounded-full animate-spin" />
              <p className="mt-4 text-ceramic-500 text-sm">
                Gerando código de pareamento...
              </p>
              <p className="mt-1 text-ceramic-400 text-xs">
                Criando instância e configurando conexão
              </p>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center py-8"
            >
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                {isAuthError ? (
                  <KeyRound className="w-8 h-8 text-red-500" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-red-500" />
                )}
              </div>
              <p className="text-red-700 font-medium text-center mb-1">
                {errorInfo?.message}
              </p>
              <p className="text-red-500 text-sm text-center mb-4 max-w-sm">
                {errorInfo?.hint}
              </p>
              {isAuthError ? (
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2 px-4 py-2 bg-ceramic-800 text-white rounded-lg hover:bg-ceramic-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Recarregar página
                </button>
              ) : (
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Tentar novamente
                </button>
              )}
            </motion.div>
          ) : code ? (
            <motion.div
              key="code"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center"
            >
              {/* Code Box */}
              <div className="relative">
                <div
                  className={`
                    px-8 py-6 rounded-2xl border-2 font-mono text-4xl font-bold tracking-widest
                    ${
                      isExpired
                        ? 'bg-ceramic-100 border-ceramic-300 text-ceramic-400'
                        : 'bg-green-50 border-green-200 text-ceramic-900'
                    }
                  `}
                >
                  {code}
                </div>

                {/* Copy Button */}
                <button
                  onClick={handleCopy}
                  disabled={isExpired}
                  className="absolute -right-3 -top-3 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow disabled:opacity-50"
                  title="Copiar código"
                >
                  <Copy className="w-4 h-4 text-ceramic-600" />
                </button>
              </div>

              {/* Timer */}
              <div
                className={`
                  flex items-center gap-2 mt-4 text-sm
                  ${isExpired ? 'text-red-500' : 'text-ceramic-500'}
                `}
              >
                <Clock className="w-4 h-4" />
                {isExpired ? (
                  <span>Código expirado</span>
                ) : (
                  <span>Expira em {formatTime(secondsRemaining)}</span>
                )}
              </div>

              {/* Regenerate Button */}
              {isExpired && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={handleRetry}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Gerar novo código
                </motion.button>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Instructions */}
      {code && !isExpired && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <h4 className="font-medium text-ceramic-800 text-center">
            Como conectar seu WhatsApp
          </h4>

          <ol className="space-y-3">
            {[
              'Abra o WhatsApp no seu celular',
              'Toque em Configurações > Dispositivos conectados',
              'Toque em "Conectar dispositivo"',
              'Quando aparecer a opção, escolha "Conectar com número de telefone"',
              'Digite o código acima no seu WhatsApp',
            ].map((step, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="flex items-start gap-3"
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </span>
                <span className="text-ceramic-600 text-sm">{step}</span>
              </motion.li>
            ))}
          </ol>
        </motion.div>
      )}
    </div>
  );
}

export default PairingCodeDisplay;
