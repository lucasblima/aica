/**
 * EraForge AI Service
 *
 * Calls the `eraforge-gamemaster` Edge Function for AI-powered game mastering.
 * Generates scenarios, processes decisions, and runs simulations via Gemini.
 *
 * @issue #314 (EF-003)
 */

import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type {
  Era,
  AdvisorId,
  TurnScenario,
  TurnConsequences,
  SimulationEvent,
  WorldMember,
  Turn,
  SocialMode,
} from '../types/eraforge.types';
import { ERA_CONFIG } from '../types/eraforge.types';

const log = createNamespacedLogger('EraforgeAIService');

export interface GenerateScenarioResult {
  scenario: TurnScenario;
}

export interface AdvisorResponseResult {
  text: string;
  hint: string;
}

export interface ProcessDecisionResult {
  consequences: TurnConsequences;
}

export interface SimulationResult {
  events: SimulationEvent[];
  summary: string;
  stats_delta?: {
    knowledge?: number;
    cooperation?: number;
    courage?: number;
    era_progress?: number;
  };
}

/**
 * Invoke the eraforge-gamemaster Edge Function.
 */
async function invokeGameMaster<T>(
  action: string,
  payload: Record<string, any>,
): Promise<{ data: T | null; error: any }> {
  try {
    const { data, error } = await supabase.functions.invoke('eraforge-gamemaster', {
      body: { action, payload },
    });

    if (error) {
      log.error(`Edge Function error (${action}):`, error);
      return { data: null, error };
    }

    if (!data?.success) {
      const msg = data?.error || 'Resposta inválida do Game Master';
      log.error(`Game Master error (${action}):`, msg);
      return { data: null, error: new Error(msg) };
    }

    return { data: data.data as T, error: null };
  } catch (err) {
    log.error(`invokeGameMaster failed (${action}):`, err);
    return { data: null, error: err };
  }
}

export class EraforgeAIService {
  /**
   * Generate a historical scenario for the current era and child stats.
   * Passes socialMode to the Edge Function so the AI varies the scenario type
   * based on the era's social interaction level.
   */
  static async generateScenario(
    worldName: string,
    era: Era,
    stats: Pick<WorldMember, 'knowledge' | 'cooperation' | 'courage'>,
    turnHistory?: Array<Pick<Turn, 'scenario' | 'decision'>>,
  ): Promise<{ data: GenerateScenarioResult | null; error: any }> {
    const socialMode: SocialMode = ERA_CONFIG[era].socialMode;
    log.debug('generateScenario', { worldName, era, stats, socialMode });

    const compactHistory = turnHistory?.slice(-5).map(t => ({
      title: t.scenario?.title,
      decision: t.decision,
    }));

    const result = await invokeGameMaster<TurnScenario>('generate_scenario', {
      era,
      worldName,
      socialMode,
      memberStats: {
        knowledge: stats.knowledge,
        cooperation: stats.cooperation,
        courage: stats.courage,
      },
      turnHistory: compactHistory,
    });

    if (result.error) {
      return { data: null, error: result.error };
    }

    return {
      data: { scenario: result.data! },
      error: null,
    };
  }

  /**
   * Get advisor response for the current scenario.
   * Extracts the advisor's hint from the scenario's advisor_hints map.
   */
  static async getAdvisorResponse(
    advisorId: AdvisorId,
    scenario: TurnScenario,
  ): Promise<{ data: AdvisorResponseResult | null; error: any }> {
    log.debug('getAdvisorResponse', { advisorId });

    // Advisor hints are embedded in the scenario by generate_scenario
    const hint = scenario.advisor_hints?.[advisorId] || '';

    if (hint) {
      return {
        data: {
          text: hint,
          hint,
        },
        error: null,
      };
    }

    // If no hint was pre-generated, return a generic response
    return {
      data: {
        text: 'Hmm, preciso pensar um pouco mais sobre isso...',
        hint: 'Tente explorar as opções com cuidado!',
      },
      error: null,
    };
  }

  /**
   * Process a child's decision and get consequences.
   */
  static async processDecision(
    scenario: TurnScenario,
    choiceId: string,
    advisorId: AdvisorId | null,
    era: Era,
    stats: Pick<WorldMember, 'knowledge' | 'cooperation' | 'courage'>,
  ): Promise<{ data: ProcessDecisionResult | null; error: any }> {
    log.debug('processDecision', { choiceId, advisorId, era });

    const result = await invokeGameMaster<TurnConsequences>('process_decision', {
      scenario: {
        title: scenario.title,
        description: scenario.description,
        location: scenario.location,
        choices: scenario.choices,
        historical_context: scenario.historical_context,
      },
      choiceId,
      advisorId: advisorId || undefined,
      era,
      memberStats: {
        knowledge: stats.knowledge,
        cooperation: stats.cooperation,
        courage: stats.courage,
      },
    });

    if (result.error) {
      return { data: null, error: result.error };
    }

    return {
      data: { consequences: result.data! },
      error: null,
    };
  }

  /**
   * Run a 14-day simulation for a world.
   */
  static async runSimulation(
    worldId: string,
    worldName: string,
    era: Era,
    eraProgress: number,
    stats: Pick<WorldMember, 'knowledge' | 'cooperation' | 'courage'>,
  ): Promise<{ data: SimulationResult | null; error: any }> {
    log.debug('runSimulation', { worldId, worldName, era });

    const result = await invokeGameMaster<SimulationResult>('run_simulation', {
      worldName,
      era,
      eraProgress,
      memberStats: {
        knowledge: stats.knowledge,
        cooperation: stats.cooperation,
        courage: stats.courage,
      },
    });

    if (result.error) {
      return { data: null, error: result.error };
    }

    return {
      data: result.data,
      error: null,
    };
  }
}
