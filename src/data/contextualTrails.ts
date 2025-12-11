/**
 * Contextual Trails Data
 * Static definition of all 5 onboarding trails with questions and answers
 * Source: docs/onboarding/TRILHAS_CONTEXTUAIS_E_PERGUNTAS.md
 */

import {
  ContextualTrail,
  ContextualQuestion,
  ContextualAnswer,
} from '../types/onboardingTypes';

// =====================================================
// TRILHA 1: SAÚDE MENTAL E BEM-ESTAR EMOCIONAL
// =====================================================

const emotionalHealthTrail: ContextualTrail = {
  id: 'health-emotional',
  name: 'Saúde Mental e Bem-estar Emocional',
  icon: 'Brain',
  color: '#6B9EFF',
  description: 'Entender seu estado emocional e desenvolver bem-estar mental',
  priority: 1,
  recommendedModules: [
    'journaling',
    'daily_reflections',
    'emotion_picker',
    'weekly_summaries',
    'meditation_basics',
    'breathing_exercises',
    'mood_tracking',
  ],
  questions: [
    {
      id: 'q1_emotion',
      question: 'Como você está se sentindo emocionalmente?',
      type: 'single',
      isRequired: true,
      order: 1,
      answers: [
        {
          id: 'joy',
          label: 'Alegre e energizado',
          value: 'joy',
          icon: '😄',
          weight: 2,
          triggerModules: [],
        },
        {
          id: 'neutral',
          label: 'Normal, equilibrado',
          value: 'neutral',
          icon: '😐',
          weight: 5,
          triggerModules: [],
        },
        {
          id: 'anxious',
          label: 'Ansioso ou preocupado',
          value: 'anxious',
          icon: '😰',
          weight: 8,
          triggerModules: ['meditation', 'stress_management'],
        },
        {
          id: 'depressed',
          label: 'Triste ou desmotivado',
          value: 'depressed',
          icon: '😢',
          weight: 9,
          triggerModules: ['daily_reflections', 'motivation_boost'],
        },
        {
          id: 'overwhelmed',
          label: 'Sobrecarregado/Exausto',
          value: 'overwhelmed',
          icon: '😫',
          weight: 10,
          triggerModules: ['rest_recovery', 'priority_management'],
        },
      ],
    },
    {
      id: 'q2_areas',
      question: 'Quais áreas emocionais você quer desenvolver?',
      type: 'multiple',
      isRequired: true,
      order: 2,
      answers: [
        {
          id: 'self_awareness',
          label: 'Autoconhecimento',
          value: 'self_awareness',
          description: 'Entender melhor minhas emoções e motivações',
          weight: 5,
          triggerModules: ['journaling'],
        },
        {
          id: 'emotional_regulation',
          label: 'Controle emocional',
          value: 'emotional_regulation',
          description: 'Gerenciar melhor reações e impulsos',
          weight: 5,
          triggerModules: ['emotion_picker', 'breathing_exercises'],
        },
        {
          id: 'resilience',
          label: 'Resiliência',
          value: 'resilience',
          description: 'Recuperar-se melhor de desafios',
          weight: 6,
          triggerModules: ['daily_reflections', 'growth_mindset'],
        },
        {
          id: 'relationships',
          label: 'Relacionamentos',
          value: 'relationships',
          description: 'Melhorar conexões com outras pessoas',
          weight: 5,
          triggerModules: ['communication_insights'],
        },
        {
          id: 'stress_management',
          label: 'Gestão de estresse',
          value: 'stress_management',
          description: 'Reduzir ansiedade e tensão',
          weight: 7,
          triggerModules: ['meditation', 'stress_tracking'],
        },
      ],
    },
    {
      id: 'q3_reflection_frequency',
      question: 'Com que frequência você reflete sobre suas emoções?',
      type: 'single',
      isRequired: true,
      order: 3,
      answers: [
        {
          id: 'daily',
          label: 'Diariamente',
          value: 'daily',
          icon: '📅',
          weight: 3,
          triggerModules: [],
        },
        {
          id: 'weekly',
          label: 'Semanalmente',
          value: 'weekly',
          icon: '📆',
          weight: 5,
          triggerModules: [],
        },
        {
          id: 'rarely',
          label: 'Raramente',
          value: 'rarely',
          icon: '⏳',
          weight: 8,
          triggerModules: ['daily_questions', 'weekly_summaries'],
        },
        {
          id: 'never',
          label: 'Nunca, quero começar',
          value: 'never',
          icon: '🌱',
          weight: 9,
          triggerModules: ['guided_journaling', 'reflection_templates'],
        },
      ],
    },
    {
      id: 'q4_goal',
      question: 'Qual é seu objetivo principal com a saúde emocional?',
      type: 'single',
      isRequired: true,
      order: 4,
      answers: [
        {
          id: 'understand_self',
          label: 'Entender a mim mesmo',
          value: 'understand_self',
          weight: 5,
          triggerModules: ['self_discovery'],
        },
        {
          id: 'reduce_stress',
          label: 'Reduzir estresse e ansiedade',
          value: 'reduce_stress',
          weight: 8,
          triggerModules: ['meditation', 'breathing'],
        },
        {
          id: 'improve_relationships',
          label: 'Melhorar relacionamentos',
          value: 'improve_relationships',
          weight: 6,
          triggerModules: ['empathy_insights'],
        },
        {
          id: 'build_confidence',
          label: 'Aumentar confiança',
          value: 'build_confidence',
          weight: 7,
          triggerModules: ['affirmations', 'growth_tracking'],
        },
        {
          id: 'process_past',
          label: 'Processar experiências passadas',
          value: 'process_past',
          weight: 8,
          triggerModules: ['deep_journaling', 'storytelling'],
        },
      ],
    },
  ],
};

// =====================================================
// TRILHA 2: SAÚDE FÍSICA E BEM-ESTAR
// =====================================================

const physicalHealthTrail: ContextualTrail = {
  id: 'health-physical',
  name: 'Saúde Física e Bem-estar',
  icon: 'Activity',
  color: '#FF6B6B',
  description: 'Melhorar sua saúde física e nível de energia',
  priority: 2,
  recommendedModules: [
    'fitness_tracking',
    'activity_suggestions',
    'nutrition_tracker',
    'sleep_tracking',
    'wellness_challenges',
    'habit_building',
  ],
  questions: [
    {
      id: 'q1_health_status',
      question: 'Como você avalia sua saúde física atualmente?',
      type: 'single',
      isRequired: true,
      order: 1,
      answers: [
        {
          id: 'excellent',
          label: 'Excelente - muito saudável',
          value: 'excellent',
          icon: '💪',
          weight: 2,
          triggerModules: [],
        },
        {
          id: 'good',
          label: 'Boa - faço exercício regularmente',
          value: 'good',
          icon: '🏃',
          weight: 3,
          triggerModules: [],
        },
        {
          id: 'average',
          label: 'Média - poderia melhorar',
          value: 'average',
          icon: '🚶',
          weight: 6,
          triggerModules: ['fitness_tracking', 'activity_suggestions'],
        },
        {
          id: 'poor',
          label: 'Preciso urgentemente melhorar',
          value: 'poor',
          icon: '😓',
          weight: 9,
          triggerModules: ['health_challenges', 'habit_building', 'nutrition_basics'],
        },
      ],
    },
    {
      id: 'q2_health_focus',
      question: 'Quais aspectos da saúde física você quer trabalhar?',
      type: 'multiple',
      isRequired: true,
      order: 2,
      answers: [
        {
          id: 'exercise',
          label: 'Mais exercício/Movimento',
          value: 'exercise',
          weight: 6,
          triggerModules: ['fitness_tracking', 'exercise_library'],
        },
        {
          id: 'nutrition',
          label: 'Melhor nutrição',
          value: 'nutrition',
          weight: 6,
          triggerModules: ['nutrition_tracker', 'meal_planning'],
        },
        {
          id: 'sleep',
          label: 'Melhor qualidade de sono',
          value: 'sleep',
          icon: '😴',
          weight: 7,
          triggerModules: ['sleep_tracking', 'sleep_hygiene'],
        },
        {
          id: 'energy',
          label: 'Mais energia no dia',
          value: 'energy',
          weight: 6,
          triggerModules: ['energy_optimization'],
        },
        {
          id: 'pain_management',
          label: 'Gerenciar dor/desconforto',
          value: 'pain_management',
          weight: 7,
          triggerModules: ['pain_tracking', 'wellness_tips'],
        },
        {
          id: 'weight',
          label: 'Gestão de peso',
          value: 'weight',
          weight: 7,
          triggerModules: ['weight_tracking', 'nutrition_balance'],
        },
      ],
    },
    {
      id: 'q3_activity_level',
      question: 'Qual seu nível de atividade típico?',
      type: 'single',
      isRequired: true,
      order: 3,
      answers: [
        {
          id: 'sedentary',
          label: 'Principalmente sentado/imóvel',
          value: 'sedentary',
          weight: 8,
          triggerModules: ['movement_breaks', 'walking_challenge'],
        },
        {
          id: 'light',
          label: 'Movimentação leve (caminhadas)',
          value: 'light',
          weight: 5,
          triggerModules: [],
        },
        {
          id: 'moderate',
          label: 'Exercício moderado (3-4x semana)',
          value: 'moderate',
          weight: 3,
          triggerModules: [],
        },
        {
          id: 'intense',
          label: 'Treino intenso (5+ vezes/semana)',
          value: 'intense',
          weight: 2,
          triggerModules: ['advanced_training', 'recovery_optimization'],
        },
      ],
    },
  ],
};

// =====================================================
// TRILHA 3: FINANCEIRO E PROSPERIDADE
// =====================================================

const financeTrail: ContextualTrail = {
  id: 'finance',
  name: 'Financeiro e Prosperidade',
  icon: 'Wallet',
  color: '#51CF66',
  description: 'Desenvolver habilidades de gestão financeira e criar prosperidade',
  priority: 3,
  recommendedModules: [
    'budget_builder',
    'expense_tracking',
    'debt_management',
    'savings_goals',
    'investment_education',
    'income_boost',
    'wealth_strategies',
  ],
  questions: [
    {
      id: 'q1_financial_status',
      question: 'Como você se sente sobre sua situação financeira?',
      type: 'single',
      isRequired: true,
      order: 1,
      answers: [
        {
          id: 'secure',
          label: 'Seguro e confortável',
          value: 'secure',
          icon: '🏦',
          weight: 2,
          triggerModules: [],
        },
        {
          id: 'stable',
          label: 'Estável, mas poderia melhorar',
          value: 'stable',
          icon: '⚖️',
          weight: 4,
          triggerModules: ['wealth_building', 'investment_basics'],
        },
        {
          id: 'stressed',
          label: 'Preocupado com dívidas',
          value: 'stressed',
          icon: '😰',
          weight: 8,
          triggerModules: ['debt_management', 'budget_planning'],
        },
        {
          id: 'lost',
          label: 'Sem controle sobre minhas finanças',
          value: 'lost',
          icon: '🗺️',
          weight: 9,
          triggerModules: ['financial_foundation', 'money_basics'],
        },
        {
          id: 'broke',
          label: 'Dificuldade financeira severa',
          value: 'broke',
          icon: '⚠️',
          weight: 10,
          triggerModules: ['emergency_fund', 'income_boost'],
        },
      ],
    },
    {
      id: 'q2_financial_priorities',
      question: 'Quais são suas prioridades financeiras?',
      type: 'multiple',
      isRequired: true,
      order: 2,
      answers: [
        {
          id: 'budget',
          label: 'Criar/melhorar orçamento',
          value: 'budget',
          weight: 7,
          triggerModules: ['budget_builder', 'expense_tracking'],
        },
        {
          id: 'debt',
          label: 'Pagar dívidas',
          value: 'debt',
          weight: 8,
          triggerModules: ['debt_payoff_strategy', 'negotiation_tips'],
        },
        {
          id: 'emergency',
          label: 'Fundo de emergência',
          value: 'emergency',
          weight: 8,
          triggerModules: ['savings_goals', 'emergency_planning'],
        },
        {
          id: 'invest',
          label: 'Aprender a investir',
          value: 'invest',
          weight: 6,
          triggerModules: ['investment_education', 'portfolio_basics'],
        },
        {
          id: 'income',
          label: 'Aumentar minha renda',
          value: 'income',
          weight: 7,
          triggerModules: ['side_hustle_ideas', 'career_growth'],
        },
        {
          id: 'wealth',
          label: 'Criar riqueza de longo prazo',
          value: 'wealth',
          weight: 6,
          triggerModules: ['wealth_strategies', 'passive_income'],
        },
      ],
    },
    {
      id: 'q3_expense_tracking',
      question: 'Você tem um sistema para rastrear gastos?',
      type: 'single',
      isRequired: true,
      order: 3,
      answers: [
        {
          id: 'yes_detailed',
          label: 'Sim, rastreio detalhadamente',
          value: 'yes_detailed',
          weight: 2,
          triggerModules: [],
        },
        {
          id: 'yes_basic',
          label: 'Sim, mas básico',
          value: 'yes_basic',
          weight: 4,
          triggerModules: ['expense_tracking_tools'],
        },
        {
          id: 'no_want',
          label: 'Não, mas quero começar',
          value: 'no_want',
          weight: 7,
          triggerModules: ['tracking_setup', 'app_recommendations'],
        },
        {
          id: 'no_dont_care',
          label: 'Não e não vejo necessidade',
          value: 'no_dont_care',
          weight: 8,
          triggerModules: ['financial_awareness', 'money_tracking'],
        },
      ],
    },
  ],
};

// =====================================================
// TRILHA 4: RELACIONAMENTOS E CONEXÃO SOCIAL
// =====================================================

const relationshipsTrail: ContextualTrail = {
  id: 'relationships',
  name: 'Relacionamentos e Conexão Social',
  icon: 'Users',
  color: '#FF922B',
  description: 'Fortalecer relacionamentos e criar conexões significativas',
  priority: 4,
  recommendedModules: [
    'communication_skills',
    'conflict_resolution',
    'relationship_insights',
    'empathy_development',
    'boundary_setting',
    'social_skills',
    'self_love',
  ],
  questions: [
    {
      id: 'q1_social_life',
      question: 'Como está sua vida social/relacionamentos?',
      type: 'single',
      isRequired: true,
      order: 1,
      answers: [
        {
          id: 'thriving',
          label: 'Tenho relacionamentos profundos e significativos',
          value: 'thriving',
          icon: '🌟',
          weight: 2,
          triggerModules: [],
        },
        {
          id: 'good',
          label: 'Tenho bons amigos/família',
          value: 'good',
          icon: '👥',
          weight: 3,
          triggerModules: [],
        },
        {
          id: 'lonely',
          label: 'Me sinto isolado ou desconectado',
          value: 'lonely',
          icon: '😔',
          weight: 8,
          triggerModules: ['connection_building', 'social_anxiety_support'],
        },
        {
          id: 'conflicted',
          label: 'Tenho conflitos relacionais',
          value: 'conflicted',
          icon: '⚡',
          weight: 7,
          triggerModules: ['communication_skills', 'conflict_resolution'],
        },
        {
          id: 'overwhelmed',
          label: 'Tenho muitas demandas sociais',
          value: 'overwhelmed',
          icon: '😵',
          weight: 6,
          triggerModules: ['boundary_setting', 'energy_management'],
        },
      ],
    },
    {
      id: 'q2_relationship_focus',
      question: 'Onde você quer melhorar seus relacionamentos?',
      type: 'multiple',
      isRequired: true,
      order: 2,
      answers: [
        {
          id: 'family',
          label: 'Família',
          value: 'family',
          weight: 6,
          triggerModules: ['family_dynamics', 'generational_healing'],
        },
        {
          id: 'romantic',
          label: 'Relacionamento amoroso',
          value: 'romantic',
          weight: 7,
          triggerModules: ['relationship_insights', 'intimacy_building'],
        },
        {
          id: 'friendships',
          label: 'Amizades',
          value: 'friendships',
          weight: 6,
          triggerModules: ['friendship_cultivation', 'social_skills'],
        },
        {
          id: 'workplace',
          label: 'Relacionamentos profissionais',
          value: 'workplace',
          weight: 6,
          triggerModules: ['workplace_dynamics', 'networking_tips'],
        },
        {
          id: 'self_relationship',
          label: 'Relacionamento comigo mesmo (autoestima)',
          value: 'self_relationship',
          weight: 7,
          triggerModules: ['self_love', 'worth_building'],
        },
        {
          id: 'community',
          label: 'Comunidade/Grupos',
          value: 'community',
          weight: 5,
          triggerModules: ['community_finding', 'belonging'],
        },
      ],
    },
    {
      id: 'q3_relationship_importance',
      question: 'O que é mais importante em seus relacionamentos?',
      type: 'single',
      isRequired: true,
      order: 3,
      answers: [
        {
          id: 'authenticity',
          label: 'Autenticidade e honestidade',
          value: 'authenticity',
          weight: 5,
          triggerModules: [],
        },
        {
          id: 'support',
          label: 'Apoio e compreensão',
          value: 'support',
          weight: 6,
          triggerModules: [],
        },
        {
          id: 'growth',
          label: 'Crescimento mútuo',
          value: 'growth',
          weight: 5,
          triggerModules: [],
        },
        {
          id: 'fun',
          label: 'Diversão e leveza',
          value: 'fun',
          weight: 4,
          triggerModules: [],
        },
        {
          id: 'depth',
          label: 'Intimidade emocional profunda',
          value: 'depth',
          weight: 6,
          triggerModules: [],
        },
      ],
    },
  ],
};

// =====================================================
// TRILHA 5: CRESCIMENTO PESSOAL E PROPÓSITO
// =====================================================

const growthTrail: ContextualTrail = {
  id: 'growth',
  name: 'Crescimento Pessoal e Propósito',
  icon: 'Zap',
  color: '#845EF7',
  description: 'Descubrir seu propósito e acelerar seu crescimento pessoal',
  priority: 5,
  recommendedModules: [
    'purpose_discovery',
    'values_clarification',
    'life_design',
    'career_planning',
    'habit_building',
    'learning_paths',
    'vision_setting',
  ],
  questions: [
    {
      id: 'q1_purpose',
      question: 'Como você se sente sobre seu propósito/direção de vida?',
      type: 'single',
      isRequired: true,
      order: 1,
      answers: [
        {
          id: 'clear',
          label: 'Tenho clareza sobre meu propósito',
          value: 'clear',
          icon: '🎯',
          weight: 2,
          triggerModules: [],
        },
        {
          id: 'somewhat',
          label: 'Tenho uma ideia geral',
          value: 'somewhat',
          icon: '🧭',
          weight: 4,
          triggerModules: [],
        },
        {
          id: 'uncertain',
          label: 'Não tenho certeza',
          value: 'uncertain',
          icon: '❓',
          weight: 6,
          triggerModules: ['purpose_discovery', 'values_clarification'],
        },
        {
          id: 'lost',
          label: 'Sinto-me perdido ou sem direção',
          value: 'lost',
          icon: '🌫️',
          weight: 8,
          triggerModules: ['life_design', 'vision_setting', 'meaning_making'],
        },
        {
          id: 'wanting_change',
          label: 'Quero mudar minha vida/carreira',
          value: 'wanting_change',
          icon: '🚀',
          weight: 7,
          triggerModules: ['career_transition', 'life_redesign'],
        },
      ],
    },
    {
      id: 'q2_development_areas',
      question: 'Quais áreas você quer desenvolver?',
      type: 'multiple',
      isRequired: true,
      order: 2,
      answers: [
        {
          id: 'skills',
          label: 'Novas habilidades e aprendizado',
          value: 'skills',
          weight: 6,
          triggerModules: ['learning_paths', 'skill_building'],
        },
        {
          id: 'career',
          label: 'Progresso profissional',
          value: 'career',
          weight: 7,
          triggerModules: ['career_planning', 'leadership_development'],
        },
        {
          id: 'creativity',
          label: 'Criatividade e expressão',
          value: 'creativity',
          weight: 5,
          triggerModules: ['creative_projects', 'artistic_exploration'],
        },
        {
          id: 'spirituality',
          label: 'Espiritualidade/Conexão',
          value: 'spirituality',
          weight: 6,
          triggerModules: ['mindfulness', 'spiritual_exploration'],
        },
        {
          id: 'habits',
          label: 'Construir hábitos melhores',
          value: 'habits',
          weight: 7,
          triggerModules: ['habit_building', 'behavior_change'],
        },
        {
          id: 'confidence',
          label: 'Confiança e autossuperação',
          value: 'confidence',
          weight: 6,
          triggerModules: ['confidence_building', 'fear_facing'],
        },
      ],
    },
    {
      id: 'q3_learning_pace',
      question: 'Qual é seu tempo ideal para aprender/crescer?',
      type: 'single',
      isRequired: true,
      order: 3,
      answers: [
        {
          id: 'fast',
          label: 'Quero progresso rápido e notável',
          value: 'fast',
          weight: 5,
          triggerModules: ['intensive_programs', 'challenge_tracking'],
        },
        {
          id: 'steady',
          label: 'Crescimento consistente e sustentável',
          value: 'steady',
          weight: 4,
          triggerModules: [],
        },
        {
          id: 'flexible',
          label: 'Depende da minha disponibilidade',
          value: 'flexible',
          weight: 5,
          triggerModules: [],
        },
        {
          id: 'passive',
          label: 'Prefiro insights ocasionais',
          value: 'passive',
          weight: 3,
          triggerModules: [],
        },
      ],
    },
  ],
};

// =====================================================
// EXPORT ALL TRAILS
// =====================================================

export const CONTEXTUAL_TRAILS: Record<string, ContextualTrail> = {
  'health-emotional': emotionalHealthTrail,
  'health-physical': physicalHealthTrail,
  finance: financeTrail,
  relationships: relationshipsTrail,
  growth: growthTrail,
};

export const ALL_TRAILS: ContextualTrail[] = [
  emotionalHealthTrail,
  physicalHealthTrail,
  financeTrail,
  relationshipsTrail,
  growthTrail,
];

/**
 * Helper function to get a trail by ID
 */
export function getTrailById(trailId: string): ContextualTrail | undefined {
  return CONTEXTUAL_TRAILS[trailId];
}

/**
 * Helper function to get all trails sorted by priority
 */
export function getAllTrailsByPriority(): ContextualTrail[] {
  return [...ALL_TRAILS].sort((a, b) => a.priority - b.priority);
}

/**
 * Trail-to-modules mapping matrix
 * Used for aggregating recommended modules across trails
 */
export const TRAIL_TO_MODULES_MAP: Record<string, string[]> = {
  'health-emotional': [
    'journaling',
    'daily_reflections',
    'emotion_picker',
    'weekly_summaries',
    'meditation_basics',
    'breathing_exercises',
    'mood_tracking',
  ],
  'health-physical': [
    'fitness_tracking',
    'activity_suggestions',
    'nutrition_tracker',
    'sleep_tracking',
    'wellness_challenges',
    'habit_building',
  ],
  finance: [
    'budget_builder',
    'expense_tracking',
    'debt_management',
    'savings_goals',
    'investment_education',
    'income_boost',
    'wealth_strategies',
  ],
  relationships: [
    'communication_skills',
    'conflict_resolution',
    'relationship_insights',
    'empathy_development',
    'boundary_setting',
    'social_skills',
    'self_love',
  ],
  growth: [
    'purpose_discovery',
    'values_clarification',
    'life_design',
    'career_planning',
    'habit_building',
    'learning_paths',
    'vision_setting',
  ],
};
