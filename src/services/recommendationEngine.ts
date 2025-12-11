/**
 * Recommendation Engine Service
 * Core algorithm for intelligent module recommendations based on contextual signals
 * Implements weighted scoring from trails (60%), moments (30%), and behavior (10%)
 *
 * @see docs/onboarding/MODULOS_RECOMENDACOES_LOGIC.md
 */

import {
  ModuleDefinition,
  RecommendationResult,
  ModuleRecommendation,
  ModuleScore,
  ExtractedSignals,
  TrailSignal,
  MomentSignal,
  BehaviorSignal,
  RecommendationAlgorithmConfig,
  ModulePrerequisite,
  RecommendationError,
} from '../types/recommendationTypes';
import { MODULE_CATALOG, getModuleById } from '../data/moduleDefinitions';
import { CONTEXTUAL_TRAILS } from '../data/contextualTrails';
import { StoredContextCapture } from '../types/onboardingTypes';

/**
 * Default algorithm configuration
 */
const DEFAULT_CONFIG: RecommendationAlgorithmConfig = {
  trailWeight: 0.6,
  momentWeight: 0.3,
  behaviorWeight: 0.1,
  maxRecommendations: 6,
  minConfidenceScore: 0.3,
  cacheEnabled: true,
  cacheTTL: 7 * 24 * 60 * 60, // 7 days
  forceRefreshIfOlderThan: 14 * 24 * 60 * 60, // 14 days
  acceptanceFeedbackBoost: 5,
  rejectionFeedbackPenalty: -3,
  completionFeedbackBoost: 10,
  excludeAlreadyCompleted: true,
  excludePreviouslyRejected: true,
  penalizeRejectedScore: 0.4,
  enableSerendipity: false,
  serendipityProbability: 0.15,
};

/**
 * Main Recommendation Engine
 * Generates personalized module recommendations based on user context
 */
export class RecommendationEngine {
  private config: RecommendationAlgorithmConfig;
  private logger = {
    log: (msg: string, data?: any) => console.log(`[RecommendationEngine] ${msg}`, data),
    error: (msg: string, error?: any) => console.error(`[RecommendationEngine] ${msg}`, error),
    debug: (msg: string, data?: any) => {
      if (process.env.DEBUG_RECOMMENDATIONS) {
        console.debug(`[RecommendationEngine] ${msg}`, data);
      }
    },
  };

  constructor(config?: Partial<RecommendationAlgorithmConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger.log('Recommendation Engine initialized', this.config);
  }

  /**
   * Main entry point: Generate recommendations for a user
   * Orchestrates the complete recommendation flow
   */
  async generateRecommendations(
    userId: string,
    trailContexts: StoredContextCapture[],
    moments: any[] = [],
    completedModuleIds: string[] = [],
    userFeedback: Record<string, any> = {}
  ): Promise<RecommendationResult> {
    try {
      this.logger.log(`Generating recommendations for user: ${userId}`);
      const startTime = Date.now();

      // PHASE 1: Extract signals from inputs
      const signals = this.extractSignals(trailContexts, moments, userFeedback);
      this.logger.debug('Extracted signals', signals);

      // PHASE 2: Calculate behavior context
      const behavior = this.calculateBehaviorSignals(userId, moments);
      this.logger.debug('Behavior signals', behavior);

      // PHASE 3: Score all modules
      const moduleScores = this.scoreAllModules(signals, behavior, completedModuleIds);
      this.logger.debug('Module scores calculated', {
        totalModules: moduleScores.size,
        topScores: Array.from(moduleScores.entries())
          .sort((a, b) => b[1].score - a[1].score)
          .slice(0, 5),
      });

      // PHASE 4: Rank and select top modules
      const recommendations = this.rankAndSelectModules(moduleScores);
      this.logger.log(`Selected ${recommendations.length} top recommendations`);

      // PHASE 5: Optimize journey order
      const ordered = this.optimizeJourneyOrder(recommendations);
      this.logger.log('Journey order optimized');

      // PHASE 6: Build personalization summary
      const summary = this.buildPersonalizationSummary(ordered, signals);

      const result: RecommendationResult = {
        userId,
        recommendations: ordered,
        personalizationSummary: summary,
        algorithmMetadata: {
          trailWeight: this.config.trailWeight,
          momentWeight: this.config.momentWeight,
          behaviorWeight: this.config.behaviorWeight,
        },
        nextReviewDate: this.calculateNextReviewDate(),
        totalModulesEvaluated: moduleScores.size,
        generatedAt: new Date(),
      };

      const duration = Date.now() - startTime;
      this.logger.log(`Recommendations generated in ${duration}ms`, {
        count: result.recommendations.length,
        avgScore: (
          result.recommendations.reduce((sum, r) => sum + r.score, 0) /
          result.recommendations.length
        ).toFixed(2),
      });

      return result;
    } catch (error) {
      this.logger.error('Error generating recommendations', error);
      throw new RecommendationError(
        'RECOMMENDATION_GENERATION_FAILED',
        'Failed to generate recommendations',
        error
      );
    }
  }

  /**
   * PHASE 1: Extract signals from user input
   * Converts raw trail/moment data into scored signals
   */
  private extractSignals(
    trailContexts: StoredContextCapture[],
    moments: any[],
    userFeedback: Record<string, any>
  ): ExtractedSignals {
    // Extract trail signals
    const trailSignals = trailContexts.map(context => this.extractTrailSignal(context));

    // Extract moment signals
    const momentSignals = moments.map(m => this.extractMomentSignal(m)).filter(Boolean) as MomentSignal[];

    // Extract feedback history
    const previouslyAccepted = Object.entries(userFeedback)
      .filter(([_, feedback]: any) => feedback?.action === 'accepted')
      .map(([moduleId]) => moduleId);

    const previouslyRejected = Object.entries(userFeedback)
      .filter(([_, feedback]: any) => feedback?.action === 'rejected')
      .map(([moduleId]) => moduleId);

    const alreadyCompleted = Object.entries(userFeedback)
      .filter(([_, feedback]: any) => feedback?.action === 'completed')
      .map(([moduleId]) => moduleId);

    this.logger.debug('Signal extraction complete', {
      trails: trailSignals.length,
      moments: momentSignals.length,
      accepted: previouslyAccepted.length,
      rejected: previouslyRejected.length,
      completed: alreadyCompleted.length,
    });

    return {
      trails: trailSignals,
      moments: momentSignals,
      behavior: {} as BehaviorSignal, // Will be populated later
      previouslyAccepted,
      previouslyRejected,
      alreadyCompleted,
    };
  }

  /**
   * Extract signal from a single trail context capture
   */
  private extractTrailSignal(context: StoredContextCapture): TrailSignal {
    const trail = CONTEXTUAL_TRAILS[context.trail_id];
    if (!trail) {
      throw new RecommendationError('TRAIL_NOT_FOUND', `Trail ${context.trail_id} not found`);
    }

    const selectedAnswerIds = Object.values(context.responses || {}).reduce((acc: string[], resp: any) => {
      return [...acc, ...(resp.selectedAnswerIds || [])];
    }, []);

    // Calculate weights from selected answers
    const weights = selectedAnswerIds
      .map(answerId => {
        // Find the answer in trail questions
        for (const question of trail.questions) {
          const answer = question.answers.find(a => a.id === answerId);
          if (answer) return answer.weight;
        }
        return 0;
      })
      .filter(w => w > 0);

    const averageWeight = weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : 0;
    const trailScore = (averageWeight / 10) * 100; // Normalize to 0-100

    // Collect all trigger modules from selected answers
    const triggerModuleIds = new Set<string>();
    selectedAnswerIds.forEach(answerId => {
      for (const question of trail.questions) {
        const answer = question.answers.find(a => a.id === answerId);
        if (answer?.triggerModules) {
          answer.triggerModules.forEach(m => triggerModuleIds.add(m));
        }
      }
    });

    // Calculate signal strength (0-1) based on how many required questions were answered
    const answeredCount = Object.keys(context.responses || {}).length;
    const totalRequired = trail.questions.filter(q => q.isRequired).length;
    const strength = Math.min(1, answeredCount / (totalRequired || 1));

    return {
      trailId: context.trail_id,
      trailName: trail.name,
      strength,
      answeredQuestionsCount: answeredCount,
      trailScore,
      selectedAnswerIds,
      selectedAnswerWeights: weights,
      averageWeight,
      triggerModuleIds: Array.from(triggerModuleIds),
    };
  }

  /**
   * Extract signal from a single moment
   */
  private extractMomentSignal(moment: any): MomentSignal | null {
    if (!moment) return null;

    const sentiment = this.analyzeMomentSentiment(moment);
    const lifeAreas = this.extractLifeAreasFromMoment(moment);
    const keywordMatches = this.extractKeywordsFromMoment(moment);

    // Calculate urgency based on negative sentiment and specific keywords
    let urgency = Math.max(0, -sentiment); // Negative sentiment = more urgent
    if (keywordMatches.some(k => ['anxious', 'stress', 'crisis', 'urgent'].includes(k))) {
      urgency = Math.min(1, urgency + 0.3);
    }

    return {
      momentId: moment.id,
      timestamp: new Date(moment.created_at),
      emotion: moment.emotion,
      lifeAreas,
      sentiment,
      urgency,
      keywordMatches,
      pattern: `${lifeAreas.join(', ')} - ${this.getEmotionLabel(moment.emotion)}`,
    };
  }

  /**
   * PHASE 2: Calculate behavior signals
   */
  private calculateBehaviorSignals(userId: string, moments: any[]): BehaviorSignal {
    const totalMomentCount = moments.length;
    const recentMoments = moments.slice(0, 7); // Last 7 moments

    // Calculate streak
    let momentStreak = 0;
    let lastDate: Date | null = null;
    for (const moment of moments) {
      const momentDate = new Date(moment.created_at);
      if (lastDate === null) {
        lastDate = momentDate;
        momentStreak = 1;
      } else {
        const daysDiff = Math.floor((lastDate.getTime() - momentDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff === 1) {
          momentStreak++;
          lastDate = momentDate;
        } else {
          break;
        }
      }
    }

    // Calculate sentiment average
    const avgSentiment =
      recentMoments.length > 0
        ? recentMoments.reduce((sum, m) => sum + this.analyzeMomentSentiment(m), 0) / recentMoments.length
        : 0;

    // Calculate days since last activity
    const lastActivityDays =
      recentMoments.length > 0
        ? Math.floor((Date.now() - new Date(recentMoments[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

    // Engagement score (0-1)
    const engagementScore = Math.min(1, (totalMomentCount / 30) * (1 / (lastActivityDays + 1)));

    return {
      userId,
      momentStreak,
      totalMomentCount,
      averageMomentSentiment: avgSentiment,
      lastActivityDays,
      engagementScore,
      completedTrailCount: 0, // Will be set by caller
      averageTrailScore: 0, // Will be set by caller
    };
  }

  /**
   * PHASE 3: Score all modules
   */
  private scoreAllModules(
    signals: ExtractedSignals,
    behavior: BehaviorSignal,
    completedModuleIds: string[]
  ): Map<string, ModuleScore> {
    const scores = new Map<string, ModuleScore>();

    // Initialize all modules with score 0
    for (const module of MODULE_CATALOG) {
      scores.set(module.id, {
        moduleId: module.id,
        score: 0,
        reasons: [],
        trailMatches: [],
        momentMatches: [],
        complementaryBoosts: 0,
      });
    }

    // SCORE SOURCE 1: Trail Signals (60% weight)
    for (const trailSignal of signals.trails) {
      const trailWeight = this.config.trailWeight; // 0.6

      for (const moduleId of trailSignal.triggerModuleIds) {
        const module = getModuleById(moduleId);
        if (!module) continue;

        const current = scores.get(moduleId)!;
        const baseScore = module.priority; // 1-10

        // Calculate contribution: priority * trail strength * weights
        const contribution = baseScore * trailSignal.strength * trailWeight * 10;
        current.score += contribution;

        current.reasons.push(
          `Trilha ${trailSignal.trailName} recomenda este módulo (força: ${(trailSignal.strength * 100).toFixed(0)}%)`
        );
        current.trailMatches.push(trailSignal.trailId);
      }
    }

    // SCORE SOURCE 2: Moment Patterns (30% weight)
    for (const momentSignal of signals.moments) {
      const momentWeight = this.config.momentWeight; // 0.3

      // Find modules matching life areas
      for (const module of MODULE_CATALOG) {
        const hasMatchingArea = module.triggeringLifeAreas.some(area =>
          momentSignal.lifeAreas.includes(area)
        );

        if (hasMatchingArea) {
          const current = scores.get(module.id)!;
          const contribution = momentSignal.urgency * momentWeight * 10;
          current.score += contribution;

          current.reasons.push(
            `Padrão detectado em momentos recentes: ${momentSignal.pattern} (urgência: ${(momentSignal.urgency * 100).toFixed(0)}%)`
          );
          current.momentMatches.push(momentSignal.momentId);
        }
      }
    }

    // SCORE SOURCE 3: Behavior Signals (10% weight)
    const behaviorWeight = this.config.behaviorWeight; // 0.1

    // High engagement users get habit modules boosted
    if (behavior.engagementScore > 0.7) {
      const habitModule = getModuleById('habit_building');
      if (habitModule) {
        const current = scores.get('habit_building')!;
        current.score += 3 * behaviorWeight * 10;
        current.reasons.push('Você é um usuário muito engajado; hábitos ajudam a manter momentum');
      }
    }

    // High streak users get goal modules boosted
    if (behavior.momentStreak > 7) {
      const goalModule = getModuleById('goal_setting');
      if (goalModule) {
        const current = scores.get('goal_setting')!;
        current.score += 3 * behaviorWeight * 10;
        current.reasons.push('Seu streak de momentos sugere foco em objetivos pode ser valioso');
      }
    }

    // Negative sentiment suggests wellness modules
    if (behavior.averageMomentSentiment < -0.3) {
      const wellnessModules = ['meditation_basics', 'breathing_exercises', 'stress_management'];
      wellnessModules.forEach(moduleId => {
        const current = scores.get(moduleId)!;
        if (current) {
          current.score += 5 * behaviorWeight * 10;
          current.reasons.push('Seus momentos sugerem que o bem-estar seria benéfico agora');
        }
      });
    }

    // Apply complementary boosts
    this.applyComplementaryBoosts(scores);

    // Apply deduplication filters
    this.applyDeduplicationFilters(scores, signals, completedModuleIds);

    // Apply feedback penalties
    for (const rejectedModuleId of signals.previouslyRejected) {
      const current = scores.get(rejectedModuleId);
      if (current) {
        current.score *= this.config.penalizeRejectedScore;
        current.reasons.push('Você rejeitou este módulo anteriormente');
      }
    }

    return scores;
  }

  /**
   * Apply complementary module boosts
   */
  private applyComplementaryBoosts(scores: Map<string, ModuleScore>): void {
    // For each module, boost complementary ones
    for (const [moduleId, score] of scores) {
      if (score.score > 30) {
        // Only boost if this module has significant score
        const module = getModuleById(moduleId);
        if (module) {
          for (const complementaryId of module.complementaryModules) {
            const complementary = scores.get(complementaryId);
            if (complementary) {
              complementary.score += 5; // Small fixed boost
              complementary.complementaryBoosts += 1;
            }
          }
        }
      }
    }
  }

  /**
   * Apply deduplication filters
   */
  private applyDeduplicationFilters(
    scores: Map<string, ModuleScore>,
    signals: ExtractedSignals,
    completedModuleIds: string[]
  ): void {
    // Remove already completed modules
    if (this.config.excludeAlreadyCompleted) {
      for (const moduleId of [...completedModuleIds, ...signals.alreadyCompleted]) {
        scores.delete(moduleId);
      }
    }

    // Penalize (but don't remove) previously rejected modules
    if (this.config.excludePreviouslyRejected) {
      for (const moduleId of signals.previouslyRejected) {
        const score = scores.get(moduleId);
        if (score) {
          score.score *= this.config.penalizeRejectedScore;
        }
      }
    }
  }

  /**
   * PHASE 4: Rank and select top modules
   */
  private rankAndSelectModules(scores: Map<string, ModuleScore>): ModuleRecommendation[] {
    const ranked = Array.from(scores.entries())
      .filter(([_, score]) => score.score > 0 && score.score / 100 >= this.config.minConfidenceScore)
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, this.config.maxRecommendations);

    return ranked.map(([moduleId, score]) => this.buildRecommendation(moduleId, score));
  }

  /**
   * Build recommendation object from score
   */
  private buildRecommendation(moduleId: string, score: ModuleScore): ModuleRecommendation {
    const module = getModuleById(moduleId);
    if (!module) {
      throw new RecommendationError('MODULE_NOT_FOUND', `Module ${moduleId} not found`);
    }

    const finalScore = Math.min(100, score.score);
    const priority =
      finalScore >= 80 ? 'critical' : finalScore >= 60 ? 'high' : finalScore >= 40 ? 'medium' : 'low';

    // Check prerequisites
    const prerequisites = this.checkPrerequisites(module);

    return {
      moduleId: module.id,
      moduleName: module.name,
      description: module.description,
      score: Math.round(finalScore),
      confidence: finalScore / 100,
      priority,
      reason: score.reasons[0] || 'Recomendado para você',
      triggeringFactors: [
        ...score.trailMatches.map(trailId => {
          const trail = Object.values(CONTEXTUAL_TRAILS).find(t => t.id === trailId);
          return trail ? `${trail.name} (trilha)` : '';
        }),
        ...score.momentMatches.map(() => 'padrão em momentos recentes'),
      ].filter(Boolean),
      sourcesBreakdown: {
        trailWeight: score.trailMatches.length > 0 ? 0.6 : 0,
        momentWeight: score.momentMatches.length > 0 ? 0.3 : 0,
        behaviorWeight: score.complementaryBoosts > 0 ? 0.1 : 0,
      },
      suggestedStartDate: this.calculateSuggestedStartDate(priority),
      estimatedTimeToComplete: module.estimatedMinutes,
      complementaryModules: module.complementaryModules,
      prerequisites,
    };
  }

  /**
   * Check module prerequisites
   */
  private checkPrerequisites(module: ModuleDefinition): ModulePrerequisite[] {
    return module.prerequisites.map(prereqId => {
      const prereq = getModuleById(prereqId);
      if (!prereq) return { moduleId: prereqId, moduleName: 'Desconhecido', isMet: false, statusMessage: 'Módulo não encontrado' };

      return {
        moduleId: prereq.id,
        moduleName: prereq.name,
        isMet: false, // In real app, check user's completed modules
        statusMessage: `Complete "${prereq.name}" primeiro`,
      };
    });
  }

  /**
   * PHASE 5: Optimize journey order
   * Reorder modules for optimal learning flow
   */
  private optimizeJourneyOrder(recommendations: ModuleRecommendation[]): ModuleRecommendation[] {
    // Topological sort based on prerequisites
    const sorted: ModuleRecommendation[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (moduleId: string) => {
      if (visited.has(moduleId)) return;
      if (visiting.has(moduleId)) return; // Cycle detected, skip

      visiting.add(moduleId);

      const module = getModuleById(moduleId);
      if (module) {
        // Visit prerequisites first
        for (const prereqId of module.prerequisites) {
          const prereqInRecs = recommendations.find(r => r.moduleId === prereqId);
          if (prereqInRecs) {
            visit(prereqId);
          }
        }
      }

      visiting.delete(moduleId);
      visited.add(moduleId);

      const rec = recommendations.find(r => r.moduleId === moduleId);
      if (rec) {
        sorted.push(rec);
      }
    };

    // Visit all recommendations
    for (const rec of recommendations) {
      visit(rec.moduleId);
    }

    // If sort didn't include all (due to cycles), add remaining
    for (const rec of recommendations) {
      if (!sorted.find(r => r.moduleId === rec.moduleId)) {
        sorted.push(rec);
      }
    }

    return sorted;
  }

  /**
   * PHASE 6: Build personalization summary
   */
  private buildPersonalizationSummary(recommendations: ModuleRecommendation[], signals: ExtractedSignals): string {
    if (recommendations.length === 0) {
      return 'Nenhuma recomendação disponível no momento. Tente completar mais trilhas.';
    }

    const topModule = recommendations[0];
    const trailNames = signals.trails.map(t => t.trailName).join(' e ');
    const emotionContext = this.getEmotionContext(signals.moments);

    if (trailNames) {
      return `Com base em sua trilha de ${trailNames}${emotionContext}, recomendamos começar com "${topModule.moduleName}". Essa é a área onde você pode obter maior impacto rápido no seu crescimento pessoal.`;
    } else if (emotionContext) {
      return `Detectamos que você${emotionContext}. Recomendamos começar com "${topModule.moduleName}" para abordar isso.`;
    } else {
      return `Personalizamos sua jornada baseado em suas interações. Recomendamos começar com "${topModule.moduleName}".`;
    }
  }

  /**
   * Helper: Get emotion context from moments
   */
  private getEmotionContext(moments: MomentSignal[]): string {
    if (moments.length === 0) return '';

    const avgSentiment = moments.reduce((sum, m) => sum + m.sentiment, 0) / moments.length;

    if (avgSentiment < -0.5) {
      return ' está passando por um período desafiador';
    } else if (avgSentiment < -0.2) {
      return ' tem mencionado preocupações';
    } else if (avgSentiment > 0.5) {
      return ' está em um bom lugar emocionalmente';
    } else {
      return '';
    }
  }

  /**
   * Helper: Analyze moment sentiment
   */
  private analyzeMomentSentiment(moment: any): number {
    if (moment.sentiment_data?.score) {
      return moment.sentiment_data.score; // Already -1 to 1
    }

    // Simple fallback based on emotion
    const negativeEmotions = ['sad', 'anxious', 'angry', 'frustrated', 'disappointed', 'scared', 'overwhelmed'];
    const positiveEmotions = ['happy', 'grateful', 'inspired', 'excited', 'confident', 'loving'];

    if (positiveEmotions.includes(moment.emotion)) return 0.7;
    if (negativeEmotions.includes(moment.emotion)) return -0.7;
    return 0;
  }

  /**
   * Helper: Extract life areas from moment
   */
  private extractLifeAreasFromMoment(moment: any): string[] {
    const areas = new Set<string>();

    // From tags
    if (moment.tags) {
      moment.tags.forEach((tag: string) => {
        const normalized = tag.toLowerCase().replace('#', '');
        if (['work', 'health', 'relationships', 'finance', 'family'].includes(normalized)) {
          areas.add(normalized);
        }
      });
    }

    // From emotion (heuristic)
    const emotionAreas: Record<string, string[]> = {
      happy: ['personal-growth'],
      sad: ['relationships', 'personal-growth'],
      anxious: ['health', 'finance'],
      angry: ['relationships', 'work'],
      tired: ['health'],
      grateful: ['relationships', 'personal-growth'],
    };

    if (moment.emotion && emotionAreas[moment.emotion]) {
      emotionAreas[moment.emotion].forEach(area => areas.add(area));
    }

    return Array.from(areas);
  }

  /**
   * Helper: Extract keywords from moment
   */
  private extractKeywordsFromMoment(moment: any): string[] {
    const keywords = new Set<string>();

    if (moment.content) {
      const text = moment.content.toLowerCase();
      const keywordPatterns: Record<string, RegExp> = {
        anxious: /ansied|preocupa|stress/,
        sad: /triste|infeliz|depress/,
        happy: /feliz|alegre|alegria/,
        work: /trabalh|carrer|project|job/,
        health: /saúde|exercício|comida|dormir|sono|cansado/,
        finance: /dinheiro|dívida|gasto|orçam|financ/,
        relationships: /relacionamento|amigo|família|amor|parceiro/,
      };

      for (const [keyword, pattern] of Object.entries(keywordPatterns)) {
        if (pattern.test(text)) {
          keywords.add(keyword);
        }
      }
    }

    return Array.from(keywords);
  }

  /**
   * Helper: Get emotion label
   */
  private getEmotionLabel(emotion?: string): string {
    const labels: Record<string, string> = {
      happy: 'Felicidade',
      sad: 'Tristeza',
      anxious: 'Ansiedade',
      angry: 'Raiva',
      thoughtful: 'Pensamento Profundo',
      calm: 'Calma',
      grateful: 'Gratidão',
      tired: 'Cansaço',
      inspired: 'Inspiração',
      neutral: 'Neutro',
      excited: 'Empolgação',
      disappointed: 'Decepção',
      frustrated: 'Frustração',
      loving: 'Amor',
      scared: 'Medo',
      determined: 'Determinação',
      sleepy: 'Sono',
      overwhelmed: 'Sobrecarga',
      confident: 'Confiança',
      confused: 'Confusão',
    };

    return labels[emotion || ''] || 'Emoção';
  }

  /**
   * Calculate suggested start date based on priority
   */
  private calculateSuggestedStartDate(priority: string): Date {
    const now = new Date();

    switch (priority) {
      case 'critical':
        return now; // Start immediately
      case 'high':
        now.setDate(now.getDate() + 1);
        return now; // Tomorrow
      case 'medium':
        now.setDate(now.getDate() + 3);
        return now; // In 3 days
      case 'low':
        now.setDate(now.getDate() + 7);
        return now; // In a week
      default:
        return now;
    }
  }

  /**
   * Calculate next review date (7 days by default)
   */
  private calculateNextReviewDate(): Date {
    const next = new Date();
    next.setDate(next.getDate() + 7);
    return next;
  }

  /**
   * Record feedback and adjust future recommendations
   */
  async recordFeedback(
    userId: string,
    moduleId: string,
    action: 'accepted' | 'rejected' | 'completed',
    feedback?: string
  ): Promise<void> {
    this.logger.log(`Recording feedback for user ${userId} on module ${moduleId}: ${action}`);

    // Feedback would be stored in database for future learning
    // This is a hook for integration with a database service
    // Implementation would:
    // 1. Store feedback in module_feedback table
    // 2. Update learning weights based on action
    // 3. Track acceptance/rejection rates per module
  }
}

/**
 * Exported singleton instance
 */
let engineInstance: RecommendationEngine | null = null;

export function getRecommendationEngine(config?: Partial<RecommendationAlgorithmConfig>): RecommendationEngine {
  if (!engineInstance) {
    engineInstance = new RecommendationEngine(config);
  }
  return engineInstance;
}
