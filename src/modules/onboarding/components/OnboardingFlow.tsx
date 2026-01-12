/**
 * OnboardingFlow Component
 * Sprint: "Ordem ao Caos do WhatsApp"
 *
 * Main orchestrator for the onboarding flow:
 * - Progress indicator
 * - Step transitions with animations
 * - State management via useOnboarding hook
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboarding } from '../hooks/useOnboarding';
import { WelcomeStep } from './WelcomeStep';
import { WhatsAppPairingStep } from './WhatsAppPairingStep';
import { ContactsSyncStep } from './ContactsSyncStep';
import { ReadyStep } from './ReadyStep';
import { STEP_LABELS } from '../types';
import type { OnboardingStep } from '../types';
import { Loader2 } from 'lucide-react';

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

export function OnboardingFlow() {
  const {
    currentStep,
    stepIndex,
    totalSteps,
    progress,
    isLoading,
    error,
    credits,
    goToNextStep,
    goToPreviousStep,
    complete,
  } = useOnboarding();

  // Track direction for animations
  const [direction, setDirection] = useState(0);

  // Simulated sync data (would come from actual sync in production)
  const [syncData, setSyncData] = useState({
    contactsCount: 0,
    groupsCount: 0,
  });

  // Handle step transitions
  const handleNext = async () => {
    setDirection(1);
    await goToNextStep();
  };

  const handleBack = async () => {
    setDirection(-1);
    await goToPreviousStep();
  };

  const handleComplete = async () => {
    await complete();
  };

  // Update sync data when sync completes
  const handleSyncComplete = () => {
    // In production, this would come from the actual sync
    setSyncData({
      contactsCount: Math.floor(Math.random() * 150) + 50,
      groupsCount: Math.floor(Math.random() * 20) + 5,
    });
    handleNext();
  };

  // Progress steps for indicator
  const steps = useMemo<{ key: OnboardingStep; label: string }[]>(
    () => [
      { key: 'welcome', label: STEP_LABELS.welcome },
      { key: 'whatsapp_pairing', label: STEP_LABELS.whatsapp_pairing },
      { key: 'contacts_sync', label: STEP_LABELS.contacts_sync },
      { key: 'ready', label: STEP_LABELS.ready },
    ],
    []
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-green-500 animate-spin mx-auto mb-4" />
          <p className="text-ceramic-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">!</span>
          </div>
          <h2 className="text-xl font-bold text-ceramic-900 mb-2">
            Algo deu errado
          </h2>
          <p className="text-ceramic-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-ceramic-800 text-white rounded-lg hover:bg-ceramic-700 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Progress Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-ceramic-100">
        <div className="max-w-2xl mx-auto px-6 py-4">
          {/* Step indicators */}
          <div className="flex items-center justify-between mb-3">
            {steps.map((step, index) => (
              <div
                key={step.key}
                className={`flex items-center ${
                  index < steps.length - 1 ? 'flex-1' : ''
                }`}
              >
                {/* Step circle */}
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                    ${
                      index < stepIndex
                        ? 'bg-green-500 text-white'
                        : index === stepIndex
                        ? 'bg-green-100 text-green-600 ring-2 ring-green-500 ring-offset-2'
                        : 'bg-ceramic-100 text-ceramic-400'
                    }
                  `}
                >
                  {index < stepIndex ? (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>

                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div
                    className={`
                      flex-1 h-0.5 mx-2 transition-colors
                      ${index < stepIndex ? 'bg-green-500' : 'bg-ceramic-200'}
                    `}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Current step label */}
          <p className="text-sm text-ceramic-500 text-center">
            {STEP_LABELS[currentStep]}
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
            >
              {currentStep === 'welcome' && (
                <WelcomeStep
                  creditsBonus={credits?.balance || 10}
                  onContinue={handleNext}
                />
              )}

              {currentStep === 'whatsapp_pairing' && (
                <WhatsAppPairingStep
                  onSuccess={handleNext}
                  onBack={handleBack}
                />
              )}

              {currentStep === 'contacts_sync' && (
                <ContactsSyncStep onComplete={handleSyncComplete} />
              )}

              {currentStep === 'ready' && (
                <ReadyStep
                  credits={credits?.balance || 10}
                  contactsCount={syncData.contactsCount}
                  groupsCount={syncData.groupsCount}
                  onStart={handleComplete}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer with progress */}
      <footer className="border-t border-ceramic-100 py-4">
        <div className="max-w-2xl mx-auto px-6">
          <div className="flex items-center justify-between text-sm text-ceramic-500">
            <span>
              Passo {stepIndex + 1} de {totalSteps}
            </span>
            <span>{progress}% completo</span>
          </div>
          <div className="mt-2 h-1 bg-ceramic-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-green-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </footer>
    </div>
  );
}

export default OnboardingFlow;
