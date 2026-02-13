/**
 * BudgetSettingsDrawer Component
 *
 * Drawer lateral (desktop) / bottom (mobile) para configuração de orçamento mensal de IA.
 * Inspirado no design da Apple - transições suaves, contexto preservado.
 *
 * Features:
 * - Desktop: Slide-in da direita (600px width)
 * - Mobile: Slide-in de baixo (full-height)
 * - Backdrop translúcido (preserva contexto)
 * - Swipe to dismiss (mobile)
 * - Sugestões rápidas: $10, $25, $50, $100
 */

import React, { useState } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue } from 'framer-motion';
import { X, DollarSign, Save, AlertCircle } from 'lucide-react';
import { updateUserAIBudget } from '../../services/userSettingsService';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('BudgetSettingsDrawer');

interface BudgetSettingsDrawerProps {
  currentBudget: number;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newBudget: number) => void;
}

export const BudgetSettingsDrawer: React.FC<BudgetSettingsDrawerProps> = ({
  currentBudget,
  isOpen,
  onClose,
  onSave
}) => {
  const [budget, setBudget] = useState(currentBudget.toString());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Swipe to dismiss (mobile)
  const y = useMotionValue(0);

  const handleSave = async () => {
    const budgetValue = parseFloat(budget);

    if (isNaN(budgetValue) || budgetValue < 0) {
      setError('Digite um valor válido');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await updateUserAIBudget(budgetValue);
      onSave(budgetValue);
      onClose();
    } catch (err) {
      setError('Erro ao salvar orçamento');
      log.error('Error saving budget:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Close drawer if dragged down >150px on mobile
    if (info.offset.y > 150) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            style={{ y }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[600px] bg-ceramic-base shadow-2xl flex flex-col
                       sm:rounded-l-2xl overflow-hidden"
          >
            {/* Mobile drag handle */}
            <div className="sm:hidden flex justify-center py-2 bg-ceramic-base border-b border-ceramic-text-secondary/10">
              <div className="w-12 h-1 rounded-full bg-ceramic-text-secondary/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-ceramic-text-secondary/10 bg-white/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 ceramic-inset flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-ceramic-accent" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-ceramic-text-primary">
                    Definir Orçamento Mensal
                  </h2>
                  <p className="text-sm text-ceramic-text-secondary mt-1">
                    Configure seu limite de gastos com IA
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-white/30 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-ceramic-text-secondary" />
              </button>
            </div>

            {/* Content (scrollable) */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-3 p-4 bg-ceramic-error/10 border border-ceramic-error/20 rounded-lg mb-6">
                  <AlertCircle className="w-5 h-5 text-ceramic-error mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ceramic-error">{error}</p>
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                  Orçamento Mensal (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ceramic-text-secondary">$</span>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 ceramic-inset rounded-xl text-lg font-bold text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent"
                    placeholder="50.00"
                    min="0"
                    step="0.01"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-ceramic-text-secondary mt-2">
                  Você receberá alertas ao atingir 80%, 90% e 100% do orçamento.
                </p>
              </div>

              {/* Sugestões */}
              <div>
                <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                  Sugestões
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {[10, 25, 50, 100].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setBudget(val.toString())}
                      className="ceramic-inset hover:scale-105 transition-transform py-2 px-3 rounded-lg text-sm font-bold text-ceramic-text-primary"
                    >
                      ${val}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer (fixed) */}
            <div className="flex items-center justify-between p-6 border-t border-ceramic-text-secondary/10 bg-white/20">
              <div className="flex-1" />

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-ceramic-text-primary hover:bg-white/30 transition-colors"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-ceramic-accent hover:bg-ceramic-accent/90 disabled:bg-ceramic-text-secondary/20 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Salvar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
