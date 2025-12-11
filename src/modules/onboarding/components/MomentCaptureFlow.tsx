/**
 * Moment Capture Flow Component
 * 7-step interactive flow for capturing user's first moment with multiple choice support
 *
 * Flow:
 * Step 2.1: Tipo de Momento (6 options in grid)
 * Step 2.2: Como Você Se Sente? (5 emotions + custom)
 * Step 2.3: Áreas da Vida Afetadas? (multiple choice)
 * Step 2.4: Social Proof / Show Value
 * Step 2.5: Reflexão (OPTIONAL text input)
 * Step 2.6: Áudio (OPTIONAL audio recording)
 * Step 2.7: Review & Confirm
 *
 * Features:
 * - Progress tracking with visual feedback
 * - Smooth transitions between steps
 * - Edit/Undo capability
 * - Audio recording support
 * - Validation and error handling
 * - Responsive design (mobile, tablet, desktop)
 * - WCAG AAA accessibility
 * - Framer Motion animations
 *
 * @version 1.0.0
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Mic, AlertCircle, CheckCircle } from 'lucide-react';
import ProgressBar from './common/ProgressBar';
import MomentTypeSelector from './moment/MomentTypeSelector';
import EmotionPicker from './moment/EmotionPicker';
import LifeAreaSelector from './moment/LifeAreaSelector';
import ValueIndicator from './moment/ValueIndicator';
import ReflectionInput from './moment/ReflectionInput';
import AudioRecorder from './moment/AudioRecorder';
import MomentReview from './moment/MomentReview';

interface MomentCaptureFlowProps {
  userId: string;
  onComplete: (data: MomentCaptureData) => void;
  onError: (error: string) => void;
}

export interface AudioRecording {
  blob: Blob;
  duration: number;
  url: string;
}

export interface MomentCaptureData {
  momentTypeId: string;
  emotion: string;
  customEmotion?: string;
  lifeAreas: string[];
  reflection: string;
  audioRecording?: AudioRecording;
}

interface FlowState {
  currentStep: number; // 1-7
  momentTypeId?: string;
  emotion?: string;
  customEmotion?: string;
  lifeAreas: string[];
  reflection: string;
  audioRecording?: AudioRecording;
  loading: boolean;
  error: string | null;
}

const MomentCaptureFlow: React.FC<MomentCaptureFlowProps> = ({
  userId,
  onComplete,
  onError,
}) => {
  const [state, setState] = useState<FlowState>({
    currentStep: 1,
    lifeAreas: [],
    reflection: '',
    loading: false,
    error: null,
  });

  const totalSteps = 7;

  // Validation helpers
  const isStep1Valid = useCallback(() => !!state.momentTypeId, [state.momentTypeId]);
  const isStep2Valid = useCallback(() => !!state.emotion || !!state.customEmotion, [state.emotion, state.customEmotion]);

  const canProceed = useCallback((): boolean => {
    switch (state.currentStep) {
      case 1:
        return isStep1Valid();
      case 2:
        return isStep2Valid();
      case 3:
      case 4:
      case 5:
      case 6:
        return true; // Optional or info-only steps
      case 7:
        return true; // Review step
      default:
        return false;
    }
  }, [state.currentStep, isStep1Valid, isStep2Valid]);

  // Navigation handlers
  const nextStep = useCallback(() => {
    if (!canProceed()) {
      setState(prev => ({
        ...prev,
        error: 'Por favor, complete este passo antes de continuar',
      }));
      return;
    }

    setState(prev => {
      if (prev.currentStep < totalSteps) {
        return {
          ...prev,
          currentStep: prev.currentStep + 1,
          error: null,
        };
      }
      return prev;
    });
  }, [canProceed]);

  const prevStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(1, prev.currentStep - 1),
      error: null,
    }));
  }, []);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= totalSteps) {
      setState(prev => ({
        ...prev,
        currentStep: step,
        error: null,
      }));
    }
  }, []);

  // Field update handlers
  const updateMomentType = useCallback((typeId: string) => {
    setState(prev => ({
      ...prev,
      momentTypeId: typeId,
      error: null,
    }));
  }, []);

  const updateEmotion = useCallback((emotionId: string) => {
    setState(prev => ({
      ...prev,
      emotion: emotionId,
      customEmotion: undefined,
      error: null,
    }));
  }, []);

  const updateCustomEmotion = useCallback((text: string) => {
    setState(prev => ({
      ...prev,
      customEmotion: text,
      emotion: undefined,
    }));
  }, []);

  const toggleLifeArea = useCallback((areaId: string) => {
    setState(prev => ({
      ...prev,
      lifeAreas: prev.lifeAreas.includes(areaId)
        ? prev.lifeAreas.filter(id => id !== areaId)
        : [...prev.lifeAreas, areaId],
    }));
  }, []);

  const updateReflection = useCallback((text: string) => {
    setState(prev => ({
      ...prev,
      reflection: text,
    }));
  }, []);

  const updateAudioRecording = useCallback((recording: AudioRecording) => {
    setState(prev => ({
      ...prev,
      audioRecording: recording,
    }));
  }, []);

  const removeAudioRecording = useCallback(() => {
    setState(prev => ({
      ...prev,
      audioRecording: undefined,
    }));
  }, []);

  // Submit handler
  const submitMoment = useCallback(async () => {
    if (!state.momentTypeId || (!state.emotion && !state.customEmotion)) {
      setState(prev => ({
        ...prev,
        error: 'Verifique os dados do momento',
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));

      const data: MomentCaptureData = {
        momentTypeId: state.momentTypeId,
        emotion: state.emotion || '',
        customEmotion: state.customEmotion,
        lifeAreas: state.lifeAreas,
        reflection: state.reflection,
        audioRecording: state.audioRecording,
      };

      onComplete(data);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erro ao salvar momento',
        loading: false,
      }));
    }
  }, [state, onComplete]);

  // Render step content
  const renderStepContent = () => {
    switch (state.currentStep) {
      case 1:
        return (
          <MomentTypeSelector
            selected={state.momentTypeId}
            onSelect={updateMomentType}
          />
        );

      case 2:
        return (
          <EmotionPicker
            selected={state.emotion}
            customEmotion={state.customEmotion}
            onSelect={updateEmotion}
            onCustomChange={updateCustomEmotion}
          />
        );

      case 3:
        return (
          <LifeAreaSelector
            selected={state.lifeAreas}
            onToggle={toggleLifeArea}
          />
        );

      case 4:
        return (
          <ValueIndicator
            weeklyMomentCount={1234}
            patternDiscoveryRate={48}
            avgInsightsPerUser={3.2}
          />
        );

      case 5:
        return (
          <ReflectionInput
            momentTypeId={state.momentTypeId}
            value={state.reflection}
            onChange={updateReflection}
            minChars={0}
            maxChars={1000}
          />
        );

      case 6:
        return (
          <AudioRecorder
            onRecordingComplete={updateAudioRecording}
            maxDuration={120}
            currentRecording={state.audioRecording}
            onRemoveRecording={removeAudioRecording}
          />
        );

      case 7:
        return (
          <MomentReview
            data={{
              momentTypeId: state.momentTypeId || '',
              emotion: state.emotion || '',
              customEmotion: state.customEmotion,
              lifeAreas: state.lifeAreas,
              reflection: state.reflection,
              audioRecording: state.audioRecording,
            }}
            onConfirm={submitMoment}
            onEdit={goToStep}
            isLoading={state.loading}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF9F7] to-[#F8F7F5] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-[#2B1B17] mb-4">
            Compartilhe um Momento
          </h1>
          <p className="text-lg text-[#5C554B] max-w-2xl">
            Conte-nos sobre um momento importante em sua vida. Pode ser alegre, desafiador ou reflexivo.
          </p>
        </motion.div>

        {/* Progress Bar */}
        <div className="mb-12">
          <ProgressBar
            current={state.currentStep}
            total={totalSteps}
            label={`Passo ${state.currentStep} de ${totalSteps}`}
            showPercentage={true}
          />
        </div>

        {/* Step Indicators */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {Array.from({ length: totalSteps }).map((_, index) => {
            const stepNum = index + 1;
            const isActive = stepNum === state.currentStep;
            const isCompleted = stepNum < state.currentStep;

            return (
              <button
                key={stepNum}
                onClick={() => goToStep(stepNum)}
                className={`flex-shrink-0 w-10 h-10 rounded-full font-bold transition-all ${
                  isActive
                    ? 'bg-[#6B9EFF] text-white ring-2 ring-offset-2 ring-[#6B9EFF]'
                    : isCompleted
                    ? 'bg-[#51CF66] text-white'
                    : 'bg-[#E8E6E0] text-[#5C554B]'
                }`}
                aria-label={`Passo ${stepNum}`}
                aria-current={isActive ? 'step' : undefined}
              >
                {isCompleted ? '✓' : stepNum}
              </button>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl border border-[#E8E6E0] shadow-sm p-8 mb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={state.currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Error Display */}
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

        {/* Navigation Buttons */}
        <div className="flex gap-4 justify-between items-center pt-4 border-t border-[#E8E6E0]">
          <button
            onClick={prevStep}
            disabled={state.currentStep === 1 || state.loading}
            className="px-6 py-3 border border-[#E8E6E0] text-[#5C554B] font-semibold rounded-lg hover:bg-[#F8F7F5] disabled:opacity-50 transition-all flex items-center gap-2"
          >
            <ChevronLeft size={20} />
            Anterior
          </button>

          <div className="flex gap-3">
            {state.currentStep < totalSteps ? (
              <button
                onClick={nextStep}
                disabled={!canProceed() || state.loading}
                className="px-6 py-3 bg-[#6B9EFF] text-white font-semibold rounded-lg hover:bg-[#5A8FEF] disabled:opacity-50 transition-all flex items-center gap-2"
              >
                Próximo
                <ChevronRight size={20} />
              </button>
            ) : (
              <button
                onClick={submitMoment}
                disabled={!canProceed() || state.loading}
                className="px-8 py-3 bg-[#51CF66] text-white font-bold rounded-lg hover:bg-[#40C057] disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {state.loading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                    Salvando...
                  </>
                ) : (
                  <>
                    Salvar Momento
                    <CheckCircle size={20} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MomentCaptureFlow;
