/**
 * EraForgeMainView - Main orchestrator view for EraForge module
 *
 * Routes between screens based on game mode from EraforgeGameContext.
 * Similar to Studio's StudioMainView pattern.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useEraforgeGame } from '../contexts/EraforgeGameContext';
import { EraforgeGameService } from '../services/eraforgeGameService';
import { EF_HomeScreen } from '../components/EF_HomeScreen';
import { EF_GameScreen } from '../components/EF_GameScreen';
import { EF_SimulationScreen } from '../components/EF_SimulationScreen';
import { EF_ParentDashboard } from '../components/EF_ParentDashboard';
import { createNamespacedLogger } from '@/lib/logger';
import type { World, ChildProfile, AdvisorId } from '../types/eraforge.types';

const log = createNamespacedLogger('EraForgeMainView');

export default function EraForgeMainView() {
  const { state, actions } = useEraforgeGame();
  const [worlds, setWorlds] = useState<World[]>([]);
  const [childProfiles, setChildProfiles] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleSelectWorld = useCallback((world: World) => {
    actions.setWorld(world);
  }, [actions]);

  const handleSelectChild = useCallback((child: ChildProfile) => {
    if (!state.currentWorld) return;
    // Load member data for this child in the current world
    EraforgeGameService.getChildMember(state.currentWorld.id, child.id).then(result => {
      if (result.data) {
        actions.setChild(child, result.data);
      }
    });
  }, [state.currentWorld, actions]);

  const handleCreateWorld = useCallback(() => {
    // TODO: Show world creation modal
    log.debug('Create world requested');
  }, []);

  const handleSelectChoice = useCallback((_choiceId: string) => {
    actions.decrementTurn();
    // TODO: Submit choice and get consequences from AI
  }, [actions]);

  const handleSelectAdvisor = useCallback((_advisorId: AdvisorId) => {
    // TODO: Get advisor response from AI
  }, []);

  const handleEndGame = useCallback(() => {
    actions.endGame();
  }, [actions]);

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
          onSelectChoice={handleSelectChoice}
          onSelectAdvisor={handleSelectAdvisor}
          onEndGame={handleEndGame}
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
