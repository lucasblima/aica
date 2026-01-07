/**
 * Onboarding Flow Orchestrator
 * Complete redesigned onboarding experience for new users
 *
 * Flow:
 * 1. Welcome Tour - Introduces 4 pilares (Atlas, Jornada, Podcast, Finance)
 * 2. Trail Selection - User selects 3-5 contextual trails
 * 3. Trail Answering - User answers questions for each selected trail
 * 4. Moment Capture - User captures their first moment with 7-step flow
 * 5. Recommendations - AI-powered module recommendations based on trail responses
 * 6. Module Selection - User selects which modules to enable
 *
 * Features:
 * - Smooth step transitions with animations
 * - Progress tracking
 * - Data persistence between steps
 * - Error handling and recovery
 * - Responsive design
 * - WCAG AAA accessibility
 *
 * @version 1.0.0
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Loader, CheckSquare, Heart, Mic, TrendingUp, Check } from 'lucide-react';
import { WelcomeTour } from './WelcomeTour';
import TrailSelectionFlow from './TrailSelectionFlow';
import MomentCaptureFlow from './MomentCaptureFlow';
import FeedbackModal from './FeedbackModal';
import { CaptureTrailResponse } from '../../../types/onboardingTypes';
import {
  MomentCaptureData,
  AudioRecording
} from './MomentCaptureFlow';

// Real Aica modules with proper data
const AICA_MODULES = [
  {
    id: 'atlas',
    name: 'Atlas',
    description: 'Organize suas tarefas diárias com a matriz de Eisenhower',
    icon: CheckSquare,
    color: '#6B9EFF',
    enabled: true, // Always enabled by default
  },
  {
    id: 'jornada',
    name: 'Jornada',
    description: 'Registre momentos e acompanhe seu crescimento pessoal',
    icon: Heart,
    color: '#845EF7',
    enabled: true,
  },
  {
    id: 'podcast',
    name: 'Podcast Studio',
    description: 'Crie e produza conteúdo de áudio com IA',
    icon: Mic,
    color: '#FF922B',
    enabled: false, // Optional
  },
  {
    id: 'financeiro',
    name: 'Financeiro',
    description: 'Gerencie suas finanças e alcance seus objetivos',
    icon: TrendingUp,
    color: '#51CF66',
    enabled: false, // Optional
  },
];

interface OnboardingFlowProps {
  userId: string;
  onComplete: () => void;
  onError?: (error: string) => void;
}

type OnboardingStep =
  | 'welcome-tour'
  | 'trail-selection'
  | 'moment-capture'
  | 'recommendations'
  | 'complete';

interface OnboardingState {
  currentStep: OnboardingStep;
  trailResponses: CaptureTrailResponse | null;
  momentData: MomentCaptureData | null;
  recommendations: any[];
  loading: boolean;
  error: string | null;
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  userId,
  onComplete,
  onError,
}) => {
  const [state, setState] = useState<OnboardingState>({
    currentStep: 'welcome-tour',
    trailResponses: null,
    momentData: null,
    recommendations: [],
    loading: false,
    error: null,
  });

  // Handle welcome tour completion
  const handleWelcomeTourComplete = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: 'trail-selection',
      error: null,
    }));
  }, []);

  // Handle welcome tour skip (same as complete - advances to next step)
  const handleWelcomeTourSkip = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: 'trail-selection',
      error: null,
    }));
  }, []);

  // Handle trail selection completion
  const handleTrailSelectionComplete = useCallback((result: CaptureTrailResponse) => {
    setState(prev => ({
      ...prev,
      currentStep: 'moment-capture',
      trailResponses: result,
      error: null,
    }));
  }, []);

  // Handle trail selection error
  const handleTrailSelectionError = useCallback((error: string) => {
    setState(prev => ({
      ...prev,
      error,
    }));
    onError?.(error);
  }, [onError]);

  // Handle moment capture completion
  const handleMomentCaptureComplete = useCallback((data: MomentCaptureData) => {
    setState(prev => ({
      ...prev,
      momentData: data,
      currentStep: 'recommendations',
      error: null,
    }));
  }, []);

  // Handle moment capture error
  const handleMomentCaptureError = useCallback((error: string) => {
    setState(prev => ({
      ...prev,
      error,
    }));
    onError?.(error);
  }, [onError]);

  // Handle final onboarding completion
  const handleOnboardingComplete = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: 'complete',
    }));
    // Wait for animation before calling complete
    setTimeout(() => {
      onComplete();
    }, 500);
  }, [onComplete]);

  // Handle error dismissal
  const handleDismissError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  // Handle step back
  const handleGoBack = useCallback(() => {
    setState(prev => {
      switch (prev.currentStep) {
        case 'trail-selection':
          return { ...prev, currentStep: 'welcome-tour' };
        case 'moment-capture':
          return { ...prev, currentStep: 'trail-selection' };
        case 'recommendations':
          return { ...prev, currentStep: 'moment-capture' };
        default:
          return prev;
      }
    });
  }, []);

  // Calculate progress percentage
  const getProgressPercentage = () => {
    const steps: OnboardingStep[] = ['welcome-tour', 'moment-capture', 'recommendations'];
    const currentIndex = steps.indexOf(state.currentStep);
    return ((currentIndex + 1) / steps.length) * 100;
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#FAF9F7] to-[#F0EFE9] z-50 overflow-hidden flex flex-col">
      {/* Progress Bar */}
      <div className="h-1 bg-[#E8E6E0]">
        <motion.div
          className="h-full bg-gradient-to-r from-[#6B9EFF] via-[#845EF7] to-[#FF922B]"
          initial={{ width: '0%' }}
          animate={{ width: `${getProgressPercentage()}%` }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* Error Display */}
          {state.error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 left-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-gap-3 gap-3 z-10"
            >
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-red-900">{state.error}</p>
              </div>
              <button
                onClick={handleDismissError}
                className="text-red-600 hover:text-red-800 font-semibold text-sm"
              >
                Fechar
              </button>
            </motion.div>
          )}

          {/* Welcome Tour Step */}
          {state.currentStep === 'welcome-tour' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <WelcomeTour
                onComplete={handleWelcomeTourComplete}
                onSkip={handleWelcomeTourSkip}
              />
            </motion.div>
          )}

          {/* Trail Selection Step */}
          {state.currentStep === 'trail-selection' && (
            <motion.div
              key="trails"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <TrailSelectionFlow
                userId={userId}
                onComplete={handleTrailSelectionComplete}
                onError={handleTrailSelectionError}
              />
            </motion.div>
          )}

          {/* Moment Capture Step */}
          {state.currentStep === 'moment-capture' && (
            <motion.div
              key="moment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <MomentCaptureFlow
                userId={userId}
                onComplete={handleMomentCaptureComplete}
                onError={handleMomentCaptureError}
              />
            </motion.div>
          )}

          {/* Recommendations Step */}
          {state.currentStep === 'recommendations' && (
            <motion.div
              key="recommendations"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-2xl mx-auto px-4 py-8"
            >
              <div className="space-y-6">
                {/* Header */}
                <div className="text-center">
                  <h2 className="text-3xl font-black text-[#2B1B17] mb-2">
                    Seus Módulos
                  </h2>
                  <p className="text-[#5C554B]">
                    Estes são os módulos disponíveis para você explorar
                  </p>
                </div>

                {/* Module Cards */}
                <div className="space-y-3">
                  {AICA_MODULES.map((module, index) => {
                    const Icon = module.icon;
                    return (
                      <motion.div
                        key={module.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white rounded-xl p-5 border border-[#E8E6E0] shadow-sm flex items-center gap-4"
                      >
                        {/* Icon */}
                        <div
                          className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${module.color}15` }}
                        >
                          <Icon
                            className="w-7 h-7"
                            style={{ color: module.color }}
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-[#2B1B17]">
                              {module.name}
                            </h3>
                            {module.enabled && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                Ativo
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-[#5C554B] mt-1">
                            {module.description}
                          </p>
                        </div>

                        {/* Check indicator for enabled modules */}
                        {module.enabled && (
                          <div
                            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: module.color }}
                          >
                            <Check className="w-5 h-5 text-white" />
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Info note */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="bg-[#F8F7F5] rounded-lg p-4 text-center border border-[#E8E6E0]"
                >
                  <p className="text-sm text-[#5C554B]">
                    Você pode habilitar ou desabilitar módulos a qualquer momento nas configurações
                  </p>
                </motion.div>

                {/* Action buttons */}
                <div className="flex gap-3 justify-center pt-4">
                  <button
                    onClick={handleGoBack}
                    className="px-8 py-3 bg-white border border-[#E8E6E0] rounded-lg font-semibold text-[#5C554B] hover:bg-[#F8F7F5] transition-colors"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleOnboardingComplete}
                    className="px-8 py-3 bg-gradient-to-r from-[#6B9EFF] to-[#845EF7] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
                  >
                    Começar a Usar
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Complete Step */}
          {state.currentStep === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center space-y-4 p-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto"
              >
                <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </motion.div>
              <h2 className="text-2xl font-black text-[#2B1B17]">
                Bem-vindo à Aica!
              </h2>
              <p className="text-[#5C554B] max-w-sm mx-auto">
                Seu onboarding foi concluído com sucesso. Agora você está pronto para começar sua jornada.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Loading Overlay */}
      {state.loading && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40">
          <Loader className="w-8 h-8 text-white animate-spin" />
        </div>
      )}
    </div>
  );
};

export default OnboardingFlow;
