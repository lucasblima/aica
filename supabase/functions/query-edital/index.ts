/**
 * Query Edital Edge Function
 *
 * Queries an edital document using Gemini with the uploaded file reference.
 * Uses the gemini_file_name (files/xxx) to access the document directly.
 *
 * @module supabase/functions/query-edital
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// =============================================================================
// ENVIRONMENT & CONFIGURATION
// =============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

const GEMINI_MODEL = 'gemini-1.5-pro-latest'

// =============================================================================
// CORS CONFIGURATION
// =============================================================================

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://aica-staging-5p22u2w6jq-rj.a.run.app',
]

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-api-version',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  }
}

// =============================================================================
// TYPES
// =============================================================================

interface QueryEditalRequest {
  gemini_file_name: string  // files/xxx
  query: string
}

interface QueryEditalResponse {
  success: boolean
  answer: string
  citations?: string[]
  processing_time_ms?: number
  error?: string
}

// =============================================================================
// LOGGING
// =============================================================================

function log(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, data?: unknown) {
  const timestamp = new Date().toISOString()
  const logData = data ? `: ${JSON.stringify(data)}` : ''
  console.log(`[${timestamp}] [${level}] [query-edital] ${message}${logData}`)
}

// =============================================================================
// GEMINI QUERY
// =============================================================================

/**
 * Query the edital document using Gemini
 */
async function queryDocument(
  geminiFileName: string,
  userQuery: string
): Promise<{ answer: string; citations: string[] }> {
  log('INFO', 'Querying document with Gemini', { geminiFileName, queryLength: userQuery.length })

  const queryPrompt = `
Voce e um assistente especializado em analise de editais de fomento brasileiros.

TAREFA: Responda a pergunta do usuario com base EXCLUSIVAMENTE no conteudo do edital anexado.

REGRAS:
1. Responda APENAS com informacoes encontradas no documento
2. Se a informacao nao estiver no documento, diga claramente "Esta informacao nao foi encontrada no edital"
3. Cite trechos relevantes do documento quando apropriado
4. Seja preciso e objetivo
5. Use formatacao clara com marcadores quando listar multiplos itens

PERGUNTA DO USUARIO:
${userQuery}

FORMATO DE RESPOSTA:
Responda de forma direta e clara. Se citar trechos do documento, use aspas.
`

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: queryPrompt },
          {
            fileData: {
              fileUri: geminiFileName,  // Just "files/xxx", not full URL
              mimeType: 'application/pdf',
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,  // Low temperature for factual responses
      topP: 0.8,
      maxOutputTokens: 4096,
    },
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini query failed: ${response.statusText} - ${errorText}`)
  }

  const result = await response.json()
  const answer = result.candidates?.[0]?.content?.parts?.[0]?.text || 'Nao foi possivel gerar uma resposta.'

  // Extract citations (quoted text)
  const citationRegex = /"([^"]+)"/g
  const citations: string[] = []
  let match
  while ((match = citationRegex.exec(answer)) !== null) {
    if (match[1].length > 20) {  // Only include substantial quotes
      citations.push(match[1])
    }
  }

  log('INFO', 'Query completed', { answerLength: answer.length, citationsCount: citations.length })

  return { answer, citations }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: corsHeaders }
    )
  }

  const startTime = Date.now()

  try {
    // Validate API key
    if (!GEMINI_API_KEY) {
      log('ERROR', 'GEMINI_API_KEY not configured')
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error: API key missing' }),
        { status: 500, headers: corsHeaders }
      )
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header required' }),
        { status: 401, headers: corsHeaders }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Verify user authentication
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      log('ERROR', 'Authentication failed', authError?.message)
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired authentication token' }),
        { status: 401, headers: corsHeaders }
      )
    }

    // Parse request body
    const request: QueryEditalRequest = await req.json()

    // Validate required fields
    if (!request.gemini_file_name) {
      return new Response(
        JSON.stringify({ success: false, error: 'gemini_file_name is required' }),
        { status: 400, headers: corsHeaders }
      )
    }

    if (!request.query || request.query.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'query is required' }),
        { status: 400, headers: corsHeaders }
      )
    }

    log('INFO', 'Processing query', {
      userId: user.id,
      geminiFileName: request.gemini_file_name,
      queryLength: request.query.length,
    })

    // Verify user has access to this document
    const { data: document, error: docError } = await supabase
      .from('file_search_documents')
      .select('id, user_id, gemini_file_name')
      .eq('gemini_file_name', request.gemini_file_name)
      .eq('user_id', user.id)
      .single()

    if (docError || !document) {
      log('WARN', 'Document not found or access denied', { geminiFileName: request.gemini_file_name })
      return new Response(
        JSON.stringify({ success: false, error: 'Document not found or access denied' }),
        { status: 404, headers: corsHeaders }
      )
    }

    // Query the document
    const { answer, citations } = await queryDocument(request.gemini_file_name, request.query)

    const processingTimeMs = Date.now() - startTime

    log('INFO', 'Query completed successfully', {
      documentId: document.id,
      processingTimeMs,
    })

    const response: QueryEditalResponse = {
      success: true,
      answer,
      citations,
      processing_time_ms: processingTimeMs,
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    const err = error as Error
    log('ERROR', 'Request processing failed', err.message)

    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Internal server error',
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})
