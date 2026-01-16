/**
 * Organization Wizard Types
 * Issue #100 - Wizard gamificado para cadastro completo de organizacoes
 *
 * Defines types for the multi-step wizard with gamification features.
 */

import type { Organization, OrganizationType } from './organizations';

// =============================================================================
// Wizard Step Types
// =============================================================================

export type WizardStepId =
  | 'identification'
  | 'contact'
  | 'address'
  | 'context'
  | 'branding'
  | 'review';

export interface WizardStep {
  id: WizardStepId;
  title: string;
  description: string;
  fields: WizardField[];
  xpReward: number;
}

export interface WizardField {
  name: keyof Organization;
  label: string;
  type: 'text' | 'email' | 'tel' | 'url' | 'select' | 'textarea' | 'multiselect' | 'number' | 'color' | 'image';
  required: boolean;
  xpValue: number;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: (value: unknown) => string | null;
}

// =============================================================================
// Completion Level Types
// =============================================================================

export type CompletionLevel = 'bronze' | 'silver' | 'gold' | 'diamond';

export interface CompletionLevelConfig {
  level: CompletionLevel;
  name: string;
  minPercentage: number;
  maxPercentage: number;
  color: string;
  bgColor: string;
  icon: string;
  description: string;
}

export const COMPLETION_LEVELS: CompletionLevelConfig[] = [
  {
    level: 'bronze',
    name: 'Bronze',
    minPercentage: 0,
    maxPercentage: 24,
    color: '#CD7F32',
    bgColor: '#FDF4E7',
    icon: '🥉',
    description: 'Perfil inicial - preencha mais campos para subir de nivel',
  },
  {
    level: 'silver',
    name: 'Prata',
    minPercentage: 25,
    maxPercentage: 49,
    color: '#C0C0C0',
    bgColor: '#F5F5F5',
    icon: '🥈',
    description: 'Perfil basico - continue preenchendo para destaque',
  },
  {
    level: 'gold',
    name: 'Ouro',
    minPercentage: 50,
    maxPercentage: 79,
    color: '#FFD700',
    bgColor: '#FFFBEB',
    icon: '🥇',
    description: 'Perfil completo - sua organizacao esta bem representada',
  },
  {
    level: 'diamond',
    name: 'Diamante',
    minPercentage: 80,
    maxPercentage: 100,
    color: '#B9F2FF',
    bgColor: '#F0FDFF',
    icon: '💎',
    description: 'Perfil premium - destaque maximo em buscas e matchmaking',
  },
];

// =============================================================================
// XP Reward Configuration
// =============================================================================

export type FieldXPCategory = 'required' | 'important' | 'optional' | 'bonus';

export const FIELD_XP_VALUES: Record<FieldXPCategory, number> = {
  required: 10,
  important: 15,
  optional: 5,
  bonus: 25,
};

export const STEP_COMPLETION_BONUS = 50; // XP bonus for completing a step
export const WIZARD_COMPLETION_BONUS = 200; // XP bonus for completing the wizard

// =============================================================================
// Wizard State Types
// =============================================================================

export interface WizardState {
  currentStepIndex: number;
  completedSteps: WizardStepId[];
  formData: Partial<Organization>;
  totalXpEarned: number;
  fieldXpMap: Record<string, boolean>; // tracks which fields have awarded XP
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
}

export interface WizardProgress {
  currentStep: WizardStep;
  stepIndex: number;
  totalSteps: number;
  completionPercentage: number;
  completionLevel: CompletionLevelConfig;
  filledFieldsCount: number;
  totalFieldsCount: number;
  xpEarned: number;
  xpPotential: number;
}

// =============================================================================
// Wizard Actions
// =============================================================================

export type WizardAction =
  | { type: 'SET_STEP'; stepIndex: number }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'UPDATE_FIELD'; field: keyof Organization; value: unknown }
  | { type: 'AWARD_FIELD_XP'; field: string; xp: number }
  | { type: 'COMPLETE_STEP'; stepId: WizardStepId }
  | { type: 'SET_SAVING'; isSaving: boolean }
  | { type: 'SET_SAVED'; timestamp: string }
  | { type: 'LOAD_DATA'; data: Partial<Organization> }
  | { type: 'RESET' };

// =============================================================================
// Wizard Steps Configuration
// =============================================================================

export const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'identification',
    title: 'Identificacao',
    description: 'Informacoes basicas da organizacao',
    xpReward: STEP_COMPLETION_BONUS,
    fields: [
      { name: 'name', label: 'Nome da Organizacao', type: 'text', required: true, xpValue: 10, placeholder: 'Ex: Instituto Cultural Brasil' },
      { name: 'legal_name', label: 'Razao Social', type: 'text', required: false, xpValue: 5, placeholder: 'Nome oficial registrado' },
      { name: 'document_number', label: 'CNPJ', type: 'text', required: false, xpValue: 15, placeholder: '00.000.000/0000-00' },
      { name: 'organization_type', label: 'Tipo de Organizacao', type: 'select', required: true, xpValue: 10, options: [
        { value: 'ong', label: 'ONG' },
        { value: 'empresa', label: 'Empresa' },
        { value: 'instituto', label: 'Instituto' },
        { value: 'associacao', label: 'Associacao' },
        { value: 'cooperativa', label: 'Cooperativa' },
        { value: 'governo', label: 'Orgao Governamental' },
        { value: 'outro', label: 'Outro' },
      ]},
    ],
  },
  {
    id: 'contact',
    title: 'Contato',
    description: 'Como as pessoas podem entrar em contato',
    xpReward: STEP_COMPLETION_BONUS,
    fields: [
      { name: 'email', label: 'E-mail', type: 'email', required: true, xpValue: 10, placeholder: 'contato@organizacao.org' },
      { name: 'phone', label: 'Telefone', type: 'tel', required: false, xpValue: 5, placeholder: '(11) 99999-9999' },
      { name: 'website', label: 'Website', type: 'url', required: false, xpValue: 15, placeholder: 'https://www.organizacao.org' },
    ],
  },
  {
    id: 'address',
    title: 'Endereco',
    description: 'Localizacao da sede',
    xpReward: STEP_COMPLETION_BONUS,
    fields: [
      { name: 'address_street', label: 'Rua', type: 'text', required: false, xpValue: 5, placeholder: 'Av. Paulista' },
      { name: 'address_number', label: 'Numero', type: 'text', required: false, xpValue: 5, placeholder: '1000' },
      { name: 'address_complement', label: 'Complemento', type: 'text', required: false, xpValue: 5, placeholder: 'Sala 101' },
      { name: 'address_neighborhood', label: 'Bairro', type: 'text', required: false, xpValue: 5, placeholder: 'Bela Vista' },
      { name: 'address_city', label: 'Cidade', type: 'text', required: false, xpValue: 5, placeholder: 'Sao Paulo' },
      { name: 'address_state', label: 'Estado', type: 'text', required: false, xpValue: 5, placeholder: 'SP' },
      { name: 'address_zip', label: 'CEP', type: 'text', required: false, xpValue: 5, placeholder: '01310-100' },
    ],
  },
  {
    id: 'context',
    title: 'Contexto',
    description: 'Missao, visao e areas de atuacao',
    xpReward: STEP_COMPLETION_BONUS,
    fields: [
      { name: 'description', label: 'Descricao', type: 'textarea', required: false, xpValue: 15, placeholder: 'Descreva brevemente sua organizacao...' },
      { name: 'mission', label: 'Missao', type: 'textarea', required: false, xpValue: 15, placeholder: 'Qual a missao da organizacao?' },
      { name: 'vision', label: 'Visao', type: 'textarea', required: false, xpValue: 10, placeholder: 'Qual a visao de futuro?' },
      { name: 'values', label: 'Valores', type: 'textarea', required: false, xpValue: 10, placeholder: 'Quais os valores que norteiam?' },
      { name: 'areas_of_activity', label: 'Areas de Atuacao', type: 'multiselect', required: true, xpValue: 10, options: [
        { value: 'cultura', label: 'Cultura' },
        { value: 'educacao', label: 'Educacao' },
        { value: 'saude', label: 'Saude' },
        { value: 'meio_ambiente', label: 'Meio Ambiente' },
        { value: 'esporte', label: 'Esporte' },
        { value: 'assistencia_social', label: 'Assistencia Social' },
        { value: 'direitos_humanos', label: 'Direitos Humanos' },
        { value: 'tecnologia', label: 'Tecnologia' },
        { value: 'pesquisa', label: 'Pesquisa' },
        { value: 'desenvolvimento_comunitario', label: 'Desenvolvimento Comunitario' },
      ]},
      { name: 'foundation_year', label: 'Ano de Fundacao', type: 'number', required: false, xpValue: 5, placeholder: '2010' },
    ],
  },
  {
    id: 'branding',
    title: 'Identidade Visual',
    description: 'Logo, cores e redes sociais',
    xpReward: STEP_COMPLETION_BONUS,
    fields: [
      { name: 'logo_url', label: 'Logo', type: 'image', required: false, xpValue: 25, placeholder: 'Upload do logo' },
      { name: 'cover_image_url', label: 'Imagem de Capa', type: 'image', required: false, xpValue: 15, placeholder: 'Upload da capa' },
    ],
  },
  {
    id: 'review',
    title: 'Revisao',
    description: 'Revise e finalize o cadastro',
    xpReward: WIZARD_COMPLETION_BONUS,
    fields: [],
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

export function getCompletionLevel(percentage: number): CompletionLevelConfig {
  return COMPLETION_LEVELS.find(
    level => percentage >= level.minPercentage && percentage <= level.maxPercentage
  ) || COMPLETION_LEVELS[0];
}

export function calculateCompletionPercentage(
  formData: Partial<Organization>,
  steps: WizardStep[]
): number {
  const allFields = steps.flatMap(step => step.fields);
  const requiredFields = allFields.filter(f => f.required);
  const optionalFields = allFields.filter(f => !f.required);

  let filledRequired = 0;
  let filledOptional = 0;

  requiredFields.forEach(field => {
    const value = formData[field.name];
    if (value !== undefined && value !== null && value !== '' &&
        !(Array.isArray(value) && value.length === 0)) {
      filledRequired++;
    }
  });

  optionalFields.forEach(field => {
    const value = formData[field.name];
    if (value !== undefined && value !== null && value !== '' &&
        !(Array.isArray(value) && value.length === 0)) {
      filledOptional++;
    }
  });

  // Required fields count for 60%, optional for 40%
  const requiredWeight = 0.6;
  const optionalWeight = 0.4;

  const requiredPercentage = requiredFields.length > 0
    ? (filledRequired / requiredFields.length) * requiredWeight * 100
    : requiredWeight * 100;

  const optionalPercentage = optionalFields.length > 0
    ? (filledOptional / optionalFields.length) * optionalWeight * 100
    : 0;

  return Math.round(requiredPercentage + optionalPercentage);
}

export function calculateTotalXpPotential(steps: WizardStep[]): number {
  const fieldXp = steps.flatMap(step => step.fields).reduce((sum, field) => sum + field.xpValue, 0);
  const stepBonuses = steps.reduce((sum, step) => sum + step.xpReward, 0);
  return fieldXp + stepBonuses;
}
