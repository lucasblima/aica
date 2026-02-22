/**
 * Supabase Edge Function: gemini-live
 *
 * Real-time chat with Gemini for podcast interview preparation.
 * Supports two modes:
 * - SSE (Server-Sent Events): For text chat streaming (default)
 * - WebSocket: For bidirectional audio/video streaming (future)
 *
 * SSE is preferred for chat because:
 * - Simpler client implementation
 * - Better compatibility with fetch API
 * - Automatic reconnection handling
 * - Lower overhead for text-only communication
 *
 * @module gemini-live
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0"
import { getCorsHeaders } from "../_shared/cors.ts"

// =====================================================
// CONFIGURATION
// =====================================================

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Rate limiting
const MAX_CONCURRENT_SESSIONS = 10
const SESSION_TIMEOUT_MS = 60000 // 60 seconds
const activeSessions = new Map<string, { startTime: Date; lastActivity: Date }>()

// Clean up stale sessions periodically
setInterval(() => {
  const now = Date.now()
  for (const [sessionId, session] of activeSessions.entries()) {
    if (now - session.lastActivity.getTime() > SESSION_TIMEOUT_MS) {
      activeSessions.delete(sessionId)
      console.log(`[gemini-live] Cleaned up stale session: ${sessionId}`)
    }
  }
}, 30000) // Every 30 seconds

// =====================================================
// TYPES
// =====================================================

interface ChatRequest {
  action: 'chat' | 'end_session'
  session_id?: string
  message?: string
  context?: {
    guest_name: string
    guest_bio?: string
    episode_theme?: string
    dossier_summary?: string
  }
}

interface SessionContext {
  guestName: string
  guestBio: string
  episodeTheme: string
  dossierSummary: string
  chatHistory: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>
}

// In-memory session store (for context persistence)
const sessionContexts = new Map<string, SessionContext>()

// =====================================================
// SYSTEM PROMPTS
// =====================================================

const INTERVIEW_COPILOT_PROMPT = `Voce e um assistente especializado em preparacao de entrevistas para podcasts.

Responsabilidades:
- Ajudar o entrevistador a preparar perguntas relevantes
- Fornecer informacoes sobre o convidado baseado no dossier
- Sugerir angulos interessantes para a entrevista
- Alertar sobre topicos sensiveis ou controversias
- Manter respostas concisas e acionaveis

Estilo:
- Seja direto e objetivo
- Use linguagem profissional mas acessivel
- Priorize informacoes praticas para a entrevista
- Respostas curtas (2-4 frases) a menos que o usuario peca mais detalhes

Contexto da Entrevista:
[CONTEXT_PLACEHOLDER]

Lembre-se: Voce esta ajudando em TEMPO REAL, entao seja rapido e preciso.`

function buildSystemPrompt(context: SessionContext): string {
  const contextInfo = `
Convidado: ${context.guestName}
${context.guestBio ? `Biografia: ${context.guestBio}` : ''}
${context.episodeTheme ? `Tema do Episodio: ${context.episodeTheme}` : ''}
${context.dossierSummary ? `Resumo do Dossier: ${context.dossierSummary}` : ''}
`.trim()

  return INTERVIEW_COPILOT_PROMPT.replace('[CONTEXT_PLACEHOLDER]', contextInfo)
}

// =====================================================
// SSE HELPERS
// =====================================================

function createSSEMessage(type: string, data: Record<string, unknown>): string {
  return `data: ${JSON.stringify({ type, ...data })}\n\n`
}

// =====================================================
// MAIN HANDLER
// =====================================================

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  try {
    // 1. Authentication
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 2. Parse request body
    const body = await req.json() as ChatRequest
    const { action, session_id, message, context } = body

    console.log(`[gemini-live] Action: ${action}, User: ${user.id}, Session: ${session_id || 'new'}`)

    // 3. Handle actions
    switch (action) {
      case 'chat':
        return handleChat(user.id, session_id, message, context, corsHeaders)

      case 'end_session':
        return handleEndSession(user.id, session_id, corsHeaders)

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    }

  } catch (error: unknown) {
    const err = error as Error
    console.error("[gemini-live] Error:", err.message)
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    )
  }
})

// =====================================================
// ACTION HANDLERS
// =====================================================

async function handleChat(
  userId: string,
  sessionId: string | undefined,
  message: string | undefined,
  context: ChatRequest['context'] | undefined,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (!message || !message.trim()) {
    return new Response(
      JSON.stringify({ error: "Message is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  // Generate or validate session ID
  const currentSessionId = sessionId || `${userId}-${Date.now()}`

  // Check rate limiting
  const userSessionCount = Array.from(activeSessions.entries())
    .filter(([id]) => id.startsWith(userId))
    .length

  if (userSessionCount >= MAX_CONCURRENT_SESSIONS && !activeSessions.has(currentSessionId)) {
    return new Response(
      JSON.stringify({
        error: "Maximum concurrent sessions exceeded",
        max: MAX_CONCURRENT_SESSIONS,
      }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  // Get or create session context
  let sessionContext = sessionContexts.get(currentSessionId)

  if (!sessionContext) {
    // New session - initialize context
    sessionContext = {
      guestName: context?.guest_name || 'Convidado',
      guestBio: context?.guest_bio || '',
      episodeTheme: context?.episode_theme || '',
      dossierSummary: context?.dossier_summary || '',
      chatHistory: [],
    }
    sessionContexts.set(currentSessionId, sessionContext)
    console.log(`[gemini-live] New session created: ${currentSessionId}`)
  } else if (context) {
    // Update context if provided
    if (context.guest_name) sessionContext.guestName = context.guest_name
    if (context.guest_bio) sessionContext.guestBio = context.guest_bio
    if (context.episode_theme) sessionContext.episodeTheme = context.episode_theme
    if (context.dossier_summary) sessionContext.dossierSummary = context.dossier_summary
  }

  // Track session activity
  activeSessions.set(currentSessionId, {
    startTime: activeSessions.get(currentSessionId)?.startTime || new Date(),
    lastActivity: new Date(),
  })

  // Add user message to history
  sessionContext.chatHistory.push({
    role: 'user',
    parts: [{ text: message }],
  })

  // Limit history to last 20 messages to avoid token overflow
  if (sessionContext.chatHistory.length > 20) {
    sessionContext.chatHistory = sessionContext.chatHistory.slice(-20)
  }

  // Initialize Gemini
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash', // Fast model for low latency
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 1024, // Keep responses concise
    },
  })

  // Build system prompt
  const systemPrompt = buildSystemPrompt(sessionContext)

  // Create streaming response
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  // Start generation in background
  ;(async () => {
    try {
      // Send session ID first
      await writer.write(encoder.encode(
        createSSEMessage('session', { session_id: currentSessionId })
      ))

      // Start chat with history
      const chat = model.startChat({
        history: [
          { role: 'user', parts: [{ text: `Sistema: ${systemPrompt}` }] },
          { role: 'model', parts: [{ text: 'Entendido! Estou pronto para ajudar com a preparacao da entrevista.' }] },
          ...sessionContext!.chatHistory.slice(0, -1), // All except the new message
        ],
      })

      // Generate streaming response
      const result = await chat.sendMessageStream(message)

      let fullResponse = ''

      for await (const chunk of result.stream) {
        const text = chunk.text()
        if (text) {
          fullResponse += text
          await writer.write(encoder.encode(
            createSSEMessage('chunk', { content: text })
          ))
        }
      }

      // Add assistant response to history
      sessionContext!.chatHistory.push({
        role: 'model',
        parts: [{ text: fullResponse }],
      })

      // Send completion message
      await writer.write(encoder.encode(
        createSSEMessage('done', {
          session_id: currentSessionId,
          full_response: fullResponse,
        })
      ))

      // Log metrics
      await logChatMetrics(userId, currentSessionId, message.length, fullResponse.length)

    } catch (error: unknown) {
      const err = error as Error
      console.error("[gemini-live] Stream error:", err.message)
      await writer.write(encoder.encode(
        createSSEMessage('error', { message: err.message || 'Stream error' })
      ))
    } finally {
      await writer.close()
    }
  })()

  return new Response(stream.readable, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

async function handleEndSession(
  userId: string,
  sessionId: string | undefined,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (!sessionId) {
    return new Response(
      JSON.stringify({ error: "Session ID is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  // Verify session belongs to user
  if (!sessionId.startsWith(userId)) {
    return new Response(
      JSON.stringify({ error: "Invalid session" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  // Get session info before cleanup
  const sessionInfo = activeSessions.get(sessionId)
  const sessionContext = sessionContexts.get(sessionId)

  // Clean up session
  activeSessions.delete(sessionId)
  sessionContexts.delete(sessionId)

  // Log session end
  if (sessionInfo) {
    const durationMs = Date.now() - sessionInfo.startTime.getTime()
    const messageCount = sessionContext?.chatHistory.length || 0

    await supabase.from("llm_metrics").insert({
      user_id: userId,
      action: "gemini_live_session_end",
      model: "gemini-2.5-flash",
      latency_ms: durationMs,
      status: "success",
      input_tokens: messageCount, // Using as message count proxy
      output_tokens: null,
    }).catch(err => console.error("[gemini-live] Error logging session end:", err))

    console.log(`[gemini-live] Session ended: ${sessionId}, duration: ${durationMs}ms, messages: ${messageCount}`)
  }

  return new Response(
    JSON.stringify({
      success: true,
      session_id: sessionId,
      message: "Session ended successfully",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  )
}

// =====================================================
// METRICS
// =====================================================

async function logChatMetrics(
  userId: string,
  sessionId: string,
  inputLength: number,
  outputLength: number
): Promise<void> {
  try {
    await supabase.from("llm_metrics").insert({
      user_id: userId,
      action: "gemini_live_chat",
      model: "gemini-2.5-flash",
      latency_ms: 0, // We don't track latency for streaming
      status: "success",
      input_tokens: Math.ceil(inputLength / 4), // Rough token estimate
      output_tokens: Math.ceil(outputLength / 4),
    })
  } catch (error) {
    console.error("[gemini-live] Error logging metrics:", error)
  }
}
