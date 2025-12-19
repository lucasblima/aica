/**
 * Journey Schemas Data
 *
 * Defines all schema validations for contextual trails.
 * Each trail has specific required fields that users must complete
 * to unlock modules and progression.
 *
 * Schema Design Philosophy:
 * - Mirrors the contextual trails from onboarding
 * - Captures essential context for AI recommendation and journey progression
 * - Balance between comprehensiveness and user friction
 * - Optional fields for enrichment, required fields for core functionality
 *
 * @see docs/onboarding/TRILHAS_CONTEXTUAIS_E_PERGUNTAS.md
 */

import { JourneySchema, JourneySchemaMap } from '../types/journeySchemas';

// =====================================================
// TRILHA 1: SAÚDE MENTAL E BEM-ESTAR EMOCIONAL
// =====================================================

const emotionalHealthSchema: JourneySchema = {
  journeyId: 'health-emotional',
  journeyName: 'Saúde Mental e Bem-estar Emocional',
  areaId: 'health',
  description: 'Contexto sobre estado emocional e objetivos de bem-estar mental',
  version: 1,
  icon: 'Brain',
  color: '#6B9EFF',
  fields: [
    {
      key: 'current_emotional_state',
      type: 'string',
      required: true,
      label: 'Estado Emocional Atual',
      description: 'Como você está se sentindo agora?',
      placeholder: 'Selecione seu estado emocional',
      inputType: 'select',
      options: [
        { value: 'joy', label: 'Alegre e energizado' },
        { value: 'neutral', label: 'Normal, equilibrado' },
        { value: 'anxious', label: 'Ansioso ou preocupado' },
        { value: 'depressed', label: 'Triste ou desmotivado' },
        { value: 'overwhelmed', label: 'Sobrecarregado/Exausto' },
      ],
    },
    {
      key: 'emotional_focus_areas',
      type: 'array',
      required: true,
      label: 'Áreas Emocionais para Desenvolver',
      description: 'Quais áreas você quer trabalhar? (pelo menos uma)',
      inputType: 'multiselect',
      options: [
        { value: 'self_awareness', label: 'Autoconhecimento' },
        { value: 'emotional_regulation', label: 'Controle emocional' },
        { value: 'resilience', label: 'Resiliência' },
        { value: 'relationships', label: 'Relacionamentos' },
        { value: 'stress_management', label: 'Gestão de estresse' },
      ],
    },
    {
      key: 'reflection_frequency',
      type: 'string',
      required: true,
      label: 'Frequência de Reflexão',
      description: 'Com que frequência você reflete sobre suas emoções?',
      inputType: 'select',
      options: [
        { value: 'daily', label: 'Diariamente' },
        { value: 'weekly', label: 'Semanalmente' },
        { value: 'rarely', label: 'Raramente' },
        { value: 'never', label: 'Nunca, quero começar' },
      ],
    },
    {
      key: 'primary_emotional_goal',
      type: 'string',
      required: true,
      label: 'Objetivo Principal',
      description: 'Qual é seu objetivo principal com a saúde emocional?',
      inputType: 'select',
      options: [
        { value: 'understand_self', label: 'Entender a mim mesmo' },
        { value: 'reduce_stress', label: 'Reduzir estresse e ansiedade' },
        { value: 'improve_relationships', label: 'Melhorar relacionamentos' },
        { value: 'build_confidence', label: 'Aumentar confiança' },
        { value: 'process_past', label: 'Processar experiências passadas' },
      ],
    },
    {
      key: 'therapy_or_counseling',
      type: 'boolean',
      required: false,
      label: 'Você está em terapia ou aconselhamento?',
      description: 'Ajuda-nos a recomendar recursos complementares',
      inputType: 'select',
      options: [
        { value: 'true', label: 'Sim' },
        { value: 'false', label: 'Não' },
      ],
    },
    {
      key: 'meditation_experience',
      type: 'string',
      required: false,
      label: 'Experiência com Meditação',
      description: 'Qual seu nível de experiência?',
      inputType: 'select',
      options: [
        { value: 'none', label: 'Nunca meditei' },
        { value: 'beginner', label: 'Iniciante' },
        { value: 'intermediate', label: 'Intermediário' },
        { value: 'advanced', label: 'Avançado' },
      ],
    },
  ],
  requiredFieldsCount: 4,
  estimatedCompletionTime: 5,
};

// =====================================================
// TRILHA 2: SAÚDE FÍSICA E BEM-ESTAR
// =====================================================

const physicalHealthSchema: JourneySchema = {
  journeyId: 'health-physical',
  journeyName: 'Saúde Física e Bem-estar',
  areaId: 'health',
  description: 'Contexto sobre saúde física e metas de bem-estar',
  version: 1,
  icon: 'Activity',
  color: '#FF6B6B',
  fields: [
    {
      key: 'health_status',
      type: 'string',
      required: true,
      label: 'Status de Saúde Atual',
      description: 'Como você avalia sua saúde física?',
      inputType: 'select',
      options: [
        { value: 'excellent', label: 'Excelente - muito saudável' },
        { value: 'good', label: 'Boa - faço exercício regularmente' },
        { value: 'average', label: 'Média - poderia melhorar' },
        { value: 'poor', label: 'Preciso urgentemente melhorar' },
      ],
    },
    {
      key: 'health_focus_areas',
      type: 'array',
      required: true,
      label: 'Áreas de Saúde para Trabalhar',
      description: 'Selecione pelo menos uma área',
      inputType: 'multiselect',
      options: [
        { value: 'exercise', label: 'Mais exercício/Movimento' },
        { value: 'nutrition', label: 'Melhor nutrição' },
        { value: 'sleep', label: 'Melhor qualidade de sono' },
        { value: 'energy', label: 'Mais energia no dia' },
        { value: 'pain_management', label: 'Gerenciar dor/desconforto' },
        { value: 'weight', label: 'Gestão de peso' },
      ],
    },
    {
      key: 'activity_level',
      type: 'string',
      required: true,
      label: 'Nível de Atividade Atual',
      description: 'Qual seu nível de atividade típico?',
      inputType: 'select',
      options: [
        { value: 'sedentary', label: 'Principalmente sentado/imóvel' },
        { value: 'light', label: 'Movimentação leve (caminhadas)' },
        { value: 'moderate', label: 'Exercício moderado (3-4x semana)' },
        { value: 'intense', label: 'Treino intenso (5+ vezes/semana)' },
      ],
    },
    {
      key: 'exercise_minutes_per_week',
      type: 'number',
      required: false,
      label: 'Minutos de Exercício por Semana',
      description: 'Quanto tempo você se exercita atualmente?',
      placeholder: '0',
      inputType: 'number',
      validationRules: [
        { type: 'min', value: 0, message: 'Deve ser um número não-negativo' },
        { type: 'max', value: 1680, message: 'Máximo 28 horas por semana' },
      ],
    },
    {
      key: 'sleep_hours_per_night',
      type: 'decimal',
      required: false,
      label: 'Horas de Sono por Noite',
      description: 'Quantas horas você dorme em média?',
      placeholder: '7',
      inputType: 'number',
      validationRules: [
        { type: 'min', value: 0, message: 'Deve ser positivo' },
        { type: 'max', value: 24, message: 'Máximo 24 horas' },
      ],
    },
    {
      key: 'has_chronic_conditions',
      type: 'boolean',
      required: false,
      label: 'Possui Condições Crônicas?',
      description: 'Diabetes, hipertensão, asma, etc?',
      inputType: 'select',
      options: [
        { value: 'true', label: 'Sim' },
        { value: 'false', label: 'Não' },
      ],
    },
    {
      key: 'chronic_conditions_description',
      type: 'string',
      required: false,
      label: 'Descreva suas Condições',
      description: 'Quais condições você tem?',
      placeholder: 'Ex: Diabetes tipo 2, pressão alta',
      inputType: 'textarea',
      dependsOn: 'has_chronic_conditions',
    },
  ],
  requiredFieldsCount: 3,
  estimatedCompletionTime: 5,
};

// =====================================================
// TRILHA 3: FINANCEIRO E PROSPERIDADE
// =====================================================

const financeSchema: JourneySchema = {
  journeyId: 'finance',
  journeyName: 'Financeiro e Prosperidade',
  areaId: 'finance',
  description: 'Contexto financeiro para recomendações de gestão e prosperidade',
  version: 1,
  icon: 'Wallet',
  color: '#51CF66',
  fields: [
    {
      key: 'financial_status',
      type: 'string',
      required: true,
      label: 'Status Financeiro Atual',
      description: 'Como você se sente sobre sua situação financeira?',
      inputType: 'select',
      options: [
        { value: 'secure', label: 'Seguro e confortável' },
        { value: 'stable', label: 'Estável, mas poderia melhorar' },
        { value: 'stressed', label: 'Preocupado com dívidas' },
        { value: 'lost', label: 'Sem controle sobre minhas finanças' },
        { value: 'broke', label: 'Dificuldade financeira severa' },
      ],
    },
    {
      key: 'financial_priorities',
      type: 'array',
      required: true,
      label: 'Prioridades Financeiras',
      description: 'Selecione pelo menos uma prioridade',
      inputType: 'multiselect',
      options: [
        { value: 'budget', label: 'Criar/melhorar orçamento' },
        { value: 'debt', label: 'Pagar dívidas' },
        { value: 'emergency', label: 'Fundo de emergência' },
        { value: 'invest', label: 'Aprender a investir' },
        { value: 'income', label: 'Aumentar minha renda' },
        { value: 'wealth', label: 'Criar riqueza de longo prazo' },
      ],
    },
    {
      key: 'monthly_income',
      type: 'decimal',
      required: true,
      label: 'Renda Mensal Aproximada',
      description: 'Sua renda mensal em reais',
      placeholder: 'R$ 0,00',
      inputType: 'currency',
      validationRules: [
        { type: 'min', value: 0, message: 'Deve ser um valor não-negativo' },
      ],
    },
    {
      key: 'total_debts',
      type: 'decimal',
      required: false,
      label: 'Total de Dívidas',
      description: 'Soma de todas as suas dívidas (opcional)',
      placeholder: 'R$ 0,00',
      inputType: 'currency',
      validationRules: [
        { type: 'min', value: 0, message: 'Deve ser um valor não-negativo' },
      ],
    },
    {
      key: 'monthly_expenses',
      type: 'decimal',
      required: false,
      label: 'Despesas Mensais',
      description: 'Quanto você gasta por mês?',
      placeholder: 'R$ 0,00',
      inputType: 'currency',
      validationRules: [
        { type: 'min', value: 0, message: 'Deve ser um valor não-negativo' },
      ],
    },
    {
      key: 'has_emergency_fund',
      type: 'boolean',
      required: false,
      label: 'Possui Fundo de Emergência?',
      description: 'Tem dinheiro guardado para emergências?',
      inputType: 'select',
      options: [
        { value: 'true', label: 'Sim' },
        { value: 'false', label: 'Não' },
      ],
    },
    {
      key: 'emergency_fund_amount',
      type: 'decimal',
      required: false,
      label: 'Valor do Fundo de Emergência',
      description: 'Quanto você tem guardado?',
      placeholder: 'R$ 0,00',
      inputType: 'currency',
      dependsOn: 'has_emergency_fund',
    },
    {
      key: 'tracks_expenses',
      type: 'string',
      required: false,
      label: 'Como Você Rastreia Gastos?',
      description: 'Qual sistema você usa?',
      inputType: 'select',
      options: [
        { value: 'yes_detailed', label: 'Sim, rastreio detalhadamente' },
        { value: 'yes_basic', label: 'Sim, mas básico' },
        { value: 'no_want', label: 'Não, mas quero começar' },
        { value: 'no_dont_care', label: 'Não e não vejo necessidade' },
      ],
    },
  ],
  requiredFieldsCount: 3,
  estimatedCompletionTime: 7,
};

// =====================================================
// TRILHA 4: RELACIONAMENTOS E CONEXÃO SOCIAL
// =====================================================

const relationshipsSchema: JourneySchema = {
  journeyId: 'relationships',
  journeyName: 'Relacionamentos e Conexão Social',
  areaId: 'relationships',
  description: 'Contexto sobre relacionamentos e vida social',
  version: 1,
  icon: 'Users',
  color: '#FF922B',
  fields: [
    {
      key: 'social_life_status',
      type: 'string',
      required: true,
      label: 'Estado Atual da Vida Social',
      description: 'Como está sua vida social e relacionamentos?',
      inputType: 'select',
      options: [
        { value: 'thriving', label: 'Tenho relacionamentos profundos e significativos' },
        { value: 'good', label: 'Tenho bons amigos/família' },
        { value: 'lonely', label: 'Me sinto isolado ou desconectado' },
        { value: 'conflicted', label: 'Tenho conflitos relacionais' },
        { value: 'overwhelmed', label: 'Tenho muitas demandas sociais' },
      ],
    },
    {
      key: 'relationship_focus_areas',
      type: 'array',
      required: true,
      label: 'Áreas de Relacionamento para Melhorar',
      description: 'Selecione pelo menos uma área',
      inputType: 'multiselect',
      options: [
        { value: 'family', label: 'Família' },
        { value: 'romantic', label: 'Relacionamento amoroso' },
        { value: 'friendships', label: 'Amizades' },
        { value: 'workplace', label: 'Relacionamentos profissionais' },
        { value: 'self_relationship', label: 'Relacionamento comigo mesmo' },
        { value: 'community', label: 'Comunidade/Grupos' },
      ],
    },
    {
      key: 'closest_relationships_count',
      type: 'number',
      required: false,
      label: 'Quantos Relacionamentos Próximos?',
      description: 'Pessoas com quem você tem confiança total',
      placeholder: '0',
      inputType: 'number',
      validationRules: [
        { type: 'min', value: 0, message: 'Deve ser um número não-negativo' },
      ],
    },
    {
      key: 'relationship_importance',
      type: 'string',
      required: false,
      label: 'O Que É Mais Importante em Seus Relacionamentos?',
      description: 'Selecione o aspecto mais importante',
      inputType: 'select',
      options: [
        { value: 'authenticity', label: 'Autenticidade e honestidade' },
        { value: 'support', label: 'Apoio e compreensão' },
        { value: 'growth', label: 'Crescimento mútuo' },
        { value: 'fun', label: 'Diversão e leveza' },
        { value: 'depth', label: 'Intimidade emocional profunda' },
      ],
    },
    {
      key: 'has_romantic_partner',
      type: 'boolean',
      required: false,
      label: 'Você Tem Parceiro(a) Romântico(a)?',
      description: 'Está em um relacionamento amoroso?',
      inputType: 'select',
      options: [
        { value: 'true', label: 'Sim' },
        { value: 'false', label: 'Não' },
      ],
    },
    {
      key: 'communication_style',
      type: 'string',
      required: false,
      label: 'Seu Estilo de Comunicação',
      description: 'Como você se comunica?',
      inputType: 'select',
      options: [
        { value: 'direct', label: 'Direto e assertivo' },
        { value: 'gentle', label: 'Gentil e evitativo' },
        { value: 'passive_aggressive', label: 'Passivo-agressivo' },
        { value: 'mixed', label: 'Varia conforme a situação' },
      ],
    },
  ],
  requiredFieldsCount: 2,
  estimatedCompletionTime: 6,
};

// =====================================================
// TRILHA 5: CRESCIMENTO PESSOAL E PROPÓSITO
// =====================================================

const growthSchema: JourneySchema = {
  journeyId: 'growth',
  journeyName: 'Crescimento Pessoal e Propósito',
  areaId: 'growth',
  description: 'Contexto sobre propósito, valores e objetivos de crescimento',
  version: 1,
  icon: 'Zap',
  color: '#845EF7',
  fields: [
    {
      key: 'purpose_clarity',
      type: 'string',
      required: true,
      label: 'Clareza Sobre Seu Propósito',
      description: 'Como você se sente sobre seu propósito?',
      inputType: 'select',
      options: [
        { value: 'clear', label: 'Tenho clareza sobre meu propósito' },
        { value: 'somewhat', label: 'Tenho uma ideia geral' },
        { value: 'uncertain', label: 'Não tenho certeza' },
        { value: 'lost', label: 'Sinto-me perdido ou sem direção' },
        { value: 'wanting_change', label: 'Quero mudar minha vida/carreira' },
      ],
    },
    {
      key: 'development_areas',
      type: 'array',
      required: true,
      label: 'Áreas para Desenvolver',
      description: 'Selecione pelo menos uma área',
      inputType: 'multiselect',
      options: [
        { value: 'skills', label: 'Novas habilidades e aprendizado' },
        { value: 'career', label: 'Progresso profissional' },
        { value: 'creativity', label: 'Criatividade e expressão' },
        { value: 'spirituality', label: 'Espiritualidade/Conexão' },
        { value: 'habits', label: 'Construir hábitos melhores' },
        { value: 'confidence', label: 'Confiança e autossuperação' },
      ],
    },
    {
      key: 'learning_pace',
      type: 'string',
      required: true,
      label: 'Ritmo Ideal de Aprendizado',
      description: 'Qual seu tempo ideal para crescer?',
      inputType: 'select',
      options: [
        { value: 'fast', label: 'Quero progresso rápido e notável' },
        { value: 'steady', label: 'Crescimento consistente e sustentável' },
        { value: 'flexible', label: 'Depende da minha disponibilidade' },
        { value: 'passive', label: 'Prefiro insights ocasionais' },
      ],
    },
    {
      key: 'current_job_satisfaction',
      type: 'number',
      required: false,
      label: 'Satisfação com Seu Trabalho Atual',
      description: 'Em uma escala de 0-10',
      placeholder: '5',
      inputType: 'number',
      validationRules: [
        { type: 'min', value: 0, message: 'Mínimo é 0' },
        { type: 'max', value: 10, message: 'Máximo é 10' },
      ],
    },
    {
      key: 'main_values',
      type: 'array',
      required: false,
      label: 'Seus Valores Principais',
      description: 'O que é mais importante para você?',
      inputType: 'multiselect',
      options: [
        { value: 'family', label: 'Família' },
        { value: 'health', label: 'Saúde' },
        { value: 'creativity', label: 'Criatividade' },
        { value: 'independence', label: 'Independência' },
        { value: 'contribution', label: 'Contribuição social' },
        { value: 'learning', label: 'Aprendizado contínuo' },
        { value: 'adventure', label: 'Aventura' },
        { value: 'stability', label: 'Estabilidade' },
      ],
    },
    {
      key: 'has_5_year_plan',
      type: 'boolean',
      required: false,
      label: 'Tem um Plano de 5 Anos?',
      description: 'Você tem metas de longo prazo definidas?',
      inputType: 'select',
      options: [
        { value: 'true', label: 'Sim' },
        { value: 'false', label: 'Não' },
      ],
    },
    {
      key: 'biggest_obstacle',
      type: 'string',
      required: false,
      label: 'Seu Maior Obstáculo',
      description: 'O que mais o impede de crescer?',
      placeholder: 'Ex: Medo, falta de tempo, recursos limitados',
      inputType: 'textarea',
    },
  ],
  requiredFieldsCount: 3,
  estimatedCompletionTime: 8,
};

// =====================================================
// EXPORT SCHEMAS
// =====================================================

export const JOURNEY_SCHEMAS: JourneySchemaMap = {
  'health-emotional': emotionalHealthSchema,
  'health-physical': physicalHealthSchema,
  finance: financeSchema,
  relationships: relationshipsSchema,
  growth: growthSchema,
};

/**
 * Get all schemas as array
 */
export const ALL_SCHEMAS: JourneySchema[] = [
  emotionalHealthSchema,
  physicalHealthSchema,
  financeSchema,
  relationshipsSchema,
  growthSchema,
];

/**
 * Get schema by journey ID
 */
export function getJourneySchema(journeyId: string): JourneySchema | undefined {
  return JOURNEY_SCHEMAS[journeyId];
}

/**
 * Get all required field keys for a schema
 */
export function getRequiredFields(schema: JourneySchema): string[] {
  return schema.fields.filter(f => f.required).map(f => f.key);
}

/**
 * Get all optional field keys for a schema
 */
export function getOptionalFields(schema: JourneySchema): string[] {
  return schema.fields.filter(f => !f.required).map(f => f.key);
}
