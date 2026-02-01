/**
 * Process Edital Edge Function
 *
 * Processes edital PDFs using Google File Search as the SINGLE source:
 * 1. Upload PDF to Google Files API (for File Search indexing)
 * 2. Wait for file to be ACTIVE (indexed)
 * 3. Use Gemini 2.0 Flash to extract structured data
 * 4. Save reference in file_search_documents
 * 5. Return: gemini_file_name + structured data
 *
 * NO local embeddings, NO pgvector, NO PDF.js
 *
 * @module supabase/functions/process-edital
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// =============================================================================
// ENVIRONMENT & CONFIGURATION
// =============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

// Model for structured extraction (use stable version)
const GEMINI_MODEL = 'gemini-1.5-pro-latest'

// =============================================================================
// CORS CONFIGURATION
// =============================================================================

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://aica-staging-5p22u2w6jq-rj.a.run.app',
  'https://aica-life-os.web.app', // Production domain
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

interface ProcessEditalRequest {
  file_data: string  // base64 encoded PDF
  file_name: string
  file_size: number
}

interface EvaluationCriterion {
  name: string
  description?: string
  weight?: number
  max_score?: number
}

interface FormField {
  id: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'file'
  required: boolean
  description?: string
  max_length?: number
  options?: string[]
}

interface AnalyzedEditalData {
  title: string
  funding_agency: string
  program_name?: string
  edital_number?: string
  submission_deadline: string
  submission_start?: string
  result_date?: string
  min_funding?: number
  max_funding?: number
  counterpart_percentage?: number
  eligible_themes: string[]
  eligibility_requirements: string[]
  evaluation_criteria: EvaluationCriterion[]
  form_fields: FormField[]
  external_system_url?: string
  raw_text_preview?: string  // First 2000 chars for preview
}

interface ProcessEditalResponse {
  success: boolean
  gemini_file_name: string
  file_search_document_id: string
  analyzed_data: AnalyzedEditalData
  processing_time_ms: number
}

// =============================================================================
// LOGGING
// =============================================================================

function log(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, data?: unknown) {
  const timestamp = new Date().toISOString()
  const logData = data ? `: ${JSON.stringify(data)}` : ''
  console.log(`[${timestamp}] [${level}] [process-edital] ${message}${logData}`)
}

// =============================================================================
// GOOGLE FILES API HELPERS
// =============================================================================

/**
 * Upload file to Google Files API for File Search indexing
 */
async function uploadToGoogleFiles(
  base64Data: string,
  fileName: string,
  mimeType: string
): Promise<string> {
  log('INFO', 'Uploading to Google Files API', { fileName, mimeType })

  try {
    // Validate API key before attempting upload
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured')
    }

    // Decode base64 to bytes
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    const blob = new Blob([bytes], { type: mimeType })

    log('DEBUG', 'File decoded', { sizeBytes: blob.size })

    // Upload via multipart form
    const formData = new FormData()
    formData.append('file', blob, fileName)

    const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_API_KEY}`

    log('DEBUG', 'Sending upload request to Google Files API')

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      log('ERROR', 'Google Files API error', { status: response.status, statusText: response.statusText, errorText })
      throw new Error(`Google Files upload failed (${response.status}): ${errorText}`)
    }

    const result = await response.json()

    if (!result.file || !result.file.name) {
      log('ERROR', 'Invalid response from Google Files API', { result })
      throw new Error('Invalid response: missing file.name')
    }

    const geminiFileName = result.file.name // "files/xxx"

    log('INFO', 'File uploaded to Google Files API', { geminiFileName, state: result.file.state })

    return geminiFileName
  } catch (error) {
    const err = error as Error
    log('ERROR', 'Upload to Google Files failed', { error: err.message, fileName })
    throw new Error(`Failed to upload file to Google Files API: ${err.message}`)
  }
}

/**
 * Wait for file to be processed and ACTIVE in Google Files API
 */
async function waitForFileActive(geminiFileName: string, maxWaitMs = 120000): Promise<void> {
  log('INFO', 'Waiting for file to be ACTIVE', { geminiFileName })

  const startTime = Date.now()
  const pollInterval = 2000 // 2 seconds

  while (true) {
    if (Date.now() - startTime > maxWaitMs) {
      throw new Error(`Timeout waiting for file to be ACTIVE: ${geminiFileName}`)
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${geminiFileName}?key=${GEMINI_API_KEY}`
    )

    if (!response.ok) {
      throw new Error(`Failed to check file status: ${response.statusText}`)
    }

    const fileInfo = await response.json()

    if (fileInfo.state === 'ACTIVE') {
      log('INFO', 'File is ACTIVE', { geminiFileName, elapsedMs: Date.now() - startTime })
      return
    }

    if (fileInfo.state === 'FAILED') {
      throw new Error(`File processing failed: ${fileInfo.error?.message || 'Unknown error'}`)
    }

    // Still PROCESSING, wait and retry
    await new Promise(resolve => setTimeout(resolve, pollInterval))
  }
}

// =============================================================================
// GEMINI STRUCTURED EXTRACTION
// =============================================================================

/**
 * Extract structured data from edital using Gemini with the uploaded file
 */
async function extractEditalStructure(geminiFileName: string): Promise<AnalyzedEditalData> {
  log('INFO', 'Extracting edital structure with Gemini', { geminiFileName })

  const extractionPrompt = `
Voce e um especialista em analise de editais de fomento brasileiros.

TAREFA: Analise o edital anexado e extraia as informacoes estruturadas.

INSTRUCOES:
1. Extraia TODAS as informacoes relevantes do edital
2. Para datas, use formato ISO (YYYY-MM-DD)
3. Para valores monetarios, use apenas numeros (sem R$ ou pontuacao)
4. Para campos de formulario, identifique os campos que o proponente precisa preencher
5. Identifique criterios de avaliacao com pesos se disponiveis

FORMATO DE RESPOSTA (JSON ESTRITO):
{
  "title": "Titulo completo do edital",
  "funding_agency": "Nome da agencia financiadora (ex: FAPESP, CNPq, BNDES)",
  "program_name": "Nome do programa se houver",
  "edital_number": "Numero do edital (ex: 01/2024)",
  "submission_deadline": "2024-12-31",
  "submission_start": "2024-01-01",
  "result_date": "2025-03-01",
  "min_funding": 10000,
  "max_funding": 500000,
  "counterpart_percentage": 20,
  "eligible_themes": ["tema1", "tema2"],
  "eligibility_requirements": ["requisito1", "requisito2"],
  "evaluation_criteria": [
    {
      "name": "Merito tecnico-cientifico",
      "description": "Avaliacao da qualidade tecnica da proposta",
      "weight": 40,
      "max_score": 10
    }
  ],
  "form_fields": [
    {
      "id": "titulo_projeto",
      "label": "Titulo do Projeto",
      "type": "text",
      "required": true,
      "description": "Titulo completo do projeto proposto",
      "max_length": 200
    },
    {
      "id": "resumo",
      "label": "Resumo Executivo",
      "type": "textarea",
      "required": true,
      "description": "Resumo do projeto em ate 500 palavras",
      "max_length": 3000
    },
    {
      "id": "valor_solicitado",
      "label": "Valor Solicitado",
      "type": "number",
      "required": true,
      "description": "Valor total solicitado em reais"
    },
    {
      "id": "objetivos",
      "label": "Objetivos",
      "type": "textarea",
      "required": true,
      "description": "Objetivos geral e especificos do projeto"
    },
    {
      "id": "justificativa",
      "label": "Justificativa",
      "type": "textarea",
      "required": true,
      "description": "Justificativa e relevancia do projeto"
    },
    {
      "id": "metodologia",
      "label": "Metodologia",
      "type": "textarea",
      "required": true,
      "description": "Metodologia e plano de trabalho"
    },
    {
      "id": "cronograma",
      "label": "Cronograma de Execucao",
      "type": "textarea",
      "required": true,
      "description": "Cronograma detalhado das atividades"
    },
    {
      "id": "orcamento",
      "label": "Plano de Aplicacao de Recursos",
      "type": "textarea",
      "required": true,
      "description": "Detalhamento do orcamento por categoria"
    },
    {
      "id": "equipe",
      "label": "Equipe Executora",
      "type": "textarea",
      "required": true,
      "description": "Curriculo resumido da equipe"
    },
    {
      "id": "resultados_esperados",
      "label": "Resultados Esperados",
      "type": "textarea",
      "required": true,
      "description": "Resultados e impactos esperados"
    }
  ],
  "external_system_url": "https://sistema.agencia.gov.br/inscricao",
  "raw_text_preview": "Primeiros 2000 caracteres do texto do edital..."
}

IMPORTANTE:
- Retorne APENAS o JSON, sem markdown ou formatacao extra
- Se um campo nao estiver disponivel no edital, omita-o do JSON
- Os form_fields devem refletir os campos realmente exigidos no edital
- Adicione campos especificos se o edital exigir informacoes adicionais
`

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: extractionPrompt },
          {
            file_data: {
              file_uri: `https://generativelanguage.googleapis.com/v1beta/${geminiFileName}`,
              mime_type: 'application/pdf',
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,  // Low temperature for structured extraction
      topP: 0.8,
      maxOutputTokens: 8192,
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
    throw new Error(`Gemini extraction failed: ${response.statusText} - ${errorText}`)
  }

  const result = await response.json()
  let responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || ''

  // Clean JSON response (remove markdown code blocks if present)
  responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  try {
    const parsed = JSON.parse(responseText)

    // Ensure required fields have defaults
    return {
      title: parsed.title || 'Edital sem titulo',
      funding_agency: parsed.funding_agency || 'Agencia nao identificada',
      program_name: parsed.program_name,
      edital_number: parsed.edital_number,
      submission_deadline: parsed.submission_deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      submission_start: parsed.submission_start,
      result_date: parsed.result_date,
      min_funding: parsed.min_funding,
      max_funding: parsed.max_funding,
      counterpart_percentage: parsed.counterpart_percentage,
      eligible_themes: parsed.eligible_themes || [],
      eligibility_requirements: parsed.eligibility_requirements || [],
      evaluation_criteria: parsed.evaluation_criteria || [],
      form_fields: parsed.form_fields || getDefaultFormFields(),
      external_system_url: parsed.external_system_url,
      raw_text_preview: parsed.raw_text_preview?.substring(0, 2000),
    }
  } catch (parseError) {
    log('ERROR', 'Failed to parse Gemini response', { responseText: responseText.substring(0, 500) })
    throw new Error('Failed to parse edital structure from Gemini response')
  }
}

/**
 * Default form fields if extraction fails
 */
function getDefaultFormFields(): FormField[] {
  return [
    { id: 'titulo_projeto', label: 'Titulo do Projeto', type: 'text', required: true, max_length: 200 },
    { id: 'resumo', label: 'Resumo Executivo', type: 'textarea', required: true, max_length: 3000 },
    { id: 'objetivos', label: 'Objetivos', type: 'textarea', required: true },
    { id: 'justificativa', label: 'Justificativa', type: 'textarea', required: true },
    { id: 'metodologia', label: 'Metodologia', type: 'textarea', required: true },
    { id: 'cronograma', label: 'Cronograma', type: 'textarea', required: true },
    { id: 'orcamento', label: 'Orcamento', type: 'textarea', required: true },
    { id: 'equipe', label: 'Equipe Executora', type: 'textarea', required: true },
    { id: 'resultados_esperados', label: 'Resultados Esperados', type: 'textarea', required: true },
  ]
}

// =============================================================================
// DATABASE OPERATIONS
// =============================================================================

/**
 * Save document reference to file_search_documents
 */
async function saveDocumentReference(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  geminiFileName: string,
  originalFileName: string,
  fileSize: number
): Promise<string> {
  log('INFO', 'Saving document reference to database')

  const { data, error } = await supabase
    .from('file_search_documents')
    .insert({
      user_id: userId,
      gemini_file_name: geminiFileName,
      original_filename: originalFileName,
      mime_type: 'application/pdf',
      file_size_bytes: fileSize,
      module_type: 'grants',
      indexing_status: 'completed',
    })
    .select('id')
    .single()

  if (error) {
    log('ERROR', 'Failed to save document reference', { error: error.message })
    throw new Error(`Failed to save document reference: ${error.message}`)
  }

  log('INFO', 'Document reference saved', { documentId: data.id })

  return data.id
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
    const request: ProcessEditalRequest = await req.json()

    // Validate required fields
    if (!request.file_data) {
      return new Response(
        JSON.stringify({ success: false, error: 'file_data (base64) is required' }),
        { status: 400, headers: corsHeaders }
      )
    }

    if (!request.file_name) {
      return new Response(
        JSON.stringify({ success: false, error: 'file_name is required' }),
        { status: 400, headers: corsHeaders }
      )
    }

    log('INFO', 'Processing edital', {
      userId: user.id,
      fileName: request.file_name,
      fileSize: request.file_size,
    })

    // =======================================================================
    // MAIN PROCESSING PIPELINE
    // =======================================================================

    // 1. Upload to Google Files API
    const geminiFileName = await uploadToGoogleFiles(
      request.file_data,
      request.file_name,
      'application/pdf'
    )

    // 2. Wait for file to be ACTIVE (indexed)
    await waitForFileActive(geminiFileName)

    // 3. Extract structured data using Gemini
    const analyzedData = await extractEditalStructure(geminiFileName)

    // 4. Save reference to database
    const documentId = await saveDocumentReference(
      supabase,
      user.id,
      geminiFileName,
      request.file_name,
      request.file_size || 0
    )

    // =======================================================================

    const processingTimeMs = Date.now() - startTime

    log('INFO', 'Edital processed successfully', {
      documentId,
      geminiFileName,
      processingTimeMs,
      title: analyzedData.title,
    })

    const response: ProcessEditalResponse = {
      success: true,
      gemini_file_name: geminiFileName,
      file_search_document_id: documentId,
      analyzed_data: analyzedData,
      processing_time_ms: processingTimeMs,
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    const err = error as Error
    log('ERROR', 'Request processing failed', { error: err.message, stack: err.stack })

    // Determine appropriate status code based on error type
    let statusCode = 500
    let errorMessage = err.message || 'Internal server error'

    // Check for specific error types
    if (err.message.includes('GEMINI_API_KEY')) {
      statusCode = 500
      errorMessage = 'Server configuration error: Gemini API key not configured'
    } else if (err.message.includes('Authentication') || err.message.includes('token')) {
      statusCode = 401
      errorMessage = 'Authentication failed: Invalid or expired token'
    } else if (err.message.includes('Google Files upload failed')) {
      statusCode = 502
      errorMessage = `External API error: ${err.message}`
    } else if (err.message.includes('Timeout waiting for file')) {
      statusCode = 504
      errorMessage = 'File processing timeout: Google Files API took too long to process the PDF'
    } else if (err.message.includes('Failed to parse')) {
      statusCode = 500
      errorMessage = 'AI extraction error: Failed to parse edital structure from Gemini response'
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: err.message, // Include original error for debugging
      }),
      { status: statusCode, headers: corsHeaders }
    )
  }
})
