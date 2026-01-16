/**
 * WizardStep Component
 * Issue #100 - Wizard gamificado para cadastro completo de organizacoes
 *
 * Container for each wizard step with animated transitions.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Save, Loader2 } from 'lucide-react';
import type { WizardStep as WizardStepType } from '../../types/wizard';

interface WizardStepProps {
  step: WizardStepType;
  stepIndex: number;
  totalSteps: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  isSaving?: boolean;
  direction?: number;
  onNext: () => void;
  onPrev: () => void;
  onSave?: () => void;
  children: React.ReactNode;
}

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 100 : -100,
    opacity: 0,
  }),
};

export function WizardStep({
  step,
  stepIndex,
  totalSteps,
  isFirstStep,
  isLastStep,
  isSaving = false,
  direction = 1,
  onNext,
  onPrev,
  onSave,
  children,
}: WizardStepProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Step Header */}
      <div className="mb-6">
        <motion.h2
          className="text-2xl font-bold text-gray-900"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {step.title}
        </motion.h2>
        <motion.p
          className="mt-1 text-gray-500"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {step.description}
        </motion.p>

        {/* XP Reward Badge */}
        {step.xpReward > 0 && (
          <motion.div
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-sm"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <span className="text-amber-500">+{step.xpReward} XP</span>
            <span className="text-amber-400">ao completar</span>
          </motion.div>
        )}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step.id}
          custom={direction}
          variants={stepVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: 'spring', stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
          }}
          className="flex-1 overflow-y-auto"
        >
          {children}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Footer */}
      <div className="mt-8 pt-6 border-t border-gray-100">
        <div className="flex items-center justify-between">
          {/* Back Button */}
          <motion.button
            onClick={onPrev}
            disabled={isFirstStep}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
              ${isFirstStep
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-100'
              }
            `}
            whileHover={!isFirstStep ? { x: -4 } : undefined}
            whileTap={!isFirstStep ? { scale: 0.95 } : undefined}
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Voltar</span>
          </motion.button>

          {/* Step Counter */}
          <span className="text-sm text-gray-400">
            {stepIndex + 1} / {totalSteps}
          </span>

          {/* Next/Save Button */}
          <div className="flex items-center gap-2">
            {/* Save Button (always visible) */}
            {onSave && (
              <motion.button
                onClick={onSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Salvar</span>
              </motion.button>
            )}

            {/* Next/Finish Button */}
            <motion.button
              onClick={onNext}
              className={`
                flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-all
                ${isLastStep
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-amber-500 text-white hover:bg-amber-600'
                }
              `}
              whileHover={{ scale: 1.02, x: isLastStep ? 0 : 4 }}
              whileTap={{ scale: 0.98 }}
            >
              <span>{isLastStep ? 'Finalizar' : 'Proximo'}</span>
              {!isLastStep && <ChevronRight className="w-5 h-5" />}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WizardStep;
