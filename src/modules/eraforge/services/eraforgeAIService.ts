/**
 * EraForge AI Service
 *
 * Placeholder for Gemini Game Master integration.
 * Generates scenarios, advisor responses, and simulations.
 *
 * TODO: Create Edge Function for EraForge AI (gemini-eraforge)
 */

// import { GeminiClient } from '@/lib/gemini'; // Phase 2 (EF-003)
import { createNamespacedLogger } from '@/lib/logger';
import type {
  Era,
  AdvisorId,
  TurnScenario,
  SimulationEvent,
  WorldMember,
} from '../types/eraforge.types';

const log = createNamespacedLogger('EraforgeAIService');

export interface GenerateScenarioResult {
  scenario: TurnScenario;
}

export interface AdvisorResponseResult {
  text: string;
  hint: string;
}

export interface SimulationResult {
  events: SimulationEvent[];
  summary: string;
}

export class EraforgeAIService {
  // Pre-loaded for Phase 2 (EF-003) — will call gemini-eraforge Edge Function
  // private static client = GeminiClient.getInstance();

  /**
   * Generate a historical scenario for the current era and child stats.
   * TODO: Implement via gemini-eraforge Edge Function
   */
  static async generateScenario(
    worldName: string,
    era: Era,
    stats: Pick<WorldMember, 'knowledge' | 'cooperation' | 'courage'>
  ): Promise<{ data: GenerateScenarioResult | null; error: any }> {
    log.debug('generateScenario called (placeholder)', { worldName, era, stats });

    // TODO: Call Edge Function
    const placeholderScenario: TurnScenario = {
      title: `Aventura na ${era}`,
      description: 'Uma nova aventura aguarda... (placeholder)',
      location: 'Local historico',
      choices: [
        { id: '1', text: 'Explorar a area', consequence_hint: 'Pode encontrar algo util' },
        { id: '2', text: 'Falar com os moradores', consequence_hint: 'Pode aprender algo novo' },
        { id: '3', text: 'Construir algo', consequence_hint: 'Pode ajudar a comunidade' },
      ],
      historical_context: 'Contexto historico sera gerado pela IA.',
    };

    return {
      data: { scenario: placeholderScenario },
      error: null,
    };
  }

  /**
   * Get advisor response for the current scenario.
   * TODO: Implement via gemini-eraforge Edge Function
   */
  static async getAdvisorResponse(
    advisorId: AdvisorId,
    scenario: TurnScenario
  ): Promise<{ data: AdvisorResponseResult | null; error: any }> {
    log.debug('getAdvisorResponse called (placeholder)', { advisorId });

    // TODO: Call Edge Function
    return {
      data: {
        text: `O conselheiro ${advisorId} esta pensando... (placeholder)`,
        hint: 'Dica do conselheiro sera gerada pela IA.',
      },
      error: null,
    };
  }

  /**
   * Run a 14-day simulation for a world.
   * TODO: Implement via gemini-eraforge Edge Function
   */
  static async runSimulation(
    worldId: string
  ): Promise<{ data: SimulationResult | null; error: any }> {
    log.debug('runSimulation called (placeholder)', { worldId });

    // TODO: Call Edge Function
    return {
      data: {
        events: [
          {
            title: 'Evento de simulacao',
            description: 'A simulacao sera gerada pela IA.',
            era: 'stone_age',
            impact: 'neutral',
          },
        ],
        summary: 'Resumo da simulacao sera gerado pela IA.',
      },
      error: null,
    };
  }
}
