/**
 * gemini-chat-v2 — AI SDK-powered chat Edge Function.
 *
 * This is the v2 chat endpoint that uses the Vercel AI SDK (`streamText`)
 * with the `@ai-sdk/google` provider for streaming responses + tool calling.
 *
 * Request format (from AI SDK `useChat` hook):
 * { messages: [{role, content}, ...], session_id?: string }
 *
 * Response: AI SDK UI Message Stream (streaming text + tool results)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { streamText, generateText, convertToModelMessages } from 'npm:ai@^6'
import { createGoogleGenerativeAI } from 'npm:@ai-sdk/google@^3'

import { getCorsHeaders } from '../_shared/cors.ts'
import { extractUserId } from '../_shared/gemini-helpers.ts'
import { VALID_AGENTS } from '../_shared/agent-prompts.ts'
import { buildSystemPrompt } from './system-prompt.ts'
import { createChatTools } from './tools.ts'

// ============================================================================
// INTENT CLASSIFICATION — Lightweight module detection using AI SDK
// ============================================================================

/**
 * Classify the user's last message into a module using generateText.
 * Returns a module name from VALID_AGENTS (defaults to 'coordinator').
 */
async function classifyIntent(
  google: ReturnType<typeof createGoogleGenerativeAI>,
  lastMessage: string,
): Promise<string> {
  try {
    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      temperature: 0.1,
      maxTokens: 256,
      system: `Voce e um classificador de intencoes. Analise a mensagem e retorne APENAS o nome do modulo mais relevante, sem explicacao.

Modulos disponiveis:
- atlas: tarefas, prioridades, produtividade, to-do, prazos
- journey: momentos, emocoes, diario, autoconhecimento, reflexao
- connections: contatos, CRM, WhatsApp, pessoas, networking
- finance: dinheiro, contas, orcamento, gastos, investimentos
- flux: treinos, atletas, exercicios, coaching, academia
- studio: podcast, episodios, convidados, gravacao, pauta
- captacao: editais, grants, FAPERJ, CNPq, propostas, captacao
- agenda: reunioes, eventos, calendario, horarios, compromissos
- coordinator: conversa geral, saudacao, ou multiplos modulos

Retorne APENAS o nome do modulo (ex: "atlas", "journey", "coordinator").`,
      prompt: lastMessage,
    })

    const module = text.trim().toLowerCase().replace(/[^a-z]/g, '')
    if (VALID_AGENTS.includes(module)) {
      console.log(`[classifyIntent] Classified as: ${module}`)
      return module
    }

    console.log(`[classifyIntent] Invalid classification "${text}", defaulting to coordinator`)
    return 'coordinator'
  } catch (error) {
    console.error('[classifyIntent] Error:', (error as Error).message)
    return 'coordinator'
  }
}

// ============================================================================
// FIRE-AND-FORGET: Log chat interaction
// ============================================================================

/**
 * Log the chat interaction asynchronously (does not block response).
 * Uses the existing log_interaction RPC (same as gemini-chat v1).
 */
async function logInteraction(
  supabaseAdmin: any,
  userId: string,
  module: string,
) {
  try {
    const { error } = await supabaseAdmin.rpc('log_interaction', {
      p_user_id: userId,
      p_action: 'chat_aica_v2',
      p_module: module,
      p_model: 'gemini-2.5-flash',
      p_tokens_in: 0,
      p_tokens_out: 0,
    })
    if (error) {
      console.warn(`[gemini-chat-v2] Failed to log interaction:`, error.message)
    } else {
      console.log(`[gemini-chat-v2] Interaction logged: module=${module}`)
    }
  } catch (err) {
    console.warn(`[gemini-chat-v2] Unexpected log error:`, err)
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
  // --- CORS ---
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // --- AUTH ---
    const userId = extractUserId(req)
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Autenticacao necessaria' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // --- PARSE REQUEST ---
    let body: any
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Corpo da requisicao invalido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    const { messages, session_id: sessionId } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Mensagens sao obrigatorias' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // --- INIT PROVIDERS ---
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not set')
    }

    const google = createGoogleGenerativeAI({ apiKey })

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    // --- CONVERT UI MESSAGES TO MODEL MESSAGES ---
    // useChat sends UIMessage[] (with parts array), streamText needs CoreMessage[]
    const modelMessages = await convertToModelMessages(messages)

    // --- INTENT CLASSIFICATION ---
    // Extract last user message text for classification
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user')
    const lastUserText = lastUserMsg?.parts
      ?.filter((p: any) => p.type === 'text')
      ?.map((p: any) => p.text)
      ?.join('') || lastUserMsg?.content || ''

    const module = await classifyIntent(google, lastUserText)

    // --- BUILD SYSTEM PROMPT ---
    const systemPrompt = await buildSystemPrompt(module, userId, supabaseAdmin)

    // --- CREATE TOOLS ---
    const tools = createChatTools(supabaseAdmin, userId)

    // --- STREAM RESPONSE ---
    const result = streamText({
      model: google('gemini-2.5-flash'),
      system: systemPrompt,
      messages: modelMessages,
      tools,
      maxSteps: 3,
      temperature: 0.7,
      maxTokens: 4096,
    })

    // --- LOG INTERACTION (fire-and-forget) ---
    logInteraction(supabaseAdmin, userId, module)

    // --- RETURN UI MESSAGE STREAM WITH CORS ---
    // Must use toUIMessageStreamResponse (NOT toDataStreamResponse)
    // because DefaultChatTransport on the client expects UIMessageChunk format
    return result.toUIMessageStreamResponse({ headers: corsHeaders })
  } catch (error) {
    console.error('[gemini-chat-v2] Error:', (error as Error).message)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
