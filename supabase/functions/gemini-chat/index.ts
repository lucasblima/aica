// ==========================================================================
// gemini-chat — Thin router for all AI-powered chat and module actions
//
// Architecture:
//   index.ts           → Router (this file): parses request, routes to handler
//   handlers/           → Route handlers (one per domain concern):
//     stream.ts         → SSE streaming chat (primary chat path)
//     chat.ts           → Legacy non-streaming chat
//     agent-chat.ts     → Module-specific agent conversations
//     actions.ts        → Chat action execution (complete task, create moment, etc.)
//     whatsapp.ts       → WhatsApp sentiment analysis
//     *-temp.ts         → Temporary module handlers (to be migrated to dedicated Edge Functions)
//   _shared/            → Pure functions shared across ALL Edge Functions:
//     context-builder.ts  → buildUserContext, generateSuggestedActions, generateSuggestedQuestions
//     intent-classifier.ts → classifyIntent (module detection from message)
//     agent-prompts.ts     → System prompts per module agent
//     gemini-helpers.ts    → Model constants, date context, JWT extraction
//     gemini-types.ts      → TypeScript types for all payloads
//     model-router.ts      → callAI with complexity cascade, extractJSON
//     cors.ts              → CORS header handling
//     health-tracker.ts    → Health tracking wrapper
//
// Rules:
//   - Handlers NEVER import from other handlers (use _shared/ as intermediary)
//   - All Gemini API calls use gemini-2.5-flash (fast) or gemini-2.5-pro (smart)
//   - Usage tracking is fire-and-forget (non-blocking)
// ==========================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0"
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm"

// Shared helpers
import { getCorsHeaders } from '../_shared/cors.ts'
import { MODELS, SMART_MODEL_ACTIONS, extractUserId } from '../_shared/gemini-helpers.ts'
import type {
  BaseRequest, ChatRequest,
  SentimentAnalysisPayload, WeeklySummaryPayload,
  GenerateDossierPayload, IceBreakerPayload,
  PautaQuestionsPayload, PautaOutlinePayload,
  DailyReportPayload,
  GenerateFieldContentPayload, AnalyzeEditalStructurePayload,
  ParseFormFieldsPayload, GenerateAutoBriefingPayload,
  ImproveBriefingFieldPayload, ExtractRequiredDocumentsPayload,
  ExtractTimelinePhasesPayload,
  ParseStatementPayload, ResearchGuestPayload,
  WhatsAppSentimentPayload, AnalyzeMomentPayload,
  ChatWithAgentPayload, CategorizeTransactionsPayload,
  EvaluateQualityPayload,
} from '../_shared/gemini-types.ts'

// Daily question handler (separate file, not in handlers/)
import { handleGenerateDailyQuestion, type GenerateDailyQuestionPayload } from "./daily-question-handler.ts"

// Permanent chat handlers
import { handleLegacyChat } from './handlers/chat.ts'
import { handleChatWithAgent } from './handlers/agent-chat.ts'
import { handleStreamChat } from './handlers/stream.ts'
import { handleClassifyIntent, handleExecuteChatAction } from './handlers/actions.ts'
import { handleWhatsAppSentiment } from './handlers/whatsapp.ts'

// Temporary module handlers (removed when their dedicated Edge Function is created)
import {
  handleAnalyzeMomentSentiment, handleGenerateWeeklySummary,
  handleAnalyzeMoment, handleEvaluateQuality,
  handleAnalyzeContentRealtime, handleGeneratePostCaptureInsight,
  handleClusterMomentsByTheme, handleGenerateDailyReport
} from './handlers/journey-temp.ts'
import {
  handleGenerateDossier, handleGenerateIceBreakers,
  handleGeneratePautaQuestions, handleGeneratePautaOutline, handleResearchGuest
} from './handlers/studio-temp.ts'
import {
  handleGenerateFieldContent, handleAnalyzeEditalStructure,
  handleParseFormFields, handleGenerateAutoBriefing,
  handleImproveBriefingField, handleExtractRequiredDocuments,
  handleExtractTimelinePhases
} from './handlers/grants-temp.ts'
import { handleParseStatement, handleCategorizeTransactions } from './handlers/finance-temp.ts'
import { handleExtractTaskFromVoice, handleTranscribeAudio, handleGenerateTags } from './handlers/atlas-temp.ts'

// ============================================================================
// ENV VARS
// ============================================================================

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// ============================================================================
// MAIN SERVER — thin router, all logic lives in handlers/
// ============================================================================

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY nao configurada')
      return new Response(JSON.stringify({ error: 'API key nao configurada no servidor' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const body = await req.json()

    // Extract user ID from JWT for usage logging (best-effort, non-blocking)
    const userId = extractUserId(req)

    if (body.action) {
      const { action, payload } = body as BaseRequest
      console.log(`[gemini-chat] Action: ${action}`)

      let result: any

      switch (action) {
        // ── Journey (temporary) ──────────────────────────────────────
        case 'analyze_moment_sentiment':
          result = await handleAnalyzeMomentSentiment(genAI, payload as SentimentAnalysisPayload)
          break
        case 'generate_weekly_summary':
          result = await handleGenerateWeeklySummary(genAI, payload as WeeklySummaryPayload)
          break
        case 'analyze_content_realtime':
          result = await handleAnalyzeContentRealtime(genAI, payload)
          break
        case 'generate_post_capture_insight':
          result = await handleGeneratePostCaptureInsight(genAI, payload)
          break
        case 'cluster_moments_by_theme':
          result = await handleClusterMomentsByTheme(genAI, payload)
          break
        case 'generate_daily_report':
          result = await handleGenerateDailyReport(genAI, payload as DailyReportPayload)
          break
        case 'analyze_moment':
          result = await handleAnalyzeMoment(genAI, payload as AnalyzeMomentPayload)
          break
        case 'evaluate_quality':
          result = await handleEvaluateQuality(genAI, payload as EvaluateQualityPayload)
          break
        case 'generate_daily_question':
          result = await handleGenerateDailyQuestion(genAI, payload as GenerateDailyQuestionPayload)
          break

        // ── Studio (temporary) ───────────────────────────────────────
        case 'generate_dossier':
          result = await handleGenerateDossier(genAI, payload as GenerateDossierPayload)
          break
        case 'generate_ice_breakers':
          result = await handleGenerateIceBreakers(genAI, payload as IceBreakerPayload)
          break
        case 'generate_pauta_questions':
          result = await handleGeneratePautaQuestions(genAI, payload as PautaQuestionsPayload)
          break
        case 'generate_pauta_outline':
          result = await handleGeneratePautaOutline(genAI, payload as PautaOutlinePayload)
          break
        case 'research_guest':
          result = await handleResearchGuest(genAI, payload as ResearchGuestPayload)
          break

        // ── Grants (temporary) ───────────────────────────────────────
        case 'generate_field_content':
          result = await handleGenerateFieldContent(genAI, payload as GenerateFieldContentPayload)
          break
        case 'analyze_edital_structure':
          result = await handleAnalyzeEditalStructure(genAI, payload as AnalyzeEditalStructurePayload)
          break
        case 'parse_form_fields':
          result = await handleParseFormFields(genAI, payload as ParseFormFieldsPayload)
          break
        case 'generate_auto_briefing':
          result = await handleGenerateAutoBriefing(genAI, payload as GenerateAutoBriefingPayload)
          break
        case 'improve_briefing_field':
          result = await handleImproveBriefingField(genAI, payload as ImproveBriefingFieldPayload)
          break
        case 'extract_required_documents':
          result = await handleExtractRequiredDocuments(genAI, payload as ExtractRequiredDocumentsPayload)
          break
        case 'extract_timeline_phases':
          result = await handleExtractTimelinePhases(genAI, payload as ExtractTimelinePhasesPayload)
          break

        // ── Finance (temporary) ──────────────────────────────────────
        case 'parse_statement':
          result = await handleParseStatement(genAI, payload as ParseStatementPayload)
          break
        case 'categorize_transactions':
          result = await handleCategorizeTransactions(genAI, payload as CategorizeTransactionsPayload)
          break

        // ── Atlas (temporary) ────────────────────────────────────────
        case 'transcribe_audio':
          result = await handleTranscribeAudio(genAI, payload)
          break
        case 'extract_task_from_voice':
          result = await handleExtractTaskFromVoice(genAI, payload as { transcription: string })
          break
        case 'generate_tags':
          result = await handleGenerateTags(genAI, payload)
          break

        // ── WhatsApp (permanent) ─────────────────────────────────────
        case 'whatsapp_sentiment':
        case 'sentiment_analysis':
          result = await handleWhatsAppSentiment(genAI, payload as WhatsAppSentimentPayload)
          break

        // ── Chat (permanent) ─────────────────────────────────────────
        case 'chat_aica':
        case 'finance_chat': {
          const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false },
          })
          const chatResult = await handleLegacyChat(
            genAI,
            { message: payload?.message, context: payload?.context, history: payload?.history, systemPrompt: payload?.systemPrompt, module: payload?.module },
            supabaseAdmin,
            userId
          )
          result = chatResult
          break
        }
        case 'chat_aica_stream': {
          // SSE streaming — returns Response directly (not JSON-wrapped)
          const supabaseAdminStream = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false },
          })
          return await handleStreamChat(genAI, payload, supabaseAdminStream, userId, corsHeaders, GEMINI_API_KEY)
        }
        case 'chat_with_agent': {
          const agentName = (body as any).agent || payload?.agent || 'coordinator'
          const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false },
          })
          result = await handleChatWithAgent(
            genAI,
            agentName,
            payload as ChatWithAgentPayload,
            supabaseAdmin,
            userId
          )
          break
        }
        case 'generate_morning_briefing': {
          const briefingAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false },
          })
          const { buildUserContext } = await import('../_shared/context-builder.ts')
          const ctx = await buildUserContext(briefingAdmin, userId!, 'coordinator')

          const briefingModel = genAI.getGenerativeModel({
            model: MODELS.fast,
            generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
          })

          const now = new Date()
          const hour = now.toLocaleString('pt-BR', { hour: '2-digit', timeZone: 'America/Sao_Paulo' })
          const today = now.toISOString().split('T')[0]
          const dow = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'][now.getDay()]

          const briefingPrompt = `Voce e a AICA, assistente pessoal do usuario. Gere um briefing matinal curto e motivacional em portugues.

## Data: ${today} (${dow}), ${hour}h

## Dados do usuario:
${ctx.contextString}

## Instrucoes:
- Cumprimente pelo nome se disponivel
- Mencione quantas tarefas tem para hoje e se alguma esta atrasada
- Mencione eventos do dia se houver
- Se tiver Life Score, comente brevemente
- Maximo 3-4 frases, tom amigavel e energizante
- Use emojis com moderacao (1-2 no maximo)
- NAO liste tudo — seja conciso e destaque o mais importante`

          const briefingResult = await briefingModel.generateContent(briefingPrompt)
          const briefingText = briefingResult.response.text().trim()
          result = { success: true, briefing: briefingText }
          break
        }
        case 'generate_title': {
          const titleMessage = payload?.message || ''
          const titleResponse = (payload?.response || '').substring(0, 200)
          const titlePrompt = `Gere um titulo curto (max 40 caracteres) em portugues para esta conversa. Responda APENAS com o titulo, sem aspas.\n\nUsuario: ${titleMessage}\nAssistente: ${titleResponse}`
          const titleModel = genAI.getGenerativeModel({ model: MODELS.fast, generationConfig: { temperature: 0.3, maxOutputTokens: 256 } })
          const titleResult = await titleModel.generateContent(titlePrompt)
          const generatedTitle = titleResult.response.text().trim().substring(0, 60)
          result = { success: true, title: generatedTitle }
          break
        }

        // ── Actions (permanent) ──────────────────────────────────────
        case 'classify_intent':
          result = await handleClassifyIntent(payload, GEMINI_API_KEY)
          break
        case 'execute_chat_action': {
          if (!userId) {
            return new Response(JSON.stringify({ error: 'Autenticacao necessaria', success: false }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          }
          const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false },
          })
          result = await handleExecuteChatAction(supabaseAdmin, userId, payload as { action_type: string; params: Record<string, any> })
          break
        }

        default:
          return new Response(JSON.stringify({ error: `Action desconhecida: ${action}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const latencyMs = Date.now() - startTime
      console.log(`[gemini-chat] Action ${action} completed in ${latencyMs}ms`)

      // Extract usageMetadata if present (for AI cost tracking)
      const usageMetadata = (result as any)?.__usageMetadata || null

      // Determine which model was used for this action
      const modelName = SMART_MODEL_ACTIONS.includes(action!) ? MODELS.smart : MODELS.fast

      // Fire-and-forget: log interaction for billing/usage tracking
      if (userId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
        supabaseAdmin.rpc('log_interaction', {
          p_user_id: userId,
          p_action: action,
          p_module: payload?.module || (body as any)?.agent || null,
          p_model: modelName,
          p_tokens_in: usageMetadata?.promptTokenCount || 0,
          p_tokens_out: usageMetadata?.candidatesTokenCount || 0,
        }).then(() => {
          console.log(`[gemini-chat] Logged interaction: ${action}`)
        }).catch((err: any) => {
          console.warn(`[gemini-chat] Failed to log interaction: ${err.message}`)
        })
      }

      return new Response(
        JSON.stringify({
          result: (result as any)?.__usageMetadata ? { ...(result as any), __usageMetadata: undefined } : result,
          success: true,
          latencyMs,
          cached: false,
          ...(usageMetadata && { usageMetadata })
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } else {
      const result = await handleLegacyChat(genAI, body as ChatRequest)
      console.log('[gemini-chat] Legacy chat response generated')
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

  } catch (error) {
    const err = error as Error
    console.error('[gemini-chat] Error:', err.message)

    let statusCode = 500
    let errorCode = 'SERVER_ERROR'
    let userMessage = err.message || 'Erro interno do servidor'

    // Detect specific error types for better diagnostics
    if (err.message.includes('obrigatorio') || err.message.includes('deve ser')) {
      statusCode = 400
      errorCode = 'VALIDATION_ERROR'
    } else if (err.message.includes('API key expired') || err.message.includes('API key not valid') || err.message.includes('API_KEY_INVALID')) {
      statusCode = 503
      errorCode = 'API_KEY_EXPIRED'
      userMessage = 'Servico de IA temporariamente indisponivel. A chave da API precisa ser renovada. Contate o administrador.'
      console.error('[gemini-chat] CRITICAL: Gemini API key is expired or invalid! See docs/GEMINI_API_SETUP.md for renewal instructions.')
    } else if (err.message.includes('quota') || err.message.includes('Resource exhausted')) {
      statusCode = 429
      errorCode = 'RATE_LIMITED'
      userMessage = 'Limite de requisicoes excedido. Tente novamente em alguns minutos.'
    } else if (err.message.includes('permission') || err.message.includes('403')) {
      statusCode = 403
      errorCode = 'PERMISSION_DENIED'
      userMessage = 'Permissao negada para acessar o servico de IA.'
    }

    return new Response(
      JSON.stringify({
        error: userMessage,
        errorCode,
        success: false
      }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
