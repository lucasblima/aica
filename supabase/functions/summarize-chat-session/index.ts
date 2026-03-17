import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { getCorsHeaders } from "../_shared/cors.ts"

// ============================================================================
// CONFIG
// ============================================================================

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// ============================================================================
// TYPES
// ============================================================================

interface SummaryResult {
  summary: string
  key_topics: string[]
  key_decisions: string[]
  emotional_themes: string[]
}

// ============================================================================
// HELPERS
// ============================================================================

function extractJSON<T = any>(text: string): T {
  // 1. Strip code fences
  let cleaned = text.replace(/```(?:json)?\s*\n?/g, '').trim()

  // 2. Try direct parse first
  try {
    return JSON.parse(cleaned)
  } catch {
    // continue to fallback strategies
  }

  // 3. Find first { or [ and match to last } or ]
  const objStart = cleaned.indexOf('{')
  const arrStart = cleaned.indexOf('[')
  let start = -1
  let end = -1

  if (objStart >= 0 && (arrStart < 0 || objStart < arrStart)) {
    start = objStart
    end = cleaned.lastIndexOf('}')
  } else if (arrStart >= 0) {
    start = arrStart
    end = cleaned.lastIndexOf(']')
  }

  if (start >= 0 && end > start) {
    try {
      return JSON.parse(cleaned.substring(start, end + 1))
    } catch {
      // fall through
    }
  }

  throw new Error(`Failed to extract JSON from model response: ${text.substring(0, 200)}`)
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ========================================================================
    // 1. AUTH — Extract user from JWT
    // ========================================================================
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create user-scoped client to verify JWT
    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = user.id

    // ========================================================================
    // 2. PARSE REQUEST
    // ========================================================================
    const body = await req.json()
    const { session_id } = body

    if (!session_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'session_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========================================================================
    // 3. FETCH MESSAGES — Use service_role to bypass RLS
    // ========================================================================
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Verify the session belongs to this user
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('chat_sessions')
      .select('id, user_id, title')
      .eq('id', session_id)
      .eq('user_id', userId)
      .single()

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ success: false, error: 'Session not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if summary already exists for this session
    const { data: existingSummary } = await supabaseAdmin
      .from('chat_conversation_summaries')
      .select('id')
      .eq('session_id', session_id)
      .limit(1)

    if (existingSummary?.length) {
      return new Response(
        JSON.stringify({ success: true, message: 'Summary already exists for this session', existing: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch all messages for this session
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('chat_messages')
      .select('content, direction, created_at')
      .eq('session_id', session_id)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('[summarize-chat-session] Messages query error:', messagesError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch messages' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!messages?.length || messages.length < 2) {
      return new Response(
        JSON.stringify({ success: true, message: 'Not enough messages to summarize', skipped: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========================================================================
    // 4. CALL GEMINI — Generate structured summary
    // ========================================================================
    const genai = new GoogleGenerativeAI(GEMINI_API_KEY)
    const model = genai.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        maxOutputTokens: 4096,
        temperature: 0.3,
      },
    })

    // Build conversation transcript (truncate long messages)
    const transcript = messages.map(m => {
      const role = m.direction === 'inbound' ? 'Usuário' : 'AICA'
      const content = m.content.length > 500 ? m.content.substring(0, 500) + '...' : m.content
      return `${role}: ${content}`
    }).join('\n')

    // Truncate transcript if too long (keep under ~6000 chars to save tokens)
    const maxTranscriptLength = 6000
    const truncatedTranscript = transcript.length > maxTranscriptLength
      ? transcript.substring(0, maxTranscriptLength) + '\n\n[...conversa truncada...]'
      : transcript

    const prompt = `Você é um assistente que cria resumos estruturados de conversas.

Analise a seguinte conversa entre um usuário e a AICA (assistente de vida pessoal) e gere um resumo estruturado.

Título da sessão: "${session.title}"

Conversa:
${truncatedTranscript}

Retorne um JSON com exatamente esta estrutura:
{
  "summary": "Resumo de 2-3 frases em português descrevendo o que foi discutido e os principais pontos",
  "key_topics": ["tópico 1", "tópico 2"],
  "key_decisions": ["decisão tomada 1"],
  "emotional_themes": ["tema emocional 1"]
}

Regras:
- O resumo deve ser em português do Brasil
- key_topics: 1-5 tópicos principais discutidos
- key_decisions: 0-3 decisões ou conclusões concretas (pode ser vazio [] se não houve decisões)
- emotional_themes: 0-3 temas emocionais detectados (pode ser vazio [] se a conversa foi puramente prática)
- Seja conciso e objetivo

Retorne APENAS o JSON, sem texto adicional.`

    console.log(`[summarize-chat-session] Generating summary for session=${session_id}, messages=${messages.length}`)

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    let summaryData: SummaryResult
    try {
      summaryData = extractJSON<SummaryResult>(text)
    } catch (parseError) {
      console.error('[summarize-chat-session] Failed to parse Gemini response:', text.substring(0, 300))
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse AI summary response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate the parsed data
    if (!summaryData.summary || typeof summaryData.summary !== 'string') {
      console.error('[summarize-chat-session] Invalid summary structure:', summaryData)
      return new Response(
        JSON.stringify({ success: false, error: 'AI returned invalid summary structure' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========================================================================
    // 5. SAVE SUMMARY
    // ========================================================================
    const { data: savedSummary, error: insertError } = await supabaseAdmin
      .from('chat_conversation_summaries')
      .insert({
        session_id: session_id,
        user_id: userId,
        summary: summaryData.summary,
        key_topics: summaryData.key_topics || [],
        key_decisions: summaryData.key_decisions || [],
        emotional_themes: summaryData.emotional_themes || [],
        message_count: messages.length,
      })
      .select('id, summary, key_topics, key_decisions, emotional_themes, message_count, created_at')
      .single()

    if (insertError) {
      console.error('[summarize-chat-session] Insert error:', insertError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save summary' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[summarize-chat-session] Summary saved: id=${savedSummary.id}, topics=${summaryData.key_topics?.length || 0}`)

    return new Response(
      JSON.stringify({ success: true, data: savedSummary }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[summarize-chat-session] Unexpected error:', error)
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
