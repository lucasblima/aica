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
  document_type: 'md' | 'pdf' | 'txt' | 'docx';
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

export interface BriefingData {
  company_context?: string;
  project_description?: string;
  technical_innovation?: string;
  market_differential?: string;
  team_expertise?: string;
  expected_results?: string;
  sustainability?: string;
  additional_notes?: string;
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
    placeholder: 'Ex: Somos uma startup de biotecnologia fundada em 2020, focada em...'
  },
  {
    id: 'project_description',
    title: 'Descrição do Projeto',
    icon: Lightbulb,
    help: 'Explique o que você pretende desenvolver com este financiamento.',
    placeholder: 'Ex: Desenvolveremos uma plataforma de IA para diagnóstico precoce de...'
  },
  {
    id: 'technical_innovation',
    title: 'Inovação Técnica',
    icon: Rocket,
    help: 'Qual é o diferencial tecnológico? O que torna este projeto inovador?',
    placeholder: 'Ex: Nossa solução utiliza machine learning com algoritmos proprietários que...'
  },
  {
    id: 'market_differential',
    title: 'Diferencial de Mercado',
    icon: TrendingUp,
    help: 'Por que este projeto tem potencial de mercado? Quem são os clientes?',
    placeholder: 'Ex: O mercado brasileiro de diagnósticos movimenta R$ X bilhões, e nossa solução...'
  },
  {
    id: 'team_expertise',
    title: 'Expertise da Equipe',
    icon: Users,
    help: 'Quem são as pessoas-chave do projeto? Formação, experiência, realizações.',
    placeholder: 'Ex: Nossa equipe conta com 3 PhDs em bioinformática, com publicações em...'
  },
  {
    id: 'expected_results',
    title: 'Resultados Esperados',
    icon: Target,
    help: 'O que você pretende alcançar ao final do projeto? Metas quantificáveis.',
    placeholder: 'Ex: Esperamos desenvolver um MVP funcional, validar com 100 pacientes, e atingir...'
  },
  {
    id: 'sustainability',
    title: 'Sustentabilidade',
    icon: Leaf,
    help: 'Como o projeto se sustentará financeiramente após o fomento?',
    placeholder: 'Ex: Nosso modelo de receita prevê assinatura mensal de hospitais, com projeção de...'
  },
  {
    id: 'additional_notes',
    title: 'Informações Adicionais',
    icon: FileText,
    help: 'Qualquer outra informação relevante que não se encaixou nos campos acima.',
    placeholder: 'Ex: Já temos parcerias firmadas com..., prêmios recebidos...'
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
  briefing: BriefingData;
  previous_responses?: Record<string, string>;
  source_document_content?: string | null; // Conteúdo do documento fonte (PDF, MD, DOCX, TXT)
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
