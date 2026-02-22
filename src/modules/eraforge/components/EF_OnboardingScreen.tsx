/**
 * EF_OnboardingScreen - 5-step guided onboarding for first-time child players
 *
 * Steps:
 *   1. Escolher Avatar — emoji + color grid
 *   2. Conhecer Conselheiros — advisors introduce themselves via TTS
 *   3. Tutorial de Voz — tests TTS + STT with a simple question
 *   4. Primeira Decisao Tutorial — hardcoded ultra-simple decision scenario
 *   5. Parabens! — celebration animation + transition to game
 *
 * Works 100% without voice (button fallbacks for every voice interaction).
 * CSS animations only (no external libraries).
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ADVISOR_CONFIG } from '../types/eraforge.types';
import type { AdvisorId } from '../types/eraforge.types';

// ============================================
// TYPES
// ============================================

interface EF_OnboardingScreenProps {
  onComplete: (avatar: { emoji: string; color: string }) => void;
  onSpeak?: (text: string, advisorId?: string) => void;
  isSpeaking?: boolean;
  isListening?: boolean;
  interimTranscript?: string;
  voiceSupported?: boolean;
  onStartListening?: () => void;
  onStopSpeaking?: () => void;
}

type OnboardingStep = 1 | 2 | 3 | 4 | 5;

// ============================================
// CONSTANTS
// ============================================

const fredoka = { fontFamily: "'Fredoka', 'Nunito', sans-serif" };

const AVATAR_EMOJIS = [
  '\u{1F981}', // lion
  '\u{1F985}', // eagle
  '\u{1F433}', // whale
  '\u{1F984}', // unicorn
  '\u{1F98A}', // fox
  '\u{1F43C}', // panda
  '\u{1F409}', // dragon
  '\u{1F422}', // turtle
  '\u{1F989}', // owl
  '\u{1F431}', // cat
  '\u{1F430}', // rabbit
  '\u{1F43B}', // bear
];

const AVATAR_COLORS = [
  { name: 'Vermelho', value: '#EF4444', tw: 'bg-red-500' },
  { name: 'Laranja', value: '#F97316', tw: 'bg-orange-500' },
  { name: 'Amarelo', value: '#EAB308', tw: 'bg-yellow-500' },
  { name: 'Verde', value: '#22C55E', tw: 'bg-green-500' },
  { name: 'Azul', value: '#3B82F6', tw: 'bg-blue-500' },
  { name: 'Roxo', value: '#A855F7', tw: 'bg-purple-500' },
  { name: 'Rosa', value: '#EC4899', tw: 'bg-pink-500' },
  { name: 'Ciano', value: '#06B6D4', tw: 'bg-cyan-500' },
];

/** The 3 featured onboarding advisors with child-friendly greetings */
const ONBOARDING_ADVISORS: {
  id: AdvisorId;
  emoji: string;
  childName: string;
  greeting: string;
}[] = [
  {
    id: 'philosopher',
    emoji: '\u{1F989}', // owl
    childName: 'Sabia Coruja',
    greeting: 'Oi! Eu sou a Sabia Coruja. Adoro descobrir coisas novas!',
  },
  {
    id: 'diplomat',
    emoji: '\u{1F98C}', // deer
    childName: 'Cerva Harmonia',
    greeting: 'Ola! Eu sou a Cerva Harmonia. Gosto de ajudar todo mundo!',
  },
  {
    id: 'explorer',
    emoji: '\u{1F98A}', // fox
    childName: 'Raposa Coragem',
    greeting: 'E ai! Eu sou a Raposa Coragem! Vamos explorar juntos!',
  },
];

/** Tutorial decision scenario — hardcoded, always positive outcome */
const TUTORIAL_SCENARIO = {
  title: 'O Rio Misterioso',
  description:
    'Voce encontrou um rio largo no caminho. Do outro lado, tem uma aldeia com pessoas acenando. O que voce faz?',
  advisorHints: {
    philosopher: 'Observe a correnteza antes de agir. Sabedoria e pensar antes!',
    diplomat: 'Podemos pedir ajuda para as pessoas do outro lado!',
    explorer: 'Vamos procurar troncos para fazer uma ponte!',
  } as Record<string, string>,
  choices: [
    {
      id: 'bridge',
      text: 'Construir uma ponte com troncos',
      emoji: '\u{1FAB5}', // wood
      consequence: 'Incrivel! Voce construiu uma ponte e ajudou toda a aldeia! Ganhou +2 Coragem!',
    },
    {
      id: 'swim',
      text: 'Nadar devagar ate o outro lado',
      emoji: '\u{1F3CA}', // swimmer
      consequence: 'Que bravura! Voce atravessou o rio e fez novos amigos! Ganhou +2 Conhecimento!',
    },
    {
      id: 'ask',
      text: 'Pedir ajuda para as pessoas',
      emoji: '\u{1F91D}', // handshake
      consequence: 'Que otima ideia! Trabalharam juntos e todos ficaram felizes! Ganhou +2 Cooperacao!',
    },
  ],
};

// ============================================
// COMPONENT
// ============================================

export function EF_OnboardingScreen({
  onComplete,
  onSpeak,
  isSpeaking = false,
  isListening = false,
  interimTranscript = '',
  voiceSupported = false,
  onStartListening,
  onStopSpeaking,
}: EF_OnboardingScreenProps) {
  // Step state
  const [step, setStep] = useState<OnboardingStep>(1);
  const [slideDirection, setSlideDirection] = useState<'in' | 'out'>('in');

  // Step 1: Avatar
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  // Step 2: Advisors
  const [advisorIndex, setAdvisorIndex] = useState(0);
  const [advisorIntroduced, setAdvisorIntroduced] = useState<boolean[]>([false, false, false]);

  // Step 3: Voice tutorial
  const [voiceTutorialPhase, setVoiceTutorialPhase] = useState<
    'intro' | 'asking' | 'listening' | 'success'
  >('intro');
  const [voiceAnswer, setVoiceAnswer] = useState('');

  // Step 4: Tutorial decision
  const [tutorialPhase, setTutorialPhase] = useState<
    'scenario' | 'advisors' | 'choose' | 'consequence'
  >('scenario');
  const [selectedTutorialAdvisor, setSelectedTutorialAdvisor] = useState<number | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);

  // Step 5: Celebration
  const [showConfetti, setShowConfetti] = useState(false);

  // Ref for tracking mounted state
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // ============================================
  // NAVIGATION
  // ============================================

  const goToStep = useCallback((nextStep: OnboardingStep) => {
    setSlideDirection('out');
    setTimeout(() => {
      if (!mountedRef.current) return;
      setStep(nextStep);
      setSlideDirection('in');
    }, 300);
  }, []);

  const canAdvanceStep1 = selectedEmoji !== null && selectedColor !== null;
  const canAdvanceStep2 = advisorIntroduced.every(Boolean);

  // ============================================
  // VOICE HELPERS
  // ============================================

  const speak = useCallback(
    (text: string, advisorId?: string) => {
      if (onSpeak) {
        onSpeak(text, advisorId);
      }
    },
    [onSpeak],
  );

  // Step 3: Capture voice answer from interimTranscript
  useEffect(() => {
    if (voiceTutorialPhase === 'listening' && interimTranscript && interimTranscript.trim().length > 0) {
      setVoiceAnswer(interimTranscript.trim());
    }
  }, [interimTranscript, voiceTutorialPhase]);

  // ============================================
  // STEP 2: Advisor intro logic
  // ============================================

  const introduceAdvisor = useCallback(
    (index: number) => {
      const advisor = ONBOARDING_ADVISORS[index];
      if (!advisor) return;
      speak(advisor.greeting, advisor.id);
      setAdvisorIntroduced((prev) => {
        const next = [...prev];
        next[index] = true;
        return next;
      });
    },
    [speak],
  );

  // ============================================
  // STEP 3: Voice tutorial flow
  // ============================================

  const startVoiceQuestion = useCallback(() => {
    const question = 'Qual e a sua cor favorita?';
    speak(question);
    setVoiceTutorialPhase('asking');
    // After speaking the question, transition to listening
    setTimeout(() => {
      if (!mountedRef.current) return;
      setVoiceTutorialPhase('listening');
    }, 2500);
  }, [speak]);

  const confirmVoiceAnswer = useCallback(() => {
    setVoiceTutorialPhase('success');
    speak('Muito bem! Voce falou super bem!');
  }, [speak]);

  const skipVoiceTutorial = useCallback(() => {
    setVoiceTutorialPhase('success');
  }, []);

  // ============================================
  // STEP 4: Tutorial decision flow
  // ============================================

  const showTutorialAdvisorHint = useCallback(
    (index: number) => {
      setSelectedTutorialAdvisor(index);
      const advisor = ONBOARDING_ADVISORS[index];
      const hint = TUTORIAL_SCENARIO.advisorHints[advisor.id];
      if (hint) {
        speak(hint, advisor.id);
      }
    },
    [speak],
  );

  const makeTutorialChoice = useCallback(
    (choiceId: string) => {
      setSelectedChoice(choiceId);
      setTutorialPhase('consequence');
      const choice = TUTORIAL_SCENARIO.choices.find((c) => c.id === choiceId);
      if (choice) {
        speak(choice.consequence);
      }
    },
    [speak],
  );

  // ============================================
  // STEP 5: Celebration
  // ============================================

  useEffect(() => {
    if (step === 5) {
      setShowConfetti(true);
      speak('Parabens! Sua aventura comeca agora!');
    }
  }, [step, speak]);

  const handleFinish = useCallback(() => {
    onComplete({
      emoji: selectedEmoji || '\u{1F981}',
      color: selectedColor || '#EAB308',
    });
  }, [onComplete, selectedEmoji, selectedColor]);

  // ============================================
  // RENDER HELPERS
  // ============================================

  const renderProgressDots = () => (
    <div className="flex items-center justify-center gap-2 mb-6" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={5} aria-label={`Passo ${step} de 5`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <div
          key={s}
          className={`rounded-full transition-all duration-500 ${
            s === step
              ? 'w-8 h-3 bg-amber-400'
              : s < step
                ? 'w-3 h-3 bg-amber-300'
                : 'w-3 h-3 bg-ceramic-inset'
          }`}
          aria-hidden="true"
        />
      ))}
    </div>
  );

  // ============================================
  // STEP 1: CHOOSE AVATAR
  // ============================================

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-ceramic-text-primary" style={fredoka}>
          Escolha seu Avatar
        </h2>
        <p className="text-ceramic-text-secondary mt-1 text-sm" style={fredoka}>
          Quem vai te representar nessa aventura?
        </p>
      </div>

      {/* Preview */}
      <div className="flex justify-center">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center text-5xl shadow-ceramic-emboss transition-all duration-300"
          style={{
            backgroundColor: selectedColor || '#E5E7EB',
            animation: selectedEmoji ? 'ef-onboard-bounce 0.5s ease-out' : undefined,
          }}
          aria-label={selectedEmoji ? `Avatar selecionado: ${selectedEmoji}` : 'Nenhum avatar selecionado'}
        >
          {selectedEmoji || '?'}
        </div>
      </div>

      {/* Emoji Grid */}
      <div>
        <p className="text-xs font-semibold text-ceramic-text-secondary mb-2 uppercase tracking-wide" style={fredoka}>
          Personagem
        </p>
        <div className="grid grid-cols-6 gap-2">
          {AVATAR_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => setSelectedEmoji(emoji)}
              aria-label={`Escolher avatar ${emoji}`}
              aria-pressed={selectedEmoji === emoji}
              className={`w-12 h-12 min-h-[48px] min-w-[48px] rounded-xl flex items-center justify-center text-2xl transition-all duration-200 ${
                selectedEmoji === emoji
                  ? 'bg-amber-100 ring-2 ring-amber-400 scale-110 shadow-ceramic-emboss'
                  : 'bg-ceramic-card shadow-ceramic-emboss hover:scale-105 active:scale-95'
              }`}
              style={{
                animation: selectedEmoji === emoji ? 'ef-onboard-pop 0.3s ease-out' : undefined,
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Color Grid */}
      <div>
        <p className="text-xs font-semibold text-ceramic-text-secondary mb-2 uppercase tracking-wide" style={fredoka}>
          Cor
        </p>
        <div className="grid grid-cols-4 gap-3">
          {AVATAR_COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => setSelectedColor(color.value)}
              aria-label={`Cor ${color.name}`}
              aria-pressed={selectedColor === color.value}
              className={`h-12 min-h-[48px] rounded-xl transition-all duration-200 ${
                selectedColor === color.value
                  ? 'ring-2 ring-offset-2 ring-amber-400 scale-110'
                  : 'hover:scale-105 active:scale-95'
              }`}
              style={{ backgroundColor: color.value }}
            />
          ))}
        </div>
      </div>

      {/* Next button */}
      <button
        onClick={() => goToStep(2)}
        disabled={!canAdvanceStep1}
        aria-label="Proximo passo: conhecer conselheiros"
        className={`w-full py-4 min-h-[48px] rounded-xl font-bold text-lg transition-all duration-300 ${
          canAdvanceStep1
            ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-ceramic-emboss active:scale-[0.98]'
            : 'bg-ceramic-inset text-ceramic-text-secondary cursor-not-allowed'
        }`}
        style={fredoka}
      >
        Proximo
      </button>
    </div>
  );

  // ============================================
  // STEP 2: MEET ADVISORS
  // ============================================

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-ceramic-text-primary" style={fredoka}>
          Seus Conselheiros
        </h2>
        <p className="text-ceramic-text-secondary mt-1 text-sm" style={fredoka}>
          Toque em cada um para conhecer!
        </p>
      </div>

      {/* Advisor cards */}
      <div className="space-y-4">
        {ONBOARDING_ADVISORS.map((advisor, index) => {
          const isIntroduced = advisorIntroduced[index];
          const isActive = advisorIndex === index && isSpeaking;

          return (
            <button
              key={advisor.id}
              onClick={() => {
                setAdvisorIndex(index);
                introduceAdvisor(index);
              }}
              aria-label={`Conhecer ${advisor.childName}. ${isIntroduced ? 'Ja apresentado.' : 'Toque para ouvir.'}`}
              className={`w-full p-4 min-h-[48px] rounded-xl flex items-center gap-4 text-left transition-all duration-300 ${
                isIntroduced
                  ? 'bg-amber-50 border-2 border-amber-200 shadow-ceramic-emboss'
                  : 'bg-ceramic-card shadow-ceramic-emboss hover:scale-[1.02] active:scale-[0.98]'
              }`}
              style={{
                animation: isActive ? 'ef-onboard-advisor-talk 0.6s ease-in-out infinite' : undefined,
              }}
            >
              {/* Emoji avatar */}
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl flex-shrink-0 transition-all duration-300 ${
                  isIntroduced ? 'bg-amber-100' : 'bg-ceramic-inset'
                }`}
                style={{
                  animation: isActive ? 'ef-onboard-bounce 0.6s ease-in-out infinite' : undefined,
                }}
              >
                {advisor.emoji}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-ceramic-text-primary" style={fredoka}>
                  {advisor.childName}
                </div>
                {isIntroduced ? (
                  <p
                    className="text-sm text-amber-800 mt-1 animate-[ef-onboard-fade-in_0.5s_ease-out]"
                    style={fredoka}
                  >
                    &ldquo;{advisor.greeting}&rdquo;
                  </p>
                ) : (
                  <p className="text-xs text-ceramic-text-secondary mt-1">
                    Toque para ouvir
                  </p>
                )}
              </div>

              {/* Check mark */}
              {isIntroduced && (
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0 animate-[ef-onboard-pop_0.3s_ease-out]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Speaking indicator */}
      {isSpeaking && (
        <div className="flex items-center justify-center gap-2 py-2">
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-1.5 bg-amber-400 rounded-full"
                style={{
                  height: '12px',
                  animation: `ef-onboard-wave 0.8s ease-in-out ${i * 0.1}s infinite`,
                }}
              />
            ))}
          </div>
          <button
            onClick={onStopSpeaking}
            aria-label="Parar de falar"
            className="text-xs text-ceramic-text-secondary underline min-h-[48px] px-2"
          >
            Parar
          </button>
        </div>
      )}

      {/* Next button */}
      <button
        onClick={() => goToStep(3)}
        disabled={!canAdvanceStep2}
        aria-label="Proximo passo: tutorial de voz"
        className={`w-full py-4 min-h-[48px] rounded-xl font-bold text-lg transition-all duration-300 ${
          canAdvanceStep2
            ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-ceramic-emboss active:scale-[0.98]'
            : 'bg-ceramic-inset text-ceramic-text-secondary cursor-not-allowed'
        }`}
        style={fredoka}
      >
        {canAdvanceStep2 ? 'Proximo' : `Conheca todos (${advisorIntroduced.filter(Boolean).length}/3)`}
      </button>
    </div>
  );

  // ============================================
  // STEP 3: VOICE TUTORIAL
  // ============================================

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-ceramic-text-primary" style={fredoka}>
          Tutorial de Voz
        </h2>
        <p className="text-ceramic-text-secondary mt-1 text-sm" style={fredoka}>
          {voiceSupported
            ? 'Vamos testar sua voz!'
            : 'Voz nao disponivel, mas tudo bem!'}
        </p>
      </div>

      {/* Voice tutorial phases */}
      <div className="bg-ceramic-card rounded-xl p-6 shadow-ceramic-emboss space-y-6">
        {voiceTutorialPhase === 'intro' && (
          <div className="text-center space-y-4 animate-[ef-onboard-fade-in_0.5s_ease-out]">
            <div className="text-6xl animate-[ef-onboard-bounce_1s_ease-in-out_infinite]">
              {'\u{1F3A4}'}
            </div>
            <p className="text-ceramic-text-primary text-lg" style={fredoka}>
              Vou te fazer uma pergunta. Responde falando, ta?
            </p>
            <button
              onClick={startVoiceQuestion}
              aria-label="Comecar tutorial de voz"
              className="w-full py-4 min-h-[48px] bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all active:scale-[0.98]"
              style={fredoka}
            >
              {voiceSupported ? 'Vamos la!' : 'Comecar'}
            </button>
          </div>
        )}

        {voiceTutorialPhase === 'asking' && (
          <div className="text-center space-y-4 animate-[ef-onboard-fade-in_0.5s_ease-out]">
            <div className="text-5xl">{'\u{1F914}'}</div>
            <p className="text-ceramic-text-primary text-xl font-bold" style={fredoka}>
              Qual e a sua cor favorita?
            </p>
            {isSpeaking && (
              <div className="flex justify-center gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-2 bg-amber-400 rounded-full"
                    style={{
                      height: '16px',
                      animation: `ef-onboard-wave 0.8s ease-in-out ${i * 0.1}s infinite`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {voiceTutorialPhase === 'listening' && (
          <div className="text-center space-y-4 animate-[ef-onboard-fade-in_0.5s_ease-out]">
            <p className="text-ceramic-text-primary text-xl font-bold" style={fredoka}>
              Qual e a sua cor favorita?
            </p>

            {voiceSupported ? (
              <>
                {/* Mic button */}
                <button
                  onClick={isListening ? undefined : onStartListening}
                  aria-label={isListening ? 'Ouvindo sua resposta' : 'Tocar para falar'}
                  className={`mx-auto w-20 h-20 min-h-[48px] rounded-full flex items-center justify-center text-3xl transition-all duration-300 ${
                    isListening
                      ? 'bg-red-100 ring-4 ring-red-300 animate-[ef-onboard-pulse_1.5s_ease-in-out_infinite]'
                      : 'bg-amber-100 hover:bg-amber-200 shadow-ceramic-emboss active:scale-95'
                  }`}
                >
                  {isListening ? '\u{1F534}' : '\u{1F3A4}'}
                </button>

                {/* Interim transcript */}
                {interimTranscript && (
                  <div className="bg-amber-50 rounded-lg p-3 animate-[ef-onboard-fade-in_0.3s_ease-out]">
                    <p className="text-amber-800 text-sm" style={fredoka}>
                      Voce disse: &ldquo;{interimTranscript}&rdquo;
                    </p>
                  </div>
                )}

                {/* Voice answer confirmation */}
                {voiceAnswer && (
                  <button
                    onClick={confirmVoiceAnswer}
                    aria-label="Confirmar resposta"
                    className="w-full py-3 min-h-[48px] bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-all active:scale-[0.98]"
                    style={fredoka}
                  >
                    Isso mesmo!
                  </button>
                )}
              </>
            ) : (
              /* Fallback: text buttons for non-voice */
              <div className="space-y-3">
                <p className="text-sm text-ceramic-text-secondary" style={fredoka}>
                  Escolha uma cor:
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {['Azul', 'Vermelho', 'Verde', 'Amarelo', 'Rosa', 'Roxo'].map((cor) => (
                    <button
                      key={cor}
                      onClick={() => {
                        setVoiceAnswer(cor);
                        confirmVoiceAnswer();
                      }}
                      aria-label={`Responder ${cor}`}
                      className="px-4 py-3 min-h-[48px] bg-ceramic-card shadow-ceramic-emboss rounded-xl text-sm font-bold text-ceramic-text-primary hover:scale-105 active:scale-95 transition-all"
                      style={fredoka}
                    >
                      {cor}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Skip fallback (always shown) */}
            <button
              onClick={skipVoiceTutorial}
              aria-label="Pular tutorial de voz"
              className="text-sm text-ceramic-text-secondary underline min-h-[48px] px-2"
              style={fredoka}
            >
              Pular esta etapa
            </button>
          </div>
        )}

        {voiceTutorialPhase === 'success' && (
          <div className="text-center space-y-4 animate-[ef-onboard-fade-in_0.5s_ease-out]">
            <div
              className="text-6xl"
              style={{ animation: 'ef-onboard-bounce 0.5s ease-out' }}
            >
              {'\u{1F389}'}
            </div>
            <p className="text-ceramic-text-primary text-xl font-bold" style={fredoka}>
              {voiceAnswer ? `${voiceAnswer}? Adorei!` : 'Otimo, vamos continuar!'}
            </p>
            <p className="text-ceramic-text-secondary text-sm" style={fredoka}>
              {voiceSupported
                ? 'Sua voz funciona perfeitamente!'
                : 'Voce pode usar os botoes durante o jogo.'}
            </p>
          </div>
        )}
      </div>

      {/* Next / skip buttons */}
      {voiceTutorialPhase === 'success' ? (
        <button
          onClick={() => goToStep(4)}
          aria-label="Proximo passo: primeira decisao"
          className="w-full py-4 min-h-[48px] bg-amber-500 hover:bg-amber-600 text-white font-bold text-lg rounded-xl shadow-ceramic-emboss transition-all active:scale-[0.98]"
          style={fredoka}
        >
          Proximo
        </button>
      ) : voiceTutorialPhase === 'intro' ? null : (
        <button
          onClick={skipVoiceTutorial}
          aria-label="Pular tutorial de voz"
          className="w-full py-3 min-h-[48px] text-ceramic-text-secondary text-sm underline"
          style={fredoka}
        >
          Pular
        </button>
      )}
    </div>
  );

  // ============================================
  // STEP 4: TUTORIAL DECISION
  // ============================================

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-ceramic-text-primary" style={fredoka}>
          Sua Primeira Decisao
        </h2>
        <p className="text-ceramic-text-secondary mt-1 text-sm" style={fredoka}>
          Veja como o jogo funciona!
        </p>
      </div>

      {/* Scenario */}
      {(tutorialPhase === 'scenario' || tutorialPhase === 'advisors' || tutorialPhase === 'choose') && (
        <div className="bg-ceramic-card rounded-xl p-5 shadow-ceramic-emboss animate-[ef-onboard-fade-in_0.5s_ease-out]">
          <h3 className="text-lg font-bold text-ceramic-text-primary mb-2" style={fredoka}>
            {TUTORIAL_SCENARIO.title}
          </h3>
          <p className="text-sm text-ceramic-text-secondary leading-relaxed" style={fredoka}>
            {TUTORIAL_SCENARIO.description}
          </p>
        </div>
      )}

      {/* Phase: scenario - show "ask advisors" button */}
      {tutorialPhase === 'scenario' && (
        <button
          onClick={() => setTutorialPhase('advisors')}
          aria-label="Pedir conselho aos conselheiros"
          className="w-full py-4 min-h-[48px] bg-amber-100 text-amber-800 font-bold rounded-xl shadow-ceramic-emboss hover:bg-amber-200 transition-all active:scale-[0.98]"
          style={fredoka}
        >
          {'\u{1F4AC}'} Pedir Conselho
        </button>
      )}

      {/* Phase: advisors - show advisor hints */}
      {tutorialPhase === 'advisors' && (
        <div className="space-y-3 animate-[ef-onboard-fade-in_0.5s_ease-out]">
          <p className="text-xs font-semibold text-ceramic-text-secondary uppercase tracking-wide" style={fredoka}>
            Conselheiros
          </p>
          {ONBOARDING_ADVISORS.map((advisor, index) => (
            <button
              key={advisor.id}
              onClick={() => showTutorialAdvisorHint(index)}
              aria-label={`Ouvir conselho de ${advisor.childName}`}
              className={`w-full p-4 min-h-[48px] rounded-xl flex items-center gap-3 text-left transition-all duration-300 ${
                selectedTutorialAdvisor === index
                  ? 'bg-amber-50 border-2 border-amber-200 shadow-ceramic-emboss'
                  : 'bg-ceramic-card shadow-ceramic-emboss hover:scale-[1.01] active:scale-[0.99]'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-xl flex-shrink-0">
                {advisor.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-ceramic-text-primary" style={fredoka}>
                  {advisor.childName}
                </div>
                {selectedTutorialAdvisor === index && (
                  <p className="text-xs text-amber-800 mt-1 animate-[ef-onboard-fade-in_0.3s_ease-out]" style={fredoka}>
                    &ldquo;{TUTORIAL_SCENARIO.advisorHints[advisor.id]}&rdquo;
                  </p>
                )}
              </div>
            </button>
          ))}
          <button
            onClick={() => setTutorialPhase('choose')}
            aria-label="Escolher o que fazer"
            className="w-full py-4 min-h-[48px] bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-ceramic-emboss transition-all active:scale-[0.98]"
            style={fredoka}
          >
            Escolher o que Fazer
          </button>
        </div>
      )}

      {/* Phase: choose - show choices */}
      {tutorialPhase === 'choose' && (
        <div className="space-y-3 animate-[ef-onboard-fade-in_0.5s_ease-out]">
          <p className="text-xs font-semibold text-ceramic-text-secondary uppercase tracking-wide" style={fredoka}>
            O que voce faz?
          </p>
          {TUTORIAL_SCENARIO.choices.map((choice) => (
            <button
              key={choice.id}
              onClick={() => makeTutorialChoice(choice.id)}
              aria-label={choice.text}
              className="w-full p-4 min-h-[48px] rounded-xl bg-ceramic-card shadow-ceramic-emboss flex items-center gap-3 text-left hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              <div className="text-2xl flex-shrink-0">{choice.emoji}</div>
              <span className="text-sm font-bold text-ceramic-text-primary" style={fredoka}>
                {choice.text}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Phase: consequence - show result */}
      {tutorialPhase === 'consequence' && selectedChoice && (
        <div className="space-y-4 animate-[ef-onboard-fade-in_0.5s_ease-out]">
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-5 text-center">
            <div className="text-5xl mb-3 animate-[ef-onboard-bounce_0.5s_ease-out]">
              {'\u{2B50}'}
            </div>
            <p className="text-green-800 font-bold text-lg leading-relaxed" style={fredoka}>
              {TUTORIAL_SCENARIO.choices.find((c) => c.id === selectedChoice)?.consequence}
            </p>
          </div>

          <button
            onClick={() => goToStep(5)}
            aria-label="Finalizar tutorial"
            className="w-full py-4 min-h-[48px] bg-amber-500 hover:bg-amber-600 text-white font-bold text-lg rounded-xl shadow-ceramic-emboss transition-all active:scale-[0.98]"
            style={fredoka}
          >
            Incrivel! Vamos comecar!
          </button>
        </div>
      )}
    </div>
  );

  // ============================================
  // STEP 5: CELEBRATION
  // ============================================

  const renderStep5 = () => (
    <div className="space-y-6 text-center">
      {/* Confetti overlay */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" aria-hidden="true">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-sm"
              style={{
                width: `${6 + Math.random() * 8}px`,
                height: `${6 + Math.random() * 8}px`,
                backgroundColor: [
                  '#EF4444', '#F97316', '#EAB308', '#22C55E',
                  '#3B82F6', '#A855F7', '#EC4899', '#06B6D4',
                ][i % 8],
                left: `${Math.random() * 100}%`,
                top: '-10px',
                animation: `ef-onboard-confetti-fall ${2 + Math.random() * 3}s ease-in ${Math.random() * 2}s forwards`,
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            />
          ))}
        </div>
      )}

      {/* Trophy */}
      <div
        className="text-8xl animate-[ef-onboard-bounce_1s_ease-in-out_infinite]"
      >
        {'\u{1F3C6}'}
      </div>

      <h2 className="text-3xl font-bold text-ceramic-text-primary" style={fredoka}>
        Parabens!
      </h2>

      <p className="text-lg text-ceramic-text-secondary" style={fredoka}>
        Sua aventura comeca agora!
      </p>

      {/* Avatar preview */}
      <div className="flex justify-center">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-ceramic-emboss animate-[ef-onboard-pop_0.5s_ease-out]"
          style={{ backgroundColor: selectedColor || '#EAB308' }}
          aria-label="Seu avatar"
        >
          {selectedEmoji || '\u{1F981}'}
        </div>
      </div>

      {/* Stats preview */}
      <div className="bg-ceramic-card rounded-xl p-4 shadow-ceramic-emboss">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl">{'\u{1F4DA}'}</div>
            <div className="text-xs text-ceramic-text-secondary mt-1" style={fredoka}>Conhecimento</div>
            <div className="font-bold text-amber-600" style={fredoka}>10</div>
          </div>
          <div>
            <div className="text-2xl">{'\u{1F91D}'}</div>
            <div className="text-xs text-ceramic-text-secondary mt-1" style={fredoka}>Cooperacao</div>
            <div className="font-bold text-amber-600" style={fredoka}>10</div>
          </div>
          <div>
            <div className="text-2xl">{'\u{1F525}'}</div>
            <div className="text-xs text-ceramic-text-secondary mt-1" style={fredoka}>Coragem</div>
            <div className="font-bold text-amber-600" style={fredoka}>10</div>
          </div>
        </div>
      </div>

      {/* Start button */}
      <button
        onClick={handleFinish}
        aria-label="Comecar aventura"
        className="w-full py-5 min-h-[48px] bg-amber-500 hover:bg-amber-600 text-white font-bold text-xl rounded-xl shadow-ceramic-emboss transition-all active:scale-[0.98] animate-[ef-onboard-pulse_2s_ease-in-out_infinite]"
        style={fredoka}
      >
        Comecar Aventura!
      </button>
    </div>
  );

  // ============================================
  // MAIN RENDER
  // ============================================

  const renderCurrentStep = () => {
    switch (step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-ceramic-base to-orange-50 px-4 py-6">
      <div className="max-w-md mx-auto">
        {/* Progress dots */}
        {renderProgressDots()}

        {/* Step content with slide animation */}
        <div
          className={`transition-all duration-300 ${
            slideDirection === 'in'
              ? 'animate-[ef-onboard-slide-in_0.4s_ease-out]'
              : 'animate-[ef-onboard-slide-out_0.3s_ease-in]'
          }`}
        >
          {renderCurrentStep()}
        </div>

        {/* Back button (steps 2-4) */}
        {step > 1 && step < 5 && (
          <button
            onClick={() => goToStep((step - 1) as OnboardingStep)}
            aria-label="Voltar para o passo anterior"
            className="mt-4 w-full py-3 min-h-[48px] text-ceramic-text-secondary text-sm font-medium rounded-xl hover:bg-ceramic-inset transition-all"
            style={fredoka}
          >
            Voltar
          </button>
        )}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes ef-onboard-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes ef-onboard-pop {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes ef-onboard-fade-in {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes ef-onboard-slide-in {
          0% { opacity: 0; transform: translateX(40px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes ef-onboard-slide-out {
          0% { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(-40px); }
        }
        @keyframes ef-onboard-wave {
          0%, 100% { height: 6px; }
          50% { height: 20px; }
        }
        @keyframes ef-onboard-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
          50% { transform: scale(1.02); box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
        }
        @keyframes ef-onboard-advisor-talk {
          0%, 100% { transform: scale(1); }
          25% { transform: scale(1.01) rotate(-0.5deg); }
          75% { transform: scale(1.01) rotate(0.5deg); }
        }
        @keyframes ef-onboard-confetti-fall {
          0% {
            transform: translateY(-10px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
