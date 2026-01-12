/**
 * Prospect CRM Types - TypeScript Types
 * Issue #101 - Sistema de prospeccao e CRM de patrocinadores
 *
 * @module modules/grants/types/prospect
 */

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/** Tipo de atividade de prospeccao */
export type ActivityType =
  | 'email_sent'
  | 'email_received'
  | 'call_outbound'
  | 'call_inbound'
  | 'meeting'
  | 'proposal_sent'
  | 'follow_up'
  | 'negotiation'
  | 'contract_sent'
  | 'contract_signed'
  | 'note'
  | 'other';

/** Resultado de uma atividade */
export type ActivityOutcome =
  | 'positive'
  | 'negative'
  | 'neutral'
  | 'pending';

/** Tipo de recorrencia de lembrete */
export type RecurrenceType =
  | 'daily'
  | 'weekly'
  | 'monthly';

// =============================================================================
// LABELS & COLORS FOR UI
// =============================================================================

/** Labels para tipos de atividade */
export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  email_sent: 'E-mail Enviado',
  email_received: 'E-mail Recebido',
  call_outbound: 'Ligacao Realizada',
  call_inbound: 'Ligacao Recebida',
  meeting: 'Reuniao',
  proposal_sent: 'Proposta Enviada',
  follow_up: 'Follow-up',
  negotiation: 'Negociacao',
  contract_sent: 'Contrato Enviado',
  contract_signed: 'Contrato Assinado',
  note: 'Anotacao',
  other: 'Outro',
};

/** Icones para tipos de atividade (Lucide icons) */
export const ACTIVITY_TYPE_ICONS: Record<ActivityType, string> = {
  email_sent: 'Send',
  email_received: 'Mail',
  call_outbound: 'PhoneOutgoing',
  call_inbound: 'PhoneIncoming',
  meeting: 'Users',
  proposal_sent: 'FileText',
  follow_up: 'RefreshCw',
  negotiation: 'MessageSquare',
  contract_sent: 'FileSignature',
  contract_signed: 'CheckCircle',
  note: 'StickyNote',
  other: 'MoreHorizontal',
};

/** Cores para tipos de atividade */
export const ACTIVITY_TYPE_COLORS: Record<ActivityType, string> = {
  email_sent: '#3b82f6', // blue-500
  email_received: '#06b6d4', // cyan-500
  call_outbound: '#8b5cf6', // violet-500
  call_inbound: '#a855f7', // purple-500
  meeting: '#f59e0b', // amber-500
  proposal_sent: '#10b981', // emerald-500
  follow_up: '#6366f1', // indigo-500
  negotiation: '#ec4899', // pink-500
  contract_sent: '#14b8a6', // teal-500
  contract_signed: '#22c55e', // green-500
  note: '#6b7280', // gray-500
  other: '#9ca3af', // gray-400
};

/** Labels para resultado de atividade */
export const ACTIVITY_OUTCOME_LABELS: Record<ActivityOutcome, string> = {
  positive: 'Positivo',
  negative: 'Negativo',
  neutral: 'Neutro',
  pending: 'Pendente',
};

/** Cores para resultado de atividade */
export const ACTIVITY_OUTCOME_COLORS: Record<ActivityOutcome, string> = {
  positive: '#22c55e', // green-500
  negative: '#ef4444', // red-500
  neutral: '#6b7280', // gray-500
  pending: '#f59e0b', // amber-500
};

/** Labels para recorrencia */
export const RECURRENCE_TYPE_LABELS: Record<RecurrenceType, string> = {
  daily: 'Diario',
  weekly: 'Semanal',
  monthly: 'Mensal',
};

// =============================================================================
// PROSPECT ACTIVITY (Atividade de Prospeccao)
// =============================================================================

/**
 * Atividade de prospeccao
 *
 * Representa uma interacao com um patrocinador potencial
 */
export interface ProspectActivity {
  id: string;
  sponsor_id: string;
  user_id: string;

  // Tipo
  activity_type: ActivityType;

  // Conteudo
  title: string;
  description: string | null;
  outcome: ActivityOutcome | null;

  // Proxima acao
  next_action: string | null;
  next_action_date: string | null;

  // Metadata
  duration_minutes: number | null;
  attachments: AttachmentInfo[];

  // Timestamps
  activity_date: string;
  created_at: string;
  updated_at: string;

  // Relacoes (carregadas via join)
  sponsor?: {
    id: string;
    company_name: string | null;
    contact_name: string | null;
    status: string;
    tier?: {
      name: string;
    };
    project?: {
      project_name: string;
    };
  };
}

/** Informacao de anexo */
export interface AttachmentInfo {
  name: string;
  url: string;
  type: string;
  size_bytes?: number;
}

// =============================================================================
// PROSPECT REMINDER (Lembrete de Follow-up)
// =============================================================================

/**
 * Lembrete de follow-up
 *
 * Representa um lembrete agendado para um patrocinador
 */
export interface ProspectReminder {
  id: string;
  sponsor_id: string;
  user_id: string;
  activity_id: string | null;

  // Conteudo
  title: string;
  description: string | null;

  // Agendamento
  remind_at: string;
  is_completed: boolean;
  completed_at: string | null;

  // Recorrencia
  recurrence_type: RecurrenceType | null;
  recurrence_end_date: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Relacoes (carregadas via join)
  sponsor?: {
    id: string;
    company_name: string | null;
    contact_name: string | null;
    project?: {
      project_name: string;
    };
  };
}

// =============================================================================
// DTO TYPES
// =============================================================================

/**
 * Payload para criar uma atividade
 */
export interface CreateProspectActivityDTO {
  sponsor_id: string;
  activity_type: ActivityType;
  title: string;
  description?: string;
  outcome?: ActivityOutcome;
  next_action?: string;
  next_action_date?: string;
  duration_minutes?: number;
  attachments?: AttachmentInfo[];
  activity_date?: string;
}

/**
 * Payload para atualizar uma atividade
 */
export type UpdateProspectActivityDTO = Partial<Omit<CreateProspectActivityDTO, 'sponsor_id'>>;

/**
 * Payload para criar um lembrete
 */
export interface CreateProspectReminderDTO {
  sponsor_id: string;
  activity_id?: string;
  title: string;
  description?: string;
  remind_at: string;
  recurrence_type?: RecurrenceType;
  recurrence_end_date?: string;
}

/**
 * Payload para atualizar um lembrete
 */
export type UpdateProspectReminderDTO = Partial<Omit<CreateProspectReminderDTO, 'sponsor_id'>>;

// =============================================================================
// VIEW MODELS (para UI)
// =============================================================================

/**
 * Metricas de conversao do pipeline
 */
export interface PipelineConversionMetrics {
  stage: string;
  count: number;
  total_value: number;
  conversion_rate: number;
  avg_time_days: number | null;
}

/**
 * Lembrete pendente com contexto
 */
export interface PendingReminder {
  reminder_id: string;
  sponsor_id: string;
  company_name: string | null;
  contact_name: string | null;
  project_name: string;
  title: string;
  description: string | null;
  remind_at: string;
  days_until: number;
}

/**
 * Estatisticas do pipeline para dashboard
 */
export interface PipelineStats {
  total_prospects: number;
  active_negotiations: number;
  pending_follow_ups: number;
  conversion_rate: number;
  total_pipeline_value: number;
  won_this_month: number;
  lost_this_month: number;
}

/**
 * Filtros para busca de atividades
 */
export interface ActivityFilters {
  sponsor_id?: string;
  project_id?: string;
  activity_type?: ActivityType[];
  outcome?: ActivityOutcome[];
  date_from?: string;
  date_to?: string;
  has_next_action?: boolean;
}

/**
 * Agrupamento de patrocinadores por status (para Kanban)
 */
export interface PipelineKanbanData {
  columns: PipelineColumn[];
  total_value: number;
  total_count: number;
}

/**
 * Coluna do Kanban
 */
export interface PipelineColumn {
  id: string;
  title: string;
  color: string;
  sponsors: KanbanSponsorCard[];
  total_value: number;
}

/**
 * Card de patrocinador para o Kanban
 */
export interface KanbanSponsorCard {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  tier_name: string;
  tier_color: string | null;
  value: number;
  status: string;
  last_activity_date: string | null;
  last_activity_type: ActivityType | null;
  next_action: string | null;
  next_action_date: string | null;
  days_in_stage: number;
}
