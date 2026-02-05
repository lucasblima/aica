/**
 * Flux Module - Mock Data
 *
 * Realistic mock data for testing and development.
 * Represents a typical coach with 8 athletes at various levels.
 */

import type {
  Athlete,
  WorkoutBlock,
  Feedback,
  Alert,
  Exercise,
  AthleteWithMetrics,
} from './types';

// ============================================
// MOCK ATHLETES
// ============================================

export const MOCK_ATHLETES: Athlete[] = [
  {
    id: 'athlete-1',
    user_id: 'coach-1',
    name: 'Joao Silva',
    email: 'joao.silva@email.com',
    phone: '+5511987654321',
    level: 'intermediario_2',
    status: 'active',
    anamnesis: {
      injuries: [],
      chronic_pain: [],
      sleep_quality: 'good',
      stress_level: 'medium',
    },
    created_at: '2025-11-01T10:00:00Z',
    updated_at: '2026-02-01T08:30:00Z',
  },
  {
    id: 'athlete-2',
    user_id: 'coach-1',
    name: 'Maria Santos',
    email: 'maria.santos@email.com',
    phone: '+5511987654322',
    level: 'iniciante_2',
    status: 'active',
    anamnesis: {
      injuries: ['Tendinite ombro direito (2024)'],
      chronic_pain: [],
      sleep_quality: 'fair',
      stress_level: 'high',
    },
    created_at: '2025-12-15T14:00:00Z',
    updated_at: '2026-02-04T19:00:00Z',
  },
  {
    id: 'athlete-3',
    user_id: 'coach-1',
    name: 'Pedro Oliveira',
    email: 'pedro.oliveira@email.com',
    phone: '+5511987654323',
    level: 'avancado',
    status: 'active',
    anamnesis: {
      injuries: [],
      chronic_pain: [],
      sleep_quality: 'excellent',
      stress_level: 'low',
    },
    created_at: '2025-08-10T09:00:00Z',
    updated_at: '2026-02-05T07:15:00Z',
  },
  {
    id: 'athlete-4',
    user_id: 'coach-1',
    name: 'Ana Costa',
    email: 'ana.costa@email.com',
    phone: '+5511987654324',
    level: 'intermediario_1',
    status: 'active',
    anamnesis: {
      injuries: [],
      chronic_pain: ['Dor lombar leve'],
      sleep_quality: 'good',
      stress_level: 'medium',
    },
    created_at: '2025-10-20T11:30:00Z',
    updated_at: '2026-02-03T16:45:00Z',
  },
  {
    id: 'athlete-5',
    user_id: 'coach-1',
    name: 'Lucas Ferreira',
    email: 'lucas.ferreira@email.com',
    phone: '+5511987654325',
    level: 'iniciante_1',
    status: 'trial',
    trial_expires_at: '2026-02-15T23:59:59Z',
    anamnesis: {
      injuries: [],
      chronic_pain: [],
      sleep_quality: 'fair',
      stress_level: 'low',
    },
    created_at: '2026-02-01T10:00:00Z',
    updated_at: '2026-02-05T08:00:00Z',
  },
  {
    id: 'athlete-6',
    user_id: 'coach-1',
    name: 'Carla Mendes',
    email: 'carla.mendes@email.com',
    phone: '+5511987654326',
    level: 'intermediario_3',
    status: 'paused',
    anamnesis: {
      injuries: ['Bursite no ombro'],
      chronic_pain: [],
      sleep_quality: 'poor',
      stress_level: 'high',
    },
    created_at: '2025-09-05T13:00:00Z',
    updated_at: '2026-01-28T10:00:00Z',
  },
  {
    id: 'athlete-7',
    user_id: 'coach-1',
    name: 'Rafael Almeida',
    email: 'rafael.almeida@email.com',
    phone: '+5511987654327',
    level: 'iniciante_3',
    status: 'active',
    anamnesis: {
      injuries: [],
      chronic_pain: [],
      sleep_quality: 'good',
      stress_level: 'low',
    },
    created_at: '2025-11-10T15:30:00Z',
    updated_at: '2026-02-04T18:20:00Z',
  },
  {
    id: 'athlete-8',
    user_id: 'coach-1',
    name: 'Juliana Rocha',
    email: 'juliana.rocha@email.com',
    phone: '+5511987654328',
    level: 'intermediario_2',
    status: 'active',
    anamnesis: {
      injuries: [],
      chronic_pain: [],
      sleep_quality: 'excellent',
      stress_level: 'low',
    },
    created_at: '2025-10-01T08:00:00Z',
    updated_at: '2026-02-05T09:30:00Z',
  },
];

// ============================================
// MOCK ATHLETES WITH METRICS
// ============================================

export const MOCK_ATHLETES_WITH_METRICS: AthleteWithMetrics[] = MOCK_ATHLETES.map((athlete) => {
  // Generate realistic metrics based on status and level
  const isActive = athlete.status === 'active';
  const baseAdherence = isActive ? 75 : 40;
  const levelBonus = athlete.level.includes('avancado') ? 15 : athlete.level.includes('intermediario') ? 10 : 0;
  const adherence_rate = Math.min(95, baseAdherence + levelBonus + Math.random() * 10);

  const active_alerts_count = athlete.id === 'athlete-2' ? 2 : athlete.id === 'athlete-6' ? 1 : 0;

  return {
    ...athlete,
    current_week: isActive ? Math.floor(Math.random() * 12) + 1 : undefined,
    adherence_rate: Math.round(adherence_rate),
    active_alerts_count,
    last_feedback_at: isActive ? '2026-02-04T20:00:00Z' : undefined,
  };
});

// ============================================
// MOCK WORKOUT BLOCKS
// ============================================

export const MOCK_WORKOUT_BLOCKS: WorkoutBlock[] = [
  {
    id: 'block-1',
    user_id: 'coach-1',
    athlete_id: 'athlete-1',
    title: 'Bloco 1 - Base Aerobica',
    start_date: '2026-01-06',
    end_date: '2026-03-30',
    status: 'active',
    canvas_data: {
      weeks: [
        {
          week_number: 1,
          days: [
            {
              day_of_week: 1,
              exercises: [
                {
                  id: 'ex-1',
                  name: 'Aquecimento - Livre',
                  category: 'warmup',
                  sets: 1,
                  reps: '400m',
                  rest: '0',
                  order: 0,
                },
                {
                  id: 'ex-2',
                  name: 'Serie Principal - Crawl',
                  category: 'main',
                  sets: 8,
                  reps: '100m',
                  rest: '20s',
                  order: 1,
                },
              ],
            },
          ],
        },
      ],
    },
    progression_notes: 'Foco em volume e tecnica',
    created_at: '2026-01-01T10:00:00Z',
  },
  {
    id: 'block-2',
    user_id: 'coach-1',
    athlete_id: 'athlete-3',
    title: 'Bloco 2 - Velocidade',
    start_date: '2026-01-13',
    end_date: '2026-04-06',
    status: 'active',
    canvas_data: {
      weeks: [
        {
          week_number: 1,
          days: [
            {
              day_of_week: 1,
              exercises: [
                {
                  id: 'ex-3',
                  name: 'Sprint - 50m',
                  category: 'main',
                  sets: 10,
                  reps: '50m',
                  rest: '60s',
                  notes: 'Maxima velocidade',
                  order: 0,
                },
              ],
            },
          ],
        },
      ],
    },
    created_at: '2026-01-10T14:00:00Z',
  },
];

// ============================================
// MOCK FEEDBACKS
// ============================================

export const MOCK_FEEDBACKS: Feedback[] = [
  {
    id: 'feedback-1',
    athlete_id: 'athlete-2',
    weekly_plan_id: 'plan-1',
    completed_workout: false,
    volume_pct: 60,
    intensity_pct: 70,
    raw_message: 'Fiz so 60% do treino. Senti dor no ombro direito durante os 100m crawl. Precisei parar.',
    parsed_data: {
      completed: 0.6,
      pain_reported: true,
      location: 'ombro direito',
    },
    sentiment_score: -0.4,
    has_critical_keywords: true,
    critical_keywords: ['dor', 'parar'],
    ia_analysis: {
      summary: 'Atleta relatou dor no ombro durante crawl. Reducao de volume necessaria.',
      recommendations: [
        'Reduzir volume em 30%',
        'Focar em tecnica de respiracao',
        'Avaliar necessidade de fisioterapia',
      ],
      suggested_adjustments: {
        volume: -30,
        intensity: -20,
      },
      confidence_score: 0.85,
    },
    created_at: '2026-02-03T20:15:00Z',
  },
  {
    id: 'feedback-2',
    athlete_id: 'athlete-1',
    weekly_plan_id: 'plan-2',
    completed_workout: true,
    volume_pct: 100,
    intensity_pct: 95,
    raw_message: 'Treino completo! Me senti muito bem hoje, consegui manter o ritmo ate o final.',
    parsed_data: {
      completed: 1.0,
      positive_sentiment: true,
    },
    sentiment_score: 0.8,
    has_critical_keywords: false,
    critical_keywords: [],
    ia_analysis: {
      summary: 'Excelente desempenho. Atleta demonstra evolucao positiva.',
      recommendations: [
        'Manter progressao atual',
        'Considerar aumento gradual de intensidade',
      ],
      confidence_score: 0.9,
    },
    created_at: '2026-02-04T19:30:00Z',
  },
  {
    id: 'feedback-3',
    athlete_id: 'athlete-6',
    weekly_plan_id: 'plan-3',
    completed_workout: false,
    volume_pct: 0,
    intensity_pct: 0,
    raw_message: 'Nao consegui ir treinar. To muito desanimada, nao to vendo resultado. Acho que vou desistir.',
    parsed_data: {
      completed: 0,
      absence: true,
      motivational_issue: true,
    },
    sentiment_score: -0.7,
    has_critical_keywords: true,
    critical_keywords: ['desanimada', 'desistir', 'nao consegui'],
    ia_analysis: {
      summary: 'Alerta de motivacao critica. Risco de churn alto.',
      recommendations: [
        'Agendar conversa individual urgente',
        'Revisar objetivos e expectativas',
        'Ajustar carga de treino',
      ],
      confidence_score: 0.95,
    },
    created_at: '2026-01-28T18:00:00Z',
  },
];

// ============================================
// MOCK ALERTS
// ============================================

export const MOCK_ALERTS: Alert[] = [
  {
    id: 'alert-1',
    user_id: 'coach-1',
    athlete_id: 'athlete-2',
    feedback_id: 'feedback-1',
    alert_type: 'health',
    severity: 'critical',
    keywords_detected: ['dor', 'parar'],
    message_preview: 'Fiz so 60% do treino. Senti dor no ombro direito durante os 100m crawl...',
    created_at: '2026-02-03T20:15:05Z',
  },
  {
    id: 'alert-2',
    user_id: 'coach-1',
    athlete_id: 'athlete-6',
    feedback_id: 'feedback-3',
    alert_type: 'motivation',
    severity: 'critical',
    keywords_detected: ['desanimada', 'desistir', 'nao consegui'],
    message_preview: 'Nao consegui ir treinar. To muito desanimada, nao to vendo resultado...',
    created_at: '2026-01-28T18:00:05Z',
  },
  {
    id: 'alert-3',
    user_id: 'coach-1',
    athlete_id: 'athlete-5',
    feedback_id: 'feedback-4',
    alert_type: 'absence',
    severity: 'medium',
    keywords_detected: ['faltei'],
    message_preview: 'Faltei ao treino hoje, tive um imprevisto no trabalho.',
    acknowledged_at: '2026-02-05T09:00:00Z',
    created_at: '2026-02-04T21:30:00Z',
  },
  {
    id: 'alert-4',
    user_id: 'coach-1',
    athlete_id: 'athlete-2',
    feedback_id: 'feedback-5',
    alert_type: 'health',
    severity: 'high',
    keywords_detected: ['cansaco extremo'],
    message_preview: 'Terminei o treino mas to com cansaco extremo. Nao dormi bem essa semana.',
    created_at: '2026-02-05T20:00:00Z',
  },
];

// ============================================
// MOCK EXERCISE LIBRARY
// ============================================

export const MOCK_EXERCISES: Exercise[] = [
  {
    id: 'exercise-1',
    user_id: 'coach-1',
    name: 'Aquecimento - Livre',
    category: 'warmup',
    description: 'Nado livre leve para aquecimento',
    default_sets: 1,
    default_reps: '400m',
    default_rest: '0',
    level_range: ['iniciante_1', 'iniciante_2', 'iniciante_3', 'intermediario_1', 'intermediario_2', 'intermediario_3', 'avancado'],
    tags: ['aquecimento', 'livre'],
  },
  {
    id: 'exercise-2',
    user_id: 'coach-1',
    name: 'Serie Principal - Crawl',
    category: 'main',
    description: 'Serie principal em crawl com foco em tecnica',
    default_sets: 8,
    default_reps: '100m',
    default_rest: '20s',
    level_range: ['intermediario_1', 'intermediario_2', 'intermediario_3', 'avancado'],
    tags: ['crawl', 'aerobico'],
  },
  {
    id: 'exercise-3',
    user_id: 'coach-1',
    name: 'Sprint 50m',
    category: 'main',
    description: 'Tiros de velocidade maxima',
    default_sets: 10,
    default_reps: '50m',
    default_rest: '60s',
    level_range: ['intermediario_3', 'avancado'],
    tags: ['velocidade', 'sprint'],
  },
  {
    id: 'exercise-4',
    user_id: 'coach-1',
    name: 'Pernada - Prancha',
    category: 'technique',
    description: 'Treino de pernada com prancha',
    default_sets: 4,
    default_reps: '100m',
    default_rest: '30s',
    level_range: ['iniciante_1', 'iniciante_2', 'iniciante_3'],
    tags: ['tecnica', 'pernada'],
  },
  {
    id: 'exercise-5',
    user_id: 'coach-1',
    name: 'Desaquecimento - Costas',
    category: 'cooldown',
    description: 'Nado costas leve para recuperacao',
    default_sets: 1,
    default_reps: '200m',
    default_rest: '0',
    level_range: ['iniciante_1', 'iniciante_2', 'iniciante_3', 'intermediario_1', 'intermediario_2', 'intermediario_3', 'avancado'],
    tags: ['desaquecimento', 'costas'],
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get athlete by ID
 */
export function getMockAthleteById(id: string): Athlete | undefined {
  return MOCK_ATHLETES.find((a) => a.id === id);
}

/**
 * Get athlete with metrics by ID
 */
export function getMockAthleteWithMetricsById(id: string): AthleteWithMetrics | undefined {
  return MOCK_ATHLETES_WITH_METRICS.find((a) => a.id === id);
}

/**
 * Get alerts for athlete
 */
export function getMockAlertsForAthlete(athleteId: string, unacknowledgedOnly = false): Alert[] {
  return MOCK_ALERTS.filter((alert) => {
    const matchesAthlete = alert.athlete_id === athleteId;
    const matchesAcknowledgement = !unacknowledgedOnly || !alert.acknowledged_at;
    return matchesAthlete && matchesAcknowledgement;
  });
}

/**
 * Get feedbacks for athlete
 */
export function getMockFeedbacksForAthlete(athleteId: string): Feedback[] {
  return MOCK_FEEDBACKS.filter((f) => f.athlete_id === athleteId);
}

/**
 * Get active block for athlete
 */
export function getMockActiveBlockForAthlete(athleteId: string): WorkoutBlock | undefined {
  return MOCK_WORKOUT_BLOCKS.find((b) => b.athlete_id === athleteId && b.status === 'active');
}

/**
 * Get all unacknowledged alerts
 */
export function getMockUnacknowledgedAlerts(): Alert[] {
  return MOCK_ALERTS.filter((alert) => !alert.acknowledged_at);
}

/**
 * Get alerts by severity
 */
export function getMockAlertsBySeverity(severity: Alert['severity']): Alert[] {
  return MOCK_ALERTS.filter((alert) => alert.severity === severity);
}
