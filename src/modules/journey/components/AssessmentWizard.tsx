/**
 * AssessmentWizard Component
 * Step-by-step questionnaire UI for psychometric instruments.
 * Sprint 3: Journey Validated Psychometric Well-Being
 *
 * Ceramic Design System: bg-ceramic-50, text-ceramic-800, shadow-ceramic-emboss, rounded-xl
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, CheckCircle2,
  Loader2, ClipboardCheck, BarChart3,
} from 'lucide-react';
import type { AssessmentInstrument, AssessmentItem } from '@/services/scoring/types';

interface AssessmentWizardProps {
  instrument: AssessmentInstrument;
  onComplete: (responses: Record<string, number>) => Promise<void>;
  onCancel?: () => void;
  className?: string;
}

export function AssessmentWizard({
  instrument,
  onComplete,
  onCancel,
  className = '',
}: AssessmentWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Filter to likert-type items only (affect grid uses AffectGridTap separately)
  const items = useMemo(
    () => instrument.items.filter(i => i.inputType === 'likert'),
    [instrument.items]
  );

  const totalSteps = items.length;
  const currentItem = items[currentStep];
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;
  const isLastStep = currentStep === totalSteps - 1;
  const canGoNext = currentItem && responses[currentItem.code] != null;
  const answeredCount = Object.keys(responses).length;

  const handleResponse = useCallback((code: string, value: number) => {
    setResponses(prev => ({ ...prev, [code]: value }));
  }, []);

  const handleNext = useCallback(async () => {
    if (isLastStep && canGoNext) {
      setIsSubmitting(true);
      try {
        await onComplete(responses);
        setIsComplete(true);
      } catch {
        // Error handled by parent
      } finally {
        setIsSubmitting(false);
      }
    } else if (canGoNext) {
      setCurrentStep(prev => prev + 1);
    }
  }, [isLastStep, canGoNext, onComplete, responses]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  if (isComplete) {
    return (
      <motion.div
        className={`bg-ceramic-50 rounded-xl p-6 shadow-ceramic-emboss text-center ${className}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-ceramic-success/10 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-ceramic-success" />
          </div>
          <h3 className="text-lg font-semibold text-ceramic-text-primary">
            Avaliação concluída!
          </h3>
          <p className="text-sm text-ceramic-text-secondary">
            {instrument.name} — {answeredCount} itens respondidos
          </p>
        </div>
      </motion.div>
    );
  }

  if (!currentItem) {
    return null;
  }

  const scaleMin = currentItem.scaleMin ?? 0;
  const scaleMax = currentItem.scaleMax ?? 10;
  const scaleRange = Array.from(
    { length: scaleMax - scaleMin + 1 },
    (_, i) => scaleMin + i
  );
  const selectedValue = responses[currentItem.code];

  return (
    <div className={`bg-ceramic-50 rounded-xl shadow-ceramic-emboss overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-6 pt-5 pb-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-semibold text-ceramic-text-primary">
              {instrument.shortName}
            </h3>
          </div>
          <span className="text-xs text-ceramic-text-secondary">
            {currentStep + 1} / {totalSteps}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-ceramic-border rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-amber-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="px-6 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentItem.code}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <p className="text-base font-medium text-ceramic-text-primary mb-6 leading-relaxed">
              {currentItem.text}
            </p>

            {/* Scale labels */}
            <div className="flex justify-between mb-2">
              <span className="text-xs text-ceramic-text-secondary">
                {currentItem.scaleMinLabel}
              </span>
              <span className="text-xs text-ceramic-text-secondary">
                {currentItem.scaleMaxLabel}
              </span>
            </div>

            {/* Likert buttons */}
            <div className="flex gap-1.5 flex-wrap justify-center">
              {scaleRange.map(value => (
                <button
                  key={value}
                  onClick={() => handleResponse(currentItem.code, value)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-all duration-150 ${
                    selectedValue === value
                      ? 'bg-amber-500 text-white shadow-md scale-110'
                      : 'bg-white text-ceramic-text-secondary hover:bg-amber-50 hover:text-ceramic-text-primary border border-ceramic-border'
                  }`}
                  aria-label={`${value}`}
                  aria-pressed={selectedValue === value}
                >
                  {value}
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="px-6 pb-5 flex items-center justify-between">
        <div className="flex gap-2">
          {currentStep > 0 && (
            <button
              onClick={handleBack}
              className="flex items-center gap-1 px-3 py-2 text-sm text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors rounded-lg"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>
          )}
          {onCancel && currentStep === 0 && (
            <button
              onClick={onCancel}
              className="px-3 py-2 text-sm text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors rounded-lg"
            >
              Cancelar
            </button>
          )}
        </div>

        <button
          onClick={handleNext}
          disabled={!canGoNext || isSubmitting}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            canGoNext && !isSubmitting
              ? 'bg-amber-500 hover:bg-amber-600 text-white'
              : 'bg-ceramic-border text-ceramic-text-secondary cursor-not-allowed'
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Salvando...
            </>
          ) : isLastStep ? (
            <>
              <BarChart3 className="w-4 h-4" />
              Concluir
            </>
          ) : (
            <>
              Próximo
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default AssessmentWizard;
