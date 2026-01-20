/**
 * ProcessingEstimateModal Component
 *
 * Modal showing cost estimate before processing a contact.
 * Displays:
 * - Message count
 * - Credit cost
 * - User balance
 * - Estimated duration
 * - Confirm/Cancel actions
 */

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  AlertCircle,
  Coins,
  MessageSquare,
  Clock,
  Sparkles,
  Loader2,
  RefreshCw
} from 'lucide-react'
import type { ProcessingEstimate } from '@/hooks/useProcessContact'

interface ProcessingEstimateModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  estimate: ProcessingEstimate | null
  contactName: string
  isProcessing: boolean
}

export function ProcessingEstimateModal({
  isOpen,
  onClose,
  onConfirm,
  estimate,
  contactName,
  isProcessing
}: ProcessingEstimateModalProps) {
  if (!isOpen || !estimate) return null

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isProcessing) {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={isProcessing ? undefined : onClose}
        onKeyDown={handleKeyDown}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-ceramic-base w-full max-w-md rounded-2xl shadow-2xl border border-ceramic-text-secondary/10 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-ceramic-text-secondary/10 bg-gradient-to-r from-purple-500/10 to-indigo-500/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-xl">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-ceramic-text-primary">
                  {estimate.hasExistingAnalysis ? 'Re-analisar' : 'Processar'} com Aica
                </h2>
                <p className="text-sm text-ceramic-text-secondary">
                  {contactName}
                </p>
              </div>
            </div>
            {!isProcessing && (
              <button
                onClick={onClose}
                className="p-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors rounded-lg hover:bg-ceramic-text-secondary/10"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            {/* Message count */}
            <div className="flex items-center gap-3 p-3 ceramic-inset rounded-xl">
              <MessageSquare className="w-5 h-5 text-ceramic-text-secondary" />
              <div>
                <span className="font-bold text-ceramic-text-primary">
                  {estimate.messageCount}
                </span>
                <span className="text-ceramic-text-secondary ml-1">
                  mensagens para analisar
                </span>
              </div>
            </div>

            {/* Duration estimate */}
            <div className="flex items-center gap-3 p-3 ceramic-inset rounded-xl">
              <Clock className="w-5 h-5 text-ceramic-text-secondary" />
              <div>
                <span className="text-ceramic-text-secondary">Tempo estimado:</span>
                <span className="font-bold text-ceramic-text-primary ml-1">
                  {estimate.estimatedDuration}
                </span>
              </div>
            </div>

            {/* Credit cost - highlighted */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
              <div className="flex items-center gap-3">
                <Coins className="w-6 h-6 text-purple-500" />
                <span className="font-bold text-ceramic-text-primary">Custo</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-purple-600">
                  {estimate.creditCost}
                </span>
                <span className="text-purple-600 ml-1">créditos</span>
              </div>
            </div>

            {/* Balance */}
            <div className="flex items-center justify-between px-2 text-sm">
              <span className="text-ceramic-text-secondary">Seu saldo</span>
              <span className={`font-bold ${estimate.canAfford ? 'text-green-500' : 'text-red-500'}`}>
                {estimate.userBalance} créditos
              </span>
            </div>

            {/* Insufficient credits warning */}
            {!estimate.canAfford && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-100"
              >
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-700">Créditos insuficientes</p>
                  <p className="text-sm text-red-600 mt-1">
                    Você precisa de mais{' '}
                    <strong>{estimate.creditCost - estimate.userBalance}</strong> créditos.
                    Complete tarefas ou volte amanhã para créditos diários!
                  </p>
                </div>
              </motion.div>
            )}

            {/* Re-analysis notice */}
            {estimate.hasExistingAnalysis && estimate.lastAnalyzedAt && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <RefreshCw className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-amber-700">
                  Última análise:{' '}
                  {new Date(estimate.lastAnalyzedAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 p-5 border-t border-ceramic-text-secondary/10 bg-ceramic-text-secondary/5">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 rounded-xl ceramic-card font-bold text-ceramic-text-secondary hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={!estimate.canAfford || isProcessing}
              className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold hover:from-purple-600 hover:to-indigo-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Confirmar
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default ProcessingEstimateModal
