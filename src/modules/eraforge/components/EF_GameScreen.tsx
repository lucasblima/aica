/**
 * EF_GameScreen - Main game view with FSM-driven phases
 *
 * Implements the full decision flow:
 *   scenario -> ask_advice -> advisors -> decision -> consequence -> turn_complete -> (loop | day_complete)
 *
 * All data comes via props; callbacks trigger parent actions.
 * Uses Framer Motion for phase transitions and Ceramic design tokens.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageTransitionVariants, staggerContainer, staggerItem, springElevation } from '@/lib/animations/ceramic-motion';
import { EF_SceneRenderer } from './EF_SceneRenderer';
import { EF_StatsBar } from './EF_StatsBar';
import { EF_AdvisorPanel } from './EF_AdvisorPanel';
import { EF_TurnCounter } from './EF_TurnCounter';
import { EF_VoiceWave } from './EF_VoiceWave';
import type {
  Turn,
  WorldMember,
  Era,
  AdvisorId,
  TurnConsequences,
} from '../types/eraforge.types';

// ============================================
// TYPES
// ============================================

export type GamePhase =
  | 'scenario'
  | 'ask_advice'
  | 'advisors'
  | 'decision'
  | 'consequence'
  | 'turn_complete'
  | 'day_complete';

export interface EF_GameScreenProps {
  currentTurn: Turn | null;
  member: WorldMember;
  era: Era;
  turnsRemaining: number;
  selectedAdvisor: AdvisorId | null;
  advisorHint: string | null;
  consequence: TurnConsequences | null;
  isLoadingAI: boolean;
  isSpeaking?: boolean;
  isListening?: boolean;
  interimTranscript?: string;
  voiceSupported?: boolean;
  onAskAdvice: () => void;
  onSelectAdvisor: (advisorId: AdvisorId) => void;
  onSelectChoice: (choiceId: string) => void;
  onVoiceDecision: (transcript: string) => void;
  onNextTurn: () => void;
  onEndGame: () => void;
  onPlayAgain: () => void;
  eraProgressEarned?: number;
  nextEraName?: string | null;
  onStartListening?: () => void;
  onStopSpeaking?: () => void;
  onSpeak?: (text: string) => void;
  onSimulate?: () => void;
}

// ============================================
// EFButton — shared button component
// ============================================

function EFButton({
  variant = 'primary',
  loading = false,
  children,
  className = '',
  ...props
}: {
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'>) {
  const styles = {
    primary: 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/30',
    secondary: 'bg-ceramic-cool hover:bg-ceramic-cool-hover text-ceramic-text-primary',
    ghost: 'text-ceramic-text-secondary hover:text-ceramic-text-primary bg-transparent',
  };
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className={`py-3 px-4 rounded-xl font-fredoka font-bold transition-colors ${styles[variant]} ${className}`}
      disabled={loading}
      {...(props as any)}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto" />
      ) : children}
    </motion.button>
  );
}

// ============================================
// COMPONENT
// ============================================

export function EF_GameScreen({
  currentTurn,
  member,
  era,
  turnsRemaining,
  selectedAdvisor,
  advisorHint,
  consequence,
  isLoadingAI,
  isSpeaking = false,
  isListening = false,
  interimTranscript = '',
  voiceSupported = true,
  onAskAdvice,
  onSelectAdvisor,
  onSelectChoice,
  onVoiceDecision,
  onNextTurn,
  onEndGame,
  onPlayAgain,
  eraProgressEarned = 0,
  nextEraName = null,
  onStartListening,
  onStopSpeaking,
  onSpeak,
  onSimulate,
}: EF_GameScreenProps) {
  const scenario = currentTurn?.scenario;

  // ----- FSM State -----
  const [phase, setPhase] = useState<GamePhase>('scenario');
  const [prevMember, setPrevMember] = useState<WorldMember>(member);
  const [animatingStats, setAnimatingStats] = useState(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // Reset phase when turn changes
  useEffect(() => {
    if (currentTurn) {
      setPhase('scenario');
    }
  }, [currentTurn?.id]);

  // Auto-narrate scenario description when entering scenario phase
  useEffect(() => {
    if (phase === 'scenario' && scenario?.description && onSpeak) {
      onSpeak(scenario.description);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, scenario?.description, onSpeak]);

  // When advisor hint arrives, move to advisors phase
  useEffect(() => {
    if (advisorHint && phaseRef.current === 'ask_advice') {
      setPhase('advisors');
    }
  }, [advisorHint]);

  // When consequence arrives, move to consequence phase
  useEffect(() => {
    if (consequence && phaseRef.current === 'decision') {
      setPhase('consequence');
      if (consequence.narrative && onSpeak) {
        onSpeak(consequence.narrative);
      }
      setAnimatingStats(true);
      const timer = setTimeout(() => setAnimatingStats(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [consequence]);

  // Auto-advance from turn_complete after 1s
  useEffect(() => {
    if (phase === 'turn_complete') {
      const timer = setTimeout(() => {
        if (turnsRemaining <= 1) {
          setPhase('day_complete');
        } else {
          onNextTurn();
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [phase, turnsRemaining, onNextTurn]);

  // Remember previous member stats for delta display
  useEffect(() => {
    if (phase !== 'consequence') {
      setPrevMember(member);
    }
  }, [phase, member.knowledge, member.cooperation, member.courage]);

  // ----- Handlers -----

  const handleAskAdvice = useCallback(() => {
    setPhase('ask_advice');
    onAskAdvice();
  }, [onAskAdvice]);

  const handleSelectAdvisor = useCallback(
    (advisorId: AdvisorId) => {
      onSelectAdvisor(advisorId);
      navigator.vibrate?.(50);
    },
    [onSelectAdvisor]
  );

  const handleChooseDecision = useCallback(() => {
    setPhase('decision');
  }, []);

  const handleSelectChoice = useCallback(
    (choiceId: string) => {
      onSelectChoice(choiceId);
      navigator.vibrate?.(50);
    },
    [onSelectChoice]
  );

  const handleNextTurn = useCallback(() => {
    setPhase('turn_complete');
  }, []);

  // ----- Render helpers -----

  const renderStatDeltas = (cons: TurnConsequences) => {
    const deltas = [
      { label: 'Conhecimento', delta: cons.knowledge_delta, emoji: '📚' },
      { label: 'Cooperação', delta: cons.cooperation_delta, emoji: '🤝' },
      { label: 'Coragem', delta: cons.courage_delta, emoji: '⚔️' },
    ].filter((d) => d.delta && d.delta !== 0);

    if (deltas.length === 0) return null;

    return (
      <motion.div
        className="flex gap-3 mt-3"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {deltas.map((d, i) => (
          <motion.div
            key={d.label}
            variants={staggerItem}
            className={`flex items-center gap-1 text-sm font-bold ${
              d.delta! > 0 ? 'text-ceramic-success' : 'text-ceramic-error'
            }`}
          >
            <span>{d.emoji}</span>
            <motion.span
              initial={{ scale: 1 }}
              animate={animatingStats ? { scale: [1, 1.3, 1] } : { scale: 1 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              {d.delta! > 0 ? '+' : ''}{d.delta}
            </motion.span>
          </motion.div>
        ))}
      </motion.div>
    );
  };

  // ----- Phase-specific cards -----

  const renderScenarioPhase = () => {
    if (!scenario) {
      return (
        <PhaseCard phaseKey="scenario-loading">
          <p className="text-ceramic-text-secondary text-sm text-center py-4">
            Preparando cenário...
          </p>
        </PhaseCard>
      );
    }

    return (
      <PhaseCard phaseKey="scenario">
        <h2 className="text-lg font-bold text-ceramic-text-primary font-fredoka">
          {scenario.title || 'Aventura'}
        </h2>
        <p className="text-sm text-ceramic-text-secondary mt-2 leading-relaxed">
          {scenario.description || 'Carregando cenário...'}
        </p>

        {isSpeaking && (
          <div className="mt-3">
            <EF_VoiceWave
              isSpeaking={isSpeaking}
              onStopSpeaking={onStopSpeaking}
              voiceSupported={voiceSupported}
            />
          </div>
        )}

        {phase === 'scenario' && !isSpeaking && (
          <EFButton
            onClick={handleAskAdvice}
            aria-label="Pedir conselho aos conselheiros"
            className="mt-4 w-full animate-pulse"
          >
            Pedir Conselho!
          </EFButton>
        )}
      </PhaseCard>
    );
  };

  const renderAdvisorPhase = () => (
    <PhaseCard phaseKey="advisors">
      <EF_AdvisorPanel
        onSelectAdvisor={handleSelectAdvisor}
        selectedAdvisor={selectedAdvisor}
        advisorHint={advisorHint}
        isLoading={isLoadingAI && phase === 'ask_advice'}
        isSpeaking={isSpeaking}
        onStopSpeaking={onStopSpeaking}
        voiceSupported={voiceSupported}
      />

      {phase === 'advisors' && advisorHint && !isSpeaking && (
        <EFButton
          onClick={handleChooseDecision}
          aria-label="Escolher uma decisão"
          className="mt-4 w-full"
        >
          Escolher
        </EFButton>
      )}
    </PhaseCard>
  );

  const renderDecisionPhase = () => {
    if (!scenario?.choices) return null;

    return (
      <PhaseCard phaseKey="decision">
        <h3 className="text-sm font-bold text-ceramic-text-primary mb-3 font-fredoka">
          O que você decide?
        </h3>

        <motion.div
          className="space-y-2"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {scenario.choices.map((choice) => (
            <motion.button
              key={choice.id}
              variants={staggerItem}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelectChoice(choice.id)}
              disabled={isLoadingAI}
              className="w-full text-left p-3 rounded-lg bg-ceramic-cool shadow-ceramic-inset hover:bg-amber-50
                         transition-colors disabled:opacity-50"
            >
              <span className="text-sm font-medium text-ceramic-text-primary">
                {choice.text}
              </span>
            </motion.button>
          ))}
        </motion.div>

        <div className="mt-4 pt-3 border-t border-ceramic-border">
          <p className="text-xs text-ceramic-text-secondary mb-2 text-center">
            Ou fale sua decisão:
          </p>
          <EF_VoiceWave
            isListening={isListening}
            interimTranscript={interimTranscript}
            onListen={onStartListening}
            voiceSupported={voiceSupported}
            className="justify-center"
          />
        </div>

        {isLoadingAI && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-ceramic-text-secondary">
              Processando...
            </span>
          </div>
        )}
      </PhaseCard>
    );
  };

  const renderConsequencePhase = () => {
    if (!consequence) return null;

    return (
      <PhaseCard phaseKey="consequence">
        <div className="p-4 bg-ceramic-cool shadow-ceramic-inset rounded-lg">
          <p className="text-sm text-ceramic-text-primary leading-relaxed">
            {consequence.narrative}
          </p>
        </div>

        {isSpeaking && (
          <div className="mt-3">
            <EF_VoiceWave
              isSpeaking={isSpeaking}
              onStopSpeaking={onStopSpeaking}
              voiceSupported={voiceSupported}
            />
          </div>
        )}

        {renderStatDeltas(consequence)}

        {consequence.historical_fact && (
          <div className="mt-3 p-3 bg-amber-50/80 backdrop-blur-sm border border-amber-200/60 rounded-lg">
            <p className="text-xs font-bold text-amber-700 mb-1 font-fredoka">
              Você sabia?
            </p>
            <p className="text-xs text-amber-800 leading-relaxed">
              {consequence.historical_fact}
            </p>
          </div>
        )}

        {!isSpeaking && (
          <EFButton
            onClick={handleNextTurn}
            aria-label={turnsRemaining <= 1 ? 'Finalizar aventura' : 'Ir para o próximo turno'}
            className="mt-4 w-full"
          >
            {turnsRemaining <= 1
              ? 'Aventura Completa!'
              : 'Próximo Turno'}
          </EFButton>
        )}
      </PhaseCard>
    );
  };

  const renderTurnComplete = () => (
    <PhaseCard phaseKey="turn_complete">
      <div className="flex flex-col items-center py-6">
        <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="mt-3 text-sm font-bold text-ceramic-text-primary font-fredoka">
          Preparando próximo turno...
        </p>
      </div>
    </PhaseCard>
  );

  const renderDayComplete = () => (
    <PhaseCard phaseKey="day_complete">
      <div className="flex flex-col items-center py-6 text-center">
        <motion.span
          className="text-5xl mb-3"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          {nextEraName ? '🏆' : '🌟'}
        </motion.span>
        <h2 className="text-xl font-bold text-ceramic-text-primary font-fredoka">
          {nextEraName ? 'Nova Era Desbloqueada!' : 'Parabéns!'}
        </h2>
        <p className="text-sm text-ceramic-text-secondary mt-2 leading-relaxed max-w-xs">
          {nextEraName
            ? `Você avançou para: ${nextEraName}! Continue explorando a história.`
            : 'Sua aventura de hoje foi incrível! Você explorou a história e tomou decisões incríveis.'}
        </p>

        {eraProgressEarned > 0 && (
          <div className="mt-3 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs font-bold text-amber-700 font-fredoka">
              Progresso da Era: +{eraProgressEarned}%
            </p>
          </div>
        )}

        <div className="mt-4 w-full max-w-xs">
          <EF_StatsBar
            knowledge={member.knowledge}
            cooperation={member.cooperation}
            courage={member.courage}
          />
        </div>

        <div className="mt-6 w-full max-w-xs space-y-3">
          <EFButton
            onClick={onPlayAgain}
            aria-label={nextEraName ? `Explorar ${nextEraName}` : 'Jogar novamente'}
            className="w-full"
          >
            {nextEraName ? `Explorar ${nextEraName}` : 'Jogar Novamente'}
          </EFButton>
          {onSimulate && (
            <EFButton
              variant="secondary"
              onClick={onSimulate}
              aria-label="Simular 14 dias"
              className="w-full"
            >
              Simular 14 dias
            </EFButton>
          )}
          <button
            onClick={onEndGame}
            aria-label="Voltar ao início"
            className="w-full py-2 text-sm text-ceramic-text-secondary bg-ceramic-cool shadow-ceramic-inset
                       rounded-lg hover:bg-ceramic-cool-hover transition-colors"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    </PhaseCard>
  );

  // ----- Main render -----

  return (
    <motion.div
      className="flex flex-col min-h-screen bg-ceramic-base"
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
    >
      {/* Top bar: stats + turns */}
      <div className="flex items-center justify-between p-4">
        <EF_StatsBar
          knowledge={member.knowledge}
          cooperation={member.cooperation}
          courage={member.courage}
        />
        <EF_TurnCounter turnsRemaining={turnsRemaining} />
      </div>

      {/* Scene */}
      <div className="px-4">
        <EF_SceneRenderer era={era} />
      </div>

      {/* Phase content */}
      <div className="flex-1 px-4 mt-4 pb-4 space-y-0">
        <AnimatePresence mode="wait">
          {phase === 'scenario' && renderScenarioPhase()}
          {(phase === 'ask_advice' || phase === 'advisors') && renderAdvisorPhase()}
          {phase === 'decision' && renderDecisionPhase()}
          {phase === 'consequence' && renderConsequencePhase()}
          {phase === 'turn_complete' && renderTurnComplete()}
          {phase === 'day_complete' && renderDayComplete()}
        </AnimatePresence>
      </div>

      {/* End Game shortcut */}
      {phase !== 'day_complete' && phase !== 'turn_complete' && (
        <div className="px-4 pb-6">
          <button
            onClick={onEndGame}
            aria-label="Encerrar sessão de jogo"
            className="w-full py-2 text-sm text-ceramic-text-secondary bg-ceramic-cool shadow-ceramic-inset
                       rounded-lg hover:bg-ceramic-cool-hover transition-colors"
          >
            Encerrar Sessão
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ============================================
// PHASE CARD — Framer Motion animated wrapper
// ============================================

function PhaseCard({
  phaseKey,
  children,
}: {
  phaseKey: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      key={phaseKey}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={springElevation}
      className="p-4 bg-ceramic-card rounded-xl shadow-ceramic-emboss"
    >
      {children}
    </motion.div>
  );
}
