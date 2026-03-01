/**
 * compute-network-scores Edge Function
 * Sprint 4: Connections — Batch relationship scoring
 *
 * Computes network science scores for all contacts of a user:
 * 1. Fetches all active contacts from contact_network
 * 2. Fetches interaction quality data from connection_interactions
 * 3. Computes Dunbar layers, tie strength, decay, Gottman ratio
 * 4. Updates contact_network with scores
 * 5. Computes and stores network-level metrics
 *
 * Endpoint: POST /functions/v1/compute-network-scores
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { getCorsHeaders } from '../_shared/cors.ts'
import { createNamespacedLogger } from '../_shared/logger.ts'

const log = createNamespacedLogger('compute-network-scores')

// ============================================================================
// DECAY RATE CONSTANTS (Roberts & Dunbar 2011)
// ============================================================================

const DECAY_RATES: Record<string, number> = {
  family: 0.002,
  friends: 0.007,
  professional: 0.005,
  acquaintances: 0.010,
  contact: 0.008,
  unknown: 0.010,
}

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

function classifyDunbarLayer(
  frequencyPerMonth: number,
  closeness: number
): 5 | 15 | 50 | 150 | 500 {
  const composite = 0.5 * Math.min(frequencyPerMonth / 30, 1) + 0.5 * closeness
  if (composite >= 0.80) return 5
  if (composite >= 0.60) return 15
  if (composite >= 0.35) return 50
  if (composite >= 0.15) return 150
  return 500
}

function computeTieStrength(
  frequency: number,
  emotional: number,
  intimacy: number,
  reciprocity: number
): number {
  return (
    0.25 * clamp01(frequency) +
    0.30 * clamp01(emotional) +
    0.25 * clamp01(intimacy) +
    0.20 * clamp01(reciprocity)
  )
}

function computeDecayedCloseness(
  prev: number,
  days: number,
  relType: string
): number {
  const lambda = DECAY_RATES[relType] ?? DECAY_RATES.unknown
  return clamp01(prev * Math.exp(-lambda * days))
}

function computeGottmanRatio(
  positive: number,
  negative: number
): { ratio: number | null; healthy: boolean } {
  if (negative === 0) return { ratio: null, healthy: true }
  const ratio = positive / negative
  return { ratio: Math.round(ratio * 100) / 100, healthy: ratio >= 5.0 }
}

function computeCompositeScore(input: {
  dunbarLayer: number
  tieStrength: number
  gottmanHealthy: boolean
  reciprocity: number
  freshness: number
  strategicValue: number
}): number {
  const layerScore: Record<number, number> = { 5: 1.0, 15: 0.8, 50: 0.6, 150: 0.4, 500: 0.2 }
  return (
    0.20 * (layerScore[input.dunbarLayer] ?? 0.2) +
    0.20 * clamp01(input.tieStrength) +
    0.15 * (input.gottmanHealthy ? 1.0 : 0.3) +
    0.10 * clamp01(input.reciprocity) +
    0.15 * clamp01(input.freshness) +
    0.20 * clamp01(input.strategicValue)
  )
}

function computeDiversityIndex(dist: Record<string, number>): number {
  const values = Object.values(dist)
  const total = values.reduce((s, v) => s + v, 0)
  if (total === 0) return 0
  const hhi = values.reduce((sum, count) => {
    const p = count / total
    return sum + p * p
  }, 0)
  return 1 - hhi
}

function computeEffectiveSize(n: number, t: number): number {
  if (n === 0) return 0
  return Math.max(0, n - (2 * t) / n)
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
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
    log.info('Computing network scores for user:', userId)

    // Service client for privileged operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 1. Fetch all active contacts
    const { data: contacts, error: contactsError } = await supabase
      .from('contact_network')
      .select('id, name, relationship_type, interaction_count, last_interaction_at, health_score, sentiment_trend')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (contactsError) throw contactsError
    if (!contacts || contacts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          data: null,
          message: 'No active contacts to score.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Fetch all interactions for quality analysis
    const { data: interactions } = await supabase
      .from('connection_interactions')
      .select('contact_id, quality')
      .eq('user_id', userId)

    const interactionMap: Record<string, { positive: number; negative: number }> = {}
    for (const i of interactions ?? []) {
      if (!interactionMap[i.contact_id]) {
        interactionMap[i.contact_id] = { positive: 0, negative: 0 }
      }
      if (i.quality === 'positive') interactionMap[i.contact_id].positive++
      if (i.quality === 'negative') interactionMap[i.contact_id].negative++
    }

    // 3. Score each contact
    const now = Date.now()
    const scored: { id: string; layer: number; tie: number; score: number; gottman: number | null }[] = []
    const layerDist: Record<number, number> = { 5: 0, 15: 0, 50: 0, 150: 0, 500: 0 }
    const typeDist: Record<string, number> = {}

    for (const c of contacts) {
      const daysSinceLast = c.last_interaction_at
        ? Math.max(0, (now - new Date(c.last_interaction_at).getTime()) / 86400000)
        : 365
      const freqPerMonth = daysSinceLast > 0
        ? Math.min((c.interaction_count ?? 0) / Math.max(daysSinceLast / 30, 1), 30)
        : 0
      const freqNorm = Math.min(freqPerMonth / 30, 1)
      const closeness = (c.health_score ?? 50) / 100
      const intimacy = closeness * 0.8
      const reciprocity = 0.5

      const dunbarLayer = classifyDunbarLayer(freqPerMonth, closeness)
      const tieStrength = computeTieStrength(freqNorm, closeness, intimacy, reciprocity)
      const decayRate = DECAY_RATES[c.relationship_type ?? 'contact'] ?? DECAY_RATES.unknown

      const iq = interactionMap[c.id]
      const posCount = iq?.positive ?? Math.round((c.interaction_count ?? 0) * 0.7)
      const negCount = iq?.negative ?? Math.round((c.interaction_count ?? 0) * 0.1)
      const { ratio: gottmanRatio, healthy: gottmanHealthy } = computeGottmanRatio(posCount, negCount)

      const freshness = Math.max(0, 1 - daysSinceLast / 365)
      const strategicValue = Math.min(1, freqNorm * 0.6 + tieStrength * 0.4)

      const compositeScore = computeCompositeScore({
        dunbarLayer,
        tieStrength,
        gottmanHealthy,
        reciprocity,
        freshness,
        strategicValue,
      })

      scored.push({ id: c.id, layer: dunbarLayer, tie: tieStrength, score: compositeScore, gottman: gottmanRatio })
      layerDist[dunbarLayer] = (layerDist[dunbarLayer] ?? 0) + 1

      const rt = c.relationship_type ?? 'contact'
      typeDist[rt] = (typeDist[rt] ?? 0) + 1

      // Update contact
      const { error: updateError } = await supabase
        .from('contact_network')
        .update({
          dunbar_layer: dunbarLayer,
          tie_strength: tieStrength,
          relationship_score: compositeScore,
          decay_rate: decayRate,
          gottman_ratio: gottmanRatio,
        })
        .eq('id', c.id)
        .eq('user_id', userId)

      if (updateError) {
        log.warn(`Failed to update contact ${c.id}:`, updateError.message)
      }
    }

    // 4. Compute network-level metrics
    const totalContacts = contacts.length
    const estimatedTies = Math.round(totalContacts * 0.1)
    const effectiveSize = computeEffectiveSize(totalContacts, estimatedTies)
    const diversityIndex = computeDiversityIndex(typeDist)

    // Simplified aggregate constraint
    const totalInteractions = contacts.reduce((s, c) => s + (c.interaction_count ?? 0), 0)
    let networkConstraint = 0
    if (totalInteractions > 0) {
      for (const c of contacts) {
        const pij = (c.interaction_count ?? 0) / totalInteractions
        networkConstraint += (pij + pij * 0.1) ** 2
      }
    }

    // 5. Store network metrics
    const { error: metricsError } = await supabase
      .from('network_metrics')
      .insert({
        user_id: userId,
        effective_network_size: effectiveSize,
        network_constraint: networkConstraint,
        diversity_index: diversityIndex,
        layer_distribution: layerDist,
      })

    if (metricsError) {
      log.warn('Failed to store network metrics:', metricsError.message)
    }

    // 6. Log attribution
    supabase
      .from('score_attribution_log')
      .insert({
        user_id: userId,
        model_id: 'network_scoring',
        previous_score: null,
        new_score: scored.reduce((s, c) => s + c.score, 0) / scored.length,
        delta: null,
        trigger_action: 'compute_network_scores',
        metadata: {
          contacts_scored: scored.length,
          effective_size: effectiveSize,
          diversity: diversityIndex,
          layer_distribution: layerDist,
        },
      })
      .then(() => log.info('Attribution log recorded'))
      .catch((err: Error) => log.warn('Attribution log failed:', err.message))

    log.info('Network scoring complete:', {
      scored: scored.length,
      effectiveSize: effectiveSize.toFixed(1),
      diversity: diversityIndex.toFixed(2),
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          contactsScored: scored.length,
          metrics: {
            effectiveSize,
            networkConstraint,
            diversityIndex,
            layerDistribution: layerDist,
            totalContacts,
          },
          computedAt: new Date().toISOString(),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const err = error as Error
    log.error('compute-network-scores failed:', err.message)
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
