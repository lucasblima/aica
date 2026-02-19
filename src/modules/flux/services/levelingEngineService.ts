/**
 * Leveling Engine Service
 *
 * Rule-based athlete classification system with auto-progression logic
 */

import type {
  FlowAthleteProfile,
  AthleteLevel,
  LevelingRecommendation,
  Microcycle,
} from '../types/flow';
import { MicrocycleService } from './microcycleService';

export class LevelingEngineService {
  // ============================================================================
  // LEVEL DEFINITIONS
  // ============================================================================

  private static readonly LEVEL_THRESHOLDS = {
    iniciante_1: {
      min_consistency: 0,
      min_weekly_volume: 0, // minutes
      max_weekly_volume: 180, // 3 hours
      min_weeks_active: 0,
    },
    iniciante_2: {
      min_consistency: 50,
      min_weekly_volume: 120, // 2 hours
      max_weekly_volume: 300, // 5 hours
      min_weeks_active: 4,
    },
    iniciante_3: {
      min_consistency: 60,
      min_weekly_volume: 180, // 3 hours
      max_weekly_volume: 420, // 7 hours
      min_weeks_active: 8,
    },
    intermediario_1: {
      min_consistency: 70,
      min_weekly_volume: 240, // 4 hours
      max_weekly_volume: 540, // 9 hours
      min_weeks_active: 12,
    },
    intermediario_2: {
      min_consistency: 75,
      min_weekly_volume: 300, // 5 hours
      max_weekly_volume: 660, // 11 hours
      min_weeks_active: 20,
    },
    intermediario_3: {
      min_consistency: 80,
      min_weekly_volume: 360, // 6 hours
      max_weekly_volume: 780, // 13 hours
      min_weeks_active: 32,
    },
    avancado: {
      min_consistency: 85,
      min_weekly_volume: 480, // 8+ hours
      max_weekly_volume: Infinity,
      min_weeks_active: 48,
    },
  };

  private static readonly LEVEL_ORDER: AthleteLevel[] = [
    'iniciante_1',
    'iniciante_2',
    'iniciante_3',
    'intermediario_1',
    'intermediario_2',
    'intermediario_3',
    'avancado',
  ];

  // ============================================================================
  // LEVEL ANALYSIS
  // ============================================================================

  /**
   * Analyze athlete and recommend level based on metrics
   */
  static async analyzeAthleteLevel(
    profile: FlowAthleteProfile,
    microcycles?: Microcycle[]
  ): Promise<LevelingRecommendation> {
    // Calculate weeks active (from created_at)
    const createdDate = new Date(profile.created_at);
    const now = new Date();
    const weeksActive = Math.floor(
      (now.getTime() - createdDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );

    // Get current metrics
    const consistency = profile.consistency_rate || 0;
    const weeklyVolume = profile.weekly_volume_average || 0;

    // Calculate performance trend
    const performanceTrend = await this.calculatePerformanceTrend(
      profile.athlete_id,
      microcycles
    );

    // Determine recommended level
    const recommendedLevel = this.determineLevelFromMetrics(
      consistency,
      weeklyVolume,
      weeksActive
    );

    // Calculate confidence (0-100)
    const confidence = this.calculateConfidence(profile, weeksActive, performanceTrend);

    // Generate reasoning
    const reasoning = this.generateReasoning(
      profile.level,
      recommendedLevel,
      consistency,
      weeklyVolume,
      weeksActive,
      performanceTrend
    );

    return {
      athlete_id: profile.athlete_id,
      current_level: profile.level,
      recommended_level: recommendedLevel,
      confidence,
      reasoning,
      metrics: {
        consistency_rate: consistency,
        weekly_volume: weeklyVolume,
        performance_trend: performanceTrend,
      },
    };
  }

  /**
   * Determine level from metrics
   */
  private static determineLevelFromMetrics(
    consistency: number,
    weeklyVolume: number,
    weeksActive: number
  ): AthleteLevel {
    // Start from highest level and work down
    const reversedLevels = [...this.LEVEL_ORDER].reverse();

    for (const level of reversedLevels) {
      const thresholds = this.LEVEL_THRESHOLDS[level];

      if (
        consistency >= thresholds.min_consistency &&
        weeklyVolume >= thresholds.min_weekly_volume &&
        weeklyVolume <= thresholds.max_weekly_volume &&
        weeksActive >= thresholds.min_weeks_active
      ) {
        return level;
      }
    }

    return 'iniciante_1'; // Default fallback
  }

  /**
   * Calculate performance trend
   */
  private static async calculatePerformanceTrend(
    athleteId: string,
    microcycles?: Microcycle[]
  ): Promise<'improving' | 'stable' | 'declining'> {
    // If microcycles not provided, fetch them
    if (!microcycles) {
      const { data } = await MicrocycleService.getMicrocyclesByAthlete(athleteId);
      microcycles = data || [];
    }

    if (microcycles.length < 2) return 'stable';

    // Get last 3 completed microcycles
    const completedCycles = microcycles
      .filter((m) => m.status === 'completed' && m.actual_weekly_load)
      .slice(0, 3);

    if (completedCycles.length < 2) return 'stable';

    // Calculate average load completion rate for each cycle
    const loadRates = completedCycles.map((cycle) => {
      const targetTotal =
        cycle.target_weekly_load?.reduce((sum, val) => sum + val, 0) || 0;
      const actualTotal =
        cycle.actual_weekly_load?.reduce((sum, val) => sum + val, 0) || 0;

      return targetTotal > 0 ? (actualTotal / targetTotal) * 100 : 0;
    });

    // Compare most recent vs older
    const recentAvg = loadRates[0];
    const olderAvg = loadRates.slice(1).reduce((sum, val) => sum + val, 0) / (loadRates.length - 1);

    if (recentAvg > olderAvg + 10) return 'improving';
    if (recentAvg < olderAvg - 10) return 'declining';
    return 'stable';
  }

  /**
   * Calculate confidence score (0-100)
   */
  private static calculateConfidence(
    profile: FlowAthleteProfile,
    weeksActive: number,
    performanceTrend: 'improving' | 'stable' | 'declining'
  ): number {
    let confidence = 50; // Base confidence

    // Consistency factor (+30 max)
    if (profile.consistency_rate !== undefined) {
      confidence += (profile.consistency_rate / 100) * 30;
    }

    // Data availability factor (+20 max)
    if (weeksActive >= 12) confidence += 20;
    else if (weeksActive >= 4) confidence += 10;

    // Performance trend factor (+10 max)
    if (performanceTrend === 'improving') confidence += 10;
    else if (performanceTrend === 'declining') confidence -= 10;

    return Math.min(100, Math.max(0, Math.round(confidence)));
  }

  /**
   * Generate human-readable reasoning
   */
  private static generateReasoning(
    currentLevel: AthleteLevel,
    recommendedLevel: AthleteLevel,
    consistency: number,
    weeklyVolume: number,
    weeksActive: number,
    performanceTrend: 'improving' | 'stable' | 'declining'
  ): string {
    const currentIndex = this.LEVEL_ORDER.indexOf(currentLevel);
    const recommendedIndex = this.LEVEL_ORDER.indexOf(recommendedLevel);

    if (currentIndex === recommendedIndex) {
      return `Atleta está no nível adequado. Consistência de ${consistency}%, volume semanal de ${Math.round(weeklyVolume / 60)}h, desempenho ${performanceTrend === 'improving' ? 'melhorando' : performanceTrend === 'declining' ? 'em declínio' : 'estável'}.`;
    }

    if (recommendedIndex > currentIndex) {
      // Upgrade recommendation
      return `Recomenda-se PROGRESSÃO para ${recommendedLevel}. Atleta demonstra consistência de ${consistency}%, volume semanal de ${Math.round(weeklyVolume / 60)}h, e está ativo há ${weeksActive} semanas. Desempenho ${performanceTrend === 'improving' ? 'em evolução constante' : 'estável'}.`;
    }

    // Downgrade recommendation
    return `Recomenda-se REGRESSÃO para ${recommendedLevel}. Consistência atual de ${consistency}% abaixo do esperado para o nível, volume semanal de ${Math.round(weeklyVolume / 60)}h, desempenho ${performanceTrend === 'declining' ? 'em declínio' : 'instável'}. Ajustar carga pode melhorar adesão.`;
  }

  // ============================================================================
  // BATCH ANALYSIS
  // ============================================================================

  /**
   * Analyze multiple athletes and generate recommendations
   */
  static async batchAnalyzeAthletes(
    profiles: FlowAthleteProfile[]
  ): Promise<LevelingRecommendation[]> {
    const recommendations: LevelingRecommendation[] = [];

    for (const profile of profiles) {
      try {
        const recommendation = await this.analyzeAthleteLevel(profile);
        recommendations.push(recommendation);
      } catch (error) {
        console.error(
          `[LevelingEngine] Error analyzing athlete ${profile.athlete_id}:`,
          error
        );
      }
    }

    return recommendations;
  }

  /**
   * Get athletes needing level adjustment
   */
  static async getAthletesNeedingAdjustment(
    profiles: FlowAthleteProfile[],
    minConfidence: number = 70
  ): Promise<LevelingRecommendation[]> {
    const recommendations = await this.batchAnalyzeAthletes(profiles);

    return recommendations.filter(
      (rec) =>
        rec.current_level !== rec.recommended_level && rec.confidence >= minConfidence
    );
  }

  // ============================================================================
  // LEVEL INFO
  // ============================================================================

  /**
   * Get level display info
   */
  static getLevelInfo(level: AthleteLevel): {
    label: string;
    description: string;
    thresholds: typeof LevelingEngineService.LEVEL_THRESHOLDS[AthleteLevel];
  } {
    const labels: Record<AthleteLevel, string> = {
      iniciante_1: 'Iniciante I',
      iniciante_2: 'Iniciante II',
      iniciante_3: 'Iniciante III',
      intermediario_1: 'Intermediário I',
      intermediario_2: 'Intermediário II',
      intermediario_3: 'Intermediário III',
      avancado: 'Avançado',
    };

    const descriptions: Record<AthleteLevel, string> = {
      iniciante_1: '0-4 semanas de treino. Foco em consistência básica.',
      iniciante_2: '1-2 meses de treino. Construindo base aeróbica.',
      iniciante_3: '2-3 meses de treino. Incremento de volume gradual.',
      intermediario_1: '3-5 meses de treino. Introdução de intensidade estruturada.',
      intermediario_2: '5-8 meses de treino. Treinos polarizados e periodização.',
      intermediario_3: '8-12 meses de treino. Alto volume e intensidade controlada.',
      avancado: '12+ meses de treino. Periodização avançada e competição.',
    };

    return {
      label: labels[level],
      description: descriptions[level],
      thresholds: this.LEVEL_THRESHOLDS[level],
    };
  }
}
