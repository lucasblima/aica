/**
 * Supabase Edge Function: gemini-live-token
 *
 * Issues ephemeral tokens for direct client WebSocket connections
 * to the Gemini Multimodal Live API.
 *
 * Uses direct REST API call to v1alpha/auth_tokens endpoint.
 * The token is created unconstrained — the client specifies
 * model and config when connecting via WebSocket.
 *
 * IMPORTANT: Do NOT use the @google/genai SDK here — it has Deno
 * compatibility issues and the authTokens.create() method fails.
 * The REST API v1alpha/auth_tokens does NOT support liveConnectConstraints.
 *
 * @module gemini-live-token
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { getCorsHeaders } from "../_shared/cors.ts"

// Configuration
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Live API model for native audio
const LIVE_AUDIO_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"

// Token expiration: 30 minutes for messages, 2 minutes for new sessions
const TOKEN_MESSAGE_EXPIRY_MS = 30 * 60 * 1000
const TOKEN_SESSION_EXPIRY_MS = 2 * 60 * 1000

serve(async (req) => {
  console.log(`[gemini-live-token] === ${req.method} request ===`)

  const corsHeaders = getCorsHeaders(req)

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  try {
    // 1. Authenticate user via JWT
    console.log("[gemini-live-token] [1/5] Authenticating...")
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      console.log("[gemini-live-token] FAIL: No auth header")
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const jwt = authHeader.replace("Bearer ", "")
    console.log("[gemini-live-token] JWT present, length:", jwt.length)

    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)

    if (authError || !user) {
      console.error("[gemini-live-token] FAIL: Auth error:", authError?.message)
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }
    console.log(`[gemini-live-token] [1/5] OK user=${user.id}`)

    // 2. Parse optional config from body (for logging only — token is unconstrained)
    console.log("[gemini-live-token] [2/5] Parsing body...")
    try {
      const body = await req.json()
      console.log("[gemini-live-token] [2/5] Body keys:", Object.keys(body).join(","))
    } catch {
      console.log("[gemini-live-token] [2/5] No body (OK)")
    }

    // 3. Create ephemeral token via REST API
    console.log("[gemini-live-token] [3/5] Creating token via REST API...")
    console.log("[gemini-live-token] API_KEY present:", !!GEMINI_API_KEY, "len:", GEMINI_API_KEY?.length || 0)

    const expireTime = new Date(Date.now() + TOKEN_MESSAGE_EXPIRY_MS).toISOString()
    const newSessionExpireTime = new Date(Date.now() + TOKEN_SESSION_EXPIRY_MS).toISOString()

    const requestBody = {
      uses: 1,
      expireTime,
      newSessionExpireTime,
    }
    console.log("[gemini-live-token] Request:", JSON.stringify(requestBody))

    const tokenUrl = `https://generativelanguage.googleapis.com/v1alpha/auth_tokens?key=${GEMINI_API_KEY}`

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    })

    console.log(`[gemini-live-token] [3/5] Google API status: ${tokenResponse.status}`)

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error(`[gemini-live-token] FAIL: Google API ${tokenResponse.status}:`, errorText)
      return new Response(
        JSON.stringify({
          success: false,
          error: "Google API error",
          details: `${tokenResponse.status}: ${errorText}`,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const token = await tokenResponse.json()
    console.log(`[gemini-live-token] [3/5] OK token=${token.name?.substring(0, 20)}...`)

    // 4. Log metrics (non-blocking)
    console.log("[gemini-live-token] [4/5] Logging metrics...")
    supabase.from("llm_metrics").insert({
      user_id: user.id,
      action: "gemini_live_token_create",
      model: LIVE_AUDIO_MODEL,
      latency_ms: 0,
      status: "success",
      input_tokens: 0,
      output_tokens: 0,
    }).then(() => console.log("[gemini-live-token] [4/5] Metrics OK"))
      .catch((err: Error) => console.error("[gemini-live-token] [4/5] Metrics error:", err))

    // 5. Return success
    console.log("[gemini-live-token] [5/5] Returning success")
    return new Response(
      JSON.stringify({
        success: true,
        token: token.name,
        model: LIVE_AUDIO_MODEL,
        expiresAt: expireTime,
        newSessionExpiresAt: newSessionExpireTime,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )

  } catch (error: unknown) {
    const err = error as Error
    console.error("[gemini-live-token] UNCAUGHT:", err.message)
    console.error("[gemini-live-token] STACK:", err.stack)
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to create ephemeral token",
        details: err.message,
      }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    )
  }
})
