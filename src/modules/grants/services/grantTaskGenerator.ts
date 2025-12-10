/**
 * GrantTaskGenerator - Geração automática de tarefas contextuais
 *
 * Este serviço gera tarefas inteligentes baseadas no estado atual do projeto e nos
 * passos customizados do edital (metadata.steps).
 *
 * Tipos de Tarefas:
 * 1. briefing - Completar contexto do projeto (se status = draft/briefing)
 * 2. upload_doc - Enviar documentos obrigatórios (se documents.length === 0)
 * 3. review_field - Revisar campos gerados (se status = generating/review)
 * 4. external_submit - Submeter no sistema externo (se status = submitted)
 * 5. deadline_reminder - Lembrete de prazo (se deadline <= 7 dias)
 * 6. custom_step - Passo customizado do edital (metadata.steps)
 */

import type { GrantProject, GrantOpportunity } from '../types';

export type TaskType =
  | 'briefing'
  | 'upload_doc'
  | 'review_field'
  | 'external_submit'
  | 'deadline_reminder'
  | 'custom_step';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface GrantTask {
  id: string;
  project_id: string;
  opportunity_id: string;
  task_type: TaskType;
  title: string;
  description: string;
  due_date?: string;
  priority: TaskPriority;
  status: TaskStatus;
  metadata: {
    [key: string]: any;
  };
  created_at: string;
}

export interface EditalCustomStep {
  id: string;
  title: string;
  description: string;
  order: number;
  required: boolean;
  due_date_offset_days?: number; // Dias antes do deadline
}

export class GrantTaskGenerator {
  /**
   * Gera tarefas contextuais baseadas no estado atual do projeto
   */
  static generateTasksForProject(
    project: GrantProject,
    opportunity: GrantOpportunity,
    documents: any[] = []
  ): GrantTask[] {
    const tasks: GrantTask[] = [];
    const now = new Date().toISOString();
    const deadline = opportunity.submission_deadline;
    const daysUntilDeadline = deadline
      ? Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    // Task 1: Complete Briefing (se draft ou briefing)
    if (project.status === 'draft' || project.status === 'briefing') {
      tasks.push({
        id: `task_briefing_${project.id}`,
        project_id: project.id,
        opportunity_id: opportunity.id,
        task_type: 'briefing',
        title: `Completar contexto do projeto: ${project.project_title || 'Novo Projeto'}`,
        description: 'Preencha as informações de contexto do projeto para que a IA possa gerar a proposta. ' +
          'Inclua objetivos, metodologia, resultados esperados e outras informações relevantes.',
        priority: 'high',
        status: 'pending',
        metadata: {
          project_title: project.project_title,
          opportunity_title: opportunity.title,
          required_fields: ['project_title', 'context_objectives', 'context_methodology']
        },
        created_at: now
      });
    }

    // Task 2: Upload Documents (se não tem documentos)
    if (documents.length === 0 &&
        (project.status === 'briefing' || project.status === 'generating' || project.status === 'review')) {
      tasks.push({
        id: `task_upload_doc_${project.id}`,
        project_id: project.id,
        opportunity_id: opportunity.id,
        task_type: 'upload_doc',
        title: `Enviar documentos do projeto: ${project.project_title || 'Novo Projeto'}`,
        description: 'Faça upload de documentos relevantes (PDFs, relatórios, artigos) que serão usados ' +
          'como contexto pela IA ao gerar a proposta.',
        priority: 'medium',
        status: 'pending',
        metadata: {
          document_count: 0,
          suggested_docs: ['Currículo Lattes', 'Relatórios anteriores', 'Artigos científicos', 'Plano de trabalho']
        },
        created_at: now
      });
    }

    // Task 3: Review Fields (se generating ou review)
    if (project.status === 'generating' || project.status === 'review') {
      tasks.push({
        id: `task_review_field_${project.id}`,
        project_id: project.id,
        opportunity_id: opportunity.id,
        task_type: 'review_field',
        title: `Revisar campos gerados: ${project.project_title || 'Novo Projeto'}`,
        description: 'Revise e aprove todos os campos gerados pela IA. Você pode editar o conteúdo ' +
          'antes de aprovar. Campos aprovados podem ser colapsados para economizar espaço.',
        priority: project.status === 'review' ? 'critical' : 'high',
        status: project.status === 'review' ? 'in_progress' : 'pending',
        metadata: {
          total_fields: project.metadata?.field_count || 0,
          approved_fields: project.metadata?.approved_count || 0
        },
        created_at: now
      });
    }

    // Task 4: External Submit (se submitted)
    if (project.status === 'submitted') {
      tasks.push({
        id: `task_external_submit_${project.id}`,
        project_id: project.id,
        opportunity_id: opportunity.id,
        task_type: 'external_submit',
        title: `Submeter proposta no sistema externo: ${opportunity.title}`,
        description: `Acesse o sistema externo (${opportunity.external_system_url || 'URL não fornecida'}) ` +
          'e faça a submissão oficial da proposta. Após submeter, marque esta tarefa como concluída.',
        priority: daysUntilDeadline && daysUntilDeadline <= 3 ? 'critical' : 'high',
        status: 'pending',
        metadata: {
          external_url: opportunity.external_system_url,
          deadline: deadline,
          days_until_deadline: daysUntilDeadline
        },
        created_at: now
      });
    }

    // Task 5: Deadline Reminder (se <= 7 dias)
    if (daysUntilDeadline !== null && daysUntilDeadline <= 7 && daysUntilDeadline > 0) {
      const priorityMap: { [key: number]: TaskPriority } = {
        1: 'critical',
        2: 'critical',
        3: 'critical',
        7: 'high'
      };

      const priority = daysUntilDeadline <= 3
        ? 'critical'
        : daysUntilDeadline <= 7
          ? 'high'
          : 'medium';

      tasks.push({
        id: `task_deadline_${project.id}`,
        project_id: project.id,
        opportunity_id: opportunity.id,
        task_type: 'deadline_reminder',
        title: `⚠️ Prazo de submissão: ${daysUntilDeadline} ${daysUntilDeadline === 1 ? 'dia' : 'dias'}`,
        description: `O edital "${opportunity.title}" tem prazo de submissão em ${deadline}. ` +
          `Faltam apenas ${daysUntilDeadline} ${daysUntilDeadline === 1 ? 'dia' : 'dias'}!`,
        due_date: deadline || undefined,
        priority,
        status: 'pending',
        metadata: {
          days_until_deadline: daysUntilDeadline,
          deadline_date: deadline,
          is_urgent: daysUntilDeadline <= 3
        },
        created_at: now
      });
    }

    return tasks;
  }

  /**
   * Gera tarefas a partir dos passos customizados do edital (metadata.steps)
   *
   * Editais customizados (ex: 32/2025) podem definir uma sequência de passos
   * específicos que devem ser seguidos para a submissão.
   */
  static generateTasksFromEditalSteps(
    opportunity: GrantOpportunity,
    project: GrantProject
  ): GrantTask[] {
    const steps = (opportunity.metadata?.steps || []) as EditalCustomStep[];

    if (steps.length === 0) {
      return [];
    }

    const now = new Date().toISOString();
    const deadline = opportunity.submission_deadline;

    return steps
      .sort((a, b) => a.order - b.order)
      .map((step, index) => {
        // Calcula due_date baseado no offset (se fornecido)
        let dueDate: string | undefined;
        if (deadline && step.due_date_offset_days) {
          const deadlineDate = new Date(deadline);
          deadlineDate.setDate(deadlineDate.getDate() - step.due_date_offset_days);
          dueDate = deadlineDate.toISOString();
        }

        return {
          id: `task_step_${project.id}_${step.id}`,
          project_id: project.id,
          opportunity_id: opportunity.id,
          task_type: 'custom_step',
          title: `${step.order}. ${step.title}`,
          description: step.description,
          due_date: dueDate,
          priority: step.required ? 'high' : 'medium',
          status: 'pending' as TaskStatus,
          metadata: {
            step_id: step.id,
            step_order: step.order,
            is_required: step.required,
            is_custom_step: true,
            edital_title: opportunity.title
          },
          created_at: now
        };
      });
  }

  /**
   * Combina tarefas automáticas + tarefas de passos customizados
   */
  static generateAllTasks(
    project: GrantProject,
    opportunity: GrantOpportunity,
    documents: any[] = []
  ): GrantTask[] {
    const automaticTasks = this.generateTasksForProject(project, opportunity, documents);
    const customStepTasks = this.generateTasksFromEditalSteps(opportunity, project);

    return [
      ...automaticTasks,
      ...customStepTasks
    ];
  }

  /**
   * Filtra tarefas relevantes (remove completed/skipped, ordena por prioridade)
   */
  static getActiveTasks(tasks: GrantTask[]): GrantTask[] {
    const priorityOrder: { [key in TaskPriority]: number } = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1
    };

    return tasks
      .filter(task => task.status !== 'completed' && task.status !== 'skipped')
      .sort((a, b) => {
        // Primeiro ordena por prioridade
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;

        // Depois por due_date (mais próximo primeiro)
        if (a.due_date && b.due_date) {
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        if (a.due_date) return -1;
        if (b.due_date) return 1;

        return 0;
      });
  }

  /**
   * Retorna o próximo passo mais urgente
   */
  static getNextStep(tasks: GrantTask[]): GrantTask | null {
    const activeTasks = this.getActiveTasks(tasks);
    return activeTasks.length > 0 ? activeTasks[0] : null;
  }
}
