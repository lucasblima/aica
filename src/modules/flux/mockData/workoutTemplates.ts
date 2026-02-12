/**
 * Flux Module - Workout Templates Mock Data
 *
 * 60 realistic workout templates across 4 modalities.
 * Used in Canvas Prescription sidebar for drag-and-drop.
 */

import type { TrainingModality, ExerciseCategory } from '../types';

export type WorkoutIntensity = 'low' | 'medium' | 'high';

export interface WorkoutTemplate {
  id: string;
  name: string;
  category: ExerciseCategory;
  duration: number; // minutes
  intensity: WorkoutIntensity;
  modality: TrainingModality;
  sets?: number;
  reps?: string;
  rest?: string;
  description: string;
  // FTP/Pace targets (for future load calculation)
  ftp_percentage?: number; // cycling
  pace_zone?: string; // running (ex: "Z2", "VO2Max")
  css_percentage?: number; // swimming (Critical Swim Speed)
}

// ============================================
// SWIMMING TEMPLATES (15)
// ============================================

export const SWIMMING_TEMPLATES: WorkoutTemplate[] = [
  // Warmup (3)
  {
    id: 'swim-warmup-1',
    name: 'Aquecimento 400m Livre',
    category: 'warmup',
    duration: 10,
    intensity: 'low',
    modality: 'swimming',
    sets: 1,
    reps: '400m',
    rest: '0',
    description: 'Nado livre leve para ativar musculatura',
    css_percentage: 60,
  },
  {
    id: 'swim-warmup-2',
    name: 'Aquecimento 600m Variado',
    category: 'warmup',
    duration: 15,
    intensity: 'low',
    modality: 'swimming',
    sets: 1,
    reps: '600m (200 livre, 200 costas, 200 peito)',
    rest: '0',
    description: 'Aquecimento técnico com 3 estilos',
    css_percentage: 65,
  },
  {
    id: 'swim-warmup-3',
    name: 'Mobilidade + 300m',
    category: 'warmup',
    duration: 12,
    intensity: 'low',
    modality: 'swimming',
    sets: 1,
    reps: '5min terra + 300m água',
    rest: '0',
    description: 'Alongamento dinâmico + nado técnico',
  },

  // Main Set (9)
  {
    id: 'swim-main-1',
    name: 'Intervalado VO2 Max 8x100',
    category: 'main',
    duration: 30,
    intensity: 'high',
    modality: 'swimming',
    sets: 8,
    reps: '100m',
    rest: '20s',
    description: 'Tiros de alta intensidade para VO2 máximo',
    css_percentage: 95,
    pace_zone: 'VO2Max',
  },
  {
    id: 'swim-main-2',
    name: 'Longão Z2 - 2000m',
    category: 'main',
    duration: 45,
    intensity: 'medium',
    modality: 'swimming',
    sets: 1,
    reps: '2000m',
    rest: '0',
    description: 'Nado contínuo em zona aeróbica',
    css_percentage: 75,
    pace_zone: 'Z2',
  },
  {
    id: 'swim-main-3',
    name: 'Pirâmide 50-100-150-200-150-100-50',
    category: 'main',
    duration: 35,
    intensity: 'high',
    modality: 'swimming',
    sets: 7,
    reps: 'Variável',
    rest: '15s',
    description: 'Estrutura piramidal para resistência',
    css_percentage: 85,
  },
  {
    id: 'swim-main-4',
    name: 'Sprint 10x50m',
    category: 'main',
    duration: 20,
    intensity: 'high',
    modality: 'swimming',
    sets: 10,
    reps: '50m',
    rest: '30s',
    description: 'Tiros de velocidade máxima',
    css_percentage: 98,
    pace_zone: 'Sprint',
  },
  {
    id: 'swim-main-5',
    name: 'Técnica 16x25m (drill)',
    category: 'main',
    duration: 25,
    intensity: 'low',
    modality: 'swimming',
    sets: 16,
    reps: '25m',
    rest: '10s',
    description: 'Educativos de nado (catch-up, un braço, etc)',
  },
  {
    id: 'swim-main-6',
    name: 'Threshold 5x200m',
    category: 'main',
    duration: 28,
    intensity: 'high',
    modality: 'swimming',
    sets: 5,
    reps: '200m',
    rest: '25s',
    description: 'Limiar anaeróbico - ritmo de prova',
    css_percentage: 90,
    pace_zone: 'Threshold',
  },
  {
    id: 'swim-main-7',
    name: 'Resistência 4x400m',
    category: 'main',
    duration: 40,
    intensity: 'medium',
    modality: 'swimming',
    sets: 4,
    reps: '400m',
    rest: '30s',
    description: 'Blocos longos para resistência aeróbica',
    css_percentage: 80,
  },
  {
    id: 'swim-main-8',
    name: 'Puxada com Parachute 12x100m',
    category: 'main',
    duration: 35,
    intensity: 'high',
    modality: 'swimming',
    sets: 12,
    reps: '100m',
    rest: '20s',
    description: 'Treino de força com paraquedas',
    css_percentage: 85,
  },
  {
    id: 'swim-main-9',
    name: 'Medley 8x100m (4 estilos)',
    category: 'main',
    duration: 30,
    intensity: 'medium',
    modality: 'swimming',
    sets: 8,
    reps: '100m (2x cada estilo)',
    rest: '20s',
    description: 'Variação de estilos para técnica',
  },

  // Cooldown (3)
  {
    id: 'swim-cooldown-1',
    name: 'Desaquecimento 400m Leve',
    category: 'cooldown',
    duration: 10,
    intensity: 'low',
    modality: 'swimming',
    sets: 1,
    reps: '400m',
    rest: '0',
    description: 'Nado suave para recuperação',
    css_percentage: 50,
  },
  {
    id: 'swim-cooldown-2',
    name: 'Alongamento Aquático 10min',
    category: 'cooldown',
    duration: 10,
    intensity: 'low',
    modality: 'swimming',
    sets: 1,
    reps: '200m + alongamento',
    rest: '0',
    description: 'Nado leve + alongamento na borda',
  },
  {
    id: 'swim-cooldown-3',
    name: 'Recovery 600m Z1',
    category: 'cooldown',
    duration: 15,
    intensity: 'low',
    modality: 'swimming',
    sets: 1,
    reps: '600m',
    rest: '0',
    description: 'Recuperação ativa em zona 1',
    css_percentage: 55,
  },
];

// ============================================
// RUNNING TEMPLATES (15)
// ============================================

export const RUNNING_TEMPLATES: WorkoutTemplate[] = [
  // Warmup (3)
  {
    id: 'run-warmup-1',
    name: 'Trote Leve 10min',
    category: 'warmup',
    duration: 10,
    intensity: 'low',
    modality: 'running',
    sets: 1,
    reps: '2km',
    rest: '0',
    description: 'Corrida leve para aquecimento',
    pace_zone: 'Z1',
  },
  {
    id: 'run-warmup-2',
    name: 'Aquecimento Dinâmico 15min',
    category: 'warmup',
    duration: 15,
    intensity: 'low',
    modality: 'running',
    sets: 1,
    reps: '5min mobilidade + 10min trote',
    rest: '0',
    description: 'Alongamento dinâmico + trote',
    pace_zone: 'Z1',
  },
  {
    id: 'run-warmup-3',
    name: 'Progressivo 3km',
    category: 'warmup',
    duration: 18,
    intensity: 'low',
    modality: 'running',
    sets: 1,
    reps: '3km (Z1 → Z2)',
    rest: '0',
    description: 'Aquecimento progressivo',
    pace_zone: 'Z1-Z2',
  },

  // Main Set (9)
  {
    id: 'run-main-1',
    name: 'Longão Z2 - 10km',
    category: 'main',
    duration: 60,
    intensity: 'medium',
    modality: 'running',
    sets: 1,
    reps: '10km',
    rest: '0',
    description: 'Corrida longa em zona aeróbica',
    pace_zone: 'Z2',
  },
  {
    id: 'run-main-2',
    name: 'Intervalado VO2 Max 6x1km',
    category: 'main',
    duration: 40,
    intensity: 'high',
    modality: 'running',
    sets: 6,
    reps: '1km',
    rest: '2min',
    description: 'Tiros de alta intensidade',
    pace_zone: 'VO2Max',
  },
  {
    id: 'run-main-3',
    name: 'Fartlek 40min',
    category: 'main',
    duration: 40,
    intensity: 'high',
    modality: 'running',
    sets: 1,
    reps: '8km (variado)',
    rest: '0',
    description: 'Treino livre com variações de ritmo',
    pace_zone: 'Variado',
  },
  {
    id: 'run-main-4',
    name: 'Threshold 3x2km',
    category: 'main',
    duration: 35,
    intensity: 'high',
    modality: 'running',
    sets: 3,
    reps: '2km',
    rest: '90s',
    description: 'Corrida no limiar anaeróbico',
    pace_zone: 'Threshold',
  },
  {
    id: 'run-main-5',
    name: 'Sprint Curto 10x400m',
    category: 'main',
    duration: 30,
    intensity: 'high',
    modality: 'running',
    sets: 10,
    reps: '400m',
    rest: '90s',
    description: 'Tiros de velocidade em pista',
    pace_zone: 'VO2Max',
  },
  {
    id: 'run-main-6',
    name: 'Progressivo 8km (Z2→Z4)',
    category: 'main',
    duration: 45,
    intensity: 'medium',
    modality: 'running',
    sets: 1,
    reps: '8km',
    rest: '0',
    description: 'Corrida com aumento gradual de ritmo',
    pace_zone: 'Z2-Z4',
  },
  {
    id: 'run-main-7',
    name: 'Subida 8x3min',
    category: 'main',
    duration: 35,
    intensity: 'high',
    modality: 'running',
    sets: 8,
    reps: '3min subida',
    rest: 'Descida leve',
    description: 'Treino de força em ladeira',
    pace_zone: 'Z4',
  },
  {
    id: 'run-main-8',
    name: 'Tempo Run 5km',
    category: 'main',
    duration: 30,
    intensity: 'high',
    modality: 'running',
    sets: 1,
    reps: '5km',
    rest: '0',
    description: 'Corrida em ritmo de prova',
    pace_zone: 'Threshold',
  },
  {
    id: 'run-main-9',
    name: 'Recuperação Ativa 6km Z1',
    category: 'main',
    duration: 40,
    intensity: 'low',
    modality: 'running',
    sets: 1,
    reps: '6km',
    rest: '0',
    description: 'Corrida leve para recuperação',
    pace_zone: 'Z1',
  },

  // Cooldown (3)
  {
    id: 'run-cooldown-1',
    name: 'Trote Regenerativo 5min',
    category: 'cooldown',
    duration: 5,
    intensity: 'low',
    modality: 'running',
    sets: 1,
    reps: '1km',
    rest: '0',
    description: 'Corrida muito leve para desacelerar',
    pace_zone: 'Recovery',
  },
  {
    id: 'run-cooldown-2',
    name: 'Caminhada + Alongamento 10min',
    category: 'cooldown',
    duration: 10,
    intensity: 'low',
    modality: 'running',
    sets: 1,
    reps: '5min caminhada + 5min alongamento',
    rest: '0',
    description: 'Desaquecimento completo',
  },
  {
    id: 'run-cooldown-3',
    name: 'Cool Down 2km Z1',
    category: 'cooldown',
    duration: 12,
    intensity: 'low',
    modality: 'running',
    sets: 1,
    reps: '2km',
    rest: '0',
    description: 'Volta à calma com trote leve',
    pace_zone: 'Z1',
  },
];

// ============================================
// CYCLING TEMPLATES (15)
// ============================================

export const CYCLING_TEMPLATES: WorkoutTemplate[] = [
  // Warmup (3)
  {
    id: 'cycle-warmup-1',
    name: 'Spin Leve 15min',
    category: 'warmup',
    duration: 15,
    intensity: 'low',
    modality: 'cycling',
    sets: 1,
    reps: '8km',
    rest: '0',
    description: 'Pedalada leve para aquecimento',
    ftp_percentage: 50,
  },
  {
    id: 'cycle-warmup-2',
    name: 'Aquecimento Progressivo 20min',
    category: 'warmup',
    duration: 20,
    intensity: 'low',
    modality: 'cycling',
    sets: 1,
    reps: '10km (50% → 65% FTP)',
    rest: '0',
    description: 'Aquecimento com aumento gradual de carga',
    ftp_percentage: 60,
  },
  {
    id: 'cycle-warmup-3',
    name: 'Mobilidade + 10min Bike',
    category: 'warmup',
    duration: 15,
    intensity: 'low',
    modality: 'cycling',
    sets: 1,
    reps: '5min off-bike + 10min spin',
    rest: '0',
    description: 'Alongamento + pedalada inicial',
  },

  // Main Set (9)
  {
    id: 'cycle-main-1',
    name: 'FTP Test 20min',
    category: 'main',
    duration: 20,
    intensity: 'high',
    modality: 'cycling',
    sets: 1,
    reps: '20min máximo esforço',
    rest: '0',
    description: 'Teste de potência funcional (FTP)',
    ftp_percentage: 100,
  },
  {
    id: 'cycle-main-2',
    name: 'Sweet Spot 3x15min',
    category: 'main',
    duration: 50,
    intensity: 'high',
    modality: 'cycling',
    sets: 3,
    reps: '15min',
    rest: '5min',
    description: 'Intervalos na zona sweet spot (88-93% FTP)',
    ftp_percentage: 90,
  },
  {
    id: 'cycle-main-3',
    name: 'Threshold 2x20min',
    category: 'main',
    duration: 45,
    intensity: 'high',
    modality: 'cycling',
    sets: 2,
    reps: '20min',
    rest: '5min',
    description: 'Limiar anaeróbico sustentado',
    ftp_percentage: 95,
  },
  {
    id: 'cycle-main-4',
    name: 'VO2 Max 5x5min',
    category: 'main',
    duration: 35,
    intensity: 'high',
    modality: 'cycling',
    sets: 5,
    reps: '5min',
    rest: '3min',
    description: 'Intervalos de alta intensidade',
    ftp_percentage: 110,
  },
  {
    id: 'cycle-main-5',
    name: 'Endurance 90min Z2',
    category: 'main',
    duration: 90,
    intensity: 'medium',
    modality: 'cycling',
    sets: 1,
    reps: '50km',
    rest: '0',
    description: 'Pedalada longa em zona aeróbica',
    ftp_percentage: 65,
  },
  {
    id: 'cycle-main-6',
    name: 'Sprint 8x30s',
    category: 'main',
    duration: 25,
    intensity: 'high',
    modality: 'cycling',
    sets: 8,
    reps: '30s',
    rest: '4min30s',
    description: 'Tiros de potência máxima',
    ftp_percentage: 150,
  },
  {
    id: 'cycle-main-7',
    name: 'Tempo 40min',
    category: 'main',
    duration: 40,
    intensity: 'medium',
    modality: 'cycling',
    sets: 1,
    reps: '25km',
    rest: '0',
    description: 'Ritmo constante em zona tempo',
    ftp_percentage: 85,
  },
  {
    id: 'cycle-main-8',
    name: 'Pyramide 1-2-3-4-3-2-1min',
    category: 'main',
    duration: 30,
    intensity: 'high',
    modality: 'cycling',
    sets: 7,
    reps: 'Variável',
    rest: 'Igual ao esforço',
    description: 'Estrutura piramidal de potência',
    ftp_percentage: 105,
  },
  {
    id: 'cycle-main-9',
    name: 'Subida Simulada 6x8min',
    category: 'main',
    duration: 60,
    intensity: 'high',
    modality: 'cycling',
    sets: 6,
    reps: '8min (carga alta)',
    rest: '4min',
    description: 'Treino de força em simulador de subida',
    ftp_percentage: 90,
  },

  // Cooldown (3)
  {
    id: 'cycle-cooldown-1',
    name: 'Spin Recuperativo 10min',
    category: 'cooldown',
    duration: 10,
    intensity: 'low',
    modality: 'cycling',
    sets: 1,
    reps: '5km',
    rest: '0',
    description: 'Pedalada leve para recuperação',
    ftp_percentage: 40,
  },
  {
    id: 'cycle-cooldown-2',
    name: 'Cool Down 15min Z1',
    category: 'cooldown',
    duration: 15,
    intensity: 'low',
    modality: 'cycling',
    sets: 1,
    reps: '8km',
    rest: '0',
    description: 'Desaquecimento em zona 1',
    ftp_percentage: 45,
  },
  {
    id: 'cycle-cooldown-3',
    name: 'Alongamento Off-Bike 10min',
    category: 'cooldown',
    duration: 10,
    intensity: 'low',
    modality: 'cycling',
    sets: 1,
    reps: '5min spin + 5min alongamento',
    rest: '0',
    description: 'Spin leve + alongamento fora da bike',
  },
];

// ============================================
// STRENGTH TEMPLATES (15)
// ============================================

export const STRENGTH_TEMPLATES: WorkoutTemplate[] = [
  // Warmup (3)
  {
    id: 'strength-warmup-1',
    name: 'Mobilidade Articular 10min',
    category: 'warmup',
    duration: 10,
    intensity: 'low',
    modality: 'strength',
    sets: 1,
    reps: 'Circuito dinâmico',
    rest: '0',
    description: 'Aquecimento articular geral',
  },
  {
    id: 'strength-warmup-2',
    name: 'Ativação Core + Glúteo 12min',
    category: 'warmup',
    duration: 12,
    intensity: 'low',
    modality: 'strength',
    sets: 2,
    reps: '6 exercícios',
    rest: '30s',
    description: 'Ativação muscular específica',
  },
  {
    id: 'strength-warmup-3',
    name: 'Aquecimento Específico 15min',
    category: 'warmup',
    duration: 15,
    intensity: 'low',
    modality: 'strength',
    sets: 3,
    reps: '50% carga de trabalho',
    rest: '1min',
    description: 'Séries leves dos exercícios principais',
  },

  // Main Set (9)
  {
    id: 'strength-main-1',
    name: 'Força Máxima - Membros Inferiores',
    category: 'main',
    duration: 45,
    intensity: 'high',
    modality: 'strength',
    sets: 5,
    reps: '3-5 reps',
    rest: '3min',
    description: 'Agachamento + Levantamento Terra (85-95% 1RM)',
  },
  {
    id: 'strength-main-2',
    name: 'Hipertrofia - Peito e Tríceps',
    category: 'main',
    duration: 50,
    intensity: 'medium',
    modality: 'strength',
    sets: 4,
    reps: '8-12 reps',
    rest: '90s',
    description: 'Supino + Paralelas + Tríceps (65-75% 1RM)',
  },
  {
    id: 'strength-main-3',
    name: 'Potência - Pliometria',
    category: 'main',
    duration: 35,
    intensity: 'high',
    modality: 'strength',
    sets: 6,
    reps: '6-8 reps',
    rest: '2min',
    description: 'Box jump + Burpee + Salto vertical',
  },
  {
    id: 'strength-main-4',
    name: 'Resistência Muscular - Circuito',
    category: 'main',
    duration: 40,
    intensity: 'medium',
    modality: 'strength',
    sets: 3,
    reps: '15-20 reps',
    rest: '60s',
    description: 'Circuito full body com cargas moderadas',
  },
  {
    id: 'strength-main-5',
    name: 'Core Avançado 30min',
    category: 'main',
    duration: 30,
    intensity: 'medium',
    modality: 'strength',
    sets: 4,
    reps: '45s-60s (isometria)',
    rest: '30s',
    description: 'Prancha + Hollow body + Pallof press',
  },
  {
    id: 'strength-main-6',
    name: 'Upper Body - Push/Pull',
    category: 'main',
    duration: 55,
    intensity: 'high',
    modality: 'strength',
    sets: 5,
    reps: '5-8 reps',
    rest: '2min',
    description: 'Supino + Remada + Desenvolvimento',
  },
  {
    id: 'strength-main-7',
    name: 'Lower Body - Unilateral',
    category: 'main',
    duration: 50,
    intensity: 'medium',
    modality: 'strength',
    sets: 4,
    reps: '10-12 reps/lado',
    rest: '90s',
    description: 'Avanço + Pistol squat + Step-up',
  },
  {
    id: 'strength-main-8',
    name: 'Functional Training 45min',
    category: 'main',
    duration: 45,
    intensity: 'high',
    modality: 'strength',
    sets: 1,
    reps: 'AMRAP (rounds)',
    rest: 'Entre rounds',
    description: 'Treino funcional tipo CrossFit',
  },
  {
    id: 'strength-main-9',
    name: 'Mobilidade + Força - Yoga Athletes',
    category: 'main',
    duration: 40,
    intensity: 'low',
    modality: 'strength',
    sets: 1,
    reps: 'Flow contínuo',
    rest: '0',
    description: 'Yoga focado em atletas de endurance',
  },

  // Cooldown (3)
  {
    id: 'strength-cooldown-1',
    name: 'Alongamento Estático 10min',
    category: 'cooldown',
    duration: 10,
    intensity: 'low',
    modality: 'strength',
    sets: 1,
    reps: '30s/grupo muscular',
    rest: '0',
    description: 'Alongamento passivo dos grupos trabalhados',
  },
  {
    id: 'strength-cooldown-2',
    name: 'Foam Rolling 15min',
    category: 'cooldown',
    duration: 15,
    intensity: 'low',
    modality: 'strength',
    sets: 1,
    reps: 'Auto-liberação miofascial',
    rest: '0',
    description: 'Liberação com rolo de espuma',
  },
  {
    id: 'strength-cooldown-3',
    name: 'Respiração + Meditação 12min',
    category: 'cooldown',
    duration: 12,
    intensity: 'low',
    modality: 'strength',
    sets: 1,
    reps: 'Box breathing 4-4-4-4',
    rest: '0',
    description: 'Técnicas de respiração para recuperação',
  },
];

// ============================================
// CONSOLIDATED EXPORT
// ============================================

export const ALL_WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  ...SWIMMING_TEMPLATES,
  ...RUNNING_TEMPLATES,
  ...CYCLING_TEMPLATES,
  ...STRENGTH_TEMPLATES,
];

/**
 * Get templates by modality
 */
export function getTemplatesByModality(modality: TrainingModality): WorkoutTemplate[] {
  return ALL_WORKOUT_TEMPLATES.filter((t) => t.modality === modality);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  modality: TrainingModality,
  category: ExerciseCategory
): WorkoutTemplate[] {
  return ALL_WORKOUT_TEMPLATES.filter(
    (t) => t.modality === modality && t.category === category
  );
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): WorkoutTemplate | undefined {
  return ALL_WORKOUT_TEMPLATES.find((t) => t.id === id);
}

/**
 * Get templates count summary
 */
export function getTemplatesSummary(): Record<TrainingModality, Record<ExerciseCategory, number>> {
  const summary = {
    swimming: { warmup: 0, main: 0, cooldown: 0 },
    running: { warmup: 0, main: 0, cooldown: 0 },
    cycling: { warmup: 0, main: 0, cooldown: 0 },
    strength: { warmup: 0, main: 0, cooldown: 0 },
  } as Record<TrainingModality, Record<ExerciseCategory, number>>;

  for (const template of ALL_WORKOUT_TEMPLATES) {
    summary[template.modality][template.category]++;
  }

  return summary;
}
