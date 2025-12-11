# Guia de Implementação: Onboarding V2 ("Aica in 5 Minutes")
## Instruções técnicas e componentes

**Data:** 11 de dezembro de 2025
**Versão:** 1.0
**Escopo:** Implementação step-by-step do novo fluxo de onboarding

---

## VISÃO GERAL

Este guia detalha como implementar o novo onboarding proposto no documento de avaliação UX. O objetivo é guiar novo usuários através de 6 steps em aproximadamente 5 minutos, educando-os sobre os 4 pilares do Aica e levando-os a completar sua primeira ação significativa.

### Estrutura dos Steps

```
Step 0: Splash Screen (2s)
  └─ Logo + Tagline

Step 1: Welcome Tour (30s)
  └─ 4 pilares com carousel

Step 2: Create First Moment (1-2min)
  └─ Input com exemplos

Step 3: Life in Weeks Explanation (30s)
  └─ Visualização + educação

Step 4: Daily Question (1min)
  └─ Responder pergunta do dia

Step 5: Agenda Preview (1min)
  └─ Preview + Google Calendar CTA

Step 6: Completion Screen (15s)
  └─ Celebração + próximos passos
```

---

## ARQUIVO: ESTRUTURA DO PROJETO

```
src/
├── components/
│   ├── OnboardingWizardV2.tsx          [NOVO - Container principal]
│   └── onboarding/                      [NOVO - Pasta]
│       ├── SplashScreen.tsx
│       ├── WelcomeTour.tsx
│       ├── CreateFirstMoment.tsx
│       ├── LifeInWeeksExplanation.tsx
│       ├── DailyQuestionStep.tsx
│       ├── AgendaPreviewStep.tsx
│       ├── CompletionScreen.tsx
│       └── onboardingTypes.ts           [NOVO - Tipos compartilhados]
└── utils/
    └── onboardingHelpers.ts             [NOVO - Funções auxiliares]
```

---

## PASSO 1: CRIAR TIPOS COMPARTILHADOS

**Arquivo:** `src/components/onboarding/onboardingTypes.ts`

```typescript
import React from 'react';

export type OnboardingStep =
  | 'splash'
  | 'tour'
  | 'moment'
  | 'life-weeks'
  | 'daily-question'
  | 'agenda'
  | 'completion';

export interface OnboardingState {
  currentStep: OnboardingStep;
  momentCreated: boolean;
  questionAnswered: boolean;
  calendarConnected: boolean;
  skippedSteps: Set<OnboardingStep>;
  startTime: number;
  completionTime?: number;
}

export interface PillarCard {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: string;
}

export interface OnboardingCompletionEvent {
  completedAt: Date;
  durationSeconds: number;
  momentCreated: boolean;
  questionAnswered: boolean;
  calendarConnected: boolean;
  skippedSteps: OnboardingStep[];
}
```

---

## PASSO 2: CRIAR COMPONENTE SPLASH SCREEN

**Arquivo:** `src/components/onboarding/SplashScreen.tsx`

```typescript
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader } from 'lucide-react';

interface SplashScreenProps {
  onNext: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onNext }) => {
  // Auto-progress depois de 3 segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      onNext();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onNext]);

  return (
    <div className="fixed inset-0 bg-ceramic-base z-50 flex flex-col items-center justify-center">
      {/* Logo com animação */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="ceramic-card p-8 rounded-3xl mb-8"
      >
        <Sparkles className="w-16 h-16 text-ceramic-accent" />
      </motion.div>

      {/* Tagline */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="text-center"
      >
        <h1 className="text-4xl font-black text-ceramic-text-primary mb-3">
          Aica Life OS
        </h1>
        <p className="text-lg text-ceramic-text-secondary max-w-xs">
          Sistema Operacional para Sua Vida
        </p>
      </motion.div>

      {/* Loading indicator */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="mt-16"
      >
        <Loader className="w-6 h-6 text-ceramic-text-secondary" />
      </motion.div>

      {/* Skip button (subtle) */}
      <motion.button
        onClick={onNext}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="mt-12 text-sm text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
      >
        Pular →
      </motion.button>
    </div>
  );
};
```

---

## PASSO 3: CRIAR COMPONENTE WELCOME TOUR

**Arquivo:** `src/components/onboarding/WelcomeTour.tsx`

```typescript
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid,
  Calendar,
  BookOpen,
  Users,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { PillarCard } from './onboardingTypes';

interface WelcomeTourProps {
  onNext: () => void;
  onSkip: () => void;
}

const PILLARS: PillarCard[] = [
  {
    id: 'life',
    icon: LayoutGrid,
    title: "Minha Vida Pessoal",
    description: "Organize seus módulos de vida: finanças, saúde, educação, jurídico, e muito mais. Um dashboard para tudo.",
    color: "text-blue-600"
  },
  {
    id: 'day',
    icon: Calendar,
    title: "Meu Dia",
    description: "Timeline executiva com tarefas e eventos sincronizados com Google Calendar. Organize seu tempo com inteligência.",
    color: "text-emerald-600"
  },
  {
    id: 'journey',
    icon: BookOpen,
    title: "Minha Jornada",
    description: "Registre momentos significativos, responda perguntas diárias, ganhe Pontos de Consciência. Sua história pessoal.",
    color: "text-orange-600"
  },
  {
    id: 'network',
    icon: Users,
    title: "Minha Rede",
    description: "Gerencie associações e conexões em esferas de influência. Comunidades, projetos, família e amigos.",
    color: "text-purple-600"
  }
];

export const WelcomeTour: React.FC<WelcomeTourProps> = ({ onNext, onSkip }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const handlePrevious = () => {
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    }
  };

  const handleNext = () => {
    if (activeIndex < PILLARS.length - 1) {
      setActiveIndex(activeIndex + 1);
    } else {
      onNext();
    }
  };

  const isFirstSlide = activeIndex === 0;
  const isLastSlide = activeIndex === PILLARS.length - 1;

  return (
    <div className="fixed inset-0 bg-ceramic-base z-50 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-ceramic-text-secondary/10 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-ceramic-text-primary">
            Conheça o Aica
          </h1>
          <p className="text-sm text-ceramic-text-secondary mt-1">
            4 pilares para organizar sua vida
          </p>
        </div>
        <button
          onClick={onSkip}
          className="text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors text-sm font-medium"
        >
          Pular
        </button>
      </div>

      {/* Content - Carousel */}
      <div className="flex-1 overflow-hidden px-6 py-8 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="text-center w-full"
          >
            {(() => {
              const pillar = PILLARS[activeIndex];
              const Icon = pillar.icon;

              return (
                <>
                  {/* Icon */}
                  <div className="mx-auto mb-6 w-20 h-20 rounded-2xl ceramic-card flex items-center justify-center">
                    <Icon className={`w-10 h-10 ${pillar.color}`} />
                  </div>

                  {/* Title */}
                  <h2 className="text-2xl font-black text-ceramic-text-primary mb-3">
                    {pillar.title}
                  </h2>

                  {/* Description */}
                  <p className="text-lg text-ceramic-text-secondary max-w-md mx-auto leading-relaxed">
                    {pillar.description}
                  </p>
                </>
              );
            })()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots Navigation */}
      <div className="flex justify-center gap-2 py-8">
        {PILLARS.map((_, i) => (
          <motion.button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`rounded-full transition-all ${
              i === activeIndex
                ? 'bg-ceramic-accent w-8 h-2'
                : 'bg-ceramic-text-secondary/30 w-2 h-2'
            }`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          />
        ))}
      </div>

      {/* Navigation Buttons */}
      <div className="px-6 pb-6 space-y-3 border-t border-ceramic-text-secondary/10 pt-6">
        {/* Main CTA */}
        <button
          onClick={handleNext}
          className="w-full ceramic-card py-4 font-bold text-ceramic-text-primary hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
        >
          <span>{isLastSlide ? "Começar" : "Próximo"}</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Previous button (visible só se não é primeira) */}
        {!isFirstSlide && (
          <button
            onClick={handlePrevious}
            className="w-full ceramic-concave py-4 font-medium text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors flex items-center justify-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Anterior</span>
          </button>
        )}

        {/* Skip link */}
        <button
          onClick={onSkip}
          className="w-full text-ceramic-text-secondary text-sm font-medium hover:text-ceramic-text-primary transition-colors py-2"
        >
          Pular onboarding
        </button>
      </div>
    </div>
  );
};
```

---

## PASSO 4: CRIAR COMPONENTE CREATE FIRST MOMENT

**Arquivo:** `src/components/onboarding/CreateFirstMoment.tsx`

```typescript
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, CheckCircle, Loader } from 'lucide-react';
import confetti from 'canvas-confetti';
import { registerMoment } from '../../services/journeyService';

interface CreateFirstMomentProps {
  userId: string;
  currentWeek: number;
  onComplete: (success: boolean) => void;
  onSkip: () => void;
}

const MOMENT_EXAMPLES = [
  "Finalizei um projeto importante no trabalho",
  "Tive uma conversa significativa com um amigo",
  "Aprendi algo novo sobre mim",
  "Consegui vencer um medo",
  "Ajudei alguém de forma significativa"
];

export const CreateFirstMoment: React.FC<CreateFirstMomentProps> = ({
  userId,
  currentWeek,
  onComplete,
  onSkip
}) => {
  const [moment, setMoment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!moment.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await registerMoment(userId, moment, currentWeek);

      // Celebrar
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
      });

      setSubmitted(true);

      // Delay antes de completar
      setTimeout(() => {
        onComplete(true);
      }, 1500);
    } catch (err) {
      console.error('Erro ao criar momento:', err);
      setError("Houve um erro ao registrar seu momento. Tente novamente.");
      setLoading(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setMoment(example);
  };

  // State: Submitted
  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed inset-0 bg-ceramic-base z-50 flex flex-col items-center justify-center p-6"
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <CheckCircle className="w-20 h-20 text-emerald-500" />
        </motion.div>

        <h2 className="text-3xl font-black text-ceramic-text-primary mb-2 text-center">
          Sucesso!
        </h2>

        <p className="text-ceramic-text-secondary text-center max-w-xs mb-6">
          Seu primeiro momento foi registrado. Você ganhou 5 Pontos de Consciência!
        </p>

        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="ceramic-card px-8 py-4 font-bold text-ceramic-text-primary text-lg"
        >
          + 5 CP
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="fixed inset-0 bg-ceramic-base z-50 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-ceramic-text-secondary/10">
        <h1 className="text-3xl font-black text-ceramic-text-primary">
          Seu Primeiro Momento
        </h1>
        <p className="text-sm text-ceramic-text-secondary mt-1">
          Compartilhe um momento significativo de hoje
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
        {/* Explanation */}
        <div className="ceramic-inset p-6 rounded-2xl">
          <div className="flex gap-4">
            <Sparkles className="w-5 h-5 text-ceramic-accent flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-ceramic-text-primary mb-2">
                O que é um Momento?
              </h3>
              <p className="text-sm text-ceramic-text-secondary leading-relaxed">
                Momentos são experiências significativas que você vive. Podem ser
                realizações, aprendizados, encontros especiais ou qualquer coisa
                que marque seu dia. Registrá-los te ajuda a refletir sobre sua jornada
                de vida.
              </p>
            </div>
          </div>
        </div>

        {/* Examples */}
        <div>
          <label className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-widest block mb-3">
            Exemplos para Inspiração
          </label>
          <div className="space-y-2">
            {MOMENT_EXAMPLES.map((example, i) => (
              <motion.button
                key={i}
                onClick={() => handleExampleClick(example)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full ceramic-card p-4 text-left text-sm text-ceramic-text-primary hover:bg-ceramic-base transition-colors"
              >
                "{example}"
              </motion.button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div>
          <label className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-widest block mb-3">
            Seu Momento
          </label>
          <textarea
            value={moment}
            onChange={(e) => setMoment(e.target.value)}
            placeholder="O que você viveu hoje que merece ser lembrado?"
            className="w-full ceramic-concave p-4 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-ceramic-accent text-ceramic-text-primary"
            rows={5}
            autoFocus
          />
          <p className="text-xs text-ceramic-text-secondary mt-2">
            {moment.length} caracteres
          </p>
        </div>

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="ceramic-inset p-4 rounded-xl text-sm text-red-600"
          >
            {error}
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <div className="p-6 space-y-3 border-t border-ceramic-text-secondary/10">
        <button
          onClick={handleSubmit}
          disabled={!moment.trim() || loading}
          className="w-full ceramic-card py-4 font-bold text-ceramic-text-primary hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              <span>Registrando...</span>
            </>
          ) : (
            <span>Registrar Momento</span>
          )}
        </button>

        <button
          onClick={onSkip}
          className="w-full text-ceramic-text-secondary text-sm font-medium hover:text-ceramic-text-primary transition-colors py-2"
        >
          Pular por enquanto
        </button>
      </div>
    </div>
  );
};
```

---

## PASSO 5: CRIAR COMPONENTE LIFE IN WEEKS EXPLANATION

**Arquivo:** `src/components/onboarding/LifeInWeeksExplanation.tsx`

```typescript
import React from 'react';
import { motion } from 'framer-motion';

interface LifeInWeeksExplanationProps {
  percentLived: number;
  currentWeek: number;
  totalWeeks: number;
  onNext: () => void;
  onSkip: () => void;
}

export const LifeInWeeksExplanation: React.FC<LifeInWeeksExplanationProps> = ({
  percentLived,
  currentWeek,
  totalWeeks,
  onNext,
  onSkip
}) => {
  return (
    <div className="fixed inset-0 bg-ceramic-base z-50 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-ceramic-text-secondary/10">
        <h1 className="text-3xl font-black text-ceramic-text-primary">
          Sua Jornada de Vida
        </h1>
        <p className="text-sm text-ceramic-text-secondary mt-1">
          Uma perspectiva poderosa sobre o tempo
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8">
        {/* Main visualization */}
        <div className="ceramic-card p-8">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
              className="text-5xl font-black text-ceramic-text-primary mb-2"
            >
              {percentLived}%
            </motion.div>
            <p className="text-lg text-ceramic-text-secondary">
              da sua vida vivida
            </p>
          </div>

          {/* Progress bar */}
          <div className="relative h-4 w-full mb-4">
            <div className="absolute inset-0 ceramic-groove rounded-full" />
            <motion.div
              className="absolute left-0 top-0 bottom-0 rounded-full"
              style={{
                background: 'linear-gradient(90deg, #D97706 0%, #F59E0B 100%)',
                boxShadow: '0 0 8px rgba(217, 119, 6, 0.3)'
              }}
              initial={{ width: 0 }}
              animate={{ width: `${percentLived}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </div>

          <p className="text-xs text-ceramic-text-secondary text-center">
            Semana {currentWeek.toLocaleString()} de {totalWeeks.toLocaleString()}
          </p>
        </div>

        {/* Educational cards */}
        <div className="space-y-4">
          {[
            {
              title: "Por que isso importa?",
              description: "Esta visualização de 'Vida em Semanas' é um lembrete da finitude humana. Não para assustar, mas para motivar. Cada semana que passa é uma oportunidade para crescimento, aprendizado e contribuição.",
              icon: "⏳"
            },
            {
              title: "Pontos de Consciência",
              description: "Ao registrar momentos e responder perguntas, você ganha Pontos de Consciência (CP). Eles são indicadores de como você está engajado com sua jornada pessoal.",
              icon: "🧠"
            },
            {
              title: "Nível e Streak",
              description: "À medida que você acumula CP, seu nível sobe. Manter um 'streak' (sequência) de dias registrando momentos cria um hábito poderoso de autoconhecimento.",
              icon: "🔥"
            }
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="ceramic-inset p-6 rounded-2xl"
            >
              <div className="flex gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <h3 className="font-bold text-ceramic-text-primary mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-ceramic-text-secondary leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="p-6 space-y-3 border-t border-ceramic-text-secondary/10">
        <button
          onClick={onNext}
          className="w-full ceramic-card py-4 font-bold text-ceramic-text-primary hover:scale-[1.02] transition-transform"
        >
          Continuar
        </button>
        <button
          onClick={onSkip}
          className="w-full text-ceramic-text-secondary text-sm font-medium hover:text-ceramic-text-primary transition-colors py-2"
        >
          Pular
        </button>
      </div>
    </div>
  );
};
```

---

## PASSO 6: CRIAR COMPONENTES ADICIONAIS (Simplificado)

### DailyQuestionStep.tsx
```typescript
// Similar ao CreateFirstMoment, mas para responder pergunta
export const DailyQuestionStep: React.FC<DailyQuestionStepProps> = (...) => {
  // Implementação similar a CreateFirstMoment
};
```

### AgendaPreviewStep.tsx
```typescript
// Mostrar preview da agenda e pedir para conectar Google Calendar
export const AgendaPreviewStep: React.FC<AgendaPreviewStepProps> = (...) => {
  // Implementação similar aos anteriores
};
```

### CompletionScreen.tsx
```typescript
// Tela final com celebração
export const CompletionScreen: React.FC<CompletionScreenProps> = (...) => {
  // Implementação de celebração
};
```

---

## PASSO 7: CRIAR CONTAINER PRINCIPAL

**Arquivo:** `src/components/OnboardingWizardV2.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { OnboardingState, OnboardingStep } from './onboarding/onboardingTypes';
import { SplashScreen } from './onboarding/SplashScreen';
import { WelcomeTour } from './onboarding/WelcomeTour';
import { CreateFirstMoment } from './onboarding/CreateFirstMoment';
import { LifeInWeeksExplanation } from './onboarding/LifeInWeeksExplanation';
import { DailyQuestionStep } from './onboarding/DailyQuestionStep';
import { AgendaPreviewStep } from './onboarding/AgendaPreviewStep';
import { CompletionScreen } from './onboarding/CompletionScreen';
import { calculatePercentLived, calculateCurrentWeek } from '../utils/onboardingHelpers';

interface OnboardingWizardV2Props {
  onComplete: (event: OnboardingCompletionEvent) => void;
  onSkip: () => void;
  userId: string;
  userBirthDate?: string;
}

const STEP_ORDER: OnboardingStep[] = [
  'splash',
  'tour',
  'moment',
  'life-weeks',
  'daily-question',
  'agenda',
  'completion'
];

export const OnboardingWizardV2: React.FC<OnboardingWizardV2Props> = ({
  onComplete,
  onSkip,
  userId,
  userBirthDate
}) => {
  const [state, setState] = useState<OnboardingState>({
    currentStep: 'splash',
    momentCreated: false,
    questionAnswered: false,
    calendarConnected: false,
    skippedSteps: new Set(),
    startTime: Date.now()
  });

  const handleNext = () => {
    const currentIndex = STEP_ORDER.indexOf(state.currentStep);
    if (currentIndex < STEP_ORDER.length - 1) {
      setState(prev => ({
        ...prev,
        currentStep: STEP_ORDER[currentIndex + 1]
      }));
    } else {
      // Onboarding complete
      finishOnboarding();
    }
  };

  const handleSkip = () => {
    // Option: Skip current and go to next, or skip entire onboarding
    setState(prev => ({
      ...prev,
      skippedSteps: prev.skippedSteps.add(prev.currentStep)
    }));
    handleNext();
  };

  const handleStepComplete = (
    step: OnboardingStep,
    data?: { [key: string]: any }
  ) => {
    setState(prev => ({
      ...prev,
      momentCreated: step === 'moment' ? true : prev.momentCreated,
      questionAnswered: step === 'daily-question' ? true : prev.questionAnswered,
      calendarConnected: step === 'agenda' && data?.connected ? true : prev.calendarConnected
    }));
    handleNext();
  };

  const finishOnboarding = () => {
    const completionTime = Date.now();
    const durationSeconds = (completionTime - state.startTime) / 1000;

    onComplete({
      completedAt: new Date(),
      durationSeconds,
      momentCreated: state.momentCreated,
      questionAnswered: state.questionAnswered,
      calendarConnected: state.calendarConnected,
      skippedSteps: Array.from(state.skippedSteps)
    });
  };

  const percentLived = userBirthDate
    ? calculatePercentLived(userBirthDate)
    : 0;
  const currentWeek = userBirthDate
    ? calculateCurrentWeek(userBirthDate)
    : 0;

  // Render based on current step
  switch (state.currentStep) {
    case 'splash':
      return <SplashScreen onNext={handleNext} />;

    case 'tour':
      return <WelcomeTour onNext={handleNext} onSkip={handleSkip} />;

    case 'moment':
      return (
        <CreateFirstMoment
          userId={userId}
          currentWeek={currentWeek}
          onComplete={() => handleStepComplete('moment')}
          onSkip={handleSkip}
        />
      );

    case 'life-weeks':
      return (
        <LifeInWeeksExplanation
          percentLived={percentLived}
          currentWeek={currentWeek}
          totalWeeks={4745}
          onNext={handleNext}
          onSkip={handleSkip}
        />
      );

    case 'daily-question':
      return (
        <DailyQuestionStep
          onComplete={() => handleStepComplete('daily-question')}
          onSkip={handleSkip}
        />
      );

    case 'agenda':
      return (
        <AgendaPreviewStep
          onNext={handleNext}
          onSkip={handleSkip}
          onCalendarConnect={() => handleStepComplete('agenda', { connected: true })}
        />
      );

    case 'completion':
      return (
        <CompletionScreen
          momentCreated={state.momentCreated}
          questionAnswered={state.questionAnswered}
          calendarConnected={state.calendarConnected}
          onDone={finishOnboarding}
        />
      );

    default:
      return null;
  }
};
```

---

## PASSO 8: ATUALIZAR App.tsx

**Arquivo:** `App.tsx`

```typescript
// Remover import antigo
// import OnboardingWizard from './src/components/OnboardingWizard';

// Adicionar import novo
import { OnboardingWizardV2 } from './src/components/OnboardingWizardV2';

// ... em algum lugar do componente App:

// Replace:
{!checkingOnboarding && showOnboarding && (
  <OnboardingWizard
    onComplete={handleOnboardingComplete}
    onSkip={handleOnboardingSkip}
  />
)}

// Com:
{!checkingOnboarding && showOnboarding && (
  <OnboardingWizardV2
    onComplete={(event) => {
      // Log analytics se necessário
      console.log('[Onboarding] Completed:', event);
      handleOnboardingComplete(event.calendarConnected);
    }}
    onSkip={handleOnboardingSkip}
    userId={userId || ''}
    userBirthDate={userBirthDate}
  />
)}
```

---

## PASSO 9: CRIAR FUNÇÕES AUXILIARES

**Arquivo:** `src/utils/onboardingHelpers.ts`

```typescript
/**
 * Calcula o percentual de vida vivida baseado em data de nascimento
 */
export const calculatePercentLived = (birthDate: string): number => {
  const LIFE_EXPECTANCY_YEARS = 90;
  const totalWeeks = Math.ceil(LIFE_EXPECTANCY_YEARS * 52.1429);

  const parts = birthDate.split('-');
  if (parts.length !== 3) return 0;

  const [year, month, day] = parts.map(Number);
  const birth = new Date(year, month - 1, day);
  const now = new Date();
  const diffTime = now.getTime() - birth.getTime();
  const currentWeek = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));

  return Math.round((currentWeek / totalWeeks) * 100);
};

/**
 * Calcula a semana atual da vida
 */
export const calculateCurrentWeek = (birthDate: string): number => {
  const parts = birthDate.split('-');
  if (parts.length !== 3) return 0;

  const [year, month, day] = parts.map(Number);
  const birth = new Date(year, month - 1, day);
  const now = new Date();
  const diffTime = now.getTime() - birth.getTime();
  const currentWeek = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));

  return Math.max(0, currentWeek);
};

/**
 * Log de eventos de onboarding para analytics
 */
export const logOnboardingEvent = (
  eventType: string,
  data: Record<string, any>
) => {
  // Integrar com seu sistema de analytics (Segment, Mixpanel, etc)
  console.log(`[Onboarding] ${eventType}:`, data);
};
```

---

## PASSO 10: TESTES

### Teste Manual

```
1. Limpar cookies/local storage
2. Ir para app URL
3. Fazer login com novo usuário
4. Validar cada step:
   - [ ] Splash screen mostra por 3s
   - [ ] Tour carousel navega corretamente
   - [ ] Criar momento salva e mostra sucesso
   - [ ] Life in Weeks calcula corretamente
   - [ ] Pergunta diária aparece
   - [ ] Agenda preview mostra integração
   - [ ] Completion screen celebra corretamente
5. Validar skips funcionam
6. Validar data é salva em onboarding_completed
```

### Teste de Performance

```bash
# Checar bundle size dos novos componentes
npm run build
# Validar que não aumentou muito
```

### Teste de Acessibilidade

```
- [ ] Keyboard navigation funciona
- [ ] Screen reader lê corretamente
- [ ] Contrast ratio OK
- [ ] Focus indicators visíveis
```

---

## PASSO 11: ANALYTICS (Necessário)

Adicionar evento de conclusão de onboarding:

```typescript
// Em CompletionScreen.tsx ou finishOnboarding()
import { supabase } from '../services/supabaseClient';

const logOnboardingCompletion = async (
  userId: string,
  event: OnboardingCompletionEvent
) => {
  try {
    await supabase.from('analytics_onboarding').insert({
      user_id: userId,
      completed_at: event.completedAt,
      duration_seconds: event.durationSeconds,
      moment_created: event.momentCreated,
      question_answered: event.questionAnswered,
      calendar_connected: event.calendarConnected,
      skipped_steps: event.skippedSteps.join(',')
    });
  } catch (error) {
    console.error('Error logging onboarding:', error);
  }
};
```

---

## CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Criar arquivos de componentes
- [ ] Implementar OnboardingWizardV2
- [ ] Atualizar App.tsx para usar V2
- [ ] Teste manual completo
- [ ] Teste de acessibilidade
- [ ] Deploy para staging
- [ ] A/B test com usuários
- [ ] Iterar baseado em feedback
- [ ] Deploy para produção

---

## PRÓXIMOS PASSOS

1. **Implementação:** 1-2 sprints
2. **Testing:** 1 sprint com usuários reais
3. **Analytics:** Rastrear completion rate, dropout points
4. **Iteration:** Melhorar baseado em dados
5. **Expandir:** Criar variantes para diferentes user types (p.ex., podcasters)

