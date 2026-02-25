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
import type { SimulationResult } from '../services/eraforgeAIService';
import { useEraforgeVoiceHook } from '../hooks/useEraforgeVoice';
import { useEraforgeTurns } from '../hooks/useEraforgeTurns';
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
  WorldCreateInput,
  ChildProfileCreateInput,
  ParentalSettings,
  ParentalSettingsUpdateInput,
  SimulationEvent,
  StatsDelta,
} from '../types/eraforge.types';
import { getNextEra, ERA_CONFIG } from '../types/eraforge.types';

const log = createNamespacedLogger('EraForgeMainView');

const DEFAULT_TURNS = 5;

interface EraForgeMainViewProps {
  onExitToApp?: () => void;
}

export default function EraForgeMainView({ onExitToApp }: EraForgeMainViewProps = {}) {
  const { state, actions } = useEraforgeGame();
  const voice = useEraforgeVoiceHook();
  const turnsPersistence = useEraforgeTurns();

  // ------- NAV HANDLERS -------

  const handleExitToApp = useCallback(async () => {
    actions.endGame();
    onExitToApp?.();
  }, [actions, onExitToApp]);

  const handleGoParentDashboard = useCallback(() => {
    actions.goParentDashboard();
  }, [actions]);

  // Data loading state
  const [worlds, setWorlds] = useState<World[]>([]);
  const [childProfiles, setChildProfiles] = useState<ChildProfile[]>([]);
  const [parentalSettings, setParentalSettings] = useState<ParentalSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Game flow state
  const [selectedAdvisor, setSelectedAdvisor] = useState<AdvisorId | null>(null);
  const [advisorHint, setAdvisorHint] = useState<string | null>(null);
  const [consequence, setConsequence] = useState<TurnConsequences | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [simulationData, setSimulationData] = useState<SimulationResult | null>(null);

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
        const [worldsResult, childrenResult, settingsResult] = await Promise.all([
          EraforgeGameService.getWorlds(),
          EraforgeGameService.getChildProfiles(),
          EraforgeGameService.getParentalSettings(),
        ]);

        if (worldsResult.data) setWorlds(worldsResult.data);
        if (childrenResult.data) setChildProfiles(childrenResult.data);
        if (settingsResult.data) setParentalSettings(settingsResult.data);
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

      // Persist to DB (fire-and-forget, don't block UI)
      turnsPersistence.createTurn({
        world_id: state.currentWorld.id,
        child_id: state.currentChild.id,
        scenario: result.data.scenario,
      }).catch(err => log.warn('Failed to persist turn:', err));

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

    let result = await EraforgeGameService.getChildMember(state.currentWorld.id, child.id);

    // Auto-join world if no member record exists yet
    if (!result.data) {
      log.debug('No member record found, auto-joining world');
      const joinResult = await EraforgeGameService.joinWorld({
        world_id: state.currentWorld.id,
        child_id: child.id,
      });
      if (joinResult.data) {
        result = { data: joinResult.data, error: null };
      } else {
        log.error('Failed to join world:', joinResult.error);
        actions.setError('Erro ao entrar no mundo');
        return;
      }
    }

    gameStartedRef.current = false; // Reset so the effect can trigger
    actions.setChild(child, result.data!);
  }, [state.currentWorld, actions]);

  const handleCreateWorld = useCallback(async (input: WorldCreateInput) => {
    setIsCreating(true);
    try {
      const result = await EraforgeGameService.createWorld(input);
      if (result.data) {
        setWorlds(prev => [result.data!, ...prev]);
        actions.setWorld(result.data);
      } else {
        log.error('Failed to create world:', result.error);
        actions.setError('Erro ao criar mundo');
      }
    } catch (err) {
      log.error('Unexpected error creating world:', err);
      actions.setError('Erro inesperado ao criar mundo');
    } finally {
      setIsCreating(false);
    }
  }, [actions]);

  const handleCreateChild = useCallback(async (input: ChildProfileCreateInput) => {
    setIsCreating(true);
    try {
      const result = await EraforgeGameService.createChildProfile(input);
      if (result.data) {
        setChildProfiles(prev => [...prev, result.data!]);
      } else {
        log.error('Failed to create child profile:', result.error);
        actions.setError('Erro ao criar perfil do jogador');
      }
    } catch (err) {
      log.error('Unexpected error creating child profile:', err);
      actions.setError('Erro inesperado ao criar perfil');
    } finally {
      setIsCreating(false);
    }
  }, [actions]);

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

        // Persist decision to DB (fire-and-forget)
        if (turns.length > 0) {
          const currentTurnId = turns[turns.length - 1].id;
          turnsPersistence.submitDecision(currentTurnId, choiceId, consequences)
            .catch(err => log.warn('Failed to persist decision:', err));
        }

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

    const normalizeText = (text: string) =>
      text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    const normalizedTranscript = normalizeText(transcript);

    // Fuzzy match: find choice whose text has the most keyword overlap with the transcript
    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const choice of scenario.choices) {
      const choiceWords = normalizeText(choice.text).split(/\s+/);
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

  // ------- ERA PROGRESS (computed from turns) -------

  const totalEraProgressEarned = turns.reduce(
    (sum, t) => sum + (t.consequences?.era_progress_delta || 0),
    0,
  );

  const currentWorldProgress = state.currentWorld?.era_progress ?? 0;
  const projectedProgress = currentWorldProgress + totalEraProgressEarned;
  const willAdvanceEra = projectedProgress >= 100 && state.currentWorld
    ? getNextEra(state.currentWorld.current_era) !== null
    : false;
  const nextEra = state.currentWorld ? getNextEra(state.currentWorld.current_era) : null;
  const nextEraName = willAdvanceEra && nextEra ? ERA_CONFIG[nextEra].label : null;

  // ------- PERSIST GAME PROGRESS -------

  const persistGameProgress = useCallback(async (): Promise<{ advancedEra: boolean }> => {
    if (!state.currentWorld || !state.currentChild || !state.currentMember) {
      return { advancedEra: false };
    }

    const turnsPlayed = turns.length;
    const newTurnsToday = state.currentMember.turns_today + turnsPlayed;

    // Persist member turns_today
    try {
      const { error } = await supabaseUpdateMember(
        state.currentWorld.id,
        state.currentChild.id,
        newTurnsToday,
      );
      if (error) log.error('Failed to save turns_today:', error);
    } catch (err) {
      log.error('Error saving member progress:', err);
    }

    // Accumulate era progress on the world
    const eraProgressDelta = turns.reduce(
      (sum, t) => sum + (t.consequences?.era_progress_delta || 0),
      0,
    );

    if (eraProgressDelta > 0 || projectedProgress >= 100) {
      const newProgress = currentWorldProgress + eraProgressDelta;
      const shouldAdvance = newProgress >= 100 && nextEra !== null;

      const worldUpdate: { era_progress: number; current_era?: typeof nextEra } = {
        era_progress: shouldAdvance ? newProgress - 100 : newProgress,
      };
      if (shouldAdvance && nextEra) {
        worldUpdate.current_era = nextEra;
      }

      try {
        const { data, error } = await EraforgeGameService.updateWorld(
          state.currentWorld.id,
          worldUpdate,
        );
        if (error) {
          log.error('Failed to update world progress:', error);
        } else if (data) {
          // Update local worlds list with new data
          setWorlds(prev => prev.map(w => w.id === data.id ? data : w));
        }
      } catch (err) {
        log.error('Error updating world progress:', err);
      }

      return { advancedEra: shouldAdvance };
    }

    return { advancedEra: false };
  }, [state.currentWorld, state.currentChild, state.currentMember, turns, currentWorldProgress, projectedProgress, nextEra]);

  // ------- END GAME (go back to HOME) -------

  const handleEndGame = useCallback(async () => {
    await persistGameProgress();

    // Reset local state
    setSelectedAdvisor(null);
    setAdvisorHint(null);
    setConsequence(null);
    setTurns([]);
    gameStartedRef.current = false;

    actions.endGame();
  }, [persistGameProgress, actions]);

  // ------- PLAY AGAIN (same world, possibly new era) -------

  const handlePlayAgain = useCallback(async () => {
    await persistGameProgress();

    // Reload world to get updated era/progress
    if (state.currentWorld) {
      const { data: updatedWorld } = await EraforgeGameService.getWorld(state.currentWorld.id);
      if (updatedWorld) {
        setWorlds(prev => prev.map(w => w.id === updatedWorld.id ? updatedWorld : w));

        // Re-fetch member to get fresh stats
        if (state.currentChild) {
          const { data: updatedMember } = await EraforgeGameService.getChildMember(
            updatedWorld.id,
            state.currentChild.id,
          );

          // Reset local game state for new session
          setSelectedAdvisor(null);
          setAdvisorHint(null);
          setConsequence(null);
          setTurns([]);
          gameStartedRef.current = false;

          // Set fresh world + child → triggers auto-start effect
          actions.endGame(); // Reset to HOME first
          // Small delay to let the state settle, then re-select
          setTimeout(() => {
            actions.setWorld(updatedWorld);
            if (updatedMember && state.currentChild) {
              gameStartedRef.current = false;
              actions.setChild(state.currentChild, updatedMember);
            }
          }, 100);
          return;
        }
      }
    }

    // Fallback: just go home
    actions.endGame();
  }, [persistGameProgress, state.currentWorld, state.currentChild, actions]);

  // ------- SIMULATION HANDLER -------

  const handleStartSimulation = useCallback(async () => {
    if (!state.currentWorld || !state.currentMember) {
      log.error('Cannot start simulation: missing world or member');
      return;
    }

    setIsLoadingAI(true);
    try {
      const result = await EraforgeAIService.runSimulation(
        state.currentWorld.id,
        state.currentWorld.name,
        state.currentWorld.current_era,
        state.currentWorld.era_progress,
        {
          knowledge: state.currentMember.knowledge,
          cooperation: state.currentMember.cooperation,
          courage: state.currentMember.courage,
        },
      );

      if (result.data) {
        setSimulationData(result.data);
        actions.goSimulation();
      } else {
        log.error('Failed to run simulation:', result.error);
        actions.setError('Erro ao executar simulação');
      }
    } catch (err) {
      log.error('Unexpected error running simulation:', err);
      actions.setError('Erro inesperado na simulação');
    } finally {
      setIsLoadingAI(false);
    }
  }, [state.currentWorld, state.currentMember, actions]);

  // ------- PARENT DASHBOARD HANDLERS -------

  const handleVerifyPin = useCallback(async (pin: string): Promise<boolean> => {
    if (!parentalSettings?.pin_hash) {
      // No PIN set yet — any 4-digit entry is accepted (first-time setup)
      // Store the new PIN hash so subsequent entries are verified
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(pin);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        const result = await EraforgeGameService.upsertParentalSettings({ pin_hash: hashHex });
        if (result.data) setParentalSettings(result.data);
      } catch (err) {
        log.error('Failed to store PIN hash:', err);
      }
      return true;
    }

    // Hash the entered PIN and compare to stored hash
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(pin);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex === parentalSettings.pin_hash;
    } catch (err) {
      log.error('PIN verification error:', err);
      return false;
    }
  }, [parentalSettings]);

  const handleUpdateSettings = useCallback(async (updates: Partial<ParentalSettingsUpdateInput>) => {
    try {
      const result = await EraforgeGameService.upsertParentalSettings(updates);
      if (result.data) {
        setParentalSettings(result.data);
      } else {
        log.error('Failed to update parental settings:', result.error);
        actions.setError('Erro ao salvar configurações');
      }
    } catch (err) {
      log.error('Unexpected error updating settings:', err);
      actions.setError('Erro inesperado ao salvar configurações');
    }
  }, [actions]);

  const handleAddChild = useCallback(async (input: ChildProfileCreateInput) => {
    const result = await EraforgeGameService.createChildProfile({
      ...input,
      consent_given_at: input.consent_given_at ?? new Date().toISOString(),
    });
    if (result.data) {
      setChildProfiles(prev => [...prev, result.data!]);
    } else {
      log.error('Failed to add child from dashboard:', result.error);
      actions.setError('Erro ao adicionar jogador');
    }
  }, [actions]);

  const handleEditChild = useCallback(async (id: string, input: { display_name?: string; avatar_emoji?: string; avatar_color?: string }) => {
    const result = await EraforgeGameService.updateChildProfile(id, input);
    if (result.data) {
      setChildProfiles(prev => prev.map(c => c.id === id ? result.data! : c));
    } else {
      log.error('Failed to edit child profile:', result.error);
      actions.setError('Erro ao editar perfil do jogador');
    }
  }, [actions]);

  // ------- RENDER -------

  switch (state.mode) {
    case 'HOME':
      return (
        <EF_HomeScreen
          worlds={worlds}
          children={childProfiles}
          selectedWorld={state.currentWorld}
          onSelectWorld={handleSelectWorld}
          onSelectChild={handleSelectChild}
          onCreateWorld={handleCreateWorld}
          onCreateChild={handleCreateChild}
          loading={loading}
          isCreating={isCreating}
          onBack={handleExitToApp}
          onParentDashboard={handleGoParentDashboard}
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
          onPlayAgain={handlePlayAgain}
          eraProgressEarned={totalEraProgressEarned}
          nextEraName={nextEraName}
          onStartListening={voice.listen}
          onStopSpeaking={voice.stopSpeaking}
          onSpeak={voice.speak}
          onSimulate={handleStartSimulation}
          worldName={state.currentWorld.name}
          eraLabel={ERA_CONFIG[state.currentWorld.current_era]?.label}
          onBack={handleEndGame}
        />
      );

    case 'SIMULATION': {
      const simStats = state.currentMember ? {
        knowledge: state.currentMember.knowledge,
        cooperation: state.currentMember.cooperation,
        courage: state.currentMember.courage,
      } : { knowledge: 50, cooperation: 50, courage: 50 };
      const simDelta = simulationData?.stats_delta ?? {};
      const simAfter = {
        knowledge: simStats.knowledge + (simDelta.knowledge ?? 0),
        cooperation: simStats.cooperation + (simDelta.cooperation ?? 0),
        courage: simStats.courage + (simDelta.courage ?? 0),
      };
      return (
        <EF_SimulationScreen
          events={simulationData?.events ?? []}
          summary={simulationData?.summary ?? ''}
          statsDelta={simDelta}
          statsBefore={simStats}
          statsAfter={simAfter}
          onBack={() => actions.goHome()}
          onSpeak={voice.speak}
          isSpeaking={voice.isSpeaking}
          onStopSpeaking={voice.stopSpeaking}
        />
      );
    }

    case 'PARENT_DASHBOARD':
      return (
        <EF_ParentDashboard
          children={childProfiles}
          settings={parentalSettings}
          onVerifyPin={handleVerifyPin}
          onUpdateSettings={handleUpdateSettings}
          onAddChild={handleAddChild}
          onEditChild={handleEditChild}
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
        last_turn_date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
      })
      .eq('world_id', worldId)
      .eq('child_id', childId);

    return { error };
  } catch (error) {
    return { error };
  }
}
