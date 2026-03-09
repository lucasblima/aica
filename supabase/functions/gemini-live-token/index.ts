/**
 * Supabase Edge Function: gemini-live-token
 *
 * Issues ephemeral tokens for direct client WebSocket connections
 * to the Gemini Multimodal Live API.
 *
 * Uses direct REST API instead of @google/genai SDK because the SDK's
 * authTokens.create() with liveConnectConstraints fails in Deno runtime.
 *
 * Flow: Client calls this endpoint -> gets short-lived token ->
 *       client connects directly to wss://generativelanguage.googleapis.com/ws/...
 *
 * @module gemini-live-token
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { getCorsHeaders } from "../_shared/cors.ts"
import { withHealthTracking } from "../_shared/health-tracker.ts"
import { createNamespacedLogger } from "../_shared/logger.ts"

const logger = createNamespacedLogger('gemini-live-token')

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
    // [1/5] Authenticate user via JWT
    logger.info("[1/5] Authenticating user...")
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const jwt = authHeader.replace("Bearer ", "")
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)

    if (authError || !user) {
      logger.error("Auth failed:", authError?.message)
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }
    logger.info(`[1/5] Auth OK — user: ${user.id}`)

    // [2/5] Parse optional config from body
    logger.info("[2/5] Parsing request body...")
    let systemInstruction: string | undefined
    let temperature = 0.7
    let voiceName: string | undefined

    try {
      const body = await req.json()
      systemInstruction = body.systemInstruction
      if (typeof body.temperature === "number") {
        temperature = Math.min(Math.max(body.temperature, 0), 2)
      }
      voiceName = body.voiceName
      logger.info(`[2/5] Body parsed — voice: ${voiceName || "default"}, temp: ${temperature}`)
    } catch {
      logger.info("[2/5] Empty body — using defaults")
    }

    // [3/5] Create ephemeral token via REST API
    // NOTE: Direct REST API is used instead of @google/genai SDK because
    // the SDK's authTokens.create() with liveConnectConstraints fails in Deno.
    // The REST API only supports uses, expireTime, newSessionExpireTime.
    // Client specifies model and config at WebSocket connect time.
    logger.info("[3/5] Calling Google auth_tokens API...")

    const expireTime = new Date(Date.now() + TOKEN_MESSAGE_EXPIRY_MS).toISOString()
    const newSessionExpireTime = new Date(Date.now() + TOKEN_SESSION_EXPIRY_MS).toISOString()

    const tokenData = await withHealthTracking(
      { functionName: 'gemini-live-token', actionName: 'create_ephemeral_token' },
      supabase,
      async () => {
        const tokenUrl = `https://generativelanguage.googleapis.com/v1alpha/auth_tokens?key=${GEMINI_API_KEY}`
        const tokenResponse = await fetch(tokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uses: 1,
            expireTime,
            newSessionExpireTime,
          }),
        })

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text()
          throw new Error(`Google API error: HTTP ${tokenResponse.status} — ${errorText}`)
        }

        return await tokenResponse.json()
      }
    )

    const tokenName = tokenData.name
    logger.info(`[3/5] Token created: ${tokenName?.substring(0, 20)}...`)

    // [4/5] Log token creation for usage tracking
    logger.info("[4/5] Logging metrics...")
    await supabase.from("llm_metrics").insert({
      user_id: user.id,
      action: "gemini_live_token_create",
      model: LIVE_AUDIO_MODEL,
      latency_ms: 0,
      status: "success",
      input_tokens: 0,
      output_tokens: 0,
    }).catch(err => logger.error("Metrics log error:", err))

    // [5/5] Return token to client
    logger.info(`[5/5] Success — returning token for user: ${user.id}`)
    return new Response(
      JSON.stringify({
        success: true,
        token: tokenName,
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
    logger.error("Error:", err.message, err.stack)
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
