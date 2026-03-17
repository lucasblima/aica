/**
 * Flux Module - Mock Data
 *
 * Realistic mock data for testing and development.
 * Represents a coach with 312 athletes across multiple modalities.
 * Supports: swimming, running, cycling, and strength training.
 */

import type {
  Athlete,
  WorkoutBlock,
  Feedback,
  Alert,
  Exercise,
  AthleteWithMetrics,
  TrainingModality,
  AthleteLevel,
  AthleteStatus,
  AlertType,
  AlertSeverity,
} from './types';
import { TRAINING_MODALITIES } from './types';

// ============================================
// NAME GENERATION HELPERS
// ============================================

const FIRST_NAMES = [
  'Joao', 'Maria', 'Pedro', 'Ana', 'Lucas', 'Julia', 'Rafael', 'Camila',
  'Felipe', 'Beatriz', 'Gabriel', 'Larissa', 'Bruno', 'Fernanda', 'Diego',
  'Amanda', 'Thiago', 'Isabela', 'Rodrigo', 'Patricia', 'Matheus', 'Carolina',
  'Gustavo', 'Mariana', 'Leonardo', 'Natalia', 'Eduardo', 'Bruna', 'Marcos',
  'Renata', 'Vinicius', 'Leticia', 'Daniel', 'Adriana', 'Carlos', 'Juliana',
  'Andre', 'Priscila', 'Ricardo', 'Daniela', 'Fernando', 'Vanessa', 'Paulo',
  'Michele', 'Henrique', 'Raquel', 'Leandro', 'Aline', 'Marcelo', 'Cristina',
  'Alexandre', 'Monica', 'Fabio', 'Claudia', 'Roberto', 'Sandra', 'Sergio',
  'Luciana', 'Antonio', 'Simone', 'Luis', 'Tatiana', 'Jorge', 'Roberta',
];

const LAST_NAMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Ferreira', 'Costa', 'Almeida',
  'Pereira', 'Rodrigues', 'Martins', 'Nascimento', 'Araujo', 'Ribeiro', 'Gomes',
  'Barbosa', 'Carvalho', 'Rocha', 'Moreira', 'Mendes', 'Cardoso', 'Melo',
  'Dias', 'Castro', 'Nunes', 'Ramos', 'Monteiro', 'Andrade', 'Vieira', 'Campos',
  'Lopes', 'Freitas', 'Moura', 'Correia', 'Teixeira', 'Machado', 'Pinto',
  'Azevedo', 'Miranda', 'Farias', 'Soares', 'Cunha', 'Batista', 'Barros',
  'Reis', 'Sales', 'Medeiros', 'Nogueira', 'Peixoto', 'Cavalcanti',
];

const LEVELS: AthleteLevel[] = ['iniciante', 'intermediario', 'avancado'];

const STATUSES: AthleteStatus[] = ['active', 'paused', 'trial', 'churned'];
const STATUS_WEIGHTS = [70, 10, 15, 5]; // 70% active, etc.

// ============================================
// RANDOM HELPERS
// ============================================

function seededRandom(seed: number): () => number {
  return function () {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

const random = seededRandom(42); // Deterministic for consistent mock data

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(random() * arr.length)];
}

function pickWeighted<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function generatePhone(index: number): string {
  const base = 11900000000 + index;
  return `+55${base}`;
}

function generateDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

// ============================================
// GENERATE 312 ATHLETES
// ============================================

function generateAthletes(count: number): Athlete[] {
  const athletes: Athlete[] = [];
  const usedNames = new Set<string>();

  for (let i = 1; i <= count; i++) {
    let name: string;
    do {
      name = `${pickRandom(FIRST_NAMES)} ${pickRandom(LAST_NAMES)}`;
    } while (usedNames.has(name));
    usedNames.add(name);

    const status = pickWeighted(STATUSES, STATUS_WEIGHTS);
    const level = pickRandom(LEVELS);
    const modality = pickRandom(TRAINING_MODALITIES);
    const createdDaysAgo = Math.floor(random() * 365) + 30;
    const updatedDaysAgo = Math.floor(random() * 7);

    // Generate performance thresholds based on modality (~40% of athletes)
    const hasThresholdData = random() > 0.6;
    let ftp: number | undefined;
    let pace_threshold: string | undefined;
    let swim_css: string | undefined;
    let last_performance_test: string | undefined;

    if (hasThresholdData) {
      const testDaysAgo = Math.floor(random() * 60) + 7; // Last test 7-67 days ago
      last_performance_test = generateDate(testDaysAgo);

      if (modality === 'cycling') {
        // FTP: 150-350W (varies by level)
        const baseFtp = level === 'avancado' ? 300 : level === 'intermediario' ? 250 : 200;
        ftp = Math.floor(baseFtp + (random() - 0.5) * 100);
      } else if (modality === 'running') {
        // Pace: 4:00-6:30/km (faster for advanced)
        const basePaceSeconds = level === 'avancado' ? 240 : level === 'intermediario' ? 300 : 360;
        const paceSeconds = Math.floor(basePaceSeconds + (random() - 0.5) * 60);
        const minutes = Math.floor(paceSeconds / 60);
        const seconds = paceSeconds % 60;
        pace_threshold = `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
      } else if (modality === 'swimming') {
        // CSS: 1:20-2:10/100m (faster for advanced)
        const baseCssSeconds = level === 'avancado' ? 85 : level === 'intermediario' ? 105 : 120;
        const cssSeconds = Math.floor(baseCssSeconds + (random() - 0.5) * 20);
        const minutes = Math.floor(cssSeconds / 60);
        const seconds = cssSeconds % 60;
        swim_css = `${minutes}:${seconds.toString().padStart(2, '0')}/100m`;
      }
    }

    athletes.push({
      id: `athlete-${i}`,
      user_id: 'coach-1',
      name,
      email: `${name.toLowerCase().replace(' ', '.')}@email.com`,
      phone: generatePhone(i),
      level,
      status,
      modality,
      trial_expires_at: status === 'trial' ? generateDate(-14) : undefined,
      anamnesis: {
        injuries: random() > 0.8 ? ['Lesao antiga'] : [],
        chronic_pain: random() > 0.85 ? ['Dor cronica leve'] : [],
        sleep_quality: pickRandom(['poor', 'fair', 'good', 'excellent']),
        stress_level: pickRandom(['low', 'medium', 'high']),
      },
      ftp,
      pace_threshold,
      swim_css,
      last_performance_test,
      created_at: generateDate(createdDaysAgo),
      updated_at: generateDate(updatedDaysAgo),
    });
  }

  return athletes;
}

export const MOCK_ATHLETES: Athlete[] = generateAthletes(312);

// ============================================
// MOCK ATHLETES WITH METRICS
// ============================================

export const MOCK_ATHLETES_WITH_METRICS: AthleteWithMetrics[] = MOCK_ATHLETES.map((athlete) => {
  const isActive = athlete.status === 'active';
  const baseAdherence = isActive ? 75 : 40;
  const levelBonus = athlete.level === 'avancado' ? 15 : athlete.level === 'intermediario' ? 10 : 0;
  const consistency_rate = Math.min(95, baseAdherence + levelBonus + random() * 10);

  // ~5% of athletes have alerts
  const hasAlert = random() < 0.05;
  const active_alerts_count = hasAlert ? Math.floor(random() * 3) + 1 : 0;

  return {
    ...athlete,
    current_week: isActive ? Math.floor(random() * 12) + 1 : undefined,
    consistency_rate: Math.round(consistency_rate),
    active_alerts_count,
    last_feedback_at: isActive ? generateDate(Math.floor(random() * 3)) : undefined,
  };
});

// ============================================
// GENERATE ALERTS FOR ATHLETES WITH ISSUES
// ============================================

const ALERT_TYPES: AlertType[] = ['health', 'motivation', 'absence', 'documents', 'financial', 'custom'];
const ALERT_SEVERITIES: AlertSeverity[] = ['critical', 'high', 'medium', 'low'];
const SEVERITY_WEIGHTS = [10, 20, 40, 30]; // 10% critical, 20% high, etc.

const ALERT_MESSAGES: Record<AlertType, string[]> = {
  health: [
    'Senti dor forte no treino de hoje. Precisei parar.',
    'Estou com cansaco extremo, não dormi bem.',
    'Minha lesao antiga voltou a incomodar.',
    'Fiz exame medico e preciso descansar.',
  ],
  motivation: [
    'Não to conseguindo manter o ritmo. Desanimado.',
    'Estou pensando em desistir, não vejo resultados.',
    'Perdi a motivacao ultimamente.',
    'Muito dificil conciliar treino e trabalho.',
  ],
  absence: [
    'Faltei ao treino, tive imprevisto no trabalho.',
    'Não consegui ir treinar hoje.',
    'Perdi o treino da semana passada.',
    'Viagem de trabalho, fiquei sem treinar.',
  ],
  documents: [
    'Exame cardiologico pendente - vencido ha 30 dias.',
    'Atestado medico vencido - renovacao necessaria.',
    'Exame cardiologico pendente - nunca apresentado.',
    'Documentação incompleta para treino.',
  ],
  financial: [
    'Pagamento da mensalidade em atraso.',
    'Pendência financeira - 2 meses sem pagamento.',
    'Pagamento pendente para renovacao do plano.',
  ],
  custom: [
    'Preciso conversar sobre ajustes no treino.',
    'Mudanca de horário nos treinos.',
    'Ferias programadas, preciso pausar.',
  ],
  feedback_received: [
    'Atleta enviou feedback sobre o treino da semana.',
    'Novo feedback recebido aguardando revisão.',
    'Feedback positivo do atleta sobre evolucao.',
  ],
};

const CRITICAL_KEYWORDS: Record<AlertType, string[]> = {
  health: ['dor', 'parar', 'lesao', 'medico'],
  motivation: ['desistir', 'desanimado', 'dificil'],
  absence: ['faltei', 'perdi', 'não consegui'],
  documents: ['vencido', 'pendente', 'incompleta'],
  financial: ['atraso', 'pagamento', 'pendência'],
  custom: ['pausar', 'conversar'],
  feedback_received: ['feedback', 'evolucao', 'resultado'],
};

function generateAlerts(): Alert[] {
  const alerts: Alert[] = [];
  let alertId = 1;

  const athletesWithAlerts = MOCK_ATHLETES_WITH_METRICS.filter((a) => a.active_alerts_count && a.active_alerts_count > 0);

  for (const athlete of athletesWithAlerts) {
    const numAlerts = athlete.active_alerts_count || 1;

    for (let i = 0; i < numAlerts; i++) {
      const alertType = pickRandom(ALERT_TYPES);
      const severity = pickWeighted(ALERT_SEVERITIES, SEVERITY_WEIGHTS);
      const message = pickRandom(ALERT_MESSAGES[alertType]);
      const keywords = CRITICAL_KEYWORDS[alertType];
      const daysAgo = Math.floor(random() * 7);
      const acknowledged = random() > 0.6; // 40% unacknowledged

      alerts.push({
        id: `alert-${alertId++}`,
        user_id: 'coach-1',
        athlete_id: athlete.id,
        feedback_id: `feedback-${alertId}`,
        alert_type: alertType,
        severity,
        keywords_detected: keywords.slice(0, Math.floor(random() * 2) + 1),
        message_preview: message,
        acknowledged_at: acknowledged ? generateDate(daysAgo - 1) : undefined,
        created_at: generateDate(daysAgo),
      });
    }
  }

  return alerts;
}

const generatedAlerts = generateAlerts();

// ============================================
// PENDING MEDICAL EXAMS/CERTIFICATES (11 total)
// ============================================

const PENDING_EXAM_ALERTS: Alert[] = [
  {
    id: 'alert-exam-1',
    user_id: 'coach-1',
    athlete_id: 'athlete-5',
    feedback_id: 'system-check',
    alert_type: 'documents',
    severity: 'critical',
    keywords_detected: ['vencido', 'cardiologico'],
    message_preview: 'Exame cardiologico vencido ha 45 dias. Treino suspenso ate regularizacao.',
    created_at: generateDate(2),
  },
  {
    id: 'alert-exam-2',
    user_id: 'coach-1',
    athlete_id: 'athlete-12',
    feedback_id: 'system-check',
    alert_type: 'documents',
    severity: 'critical',
    keywords_detected: ['pendente', 'atestado'],
    message_preview: 'Atestado medico nunca apresentado. Documentação obrigatoria.',
    created_at: generateDate(3),
  },
  {
    id: 'alert-exam-3',
    user_id: 'coach-1',
    athlete_id: 'athlete-23',
    feedback_id: 'system-check',
    alert_type: 'documents',
    severity: 'critical',
    keywords_detected: ['vencido', 'cardiologico'],
    message_preview: 'Exame cardiologico vencido ha 60 dias. Regularizar urgente.',
    created_at: generateDate(1),
  },
  {
    id: 'alert-exam-4',
    user_id: 'coach-1',
    athlete_id: 'athlete-34',
    feedback_id: 'system-check',
    alert_type: 'documents',
    severity: 'high',
    keywords_detected: ['pendente', 'cardiologico'],
    message_preview: 'Exame cardiologico pendente - vence em 7 dias.',
    created_at: generateDate(4),
  },
  {
    id: 'alert-exam-5',
    user_id: 'coach-1',
    athlete_id: 'athlete-47',
    feedback_id: 'system-check',
    alert_type: 'documents',
    severity: 'high',
    keywords_detected: ['vencido', 'atestado'],
    message_preview: 'Atestado medico vencido ha 15 dias. Solicitar renovacao.',
    created_at: generateDate(5),
  },
  {
    id: 'alert-exam-6',
    user_id: 'coach-1',
    athlete_id: 'athlete-58',
    feedback_id: 'system-check',
    alert_type: 'documents',
    severity: 'high',
    keywords_detected: ['pendente', 'cardiologico'],
    message_preview: 'Exame cardiologico pendente - atleta novo sem documentação.',
    created_at: generateDate(2),
  },
  {
    id: 'alert-exam-7',
    user_id: 'coach-1',
    athlete_id: 'athlete-71',
    feedback_id: 'system-check',
    alert_type: 'documents',
    severity: 'medium',
    keywords_detected: ['pendente', 'atestado'],
    message_preview: 'Atestado medico vence em 15 dias. Lembrar atleta.',
    created_at: generateDate(6),
  },
  {
    id: 'alert-exam-8',
    user_id: 'coach-1',
    athlete_id: 'athlete-89',
    feedback_id: 'system-check',
    alert_type: 'documents',
    severity: 'medium',
    keywords_detected: ['pendente', 'cardiologico'],
    message_preview: 'Exame cardiologico vence em 20 dias. Agendar renovacao.',
    created_at: generateDate(3),
  },
  {
    id: 'alert-exam-9',
    user_id: 'coach-1',
    athlete_id: 'athlete-102',
    feedback_id: 'system-check',
    alert_type: 'documents',
    severity: 'medium',
    keywords_detected: ['incompleta', 'documentação'],
    message_preview: 'Documentação incompleta - falta exame cardiologico.',
    created_at: generateDate(7),
  },
  {
    id: 'alert-exam-10',
    user_id: 'coach-1',
    athlete_id: 'athlete-115',
    feedback_id: 'system-check',
    alert_type: 'documents',
    severity: 'low',
    keywords_detected: ['pendente', 'atestado'],
    message_preview: 'Atestado medico vence em 30 dias. Planejar renovacao.',
    created_at: generateDate(5),
  },
  {
    id: 'alert-exam-11',
    user_id: 'coach-1',
    athlete_id: 'athlete-128',
    feedback_id: 'system-check',
    alert_type: 'documents',
    severity: 'low',
    keywords_detected: ['pendente', 'cardiologico'],
    message_preview: 'Exame cardiologico vence em 25 dias. Lembrete preventivo.',
    created_at: generateDate(4),
  },
];

export const MOCK_ALERTS: Alert[] = [...generatedAlerts, ...PENDING_EXAM_ALERTS];

// ============================================
// MOCK WORKOUT BLOCKS (Sample - not all 312)
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
    progression_notes: 'Foco em volume e técnica',
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
// MOCK FEEDBACKS (Sample)
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
        'Focar em técnica de respiracao',
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
    level_range: ['iniciante', 'intermediario', 'avancado'],
    tags: ['aquecimento', 'livre'],
  },
  {
    id: 'exercise-2',
    user_id: 'coach-1',
    name: 'Serie Principal - Crawl',
    category: 'main',
    description: 'Serie principal em crawl com foco em técnica',
    default_sets: 8,
    default_reps: '100m',
    default_rest: '20s',
    level_range: ['intermediario', 'avancado'],
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
    level_range: ['avancado'],
    tags: ['velocidade', 'sprint'],
  },
  {
    id: 'exercise-4',
    user_id: 'coach-1',
    name: 'Corrida Leve',
    category: 'warmup',
    description: 'Trote leve para aquecimento',
    default_sets: 1,
    default_reps: '2km',
    default_rest: '0',
    level_range: ['iniciante', 'intermediario', 'avancado'],
    tags: ['aquecimento', 'corrida'],
  },
  {
    id: 'exercise-5',
    user_id: 'coach-1',
    name: 'Intervalado - Sprint',
    category: 'main',
    description: 'Tiros de 400m com recuperacao',
    default_sets: 6,
    default_reps: '400m',
    default_rest: '90s',
    level_range: ['intermediario', 'avancado'],
    tags: ['intervalado', 'corrida'],
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

/**
 * Get athletes by modality
 */
export function getMockAthletesByModality(modality: TrainingModality): Athlete[] {
  return MOCK_ATHLETES.filter((a) => a.modality === modality);
}

/**
 * Get athlete counts by modality
 */
export function getMockAthleteCountsByModality(): Record<TrainingModality, number> {
  const counts: Record<TrainingModality, number> = {
    swimming: 0,
    running: 0,
    cycling: 0,
    strength: 0,
    walking: 0,
  };

  for (const athlete of MOCK_ATHLETES) {
    counts[athlete.modality]++;
  }

  return counts;
}

/**
 * Get alerts summary by severity
 */
export function getMockAlertsSummary(): Record<AlertSeverity, number> {
  const unacknowledged = getMockUnacknowledgedAlerts();
  const summary: Record<AlertSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  for (const alert of unacknowledged) {
    summary[alert.severity]++;
  }

  return summary;
}
