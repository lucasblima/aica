/**
 * tools.ts — AI SDK tool definitions for gemini-chat-v2.
 *
 * Exports `createChatTools(supabaseAdmin, userId)` which returns tool definitions
 * that the AI model can invoke during a conversation.
 *
 * All tools enforce authorization by filtering queries with userId.
 * Tool descriptions are in Portuguese to match the AI's language.
 */

import { tool } from 'npm:ai@^6'
import { z } from 'npm:zod@^3'
import { buildUserContext } from '../_shared/context-builder.ts'

/**
 * Create chat tools scoped to a specific user.
 *
 * @param supabaseAdmin - Supabase admin client (service_role)
 * @param userId - Authenticated user's ID — all queries filter by this
 * @returns Record of tool definitions for streamText
 */
export function createChatTools(supabaseAdmin: any, userId: string) {
  return {
    // ========================================================================
    // COMPLETE TASK — Mark a work_item as done
    // ========================================================================
    complete_task: tool({
      description:
        'Marcar uma tarefa como concluida no Atlas. ' +
        'Use quando o usuario disser que terminou, completou, ou concluiu uma tarefa. ' +
        'Requer o ID da tarefa (task_id).',
      parameters: z.object({
        task_id: z.string().uuid().describe('ID da tarefa a ser concluida'),
      }),
      execute: async ({ task_id }) => {
        console.log(`[complete_task] task_id=${task_id}`)

        // Verify the task belongs to the user before updating
        const { data: existing, error: fetchError } = await supabaseAdmin
          .from('work_items')
          .select('id, title, status')
          .eq('id', task_id)
          .eq('user_id', userId)
          .single()

        if (fetchError || !existing) {
          console.error('[complete_task] Task not found or unauthorized')
          return {
            success: false,
            error: 'Tarefa nao encontrada ou voce nao tem permissao.',
          }
        }

        if (existing.status === 'completed') {
          return {
            success: true,
            message: 'A tarefa ja estava concluida.',
            task: { id: existing.id, status: existing.status },
          }
        }

        // Update task status to completed
        const updateData: Record<string, any> = {
          status: 'completed',
          is_completed: true,
          completed_at: new Date().toISOString(),
        }

        const { data: updated, error: updateError } = await supabaseAdmin
          .from('work_items')
          .update(updateData)
          .eq('id', task_id)
          .eq('user_id', userId)
          .select('id, title, status, completed_at')
          .single()

        if (updateError) {
          console.error('[complete_task] Update failed')
          return { success: false, error: 'Erro ao concluir tarefa.' }
        }

        console.log(`[complete_task] Success: task ${updated.id} completed`)
        return {
          success: true,
          message: `Tarefa "${updated.title}" concluida com sucesso!`,
          task: updated,
        }
      },
    }),

    // ========================================================================
    // CREATE TASK — Create a new work_item in Atlas
    // ========================================================================
    create_task: tool({
      description:
        'Criar uma nova tarefa no modulo Atlas. ' +
        'Use SEMPRE que o usuario pedir para criar, adicionar, ou registrar uma tarefa. ' +
        'NUNCA apenas descreva a tarefa — SEMPRE execute esta ferramenta para cria-la de fato.',
      parameters: z.object({
        title: z.string().min(1).max(200).describe('Titulo da tarefa'),
        description: z.string().max(2000).optional().describe('Descricao detalhada da tarefa'),
        is_urgent: z.boolean().describe('Tarefa urgente? (Eisenhower Q1 ou Q3)'),
        is_important: z.boolean().describe('Tarefa importante? (Eisenhower Q1 ou Q2)'),
        due_date: z.string().optional().describe('Data limite no formato YYYY-MM-DD'),
        priority: z.enum(['urgent', 'high', 'medium', 'low', 'none']).optional().describe('Prioridade geral'),
      }),
      execute: async ({ title, description, is_urgent, is_important, due_date, priority }) => {
        console.log(`[create_task] urgent=${is_urgent}, important=${is_important}`)

        const taskData: Record<string, any> = {
          user_id: userId,
          title,
          description: description || null,
          status: 'todo',
          is_urgent,
          is_important,
          priority: priority || 'medium',
          due_date: due_date || null,
          archived: false,
          is_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        const { data: task, error } = await supabaseAdmin
          .from('work_items')
          .insert(taskData)
          .select('id, title, status, is_urgent, is_important, priority, due_date')
          .single()

        if (error) {
          console.error('[create_task] Insert failed')
          return { success: false, error: 'Erro ao criar tarefa.' }
        }

        // Determine Eisenhower quadrant for response
        const quadrant = is_urgent && is_important ? 'Q1 (Urgente + Importante: Fazer Agora)'
          : !is_urgent && is_important ? 'Q2 (Importante, Nao Urgente: Planejar/Agendar)'
          : is_urgent && !is_important ? 'Q3 (Urgente, Nao Importante: Delegar)'
          : 'Q4 (Nem Urgente, Nem Importante: Eliminar)'

        console.log(`[create_task] Success: task ${task.id} in ${quadrant}`)
        return {
          success: true,
          message: `Tarefa "${task.title}" criada com sucesso! Categorizada como ${quadrant}.`,
          task,
          quadrant,
        }
      },
    }),

    // ========================================================================
    // CREATE MOMENT — Create a Journey moment/reflection
    // ========================================================================
    create_moment: tool({
      description:
        'Criar um momento ou reflexao no modulo Journey. ' +
        'Use quando o usuario quiser registrar um sentimento, reflexao, ou experiencia. ' +
        'Capture o conteudo e a emocao do usuario.',
      parameters: z.object({
        content: z
          .string()
          .min(1)
          .max(2000)
          .describe('Conteudo do momento — o que o usuario quer registrar'),
        emotion: z
          .enum([
            'happy', 'sad', 'anxious', 'angry', 'thoughtful', 'calm',
            'grateful', 'tired', 'inspired', 'neutral', 'excited',
            'disappointed', 'frustrated', 'loving', 'scared', 'determined',
            'sleepy', 'overwhelmed', 'confident', 'confused',
          ])
          .describe('Emocao principal detectada no conteudo'),
        tags: z
          .array(z.string())
          .max(5)
          .optional()
          .describe('Tags opcionais para categorizar o momento (max 5)'),
      }),
      execute: async ({ content, emotion, tags }) => {
        console.log(`[create_moment] emotion=${emotion}`)

        const momentData: Record<string, any> = {
          user_id: userId,
          content,
          emotion,
          type: 'text',
          tags: tags || [],
          created_at: new Date().toISOString(),
        }

        const { data: moment, error } = await supabaseAdmin
          .from('moments')
          .insert(momentData)
          .select('id, content, emotion, created_at')
          .single()

        if (error) {
          console.error('[create_moment] Insert failed')
          return { success: false, error: 'Erro ao criar momento.' }
        }

        console.log('[create_moment] Success')
        return {
          success: true,
          message: `Momento registrado com sucesso! Emocao: ${emotion}`,
          moment,
        }
      },
    }),

    // ========================================================================
    // GET USER CONTEXT — Fetch cross-module data on demand
    // ========================================================================
    get_user_context: tool({
      description:
        'Buscar dados atualizados do usuario de um modulo especifico. ' +
        'Use quando precisar de informacoes atuais para responder melhor ' +
        '(tarefas, momentos, financas, eventos, contatos, etc).',
      parameters: z.object({
        module: z
          .enum([
            'atlas', 'journey', 'finance', 'connections',
            'studio', 'flux', 'agenda', 'captacao', 'coordinator',
          ])
          .describe('Modulo de onde buscar dados do usuario'),
      }),
      execute: async ({ module }) => {
        console.log(`[get_user_context] module=${module}`)

        try {
          const { contextString } = await buildUserContext(supabaseAdmin, userId, module)

          if (!contextString) {
            return {
              success: true,
              message: `Nenhum dado encontrado para o modulo ${module}.`,
              context: '',
            }
          }

          return {
            success: true,
            message: `Dados do modulo ${module} carregados.`,
            context: contextString,
          }
        } catch (error) {
          console.error('[get_user_context] Failed:', (error as Error).message)
          return { success: false, error: 'Erro ao buscar dados do usuario.' }
        }
      },
    }),
  }
}
