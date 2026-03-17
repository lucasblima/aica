/**
 * Prospect CRM Hooks
 * Issue #101 - Sistema de prospeccao e CRM de patrocinadores
 *
 * @module modules/grants/hooks/useProspect
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import * as prospectService from '../services/prospectService';
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
  ActivityType,
} from '../types/prospect';
import type { SponsorStatus } from '../types/sponsorship';

// =============================================================================
// useProspectActivities - Gerenciar atividades de um patrocinador
// =============================================================================

export function useProspectActivities(sponsorId: string | null) {
  const [activities, setActivities] = useState<ProspectActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar atividades
  const loadActivities = useCallback(async () => {
    if (!sponsorId) {
      setActivities([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await prospectService.getSponsorActivities(sponsorId);
      setActivities(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar atividades';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [sponsorId]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  // Adicionar atividade
  const addActivity = useCallback(async (dto: Omit<CreateProspectActivityDTO, 'sponsor_id'>) => {
    if (!sponsorId) throw new Error('Sponsor ID não definido');

    try {
      setError(null);
      const newActivity = await prospectService.createActivity({
        ...dto,
        sponsor_id: sponsorId,
      });
      setActivities((prev) => [newActivity, ...prev]);
      return newActivity;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar atividade';
      setError(message);
      throw err;
    }
  }, [sponsorId]);

  // Atualizar atividade
  const updateActivity = useCallback(async (
    activityId: string,
    dto: UpdateProspectActivityDTO
  ) => {
    try {
      setError(null);
      const updated = await prospectService.updateActivity(activityId, dto);
      setActivities((prev) =>
        prev.map((a) => (a.id === activityId ? updated : a))
      );
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar atividade';
      setError(message);
      throw err;
    }
  }, []);

  // Remover atividade
  const removeActivity = useCallback(async (activityId: string) => {
    try {
      setError(null);
      await prospectService.deleteActivity(activityId);
      setActivities((prev) => prev.filter((a) => a.id !== activityId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover atividade';
      setError(message);
      throw err;
    }
  }, []);

  // Estatisticas derivadas
  const stats = useMemo(() => {
    const total = activities.length;
    const byType: Record<string, number> = {};
    const byOutcome: Record<string, number> = {};

    for (const activity of activities) {
      byType[activity.activity_type] = (byType[activity.activity_type] || 0) + 1;
      if (activity.outcome) {
        byOutcome[activity.outcome] = (byOutcome[activity.outcome] || 0) + 1;
      }
    }

    return { total, byType, byOutcome };
  }, [activities]);

  return {
    activities,
    loading,
    error,
    stats,
    refresh: loadActivities,
    addActivity,
    updateActivity,
    removeActivity,
  };
}

// =============================================================================
// useProspectReminders - Gerenciar lembretes de um patrocinador
// =============================================================================

export function useProspectReminders(sponsorId: string | null) {
  const [reminders, setReminders] = useState<ProspectReminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar lembretes
  const loadReminders = useCallback(async () => {
    if (!sponsorId) {
      setReminders([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await prospectService.getSponsorReminders(sponsorId);
      setReminders(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar lembretes';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [sponsorId]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  // Adicionar lembrete
  const addReminder = useCallback(async (dto: Omit<CreateProspectReminderDTO, 'sponsor_id'>) => {
    if (!sponsorId) throw new Error('Sponsor ID não definido');

    try {
      setError(null);
      const newReminder = await prospectService.createReminder({
        ...dto,
        sponsor_id: sponsorId,
      });
      setReminders((prev) =>
        [...prev, newReminder].sort((a, b) =>
          new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime()
        )
      );
      return newReminder;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar lembrete';
      setError(message);
      throw err;
    }
  }, [sponsorId]);

  // Atualizar lembrete
  const updateReminder = useCallback(async (
    reminderId: string,
    dto: UpdateProspectReminderDTO
  ) => {
    try {
      setError(null);
      const updated = await prospectService.updateReminder(reminderId, dto);
      setReminders((prev) =>
        prev
          .map((r) => (r.id === reminderId ? updated : r))
          .sort((a, b) =>
            new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime()
          )
      );
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar lembrete';
      setError(message);
      throw err;
    }
  }, []);

  // Marcar como concluido
  const completeReminder = useCallback(async (reminderId: string) => {
    try {
      setError(null);
      const updated = await prospectService.completeReminder(reminderId);
      setReminders((prev) =>
        prev.map((r) => (r.id === reminderId ? updated : r))
      );
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao concluir lembrete';
      setError(message);
      throw err;
    }
  }, []);

  // Remover lembrete
  const removeReminder = useCallback(async (reminderId: string) => {
    try {
      setError(null);
      await prospectService.deleteReminder(reminderId);
      setReminders((prev) => prev.filter((r) => r.id !== reminderId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover lembrete';
      setError(message);
      throw err;
    }
  }, []);

  // Lembretes pendentes e concluidos
  const { pending, completed } = useMemo(() => {
    const pending = reminders.filter((r) => !r.is_completed);
    const completed = reminders.filter((r) => r.is_completed);
    return { pending, completed };
  }, [reminders]);

  return {
    reminders,
    pending,
    completed,
    loading,
    error,
    refresh: loadReminders,
    addReminder,
    updateReminder,
    completeReminder,
    removeReminder,
  };
}

// =============================================================================
// usePendingReminders - Lembretes pendentes do usuario
// =============================================================================

export function usePendingReminders(daysAhead: number = 7) {
  const [reminders, setReminders] = useState<PendingReminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReminders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await prospectService.getPendingReminders(daysAhead);
      setReminders(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar lembretes pendentes';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [daysAhead]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  // Agrupar por urgencia
  const { overdue, today, upcoming } = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const overdue = reminders.filter((r) => r.days_until < 0);
    const today = reminders.filter((r) => {
      const remindDate = new Date(r.remind_at).toISOString().split('T')[0];
      return remindDate === todayStr;
    });
    const upcoming = reminders.filter((r) => r.days_until > 0);

    return { overdue, today, upcoming };
  }, [reminders]);

  return {
    reminders,
    overdue,
    today,
    upcoming,
    loading,
    error,
    refresh: loadReminders,
  };
}

// =============================================================================
// usePipelineKanban - Dados do Kanban do pipeline
// =============================================================================

export function usePipelineKanban(projectId: string | null) {
  const [kanbanData, setKanbanData] = useState<PipelineKanbanData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadKanbanData = useCallback(async () => {
    if (!projectId) {
      setKanbanData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await prospectService.getPipelineKanbanData(projectId);
      setKanbanData(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar pipeline';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadKanbanData();
  }, [loadKanbanData]);

  // Mover sponsor entre colunas
  const moveSponsor = useCallback(async (sponsorId: string, newStatus: SponsorStatus) => {
    try {
      setError(null);
      await prospectService.moveSponsorToStatus(sponsorId, newStatus);
      // Recarregar dados do kanban
      await loadKanbanData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao mover patrocinador';
      setError(message);
      throw err;
    }
  }, [loadKanbanData]);

  return {
    kanbanData,
    columns: kanbanData?.columns || [],
    totalValue: kanbanData?.total_value || 0,
    totalCount: kanbanData?.total_count || 0,
    loading,
    error,
    refresh: loadKanbanData,
    moveSponsor,
  };
}

// =============================================================================
// usePipelineStats - Estatisticas do pipeline
// =============================================================================

export function usePipelineStats(projectId: string | null) {
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [metrics, setMetrics] = useState<PipelineConversionMetrics[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!projectId) {
      setStats(null);
      setMetrics([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [statsData, metricsData] = await Promise.all([
        prospectService.getPipelineStats(projectId),
        prospectService.getConversionMetrics(projectId),
      ]);
      setStats(statsData);
      setMetrics(metricsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar estatisticas';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    metrics,
    loading,
    error,
    refresh: loadStats,
  };
}

// =============================================================================
// useQuickActions - Ações rapidas de prospeccao
// =============================================================================

export function useQuickActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logActivity = useCallback(async (
    sponsorId: string,
    activityType: ActivityType,
    title: string,
    options?: {
      newStatus?: SponsorStatus;
      nextAction?: string;
      nextActionDate?: string;
    }
  ) => {
    setLoading(true);
    setError(null);

    try {
      const result = await prospectService.logActivityAndUpdateStatus(
        sponsorId,
        activityType,
        title,
        options?.newStatus,
        options?.nextAction,
        options?.nextActionDate
      );
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao registrar atividade';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Shortcuts para ações comuns
  const logCall = useCallback((sponsorId: string, title: string, outcome?: string) => {
    return logActivity(sponsorId, 'call_outbound', title);
  }, [logActivity]);

  const logEmail = useCallback((sponsorId: string, title: string) => {
    return logActivity(sponsorId, 'email_sent', title);
  }, [logActivity]);

  const logMeeting = useCallback((sponsorId: string, title: string) => {
    return logActivity(sponsorId, 'meeting', title);
  }, [logActivity]);

  const sendProposal = useCallback((sponsorId: string) => {
    return logActivity(sponsorId, 'proposal_sent', 'Proposta enviada', {
      newStatus: 'proposal_sent',
    });
  }, [logActivity]);

  const markAsContacted = useCallback((sponsorId: string, via: 'email' | 'call') => {
    const type = via === 'email' ? 'email_sent' : 'call_outbound';
    const title = via === 'email' ? 'Primeiro contato por e-mail' : 'Primeiro contato por telefone';
    return logActivity(sponsorId, type, title, { newStatus: 'contacted' });
  }, [logActivity]);

  const scheduleMeeting = useCallback((sponsorId: string, meetingDate: string) => {
    return logActivity(sponsorId, 'meeting', `Reunião agendada para ${meetingDate}`, {
      newStatus: 'meeting_scheduled',
      nextAction: 'Participar da reunião',
      nextActionDate: meetingDate,
    });
  }, [logActivity]);

  return {
    loading,
    error,
    logActivity,
    logCall,
    logEmail,
    logMeeting,
    sendProposal,
    markAsContacted,
    scheduleMeeting,
  };
}

// =============================================================================
// useRecentActivities - Atividades recentes para dashboard
// =============================================================================

export function useRecentActivities(limit: number = 10) {
  const [activities, setActivities] = useState<ProspectActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadActivities = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await prospectService.getRecentActivities(limit);
      setActivities(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar atividades recentes';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  return {
    activities,
    loading,
    error,
    refresh: loadActivities,
  };
}
