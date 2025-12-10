/**
 * Grant Service - Módulo Captação
 *
 * Serviço completo de CRUD para gerenciar oportunidades de editais,
 * projetos de inscrição, briefings e respostas geradas.
 *
 * @module modules/grants/services/grantService
 */

import { supabase } from '../../../services/supabaseClient'
import type {
  GrantOpportunity,
  GrantProject,
  GrantBriefing,
  GrantResponse,
  GrantDeadline,
  CreateOpportunityPayload,
  CreateProjectPayload,
  UpdateBriefingPayload,
  BriefingData
} from '../types'

// ============================================
// GRANT OPPORTUNITIES (Editais)
// ============================================

/**
 * Cria uma nova oportunidade de edital
 *
 * @param payload - Dados do edital
 * @returns Oportunidade criada
 * @throws Error se a criação falhar
 */
export async function createOpportunity(
  payload: CreateOpportunityPayload
): Promise<GrantOpportunity> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuário não autenticado')

    const { data, error } = await supabase
      .from('grant_opportunities')
      .insert({
        user_id: user.id,
        title: payload.title,
        funding_agency: payload.funding_agency,
        program_name: payload.program_name,
        edital_number: payload.edital_number,
        min_funding: payload.min_funding,
        max_funding: payload.max_funding,
        counterpart_percentage: payload.counterpart_percentage,
        submission_start: payload.submission_start,
        submission_deadline: payload.submission_deadline,
        result_date: payload.result_date,
        eligible_themes: payload.eligible_themes || [],
        eligibility_requirements: payload.eligibility_requirements || {},
        evaluation_criteria: payload.evaluation_criteria || [],
        form_fields: payload.form_fields || [],
        external_system_url: payload.external_system_url,
        edital_pdf_path: payload.edital_pdf_path,
        edital_text_content: payload.edital_text_content,
        status: 'draft'
      })
      .select()
      .single()

    if (error) throw error
    return data as GrantOpportunity
  } catch (error) {
    console.error('Erro ao criar oportunidade:', error)
    throw new Error(`Falha ao criar oportunidade: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Busca uma oportunidade específica pelo ID
 *
 * @param id - ID da oportunidade
 * @returns Oportunidade encontrada
 * @throws Error se não encontrada ou ocorrer erro
 */
export async function getOpportunity(id: string): Promise<GrantOpportunity> {
  try {
    const { data, error } = await supabase
      .from('grant_opportunities')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    if (!data) throw new Error('Oportunidade não encontrada')

    return data as GrantOpportunity
  } catch (error) {
    console.error('Erro ao buscar oportunidade:', error)
    throw new Error(`Falha ao buscar oportunidade: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Lista todas as oportunidades do usuário
 *
 * @param filters - Filtros opcionais (status)
 * @returns Lista de oportunidades
 * @throws Error se a listagem falhar
 */
export async function listOpportunities(
  filters?: { status?: string }
): Promise<GrantOpportunity[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuário não autenticado')

    let query = supabase
      .from('grant_opportunities')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query

    if (error) throw error
    return data as GrantOpportunity[]
  } catch (error) {
    console.error('Erro ao listar oportunidades:', error)
    throw new Error(`Falha ao listar oportunidades: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Atualiza uma oportunidade existente
 *
 * @param id - ID da oportunidade
 * @param updates - Campos a serem atualizados
 * @returns Oportunidade atualizada
 * @throws Error se a atualização falhar
 */
export async function updateOpportunity(
  id: string,
  updates: Partial<CreateOpportunityPayload>
): Promise<GrantOpportunity> {
  try {
    const { data, error } = await supabase
      .from('grant_opportunities')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as GrantOpportunity
  } catch (error) {
    console.error('Erro ao atualizar oportunidade:', error)
    throw new Error(`Falha ao atualizar oportunidade: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Deleta uma oportunidade
 *
 * @param id - ID da oportunidade
 * @throws Error se a deleção falhar
 */
export async function deleteOpportunity(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('grant_opportunities')
      .delete()
      .eq('id', id)

    if (error) throw error
  } catch (error) {
    console.error('Erro ao deletar oportunidade:', error)
    throw new Error(`Falha ao deletar oportunidade: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Busca próximos deadlines (prazos de submissão)
 *
 * @param daysAhead - Número de dias à frente (padrão: 30)
 * @returns Lista de deadlines próximos
 * @throws Error se a busca falhar
 */
export async function getUpcomingDeadlines(
  daysAhead: number = 30
): Promise<GrantDeadline[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuário não autenticado')

    const today = new Date()
    const futureDate = new Date()
    futureDate.setDate(today.getDate() + daysAhead)

    const { data: opportunities, error: oppError } = await supabase
      .from('grant_opportunities')
      .select('id, title, submission_deadline')
      .eq('user_id', user.id)
      .not('status', 'in', '("closed","archived")')
      .gte('submission_deadline', today.toISOString())
      .lte('submission_deadline', futureDate.toISOString())
      .order('submission_deadline', { ascending: true })

    if (oppError) throw oppError

    // Buscar projetos ativos para cada oportunidade
    const { data: projects, error: projError } = await supabase
      .from('grant_projects')
      .select('opportunity_id, id')
      .eq('user_id', user.id)
      .in('status', ['draft', 'briefing', 'generating', 'review'])

    if (projError) throw projError

    // Mapear projetos por opportunity_id
    const projectsByOpp = new Map<string, string>()
    projects?.forEach(p => projectsByOpp.set(p.opportunity_id, p.id))

    // Construir deadlines
    const deadlines: GrantDeadline[] = (opportunities || []).map(opp => {
      const deadlineDate = new Date(opp.submission_deadline)
      const daysRemaining = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      const projectId = projectsByOpp.get(opp.id)

      return {
        opportunity_id: opp.id,
        opportunity_title: opp.title,
        deadline: opp.submission_deadline,
        days_remaining: daysRemaining,
        has_active_project: !!projectId,
        project_id: projectId
      }
    })

    return deadlines
  } catch (error) {
    console.error('Erro ao buscar deadlines:', error)
    throw new Error(`Falha ao buscar deadlines: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

// ============================================
// GRANT PROJECTS (Projetos de Inscrição)
// ============================================

/**
 * Cria um novo projeto de inscrição
 *
 * @param payload - Dados do projeto
 * @returns Projeto criado
 * @throws Error se a criação falhar
 */
export async function createProject(
  payload: CreateProjectPayload
): Promise<GrantProject> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuário não autenticado')

    const { data, error } = await supabase
      .from('grant_projects')
      .insert({
        user_id: user.id,
        opportunity_id: payload.opportunity_id,
        project_name: payload.project_name,
        status: 'draft',
        completion_percentage: 0
      })
      .select()
      .single()

    if (error) throw error
    return data as GrantProject
  } catch (error) {
    console.error('Erro ao criar projeto:', error)
    throw new Error(`Falha ao criar projeto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Busca um projeto específico pelo ID (com joins)
 *
 * @param id - ID do projeto
 * @returns Projeto com oportunidade, briefing e respostas
 * @throws Error se não encontrado ou ocorrer erro
 */
export async function getProject(id: string): Promise<GrantProject> {
  try {
    const { data, error } = await supabase
      .from('grant_projects')
      .select(`
        *,
        opportunity:grant_opportunities(*),
        briefing:grant_briefings(*),
        responses:grant_responses(*)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    if (!data) throw new Error('Projeto não encontrado')

    return data as GrantProject
  } catch (error) {
    console.error('Erro ao buscar projeto:', error)
    throw new Error(`Falha ao buscar projeto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Lista todos os projetos do usuário
 *
 * @param filters - Filtros opcionais (opportunity_id, status)
 * @returns Lista de projetos
 * @throws Error se a listagem falhar
 */
export async function listProjects(
  filters?: { opportunity_id?: string; status?: string }
): Promise<GrantProject[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuário não autenticado')

    let query = supabase
      .from('grant_projects')
      .select(`
        *,
        opportunity:grant_opportunities(*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (filters?.opportunity_id) {
      query = query.eq('opportunity_id', filters.opportunity_id)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query

    if (error) throw error
    return data as GrantProject[]
  } catch (error) {
    console.error('Erro ao listar projetos:', error)
    throw new Error(`Falha ao listar projetos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Atualiza o nome de um projeto
 *
 * @param id - ID do projeto
 * @param project_name - Novo nome do projeto
 * @returns Projeto atualizado
 * @throws Error se a atualização falhar
 */
export async function updateProjectName(
  id: string,
  project_name: string
): Promise<GrantProject> {
  try {
    if (!project_name || project_name.trim().length === 0) {
      throw new Error('Nome do projeto não pode ser vazio')
    }

    const { data, error } = await supabase
      .from('grant_projects')
      .update({
        project_name: project_name.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as GrantProject
  } catch (error) {
    console.error('Erro ao atualizar nome do projeto:', error)
    throw new Error(`Falha ao atualizar nome: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Atualiza o status de um projeto
 *
 * @param id - ID do projeto
 * @param status - Novo status
 * @returns Projeto atualizado
 * @throws Error se a atualização falhar
 */
export async function updateProjectStatus(
  id: string,
  status: GrantProject['status']
): Promise<GrantProject> {
  try {
    const updates: any = {
      status,
      updated_at: new Date().toISOString()
    }

    // Se submetido, registrar data de submissão
    if (status === 'submitted') {
      updates.submitted_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('grant_projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as GrantProject
  } catch (error) {
    console.error('Erro ao atualizar status do projeto:', error)
    throw new Error(`Falha ao atualizar status: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Deleta um projeto
 *
 * @param id - ID do projeto
 * @throws Error se a deleção falhar
 */
export async function deleteProject(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('grant_projects')
      .delete()
      .eq('id', id)

    if (error) throw error
  } catch (error) {
    console.error('Erro ao deletar projeto:', error)
    throw new Error(`Falha ao deletar projeto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Verifica se todas as respostas de um projeto estão aprovadas
 *
 * @param projectId - ID do projeto
 * @returns Objeto com informações sobre aprovações
 * @throws Error se a verificação falhar
 */
export async function checkAllResponsesApproved(projectId: string): Promise<{
  allApproved: boolean;
  totalFields: number;
  approvedFields: number;
}> {
  try {
    // Buscar projeto com oportunidade
    const { data: project, error: projError } = await supabase
      .from('grant_projects')
      .select(`
        *,
        opportunity:grant_opportunities(form_fields)
      `)
      .eq('id', projectId)
      .single()

    if (projError) throw projError
    if (!project) throw new Error('Projeto não encontrado')

    const opportunity = project.opportunity as any
    const formFields = opportunity?.form_fields || []
    const totalFields = formFields.length

    if (totalFields === 0) {
      return { allApproved: true, totalFields: 0, approvedFields: 0 }
    }

    // Buscar respostas aprovadas
    const { data: responses, error: respError } = await supabase
      .from('grant_responses')
      .select('field_id, status')
      .eq('project_id', projectId)
      .eq('status', 'approved')

    if (respError) throw respError

    const approvedFields = responses?.length || 0
    const allApproved = approvedFields >= totalFields

    return { allApproved, totalFields, approvedFields }
  } catch (error) {
    console.error('Erro ao verificar aprovações:', error)
    throw new Error(`Falha ao verificar aprovações: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Calcula a porcentagem de completude do projeto
 *
 * @param projectId - ID do projeto
 * @returns Porcentagem de completude (0-100)
 * @throws Error se o cálculo falhar
 */
export async function calculateCompletion(projectId: string): Promise<number> {
  try {
    // Buscar projeto com oportunidade
    const { data: project, error: projError } = await supabase
      .from('grant_projects')
      .select(`
        *,
        opportunity:grant_opportunities(form_fields)
      `)
      .eq('id', projectId)
      .single()

    if (projError) throw projError
    if (!project) throw new Error('Projeto não encontrado')

    const opportunity = project.opportunity as any
    const formFields = opportunity?.form_fields || []
    const totalFields = formFields.length

    if (totalFields === 0) return 100

    // Buscar respostas aprovadas
    const { data: responses, error: respError } = await supabase
      .from('grant_responses')
      .select('field_id, status')
      .eq('project_id', projectId)
      .eq('status', 'approved')

    if (respError) throw respError

    const completedFields = responses?.length || 0
    const percentage = Math.round((completedFields / totalFields) * 100)

    // Atualizar porcentagem no projeto
    await supabase
      .from('grant_projects')
      .update({ completion_percentage: percentage })
      .eq('id', projectId)

    return percentage
  } catch (error) {
    console.error('Erro ao calcular completude:', error)
    throw new Error(`Falha ao calcular completude: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

// ============================================
// GRANT BRIEFINGS (Contexto do Projeto)
// ============================================

/**
 * Salva ou atualiza o briefing de um projeto
 *
 * @param projectId - ID do projeto
 * @param payload - Dados do briefing
 * @returns Briefing salvo
 * @throws Error se a operação falhar
 */
export async function saveBriefing(
  projectId: string,
  payload: UpdateBriefingPayload
): Promise<GrantBriefing> {
  try {
    // Verificar se já existe um briefing
    const { data: existing } = await supabase
      .from('grant_briefings')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle()

    if (existing) {
      // Atualizar existente (merge com dados anteriores)
      const mergedData = {
        ...existing.briefing_data,
        ...payload.briefing_data
      }

      const { data, error } = await supabase
        .from('grant_briefings')
        .update({
          briefing_data: mergedData,
          updated_at: new Date().toISOString()
        })
        .eq('project_id', projectId)
        .select()
        .single()

      if (error) throw error
      return data as GrantBriefing
    } else {
      // Criar novo
      const { data, error } = await supabase
        .from('grant_briefings')
        .insert({
          project_id: projectId,
          briefing_data: payload.briefing_data
        })
        .select()
        .single()

      if (error) throw error
      return data as GrantBriefing
    }
  } catch (error) {
    console.error('Erro ao salvar briefing:', error)
    throw new Error(`Falha ao salvar briefing: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Busca o briefing de um projeto
 *
 * @param projectId - ID do projeto
 * @returns Briefing ou null se não existir
 * @throws Error se ocorrer erro na busca
 */
export async function getBriefing(projectId: string): Promise<GrantBriefing | null> {
  try {
    const { data, error } = await supabase
      .from('grant_briefings')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle()

    if (error) throw error
    return data as GrantBriefing | null
  } catch (error) {
    console.error('Erro ao buscar briefing:', error)
    throw new Error(`Falha ao buscar briefing: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

// ============================================
// GRANT RESPONSES (Respostas Geradas)
// ============================================

/**
 * Salva ou atualiza uma resposta de campo do formulário
 *
 * @param projectId - ID do projeto
 * @param fieldId - ID do campo do formulário
 * @param content - Conteúdo da resposta
 * @param status - Status da resposta (opcional)
 * @returns Resposta salva
 * @throws Error se a operação falhar
 */
export async function saveResponse(
  projectId: string,
  fieldId: string,
  content: string,
  status?: string
): Promise<GrantResponse> {
  try {
    // Verificar se já existe
    const { data: existing } = await supabase
      .from('grant_responses')
      .select('*')
      .eq('project_id', projectId)
      .eq('field_id', fieldId)
      .maybeSingle()

    const charCount = content.length
    const newVersion = {
      content,
      created_at: new Date().toISOString()
    }

    if (existing) {
      // Atualizar existente (adicionar à versão)
      const versions = [...(existing.versions || []), newVersion]

      const { data, error } = await supabase
        .from('grant_responses')
        .update({
          content,
          char_count: charCount,
          status: status || existing.status,
          versions,
          updated_at: new Date().toISOString()
        })
        .eq('project_id', projectId)
        .eq('field_id', fieldId)
        .select()
        .single()

      if (error) throw error

      // Recalcular completion percentage
      await calculateCompletion(projectId);

      return data as GrantResponse
    } else {
      // Criar novo
      const { data, error } = await supabase
        .from('grant_responses')
        .insert({
          project_id: projectId,
          field_id: fieldId,
          content,
          char_count: charCount,
          status: status || 'generated',
          versions: [newVersion]
        })
        .select()
        .single()

      if (error) throw error

      // Recalcular completion percentage
      await calculateCompletion(projectId);

      return data as GrantResponse
    }
  } catch (error) {
    console.error('Erro ao salvar resposta:', error)
    throw new Error(`Falha ao salvar resposta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Busca uma resposta específica
 *
 * @param projectId - ID do projeto
 * @param fieldId - ID do campo
 * @returns Resposta ou null se não existir
 * @throws Error se ocorrer erro na busca
 */
export async function getResponse(
  projectId: string,
  fieldId: string
): Promise<GrantResponse | null> {
  try {
    const { data, error } = await supabase
      .from('grant_responses')
      .select('*')
      .eq('project_id', projectId)
      .eq('field_id', fieldId)
      .maybeSingle()

    if (error) throw error
    return data as GrantResponse | null
  } catch (error) {
    console.error('Erro ao buscar resposta:', error)
    throw new Error(`Falha ao buscar resposta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Lista todas as respostas de um projeto
 *
 * @param projectId - ID do projeto
 * @returns Lista de respostas
 * @throws Error se a listagem falhar
 */
export async function listResponses(projectId: string): Promise<GrantResponse[]> {
  try {
    const { data, error } = await supabase
      .from('grant_responses')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data as GrantResponse[]
  } catch (error) {
    console.error('Erro ao listar respostas:', error)
    throw new Error(`Falha ao listar respostas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Atualiza o status de uma resposta
 *
 * @param responseId - ID da resposta
 * @param status - Novo status
 * @returns Resposta atualizada
 * @throws Error se a atualização falhar
 */
export async function updateResponseStatus(
  responseId: string,
  status: GrantResponse['status']
): Promise<GrantResponse> {
  try {
    const { data, error } = await supabase
      .from('grant_responses')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', responseId)
      .select()
      .single()

    if (error) throw error
    return data as GrantResponse
  } catch (error) {
    console.error('Erro ao atualizar status da resposta:', error)
    throw new Error(`Falha ao atualizar status: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Deleta uma resposta
 *
 * @param responseId - ID da resposta
 * @throws Error se a deleção falhar
 */
export async function deleteResponse(responseId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('grant_responses')
      .delete()
      .eq('id', responseId)

    if (error) throw error
  } catch (error) {
    console.error('Erro ao deletar resposta:', error)
    throw new Error(`Falha ao deletar resposta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

// ============================================
// ARCHIVE & DELETE
// ============================================

/**
 * Arquiva um projeto (marca como arquivado sem deletar)
 *
 * @param projectId - ID do projeto
 * @returns Projeto arquivado
 * @throws Error se arquivamento falhar
 */
export async function archiveProject(projectId: string): Promise<GrantProject> {
  // Ensure function is exported for GrantsModuleView
  try {
    const { data, error } = await supabase
      .from('grant_projects')
      .update({
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select(`
        *,
        opportunity:grant_opportunities(*)
      `)
      .single()

    if (error) throw error
    return data as GrantProject
  } catch (error) {
    console.error('Erro ao arquivar projeto:', error)
    throw new Error(`Falha ao arquivar projeto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Restaura um projeto arquivado
 *
 * @param projectId - ID do projeto
 * @returns Projeto restaurado
 * @throws Error se restauração falhar
 */
export async function unarchiveProject(projectId: string): Promise<GrantProject> {
  try {
    const { data, error } = await supabase
      .from('grant_projects')
      .update({
        archived_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select(`
        *,
        opportunity:grant_opportunities(*)
      `)
      .single()

    if (error) throw error
    return data as GrantProject
  } catch (error) {
    console.error('Erro ao restaurar projeto:', error)
    throw new Error(`Falha ao restaurar projeto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Deleta permanentemente um projeto arquivado e seu PDF associado
 *
 * IMPORTANTE: Só deve ser usado em projetos já arquivados
 *
 * @param projectId - ID do projeto
 * @param pdfPath - Caminho do PDF no storage (opcional)
 * @throws Error se deleção falhar ou projeto não estiver arquivado
 */
export async function deleteArchivedProject(
  projectId: string,
  pdfPath?: string
): Promise<void> {
  try {
    // 1. Verificar se o projeto está arquivado
    const { data: project, error: fetchError } = await supabase
      .from('grant_projects')
      .select('archived_at, opportunity:grant_opportunities(edital_pdf_path)')
      .eq('id', projectId)
      .single()

    if (fetchError) throw fetchError

    if (!project.archived_at) {
      throw new Error('Projeto precisa estar arquivado antes de ser deletado permanentemente')
    }

    // 2. Deletar PDF do storage se existir
    const pdfPathToDelete = pdfPath || (project.opportunity as any)?.edital_pdf_path

    if (pdfPathToDelete) {
      const { error: storageError } = await supabase.storage
        .from('editais')
        .remove([pdfPathToDelete])

      if (storageError) {
        console.warn('Erro ao deletar PDF (continuando):', storageError)
        // Não interrompe a deleção do projeto se o PDF falhar
      }
    }

    // 3. Deletar projeto (cascata deleta briefing e responses via FK)
    const { error: deleteError } = await supabase
      .from('grant_projects')
      .delete()
      .eq('id', projectId)

    if (deleteError) throw deleteError

    console.log(`[Grants] Projeto ${projectId} deletado permanentemente`, {
      pdfDeleted: !!pdfPathToDelete
    })
  } catch (error) {
    console.error('Erro ao deletar projeto:', error)
    throw new Error(`Falha ao deletar projeto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Arquiva uma oportunidade (edital)
 *
 * @param opportunityId - ID da oportunidade
 * @returns Oportunidade arquivada
 * @throws Error se arquivamento falhar
 */
export async function archiveOpportunity(opportunityId: string): Promise<GrantOpportunity> {
  try {
    const { data, error } = await supabase
      .from('grant_opportunities')
      .update({
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', opportunityId)
      .select()
      .single()

    if (error) throw error
    return data as GrantOpportunity
  } catch (error) {
    console.error('Erro ao arquivar oportunidade:', error)
    throw new Error(`Falha ao arquivar oportunidade: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Restaura uma oportunidade arquivada
 *
 * @param opportunityId - ID da oportunidade
 * @returns Oportunidade restaurada
 * @throws Error se restauração falhar
 */
export async function unarchiveOpportunity(opportunityId: string): Promise<GrantOpportunity> {
  try {
    const { data, error } = await supabase
      .from('grant_opportunities')
      .update({
        archived_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', opportunityId)
      .select()
      .single()

    if (error) throw error
    return data as GrantOpportunity
  } catch (error) {
    console.error('Erro ao restaurar oportunidade:', error)
    throw new Error(`Falha ao restaurar oportunidade: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Deleta permanentemente uma oportunidade arquivada, seu PDF e todos os projetos relacionados
 *
 * IMPORTANTE: Só deve ser usado em oportunidades já arquivadas
 *
 * @param opportunityId - ID da oportunidade
 * @throws Error se deleção falhar ou oportunidade não estiver arquivada
 */
export async function deleteArchivedOpportunity(opportunityId: string): Promise<void> {
  try {
    // 1. Verificar se a oportunidade está arquivada
    const { data: opportunity, error: fetchError } = await supabase
      .from('grant_opportunities')
      .select('archived_at, edital_pdf_path')
      .eq('id', opportunityId)
      .single()

    if (fetchError) throw fetchError

    if (!opportunity.archived_at) {
      throw new Error('Oportunidade precisa estar arquivada antes de ser deletada permanentemente')
    }

    // 2. Deletar PDF do storage se existir
    if (opportunity.edital_pdf_path) {
      const { error: storageError } = await supabase.storage
        .from('editais')
        .remove([opportunity.edital_pdf_path])

      if (storageError) {
        console.warn('Erro ao deletar PDF (continuando):', storageError)
        // Não interrompe a deleção se o PDF falhar
      }
    }

    // 3. Deletar oportunidade (cascata deleta projetos, briefings e responses via FK)
    const { error: deleteError } = await supabase
      .from('grant_opportunities')
      .delete()
      .eq('id', opportunityId)

    if (deleteError) throw deleteError

    console.log(`[Grants] Oportunidade ${opportunityId} deletada permanentemente`, {
      pdfDeleted: !!opportunity.edital_pdf_path
    })
  } catch (error) {
    console.error('Erro ao deletar oportunidade:', error)
    throw new Error(`Falha ao deletar oportunidade: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Conta quantos projetos ativos (não arquivados) existem para uma oportunidade
 *
 * @param opportunityId - ID da oportunidade
 * @returns Número de projetos ativos
 * @throws Error se a contagem falhar
 */
export async function countActiveProjects(opportunityId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('grant_projects')
      .select('*', { count: 'exact', head: true })
      .eq('opportunity_id', opportunityId)
      .is('archived_at', null)

    if (error) throw error
    return count || 0
  } catch (error) {
    console.error('Erro ao contar projetos:', error)
    throw new Error(`Falha ao contar projetos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Conta todos os projetos ativos do usuário (não arquivados)
 *
 * @returns Número total de projetos ativos
 * @throws Error se a contagem falhar
 */
export async function countAllActiveProjects(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuário não autenticado')

    const { count, error } = await supabase
      .from('grant_projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('archived_at', null)

    if (error) throw error
    return count || 0
  } catch (error) {
    console.error('Erro ao contar todos os projetos ativos:', error)
    throw new Error(`Falha ao contar projetos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Lista projetos recentes do usuário (ordenados por data de atualização)
 *
 * @param limit - Número máximo de projetos a retornar
 * @returns Lista de projetos recentes
 * @throws Error se a busca falhar
 */
export async function getRecentProjects(limit: number = 5): Promise<GrantProject[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuário não autenticado')

    const { data, error } = await supabase
      .from('grant_projects')
      .select(`
        *,
        opportunity:grant_opportunities(*)
      `)
      .eq('user_id', user.id)
      .is('archived_at', null)
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data as GrantProject[]
  } catch (error) {
    console.error('Erro ao buscar projetos recentes:', error)
    throw new Error(`Falha ao buscar projetos recentes: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

// ============================================
// SOURCE DOCUMENTS
// ============================================

/**
 * Salva informações do documento fonte no projeto
 *
 * @param projectId - ID do projeto
 * @param documentData - Dados do documento processado
 * @returns Projeto atualizado
 * @throws Error se salvar falhar
 */
export async function saveSourceDocument(
  projectId: string,
  documentData: {
    path: string;
    type: string;
    content: string;
  }
): Promise<GrantProject> {
  try {
    const { data, error } = await supabase
      .from('grant_projects')
      .update({
        source_document_path: documentData.path,
        source_document_type: documentData.type,
        source_document_content: documentData.content,
        source_document_uploaded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select(`
        *,
        opportunity:grant_opportunities(*)
      `)
      .single()

    if (error) throw error
    return data as GrantProject
  } catch (error) {
    console.error('Erro ao salvar documento fonte:', error)
    throw new Error(`Falha ao salvar documento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Remove documento fonte do projeto
 *
 * @param projectId - ID do projeto
 * @returns Projeto atualizado
 * @throws Error se remoção falhar
 */
export async function removeSourceDocument(projectId: string): Promise<GrantProject> {
  try {
    const { data, error } = await supabase
      .from('grant_projects')
      .update({
        source_document_path: null,
        source_document_type: null,
        source_document_content: null,
        source_document_uploaded_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select(`
        *,
        opportunity:grant_opportunities(*)
      `)
      .single()

    if (error) throw error
    return data as GrantProject
  } catch (error) {
    console.error('Erro ao remover documento fonte:', error)
    throw new Error(`Falha ao remover documento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

// ============================================
// EDITAL PDF MANAGEMENT
// ============================================

/**
 * Faz upload do PDF do edital e extrai o conteúdo de texto
 *
 * @param opportunityId - ID da oportunidade
 * @param file - Arquivo PDF
 * @returns Oportunidade atualizada
 * @throws Error se o upload falhar
 */
export async function uploadEditalPDF(
  opportunityId: string,
  file: File
): Promise<GrantOpportunity> {
  try {
    // Import dynamically to avoid initial bundle size
    const { processSourceDocument } = await import('./documentService');

    // 1. Process document (upload to storage + extract content)
    const processed = await processSourceDocument(file, opportunityId, 'editais');

    // 2. Update opportunity with PDF path and extracted content
    const { data, error } = await supabase
      .from('grant_opportunities')
      .update({
        edital_pdf_path: processed.path,
        edital_text_content: processed.content,
        updated_at: new Date().toISOString()
      })
      .eq('id', opportunityId)
      .select()
      .single();

    if (error) throw error;

    console.log('[GrantService] Edital PDF uploaded:', {
      opportunityId,
      path: processed.path,
      contentLength: processed.content.length
    });

    return data as GrantOpportunity;
  } catch (error) {
    console.error('Erro ao fazer upload do PDF do edital:', error);
    throw new Error(`Falha ao fazer upload do PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Remove o PDF do edital
 *
 * @param opportunityId - ID da oportunidade
 * @returns Oportunidade atualizada
 * @throws Error se a remoção falhar
 */
export async function deleteEditalPDF(
  opportunityId: string
): Promise<GrantOpportunity> {
  try {
    // 1. Get current opportunity to find the PDF path
    const { data: opportunity, error: fetchError } = await supabase
      .from('grant_opportunities')
      .select('edital_pdf_path')
      .eq('id', opportunityId)
      .single();

    if (fetchError) throw fetchError;

    // 2. Delete file from storage if it exists
    if (opportunity?.edital_pdf_path) {
      const { error: storageError } = await supabase.storage
        .from('editais')
        .remove([opportunity.edital_pdf_path]);

      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
        // Continue even if storage deletion fails
      }
    }

    // 3. Update opportunity to remove PDF references
    const { data, error } = await supabase
      .from('grant_opportunities')
      .update({
        edital_pdf_path: null,
        edital_text_content: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', opportunityId)
      .select()
      .single();

    if (error) throw error;

    console.log('[GrantService] Edital PDF deleted:', { opportunityId });

    return data as GrantOpportunity;
  } catch (error) {
    console.error('Erro ao deletar PDF do edital:', error);
    throw new Error(`Falha ao deletar PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}
