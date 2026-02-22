/**
 * EraForgeMainView - Main orchestrator view for EraForge module
 *
 * Routes between screens based on game mode from EraforgeGameContext.
 * Orchestrates AI scenario generation, advisor responses, decision processing,
 * voice interaction, and turn persistence.
 *
 * Similar to Studio's StudioMainView pattern.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useEraforgeGame } from '../contexts/EraforgeGameContext';
import { EraforgeGameService } from '../services/eraforgeGameService';
import { EraforgeAIService } from '../services/eraforgeAIService';
import { useEraforgeVoiceHook } from '../hooks/useEraforgeVoice';
import { supabase } from '@/services/supabaseClient';
import { EF_HomeScreen } from '../components/EF_HomeScreen';
import { EF_GameScreen } from '../components/EF_GameScreen';
import { EF_SimulationScreen } from '../components/EF_SimulationScreen';
import { EF_ParentDashboard } from '../components/EF_ParentDashboard';
import { createNamespacedLogger } from '@/lib/logger';
import type {
  World,
  ChildProfile,
  AdvisorId,
  Turn,
  TurnScenario,
  TurnConsequences,
} from '../types/eraforge.types';

const log = createNamespacedLogger('EraForgeMainView');

const DEFAULT_TURNS = 5;

export default function EraForgeMainView() {
  const { state, actions } = useEraforgeGame();
  const voice = useEraforgeVoiceHook();

  // Data loading state
  const [worlds, setWorlds] = useState<World[]>([]);
  const [childProfiles, setChildProfiles] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Game flow state
  const [selectedAdvisor, setSelectedAdvisor] = useState<AdvisorId | null>(null);
  const [advisorHint, setAdvisorHint] = useState<string | null>(null);
  const [consequence, setConsequence] = useState<TurnConsequences | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);

  // Ref to track whether we've already initiated game start for the current child
  const gameStartedRef = useRef(false);

  // Track current scenario for convenience (derived from state.currentScenario)
  const currentScenarioRef = useRef<TurnScenario | null>(null);
  useEffect(() => {
    currentScenarioRef.current = state.currentScenario?.scenario ?? null;
  }, [state.currentScenario]);

  // ------- DATA LOADING -------

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [worldsResult, childrenResult] = await Promise.all([
          EraforgeGameService.getWorlds(),
          EraforgeGameService.getChildProfiles(),
        ]);

        if (worldsResult.data) setWorlds(worldsResult.data);
        if (childrenResult.data) setChildProfiles(childrenResult.data);
      } catch (err) {
        log.error('Error loading EraForge data:', err);
        actions.setError('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [actions]);

  // ------- SCENARIO GENERATION -------

  const generateAndSetScenario = useCallback(async (): Promise<Turn | null> => {
    if (!state.currentWorld || !state.currentMember || !state.currentChild) {
      log.error('Cannot generate scenario: missing world, member, or child');
      return null;
    }

    setIsLoadingAI(true);
    try {
      const result = await EraforgeAIService.generateScenario(
        state.currentWorld.name,
        state.currentWorld.current_era,
        {
          knowledge: state.currentMember.knowledge,
          cooperation: state.currentMember.cooperation,
          courage: state.currentMember.courage,
        },
        turns.length > 0
          ? turns.slice(-5).map(t => ({ scenario: t.scenario, decision: t.decision }))
          : undefined,
      );

      if (result.error || !result.data) {
        log.error('Failed to generate scenario:', result.error);
        actions.setError('Erro ao gerar cenário. Tente novamente.');
        return null;
      }

      const turn: Turn = {
        id: crypto.randomUUID(),
        world_id: state.currentWorld.id,
        child_id: state.currentChild.id,
        scenario: result.data.scenario,
        advisor_chosen: null,
        decision: null,
        consequences: {},
        created_at: new Date().toISOString(),
      };

      return turn;
    } catch (err) {
      log.error('Unexpected error generating scenario:', err);
      actions.setError('Erro inesperado ao gerar cenário');
      return null;
    } finally {
      setIsLoadingAI(false);
    }
  }, [state.currentWorld, state.currentMember, state.currentChild, turns, actions]);

  // ------- GAME START (effect-based to avoid stale closure) -------

  // Auto-start game when child+world+member are all set and we haven't started yet
  useEffect(() => {
    if (
      state.currentWorld &&
      state.currentChild &&
      state.currentMember &&
      state.mode === 'HOME' &&
      !gameStartedRef.current
    ) {
      gameStartedRef.current = true;

      // Reset local game state
      setSelectedAdvisor(null);
      setAdvisorHint(null);
      setConsequence(null);
      setTurns([]);

      actions.startGame(DEFAULT_TURNS);
    }
  }, [state.currentWorld, state.currentChild, state.currentMember, state.mode, actions]);

  // Generate first scenario when game transitions to PLAYING with no scenario
  useEffect(() => {
    if (
      state.mode === 'PLAYING' &&
      !state.currentScenario &&
      !isLoadingAI &&
      state.currentWorld &&
      state.currentMember &&
      state.currentChild
    ) {
      (async () => {
        const turn = await generateAndSetScenario();
        if (turn) {
          actions.nextTurn(turn);
          setTurns([turn]);
        }
      })();
    }
    // Only trigger when mode changes to PLAYING or currentScenario becomes null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.mode, state.currentScenario]);

  // ------- HOME SCREEN HANDLERS -------

  const handleSelectWorld = useCallback((world: World) => {
    actions.setWorld(world);
  }, [actions]);

  const handleSelectChild = useCallback(async (child: ChildProfile) => {
    if (!state.currentWorld) return;

    const result = await EraforgeGameService.getChildMember(state.currentWorld.id, child.id);
    if (result.data) {
      gameStartedRef.current = false; // Reset so the effect can trigger
      actions.setChild(child, result.data);
    } else {
      log.error('Failed to load member data for child:', result.error);
      actions.setError('Erro ao carregar dados do jogador');
    }
  }, [state.currentWorld, actions]);

  const handleCreateWorld = useCallback(() => {
    // TODO: Show world creation modal
    log.debug('Create world requested');
  }, []);

  // ------- ADVISOR HANDLERS -------

  const handleAskAdvice = useCallback(() => {
    // No-op visual trigger — phase transition is handled by GameScreen
    log.debug('Ask advice requested');
  }, []);

  const handleSelectAdvisor = useCallback(async (advisorId: AdvisorId) => {
    const scenario = currentScenarioRef.current;
    if (!scenario) {
      log.error('No scenario to get advisor response for');
      return;
    }

    setSelectedAdvisor(advisorId);
    setAdvisorHint(null);

    const result = await EraforgeAIService.getAdvisorResponse(advisorId, scenario);
    if (result.data) {
      setAdvisorHint(result.data.hint);
      // Speak the advisor hint with the advisor's voice
      if (voice.voiceSupported) {
        voice.speak(result.data.hint, advisorId);
      }
    } else {
      log.error('Failed to get advisor response:', result.error);
    }
  }, [voice]);

  // ------- DECISION HANDLERS -------

  const handleNextTurn = useCallback(async () => {
    // Reset turn-specific state
    setSelectedAdvisor(null);
    setAdvisorHint(null);
    setConsequence(null);

    actions.decrementTurn();

    // Check if game should end (current turnsRemaining is pre-decrement)
    if (state.turnsRemaining <= 1) {
      log.debug('No turns remaining, ending game session');
      return;
    }

    // Generate next scenario
    const turn = await generateAndSetScenario();
    if (turn) {
      actions.nextTurn(turn);
      setTurns(prev => [...prev, turn]);
    }
  }, [state.turnsRemaining, actions, generateAndSetScenario]);

  const handleSelectChoice = useCallback(async (choiceId: string) => {
    const scenario = currentScenarioRef.current;
    if (!scenario || !state.currentWorld || !state.currentMember) {
      log.error('Cannot process decision: missing scenario, world, or member');
      return;
    }

    setIsLoadingAI(true);
    try {
      const result = await EraforgeAIService.processDecision(
        scenario,
        choiceId,
        selectedAdvisor,
        state.currentWorld.current_era,
        {
          knowledge: state.currentMember.knowledge,
          cooperation: state.currentMember.cooperation,
          courage: state.currentMember.courage,
        },
      );

      if (result.data) {
        const consequences = result.data.consequences;
        setConsequence(consequences);

        // Update the current turn record with decision + consequences
        setTurns(prev =>
          prev.map((t, i) =>
            i === prev.length - 1
              ? { ...t, decision: choiceId, advisor_chosen: selectedAdvisor, consequences }
              : t,
          ),
        );

        // Narrate the consequence via TTS
        if (voice.voiceSupported && consequences.narrative) {
          voice.speak(consequences.narrative);
        }
      } else {
        log.error('Failed to process decision:', result.error);
        actions.setError('Erro ao processar decisão');
      }
    } catch (err) {
      log.error('Unexpected error processing decision:', err);
      actions.setError('Erro inesperado ao processar decisão');
    } finally {
      setIsLoadingAI(false);
    }
  }, [state.currentWorld, state.currentMember, selectedAdvisor, actions, voice]);

  const handleVoiceDecision = useCallback((transcript: string) => {
    const scenario = currentScenarioRef.current;
    if (!scenario?.choices || scenario.choices.length === 0) {
      log.debug('No choices available for voice matching');
      return;
    }

    const normalizedTranscript = transcript.toLowerCase().trim();

    // Fuzzy match: find choice whose text has the most keyword overlap with the transcript
    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const choice of scenario.choices) {
      const choiceWords = choice.text.toLowerCase().split(/\s+/);
      const matchCount = choiceWords.filter(word =>
        word.length > 2 && normalizedTranscript.includes(word),
      ).length;
      const score = choiceWords.length > 0 ? matchCount / choiceWords.length : 0;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = choice.id;
      }
    }

    // Require at least 30% keyword match to accept
    if (bestMatch && bestScore >= 0.3) {
      log.debug('Voice matched choice:', { bestMatch, bestScore, transcript });
      handleSelectChoice(bestMatch);
    } else {
      log.debug('Voice did not match any choice:', { bestScore, transcript });
    }
  }, [handleSelectChoice]);

  // ------- END GAME -------

  const handleEndGame = useCallback(async () => {
    // Persist turns_today to DB
    if (state.currentWorld && state.currentChild && state.currentMember) {
      const turnsPlayed = turns.length;
      const newTurnsToday = state.currentMember.turns_today + turnsPlayed;

      try {
        const { error } = await supabaseUpdateMember(
          state.currentWorld.id,
          state.currentChild.id,
          newTurnsToday,
        );
        if (error) {
          log.error('Failed to save turns_today:', error);
        }
      } catch (err) {
        log.error('Error saving game progress:', err);
      }
    }

    // Reset local state
    setSelectedAdvisor(null);
    setAdvisorHint(null);
    setConsequence(null);
    setTurns([]);
    gameStartedRef.current = false;

    actions.endGame();
  }, [state.currentWorld, state.currentChild, state.currentMember, turns, actions]);

  // ------- PARENT DASHBOARD HANDLERS -------

  const handleVerifyPin = useCallback(async (_pin: string): Promise<boolean> => {
    // TODO: Call eraforge_verify_pin RPC
    return true;
  }, []);

  const handleUpdateSettings = useCallback((_updates: { max_turns_per_day?: number; voice_enabled?: boolean }) => {
    // TODO: Update parental settings
  }, []);

  const handleAddChild = useCallback(() => {
    // TODO: Show add child modal
  }, []);

  // ------- RENDER -------

  switch (state.mode) {
    case 'HOME':
      return (
        <EF_HomeScreen
          worlds={worlds}
          children={childProfiles}
          onSelectWorld={handleSelectWorld}
          onSelectChild={handleSelectChild}
          onCreateWorld={handleCreateWorld}
          loading={loading}
        />
      );

    case 'PLAYING':
      if (!state.currentMember || !state.currentWorld) {
        actions.goHome();
        return null;
      }
      return (
        <EF_GameScreen
          currentTurn={state.currentScenario}
          member={state.currentMember}
          era={state.currentWorld.current_era}
          turnsRemaining={state.turnsRemaining}
          selectedAdvisor={selectedAdvisor}
          advisorHint={advisorHint}
          consequence={consequence}
          isLoadingAI={isLoadingAI}
          isSpeaking={voice.isSpeaking}
          isListening={voice.isListening}
          interimTranscript={voice.interimTranscript}
          voiceSupported={voice.voiceSupported}
          onAskAdvice={handleAskAdvice}
          onSelectAdvisor={handleSelectAdvisor}
          onSelectChoice={handleSelectChoice}
          onVoiceDecision={handleVoiceDecision}
          onNextTurn={handleNextTurn}
          onEndGame={handleEndGame}
          onStartListening={voice.listen}
          onStopSpeaking={voice.stopSpeaking}
          onSpeak={voice.speak}
        />
      );

    case 'SIMULATION':
      return (
        <EF_SimulationScreen
          events={[]}
          summary=""
          statsDelta={{}}
          onBack={() => actions.goHome()}
        />
      );

    case 'PARENT_DASHBOARD':
      return (
        <EF_ParentDashboard
          children={childProfiles}
          settings={null}
          onVerifyPin={handleVerifyPin}
          onUpdateSettings={handleUpdateSettings}
          onAddChild={handleAddChild}
          onBack={() => actions.goHome()}
        />
      );

    default:
      return null;
  }
}

// ------- HELPER: Update member turns_today via Supabase -------

async function supabaseUpdateMember(
  worldId: string,
  childId: string,
  turnsToday: number,
): Promise<{ error: unknown }> {
  try {
    const { error } = await supabase
      .from('eraforge_world_members')
      .update({
        turns_today: turnsToday,
        last_turn_date: new Date().toISOString().split('T')[0],
      })
      .eq('world_id', worldId)
      .eq('child_id', childId);

    return { error };
  } catch (error) {
    return { error };
  }
}
