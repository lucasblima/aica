/**
 * Flow Module - Mock Data
 *
 * Mock data for the intelligent prescription system (Flow module)
 * Includes workout templates, microcycles, slots, and athlete profiles.
 */

import type {
  WorkoutTemplate,
  Microcycle,
  WorkoutSlot,
  FlowAthleteProfile,
  WorkoutAutomation,
} from './types/flow';

// ============================================
// WORKOUT TEMPLATES (15 templates across modalities)
// ============================================

// Mock data uses legacy V1 exercise_structure shapes (sets, distance, intervals, etc.)
// which don't match the V2 ExerciseStructureV2 type (warmup, series, cooldown).
// Using type assertion since this is purely mock/demo data.
export const MOCK_WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  // SWIMMING TEMPLATES
  {
    id: 'template-swim-1',
    user_id: 'mock-coach-123',
    name: 'Técnica de Crawl - Iniciante',
    description: 'Trabalho de técnica focado em posição do corpo e respiração',
    category: 'technique',
    modality: 'swimming',
    duration: 45,
    intensity: 'low',
    exercise_structure: {
      sets: 8,
      reps: 100,
      rest: 15,
      description: '8x100m crawl com foco em técnica',
    } as any,
    css_percentage: 70,
    rpe: 5,
    tags: ['técnica', 'crawl', 'iniciante'],
    level: ['iniciante_1', 'iniciante_2'],
    is_public: false,
    is_favorite: true,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-02-01T15:30:00Z',
    usage_count: 24,
  },
  {
    id: 'template-swim-2',
    user_id: 'mock-coach-123',
    name: 'Resistência Aeróbica 3km',
    description: 'Nado contínuo para desenvolvimento de base aeróbica',
    category: 'main',
    modality: 'swimming',
    duration: 60,
    intensity: 'medium',
    exercise_structure: {
      distance: 3000,
      target_time: 3600,
      description: '3000m contínuo em ritmo aeróbico',
    } as any,
    css_percentage: 85,
    rpe: 6,
    tags: ['aeróbico', 'resistência', 'longo'],
    level: ['intermediario_1', 'intermediario_2', 'avancado'],
    is_public: true,
    is_favorite: false,
    created_at: '2026-01-20T08:00:00Z',
    updated_at: '2026-01-20T08:00:00Z',
    usage_count: 18,
  },
  {
    id: 'template-swim-3',
    user_id: 'mock-coach-123',
    name: 'Intervalado Limiar 20x50m',
    description: 'Série de 50m no limiar anaeróbico',
    category: 'main',
    modality: 'swimming',
    duration: 40,
    intensity: 'high',
    exercise_structure: {
      intervals: [
        { duration: 50, intensity: 95, rest: 10, repetitions: 20 },
      ],
      description: '20x50m @ 95% CSS com 10s rest',
    } as any,
    css_percentage: 95,
    rpe: 8,
    tags: ['limiar', 'intervalado', 'velocidade'],
    level: ['intermediario_3', 'avancado'],
    is_public: false,
    is_favorite: true,
    created_at: '2026-02-05T06:30:00Z',
    updated_at: '2026-02-10T12:00:00Z',
    usage_count: 12,
  },

  // RUNNING TEMPLATES
  {
    id: 'template-run-1',
    user_id: 'mock-coach-123',
    name: 'Long Run 90min Fácil',
    description: 'Corrida longa em ritmo confortável para base aeróbica',
    category: 'main',
    modality: 'running',
    duration: 90,
    intensity: 'low',
    exercise_structure: {
      distance: 16000,
      target_time: 5400,
      description: '16km em ritmo Z2 (conversação)',
    } as any,
    pace_zone: 'Z2',
    rpe: 5,
    tags: ['longo', 'aeróbico', 'base'],
    level: ['intermediario_1', 'intermediario_2', 'intermediario_3', 'avancado'],
    is_public: true,
    is_favorite: true,
    created_at: '2026-01-10T07:00:00Z',
    updated_at: '2026-02-01T09:00:00Z',
    usage_count: 32,
  },
  {
    id: 'template-run-2',
    user_id: 'mock-coach-123',
    name: 'Fartlek 40min',
    description: 'Treinamento com variações de ritmo intercaladas',
    category: 'main',
    modality: 'running',
    duration: 40,
    intensity: 'medium',
    exercise_structure: {
      description: 'Alternância: 3min rápido + 2min fácil x 8 repetições',
    } as any,
    pace_zone: 'Z3',
    rpe: 7,
    tags: ['fartlek', 'variado', 'ritmo'],
    level: ['intermediario_1', 'intermediario_2', 'intermediario_3'],
    is_public: false,
    is_favorite: false,
    created_at: '2026-01-25T10:00:00Z',
    updated_at: '2026-01-25T10:00:00Z',
    usage_count: 15,
  },
  {
    id: 'template-run-3',
    user_id: 'mock-coach-123',
    name: 'Intervalado 6x1km',
    description: 'Série de 1km no limiar com recuperação ativa',
    category: 'main',
    modality: 'running',
    duration: 50,
    intensity: 'high',
    exercise_structure: {
      intervals: [
        { duration: 1000, intensity: 95, rest: 90, repetitions: 6 },
      ],
      description: '6x1km @ ritmo limiar com 90s trote recuperação',
    } as any,
    pace_zone: 'Z4',
    rpe: 9,
    tags: ['limiar', 'intervalado', 'velocidade'],
    level: ['intermediario_3', 'avancado'],
    is_public: false,
    is_favorite: true,
    created_at: '2026-02-08T06:00:00Z',
    updated_at: '2026-02-11T08:30:00Z',
    usage_count: 9,
  },

  // CYCLING TEMPLATES
  {
    id: 'template-bike-1',
    user_id: 'mock-coach-123',
    name: 'Base Endurance 90min Z2',
    description: 'Pedal longo em zona aeróbica para construção de base',
    category: 'main',
    modality: 'cycling',
    duration: 90,
    intensity: 'low',
    exercise_structure: {
      distance: 40000,
      target_time: 5400,
      description: '40km em ritmo Z2 (65-75% FTP)',
    } as any,
    ftp_percentage: 70,
    rpe: 4,
    tags: ['base', 'aeróbico', 'endurance'],
    level: ['iniciante_3', 'intermediario_1', 'intermediario_2'],
    is_public: true,
    is_favorite: false,
    created_at: '2026-01-12T08:00:00Z',
    updated_at: '2026-01-12T08:00:00Z',
    usage_count: 28,
  },
  {
    id: 'template-bike-2',
    user_id: 'mock-coach-123',
    name: 'Sweet Spot 3x10min',
    description: 'Intervalos em sweet spot (88-93% FTP) para ganho de potência',
    category: 'main',
    modality: 'cycling',
    duration: 60,
    intensity: 'medium',
    exercise_structure: {
      intervals: [
        { duration: 600, intensity: 90, rest: 300, repetitions: 3 },
      ],
      description: '3x10min @ 90% FTP com 5min Z2 recuperação',
    } as any,
    ftp_percentage: 90,
    rpe: 7,
    tags: ['sweet spot', 'potência', 'intervalado'],
    level: ['intermediario_2', 'intermediario_3', 'avancado'],
    is_public: false,
    is_favorite: true,
    created_at: '2026-02-03T07:00:00Z',
    updated_at: '2026-02-10T11:00:00Z',
    usage_count: 14,
  },
  {
    id: 'template-bike-3',
    user_id: 'mock-coach-123',
    name: 'VO2 Max 5x5min',
    description: 'Série de 5min em zona VO2 Max (105-120% FTP)',
    category: 'main',
    modality: 'cycling',
    duration: 55,
    intensity: 'high',
    exercise_structure: {
      intervals: [
        { duration: 300, intensity: 110, rest: 300, repetitions: 5 },
      ],
      description: '5x5min @ 110% FTP com 5min Z1 recuperação',
    } as any,
    ftp_percentage: 110,
    rpe: 9,
    tags: ['VO2', 'intervalado', 'potência máxima'],
    level: ['intermediario_3', 'avancado'],
    is_public: false,
    is_favorite: false,
    created_at: '2026-02-06T09:00:00Z',
    updated_at: '2026-02-06T09:00:00Z',
    usage_count: 7,
  },

  // STRENGTH TEMPLATES
  {
    id: 'template-strength-1',
    user_id: 'mock-coach-123',
    name: 'Full Body Iniciante',
    description: 'Treino de corpo inteiro para iniciantes',
    category: 'main',
    modality: 'strength',
    duration: 45,
    intensity: 'low',
    exercise_structure: {
      sets: 3,
      reps: 12,
      rest: 60,
      description: '3x12 - Agachamento, Supino, Remada, Desenvolvimento',
      equipment: ['barra', 'anilhas', 'banco'],
    } as any,
    rpe: 6,
    tags: ['fullbody', 'iniciante', 'força'],
    level: ['iniciante_1', 'iniciante_2', 'iniciante_3'],
    is_public: true,
    is_favorite: true,
    created_at: '2026-01-18T10:00:00Z',
    updated_at: '2026-02-05T14:00:00Z',
    usage_count: 21,
  },
  {
    id: 'template-strength-2',
    user_id: 'mock-coach-123',
    name: 'Lower Body Power',
    description: 'Treino de membros inferiores com foco em potência',
    category: 'main',
    modality: 'strength',
    duration: 60,
    intensity: 'high',
    exercise_structure: {
      sets: 5,
      reps: 5,
      rest: 180,
      description: '5x5 - Agachamento Livre, Levantamento Terra, Afundo Búlgaro',
      equipment: ['barra', 'anilhas', 'rack'],
    } as any,
    rpe: 9,
    tags: ['lower', 'potência', 'força máxima'],
    level: ['intermediario_3', 'avancado'],
    is_public: false,
    is_favorite: true,
    created_at: '2026-02-01T08:00:00Z',
    updated_at: '2026-02-09T16:00:00Z',
    usage_count: 11,
  },

  // WARMUP/COOLDOWN TEMPLATES
  {
    id: 'template-warmup-1',
    user_id: 'mock-coach-123',
    name: 'Aquecimento Dinâmico 15min',
    description: 'Aquecimento com mobilidade e ativação muscular',
    category: 'warmup',
    modality: 'strength',
    duration: 15,
    intensity: 'low',
    exercise_structure: {
      description: 'Mobilidade articular + ativação core + alongamento dinâmico',
    } as any,
    rpe: 3,
    tags: ['warmup', 'mobilidade', 'ativação'],
    level: ['iniciante_1', 'iniciante_2', 'iniciante_3', 'intermediario_1', 'intermediario_2', 'intermediario_3', 'avancado'],
    is_public: true,
    is_favorite: false,
    created_at: '2026-01-08T06:00:00Z',
    updated_at: '2026-01-08T06:00:00Z',
    usage_count: 45,
  },
  {
    id: 'template-cooldown-1',
    user_id: 'mock-coach-123',
    name: 'Volta à Calma 10min',
    description: 'Desaquecimento com alongamento estático',
    category: 'cooldown',
    modality: 'running',
    duration: 10,
    intensity: 'low',
    exercise_structure: {
      description: 'Caminhada leve + alongamento estático dos principais grupos musculares',
    } as any,
    rpe: 2,
    tags: ['cooldown', 'alongamento', 'recuperação'],
    level: ['iniciante_1', 'iniciante_2', 'iniciante_3', 'intermediario_1', 'intermediario_2', 'intermediario_3', 'avancado'],
    is_public: true,
    is_favorite: false,
    created_at: '2026-01-09T07:00:00Z',
    updated_at: '2026-01-09T07:00:00Z',
    usage_count: 38,
  },

  // RECOVERY TEMPLATES
  {
    id: 'template-recovery-1',
    user_id: 'mock-coach-123',
    name: 'Nado Recuperativo 30min',
    description: 'Nado leve para recuperação ativa',
    category: 'recovery',
    modality: 'swimming',
    duration: 30,
    intensity: 'low',
    exercise_structure: {
      distance: 1500,
      target_time: 1800,
      description: '1500m técnico em ritmo suave',
    } as any,
    css_percentage: 60,
    rpe: 3,
    tags: ['recuperação', 'ativo', 'técnica'],
    level: ['intermediario_1', 'intermediario_2', 'intermediario_3', 'avancado'],
    is_public: false,
    is_favorite: false,
    created_at: '2026-02-04T10:00:00Z',
    updated_at: '2026-02-04T10:00:00Z',
    usage_count: 6,
  },

  // TEST TEMPLATES
  {
    id: 'template-test-1',
    user_id: 'mock-coach-123',
    name: 'Teste FTP 20min',
    description: 'Teste de 20min para determinação do FTP',
    category: 'test',
    modality: 'cycling',
    duration: 45,
    intensity: 'high',
    exercise_structure: {
      description: 'Aquecimento + 20min máximo esforço sustentado + desaquecimento',
    } as any,
    ftp_percentage: 105,
    rpe: 10,
    tags: ['teste', 'FTP', 'avaliação'],
    level: ['intermediario_2', 'intermediario_3', 'avancado'],
    is_public: false,
    is_favorite: true,
    created_at: '2026-01-30T08:00:00Z',
    updated_at: '2026-02-07T10:00:00Z',
    usage_count: 8,
  },
];

// ============================================
// MICROCYCLES (2 examples)
// ============================================

export const MOCK_MICROCYCLES: Microcycle[] = [
  {
    id: 'microcycle-1',
    user_id: 'mock-coach-123',
    athlete_id: 'athlete-1',
    name: 'Base Aeróbica - Bloco 1',
    description: 'Construção de base aeróbica com progressão de volume',
    week_1_focus: 'volume',
    week_2_focus: 'volume',
    week_3_focus: 'recovery',
    start_date: '2026-02-17',
    end_date: '2026-03-09',
    target_weekly_load: [350, 420, 280],
    actual_weekly_load: [340, 410, 275],
    status: 'active',
    sent_to_whatsapp: true,
    whatsapp_message_id: 'msg-whatsapp-123',
    created_at: '2026-02-10T10:00:00Z',
    updated_at: '2026-02-12T15:30:00Z',
  },
  {
    id: 'microcycle-2',
    user_id: 'mock-coach-123',
    athlete_id: 'athlete-5',
    name: 'Intensidade Progressiva - Bloco 2',
    description: 'Introdução gradual de trabalhos de intensidade',
    week_1_focus: 'intensity',
    week_2_focus: 'intensity',
    week_3_focus: 'test',
    start_date: '2026-03-03',
    end_date: '2026-03-23',
    target_weekly_load: [380, 400, 300],
    actual_weekly_load: [375, 0, 0],
    status: 'draft',
    sent_to_whatsapp: false,
    created_at: '2026-02-28T09:00:00Z',
    updated_at: '2026-03-01T11:00:00Z',
  },
];

// ============================================
// WORKOUT SLOTS (slots for microcycle-1)
// ============================================

export const MOCK_WORKOUT_SLOTS: WorkoutSlot[] = [
  // Week 1
  {
    id: 'slot-1-1-1',
    user_id: 'mock-coach-123',
    microcycle_id: 'microcycle-1',
    template_id: 'template-swim-2',
    week_number: 1,
    day_of_week: 1,
    name: 'Resistência Aeróbica 3km',
    duration: 60,
    intensity: 'medium',
    modality: 'swimming',
    css_percentage: 85,
    rpe: 6,
    completed: true,
    completed_at: '2026-02-17T07:00:00Z',
    completion_data: { duration_actual: 58, rpe_actual: 6, notes: 'Bom ritmo, sem desconforto' },
    created_at: '2026-02-10T10:00:00Z',
    updated_at: '2026-02-17T07:30:00Z',
  },
  {
    id: 'slot-1-1-3',
    user_id: 'mock-coach-123',
    microcycle_id: 'microcycle-1',
    template_id: 'template-swim-1',
    week_number: 1,
    day_of_week: 3,
    name: 'Técnica de Crawl - Iniciante',
    duration: 45,
    intensity: 'low',
    modality: 'swimming',
    css_percentage: 70,
    rpe: 5,
    completed: true,
    completed_at: '2026-02-19T07:00:00Z',
    created_at: '2026-02-10T10:00:00Z',
    updated_at: '2026-02-19T07:30:00Z',
  },
  {
    id: 'slot-1-1-5',
    user_id: 'mock-coach-123',
    microcycle_id: 'microcycle-1',
    template_id: 'template-swim-3',
    week_number: 1,
    day_of_week: 5,
    name: 'Intervalado Limiar 20x50m',
    duration: 40,
    intensity: 'high',
    modality: 'swimming',
    css_percentage: 95,
    rpe: 8,
    completed: false,
    created_at: '2026-02-10T10:00:00Z',
    updated_at: '2026-02-10T10:00:00Z',
  },

  // Week 2
  {
    id: 'slot-1-2-1',
    user_id: 'mock-coach-123',
    microcycle_id: 'microcycle-1',
    template_id: 'template-swim-2',
    week_number: 2,
    day_of_week: 1,
    name: 'Resistência Aeróbica 3km',
    duration: 60,
    intensity: 'medium',
    modality: 'swimming',
    css_percentage: 85,
    rpe: 6,
    completed: false,
    created_at: '2026-02-10T10:00:00Z',
    updated_at: '2026-02-10T10:00:00Z',
  },
];

// ============================================
// FLOW ATHLETE PROFILES (based on MOCK_ATHLETES)
// ============================================

export const MOCK_FLOW_ATHLETE_PROFILES: FlowAthleteProfile[] = [
  {
    id: 'profile-1',
    user_id: 'mock-coach-123',
    athlete_id: 'athlete-1',
    name: 'João Silva',
    email: 'joao.silva@email.com',
    phone: '+5511987654321',
    modality: 'swimming',
    level: 'intermediario_2',
    ftp: undefined,
    pace_threshold: undefined,
    swim_css: '1:35/100m',
    last_test_date: '2026-01-15',
    weekly_volume_average: 300,
    consistency_rate: 82,
    current_microcycle_id: 'microcycle-1',
    status: 'active',
    anamnesis: {
      sleep_quality: 'boa',
      stress_level: 'médio',
      injuries: [],
      goals: ['Melhorar técnica de crawl', 'Aumentar resistência'],
      availability: 'manhã',
    },
    created_at: '2025-06-01T10:00:00Z',
    updated_at: '2026-02-10T15:00:00Z',
  },
  {
    id: 'profile-2',
    user_id: 'mock-coach-123',
    athlete_id: 'athlete-5',
    name: 'Maria Santos',
    email: 'maria.santos@email.com',
    phone: '+5511987654325',
    modality: 'running',
    level: 'avancado',
    ftp: undefined,
    pace_threshold: '4:15/km',
    swim_css: undefined,
    last_test_date: '2026-02-01',
    weekly_volume_average: 480,
    consistency_rate: 91,
    current_microcycle_id: 'microcycle-2',
    status: 'active',
    anamnesis: {
      sleep_quality: 'ótima',
      stress_level: 'baixo',
      injuries: ['Fascite plantar (recuperada)'],
      goals: ['Correr meia maratona sub 1h30min'],
      availability: 'flexível',
    },
    created_at: '2024-03-15T08:00:00Z',
    updated_at: '2026-03-01T11:00:00Z',
  },
  {
    id: 'profile-3',
    user_id: 'mock-coach-123',
    athlete_id: 'athlete-10',
    name: 'Pedro Oliveira',
    email: 'pedro.oliveira@email.com',
    phone: '+5511987654330',
    modality: 'cycling',
    level: 'intermediario_3',
    ftp: 285,
    pace_threshold: undefined,
    swim_css: undefined,
    last_test_date: '2026-01-20',
    weekly_volume_average: 420,
    consistency_rate: 78,
    status: 'active',
    anamnesis: {
      sleep_quality: 'razoável',
      stress_level: 'alto',
      injuries: ['Tendinite patelar'],
      goals: ['Aumentar FTP para 300W', 'Completar century ride'],
      availability: 'noite',
    },
    created_at: '2025-09-10T14:00:00Z',
    updated_at: '2026-02-08T09:00:00Z',
  },
];

// ============================================
// WORKOUT AUTOMATIONS (3 examples)
// ============================================

export const MOCK_WORKOUT_AUTOMATIONS: WorkoutAutomation[] = [
  {
    id: 'automation-1',
    user_id: 'mock-coach-123',
    name: 'Enviar Microciclo por WhatsApp',
    description: 'Envia plano de 3 semanas automaticamente quando microciclo for ativado',
    is_active: true,
    trigger_type: 'microcycle_starts',
    trigger_config: {},
    action_type: 'send_whatsapp',
    action_config: {
      message_template_id: 'template-microcycle-start',
      recipient: 'athlete',
    },
    applies_to_athletes: [],
    applies_to_modality: [],
    applies_to_level: [],
    times_triggered: 15,
    last_triggered_at: '2026-02-10T10:00:00Z',
    created_at: '2026-01-05T08:00:00Z',
    updated_at: '2026-02-10T10:00:00Z',
  },
  {
    id: 'automation-2',
    user_id: 'mock-coach-123',
    name: 'Alerta de Consistência Baixa',
    description: 'Cria alerta quando consistência cai abaixo de 60%',
    is_active: true,
    trigger_type: 'consistency_drops',
    trigger_config: {
      consistency_threshold: 60,
    },
    action_type: 'create_alert',
    action_config: {
      alert_severity: 'medium',
    },
    applies_to_athletes: [],
    applies_to_modality: [],
    applies_to_level: [],
    times_triggered: 8,
    last_triggered_at: '2026-02-08T14:00:00Z',
    created_at: '2026-01-10T10:00:00Z',
    updated_at: '2026-02-08T14:00:00Z',
  },
  {
    id: 'automation-3',
    user_id: 'mock-coach-123',
    name: 'Trial Expirando - Lembrete',
    description: 'Envia mensagem 7 dias antes do trial expirar',
    is_active: true,
    trigger_type: 'trial_expiring',
    trigger_config: {
      days_before_expiry: 7,
    },
    action_type: 'send_whatsapp',
    action_config: {
      message_template_id: 'template-trial-expiring',
      recipient: 'athlete',
    },
    applies_to_athletes: [],
    applies_to_modality: [],
    applies_to_level: [],
    times_triggered: 3,
    last_triggered_at: '2026-02-01T09:00:00Z',
    created_at: '2026-01-15T11:00:00Z',
    updated_at: '2026-02-01T09:00:00Z',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getMockTemplatesByModality(modality: string): WorkoutTemplate[] {
  return MOCK_WORKOUT_TEMPLATES.filter((t) => t.modality === modality);
}

export function getMockTemplateById(id: string): WorkoutTemplate | undefined {
  return MOCK_WORKOUT_TEMPLATES.find((t) => t.id === id);
}

export function getMockMicrocycleById(id: string): Microcycle | undefined {
  return MOCK_MICROCYCLES.find((m) => m.id === id);
}

export function getMockSlotsByMicrocycle(microcycleId: string): WorkoutSlot[] {
  return MOCK_WORKOUT_SLOTS.filter((s) => s.microcycle_id === microcycleId);
}

export function getMockFlowAthleteProfile(athleteId: string): FlowAthleteProfile | undefined {
  return MOCK_FLOW_ATHLETE_PROFILES.find((p) => p.athlete_id === athleteId);
}
