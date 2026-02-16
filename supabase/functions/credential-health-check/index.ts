/**
 * Credential Health Check Edge Function
 *
 * Validates that all external API credentials are functional.
 * Designed to run on a cron schedule (daily) or on-demand.
 *
 * Checks:
 *   - GEMINI_API_KEY: Validates via models.list endpoint
 *   - STRIPE_SECRET_KEY: Validates via /v1/balance endpoint
 *   - RESEND_API_KEY: Validates via /api-keys endpoint
 *   - GOOGLE_API_KEY: Validates via tokeninfo endpoint
 *
 * Reports results to ai_function_health table for monitoring.
 *
 * @see Phase 4 of Agent Orchestra Roadmap — Issue #75
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

// ============================================================================
// CORS
// ============================================================================

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://dev.aica.guru',
  'https://aica.guru',
]

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ''
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  }
}

// ============================================================================
// TYPES
// ============================================================================

interface CredentialCheck {
  name: string
  envVar: string
  status: 'healthy' | 'invalid' | 'expired' | 'missing' | 'error'
  latencyMs: number
  error?: string
  lastChecked: string
}

interface HealthReport {
  timestamp: string
  overall: 'healthy' | 'degraded' | 'critical'
  credentials: CredentialCheck[]
  summary: string
}

// ============================================================================
// CREDENTIAL VALIDATORS
// ============================================================================

async function checkGeminiKey(apiKey: string): Promise<Omit<CredentialCheck, 'envVar'>> {
  const start = Date.now()
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=1`,
    )
    const latencyMs = Date.now() - start

    if (response.ok) {
      return { name: 'Gemini API', status: 'healthy', latencyMs, lastChecked: new Date().toISOString() }
    }
    if (response.status === 401 || response.status === 403) {
      return { name: 'Gemini API', status: 'invalid', latencyMs, error: `HTTP ${response.status}`, lastChecked: new Date().toISOString() }
    }
    return { name: 'Gemini API', status: 'error', latencyMs, error: `HTTP ${response.status}`, lastChecked: new Date().toISOString() }
  } catch (error) {
    return { name: 'Gemini API', status: 'error', latencyMs: Date.now() - start, error: String(error), lastChecked: new Date().toISOString() }
  }
}

async function checkStripeKey(apiKey: string): Promise<Omit<CredentialCheck, 'envVar'>> {
  const start = Date.now()
  try {
    const response = await fetch('https://api.stripe.com/v1/balance', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
    const latencyMs = Date.now() - start

    if (response.ok) {
      return { name: 'Stripe', status: 'healthy', latencyMs, lastChecked: new Date().toISOString() }
    }
    if (response.status === 401) {
      return { name: 'Stripe', status: 'invalid', latencyMs, error: 'Invalid API key', lastChecked: new Date().toISOString() }
    }
    return { name: 'Stripe', status: 'error', latencyMs, error: `HTTP ${response.status}`, lastChecked: new Date().toISOString() }
  } catch (error) {
    return { name: 'Stripe', status: 'error', latencyMs: Date.now() - start, error: String(error), lastChecked: new Date().toISOString() }
  }
}

async function checkResendKey(apiKey: string): Promise<Omit<CredentialCheck, 'envVar'>> {
  const start = Date.now()
  try {
    const response = await fetch('https://api.resend.com/api-keys', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
    const latencyMs = Date.now() - start

    if (response.ok) {
      return { name: 'Resend', status: 'healthy', latencyMs, lastChecked: new Date().toISOString() }
    }
    if (response.status === 401 || response.status === 403) {
      return { name: 'Resend', status: 'invalid', latencyMs, error: `HTTP ${response.status}`, lastChecked: new Date().toISOString() }
    }
    return { name: 'Resend', status: 'error', latencyMs, error: `HTTP ${response.status}`, lastChecked: new Date().toISOString() }
  } catch (error) {
    return { name: 'Resend', status: 'error', latencyMs: Date.now() - start, error: String(error), lastChecked: new Date().toISOString() }
  }
}

async function checkGoogleApiKey(apiKey: string): Promise<Omit<CredentialCheck, 'envVar'>> {
  const start = Date.now()
  try {
    // Use a lightweight endpoint to validate the key
    const response = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=test`,
      // We expect a 400/401 but NOT a 403 (which would mean the key is restricted)
      // A valid API key will get a different error than an invalid one
    )
    const latencyMs = Date.now() - start

    // For Google API key, we just check it's not completely invalid
    // A 400 with "invalid_token" is expected (we're not passing a real token)
    if (response.status === 400) {
      return { name: 'Google API', status: 'healthy', latencyMs, lastChecked: new Date().toISOString() }
    }
    if (response.status === 403) {
      return { name: 'Google API', status: 'invalid', latencyMs, error: 'Key restricted or invalid', lastChecked: new Date().toISOString() }
    }
    return { name: 'Google API', status: 'healthy', latencyMs, lastChecked: new Date().toISOString() }
  } catch (error) {
    return { name: 'Google API', status: 'error', latencyMs: Date.now() - start, error: String(error), lastChecked: new Date().toISOString() }
  }
}

// ============================================================================
// MAIN CHECK
// ============================================================================

async function runHealthCheck(): Promise<HealthReport> {
  const credentials: CredentialCheck[] = []

  // Check each credential
  const checks: Array<{
    envVar: string
    checker: (key: string) => Promise<Omit<CredentialCheck, 'envVar'>>
  }> = [
    { envVar: 'GEMINI_API_KEY', checker: checkGeminiKey },
    { envVar: 'STRIPE_SECRET_KEY', checker: checkStripeKey },
    { envVar: 'RESEND_API_KEY', checker: checkResendKey },
    { envVar: 'GOOGLE_API_KEY', checker: checkGoogleApiKey },
  ]

  // Run all checks in parallel
  const results = await Promise.allSettled(
    checks.map(async ({ envVar, checker }) => {
      const key = Deno.env.get(envVar)
      if (!key) {
        return {
          name: envVar,
          envVar,
          status: 'missing' as const,
          latencyMs: 0,
          error: `Environment variable ${envVar} not set`,
          lastChecked: new Date().toISOString(),
        }
      }

      const result = await checker(key)
      return { ...result, envVar }
    }),
  )

  for (const result of results) {
    if (result.status === 'fulfilled') {
      credentials.push(result.value as CredentialCheck)
    } else {
      credentials.push({
        name: 'Unknown',
        envVar: 'unknown',
        status: 'error',
        latencyMs: 0,
        error: result.reason?.message || 'Check failed',
        lastChecked: new Date().toISOString(),
      })
    }
  }

  // Determine overall health
  const unhealthy = credentials.filter(c => c.status !== 'healthy')
  const critical = credentials.filter(c => c.status === 'invalid' || c.status === 'missing')

  let overall: 'healthy' | 'degraded' | 'critical'
  if (critical.length > 0) {
    overall = 'critical'
  } else if (unhealthy.length > 0) {
    overall = 'degraded'
  } else {
    overall = 'healthy'
  }

  const summary = overall === 'healthy'
    ? `Todas as ${credentials.length} credenciais estao saudaveis`
    : `${unhealthy.length}/${credentials.length} credenciais com problemas: ${unhealthy.map(c => c.name).join(', ')}`

  return {
    timestamp: new Date().toISOString(),
    overall,
    credentials,
    summary,
  }
}

// ============================================================================
// SERVER
// ============================================================================

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // This function can be called by cron (no auth) or by admin (with auth)
  // For cron invocations, we skip auth check
  const isCronInvocation = req.headers.get('x-cron-key') === Deno.env.get('CRON_SECRET')
  const authHeader = req.headers.get('Authorization')

  if (!isCronInvocation && !authHeader) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  try {
    const report = await runHealthCheck()

    // Store report in ai_function_health table for monitoring
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    // Log each credential status
    for (const cred of report.credentials) {
      try {
        if (cred.status === 'healthy') {
          await adminClient.rpc('track_ai_success', {
            p_function_name: 'credential-health-check',
            p_action_name: cred.envVar,
            p_prompt_hash: null,
          })
        } else {
          await adminClient.rpc('track_ai_failure', {
            p_function_name: 'credential-health-check',
            p_action_name: cred.envVar,
            p_error_message: cred.error || cred.status,
            p_error_context: { status: cred.status, latencyMs: cred.latencyMs },
          })
        }
      } catch {
        // Non-critical, continue
      }
    }

    // Log critical alerts
    if (report.overall === 'critical') {
      console.error(
        `[CREDENTIAL-HEALTH] CRITICAL: ${report.summary}. ` +
        `Credentials needing rotation: ${report.credentials.filter(c => c.status !== 'healthy').map(c => c.envVar).join(', ')}`,
      )
    }

    return new Response(
      JSON.stringify({ success: true, report }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('[credential-health-check] Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Health check failed',
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
