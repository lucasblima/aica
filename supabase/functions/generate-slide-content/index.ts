/**
 * Generate Slide Content Edge Function
 * Issue #117 - Phase 3: RAG Integration + Content Generation
 *
 * Generates slide content using Google Gemini API with structured JSON output.
 * This function receives a prompt and returns validated JSON content for a slide.
 *
 * NOTE: This is a simplified stub for Phase 3. Full implementation with
 * retry logic, token tracking, and advanced error handling will be done in Phase 4.
 *
 * @module functions/generate-slide-content
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10'

// =============================================================================
// TYPES
// =============================================================================

interface GenerateSlideRequest {
  prompt: string
  model?: string
  temperature?: number
  maxOutputTokens?: number
  responseFormat?: 'json' | 'text'
}

interface GenerateSlideResponse {
  success: boolean
  result?: {
    text: string
    tokensUsed?: number
  }
  error?: string
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEFAULT_MODEL = 'gemini-2.0-flash-exp'
const DEFAULT_TEMPERATURE = 0.7
const DEFAULT_MAX_TOKENS = 2000

// =============================================================================
// CORS HEADERS
// =============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function createResponse(data: GenerateSlideResponse, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function createErrorResponse(error: string, status = 400): Response {
  return createResponse({ success: false, error }, status)
}

// =============================================================================
// GEMINI API CALL
// =============================================================================

/**
 * Call Gemini API to generate slide content
 */
async function generateContentWithGemini(
  prompt: string,
  model: string,
  temperature: number,
  maxTokens: number,
  responseFormat: 'json' | 'text'
): Promise<{ text: string; tokensUsed: number }> {
  const apiKey = Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY or GEMINI_API_KEY not configured')
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  // Build request body
  const requestBody: any = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  }

  // Add JSON mode if requested
  if (responseFormat === 'json') {
    requestBody.generationConfig.responseMimeType = 'application/json'
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Gemini API error:', errorText)
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()

  // Extract text from Gemini response
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  if (!text) {
    throw new Error('Empty response from Gemini API')
  }

  // Extract token usage
  const tokensUsed =
    (data.usageMetadata?.promptTokenCount || 0) + (data.usageMetadata?.candidatesTokenCount || 0)

  return { text, tokensUsed }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405)
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return createErrorResponse('Authorization header required', 401)
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration')
      return createErrorResponse('Server configuration error', 500)
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Verify user token
    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return createErrorResponse('Invalid or expired token', 401)
    }

    // Parse request body
    let body: GenerateSlideRequest
    try {
      body = await req.json()
    } catch {
      return createErrorResponse('Invalid JSON body')
    }

    // Validate required fields
    if (!body.prompt || typeof body.prompt !== 'string') {
      return createErrorResponse('Prompt is required and must be a string')
    }

    if (body.prompt.length < 10) {
      return createErrorResponse('Prompt must be at least 10 characters')
    }

    if (body.prompt.length > 50000) {
      return createErrorResponse('Prompt exceeds maximum length of 50000 characters')
    }

    // Extract options with defaults
    const model = body.model || DEFAULT_MODEL
    const temperature = body.temperature ?? DEFAULT_TEMPERATURE
    const maxOutputTokens = body.maxOutputTokens || DEFAULT_MAX_TOKENS
    const responseFormat = body.responseFormat || 'json'

    // Validate temperature
    if (temperature < 0 || temperature > 2) {
      return createErrorResponse('Temperature must be between 0 and 2')
    }

    // Validate maxOutputTokens
    if (maxOutputTokens < 1 || maxOutputTokens > 8192) {
      return createErrorResponse('maxOutputTokens must be between 1 and 8192')
    }

    console.log(`[generate-slide-content] User ${user.id} generating content with ${model}`)

    // Call Gemini API
    const { text, tokensUsed } = await generateContentWithGemini(
      body.prompt,
      model,
      temperature,
      maxOutputTokens,
      responseFormat
    )

    console.log(`[generate-slide-content] Generated ${text.length} chars, ${tokensUsed} tokens`)

    // Return successful response
    return createResponse({
      success: true,
      result: {
        text,
        tokensUsed,
      },
    })
  } catch (error) {
    console.error('[generate-slide-content] Error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return createResponse(
      {
        success: false,
        error: errorMessage,
      },
      500
    )
  }
})
