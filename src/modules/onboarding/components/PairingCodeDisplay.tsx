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
 *
 * @see Issue #86 - PairingCodeDisplay Component
 * @see PR #120 - WhatsApp Onboarding Flow
 */

import React, { useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, RefreshCw, Clock, CheckCircle, AlertCircle } from 'lucide-react';
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

  // Generate code on mount - only once per phone number
  // Issue #195: Use state-based guard instead of ref to survive React Strict Mode remounts
  const [hasAttempted, setHasAttempted] = React.useState(false);

  useEffect(() => {
    // Only generate once per phone number, and require a valid phone (country code + at least 10 digits)
    const phoneDigits = phoneNumber?.replace(/\D/g, '') || '';
    if (phoneDigits.length >= 12 && !code && !isLoading && !error && !hasAttempted) {
      setHasAttempted(true);
      generateCode(phoneNumber).then((result) => {
        if (result?.code) {
          onCodeGenerated?.(result.code);
        }
        // Do NOT reset hasAttempted on failure - user must click "Tentar novamente"
      });
    }
  }, [phoneNumber]); // Minimal dependencies - only phoneNumber

  // Handle regenerate
  const handleRegenerate = useCallback(async () => {
    setHasAttempted(false);
    reset();
    clearError();
    setHasAttempted(true);
    const result = await generateCode(phoneNumber);
    if (result?.code) {
      onCodeGenerated?.(result.code);
    } else {
      // Keep hasAttempted true - user must click "Tentar novamente" again
    }
  }, [phoneNumber, generateCode, onCodeGenerated, reset, clearError]);

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    if (code) {
      try {
        await navigator.clipboard.writeText(code.replace('-', ''));
        // Could add toast notification here
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
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-red-600 text-center mb-4">{error}</p>
              <button
                onClick={handleRegenerate}
                className="flex items-center gap-2 px-4 py-2 bg-ceramic-800 text-white rounded-lg hover:bg-ceramic-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Tentar novamente
              </button>
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
                  onClick={handleRegenerate}
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

      {/* Success State */}
      {onPairingSuccess && (
        <div className="hidden">
          {/* This could be shown when pairing is detected as successful */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center py-8"
          >
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold text-ceramic-800">
              WhatsApp conectado!
            </h3>
            <p className="text-ceramic-500 text-sm mt-1">
              Seu WhatsApp foi pareado com sucesso
            </p>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default PairingCodeDisplay;
