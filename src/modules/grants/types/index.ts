/**
 * Módulo Captação - Tipos TypeScript
 * Sistema de assistência para escrita de projetos em editais de fomento
 */

// ============================================
// GRANT OPPORTUNITY (Edital)
// ============================================

export interface GrantOpportunity {
  id: string;
  user_id: string;

  // Identificação
  title: string;
  funding_agency: string;
  program_name?: string;
  edital_number?: string;

  // Valores
  min_funding?: number;
  max_funding?: number;
  counterpart_percentage?: number;

  // Datas
  submission_start?: string;
  submission_deadline: string;
  result_date?: string;

  // Temas e requisitos
  eligible_themes: string[];
  eligibility_requirements: Record<string, any>;

  // Critérios de avaliação
  evaluation_criteria: EvaluationCriterion[];

  // Formulário
  form_fields: FormField[];

  // Sistema externo
  external_system_url?: string;

  // Metadados
  status: 'draft' | 'open' | 'closed' | 'archived';
  created_at: string;
  updated_at: string;
  archived_at?: string | null;

  // PDF do edital
  edital_pdf_path?: string;
  edital_text_content?: string;

  // Google File Search integration
  file_search_document_id?: string;
}

export interface EvaluationCriterion {
  id: string;
  name: string;
  description: string;
  weight: number;
  min_score: number;
  max_score: number;
}

export interface FormField {
  id: string;
  label: string;
  max_chars: number;
  required: boolean;
  ai_prompt_hint?: string;
  placeholder?: string;
}

// ============================================
// GRANT PROJECT (Projeto de Inscrição)
// ============================================

export interface GrantProject {
  id: string;
  user_id: string;
  opportunity_id: string;

  // Identificação
  project_name: string;

  // Status
  status: 'draft' | 'briefing' | 'generating' | 'review' | 'submitted' | 'approved' | 'rejected';
  completion_percentage: number;

  // Metadados
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  archived_at?: string | null;

  // Source Document (Fonte de Verdade) - DEPRECATED: Use documents array
  source_document_path?: string | null;
  source_document_type?: string | null;
  source_document_content?: string | null;
  source_document_uploaded_at?: string | null;

  // Relações (carregadas via join)
  opportunity?: GrantOpportunity;
  briefing?: GrantBriefing;
  responses?: GrantResponse[];
  documents?: ProjectDocument[]; // Multiple source documents
}

// ============================================
// PROJECT DOCUMENT (Documentos de Contexto)
// ============================================

export interface ProjectDocument {
  id: string;
  project_id: string;
  user_id: string;
  file_name: string;
  document_path: string;
  document_type: 'md' | 'pdf' | 'txt' | 'docx' | 'csv';
  document_content: string | null;
  file_size_bytes: number | null;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// OPPORTUNITY DOCUMENT (Documentos de Contexto do Edital)
// ============================================

export interface OpportunityDocument {
  id: string;
  opportunity_id: string;
  user_id: string;
  file_name: string;
  document_path: string;
  document_type: 'md' | 'pdf' | 'txt' | 'docx' | 'csv';
  document_content: string | null;
  file_size_bytes: number | null;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// GRANT BRIEFING (Contexto do Projeto)
// ============================================

export interface GrantBriefing {
  id: string;
  project_id: string;
  briefing_data: BriefingData;
  created_at: string;
  updated_at: string;
}

/**
 * @deprecated Use Record<string, string> para briefing dinâmico
 * Mantido apenas para compatibilidade durante migração
 *
 * Os campos abaixo são exemplos do sistema antigo (8 campos fixos).
 * O novo sistema usa campos dinâmicos definidos em form_fields do edital.
 */
export interface BriefingData {
  company_context?: string;
  project_description?: string;
  technical_innovation?: string;
  market_differential?: string;
  team_expertise?: string;
  expected_results?: string;
  sustainability?: string;
  additional_notes?: string;
  // Permite campos dinâmicos para compatibilidade
  [key: string]: string | undefined;
}

import {
  Building2,
  Lightbulb,
  Rocket,
  TrendingUp,
  Users,
  Target,
  Leaf,
  FileText
} from 'lucide-react';

export const BRIEFING_SECTIONS: Array<{
  id: keyof BriefingData;
  title: string;
  icon: any;
  help: string;
  placeholder: string;
}> = [
    {
      id: 'company_context',
      title: 'Contexto da Empresa',
      icon: Building2,
      help: 'Descreva sua empresa: porte, setor, histórico, principais produtos/serviços.',
      placeholder: 'Descreva a empresa'
    },
    {
      id: 'project_description',
      title: 'Descrição do Projeto',
      icon: Lightbulb,
      help: 'Explique o que você pretende desenvolver com este financiamento.',
      placeholder: 'Descreva o projeto'
    },
    {
      id: 'technical_innovation',
      title: 'Inovação Técnica',
      icon: Rocket,
      help: 'Qual é o diferencial tecnológico? O que torna este projeto inovador?',
      placeholder: 'Descreva a inovação técnica'
    },
    {
      id: 'market_differential',
      title: 'Diferencial de Mercado',
      icon: TrendingUp,
      help: 'Por que este projeto tem potencial de mercado? Quem são os clientes?',
      placeholder: 'Descreva o diferencial de mercado'
    },
    {
      id: 'team_expertise',
      title: 'Expertise da Equipe',
      icon: Users,
      help: 'Quem são as pessoas-chave do projeto? Formação, experiência, realizações.',
      placeholder: 'Descreva a expertise da equipe'
    },
    {
      id: 'expected_results',
      title: 'Resultados Esperados',
      icon: Target,
      help: 'O que você pretende alcançar ao final do projeto? Metas quantificáveis.',
      placeholder: 'Descreva os resultados esperados'
    },
    {
      id: 'sustainability',
      title: 'Sustentabilidade',
      icon: Leaf,
      help: 'Como o projeto se sustentará financeiramente após o fomento?',
      placeholder: 'Descreva a sustentabilidade do projeto'
    },
    {
      id: 'additional_notes',
      title: 'Informações Adicionais',
      icon: FileText,
      help: 'Qualquer outra informação relevante que não se encaixou nos campos acima.',
      placeholder: 'Adicione informações extras relevantes'
    }
  ];

// ============================================
// GRANT RESPONSE (Resposta Gerada)
// ============================================

export interface GrantResponse {
  id: string;
  project_id: string;
  field_id: string;
  content: string;
  char_count: number;
  status: 'generating' | 'generated' | 'editing' | 'approved';
  versions: ResponseVersion[];
  created_at: string;
  updated_at: string;
}

export interface ResponseVersion {
  content: string;
  created_at: string;
}

// ============================================
// DTOs E PAYLOADS
// ============================================

export interface CreateOpportunityPayload {
  title: string;
  funding_agency: string;
  program_name?: string;
  edital_number?: string;
  min_funding?: number;
  max_funding?: number;
  counterpart_percentage?: number;
  submission_start?: string;
  submission_deadline: string;
  result_date?: string;
  eligible_themes?: string[];
  eligibility_requirements?: Record<string, any>;
  evaluation_criteria?: EvaluationCriterion[];
  form_fields?: FormField[];
  external_system_url?: string;
  edital_pdf_path?: string;
  edital_text_content?: string;
  // Google File Search document reference (for semantic search)
  file_search_document_id?: string;
}

export interface CreateProjectPayload {
  opportunity_id: string;
  project_name: string;
}

export interface UpdateBriefingPayload {
  briefing_data: Partial<BriefingData>;
}

export interface UpdateResponsePayload {
  content: string;
  status?: 'editing' | 'approved';
}

export interface GenerateFieldPayload {
  field_id: string;
  edital_text: string;
  evaluation_criteria: EvaluationCriterion[];
  field_config: FormField;
  briefing: Record<string, string>; // Campos dinâmicos do briefing
  previous_responses?: Record<string, string>;
  project_id?: string; // ID do projeto (para tracking de AI usage)
  source_document_content?: string | null; // Conteúdo dos documentos do projeto (PDF, MD, DOCX, TXT, CSV)
  edital_text_content?: string | null; // Conteúdo do PDF do edital (contexto compartilhado)
  opportunity_documents_content?: string | null; // Conteúdo dos documentos adicionais do edital (regulamentos, anexos, tabelas)
}

// ============================================
// VIEW MODELS (para UI)
// ============================================

export interface DashboardGrantStats {
  active_projects: number;
  upcoming_deadlines: GrantDeadline[];
  recently_updated: GrantProject[];
}

export interface GrantDeadline {
  opportunity_id: string;
  opportunity_title: string;
  deadline: string;
  days_remaining: number;
  has_active_project: boolean;
  project_id?: string;
}

// ============================================
// CONSTANTS
// ============================================

export const FUNDING_AGENCIES = [
  'FAPERJ',
  'FINEP',
  'BNDES',
  'FAPESP',
  'CNPq',
  'EMBRAPII',
  'SEBRAE',
  'Outro'
] as const;

export const ELIGIBLE_THEMES = [
  'Saúde',
  'Biotecnologia',
  'TI/Software',
  'Energia',
  'Sustentabilidade',
  'Agronegócio',
  'Manufatura',
  'Educação',
  'Outros'
] as const;

export const PROJECT_STATUS_LABELS: Record<GrantProject['status'], string> = {
  draft: 'Rascunho',
  briefing: 'Coletando Contexto',
  generating: 'Gerando Proposta',
  review: 'Em Revisão',
  submitted: 'Submetido',
  approved: 'Aprovado',
  rejected: 'Rejeitado'
};

export const RESPONSE_STATUS_LABELS: Record<GrantResponse['status'], string> = {
  generating: 'Gerando...',
  generated: 'Gerado',
  editing: 'Editando',
  approved: 'Aprovado'
};

// ============================================
// ORGANIZATIONS (Re-export from organizations.ts)
// ============================================

export type {
  OrganizationType,
  RelationshipType,
  BrandColors,
  SocialLinks,
  Organization,
  OrganizationRelationship,
  OrganizationMember,
  CreateOrganizationDTO,
  UpdateOrganizationDTO,
  CreateRelationshipDTO,
  CreateMemberDTO,
} from './organizations';

export {
  ORGANIZATION_TYPE_LABELS,
  RELATIONSHIP_TYPE_LABELS,
  AREAS_OF_ACTIVITY_OPTIONS,
} from './organizations';

// ============================================
// SPONSORSHIP (Re-export from sponsorship.ts)
// ============================================

export type {
  CaptureStatus,
  DeliverableCategory,
  SponsorStatus,
  ProjectApprovalFields,
  SponsorshipTier,
  TierDeliverable,
  ProjectSponsor,
  CreateSponsorshipTierDTO,
  UpdateSponsorshipTierDTO,
  CreateTierDeliverableDTO,
  UpdateTierDeliverableDTO,
  CreateProjectSponsorDTO,
  UpdateProjectSponsorDTO,
  UpdateProjectApprovalDTO,
  ProjectSponsorshipContext,
  CaptureProgress,
  TierAvailability,
} from './sponsorship';

export {
  CAPTURE_STATUS_LABELS,
  CAPTURE_STATUS_COLORS,
  DELIVERABLE_CATEGORY_LABELS,
  SPONSOR_STATUS_LABELS,
  SPONSOR_STATUS_COLORS,
  CONFIRMED_SPONSOR_STATUSES,
  SPONSOR_PIPELINE_ORDER,
} from './sponsorship';

// ============================================
// SPONSOR DECK (Re-export from sponsorDeck.ts)
// ============================================

export type {
  GenerateDeckRequest,
  DeckOptions,
  GenerateDeckResponse,
  GeneratedDeckContent,
  WhySponsorshipItem,
  SlideData,
  SlideType,
  CoverSlideContent,
  OrganizationSlideContent,
  ProjectSlideContent,
  PreviousEditionsSlideContent,
  ImpactSlideContent,
  IncentiveLawSlideContent,
  TiersSlideContent,
  DeliverablesSlideContent,
  WhySponsorSlideContent,
  ContactSlideContent,
  DeckTemplate,
  TemplateColors,
  TemplateFonts,
  DeckWizardStep,
  DeckWizardStepConfig,
  SlidePreview,
} from './sponsorDeck';

export {
  TEMPLATE_PROFESSIONAL,
  TEMPLATE_CREATIVE,
  TEMPLATE_INSTITUTIONAL,
  DECK_TEMPLATES,
  getTemplateById,
  DECK_WIZARD_STEPS,
  DEFAULT_SLIDE_STRUCTURE,
} from './sponsorDeck';

// ============================================
// PROSPECT CRM (Re-export from prospect.ts)
// ============================================

export type {
  ActivityType,
  ActivityOutcome,
  RecurrenceType,
  ProspectActivity,
  AttachmentInfo,
  ProspectReminder,
  CreateProspectActivityDTO,
  UpdateProspectActivityDTO,
  CreateProspectReminderDTO,
  UpdateProspectReminderDTO,
  PipelineConversionMetrics,
  PendingReminder,
  PipelineStats,
  ActivityFilters,
  PipelineKanbanData,
  PipelineColumn,
  KanbanSponsorCard,
} from './prospect';

export {
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_TYPE_ICONS,
  ACTIVITY_TYPE_COLORS,
  ACTIVITY_OUTCOME_LABELS,
  ACTIVITY_OUTCOME_COLORS,
  RECURRENCE_TYPE_LABELS,
} from './prospect';

// ============================================
// WIZARD (Re-export from wizard.ts)
// ============================================

export type {
  WizardStepId,
  WizardStep,
  WizardField,
  CompletionLevel,
  CompletionLevelConfig,
  FieldXPCategory,
  WizardState,
  WizardProgress,
  WizardAction,
} from './wizard';

export {
  COMPLETION_LEVELS,
  FIELD_XP_VALUES,
  STEP_COMPLETION_BONUS,
  WIZARD_COMPLETION_BONUS,
  WIZARD_STEPS,
  getCompletionLevel,
  calculateCompletionPercentage,
  calculateTotalXpPotential,
} from './wizard';

// ============================================
// PRESENTATION RAG (Re-export from presentationRAG.ts)
// ============================================

export type {
  TargetFocus,
  PresentationContext,
  OrganizationInfo,
  ProjectInfo,
  ImpactMetrics,
  DocumentSearchResult,
  GeneratedPresentation,
  GeneratedSlide,
  BuildContextOptions,
  GenerateSlideOptions,
  AudiencePromptConfig,
  FieldExtractionConfig,
  ValidationResult,
  GenerationStats,
  ContextBuildError,
  ContentGenerationError,
} from './presentationRAG';
