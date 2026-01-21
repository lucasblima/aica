/**
 * GrantTaskSync - Sincronização bidirecional Grants ↔ Atlas
 *
 * Este serviço mantém tarefas sincronizadas entre:
 * - Módulo Grants (work_items com metadata.source = 'grants')
 * - Módulo Atlas (life_area = 'Captação')
 *
 * Fluxos:
 * 1. Grants → Atlas: Quando projeto muda de status, gera tarefas no Atlas
 * 2. Atlas → Grants: Quando tarefa é concluída no Atlas, atualiza status do projeto
 *
 * Trigger Database: create_grant_tasks_on_project_insert()
 * Migration: 20251209_grants_metadata_and_atlas_integration.sql
 */

import { supabase } from '@/services/supabaseClient';
import { GrantTaskGenerator } from './grantTaskGenerator';
import type { GrantTask, TaskPriority, TaskStatus } from './grantTaskGenerator';
import type { GrantProject, GrantOpportunity } from '../types';

import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('Granttasksync');

/**
 * Mapeia prioridade Grant → Atlas
 * Grant: low/medium/high/critical
 * Atlas: 1/2/3/4 (work_items.priority)
 */
function mapPriorityToAtlas(priority: TaskPriority): number {
  const priorityMap: { [key in TaskPriority]: number } = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4
  };
  return priorityMap[priority];
}

/**
 * Mapeia status Grant → Atlas
 * Grant: pending/in_progress/completed/skipped
 * Atlas: backlog/in_progress/done/cancelled
 */
function mapStatusToAtlas(status: TaskStatus): string {
  const statusMap: { [key in TaskStatus]: string } = {
    pending: 'backlog',
    in_progress: 'in_progress',
    completed: 'done',
    skipped: 'cancelled'
  };
  return statusMap[status];
}

/**
 * Mapeia status Atlas → Grant
 */
function mapStatusToGrant(atlasStatus: string): TaskStatus {
  const statusMap: { [key: string]: TaskStatus } = {
    backlog: 'pending',
    in_progress: 'in_progress',
    done: 'completed',
    cancelled: 'skipped'
  };
  return statusMap[atlasStatus] || 'pending';
}

/**
 * Obtém ou cria a life_area "Captação" para o usuário
 */
async function getOrCreateCaptacaoLifeArea(userId: string): Promise<string> {
  // Tenta buscar existente
  const { data: existing, error: fetchError } = await supabase
    .from('life_areas')
    .select('id')
    .eq('user_id', userId)
    .eq('name', 'Captação')
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  // Cria nova life_area
  const { data: newLifeArea, error: createError } = await supabase
    .from('life_areas')
    .insert({
      user_id: userId,
      name: 'Captação',
      description: 'Gestão de propostas e editais',
      color: '#10b981' // Verde do módulo Grants
    })
    .select('id')
    .single();

  if (createError) {
    log.error(Error creating Captação life area:', createError);
    throw createError;
  }

  return newLifeArea.id;
}

/**
 * Sincroniza tarefas do Grants para o Atlas
 *
 * Cria work_items no Atlas com metadata indicando origem (grants).
 * Evita duplicação verificando metadata.grant_task_id.
 */
export async function syncGrantTasksToAtlas(
  projectId: string,
  userId: string,
  forceRegenerate: boolean = false
): Promise<{ created: number; updated: number; errors: string[] }> {
  const result = { created: 0, updated: 0, errors: [] as string[] };

  try {
    // 1. Busca projeto e oportunidade
    const { data: project, error: projectError } = await supabase
      .from('grant_projects')
      .select(`
        *,
        opportunity:grant_opportunities(*)
      `)
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      result.errors.push('Projeto não encontrado');
      return result;
    }

    const opportunity = project.opportunity as unknown as GrantOpportunity;

    // 2. Busca documentos do projeto
    const { data: documents } = await supabase
      .from('grant_documents')
      .select('*')
      .eq('project_id', projectId);

    // 3. Gera tarefas contextuais
    const grantTasks = GrantTaskGenerator.generateAllTasks(
      project as GrantProject,
      opportunity,
      documents || []
    );

    // 4. Obtém life_area "Captação"
    const lifeAreaId = await getOrCreateCaptacaoLifeArea(userId);

    // 5. Para cada tarefa, cria ou atualiza no Atlas
    for (const grantTask of grantTasks) {
      try {
        // Verifica se já existe
        const { data: existing } = await supabase
          .from('work_items')
          .select('id, status, metadata')
          .eq('user_id', userId)
          .eq('metadata->>grant_task_id', grantTask.id)
          .maybeSingle();

        if (existing && !forceRegenerate) {
          // Atualiza status se mudou
          const currentAtlasStatus = mapStatusToAtlas(grantTask.status);
          if (existing.status !== currentAtlasStatus) {
            const { error: updateError } = await supabase
              .from('work_items')
              .update({
                status: currentAtlasStatus,
                priority: mapPriorityToAtlas(grantTask.priority)
              })
              .eq('id', existing.id);

            if (updateError) {
              result.errors.push(`Erro ao atualizar tarefa ${grantTask.title}: ${updateError.message}`);
            } else {
              result.updated++;
            }
          }
          continue;
        }

        // Cria nova tarefa
        const { error: insertError } = await supabase
          .from('work_items')
          .insert({
            user_id: userId,
            title: grantTask.title,
            description: grantTask.description,
            priority: mapPriorityToAtlas(grantTask.priority),
            status: mapStatusToAtlas(grantTask.status),
            due_date: grantTask.due_date || null,
            life_area_id: lifeAreaId,
            metadata: {
              source: 'grants',
              grant_task_id: grantTask.id,
              grant_task_type: grantTask.task_type,
              project_id: projectId,
              opportunity_id: opportunity.id,
              project_title: project.project_title,
              opportunity_title: opportunity.title,
              ...grantTask.metadata
            }
          });

        if (insertError) {
          result.errors.push(`Erro ao criar tarefa ${grantTask.title}: ${insertError.message}`);
        } else {
          result.created++;
        }
      } catch (taskError) {
        result.errors.push(`Erro ao processar tarefa ${grantTask.title}: ${taskError}`);
      }
    }

    log.debug(Sync completed:', result);
    return result;
  } catch (error) {
    log.error(Error syncing tasks:', error);
    result.errors.push(`Erro geral: ${error}`);
    return result;
  }
}

/**
 * Sincroniza tarefa do Atlas para o Grants
 *
 * Quando uma tarefa originada do Grants é concluída no Atlas,
 * atualiza o status do projeto de acordo com o tipo de tarefa.
 */
export async function syncAtlasTaskToGrant(
  taskId: string,
  userId: string
): Promise<{ updated: boolean; error?: string }> {
  try {
    // 1. Busca tarefa
    const { data: task, error: taskError } = await supabase
      .from('work_items')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', userId)
      .single();

    if (taskError || !task) {
      return { updated: false, error: 'Tarefa não encontrada' };
    }

    // 2. Verifica se é tarefa do Grants
    if (task.metadata?.source !== 'grants') {
      return { updated: false, error: 'Tarefa não é do módulo Grants' };
    }

    const grantTaskType = task.metadata.grant_task_type;
    const projectId = task.metadata.project_id;

    if (!projectId) {
      return { updated: false, error: 'project_id não encontrado no metadata' };
    }

    // 3. Atualiza projeto baseado no tipo de tarefa e status
    const isCompleted = task.status === 'done';

    switch (grantTaskType) {
      case 'briefing':
        // Briefing concluído → move para 'generating'
        if (isCompleted) {
          const { error: updateError } = await supabase
            .from('grant_projects')
            .update({ status: 'generating' })
            .eq('id', projectId)
            .eq('user_id', userId);

          if (updateError) {
            return { updated: false, error: updateError.message };
          }
          return { updated: true };
        }
        break;

      case 'external_submit':
        // Submissão externa concluída → move para 'approved'
        if (isCompleted) {
          const { error: updateError } = await supabase
            .from('grant_projects')
            .update({ status: 'approved' })
            .eq('id', projectId)
            .eq('user_id', userId);

          if (updateError) {
            return { updated: false, error: updateError.message };
          }
          return { updated: true };
        }
        break;

      case 'review_field':
        // Review concluído → pode mover para 'submitted' (se todos campos aprovados)
        // Por enquanto, não faz ação automática (requer validação manual)
        break;

      case 'upload_doc':
      case 'deadline_reminder':
      case 'custom_step':
        // Tarefas informativas, não afetam status do projeto
        break;
    }

    return { updated: false };
  } catch (error) {
    log.error(Error syncing Atlas task to Grant:', error);
    return { updated: false, error: String(error) };
  }
}

/**
 * Remove tarefas do Atlas quando projeto é deletado
 */
export async function deleteGrantTasksFromAtlas(
  projectId: string,
  userId: string
): Promise<{ deleted: number; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('work_items')
      .delete()
      .eq('user_id', userId)
      .eq('metadata->>project_id', projectId)
      .select('id');

    if (error) {
      return { deleted: 0, error: error.message };
    }

    return { deleted: data?.length || 0 };
  } catch (error) {
    log.error(Error deleting tasks:', error);
    return { deleted: 0, error: String(error) };
  }
}

/**
 * Verifica se há tarefas pendentes para um projeto
 */
export async function hasActiveTasks(
  projectId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('work_items')
    .select('id')
    .eq('user_id', userId)
    .eq('metadata->>project_id', projectId)
    .in('status', ['backlog', 'in_progress'])
    .limit(1);

  return !error && (data?.length || 0) > 0;
}

/**
 * Obtém resumo de tarefas para um projeto
 */
export async function getProjectTasksSummary(
  projectId: string,
  userId: string
): Promise<{
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  critical: number;
}> {
  const { data, error } = await supabase
    .from('work_items')
    .select('status, priority')
    .eq('user_id', userId)
    .eq('metadata->>project_id', projectId);

  if (error || !data) {
    return { total: 0, pending: 0, in_progress: 0, completed: 0, critical: 0 };
  }

  return {
    total: data.length,
    pending: data.filter(t => t.status === 'backlog').length,
    in_progress: data.filter(t => t.status === 'in_progress').length,
    completed: data.filter(t => t.status === 'done').length,
    critical: data.filter(t => t.priority === 4).length
  };
}
