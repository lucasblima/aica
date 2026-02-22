/**
 * Supabase Edge Function: gemini-live-token
 *
 * Issues ephemeral tokens for direct client WebSocket connections
 * to the Gemini Multimodal Live API.
 *
 * Flow: Client calls this endpoint -> gets short-lived token ->
 *       client connects directly to wss://generativelanguage.googleapis.com/ws/...
 *
 * Note: The REST API for auth_tokens does NOT support liveConnectConstraints.
 * The token is unconstrained — model/config are specified client-side at connect time.
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
      console.error("[gemini-live-token] Auth failed:", authError?.message)
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    console.log(`[gemini-live-token] Creating token for user: ${user.id}`)

    // 2. Create ephemeral token via REST API
    // The v1alpha/auth_tokens endpoint only accepts: uses, expireTime, newSessionExpireTime
    // Model and config constraints are NOT supported — they are specified client-side at connect time
    const expireTime = new Date(Date.now() + TOKEN_MESSAGE_EXPIRY_MS).toISOString()
    const newSessionExpireTime = new Date(Date.now() + TOKEN_SESSION_EXPIRY_MS).toISOString()

    const tokenResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1alpha/auth_tokens?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uses: 1,
          expireTime,
          newSessionExpireTime,
        }),
      }
    )

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error(`[gemini-live-token] Google API error (${tokenResponse.status}):`, errorText)
      throw new Error(`Google API returned ${tokenResponse.status}: ${errorText}`)
    }

    const token = await tokenResponse.json()

    console.log(`[gemini-live-token] Token created for user: ${user.id}, expires: ${expireTime}`)

    // 3. Log token creation for usage tracking
    await supabase.from("llm_metrics").insert({
      user_id: user.id,
      action: "gemini_live_token_create",
      model: LIVE_AUDIO_MODEL,
      latency_ms: 0,
      status: "success",
      input_tokens: 0,
      output_tokens: 0,
    }).catch(err => console.error("[gemini-live-token] Metrics log error:", err))

    // 4. Return token to client
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
    console.error("[gemini-live-token] Error:", err.message)
    console.error("[gemini-live-token] Stack:", err.stack)
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
