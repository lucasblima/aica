/**
 * Trail Questions Component
 * Renders questions for a contextual trail with multiple/single choice options
 *
 * Features:
 * - Single and multiple choice support
 * - Visual feedback for selections
 * - Required field validation
 * - Help text display
 * - Responsive design
 * - WCAG compliant
 *
 * @version 1.0.0
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ContextualTrail } from '../../../../types/onboardingTypes';

interface TrailQuestionsProps {
  trail: ContextualTrail;
  currentQuestionIndex: number;
  responses: Record<string, string[]>;
  onAnswerSelect: (answerId: string, questionId: string, isMultiple: boolean) => void;
}

const TrailQuestions: React.FC<TrailQuestionsProps> = ({
  trail,
  currentQuestionIndex,
  responses,
  onAnswerSelect,
}) => {
  const currentQuestion = useMemo(
    () => trail.questions[currentQuestionIndex],
    [trail.questions, currentQuestionIndex]
  );

  const selectedAnswers = responses[currentQuestion?.id] || [];

  if (!currentQuestion) {
    return null;
  }

  const isMultiple = currentQuestion.type === 'multiple';

  return (
    <motion.div
      key={currentQuestion.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Question Header */}
      <div className="space-y-2">
        <h3 className="text-2xl font-bold text-[#2B1B17]">
          {currentQuestion.question}
        </h3>
        {currentQuestion.helpText && (
          <p className="text-[#5C554B]">{currentQuestion.helpText}</p>
        )}
        {isMultiple && (
          <p className="text-sm text-[#948D82] italic">
            Você pode selecionar múltiplas opções
          </p>
        )}
      </div>

      {/* Answer Options */}
      <div className="space-y-3">
        {currentQuestion.answers.map((answer, index) => {
          const isSelected = selectedAnswers.includes(answer.id);

          return (
            <motion.button
              key={answer.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onAnswerSelect(answer.id, currentQuestion.id, isMultiple)}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isSelected
                  ? 'border-[#6B9EFF] bg-ceramic-info/10'
                  : 'border-[#E8E6E0] bg-ceramic-base hover:border-[#948D82]'
              }`}
              aria-pressed={isSelected}
              role="option">
              <div className="flex items-start gap-4">
                {/* Checkbox/Radio */}
                <div
                  className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border-2 transition-all ${
                    isSelected
                      ? 'bg-[#6B9EFF] border-[#6B9EFF]'
                      : 'border-[#D0CCBF] bg-ceramic-base'
                  }`}
                >
                  {isSelected && (
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1">
                  {/* Icon (if present) */}
                  {answer.icon && (
                    <span className="text-2xl mr-2" role="img" aria-hidden>
                      {answer.icon}
                    </span>
                  )}

                  {/* Label */}
                  <p className="font-semibold text-[#2B1B17] mb-1">
                    {answer.label}
                  </p>

                  {/* Description */}
                  {answer.description && (
                    <p className="text-sm text-[#5C554B]">
                      {answer.description}
                    </p>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Selection Summary */}
      {isMultiple && selectedAnswers.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-ceramic-info/10 border border-[#6B9EFF] rounded-lg p-4"
        >
          <p className="text-sm text-[#5C554B] mb-2">
            <strong>Selecionado:</strong> {selectedAnswers.length} opção(ões)
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedAnswers.map(answerId => {
              const answer = currentQuestion.answers.find(a => a.id === answerId);
              return (
                <span
                  key={answerId}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-ceramic-base rounded-full text-sm font-medium text-[#6B9EFF] border border-[#6B9EFF]"
                >
                  {answer?.label}
                  <button
                    onClick={() => onAnswerSelect(answerId, currentQuestion.id, isMultiple)}
                    className="text-[#6B9EFF] hover:text-[#5A8FEF]"
                    aria-label={`Remover ${answer?.label}`}
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Progress Indicator */}
      <div className="flex gap-2 justify-center pt-4">
        {trail.questions.map((_, index) => (
          <motion.div
            key={index}
            className={`h-2 rounded-full transition-all ${
              index === currentQuestionIndex
                ? 'bg-[#6B9EFF] w-8'
                : index < currentQuestionIndex
                ? 'bg-[#51CF66] w-4'
                : 'bg-[#D0CCBF] w-4'
            }`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.05 }}
          />
        ))}
      </div>
    </motion.div>
  );
};

export default TrailQuestions;
