/**
 * WizardProgress Component
 * Issue #100 - Wizard gamificado para cadastro completo de organizacoes
 *
 * Visual progress indicator with level badges and step indicators.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { WizardStep, CompletionLevelConfig } from '../../types/wizard';
import { WIZARD_STEPS } from '../../types/wizard';

interface WizardProgressProps {
  currentStepIndex: number;
  completedSteps: string[];
  completionPercentage: number;
  completionLevel: CompletionLevelConfig;
  xpEarned: number;
  xpPotential: number;
  onStepClick?: (index: number) => void;
}

export function WizardProgress({
  currentStepIndex,
  completedSteps,
  completionPercentage,
  completionLevel,
  xpEarned,
  xpPotential,
  onStepClick,
}: WizardProgressProps) {
  return (
    <div className="w-full">
      {/* Level Badge and XP */}
      <div className="flex items-center justify-between mb-4">
        <motion.div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ backgroundColor: completionLevel.bgColor }}
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <span className="text-lg">{completionLevel.icon}</span>
          <span
            className="text-sm font-semibold"
            style={{ color: completionLevel.color }}
          >
            {completionLevel.name}
          </span>
        </motion.div>

        <div className="flex items-center gap-2">
          <motion.span
            className="text-sm font-bold text-amber-500"
            key={xpEarned}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
          >
            {xpEarned} XP
          </motion.span>
          <span className="text-xs text-ceramic-text-secondary">/ {xpPotential}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-3 bg-ceramic-base rounded-full overflow-hidden mb-6">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${completionLevel.color} 0%, ${completionLevel.color}dd 100%)`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${completionPercentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />

        {/* Level markers */}
        <div className="absolute inset-0 flex">
          {[25, 50, 80].map((marker) => (
            <div
              key={marker}
              className="absolute h-full w-0.5 bg-ceramic-base/50"
              style={{ left: `${marker}%` }}
            />
          ))}
        </div>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-between">
        {WIZARD_STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = index === currentStepIndex;
          const isClickable = index <= currentStepIndex + 1 || isCompleted;

          return (
            <React.Fragment key={step.id}>
              {/* Step Circle */}
              <motion.button
                onClick={() => isClickable && onStepClick?.(index)}
                disabled={!isClickable}
                className={`
                  relative flex items-center justify-center w-10 h-10 rounded-full
                  transition-all duration-200
                  ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}
                  ${isCurrent
                    ? 'bg-amber-500 text-white ring-4 ring-amber-100'
                    : isCompleted
                      ? 'bg-ceramic-success text-white'
                      : 'bg-ceramic-base text-ceramic-text-secondary'
                  }
                `}
                whileHover={isClickable ? { scale: 1.1 } : undefined}
                whileTap={isClickable ? { scale: 0.95 } : undefined}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-semibold">{index + 1}</span>
                )}

                {/* Tooltip */}
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-ceramic-text-secondary whitespace-nowrap hidden sm:block">
                  {step.title}
                </span>
              </motion.button>

              {/* Connector Line */}
              {index < WIZARD_STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-2">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: index < currentStepIndex ? '#22c55e' : '#e5e7eb',
                    }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Current Step Label (Mobile) */}
      <p className="mt-8 text-center text-sm text-ceramic-text-secondary sm:hidden">
        <span className="font-semibold">{WIZARD_STEPS[currentStepIndex].title}</span>
        <span className="text-ceramic-text-secondary"> - Passo {currentStepIndex + 1} de {WIZARD_STEPS.length}</span>
      </p>
    </div>
  );
}

export default WizardProgress;
