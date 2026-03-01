/**
 * score-guest-candidate Edge Function
 * Sprint 6: Studio — Guest scoring via neuroscience-informed model
 *
 * Computes a composite guest score based on expertise, reach,
 * relevance, and diversity. Stores result in guest_scores table.
 *
 * Endpoint: POST /functions/v1/score-guest-candidate
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { getCorsHeaders } from '../_shared/cors.ts'
import { createNamespacedLogger } from '../_shared/logger.ts'

const log = createNamespacedLogger('score-guest-candidate')

// ============================================================================
// SCORING LOGIC (mirror of frontend guestScoring.ts)
// ============================================================================

interface GuestProfile {
  name: string
  expertise: number  // 0-1
  reach: number      // 0-1
  relevance: number  // 0-1
  diversity: number  // 0-1
}

interface GuestScoreResult {
  composite: number
  components: {
    expertise: number
    reach: number
    relevance: number
    diversity: number
  }
  tier: 'ideal' | 'strong' | 'good' | 'consider'
  recommendation: string
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function scoreGuest(profile: GuestProfile): GuestScoreResult {
  const composite = (
    0.30 * clamp01(profile.expertise) +
    0.25 * clamp01(profile.reach) +
    0.30 * clamp01(profile.relevance) +
    0.15 * clamp01(profile.diversity)
  )

  const tier: GuestScoreResult['tier'] =
    composite >= 0.85 ? 'ideal' :
    composite >= 0.70 ? 'strong' :
    composite >= 0.50 ? 'good' : 'consider'

  const recommendation =
    tier === 'ideal' ? 'Convidado ideal — alta expertise e relevancia para o tema.' :
    tier === 'strong' ? 'Convidado forte — boa combinacao de fatores.' :
    tier === 'good' ? 'Convidado adequado — considere complementar com outro perfil.' :
    'Avalie se este convidado se alinha com os objetivos do episodio.'

  return {
    composite,
    components: {
      expertise: clamp01(profile.expertise),
      reach: clamp01(profile.reach),
      relevance: clamp01(profile.relevance),
      diversity: clamp01(profile.diversity),
    },
    tier,
    recommendation,
  }
}

// ============================================================================
// SERVE
// ============================================================================

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Validate auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Auth client for JWT verification
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await authClient.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = user.id
    log.info('Scoring guest candidate for user:', userId)

    // Parse body
    const body = await req.json()
    const { name, expertise, reach, relevance, diversity, episode_id } = body

    if (!name || typeof name !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required field: name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate numeric fields
    const profile: GuestProfile = {
      name: name.trim(),
      expertise: typeof expertise === 'number' ? expertise : 0,
      reach: typeof reach === 'number' ? reach : 0,
      relevance: typeof relevance === 'number' ? relevance : 0,
      diversity: typeof diversity === 'number' ? diversity : 0,
    }

    // Compute score
    const result = scoreGuest(profile)

    // Store in database
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { error: insertError } = await supabaseAdmin
      .from('guest_scores')
      .insert({
        user_id: userId,
        episode_id: episode_id || null,
        guest_name: profile.name,
        expertise_score: result.components.expertise,
        reach_score: result.components.reach,
        relevance_score: result.components.relevance,
        diversity_score: result.components.diversity,
        composite_score: result.composite,
        factor_details: result,
      })

    if (insertError) {
      log.warn('Failed to store guest score:', insertError.message)
    }

    // Log attribution
    supabaseAdmin
      .from('score_attribution_log')
      .insert({
        user_id: userId,
        model_id: 'guest_scoring',
        previous_score: null,
        new_score: result.composite,
        delta: null,
        trigger_action: 'score_guest_candidate',
        metadata: {
          guest_name: profile.name,
          tier: result.tier,
          episode_id: episode_id || null,
        },
      })
      .then(() => log.info('Attribution log recorded'))
      .catch((err: Error) => log.warn('Attribution log failed:', err.message))

    log.info('Guest scoring complete:', {
      guest: profile.name,
      composite: result.composite.toFixed(2),
      tier: result.tier,
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          composite: result.composite,
          components: result.components,
          tier: result.tier,
          recommendation: result.recommendation,
          computedAt: new Date().toISOString(),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const err = error as Error
    log.error('score-guest-candidate failed:', err.message)
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
