/**
 * gemini-chat-v2 — Action-First Chat Architecture
 *
 * Flow:
 * 1. CLASSIFY: Fast generateText (no thinking) → action or conversation?
 * 2a. ACTION: Extract params → execute DB → stream confirmation
 * 2b. CONVERSATION: streamText with full context (with thinking)
 *
 * The server decides and acts. Gemini only generates natural text.
 * No dependency on Gemini function calling.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { streamText, generateText, convertToModelMessages, createUIMessageStream } from 'npm:ai@^6'
import { createGoogleGenerativeAI } from 'npm:@ai-sdk/google@^3'

import { getCorsHeaders } from '../_shared/cors.ts'
import { extractUserId } from '../_shared/gemini-helpers.ts'
import { buildSystemPrompt } from './system-prompt.ts'
import { executeAction, type ActionResult } from './actions.ts'

// ============================================================================
// STEP 1: CLASSIFY — Is this an action or a conversation?
// ============================================================================

interface ClassifyResult {
  type: 'action' | 'conversation'
  action?: string
  params?: Record<string, any>
  module: string
  ack?: string
}

async function classifyAndExtract(
  google: ReturnType<typeof createGoogleGenerativeAI>,
  lastMessage: string,
): Promise<ClassifyResult> {
  try {
    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      temperature: 0,
      maxTokens: 512,
      providerOptions: { google: { thinkingConfig: { thinkingBudget: 0 } } },
      system: `Voce classifica mensagens de chat. Retorne APENAS JSON valido, sem explicacao.

Se o usuario pede uma ACAO (criar, agendar, registrar, completar, marcar):
{"type":"action","action":"<tipo>","params":{...},"module":"<modulo>","ack":"<frase curta de confirmacao>"}

Acoes disponiveis:
- create_task: params: {title, description?, is_urgent, is_important, due_date?, priority?}
- create_event: params: {title, start_time (ISO 8601 com timezone -03:00), end_time?, description?, location?}
- create_moment: params: {content, emotion (happy|sad|anxious|angry|thoughtful|calm|grateful|tired|inspired|neutral|excited|disappointed|frustrated|loving|scared|determined|sleepy|overwhelmed|confident|confused), tags?}
- complete_task: params: {task_id} (requer ID, se nao tem, use conversation)

Se o usuario faz uma PERGUNTA ou CONVERSA:
{"type":"conversation","module":"<modulo>"}

Modulos: atlas, journey, connections, finance, flux, studio, captacao, agenda, coordinator

Hoje: ${new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
Amanha: ${new Date(Date.now() + 86400000).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
Hora: ${new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}

Exemplos:
"Crie uma tarefa para comprar leite" → {"type":"action","action":"create_task","params":{"title":"Comprar leite","is_urgent":false,"is_important":false},"module":"atlas","ack":"Criando tarefa..."}
"Reuniao amanha as 15h na gavea" → {"type":"action","action":"create_event","params":{"title":"Reunião na Gávea","start_time":"${new Date(Date.now() + 86400000).toISOString().split('T')[0]}T15:00:00-03:00","location":"Gávea"},"module":"agenda","ack":"Agendando reunião..."}
"Como estou me sentindo?" → {"type":"conversation","module":"journey"}
"Estou frustrado com o trabalho" → {"type":"action","action":"create_moment","params":{"content":"Estou frustrado com o trabalho","emotion":"frustrated"},"module":"journey","ack":"Registrando momento..."}`,
      prompt: lastMessage,
    })

    // Parse JSON from response (strip code fences if present, find JSON object)
    const cleaned = text.replace(/```(?:json)?\s*\n?/g, '').replace(/\n?```$/g, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON object found in classifier response')
    const result = JSON.parse(jsonMatch[0])
    console.log(`[classify] type=${result.type}, action=${result.action || 'none'}, module=${result.module}`)
    return result
  } catch (error) {
    console.error('[classify] Failed, defaulting to conversation:', (error as Error).message)
    return { type: 'conversation', module: 'coordinator' }
  }
}

// ============================================================================
// FIRE-AND-FORGET: Log interaction
// ============================================================================

function logInteraction(supabaseAdmin: any, userId: string, module: string) {
  supabaseAdmin
    .rpc('log_interaction', {
      p_user_id: userId, p_action: 'chat_aica_v2', p_module: module,
      p_model: 'gemini-2.5-flash', p_tokens_in: 0, p_tokens_out: 0,
    })
    .then(() => console.log(`[log] module=${module}`))
    .catch((err: any) => console.warn('[log] failed:', err.message))
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // --- AUTH ---
    const userId = extractUserId(req)
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Autenticacao necessaria' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // --- PARSE ---
    let body: any
    try { body = await req.json() } catch {
      return new Response(
        JSON.stringify({ error: 'Corpo da requisicao invalido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    const { messages } = body
    if (!messages?.length) {
      return new Response(
        JSON.stringify({ error: 'Mensagens sao obrigatorias' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // --- INIT ---
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error('GEMINI_API_KEY not set')
    const google = createGoogleGenerativeAI({ apiKey })
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    // --- EXTRACT LAST USER MESSAGE ---
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user')
    const lastUserText = lastUserMsg?.parts
      ?.filter((p: any) => p.type === 'text')
      ?.map((p: any) => p.text)
      ?.join('') || lastUserMsg?.content || ''

    // --- STEP 1: CLASSIFY (fast, no thinking) ---
    const classified = await classifyAndExtract(google, lastUserText)

    // --- LOG (fire-and-forget) ---
    logInteraction(supabaseAdmin, userId, classified.module)

    // --- STEP 2a: ACTION PATH ---
    if (classified.type === 'action' && classified.action && classified.params) {
      console.log(`[action] Executing: ${classified.action}`)

      // Execute DB action directly
      const actionResult = await executeAction(
        supabaseAdmin, userId, classified.action, classified.params
      )

      // Stream: ACK + confirmation
      const confirmPrompt = actionResult.success
        ? `Acao executada com sucesso. Resultado: ${actionResult.message}. Confirme ao usuario de forma natural e calorosa em portugues. Seja breve (1-2 frases).`
        : `Acao falhou: ${actionResult.error}. Informe ao usuario de forma gentil em portugues. Sugira alternativa se possivel.`

      try {
        const result = streamText({
          model: google('gemini-2.5-flash'),
          temperature: 0.7,
          maxTokens: 1024,
          providerOptions: { google: { thinkingConfig: { thinkingBudget: 0 } } },
          system: 'Voce e a Aica, assistente pessoal calorosa e brasileira. Responda em portugues, de forma breve e natural.',
          prompt: confirmPrompt,
        })

        return result.toUIMessageStreamResponse({ headers: corsHeaders })
      } catch (streamErr) {
        console.warn('[gemini-chat-v2] Confirmation stream failed, using fallback:', (streamErr as Error).message)
        // Return action result as a simple streaming text
        return new Response(
          JSON.stringify({ role: 'assistant', content: actionResult.message || 'Acao executada.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
    }

    // --- STEP 2b: CONVERSATION PATH ---
    const modelMessages = await convertToModelMessages(messages)
    const systemPrompt = await buildSystemPrompt(classified.module, userId, supabaseAdmin)

    const result = streamText({
      model: google('gemini-2.5-flash'),
      system: systemPrompt,
      messages: modelMessages,
      temperature: 0.7,
      maxTokens: 4096,
    })

    return result.toUIMessageStreamResponse({ headers: corsHeaders })
  } catch (error) {
    console.error('[gemini-chat-v2] Error:', (error as Error).message)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
