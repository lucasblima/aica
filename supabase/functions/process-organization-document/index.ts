/**
 * Process Organization Document Edge Function
 * Issue #100 - Wizard gamificado para cadastro completo de organizacoes
 *
 * Specialized function for extracting organization data from documents:
 * - Cartao CNPJ (primary use case)
 * - Estatuto Social
 * - Comprovante de Endereco
 *
 * Returns structured organization fields for wizard auto-fill.
 *
 * @module supabase/functions/process-organization-document
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0"

// =============================================================================
// ENVIRONMENT & CONFIGURATION
// =============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash'

// =============================================================================
// TYPES
// =============================================================================

interface ProcessOrgDocumentRequest {
  storage_path: string
  document_type?: 'cartao_cnpj' | 'estatuto' | 'comprovante_endereco' | 'auto'
}

interface OrganizationFields {
  // Identification
  document_number?: string // CNPJ
  legal_name?: string // Razao Social
  name?: string // Nome Fantasia
  organization_type?: string // Natureza Juridica mapped

  // Contact
  email?: string
  phone?: string

  // Address
  address_street?: string
  address_number?: string
  address_complement?: string
  address_neighborhood?: string
  address_city?: string
  address_state?: string
  address_zip?: string

  // Context
  foundation_year?: number
  areas_of_activity?: string[] // CNAEs
  description?: string
  mission?: string
}

interface ExtractedField {
  value: string | number | string[] | null
  confidence: number
  source?: string // Where in document this was found
}

interface ProcessOrgDocumentResponse {
  success: boolean
  document_type: string
  fields: OrganizationFields
  field_confidence: Record<string, number>
  raw_text?: string
  processing_time_ms: number
}

// =============================================================================
// LOGGING
// =============================================================================

function log(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, data?: unknown) {
  const timestamp = new Date().toISOString()
  const logData = data ? `: ${JSON.stringify(data)}` : ''
  console.log(`[${timestamp}] [${level}] [process-org-document] ${message}${logData}`)
}

// =============================================================================
// CORS
// =============================================================================

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://aica-staging-5562559893.southamerica-east1.run.app',
]

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '*'

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  }
}

// =============================================================================
// RETRY LOGIC
// =============================================================================

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      const errorMessage = lastError.message || String(error)

      if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
        const delay = 1000 * Math.pow(2, attempt)
        log('WARN', `Rate limit hit for ${operationName}, retrying in ${delay}ms`, { attempt: attempt + 1 })
        await sleep(delay)
        continue
      }

      throw error
    }
  }

  throw lastError || new Error(`Max retries exceeded for ${operationName}`)
}

// =============================================================================
// FILE OPERATIONS
// =============================================================================

async function fetchFileAsBase64(
  supabase: ReturnType<typeof createClient>,
  storagePath: string
): Promise<{ base64: string; mimeType: string }> {
  log('INFO', 'Fetching file from storage', { path: storagePath })

  const pathParts = storagePath.split('/')
  const bucket = pathParts[0]
  const filePath = pathParts.slice(1).join('/')

  const { data, error } = await supabase.storage
    .from(bucket)
    .download(filePath)

  if (error) {
    throw new Error(`Failed to download file: ${error.message}`)
  }

  const arrayBuffer = await data.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)
  const binaryString = Array.from(uint8Array).map(byte => String.fromCharCode(byte)).join('')
  const base64 = btoa(binaryString)

  return { base64, mimeType: data.type || 'application/octet-stream' }
}

// =============================================================================
// NATUREZA JURIDICA MAPPING
// =============================================================================

const NATUREZA_JURIDICA_MAP: Record<string, string> = {
  // Associacoes
  '399-9': 'associacao',
  '3999': 'associacao',
  'associacao': 'associacao',
  'associacao civil': 'associacao',
  'associacao privada': 'associacao',

  // ONGs
  'organizacao social': 'ong',
  'oscip': 'ong',
  'os': 'ong',
  'ong': 'ong',

  // Institutos
  'instituto': 'instituto',
  'fundacao': 'instituto',
  'fundacao privada': 'instituto',

  // Cooperativas
  'cooperativa': 'cooperativa',

  // Empresas
  'sociedade empresaria limitada': 'empresa',
  'ltda': 'empresa',
  'eireli': 'empresa',
  'sociedade anonima': 'empresa',
  's/a': 'empresa',
  'sa': 'empresa',
  'mei': 'empresa',
  'empresa individual': 'empresa',

  // Governo
  'autarquia': 'governo',
  'fundacao publica': 'governo',
  'orgao publico': 'governo',
}

function mapNaturezaJuridica(natureza: string): string {
  const normalized = natureza.toLowerCase().trim()

  for (const [key, value] of Object.entries(NATUREZA_JURIDICA_MAP)) {
    if (normalized.includes(key)) {
      return value
    }
  }

  return 'outro'
}

// =============================================================================
// DOCUMENT EXTRACTION
// =============================================================================

async function extractOrganizationFields(
  genAI: GoogleGenerativeAI,
  base64Content: string,
  mimeType: string,
  documentType: string
): Promise<{ fields: OrganizationFields; fieldConfidence: Record<string, number>; rawText: string; detectedType: string; usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } }> {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL })

  const extractionPrompt = `
Voce e um especialista em extracao de dados de documentos empresariais brasileiros.

TAREFA: Extraia dados da organizacao a partir do documento anexado.

TIPO DE DOCUMENTO ESPERADO: ${documentType === 'auto' ? 'Detectar automaticamente' : documentType}

CAMPOS A EXTRAIR:

Para Cartao CNPJ:
- cnpj: Numero do CNPJ (formato XX.XXX.XXX/XXXX-XX)
- razao_social: Nome legal completo da empresa
- nome_fantasia: Nome fantasia (se houver)
- natureza_juridica: Tipo juridico da organizacao
- data_abertura: Data de abertura (formato DD/MM/YYYY)
- cnaes: Lista de CNAEs com descricoes
- logradouro: Nome da rua/avenida
- numero: Numero do endereco
- complemento: Complemento (sala, andar, etc)
- bairro: Bairro
- municipio: Cidade
- uf: Estado (sigla de 2 letras)
- cep: CEP (formato XXXXX-XXX)
- email: Email de contato (se visivel)
- telefone: Telefone de contato (se visivel)

Para Estatuto Social:
- cnpj, razao_social, objeto_social (descricao das atividades)
- missao (se mencionada), areas_atuacao

Para Comprovante de Endereco:
- logradouro, numero, complemento, bairro, municipio, uf, cep

FORMATO DE RESPOSTA (JSON):
{
  "detected_type": "cartao_cnpj" | "estatuto" | "comprovante_endereco" | "outro",
  "raw_text": "texto extraido do documento",
  "fields": {
    "cnpj": { "value": "XX.XXX.XXX/XXXX-XX", "confidence": 0.95 },
    "razao_social": { "value": "Nome da Empresa LTDA", "confidence": 0.9 },
    "nome_fantasia": { "value": "Nome Fantasia", "confidence": 0.85 },
    "natureza_juridica": { "value": "Associacao Privada", "confidence": 0.9 },
    "data_abertura": { "value": "01/01/2020", "confidence": 0.95 },
    "cnaes": { "value": ["90.01-1 - Artes cenicas", "90.02-2 - Atividades de apoio"], "confidence": 0.9 },
    "logradouro": { "value": "Rua das Flores", "confidence": 0.95 },
    "numero": { "value": "123", "confidence": 0.95 },
    "complemento": { "value": "Sala 101", "confidence": 0.8 },
    "bairro": { "value": "Centro", "confidence": 0.95 },
    "municipio": { "value": "Sao Paulo", "confidence": 0.95 },
    "uf": { "value": "SP", "confidence": 0.99 },
    "cep": { "value": "01234-567", "confidence": 0.95 },
    "email": { "value": "contato@empresa.com", "confidence": 0.7 },
    "telefone": { "value": "(11) 99999-9999", "confidence": 0.7 },
    "objeto_social": { "value": "Promocao de atividades culturais...", "confidence": 0.85 },
    "missao": { "value": "Nossa missao e...", "confidence": 0.7 }
  }
}

REGRAS:
- confidence: 0.0 a 1.0 (certeza da extracao)
- Se o campo nao existe no documento, omita-o
- Para CNAEs, extraia codigo e descricao
- Para datas, mantenha formato brasileiro DD/MM/YYYY
- Para CNPJ, normalize para formato XX.XXX.XXX/XXXX-XX
- Retorne APENAS JSON valido, sem markdown

IMPORTANTE: Seja preciso. Nao invente dados que nao estao no documento.
`

  const result = await withRetry(async () => {
    return await model.generateContent([
      { text: extractionPrompt },
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Content,
        },
      },
    ])
  }, 'extractOrganizationFields')

  const orgUsageMetadata = result.response.usageMetadata
  let responseText = result.response.text()
  responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  try {
    const parsed = JSON.parse(responseText)

    // Map extracted fields to OrganizationFields
    const fields: OrganizationFields = {}
    const fieldConfidence: Record<string, number> = {}

    const extractedFields = parsed.fields || {}

    // Identification
    if (extractedFields.cnpj?.value) {
      fields.document_number = extractedFields.cnpj.value
      fieldConfidence.document_number = extractedFields.cnpj.confidence || 0.5
    }
    if (extractedFields.razao_social?.value) {
      fields.legal_name = extractedFields.razao_social.value
      fieldConfidence.legal_name = extractedFields.razao_social.confidence || 0.5
    }
    if (extractedFields.nome_fantasia?.value) {
      fields.name = extractedFields.nome_fantasia.value
      fieldConfidence.name = extractedFields.nome_fantasia.confidence || 0.5
    }
    if (extractedFields.natureza_juridica?.value) {
      fields.organization_type = mapNaturezaJuridica(extractedFields.natureza_juridica.value)
      fieldConfidence.organization_type = extractedFields.natureza_juridica.confidence || 0.5
    }

    // Contact
    if (extractedFields.email?.value) {
      fields.email = extractedFields.email.value
      fieldConfidence.email = extractedFields.email.confidence || 0.5
    }
    if (extractedFields.telefone?.value) {
      fields.phone = extractedFields.telefone.value
      fieldConfidence.phone = extractedFields.telefone.confidence || 0.5
    }

    // Address
    if (extractedFields.logradouro?.value) {
      fields.address_street = extractedFields.logradouro.value
      fieldConfidence.address_street = extractedFields.logradouro.confidence || 0.5
    }
    if (extractedFields.numero?.value) {
      fields.address_number = String(extractedFields.numero.value)
      fieldConfidence.address_number = extractedFields.numero.confidence || 0.5
    }
    if (extractedFields.complemento?.value) {
      fields.address_complement = extractedFields.complemento.value
      fieldConfidence.address_complement = extractedFields.complemento.confidence || 0.5
    }
    if (extractedFields.bairro?.value) {
      fields.address_neighborhood = extractedFields.bairro.value
      fieldConfidence.address_neighborhood = extractedFields.bairro.confidence || 0.5
    }
    if (extractedFields.municipio?.value) {
      fields.address_city = extractedFields.municipio.value
      fieldConfidence.address_city = extractedFields.municipio.confidence || 0.5
    }
    if (extractedFields.uf?.value) {
      fields.address_state = extractedFields.uf.value.toUpperCase()
      fieldConfidence.address_state = extractedFields.uf.confidence || 0.5
    }
    if (extractedFields.cep?.value) {
      fields.address_zip = extractedFields.cep.value
      fieldConfidence.address_zip = extractedFields.cep.confidence || 0.5
    }

    // Context
    if (extractedFields.data_abertura?.value) {
      // Parse date to extract year
      const dateStr = extractedFields.data_abertura.value
      const yearMatch = dateStr.match(/(\d{4})/)
      if (yearMatch) {
        fields.foundation_year = parseInt(yearMatch[1], 10)
        fieldConfidence.foundation_year = extractedFields.data_abertura.confidence || 0.5
      }
    }

    if (extractedFields.cnaes?.value && Array.isArray(extractedFields.cnaes.value)) {
      fields.areas_of_activity = extractedFields.cnaes.value
      fieldConfidence.areas_of_activity = extractedFields.cnaes.confidence || 0.5
    }

    if (extractedFields.objeto_social?.value) {
      fields.description = extractedFields.objeto_social.value
      fieldConfidence.description = extractedFields.objeto_social.confidence || 0.5
    }

    if (extractedFields.missao?.value) {
      fields.mission = extractedFields.missao.value
      fieldConfidence.mission = extractedFields.missao.confidence || 0.5
    }

    return {
      fields,
      fieldConfidence,
      rawText: parsed.raw_text || '',
      detectedType: parsed.detected_type || 'outro',
      usageMetadata: orgUsageMetadata,
    }
  } catch {
    log('WARN', 'Failed to parse extraction response as JSON')
    return {
      fields: {},
      fieldConfidence: {},
      rawText: responseText,
      detectedType: 'outro',
      usageMetadata: orgUsageMetadata,
    }
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: corsHeaders }
    )
  }

  const startTime = Date.now()

  try {
    if (!GEMINI_API_KEY) {
      log('ERROR', 'GEMINI_API_KEY not configured')
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { status: 500, headers: corsHeaders }
      )
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: corsHeaders }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: corsHeaders }
      )
    }

    const request: ProcessOrgDocumentRequest = await req.json()

    if (!request.storage_path) {
      return new Response(
        JSON.stringify({ success: false, error: 'storage_path is required' }),
        { status: 400, headers: corsHeaders }
      )
    }

    log('INFO', 'Processing organization document', {
      userId: user.id,
      path: request.storage_path,
      type: request.document_type || 'auto',
    })

    // Fetch file
    const { base64, mimeType } = await fetchFileAsBase64(supabase, request.storage_path)

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

    // Extract fields
    const { fields, fieldConfidence, rawText, detectedType, usageMetadata } = await extractOrganizationFields(
      genAI,
      base64,
      mimeType,
      request.document_type || 'auto'
    )

    const processingTimeMs = Date.now() - startTime

    log('INFO', 'Extraction completed', {
      detectedType,
      fieldsExtracted: Object.keys(fields).length,
      processingTimeMs,
    })

    // Fire-and-forget usage tracking
    supabase.rpc('log_interaction', {
      p_user_id: user.id,
      p_action: 'parse_statement',
      p_module: 'grants',
      p_model: 'gemini-2.5-flash',
      p_tokens_in: usageMetadata?.promptTokenCount || 0,
      p_tokens_out: usageMetadata?.candidatesTokenCount || 0,
    }).then(() => {
      log('INFO', 'Logged interaction')
    }).catch((err: Error) => {
      log('WARN', 'Failed to log interaction', err.message)
    })

    const response: ProcessOrgDocumentResponse = {
      success: true,
      document_type: detectedType,
      fields,
      field_confidence: fieldConfidence,
      processing_time_ms: processingTimeMs,
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    const err = error as Error
    log('ERROR', 'Processing failed', err.message)

    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Internal server error',
        processing_time_ms: Date.now() - startTime,
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})
