/**
 * EF_GameScreen - Main game view with FSM-driven phases
 *
 * Implements the full decision flow:
 *   scenario -> ask_advice -> advisors -> decision -> consequence -> turn_complete -> (loop | day_complete)
 *
 * All data comes via props; callbacks trigger parent actions.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  /** TTS is currently speaking */
  isSpeaking?: boolean;
  /** STT is currently listening */
  isListening?: boolean;
  /** Interim transcript from STT */
  interimTranscript?: string;
  /** Whether voice features are available */
  voiceSupported?: boolean;
  onAskAdvice: () => void;
  onSelectAdvisor: (advisorId: AdvisorId) => void;
  onSelectChoice: (choiceId: string) => void;
  onVoiceDecision: (transcript: string) => void;
  onNextTurn: () => void;
  onEndGame: () => void;
  /** Start STT listening */
  onStartListening?: () => void;
  /** Stop TTS speaking */
  onStopSpeaking?: () => void;
  /** Speak text via TTS */
  onSpeak?: (text: string) => void;
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
  onStartListening,
  onStopSpeaking,
  onSpeak,
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
      // Auto-narrate consequence narrative
      if (consequence.narrative && onSpeak) {
        onSpeak(consequence.narrative);
      }
      // Animate stats after a short delay
      setAnimatingStats(true);
      const timer = setTimeout(() => setAnimatingStats(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [consequence]);

  // Auto-advance from turn_complete after 1s
  useEffect(() => {
    if (phase === 'turn_complete') {
      const timer = setTimeout(() => {
        if (turnsRemaining <= 0) {
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

  const fredoka = { fontFamily: "'Fredoka', 'Nunito', sans-serif" };

  const renderStatDeltas = (cons: TurnConsequences) => {
    const deltas = [
      { label: 'Conhecimento', delta: cons.knowledge_delta, emoji: '📚' },
      { label: 'Cooperação', delta: cons.cooperation_delta, emoji: '🤝' },
      { label: 'Coragem', delta: cons.courage_delta, emoji: '⚔️' },
    ].filter((d) => d.delta && d.delta !== 0);

    if (deltas.length === 0) return null;

    return (
      <div className="flex gap-3 mt-3">
        {deltas.map((d) => (
          <div
            key={d.label}
            className={`flex items-center gap-1 text-sm font-bold transition-all duration-700 ${
              animatingStats ? 'scale-110' : 'scale-100'
            } ${d.delta! > 0 ? 'text-ceramic-success' : 'text-ceramic-error'}`}
          >
            <span>{d.emoji}</span>
            <span>
              {d.delta! > 0 ? '+' : ''}
              {d.delta}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // ----- Phase-specific cards -----

  const renderScenarioPhase = () => {
    if (!scenario) {
      return (
        <PhaseCard visible>
          <p className="text-ceramic-text-secondary text-sm text-center py-4">
            Preparando cenário...
          </p>
        </PhaseCard>
      );
    }

    return (
      <PhaseCard visible={phase === 'scenario'}>
        <h2
          className="text-lg font-bold text-ceramic-text-primary"
          style={fredoka}
        >
          {scenario.title || 'Aventura'}
        </h2>
        <p className="text-sm text-ceramic-text-secondary mt-2 leading-relaxed">
          {scenario.description || 'Carregando cenário...'}
        </p>

        {/* Voice wave when narrating */}
        {isSpeaking && (
          <div className="mt-3">
            <EF_VoiceWave
              isSpeaking={isSpeaking}
              onStopSpeaking={onStopSpeaking}
              voiceSupported={voiceSupported}
            />
          </div>
        )}

        {/* Ask Advice button */}
        {phase === 'scenario' && !isSpeaking && (
          <button
            onClick={handleAskAdvice}
            aria-label="Pedir conselho aos conselheiros"
            className="mt-4 w-full py-3 rounded-xl font-bold text-white bg-amber-500
                       hover:bg-amber-600 active:scale-[0.97] transition-all
                       shadow-lg shadow-amber-500/30 animate-pulse"
            style={fredoka}
          >
            Pedir Conselho!
          </button>
        )}
      </PhaseCard>
    );
  };

  const renderAdvisorPhase = () => (
    <PhaseCard visible={phase === 'ask_advice' || phase === 'advisors'}>
      <EF_AdvisorPanel
        onSelectAdvisor={handleSelectAdvisor}
        selectedAdvisor={selectedAdvisor}
        advisorHint={advisorHint}
        isLoading={isLoadingAI && phase === 'ask_advice'}
        isSpeaking={isSpeaking}
        onStopSpeaking={onStopSpeaking}
        voiceSupported={voiceSupported}
      />

      {/* Choose button — visible when hint is shown */}
      {phase === 'advisors' && advisorHint && !isSpeaking && (
        <button
          onClick={handleChooseDecision}
          aria-label="Escolher uma decisão"
          className="mt-4 w-full py-3 rounded-xl font-bold text-white bg-amber-500
                     hover:bg-amber-600 active:scale-[0.97] transition-all shadow-lg shadow-amber-500/30"
          style={fredoka}
        >
          Escolher
        </button>
      )}
    </PhaseCard>
  );

  const renderDecisionPhase = () => {
    if (!scenario?.choices) return null;

    return (
      <PhaseCard visible={phase === 'decision'}>
        <h3
          className="text-sm font-bold text-ceramic-text-primary mb-3"
          style={fredoka}
        >
          O que você decide?
        </h3>

        <div className="space-y-2">
          {scenario.choices.map((choice) => (
            <button
              key={choice.id}
              onClick={() => handleSelectChoice(choice.id)}
              disabled={isLoadingAI}
              className="w-full text-left p-3 rounded-lg bg-ceramic-inset hover:bg-amber-50
                         active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <span className="text-sm font-medium text-ceramic-text-primary">
                {choice.text}
              </span>
            </button>
          ))}
        </div>

        {/* Voice decision option */}
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
      <PhaseCard visible={phase === 'consequence'}>
        {/* Narrative */}
        <div className="p-4 bg-ceramic-inset rounded-lg">
          <p className="text-sm text-ceramic-text-primary leading-relaxed">
            {consequence.narrative}
          </p>
        </div>

        {/* Voice wave when narrating consequence */}
        {isSpeaking && (
          <div className="mt-3">
            <EF_VoiceWave
              isSpeaking={isSpeaking}
              onStopSpeaking={onStopSpeaking}
              voiceSupported={voiceSupported}
            />
          </div>
        )}

        {/* Stat deltas */}
        {renderStatDeltas(consequence)}

        {/* Historical fact bonus */}
        {consequence.historical_fact && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs font-bold text-amber-700 mb-1" style={fredoka}>
              Você sabia?
            </p>
            <p className="text-xs text-amber-800 leading-relaxed">
              {consequence.historical_fact}
            </p>
          </div>
        )}

        {/* Next turn button */}
        {!isSpeaking && (
          <button
            onClick={handleNextTurn}
            aria-label={turnsRemaining <= 1 ? 'Finalizar aventura' : 'Ir para o próximo turno'}
            className="mt-4 w-full py-3 rounded-xl font-bold text-white bg-amber-500
                       hover:bg-amber-600 active:scale-[0.97] transition-all shadow-lg shadow-amber-500/30"
            style={fredoka}
          >
            {turnsRemaining <= 1
              ? 'Aventura Completa!'
              : 'Próximo Turno'}
          </button>
        )}
      </PhaseCard>
    );
  };

  const renderTurnComplete = () => (
    <PhaseCard visible={phase === 'turn_complete'}>
      <div className="flex flex-col items-center py-6">
        <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p
          className="mt-3 text-sm font-bold text-ceramic-text-primary"
          style={fredoka}
        >
          Preparando próximo turno...
        </p>
      </div>
    </PhaseCard>
  );

  const renderDayComplete = () => (
    <PhaseCard visible={phase === 'day_complete'}>
      <div className="flex flex-col items-center py-6 text-center">
        <span className="text-5xl mb-3">🌟</span>
        <h2 className="text-xl font-bold text-ceramic-text-primary" style={fredoka}>
          Parabéns!
        </h2>
        <p className="text-sm text-ceramic-text-secondary mt-2 leading-relaxed max-w-xs">
          Sua aventura de hoje foi incrível! Você explorou a história
          e tomou decisões incríveis.
        </p>

        {/* Stats summary */}
        <div className="mt-4 w-full max-w-xs">
          <EF_StatsBar
            knowledge={member.knowledge}
            cooperation={member.cooperation}
            courage={member.courage}
          />
        </div>

        <button
          onClick={onEndGame}
          aria-label="Voltar ao início"
          className="mt-6 w-full max-w-xs py-3 rounded-xl font-bold text-white bg-amber-500
                     hover:bg-amber-600 active:scale-[0.97] transition-all shadow-lg shadow-amber-500/30"
          style={fredoka}
        >
          Voltar ao Início
        </button>
      </div>
    </PhaseCard>
  );

  // ----- Main render -----

  return (
    <div className="flex flex-col min-h-screen bg-ceramic-base">
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
        {renderScenarioPhase()}
        {(phase === 'ask_advice' || phase === 'advisors') && renderAdvisorPhase()}
        {phase === 'decision' && renderDecisionPhase()}
        {phase === 'consequence' && renderConsequencePhase()}
        {phase === 'turn_complete' && renderTurnComplete()}
        {phase === 'day_complete' && renderDayComplete()}
      </div>

      {/* End Game shortcut (only during active gameplay, not day_complete) */}
      {phase !== 'day_complete' && phase !== 'turn_complete' && (
        <div className="px-4 pb-6">
          <button
            onClick={onEndGame}
            aria-label="Encerrar sessão de jogo"
            className="w-full py-2 text-sm text-ceramic-text-secondary bg-ceramic-inset
                       rounded-lg hover:bg-ceramic-border transition-colors"
          >
            Encerrar Sessão
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// PHASE CARD — animated wrapper
// ============================================

function PhaseCard({
  visible,
  children,
}: {
  visible: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="p-4 bg-ceramic-card rounded-xl shadow-ceramic-emboss transition-all duration-500"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        pointerEvents: visible ? 'auto' : 'none',
        maxHeight: visible ? '2000px' : '0px',
        overflow: 'hidden',
        marginBottom: visible ? '0px' : '-16px',
      }}
    >
      {children}
    </div>
  );
}
