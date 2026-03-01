/**
 * compute-researcher-profile Edge Function
 * Sprint 6: Grants — Researcher Strength Score computation
 *
 * Computes Researcher Strength Score (RSS) for the authenticated user:
 * 1. Validates JWT
 * 2. Fetches or receives researcher bibliometric data
 * 3. Computes RSS composite score
 * 4. Stores result in researcher_profiles
 * 5. Logs attribution
 *
 * Endpoint: POST /functions/v1/compute-researcher-profile
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { getCorsHeaders } from '../_shared/cors.ts'
import { createNamespacedLogger } from '../_shared/logger.ts'

const log = createNamespacedLogger('compute-researcher-profile')

// ============================================================================
// NORMALIZATION (mirrors frontend researcherScoring.ts)
// ============================================================================

function normalizeHIndex(h: number): number {
  return Math.min(100, (h / 50) * 100)
}

function normalizeCitations(citations: number): number {
  return Math.min(100, (citations / 5000) * 100)
}

function normalizeMQuotient(m: number): number {
  return Math.min(100, (m / 2) * 100)
}

function normalizeImpactFactor(avgIF: number): number {
  return Math.min(100, (avgIF / 10) * 100)
}

function normalizeCentrality(centrality: number): number {
  return Math.min(100, centrality * 100)
}

function computeRSS(profile: {
  hIndex: number
  totalCitations: number
  mQuotient: number
  avgJournalIF: number
  collaborationCentrality: number
}): { rss: number; tier: string } {
  const hScore = normalizeHIndex(profile.hIndex)
  const citScore = normalizeCitations(profile.totalCitations)
  const mScore = normalizeMQuotient(profile.mQuotient)
  const ifScore = normalizeImpactFactor(profile.avgJournalIF)
  const centScore = normalizeCentrality(profile.collaborationCentrality)

  const rss = 0.30 * hScore + 0.20 * citScore + 0.15 * mScore + 0.20 * ifScore + 0.15 * centScore

  const tier = rss >= 80 ? 'leading' :
    rss >= 60 ? 'senior' :
    rss >= 40 ? 'established' : 'emerging'

  return { rss, tier }
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
    log.info('Computing researcher profile for user:', userId)

    // Service client for privileged operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Parse request body (optional — can also compute from existing data)
    let profileInput: {
      hIndex: number
      totalCitations: number
      mQuotient: number
      avgJournalIF: number
      collaborationCentrality: number
      lattesId?: string
      orcid?: string
    } | null = null

    try {
      const body = await req.json()
      if (body.hIndex !== undefined) {
        profileInput = {
          hIndex: body.hIndex ?? 0,
          totalCitations: body.totalCitations ?? 0,
          mQuotient: body.mQuotient ?? 0,
          avgJournalIF: body.avgJournalIF ?? 0,
          collaborationCentrality: body.collaborationCentrality ?? 0,
          lattesId: body.lattesId,
          orcid: body.orcid,
        }
      }
    } catch {
      // No body or invalid JSON — try to use existing profile
    }

    // If no input provided, fetch existing profile
    if (!profileInput) {
      const { data: existing } = await supabase
        .from('researcher_profiles')
        .select('h_index, total_citations, m_quotient, avg_journal_if, collaboration_centrality, lattes_id, orcid')
        .eq('user_id', userId)
        .single()

      if (!existing) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'No profile data provided and no existing profile found.',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      profileInput = {
        hIndex: existing.h_index ?? 0,
        totalCitations: existing.total_citations ?? 0,
        mQuotient: existing.m_quotient ?? 0,
        avgJournalIF: existing.avg_journal_if ?? 0,
        collaborationCentrality: existing.collaboration_centrality ?? 0,
        lattesId: existing.lattes_id,
        orcid: existing.orcid,
      }
    }

    // Compute RSS
    const { rss, tier } = computeRSS(profileInput)
    log.info('RSS computed:', { rss: rss.toFixed(1), tier })

    // Store result
    const { error: upsertError } = await supabase
      .from('researcher_profiles')
      .upsert({
        user_id: userId,
        h_index: profileInput.hIndex,
        total_citations: profileInput.totalCitations,
        m_quotient: profileInput.mQuotient,
        avg_journal_if: profileInput.avgJournalIF,
        collaboration_centrality: profileInput.collaborationCentrality,
        researcher_strength_score: rss,
        lattes_id: profileInput.lattesId || null,
        orcid: profileInput.orcid || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (upsertError) {
      log.error('Failed to store researcher profile:', upsertError.message)
      throw upsertError
    }

    // Log attribution (non-blocking)
    supabase
      .from('score_attribution_log')
      .insert({
        user_id: userId,
        model_id: 'researcher_strength',
        previous_score: null,
        new_score: rss,
        delta: null,
        trigger_action: 'compute_researcher_profile',
        metadata: {
          tier,
          h_index: profileInput.hIndex,
          total_citations: profileInput.totalCitations,
          m_quotient: profileInput.mQuotient,
          avg_journal_if: profileInput.avgJournalIF,
          collaboration_centrality: profileInput.collaborationCentrality,
        },
      })
      .then(() => log.info('Attribution log recorded'))
      .catch((err: Error) => log.warn('Attribution log failed:', err.message))

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          rss,
          tier,
          components: {
            hIndexScore: normalizeHIndex(profileInput.hIndex),
            citationScore: normalizeCitations(profileInput.totalCitations),
            mQuotientScore: normalizeMQuotient(profileInput.mQuotient),
            impactFactorScore: normalizeImpactFactor(profileInput.avgJournalIF),
            centralityScore: normalizeCentrality(profileInput.collaborationCentrality),
          },
          computedAt: new Date().toISOString(),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const err = error as Error
    log.error('compute-researcher-profile failed:', err.message)
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
