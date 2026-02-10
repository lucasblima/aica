/**
 * ContextCard Component
 * Track 2: Foundation Components - FASE 2.1
 *
 * Hero component at top of Home showing contextual prompt/question
 * Follows Ceramic Design System with Layer 2 elevation
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Map, Sparkles, Check, X } from 'lucide-react';

export interface ContextCardProps {
  /** The contextual question or prompt to display */
  question: string;
  /** Source of the question: 'event' | 'journey' | 'daily' */
  source: 'event' | 'journey' | 'daily';
  /** Optional metadata about the source */
  sourceLabel?: string;
  /** Callback when user responds */
  onRespond: (response: string) => void;
  /** Callback to dismiss/skip */
  onDismiss?: () => void;
  /** Whether showing confirmation mode */
  showConfirmation?: boolean;
  /** Confirmation message when action completed */
  confirmationMessage?: string;
  /** Callback when confirmation auto-dismisses (after 3s) */
  onConfirmationComplete?: () => void;
  /** Loading state */
  isLoading?: boolean;
  /** Custom className */
  className?: string;
}

const SOURCE_CONFIG = {
  event: { icon: Calendar, label: 'Evento', color: 'text-ceramic-info' },
  journey: { icon: Map, label: 'Trilha', color: 'text-ceramic-accent' },
  daily: { icon: Sparkles, label: 'Reflexão', color: 'text-amber-600' },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export function ContextCard({
  question,
  source,
  sourceLabel,
  onRespond,
  onDismiss,
  showConfirmation = false,
  confirmationMessage,
  onConfirmationComplete,
  isLoading = false,
  className = '',
}: ContextCardProps) {
  const [inputValue, setInputValue] = useState('');
  const SourceIcon = SOURCE_CONFIG[source].icon;

  // Auto-dismiss confirmation after 3 seconds
  useEffect(() => {
    if (showConfirmation && onConfirmationComplete) {
      const timer = setTimeout(() => {
        onConfirmationComplete();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showConfirmation, onConfirmationComplete]);

  const handleSubmit = () => {
    if (inputValue.trim()) {
      onRespond(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <motion.div
      className={`ceramic-card p-6 ${className}`}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      data-testid="context-card"
    >
      <AnimatePresence mode="wait">
        {showConfirmation ? (
          <motion.div
            key="confirmation"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-3 py-4"
          >
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="w-12 h-12 rounded-full bg-ceramic-success/10 flex items-center justify-center"
            >
              <Check className="w-6 h-6 text-ceramic-success" />
            </motion.div>
            <span className="text-ceramic-text-primary font-medium">
              {confirmationMessage || 'Registrado com sucesso!'}
            </span>
          </motion.div>
        ) : (
          <motion.div key="question" exit={{ opacity: 0 }}>
            {/* Source Badge */}
            <div className="flex items-center justify-between mb-4">
              <div className="ceramic-badge-sm flex items-center gap-2">
                <SourceIcon className={`w-3.5 h-3.5 ${SOURCE_CONFIG[source].color}`} />
                <span className="text-xs font-bold text-ceramic-text-secondary uppercase">
                  {sourceLabel || SOURCE_CONFIG[source].label}
                </span>
              </div>
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="p-1 rounded-full hover:bg-ceramic-text-secondary/10 transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4 text-ceramic-text-secondary" />
                </button>
              )}
            </div>

            {/* Question */}
            <p className="text-lg font-medium text-ceramic-text-primary mb-4">
              {question}
            </p>

            {/* Quick Response Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Sua resposta..."
                className="flex-1 px-4 py-3 ceramic-inset rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                disabled={isLoading}
              />
              <motion.button
                onClick={handleSubmit}
                disabled={!inputValue.trim() || isLoading}
                className="px-6 py-3 ceramic-card rounded-xl font-bold text-sm text-ceramic-text-primary disabled:opacity-50 hover:scale-105 active:scale-95 transition-transform"
                whileTap={{ scale: 0.95 }}
              >
                {isLoading ? '...' : 'Enviar'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default ContextCard;
