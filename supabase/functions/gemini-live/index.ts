// Supabase Edge Function: gemini-live
// WebSocket proxy para Gemini Live API (tempo real)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// =====================================================
// CONFIGURAÇÃO
// =====================================================

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const MAX_CONCURRENT_SESSIONS = 10
const activeSessions = new Map<string, Date>()

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// =====================================================
// HANDLER PRINCIPAL
// =====================================================

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 1. Autenticação
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response("Missing authorization header", { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response("Unauthorized", { status: 401 })
    }

    // 2. Verificar limite de sessões simultâneas
    const userSessionCount = Array.from(activeSessions.entries())
      .filter(([sessionId, _]) => sessionId.startsWith(user.id))
      .length

    if (userSessionCount >= MAX_CONCURRENT_SESSIONS) {
      return new Response(
        JSON.stringify({
          error: "Maximum concurrent sessions exceeded",
          max: MAX_CONCURRENT_SESSIONS,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // 3. Upgrade para WebSocket
    if (req.headers.get("upgrade") !== "websocket") {
      return new Response("Expected websocket upgrade", { status: 426 })
    }

    const { socket: clientSocket, response } = Deno.upgradeWebSocket(req)
    const sessionId = `${user.id}-${Date.now()}`
    const sessionStart = new Date()

    // 4. Conectar ao Gemini Live API
    const geminiWs = new WebSocket(
      `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${GEMINI_API_KEY}`
    )

    // Registrar sessão
    activeSessions.set(sessionId, sessionStart)

    // =====================================================
    // PROXY BIDIRECIONAL
    // =====================================================

    // Cliente -> Gemini
    clientSocket.onmessage = (event) => {
      if (geminiWs.readyState === WebSocket.OPEN) {
        geminiWs.send(event.data)
      }
    }

    // Gemini -> Cliente
    geminiWs.onmessage = (event) => {
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(event.data)
      }
    }

    // Tratamento de erros
    geminiWs.onerror = (error) => {
      console.error("Gemini WebSocket error:", error)
      clientSocket.close(1011, "Gemini connection error")
    }

    clientSocket.onerror = (error) => {
      console.error("Client WebSocket error:", error)
      geminiWs.close()
    }

    // Cleanup ao fechar
    const cleanup = async () => {
      const sessionEnd = new Date()
      const durationMs = sessionEnd.getTime() - sessionStart.getTime()

      // Log da sessão
      await logSession(user.id, sessionId, durationMs)

      // Remover da lista de sessões ativas
      activeSessions.delete(sessionId)

      // Fechar conexões
      if (geminiWs.readyState === WebSocket.OPEN) {
        geminiWs.close()
      }
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.close()
      }
    }

    geminiWs.onclose = cleanup
    clientSocket.onclose = cleanup

    return response
  } catch (error: any) {
    console.error("Error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})

// =====================================================
// LOGGING
// =====================================================

async function logSession(
  userId: string,
  sessionId: string,
  durationMs: number
) {
  try {
    await supabase.from("llm_metrics").insert({
      user_id: userId,
      action: "gemini_live_session",
      model: "gemini-2.5-flash-exp",
      latency_ms: durationMs,
      status: "success",
      input_tokens: null,
      output_tokens: null,
    })
  } catch (error) {
    console.error("Error logging session:", error)
  }
}
