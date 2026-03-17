/**
 * Sponsorship Types - TypeScript Types
 * Issue #97 - Sistema de cotas de patrocinio para projetos aprovados
 *
 * @module modules/grants/types/sponsorship
 */

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/** Status de captacao do projeto */
export type CaptureStatus =
  | 'not_started'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'cancelled';

/** Categoria de contrapartida */
export type DeliverableCategory =
  | 'logo_exposure'
  | 'media_mention'
  | 'event_presence'
  | 'content_production'
  | 'networking'
  | 'report_access'
  | 'exclusive_experience'
  | 'product_sample'
  | 'other';

/** Status do patrocinador no funil */
export type SponsorStatus =
  | 'lead'
  | 'contacted'
  | 'meeting_scheduled'
  | 'proposal_sent'
  | 'negotiating'
  | 'committed'
  | 'contract_signed'
  | 'payment_pending'
  | 'payment_partial'
  | 'payment_complete'
  | 'declined'
  | 'churned';

// =============================================================================
// LABELS & COLORS FOR UI
// =============================================================================

/** Labels para status de captacao */
export const CAPTURE_STATUS_LABELS: Record<CaptureStatus, string> = {
  not_started: 'Não Iniciada',
  in_progress: 'Em Captacao',
  paused: 'Pausada',
  completed: 'Concluida',
  cancelled: 'Cancelada',
};

/** Cores para status de captacao */
export const CAPTURE_STATUS_COLORS: Record<CaptureStatus, string> = {
  not_started: '#6b7280', // gray-500
  in_progress: '#2563eb', // blue-600
  paused: '#f59e0b', // amber-500
  completed: '#10b981', // emerald-500
  cancelled: '#ef4444', // red-500
};

/** Labels para categorias de contrapartida */
export const DELIVERABLE_CATEGORY_LABELS: Record<DeliverableCategory, string> = {
  logo_exposure: 'Exposicao de Logo',
  media_mention: 'Menção em Mídia',
  event_presence: 'Presenca em Evento',
  content_production: 'Produção de Conteúdo',
  networking: 'Networking',
  report_access: 'Acesso a Relatorios',
  exclusive_experience: 'Experiência Exclusiva',
  product_sample: 'Amostra de Produto',
  other: 'Outra',
};

/** Labels para status de patrocinador */
export const SPONSOR_STATUS_LABELS: Record<SponsorStatus, string> = {
  lead: 'Lead',
  contacted: 'Contatado',
  meeting_scheduled: 'Reunião Agendada',
  proposal_sent: 'Proposta Enviada',
  negotiating: 'Em Negociacao',
  committed: 'Comprometido',
  contract_signed: 'Contrato Assinado',
  payment_pending: 'Aguardando Pagamento',
  payment_partial: 'Pagamento Parcial',
  payment_complete: 'Pago',
  declined: 'Recusado',
  churned: 'Desistiu',
};

/** Cores para status de patrocinador */
export const SPONSOR_STATUS_COLORS: Record<SponsorStatus, string> = {
  lead: '#9ca3af', // gray-400
  contacted: '#60a5fa', // blue-400
  meeting_scheduled: '#a78bfa', // violet-400
  proposal_sent: '#818cf8', // indigo-400
  negotiating: '#f472b6', // pink-400
  committed: '#fbbf24', // amber-400
  contract_signed: '#34d399', // emerald-400
  payment_pending: '#fb923c', // orange-400
  payment_partial: '#a3e635', // lime-400
  payment_complete: '#10b981', // emerald-500
  declined: '#f87171', // red-400
  churned: '#6b7280', // gray-500
};

/** Status que contam como patrocinio confirmado (para calculo de captacao) */
export const CONFIRMED_SPONSOR_STATUSES: SponsorStatus[] = [
  'committed',
  'contract_signed',
  'payment_pending',
  'payment_partial',
  'payment_complete',
];

/** Ordem do pipeline de vendas para Kanban */
export const SPONSOR_PIPELINE_ORDER: SponsorStatus[] = [
  'lead',
  'contacted',
  'meeting_scheduled',
  'proposal_sent',
  'negotiating',
  'committed',
  'contract_signed',
  'payment_pending',
  'payment_partial',
  'payment_complete',
];

// =============================================================================
// GRANT PROJECT APPROVAL FIELDS (extends GrantProject)
// =============================================================================

/**
 * Campos adicionais para projetos aprovados com captacao
 * Estes campos sao adicionados a tabela grant_projects via ALTER TABLE
 */
export interface ProjectApprovalFields {
  // Aprovacao
  approved_value: number | null;
  approval_date: string | null;
  approval_number: string | null;
  validity_start: string | null;
  validity_end: string | null;

  // Captacao
  capture_status: CaptureStatus;
  captured_value: number;
  capture_goal: number | null;
  capture_deadline: string | null;

  // Referencias
  incentive_law_id: string | null;
  proponent_organization_id: string | null;
  executor_organization_id: string | null;
}

// =============================================================================
// SPONSORSHIP TIER (Cota de Patrocinio)
// =============================================================================

/**
 * Cota de patrocinio
 *
 * Representa uma faixa de patrocinio com valor, quantidade e contrapartidas
 */
export interface SponsorshipTier {
  id: string;
  project_id: string;
  user_id: string;

  // Identificacao
  name: string;
  description: string | null;

  // Valores
  value: number;
  quantity_total: number;
  quantity_sold: number;

  // Ordenacao
  display_order: number;

  // Estilo visual
  color: string | null;
  icon: string | null;

  // Configurações
  is_active: boolean;
  is_highlighted: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Relacoes (carregadas via join)
  deliverables?: TierDeliverable[];
}

// =============================================================================
// TIER DELIVERABLE (Contrapartida)
// =============================================================================

/**
 * Contrapartida de uma cota de patrocinio
 *
 * Descreve o que o patrocinador recebe ao adquirir a cota
 */
export interface TierDeliverable {
  id: string;
  tier_id: string;

  // Conteúdo
  category: DeliverableCategory;
  title: string;
  description: string | null;
  quantity: number | null;

  // Ordenacao
  display_order: number;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// =============================================================================
// PROJECT SPONSOR (Patrocinador do Projeto)
// =============================================================================

/**
 * Patrocinador de um projeto
 *
 * Representa um patrocinador vinculado a uma cota, com status de funil e pagamentos
 */
export interface ProjectSponsor {
  id: string;
  project_id: string;
  tier_id: string;
  user_id: string;

  // Patrocinador
  organization_id: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  company_name: string | null;

  // Pipeline
  status: SponsorStatus;
  status_changed_at: string;
  next_action: string | null;
  next_action_date: string | null;

  // Valores
  negotiated_value: number | null;
  paid_value: number;
  payment_due_date: string | null;

  // Notas
  notes: string | null;
  internal_notes: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Relacoes (carregadas via join)
  tier?: SponsorshipTier;
  organization?: {
    id: string;
    name: string;
    logo_url: string | null;
  };
}

// =============================================================================
// DTO TYPES
// =============================================================================

/**
 * Payload para criar uma cota de patrocinio
 */
export interface CreateSponsorshipTierDTO {
  project_id: string;
  name: string;
  description?: string;
  value: number;
  quantity_total: number;
  display_order?: number;
  color?: string;
  icon?: string;
  is_active?: boolean;
  is_highlighted?: boolean;
}

/**
 * Payload para atualizar uma cota de patrocinio
 */
export type UpdateSponsorshipTierDTO = Partial<Omit<CreateSponsorshipTierDTO, 'project_id'>>;

/**
 * Payload para criar uma contrapartida
 */
export interface CreateTierDeliverableDTO {
  tier_id: string;
  category: DeliverableCategory;
  title: string;
  description?: string;
  quantity?: number;
  display_order?: number;
}

/**
 * Payload para atualizar uma contrapartida
 */
export type UpdateTierDeliverableDTO = Partial<Omit<CreateTierDeliverableDTO, 'tier_id'>>;

/**
 * Payload para criar um patrocinador
 */
export interface CreateProjectSponsorDTO {
  project_id: string;
  tier_id: string;
  organization_id?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  company_name?: string;
  status?: SponsorStatus;
  negotiated_value?: number;
  notes?: string;
}

/**
 * Payload para atualizar um patrocinador
 */
export type UpdateProjectSponsorDTO = Partial<
  Omit<CreateProjectSponsorDTO, 'project_id' | 'tier_id'>
>;

/**
 * Payload para atualizar campos de aprovacao do projeto
 */
export interface UpdateProjectApprovalDTO {
  approved_value?: number;
  approval_date?: string;
  approval_number?: string;
  validity_start?: string;
  validity_end?: string;
  capture_status?: CaptureStatus;
  capture_goal?: number;
  capture_deadline?: string;
  incentive_law_id?: string;
  proponent_organization_id?: string;
  executor_organization_id?: string;
}

// =============================================================================
// VIEW MODELS (para UI)
// =============================================================================

/**
 * Contexto completo de captacao para IA
 */
export interface ProjectSponsorshipContext {
  project_id: string;
  project_name: string;

  // Aprovacao
  approved_value: number | null;
  approval_date: string | null;
  approval_number: string | null;
  validity_start: string | null;
  validity_end: string | null;

  // Lei de incentivo
  incentive_law: {
    id: string;
    name: string;
    short_name: string;
    tax_type: string;
  } | null;

  // Organizações
  proponent: {
    id: string;
    name: string;
    document_number: string | null;
  } | null;
  executor: {
    id: string;
    name: string;
    document_number: string | null;
  } | null;

  // Captacao
  capture_status: CaptureStatus;
  capture_goal: number | null;
  capture_deadline: string | null;
  captured_value: number;
  capture_percentage: number;

  // Cotas
  tiers: Array<{
    id: string;
    name: string;
    value: number;
    quantity_total: number;
    quantity_sold: number;
    quantity_available: number;
    total_potential_value: number;
    deliverables: string[];
  }>;

  // Patrocinadores por status
  sponsors_by_status: Record<SponsorStatus, number>;
  total_sponsors: number;
  confirmed_sponsors: number;
  confirmed_value: number;
}

/**
 * Progresso de captacao para dashboard
 */
export interface CaptureProgress {
  project_id: string;
  capture_status: CaptureStatus;
  capture_goal: number | null;
  captured_value: number;
  capture_percentage: number;
  days_remaining: number | null;
  tiers_summary: {
    total_tiers: number;
    sold_out_tiers: number;
    available_value: number;
  };
  sponsors_summary: {
    total: number;
    confirmed: number;
    pending_payment: number;
    leads: number;
  };
}

/**
 * Disponibilidade de cotas
 */
export interface TierAvailability {
  tier_id: string;
  tier_name: string;
  value: number;
  quantity_total: number;
  quantity_sold: number;
  quantity_available: number;
  is_available: boolean;
  total_value: number;
  sold_value: number;
  available_value: number;
}
