/**
 * Trail Selection Flow Component
 * Comprehensive UX for users to select and complete contextual trails
 *
 * Features:
 * - Visual trail selection (5 trails with icons/colors)
 * - Sequential question answering (3-4 questions per trail)
 * - Progress tracking and visual feedback
 * - Skip option for trails
 * - Score calculation and module recommendations
 * - Consciousness points awarding
 * - Responsive design (mobile, tablet, desktop)
 * - WCAG AAA accessibility
 *
 * @version 1.0.0
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, CheckCircle, AlertCircle, SkipForward } from 'lucide-react';
import { CONTEXTUAL_TRAILS, ALL_TRAILS } from '../../../data/contextualTrails';
import {
  ContextualTrail,
  ContextualQuestion,
  ContextualAnswer,
  CaptureTrailRequest,
  CaptureTrailResponse,
} from '../../../types/onboardingTypes';
import { captureContextualTrail, finalizeOnboarding } from '../../../api/onboardingAPI';
import ProgressBar from './common/ProgressBar';
import TrailCard from './trails/TrailCard';
import TrailQuestions from './trails/TrailQuestions';

interface TrailSelectionFlowProps {
  userId: string;
  onComplete: (result: CaptureTrailResponse) => void;
  onError: (error: string) => void;
  maxTrails?: number;
  minTrailsRequired?: number;
}

interface FlowState {
  phase: 'trail-selection' | 'answering-questions' | 'complete';
  selectedTrails: string[];
  currentTrailIndex: number;
  currentQuestionIndex: number;
  responses: Record<string, string[]>; // questionId -> selectedAnswerIds
  trailScores: Record<string, number>; // trailId -> score
  completedTrails: string[];
  loading: boolean;
  error: string | null;
}

const TrailSelectionFlow: React.FC<TrailSelectionFlowProps> = ({
  userId,
  onComplete,
  onError,
  maxTrails = 5,
  minTrailsRequired = 3,
}) => {
  const [state, setState] = useState<FlowState>({
    phase: 'trail-selection',
    selectedTrails: [],
    currentTrailIndex: 0,
    currentQuestionIndex: 0,
    responses: {},
    trailScores: {},
    completedTrails: [],
    loading: false,
    error: null,
  });

  const trails = ALL_TRAILS.slice(0, maxTrails);
  const currentTrail = state.selectedTrails[state.currentTrailIndex]
    ? CONTEXTUAL_TRAILS[state.selectedTrails[state.currentTrailIndex] as keyof typeof CONTEXTUAL_TRAILS]
    : null;

  // Handle trail selection toggle
  const toggleTrailSelection = useCallback((trailId: string) => {
    setState(prev => {
      const alreadySelected = prev.selectedTrails.includes(trailId);
      if (alreadySelected) {
        return {
          ...prev,
          selectedTrails: prev.selectedTrails.filter(id => id !== trailId),
        };
      } else if (prev.selectedTrails.length < maxTrails) {
        return {
          ...prev,
          selectedTrails: [...prev.selectedTrails, trailId],
        };
      }
      return prev;
    });
  }, [maxTrails]);

  // Start answering trail questions
  const startAnsweringTrails = useCallback(() => {
    if (state.selectedTrails.length === 0) {
      setState(prev => ({ ...prev, error: 'Selecione pelo menos uma trilha' }));
      return;
    }
    setState(prev => ({
      ...prev,
      phase: 'answering-questions',
      error: null,
    }));
  }, [state.selectedTrails.length]);

  // Handle answer selection
  const handleAnswerSelect = useCallback((answerId: string, questionId: string, isMultiple: boolean) => {
    setState(prev => {
      const currentAnswers = prev.responses[questionId] || [];
      let newAnswers: string[];

      if (isMultiple) {
        newAnswers = currentAnswers.includes(answerId)
          ? currentAnswers.filter(id => id !== answerId)
          : [...currentAnswers, answerId];
      } else {
        newAnswers = [answerId];
      }

      return {
        ...prev,
        responses: {
          ...prev.responses,
          [questionId]: newAnswers,
        },
      };
    });
  }, []);

  // Move to next question
  const nextQuestion = useCallback(() => {
    if (!currentTrail) return;

    const currentQuestion = currentTrail.questions[state.currentQuestionIndex];
    const hasAnswer = state.responses[currentQuestion.id] && state.responses[currentQuestion.id].length > 0;

    if (!hasAnswer && currentQuestion.isRequired) {
      setState(prev => ({ ...prev, error: 'Por favor, responda esta pergunta' }));
      return;
    }

    if (state.currentQuestionIndex < currentTrail.questions.length - 1) {
      setState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
        error: null,
      }));
    }
    // Note: Last question submission is handled by the "Salvar Trilha" button
  }, [currentTrail, state.currentQuestionIndex, state.responses]);

  // Move to previous question
  const prevQuestion = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentQuestionIndex: Math.max(0, prev.currentQuestionIndex - 1),
      error: null,
    }));
  }, []);

  // Skip current trail
  const skipTrail = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Don't save responses, just move to next trail
      setState(prev => {
        const nextTrailIndex = prev.currentTrailIndex + 1;

        if (nextTrailIndex >= prev.selectedTrails.length) {
          return {
            ...prev,
            phase: 'complete',
            loading: false,
          };
        }

        return {
          ...prev,
          currentTrailIndex: nextTrailIndex,
          currentQuestionIndex: 0,
          loading: false,
        };
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Erro ao pular trilha',
        loading: false,
      }));
    }
  }, []);

  // Submit current trail responses
  const submitTrail = useCallback(async () => {
    if (!currentTrail) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Prepare request
      const request: CaptureTrailRequest = {
        userId,
        trailId: currentTrail.id,
        responses: currentTrail.questions.map(question => ({
          questionId: question.id,
          selectedAnswerIds: state.responses[question.id] || [],
        })),
      };

      // Submit to API
      const response = await captureContextualTrail(request);

      if (!response.success) {
        throw new Error(response.message);
      }

      // Store score
      setState(prev => {
        const nextTrailIndex = prev.currentTrailIndex + 1;
        const newCompletedTrails = [...prev.completedTrails, currentTrail.id];

        if (nextTrailIndex >= prev.selectedTrails.length) {
          // All trails completed
          return {
            ...prev,
            trailScores: {
              ...prev.trailScores,
              [currentTrail.id]: response.trailScore,
            },
            completedTrails: newCompletedTrails,
            phase: 'complete',
            loading: false,
          };
        }

        return {
          ...prev,
          currentTrailIndex: nextTrailIndex,
          currentQuestionIndex: 0,
          trailScores: {
            ...prev.trailScores,
            [currentTrail.id]: response.trailScore,
          },
          completedTrails: newCompletedTrails,
          responses: {}, // Reset responses for next trail
          loading: false,
        };
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erro ao salvar respostas',
        loading: false,
      }));
    }
  }, [currentTrail, state.responses, userId]);

  // Finalize onboarding
  const finalizeFlow = useCallback(async () => {
    if (state.completedTrails.length < minTrailsRequired) {
      setState(prev => ({
        ...prev,
        error: `Complète pelo menos ${minTrailsRequired} trilhas`,
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await finalizeOnboarding(userId);
      if (!result.success) {
        throw new Error(result.message);
      }
      onComplete({
        success: true,
        trailId: state.completedTrails[0],
        trailScore: Math.max(...Object.values(state.trailScores)),
        recommendedModules: result.allRecommendedModules,
        nextStep: 'step_2_moment_capture',
        message: 'Trilhas completadas com sucesso!',
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erro ao finalizar',
        loading: false,
      }));
      onError(state.error || 'Erro desconhecido');
    }
  }, [state.completedTrails, state.trailScores, userId, minTrailsRequired, onComplete, onError, state.error]);

  // Progress calculations
  const totalTrails = state.selectedTrails.length;
  const completedTrails = state.completedTrails.length;
  const progressPercent = totalTrails > 0 ? (completedTrails / totalTrails) * 100 : 0;

  // Render phases
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF9F7] to-[#F8F7F5] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-[#2B1B17] mb-4">
            Vamos Entender Seu Contexto
          </h1>
          <p className="text-lg text-[#5C554B] max-w-2xl">
            Responda algumas perguntas simples sobre você para personalizarmos sua jornada.
          </p>
        </motion.div>

        {/* Trail Selection Phase */}
        {state.phase === 'trail-selection' && (
          <motion.div
            key="trail-selection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            <div>
              <h2 className="text-2xl font-bold text-[#2B1B17] mb-2">
                Quais áreas são mais importantes para você?
              </h2>
              <p className="text-[#5C554B] mb-6">
                Selecione de 1 a {maxTrails} trilhas que deseja explorar
              </p>

              {/* Trail Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trails.map((trail, index) => (
                  <motion.div
                    key={trail.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <TrailCard
                      trail={trail}
                      isSelected={state.selectedTrails.includes(trail.id)}
                      onToggle={() => toggleTrailSelection(trail.id)}
                    />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Error Display */}
            {state.error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 items-start p-4 bg-red-50 border border-red-200 rounded-lg"
              >
                <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-700">{state.error}</p>
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center pt-4">
              <button
                onClick={startAnsweringTrails}
                disabled={state.selectedTrails.length === 0 || state.loading}
                className="px-8 py-3 bg-[#6B9EFF] text-white font-bold rounded-lg hover:bg-[#5A8FEF] disabled:opacity-50 transition-all flex items-center gap-2"
              >
                Continuar
                <ChevronRight size={20} />
              </button>
            </div>
          </motion.div>
        )}

        {/* Answering Questions Phase */}
        {state.phase === 'answering-questions' && currentTrail && (
          <motion.div
            key="answering"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            {/* Progress Bar */}
            <ProgressBar
              current={completedTrails + 1}
              total={totalTrails}
              label={`Trilha ${completedTrails + 1} de ${totalTrails}`}
            />

            {/* Current Trail Info */}
            <div className="bg-white rounded-xl p-6 border border-[#E8E6E0] shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="text-3xl"
                  role="img"
                  aria-label={currentTrail.name}
                >
                  {/* Icon will be rendered via Lucide */}
                </span>
                <div>
                  <h2 className="text-2xl font-bold text-[#2B1B17]">{currentTrail.name}</h2>
                  <p className="text-[#5C554B]">{currentTrail.description}</p>
                </div>
              </div>
            </div>

            {/* Questions */}
            <TrailQuestions
              trail={currentTrail}
              currentQuestionIndex={state.currentQuestionIndex}
              responses={state.responses}
              onAnswerSelect={handleAnswerSelect}
            />

            {/* Error Display */}
            {state.error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 items-start p-4 bg-red-50 border border-red-200 rounded-lg"
              >
                <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-700">{state.error}</p>
              </motion.div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-4 justify-between items-center pt-4 border-t border-[#E8E6E0]">
              <button
                onClick={prevQuestion}
                disabled={state.currentQuestionIndex === 0 || state.loading}
                className="px-6 py-2 border border-[#E8E6E0] text-[#5C554B] font-semibold rounded-lg hover:bg-[#F8F7F5] disabled:opacity-50 transition-all flex items-center gap-2"
              >
                <ChevronLeft size={18} />
                Anterior
              </button>

              <div className="flex gap-3">
                <button
                  onClick={skipTrail}
                  disabled={state.loading}
                  className="px-6 py-2 text-[#6B9EFF] font-semibold hover:bg-blue-50 rounded-lg transition-all flex items-center gap-2"
                >
                  <SkipForward size={18} />
                  Pular Trilha
                </button>

                {state.currentQuestionIndex === currentTrail.questions.length - 1 ? (
                  <button
                    onClick={submitTrail}
                    disabled={state.loading}
                    className="px-6 py-2 bg-[#51CF66] text-white font-semibold rounded-lg hover:bg-[#40C057] disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    {state.loading ? 'Salvando...' : 'Salvar Trilha'}
                    <CheckCircle size={18} />
                  </button>
                ) : (
                  <button
                    onClick={nextQuestion}
                    disabled={state.loading}
                    className="px-6 py-2 bg-[#6B9EFF] text-white font-semibold rounded-lg hover:bg-[#5A8FEF] disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    Próximo
                    <ChevronRight size={18} />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Complete Phase */}
        {state.phase === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-8"
          >
            <div className="bg-white rounded-xl p-8 border border-[#E8E6E0] shadow-lg text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="mb-6"
              >
                <CheckCircle size={64} className="text-[#51CF66] mx-auto" />
              </motion.div>

              <h2 className="text-3xl font-bold text-[#2B1B17] mb-4">
                Excelente!
              </h2>
              <p className="text-lg text-[#5C554B] mb-8">
                Você completou {state.completedTrails.length} trilha(s) com sucesso!
              </p>

              {/* Summary */}
              <div className="bg-[#F8F7F5] rounded-lg p-6 mb-8">
                <h3 className="font-bold text-[#2B1B17] mb-4">Trilhas Completadas:</h3>
                <div className="space-y-3">
                  {state.completedTrails.map(trailId => {
                    const trail = CONTEXTUAL_TRAILS[trailId as keyof typeof CONTEXTUAL_TRAILS];
                    const score = state.trailScores[trailId];
                    return (
                      <div
                        key={trailId}
                        className="flex justify-between items-center p-3 bg-white rounded border border-[#E8E6E0]"
                      >
                        <span className="font-semibold text-[#2B1B17]">{trail?.name}</span>
                        <span className="text-[#6B9EFF] font-bold">
                          {(score * 10).toFixed(0)}/100
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {state.error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 items-start p-4 bg-red-50 border border-red-200 rounded-lg mb-8"
                >
                  <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700">{state.error}</p>
                </motion.div>
              )}

              {/* Final Action */}
              <button
                onClick={finalizeFlow}
                disabled={state.completedTrails.length < minTrailsRequired || state.loading}
                className="px-8 py-3 bg-[#6B9EFF] text-white font-bold rounded-lg hover:bg-[#5A8FEF] disabled:opacity-50 transition-all"
              >
                {state.loading ? 'Processando...' : 'Continuar para Próximo Passo'}
              </button>

              {state.completedTrails.length < minTrailsRequired && (
                <p className="text-sm text-[#948D82] mt-4">
                  Complete pelo menos {minTrailsRequired} trilhas para continuar
                </p>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default TrailSelectionFlow;
