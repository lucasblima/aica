/**
 * PairingCodeDisplay Component
 *
 * Displays WhatsApp pairing code with countdown timer and step-by-step instructions.
 * Alternative to QR Code for easier mobile pairing.
 *
 * @example
 * <PairingCodeDisplay
 *   phoneNumber="5511987654321"
 *   onConnected={() => console.log('Connected!')}
 * />
 *
 * Issue: #86
 */

import React, { useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  Check,
} from 'lucide-react';
import { usePairingCode } from '@/hooks/usePairingCode';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Duracao do codigo de pareamento em segundos */
const PAIRING_CODE_DURATION_SECONDS = 60;

/** Delay para resetar o estado de "copiado" em ms */
const COPIED_STATE_RESET_DELAY_MS = 2000;

/** Instrucoes passo-a-passo para o usuario */
const PAIRING_INSTRUCTIONS = [
  {
    step: 1,
    title: 'Abra o WhatsApp',
    description: 'No seu celular, abra o aplicativo WhatsApp',
  },
  {
    step: 2,
    title: 'Acesse Configuracoes',
    description: 'Toque em Configuracoes > Dispositivos conectados',
  },
  {
    step: 3,
    title: 'Conectar dispositivo',
    description: 'Toque em "Conectar um dispositivo"',
  },
  {
    step: 4,
    title: 'Digite o codigo',
    description: 'Escolha "Conectar com numero de telefone" e digite o codigo abaixo',
  },
] as const;

// ============================================================================
// TYPES
// ============================================================================

interface PairingCodeDisplayProps {
  /** Número de telefone no formato 5511987654321 */
  phoneNumber: string;
  /** Callback quando a conexão for estabelecida */
  onConnected?: () => void;
  /** Callback quando houver erro */
  onError?: (error: string) => void;
  /** Classes CSS adicionais */
  className?: string;
  /** Gerar código automaticamente ao montar */
  autoGenerate?: boolean;
}

interface InstructionStepProps {
  step: number;
  title: string;
  description: string;
  isActive?: boolean;
}

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, staggerChildren: 0.1 },
  },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 },
};

const codeVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 20 },
  },
  pulse: {
    scale: [1, 1.02, 1],
    transition: { duration: 0.3 },
  },
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Instruction Step Component
 */
function InstructionStep({ step, title, description, isActive = false }: InstructionStepProps) {
  return (
    <motion.div
      variants={itemVariants}
      className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${
        isActive ? 'bg-amber-50 border border-amber-200' : 'bg-ceramic-base/50'
      }`}
    >
      <div
        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
          isActive
            ? 'bg-amber-500 text-white'
            : 'bg-ceramic-text-secondary/20 text-ceramic-text-secondary'
        }`}
      >
        {step}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold ${isActive ? 'text-amber-900' : 'text-ceramic-text-primary'}`}>
          {title}
        </p>
        <p className={`text-xs mt-0.5 ${isActive ? 'text-amber-700' : 'text-ceramic-text-secondary'}`}>
          {description}
        </p>
      </div>
    </motion.div>
  );
}

/**
 * Timer Display Component
 */
function TimerDisplay({
  seconds,
  isExpired,
  totalDuration = PAIRING_CODE_DURATION_SECONDS,
}: {
  seconds: number;
  isExpired: boolean;
  totalDuration?: number;
}) {
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const progress = Math.max(0, (seconds / totalDuration) * 100);

  return (
    <div className="flex items-center gap-2">
      <Clock className={`w-4 h-4 ${isExpired ? 'text-red-500' : 'text-ceramic-text-secondary'}`} />
      <div className="flex-1 h-2 bg-ceramic-inset rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${isExpired ? 'bg-red-500' : 'bg-amber-500'}`}
          initial={{ width: '100%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <span
        className={`text-sm font-mono font-bold ${
          isExpired ? 'text-red-500' : seconds <= 10 ? 'text-amber-600' : 'text-ceramic-text-primary'
        }`}
        aria-live="polite"
        aria-label={`Tempo restante: ${formatTime(seconds)}`}
      >
        {formatTime(seconds)}
      </span>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PairingCodeDisplay({
  phoneNumber,
  onConnected,
  onError,
  className = '',
  autoGenerate = false,
}: PairingCodeDisplayProps) {
  const {
    generateCode,
    code,
    isLoading,
    error,
    secondsRemaining,
    isExpired,
    reset,
    clearError,
  } = usePairingCode();

  const [copied, setCopied] = React.useState(false);

  // Auto-generate code on mount if enabled
  useEffect(() => {
    if (autoGenerate && phoneNumber && !code) {
      generateCode(phoneNumber);
    }
  }, [autoGenerate, phoneNumber, code, generateCode]);

  // Notify on error
  useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  // Handle generate/regenerate
  const handleGenerate = useCallback(async () => {
    clearError();
    await generateCode(phoneNumber);
  }, [phoneNumber, generateCode, clearError]);

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code.replace(/[^a-zA-Z0-9]/g, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_STATE_RESET_DELAY_MS);
    } catch (err) {
      console.error('[PairingCodeDisplay] Copy failed:', err);
    }
  }, [code]);

  return (
    <motion.div
      className={`space-y-5 ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <div className="ceramic-concave p-3 rounded-xl">
          <Smartphone className="w-5 h-5 text-ceramic-accent" />
        </div>
        <div>
          <h3 className="text-base font-bold text-ceramic-text-primary">
            Codigo de Pareamento
          </h3>
          <p className="text-xs text-ceramic-text-secondary">
            Conecte sem escanear QR Code
          </p>
        </div>
      </motion.div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-red-50 border border-red-200 rounded-xl"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-red-900">Erro ao gerar codigo</p>
                <p className="text-xs text-red-700 mt-1">{error}</p>
              </div>
              <button
                onClick={clearError}
                className="text-red-600 hover:text-red-800"
                aria-label="Fechar mensagem de erro"
              >
                <span className="sr-only">Fechar</span>
                &times;
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Code Display */}
      <AnimatePresence mode="wait">
        {code && !isExpired ? (
          <motion.div
            key="code"
            variants={codeVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="ceramic-inset p-6 rounded-2xl"
          >
            {/* Timer */}
            <div className="mb-4">
              <TimerDisplay seconds={secondsRemaining} isExpired={isExpired} />
            </div>

            {/* Code */}
            <div className="flex items-center justify-center gap-4">
              <motion.div
                className="text-4xl font-mono font-black tracking-[0.3em] text-ceramic-text-primary select-all"
                whileHover="pulse"
                variants={codeVariants}
                role="status"
                aria-label={`Codigo de pareamento: ${code}`}
              >
                {code}
              </motion.div>

              <button
                onClick={handleCopy}
                className="ceramic-card p-3 rounded-xl hover:scale-105 active:scale-95 transition-transform"
                aria-label={copied ? 'Codigo copiado' : 'Copiar codigo'}
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Copy className="w-5 h-5 text-ceramic-text-secondary" />
                )}
              </button>
            </div>

            {copied && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-xs text-green-600 mt-2"
              >
                Codigo copiado!
              </motion.p>
            )}
          </motion.div>
        ) : isExpired ? (
          <motion.div
            key="expired"
            variants={codeVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="ceramic-inset p-6 rounded-2xl text-center"
          >
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <p className="text-sm font-bold text-ceramic-text-primary mb-1">
              Codigo expirado
            </p>
            <p className="text-xs text-ceramic-text-secondary mb-4">
              Gere um novo codigo para continuar
            </p>
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="ceramic-card px-6 py-3 rounded-xl font-bold text-ceramic-accent hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gerando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Gerar novo codigo
                </span>
              )}
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            variants={codeVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="ceramic-inset p-8 rounded-2xl text-center"
          >
            <Smartphone className="w-12 h-12 text-ceramic-text-secondary mx-auto mb-3" />
            <p className="text-sm text-ceramic-text-secondary mb-4">
              Clique no botao abaixo para gerar o codigo
            </p>
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="ceramic-card px-6 py-3 rounded-xl font-bold text-ceramic-positive hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gerando codigo...
                </span>
              ) : (
                'Gerar codigo de pareamento'
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions */}
      <motion.div variants={itemVariants} className="space-y-2">
        <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider px-1">
          Como conectar
        </p>
        <div className="space-y-2">
          {PAIRING_INSTRUCTIONS.map((instruction, index) => (
            <InstructionStep
              key={instruction.step}
              {...instruction}
              isActive={code !== null && !isExpired && index === 3}
            />
          ))}
        </div>
      </motion.div>

      {/* Success state - when connected */}
      <AnimatePresence>
        {/* This would be shown when connection is verified */}
      </AnimatePresence>
    </motion.div>
  );
}

export default PairingCodeDisplay;
