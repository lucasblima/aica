/**
 * Context Cache Edge Function
 *
 * Manages Gemini context caching for token optimization.
 * Caches user profile (from user_memory) and system instructions
 * to reduce API costs by up to 90%.
 *
 * Actions:
 * - get_or_create: Get existing cache or create new one
 * - get_stats: Get cache statistics (tokens saved, hits, etc.)
 * - invalidate: Force cache invalidation
 * - refresh: Force cache refresh
 *
 * References:
 * - https://ai.google.dev/gemini-api/docs/caching
 * - https://ai.google.dev/api/caching
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenAI } from "npm:@google/genai@0.7.0"
import { createClient } from "npm:@supabase/supabase-js@2.39.0"
import { createHash } from "node:crypto"

// ============================================================================
// CONFIGURATION
// ============================================================================

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CACHE_MODEL = "models/gemini-2.5-flash"
const DEFAULT_TTL_SECONDS = 3600 // 1 hour
const MIN_TOKENS_FLASH = 1024

// CORS configuration
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://aica-staging-5p22u2w6jq-rj.a.run.app',
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

interface CacheRequest {
  action: 'get_or_create' | 'get_stats' | 'invalidate' | 'refresh'
  system_instruction?: string
  extra_context?: string
  ttl_seconds?: number
}

interface CacheMetadata {
  cache_name: string
  token_count: number
  created_at: string
  expires_at: string
  profile_hash: string
}

interface CacheStats {
  cache_name: string | null
  cached_tokens: number
  total_tokens_saved: number
  cache_hits: number
  created_at: string | null
  expires_at: string | null
  is_active: boolean
  savings_percentage: number
  estimated_cost_savings_usd: number
}

interface UserMemory {
  category: string
  module: string | null
  key: string
  value: Record<string, unknown>
  confidence: number
  source: string
}

// In-memory cache store (per-worker instance)
// In production, consider using Redis or Supabase for persistence
const cacheStore = new Map<string, CacheMetadata>()
const statsStore = new Map<string, { cache_hits: number; cached_tokens: number; total_tokens_saved: number }>()

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getUserIdFromJwt(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const jwt = authHeader.substring(7)

  // Verify JWT with Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const { data, error } = await supabase.auth.getUser(jwt)

  if (error || !data.user) {
    console.error('[context-cache] JWT verification failed:', error?.message)
    return null
  }

  return data.user.id
}

async function fetchUserMemories(userId: string): Promise<Map<string, UserMemory[]>> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  const { data, error } = await supabase
    .from('user_memory')
    .select('category, module, key, value, confidence, source')
    .eq('user_id', userId)
    .gte('confidence', 0.5)
    .order('confidence', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[context-cache] Error fetching memories:', error.message)
    return new Map()
  }

  // Group by category
  const grouped = new Map<string, UserMemory[]>()
  for (const memory of (data || [])) {
    const category = memory.category || 'other'
    if (!grouped.has(category)) {
      grouped.set(category, [])
    }
    grouped.get(category)!.push(memory as UserMemory)
  }

  return grouped
}

function formatProfileText(memories: Map<string, UserMemory[]>): string {
  if (memories.size === 0) {
    return "PERFIL DO USUARIO:\nNenhuma informacao de perfil disponivel ainda."
  }

  const sections = ["PERFIL DO USUARIO:"]

  const categoryLabels: Record<string, string> = {
    profile: "Informacoes Pessoais",
    preference: "Preferencias",
    fact: "Fatos Conhecidos",
    insight: "Insights",
    pattern: "Padroes de Comportamento"
  }

  for (const [category, label] of Object.entries(categoryLabels)) {
    const categoryMemories = memories.get(category)
    if (categoryMemories && categoryMemories.length > 0) {
      sections.push(`\n## ${label.toUpperCase()}`)

      for (const memory of categoryMemories) {
        const valueStr = typeof memory.value === 'object'
          ? Object.entries(memory.value).map(([k, v]) => `${k}: ${v}`).join(', ')
          : String(memory.value)

        const moduleSuffix = memory.module ? ` [${memory.module}]` : ""
        const confidenceIndicator = memory.confidence >= 0.9 ? "*" : ""

        sections.push(`- ${memory.key}${confidenceIndicator}: ${valueStr}${moduleSuffix}`)
      }
    }
  }

  return sections.join("\n")
}

function buildCacheContent(
  profileText: string,
  extraContext?: string
): string {
  const parts = [
    profileText,
    "",
    "---",
    "Use as informacoes acima para personalizar suas respostas.",
    "Respeite as preferencias do usuario e aplique os insights conhecidos."
  ]

  if (extraContext) {
    parts.push("", "CONTEXTO ADICIONAL:", extraContext)
  }

  return parts.join("\n")
}

async function getProfileHash(userId: string): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  const { data } = await supabase
    .from('user_memory')
    .select('key, value, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(10)

  const content = JSON.stringify(data || [])
  return createHash('md5').update(content).digest('hex').substring(0, 16)
}

// ============================================================================
// CACHE OPERATIONS
// ============================================================================

async function createCache(
  client: GoogleGenAI,
  userId: string,
  systemInstruction: string,
  content: string,
  ttlSeconds: number
): Promise<CacheMetadata | null> {
  try {
    const cache = await client.caches.create({
      model: CACHE_MODEL,
      config: {
        displayName: `aica_user_${userId.substring(0, 8)}`,
        systemInstruction: systemInstruction,
        contents: [
          {
            role: "user",
            parts: [{ text: content }]
          }
        ],
        ttl: `${ttlSeconds}s`
      }
    })

    const tokenCount = cache.usageMetadata?.totalTokenCount || 0
    const expiresAt = cache.expireTime || new Date(Date.now() + ttlSeconds * 1000).toISOString()

    return {
      cache_name: cache.name!,
      token_count: tokenCount,
      created_at: new Date().toISOString(),
      expires_at: expiresAt,
      profile_hash: await getProfileHash(userId)
    }
  } catch (error) {
    console.error('[context-cache] Failed to create cache:', error)
    return null
  }
}

async function getOrCreateCache(
  client: GoogleGenAI,
  userId: string,
  systemInstruction: string,
  extraContext?: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
  forceRefresh: boolean = false
): Promise<{ cache_name: string | null; from_cache: boolean; token_count: number }> {

  // Check for existing valid cache
  if (!forceRefresh && cacheStore.has(userId)) {
    const metadata = cacheStore.get(userId)!
    const expiresAt = new Date(metadata.expires_at)

    if (new Date() < expiresAt) {
      // Verify profile hasn't changed
      const currentHash = await getProfileHash(userId)
      if (currentHash === metadata.profile_hash) {
        // Cache hit
        const stats = statsStore.get(userId) || { cache_hits: 0, cached_tokens: metadata.token_count, total_tokens_saved: 0 }
        stats.cache_hits++
        stats.total_tokens_saved += Math.floor(metadata.token_count * 0.75) // 75% savings estimate
        statsStore.set(userId, stats)

        console.log(`[context-cache] Cache hit for user ${userId.substring(0, 8)}`)
        return { cache_name: metadata.cache_name, from_cache: true, token_count: metadata.token_count }
      } else {
        console.log(`[context-cache] Profile changed for user ${userId.substring(0, 8)}, refreshing`)
      }
    }
  }

  // Load user memories
  const memories = await fetchUserMemories(userId)
  const profileText = formatProfileText(memories)
  const content = buildCacheContent(profileText, extraContext)

  // Check minimum token requirement
  const estimatedTokens = Math.floor(content.length / 4)
  if (estimatedTokens < MIN_TOKENS_FLASH) {
    console.log(`[context-cache] Content too small (${estimatedTokens} tokens), skipping cache`)
    return { cache_name: null, from_cache: false, token_count: 0 }
  }

  // Create cache
  const metadata = await createCache(client, userId, systemInstruction, content, ttlSeconds)

  if (metadata) {
    cacheStore.set(userId, metadata)
    statsStore.set(userId, { cache_hits: 0, cached_tokens: metadata.token_count, total_tokens_saved: 0 })

    console.log(`[context-cache] Created cache for user ${userId.substring(0, 8)} (${metadata.token_count} tokens)`)
    return { cache_name: metadata.cache_name, from_cache: false, token_count: metadata.token_count }
  }

  return { cache_name: null, from_cache: false, token_count: 0 }
}

function getCacheStats(userId: string): CacheStats {
  const metadata = cacheStore.get(userId)
  const stats = statsStore.get(userId)

  if (!metadata) {
    return {
      cache_name: null,
      cached_tokens: 0,
      total_tokens_saved: 0,
      cache_hits: 0,
      created_at: null,
      expires_at: null,
      is_active: false,
      savings_percentage: 0,
      estimated_cost_savings_usd: 0
    }
  }

  const cachedTokens = stats?.cached_tokens || 0
  const totalSaved = stats?.total_tokens_saved || 0
  const cacheHits = stats?.cache_hits || 0

  const totalPotential = cachedTokens * (cacheHits + 1)
  const savingsPercentage = totalPotential > 0 ? (totalSaved / totalPotential) * 100 : 0

  return {
    cache_name: metadata.cache_name,
    cached_tokens: cachedTokens,
    total_tokens_saved: totalSaved,
    cache_hits: cacheHits,
    created_at: metadata.created_at,
    expires_at: metadata.expires_at,
    is_active: new Date() < new Date(metadata.expires_at),
    savings_percentage: Math.round(savingsPercentage * 100) / 100,
    estimated_cost_savings_usd: Math.round(totalSaved * 0.000001 * 10000) / 10000
  }
}

async function invalidateCache(client: GoogleGenAI, userId: string): Promise<boolean> {
  const metadata = cacheStore.get(userId)

  if (metadata) {
    try {
      await client.caches.delete({ name: metadata.cache_name })
      console.log(`[context-cache] Deleted cache ${metadata.cache_name}`)
    } catch (error) {
      console.warn(`[context-cache] Failed to delete Gemini cache:`, error)
    }

    cacheStore.delete(userId)
    statsStore.delete(userId)
    return true
  }

  return false
}

// ============================================================================
// MAIN SERVER
// ============================================================================

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify authentication
    const userId = await getUserIdFromJwt(req)
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY })
    const body = await req.json() as CacheRequest

    let result: unknown

    switch (body.action) {
      case 'get_or_create': {
        if (!body.system_instruction) {
          return new Response(
            JSON.stringify({ error: 'system_instruction is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const cacheResult = await getOrCreateCache(
          client,
          userId,
          body.system_instruction,
          body.extra_context,
          body.ttl_seconds || DEFAULT_TTL_SECONDS
        )

        result = {
          cache_name: cacheResult.cache_name,
          from_cache: cacheResult.from_cache,
          token_count: cacheResult.token_count,
          user_id: userId.substring(0, 8) + '...'
        }
        break
      }

      case 'get_stats': {
        result = getCacheStats(userId)
        break
      }

      case 'invalidate': {
        const invalidated = await invalidateCache(client, userId)
        result = { invalidated, user_id: userId.substring(0, 8) + '...' }
        break
      }

      case 'refresh': {
        if (!body.system_instruction) {
          return new Response(
            JSON.stringify({ error: 'system_instruction is required for refresh' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Invalidate first
        await invalidateCache(client, userId)

        // Create new cache
        const cacheResult = await getOrCreateCache(
          client,
          userId,
          body.system_instruction,
          body.extra_context,
          body.ttl_seconds || DEFAULT_TTL_SECONDS,
          true
        )

        result = {
          cache_name: cacheResult.cache_name,
          refreshed: true,
          token_count: cacheResult.token_count,
          user_id: userId.substring(0, 8) + '...'
        }
        break
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${body.action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    const latencyMs = Date.now() - startTime
    console.log(`[context-cache] Action ${body.action} completed in ${latencyMs}ms`)

    return new Response(
      JSON.stringify({ success: true, result, latencyMs }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const err = error as Error
    console.error('[context-cache] Error:', err.message)

    return new Response(
      JSON.stringify({ error: err.message, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
