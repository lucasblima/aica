/**
 * Prospect CRM Service
 * Issue #101 - Sistema de prospeccao e CRM de patrocinadores
 *
 * @module modules/grants/services/prospectService
 */

import { supabase } from '@/services/supabaseClient';
import type {
  ProspectActivity,
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
  KanbanSponsorCard,
  ActivityType,
} from '../types/prospect';
import type { ProjectSponsor, SponsorStatus } from '../types/sponsorship';
import {
  SPONSOR_STATUS_LABELS,
  SPONSOR_STATUS_COLORS,
  SPONSOR_PIPELINE_ORDER,
  CONFIRMED_SPONSOR_STATUSES,
} from '../types/sponsorship';

// =============================================================================
// PROSPECT ACTIVITIES CRUD
// =============================================================================

/**
 * Buscar atividades de um patrocinador
 */
export async function getSponsorActivities(sponsorId: string): Promise<ProspectActivity[]> {
  const { data, error } = await supabase
    .from('prospect_activities')
    .select('*')
    .eq('sponsor_id', sponsorId)
    .order('activity_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Buscar atividades com filtros
 */
export async function getActivities(filters: ActivityFilters): Promise<ProspectActivity[]> {
  let query = supabase
    .from('prospect_activities')
    .select(`
      *,
      sponsor:project_sponsors(
        id, company_name, contact_name, status,
        tier:sponsorship_tiers(name),
        project:grant_projects(project_name)
      )
    `)
    .order('activity_date', { ascending: false });

  if (filters.sponsor_id) {
    query = query.eq('sponsor_id', filters.sponsor_id);
  }

  if (filters.activity_type && filters.activity_type.length > 0) {
    query = query.in('activity_type', filters.activity_type);
  }

  if (filters.outcome && filters.outcome.length > 0) {
    query = query.in('outcome', filters.outcome);
  }

  if (filters.date_from) {
    query = query.gte('activity_date', filters.date_from);
  }

  if (filters.date_to) {
    query = query.lte('activity_date', filters.date_to);
  }

  if (filters.has_next_action !== undefined) {
    if (filters.has_next_action) {
      query = query.not('next_action', 'is', null);
    } else {
      query = query.is('next_action', null);
    }
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Buscar atividades de um projeto (via sponsors)
 */
export async function getProjectActivities(projectId: string): Promise<ProspectActivity[]> {
  const { data, error } = await supabase
    .from('prospect_activities')
    .select(`
      *,
      sponsor:project_sponsors!inner(
        id, company_name, contact_name, status, project_id,
        tier:sponsorship_tiers(name)
      )
    `)
    .eq('sponsor.project_id', projectId)
    .order('activity_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Buscar uma atividade por ID
 */
export async function getActivityById(activityId: string): Promise<ProspectActivity | null> {
  const { data, error } = await supabase
    .from('prospect_activities')
    .select(`
      *,
      sponsor:project_sponsors(
        id, company_name, contact_name, status,
        tier:sponsorship_tiers(name),
        project:grant_projects(project_name)
      )
    `)
    .eq('id', activityId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

/**
 * Criar uma nova atividade
 */
export async function createActivity(dto: CreateProspectActivityDTO): Promise<ProspectActivity> {
  const { data, error } = await supabase
    .from('prospect_activities')
    .insert({
      ...dto,
      attachments: dto.attachments || [],
      activity_date: dto.activity_date || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Atualizar uma atividade
 */
export async function updateActivity(
  activityId: string,
  dto: UpdateProspectActivityDTO
): Promise<ProspectActivity> {
  const { data, error } = await supabase
    .from('prospect_activities')
    .update(dto)
    .eq('id', activityId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Deletar uma atividade
 */
export async function deleteActivity(activityId: string): Promise<void> {
  const { error } = await supabase
    .from('prospect_activities')
    .delete()
    .eq('id', activityId);

  if (error) throw error;
}

// =============================================================================
// PROSPECT REMINDERS CRUD
// =============================================================================

/**
 * Buscar lembretes de um patrocinador
 */
export async function getSponsorReminders(sponsorId: string): Promise<ProspectReminder[]> {
  const { data, error } = await supabase
    .from('prospect_reminders')
    .select('*')
    .eq('sponsor_id', sponsorId)
    .order('remind_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Buscar lembretes pendentes do usuario
 */
export async function getPendingReminders(daysAhead: number = 7): Promise<PendingReminder[]> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Usuario nao autenticado');

  const { data, error } = await supabase.rpc('get_pending_reminders', {
    p_user_id: userData.user.id,
    p_days_ahead: daysAhead,
  });

  if (error) throw error;
  return data || [];
}

/**
 * Criar um lembrete
 */
export async function createReminder(dto: CreateProspectReminderDTO): Promise<ProspectReminder> {
  const { data, error } = await supabase
    .from('prospect_reminders')
    .insert(dto)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Atualizar um lembrete
 */
export async function updateReminder(
  reminderId: string,
  dto: UpdateProspectReminderDTO
): Promise<ProspectReminder> {
  const { data, error } = await supabase
    .from('prospect_reminders')
    .update(dto)
    .eq('id', reminderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Marcar lembrete como concluido
 */
export async function completeReminder(reminderId: string): Promise<ProspectReminder> {
  const { data, error } = await supabase
    .from('prospect_reminders')
    .update({
      is_completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq('id', reminderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Deletar um lembrete
 */
export async function deleteReminder(reminderId: string): Promise<void> {
  const { error } = await supabase
    .from('prospect_reminders')
    .delete()
    .eq('id', reminderId);

  if (error) throw error;
}

// =============================================================================
// PIPELINE METRICS
// =============================================================================

/**
 * Buscar metricas de conversao do pipeline
 */
export async function getConversionMetrics(projectId: string): Promise<PipelineConversionMetrics[]> {
  const { data, error } = await supabase.rpc('get_prospect_conversion_metrics', {
    p_project_id: projectId,
  });

  if (error) throw error;
  return data || [];
}

/**
 * Buscar estatisticas do pipeline para dashboard
 */
export async function getPipelineStats(projectId: string): Promise<PipelineStats> {
  // Buscar todos os sponsors do projeto
  const { data: sponsors, error } = await supabase
    .from('project_sponsors')
    .select(`
      id, status, negotiated_value, created_at, status_changed_at,
      tier:sponsorship_tiers(value)
    `)
    .eq('project_id', projectId);

  if (error) throw error;

  const sponsorList = sponsors || [];
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Calcular estatisticas
  const total_prospects = sponsorList.length;

  const negotiatingStatuses: SponsorStatus[] = ['negotiating', 'proposal_sent', 'meeting_scheduled'];
  const active_negotiations = sponsorList.filter(s =>
    negotiatingStatuses.includes(s.status as SponsorStatus)
  ).length;

  // Lembretes pendentes (aproximacao - contando sponsors com next_action_date)
  const pending_follow_ups = sponsorList.filter(s => s.status === 'contacted').length;

  // Taxa de conversao: confirmados / total
  const confirmed = sponsorList.filter(s =>
    CONFIRMED_SPONSOR_STATUSES.includes(s.status as SponsorStatus)
  ).length;
  const conversion_rate = total_prospects > 0 ? (confirmed / total_prospects) * 100 : 0;

  // Valor total do pipeline
  const total_pipeline_value = sponsorList.reduce((sum, s) => {
    const value = s.negotiated_value || s.tier?.value || 0;
    return sum + value;
  }, 0);

  // Ganhos/perdas este mes
  const won_this_month = sponsorList.filter(s => {
    if (!CONFIRMED_SPONSOR_STATUSES.includes(s.status as SponsorStatus)) return false;
    const changedAt = s.status_changed_at ? new Date(s.status_changed_at) : null;
    return changedAt && changedAt >= startOfMonth;
  }).length;

  const lost_this_month = sponsorList.filter(s => {
    if (!['declined', 'churned'].includes(s.status)) return false;
    const changedAt = s.status_changed_at ? new Date(s.status_changed_at) : null;
    return changedAt && changedAt >= startOfMonth;
  }).length;

  return {
    total_prospects,
    active_negotiations,
    pending_follow_ups,
    conversion_rate: Math.round(conversion_rate * 100) / 100,
    total_pipeline_value,
    won_this_month,
    lost_this_month,
  };
}

// =============================================================================
// KANBAN DATA
// =============================================================================

/**
 * Buscar dados para o Kanban do pipeline
 */
export async function getPipelineKanbanData(projectId: string): Promise<PipelineKanbanData> {
  // Buscar sponsors com ultima atividade
  const { data: sponsors, error } = await supabase
    .from('project_sponsors')
    .select(`
      id, company_name, contact_name, status, negotiated_value,
      next_action, next_action_date, created_at, status_changed_at,
      tier:sponsorship_tiers(name, value, color)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const sponsorList = sponsors || [];

  // Buscar ultima atividade de cada sponsor
  const sponsorIds = sponsorList.map(s => s.id);
  let lastActivities: Record<string, { date: string; type: ActivityType }> = {};

  if (sponsorIds.length > 0) {
    const { data: activities } = await supabase
      .from('prospect_activities')
      .select('sponsor_id, activity_date, activity_type')
      .in('sponsor_id', sponsorIds)
      .order('activity_date', { ascending: false });

    if (activities) {
      for (const activity of activities) {
        if (!lastActivities[activity.sponsor_id]) {
          lastActivities[activity.sponsor_id] = {
            date: activity.activity_date,
            type: activity.activity_type as ActivityType,
          };
        }
      }
    }
  }

  // Criar colunas do Kanban (apenas status ativos do pipeline)
  const activeStatuses = SPONSOR_PIPELINE_ORDER.filter(
    status => !['declined', 'churned'].includes(status)
  );

  const columns = activeStatuses.map(status => {
    const statusSponsors = sponsorList.filter(s => s.status === status);

    const cards: KanbanSponsorCard[] = statusSponsors.map(s => {
      const now = new Date();
      const stageStart = s.status_changed_at ? new Date(s.status_changed_at) : new Date(s.created_at);
      const daysInStage = Math.floor((now.getTime() - stageStart.getTime()) / (1000 * 60 * 60 * 24));

      return {
        id: s.id,
        company_name: s.company_name,
        contact_name: s.contact_name,
        tier_name: s.tier?.name || 'Sem cota',
        tier_color: s.tier?.color || null,
        value: s.negotiated_value || s.tier?.value || 0,
        status: s.status,
        last_activity_date: lastActivities[s.id]?.date || null,
        last_activity_type: lastActivities[s.id]?.type || null,
        next_action: s.next_action,
        next_action_date: s.next_action_date,
        days_in_stage: daysInStage,
      };
    });

    const total_value = cards.reduce((sum, c) => sum + c.value, 0);

    return {
      id: status,
      title: SPONSOR_STATUS_LABELS[status as SponsorStatus],
      color: SPONSOR_STATUS_COLORS[status as SponsorStatus],
      sponsors: cards,
      total_value,
    };
  });

  const total_value = columns.reduce((sum, col) => sum + col.total_value, 0);
  const total_count = sponsorList.length;

  return {
    columns,
    total_value,
    total_count,
  };
}

/**
 * Mover sponsor para outro status (drag and drop)
 */
export async function moveSponsorToStatus(
  sponsorId: string,
  newStatus: SponsorStatus
): Promise<ProjectSponsor> {
  const { data, error } = await supabase
    .from('project_sponsors')
    .update({
      status: newStatus,
      status_changed_at: new Date().toISOString(),
    })
    .eq('id', sponsorId)
    .select(`
      *,
      tier:sponsorship_tiers(id, name, value, color),
      organization:organizations(id, name, logo_url)
    `)
    .single();

  if (error) throw error;
  return data;
}

// =============================================================================
// QUICK ACTIONS
// =============================================================================

/**
 * Registrar atividade rapida e atualizar status
 */
export async function logActivityAndUpdateStatus(
  sponsorId: string,
  activityType: ActivityType,
  title: string,
  newStatus?: SponsorStatus,
  nextAction?: string,
  nextActionDate?: string
): Promise<{ activity: ProspectActivity; sponsor?: ProjectSponsor }> {
  // Criar atividade
  const activity = await createActivity({
    sponsor_id: sponsorId,
    activity_type: activityType,
    title,
    next_action: nextAction,
    next_action_date: nextActionDate,
  });

  let sponsor: ProjectSponsor | undefined;

  // Atualizar status se fornecido
  if (newStatus) {
    const { data, error } = await supabase
      .from('project_sponsors')
      .update({
        status: newStatus,
        status_changed_at: new Date().toISOString(),
        next_action: nextAction ?? null,
        next_action_date: nextActionDate ?? null,
      })
      .eq('id', sponsorId)
      .select(`
        *,
        tier:sponsorship_tiers(id, name, value, color),
        organization:organizations(id, name, logo_url)
      `)
      .single();

    if (error) throw error;
    sponsor = data;
  }

  return { activity, sponsor };
}

/**
 * Buscar atividades recentes do usuario (para dashboard)
 */
export async function getRecentActivities(limit: number = 10): Promise<ProspectActivity[]> {
  const { data, error } = await supabase
    .from('prospect_activities')
    .select(`
      *,
      sponsor:project_sponsors(
        id, company_name, contact_name, status,
        tier:sponsorship_tiers(name),
        project:grant_projects(project_name)
      )
    `)
    .order('activity_date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}
