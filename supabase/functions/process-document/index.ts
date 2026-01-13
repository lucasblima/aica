/**
 * Copyright (c) 2024 - Present. Aica Engineering. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Process Document Edge Function
 * Epic #113 - File Processing Pipeline (Issue #114)
 *
 * Processes uploaded documents through Gemini AI to:
 * 1. Extract text content (PDF, PPTX, DOCX, images)
 * 2. Classify document type
 * 3. Extract structured fields
 * 4. Generate text chunks for embeddings
 * 5. Create vector embeddings (text-embedding-004)
 * 6. Suggest entity linkages (organizations, projects)
 *
 * @module supabase/functions/process-document
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

// Model configuration (configurable via env vars)
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-2.0-flash-exp' // Cost-optimized for production
const EMBEDDING_MODEL = Deno.env.get('EMBEDDING_MODEL') || 'text-embedding-004' // 768 dimensions

// Processing configuration (configurable via env vars)
const CHUNK_SIZE_TOKENS = parseInt(Deno.env.get('CHUNK_SIZE_TOKENS') || '500', 10)
const CHUNK_OVERLAP_TOKENS = parseInt(Deno.env.get('CHUNK_OVERLAP_TOKENS') || '50', 10)
const MAX_RETRIES = parseInt(Deno.env.get('MAX_RETRIES') || '3', 10)
const RETRY_BASE_DELAY_MS = parseInt(Deno.env.get('RETRY_BASE_DELAY_MS') || '1000', 10)

// Document type detection keywords
const DOCUMENT_TYPE_KEYWORDS = {
  projeto_rouanet: ['PRONAC', 'Lei 8.313', 'MinC', 'Ministerio da Cultura', 'Rouanet', 'Lei de Incentivo Federal'],
  projeto_proac: ['ProAC', 'ICMS', 'Secretaria de Cultura', 'Estado de Sao Paulo', 'Lei Paulista'],
  estatuto_social: ['CNPJ', 'Estatuto Social', 'Objeto Social', 'Diretoria', 'Assembleia Geral', 'Art.'],
  relatorio_execucao: ['Prestacao de Contas', 'Relatorio de Execucao', 'Despesas', 'Receitas', 'Saldo'],
  apresentacao_institucional: ['Missao', 'Visao', 'Valores', 'Quem Somos', 'Nossa Historia', 'Sobre'],
  orcamento: ['Planilha', 'Orcamento', 'Custos', 'Valor Unitario', 'Total', 'R$'],
  contrato: ['Clausula', 'Contratante', 'Contratado', 'Objeto do Contrato', 'Vigencia', 'Assinatura'],
}

// =============================================================================
// TYPES
// =============================================================================

interface ProcessDocumentRequest {
  storage_path: string
  file_type: 'pdf' | 'pptx' | 'docx' | 'image'
  organization_id?: string
  project_id?: string
  source?: 'web' | 'whatsapp' | 'email'
  source_phone?: string
}

interface ProcessDocumentResponse {
  document_id: string
  detected_type: string
  confidence: number
  extracted_fields: Record<string, unknown>
  chunks_created: number
  embeddings_created: number
  link_suggestions: LinkSuggestion[]
  processing_time_ms: number
}

interface LinkSuggestion {
  entity_type: 'organization' | 'project' | 'opportunity'
  entity_id: string
  entity_name: string
  match_reason: 'cnpj' | 'name_similarity' | 'pronac' | 'context'
  confidence: number
}

interface ClassificationResult {
  detected_type: string
  confidence: number
  extracted_fields: Record<string, unknown>
}

interface TextChunk {
  chunk_index: number
  chunk_text: string
  chunk_tokens: number
  start_page?: number
  end_page?: number
}

// =============================================================================
// LOGGING UTILITY
// =============================================================================

function log(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, data?: unknown) {
  const timestamp = new Date().toISOString()
  const logData = data ? `: ${JSON.stringify(data)}` : ''
  console.log(`[${timestamp}] [${level}] [process-document] ${message}${logData}`)
}

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
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '*'

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  }
}

// =============================================================================
// RETRY LOGIC WITH EXPONENTIAL BACKOFF
// =============================================================================

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      const errorMessage = lastError.message || String(error)

      // Check for rate limit (429)
      if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt)
        log('WARN', `Rate limit hit for ${operationName}, retrying in ${delay}ms`, { attempt: attempt + 1, maxRetries })
        await sleep(delay)
        continue
      }

      // Check for server error (500)
      if (errorMessage.includes('500') || errorMessage.includes('INTERNAL')) {
        const delay = RETRY_BASE_DELAY_MS
        log('WARN', `Server error for ${operationName}, retrying in ${delay}ms`, { attempt: attempt + 1, maxRetries })
        await sleep(delay)
        continue
      }

      // Non-retryable error
      throw error
    }
  }

  throw lastError || new Error(`Max retries exceeded for ${operationName}`)
}

// =============================================================================
// CONTENT EXTRACTION
// =============================================================================

/**
 * Fetch file from Supabase Storage and convert to base64
 */
async function fetchFileAsBase64(
  supabase: ReturnType<typeof createClient>,
  storagePath: string
): Promise<{ base64: string; mimeType: string; size: number }> {
  log('INFO', 'Fetching file from storage', { path: storagePath })

  // Determine bucket from path
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

  const mimeType = data.type || 'application/octet-stream'

  log('INFO', 'File fetched successfully', { size: data.size, mimeType })

  return {
    base64,
    mimeType,
    size: data.size,
  }
}

/**
 * Extract text from document using Gemini Vision
 */
async function extractTextWithGemini(
  genAI: GoogleGenerativeAI,
  base64Content: string,
  mimeType: string,
  fileType: string
): Promise<{ text: string; pageCount?: number; hasImages: boolean }> {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL })

  const extractionPrompt = `
Voce e um especialista em extracao de texto de documentos.

TAREFA: Extraia TODO o conteudo textual do documento anexado.

INSTRUCOES:
1. Extraia texto de TODAS as paginas/slides
2. Preserve a estrutura (titulos, paragrafos, listas)
3. Inclua legendas de imagens/tabelas se houver
4. Para PDFs, identifique numero de paginas
5. Para apresentacoes, separe slides com "---SLIDE X---"
6. Mantenha formatacao numerica e datas
7. Indique se ha imagens significativas no documento

FORMATO DE RESPOSTA (JSON):
{
  "extracted_text": "texto completo extraido",
  "page_count": numero de paginas ou slides,
  "has_significant_images": true/false,
  "image_descriptions": ["descricao imagem 1", "descricao imagem 2"]
}

IMPORTANTE: Retorne APENAS o JSON, sem markdown ou formatacao extra.
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
  }, 'extractTextWithGemini')

  let responseText = result.response.text()

  // Clean JSON response
  responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  try {
    const parsed = JSON.parse(responseText)
    return {
      text: parsed.extracted_text || '',
      pageCount: parsed.page_count,
      hasImages: parsed.has_significant_images || false,
    }
  } catch {
    // If JSON parsing fails, use raw response as text
    log('WARN', 'Failed to parse extraction response as JSON, using raw text')
    return {
      text: responseText,
      pageCount: undefined,
      hasImages: false,
    }
  }
}

// =============================================================================
// DOCUMENT CLASSIFICATION
// =============================================================================

/**
 * Classify document type and extract structured fields
 */
async function classifyDocument(
  genAI: GoogleGenerativeAI,
  extractedText: string
): Promise<ClassificationResult> {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL })

  const classificationPrompt = `
Voce e um especialista em classificacao de documentos do setor cultural brasileiro.

TEXTO DO DOCUMENTO:
${extractedText.substring(0, 15000)}

TAREFA: Classifique o documento e extraia campos estruturados.

TIPOS DE DOCUMENTO POSSIVEIS:
1. projeto_rouanet - Projeto Lei Rouanet (PRONAC, Lei 8.313, MinC)
2. projeto_proac - Projeto ProAC (ICMS SP)
3. estatuto_social - Estatuto de organizacao (CNPJ, objeto social)
4. relatorio_execucao - Prestacao de contas
5. apresentacao_institucional - Apresentacao sobre organizacao
6. orcamento - Planilha de custos/orcamento
7. contrato - Documento contratual
8. outro - Se nenhum dos acima

CAMPOS A EXTRAIR POR TIPO:

Para projeto_rouanet:
- pronac (codigo PRONAC)
- valor_aprovado (em reais)
- vigencia_inicio (data)
- vigencia_fim (data)
- proponente (nome da organizacao)
- metas (array de strings)

Para projeto_proac:
- numero_proac
- valor_aprovado
- vigencia
- proponente

Para estatuto_social:
- cnpj (formato XX.XXX.XXX/XXXX-XX)
- razao_social
- objeto_social (resumo)
- diretores (array de nomes)
- data_constituicao

Para apresentacao_institucional:
- nome_organizacao
- missao
- visao
- historico (resumo)
- areas_atuacao (array)

Para orcamento:
- valor_total
- categorias (array de {nome, valor})

Para contrato:
- partes (array)
- objeto
- valor
- vigencia

Para outro:
- resumo
- palavras_chave (array)

FORMATO DE RESPOSTA (JSON):
{
  "detected_type": "tipo_detectado",
  "confidence": 0.85,
  "reasoning": "explicacao breve da classificacao",
  "extracted_fields": {
    "campo1": "valor1",
    "campo2": "valor2"
  }
}

IMPORTANTE:
- Retorne APENAS o JSON, sem markdown
- confidence deve ser entre 0.0 e 1.0
- Se nao encontrar um campo, omita-o
- Para valores monetarios, use numeros sem formatacao
`

  const result = await withRetry(async () => {
    return await model.generateContent(classificationPrompt)
  }, 'classifyDocument')

  let responseText = result.response.text()
  responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  try {
    const parsed = JSON.parse(responseText)
    return {
      detected_type: parsed.detected_type || 'outro',
      confidence: parsed.confidence || 0.5,
      extracted_fields: parsed.extracted_fields || {},
    }
  } catch {
    log('WARN', 'Failed to parse classification response, using fallback')
    return {
      detected_type: 'outro',
      confidence: 0.3,
      extracted_fields: {},
    }
  }
}

// =============================================================================
// TEXT CHUNKING
// =============================================================================

/**
 * Approximate token count (rough estimate: 1 token ~= 4 chars for Portuguese)
 *
 * NOTE: This is a simple heuristic and may be inaccurate for certain languages
 * or special characters. For production with high accuracy requirements, consider
 * using a proper tokenizer library that matches the embedding model (tiktoken equivalent).
 * However, for Deno Edge Functions, finding a compatible library is challenging.
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Split text into overlapping chunks for embedding
 */
function createTextChunks(text: string): TextChunk[] {
  const chunks: TextChunk[] = []
  const words = text.split(/\s+/)
  const wordsPerChunk = CHUNK_SIZE_TOKENS * 4 / 5 // ~5 chars per word avg
  const overlapWords = CHUNK_OVERLAP_TOKENS * 4 / 5

  let currentIndex = 0
  let chunkIndex = 0

  while (currentIndex < words.length) {
    const endIndex = Math.min(currentIndex + wordsPerChunk, words.length)
    const chunkWords = words.slice(currentIndex, endIndex)
    const chunkText = chunkWords.join(' ').trim()

    if (chunkText.length > 0) {
      chunks.push({
        chunk_index: chunkIndex,
        chunk_text: chunkText,
        chunk_tokens: estimateTokens(chunkText),
      })
      chunkIndex++
    }

    // Move forward with overlap
    currentIndex = endIndex - Math.floor(overlapWords)
    if (currentIndex <= chunks.length * (wordsPerChunk - overlapWords)) {
      currentIndex = endIndex // Prevent infinite loop
    }
  }

  log('INFO', 'Text chunked', { totalChunks: chunks.length, avgTokens: Math.round(chunks.reduce((sum, c) => sum + c.chunk_tokens, 0) / chunks.length) })

  return chunks
}

// =============================================================================
// EMBEDDING GENERATION
// =============================================================================

/**
 * Generate embeddings for text chunks using text-embedding-004
 */
async function generateEmbeddings(
  genAI: GoogleGenerativeAI,
  chunks: TextChunk[]
): Promise<number[][]> {
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL })
  const embeddings: number[][] = []

  // Process chunks in batches to avoid rate limits
  const batchSize = 5
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize)

    const batchEmbeddings = await Promise.all(
      batch.map(async (chunk) => {
        const result = await withRetry(async () => {
          return await model.embedContent({
            content: { parts: [{ text: chunk.chunk_text }] },
          })
        }, `generateEmbedding_chunk_${chunk.chunk_index}`)

        return result.embedding.values
      })
    )

    embeddings.push(...batchEmbeddings)

    // Small delay between batches to avoid rate limits
    if (i + batchSize < chunks.length) {
      await sleep(200)
    }
  }

  log('INFO', 'Embeddings generated', { count: embeddings.length, dimensions: embeddings[0]?.length || 0 })

  return embeddings
}

// =============================================================================
// ENTITY LINKING
// =============================================================================

/**
 * Find potential entity links based on extracted fields
 */
async function findLinkSuggestions(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  extractedFields: Record<string, unknown>,
  extractedText: string
): Promise<LinkSuggestion[]> {
  const suggestions: LinkSuggestion[] = []

  // 1. Search by CNPJ if available
  const cnpj = extractedFields.cnpj as string | undefined
  if (cnpj) {
    const normalizedCnpj = cnpj.replace(/\D/g, '')
    const { data: orgByCnpj } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('cnpj', normalizedCnpj)
      .limit(1)
      .single()

    if (orgByCnpj) {
      suggestions.push({
        entity_type: 'organization',
        entity_id: orgByCnpj.id,
        entity_name: orgByCnpj.name,
        match_reason: 'cnpj',
        confidence: 0.95,
      })
    }
  }

  // 2. Search by PRONAC if available
  const pronac = extractedFields.pronac as string | undefined
  if (pronac) {
    const { data: projectByPronac } = await supabase
      .from('grant_projects')
      .select('id, project_name')
      .eq('approval_number', pronac)
      .eq('user_id', userId)
      .limit(1)
      .single()

    if (projectByPronac) {
      suggestions.push({
        entity_type: 'project',
        entity_id: projectByPronac.id,
        entity_name: projectByPronac.project_name,
        match_reason: 'pronac',
        confidence: 0.95,
      })
    }
  }

  // 3. Fuzzy match by organization name
  const orgName = extractedFields.razao_social as string ||
                  extractedFields.proponente as string ||
                  extractedFields.nome_organizacao as string

  if (orgName) {
    // Use trigram similarity search if available, otherwise simple ILIKE
    const { data: orgByName } = await supabase
      .from('organizations')
      .select('id, name')
      .ilike('name', `%${orgName.substring(0, 50)}%`)
      .eq('user_id', userId)
      .limit(3)

    if (orgByName && orgByName.length > 0) {
      for (const org of orgByName) {
        // Check if not already suggested
        if (!suggestions.some(s => s.entity_id === org.id)) {
          suggestions.push({
            entity_type: 'organization',
            entity_id: org.id,
            entity_name: org.name,
            match_reason: 'name_similarity',
            confidence: 0.7,
          })
        }
      }
    }
  }

  // 4. Search for project by name similarity
  const projectName = extractedFields.nome_projeto as string
  if (projectName) {
    const { data: projectByName } = await supabase
      .from('grant_projects')
      .select('id, project_name')
      .ilike('project_name', `%${projectName.substring(0, 50)}%`)
      .eq('user_id', userId)
      .limit(3)

    if (projectByName && projectByName.length > 0) {
      for (const project of projectByName) {
        if (!suggestions.some(s => s.entity_id === project.id)) {
          suggestions.push({
            entity_type: 'project',
            entity_id: project.id,
            entity_name: project.project_name,
            match_reason: 'name_similarity',
            confidence: 0.6,
          })
        }
      }
    }
  }

  log('INFO', 'Link suggestions found', { count: suggestions.length })

  return suggestions
}

// =============================================================================
// DATABASE OPERATIONS
// =============================================================================

/**
 * Create document record in database
 */
async function createDocumentRecord(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  request: ProcessDocumentRequest,
  fileSize: number
): Promise<string> {
  // Extract original filename from storage path
  const originalName = request.storage_path.split('/').pop() || 'document'

  // Map file_type to MIME type
  const mimeTypeMap: Record<string, string> = {
    pdf: 'application/pdf',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    image: 'image/png', // Will be updated with actual type
  }

  const { data, error } = await supabase
    .from('processed_documents')
    .insert({
      user_id: userId,
      organization_id: request.organization_id || null,
      project_id: request.project_id || null,
      storage_path: request.storage_path,
      original_name: originalName,
      mime_type: mimeTypeMap[request.file_type] || 'application/octet-stream',
      size_bytes: fileSize,
      source: request.source || 'web',
      source_phone: request.source_phone || null,
      processing_status: 'processing',
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to create document record: ${error.message}`)
  }

  log('INFO', 'Document record created', { documentId: data.id })

  return data.id
}

/**
 * Update document with extracted content
 */
async function updateDocumentContent(
  supabase: ReturnType<typeof createClient>,
  documentId: string,
  extractedText: string,
  pageCount: number | undefined,
  hasImages: boolean,
  classification: ClassificationResult,
  processingTimeMs: number
): Promise<void> {
  const wordCount = extractedText.split(/\s+/).filter(w => w.length > 0).length

  const { error } = await supabase
    .from('processed_documents')
    .update({
      raw_text: extractedText,
      detected_type: classification.detected_type,
      confidence: classification.confidence,
      extracted_fields: classification.extracted_fields,
      page_count: pageCount,
      word_count: wordCount,
      has_images: hasImages,
      processing_time_ms: processingTimeMs,
      processing_status: 'completed',
      processed_at: new Date().toISOString(),
    })
    .eq('id', documentId)

  if (error) {
    throw new Error(`Failed to update document content: ${error.message}`)
  }

  log('INFO', 'Document content updated', { documentId, wordCount })
}

/**
 * Save chunks to database
 */
async function saveChunks(
  supabase: ReturnType<typeof createClient>,
  documentId: string,
  chunks: TextChunk[]
): Promise<string[]> {
  const chunkRecords = chunks.map(chunk => ({
    document_id: documentId,
    chunk_index: chunk.chunk_index,
    chunk_text: chunk.chunk_text,
    chunk_tokens: chunk.chunk_tokens,
    start_page: chunk.start_page || null,
    end_page: chunk.end_page || null,
  }))

  const { data, error } = await supabase
    .from('document_chunks')
    .insert(chunkRecords)
    .select('id')

  if (error) {
    throw new Error(`Failed to save chunks: ${error.message}`)
  }

  log('INFO', 'Chunks saved', { count: data.length })

  return data.map(d => d.id)
}

/**
 * Save embeddings to database
 */
async function saveEmbeddings(
  supabase: ReturnType<typeof createClient>,
  chunkIds: string[],
  embeddings: number[][]
): Promise<number> {
  const embeddingRecords = chunkIds.map((chunkId, index) => ({
    chunk_id: chunkId,
    embedding: `[${embeddings[index].join(',')}]`,
    model_version: EMBEDDING_MODEL,
  }))

  const { error } = await supabase
    .from('document_embeddings')
    .insert(embeddingRecords)

  if (error) {
    throw new Error(`Failed to save embeddings: ${error.message}`)
  }

  log('INFO', 'Embeddings saved', { count: embeddingRecords.length })

  return embeddingRecords.length
}

/**
 * Save link suggestions to database
 */
async function saveLinkSuggestions(
  supabase: ReturnType<typeof createClient>,
  documentId: string,
  suggestions: LinkSuggestion[]
): Promise<void> {
  if (suggestions.length === 0) return

  const suggestionRecords = suggestions.map(suggestion => ({
    document_id: documentId,
    entity_type: suggestion.entity_type,
    entity_id: suggestion.entity_id,
    match_reason: suggestion.match_reason,
    confidence: suggestion.confidence,
    is_confirmed: false,
  }))

  const { error } = await supabase
    .from('document_link_suggestions')
    .insert(suggestionRecords)

  if (error) {
    // Ignore duplicate errors
    if (!error.message.includes('duplicate')) {
      throw new Error(`Failed to save link suggestions: ${error.message}`)
    }
  }

  log('INFO', 'Link suggestions saved', { count: suggestionRecords.length })
}

/**
 * Mark document as failed
 */
async function markDocumentFailed(
  supabase: ReturnType<typeof createClient>,
  documentId: string,
  errorMessage: string
): Promise<void> {
  await supabase
    .from('processed_documents')
    .update({
      processing_status: 'failed',
      error_message: errorMessage,
    })
    .eq('id', documentId)
}

// =============================================================================
// MAIN PROCESSING PIPELINE
// =============================================================================

// TODO: Consider breaking down into smaller functions for better testability:
// - extractAndClassify() - content extraction and classification
// - generateChunksAndEmbeddings() - chunking and embedding generation
// - findAndSaveLinks() - entity linking suggestions

async function processDocument(
  supabase: ReturnType<typeof createClient>,
  genAI: GoogleGenerativeAI,
  userId: string,
  request: ProcessDocumentRequest
): Promise<ProcessDocumentResponse> {
  const startTime = Date.now()
  let documentId: string | null = null

  try {
    // 1. Fetch file from storage
    log('INFO', 'Starting document processing', { path: request.storage_path })
    const { base64, mimeType, size } = await fetchFileAsBase64(supabase, request.storage_path)

    // 2. Create document record
    documentId = await createDocumentRecord(supabase, userId, request, size)

    // 3. Extract text content using Gemini Vision
    log('INFO', 'Extracting text content')
    const { text: extractedText, pageCount, hasImages } = await extractTextWithGemini(
      genAI,
      base64,
      mimeType,
      request.file_type
    )

    if (!extractedText || extractedText.length < 10) {
      throw new Error('Failed to extract meaningful text from document')
    }

    // 4. Classify document and extract structured fields
    log('INFO', 'Classifying document')
    const classification = await classifyDocument(genAI, extractedText)

    // 5. Create text chunks
    log('INFO', 'Creating text chunks')
    const chunks = createTextChunks(extractedText)

    // 6. Generate embeddings
    log('INFO', 'Generating embeddings')
    const embeddings = await generateEmbeddings(genAI, chunks)

    // 7. Save chunks to database
    const chunkIds = await saveChunks(supabase, documentId, chunks)

    // 8. Save embeddings to database
    const embeddingsCreated = await saveEmbeddings(supabase, chunkIds, embeddings)

    // 9. Find link suggestions
    log('INFO', 'Finding link suggestions')
    const linkSuggestions = await findLinkSuggestions(
      supabase,
      userId,
      classification.extracted_fields,
      extractedText
    )

    // 10. Save link suggestions
    await saveLinkSuggestions(supabase, documentId, linkSuggestions)

    // 11. Update document with results
    const processingTimeMs = Date.now() - startTime
    await updateDocumentContent(
      supabase,
      documentId,
      extractedText,
      pageCount,
      hasImages,
      classification,
      processingTimeMs
    )

    log('INFO', 'Document processing completed', {
      documentId,
      type: classification.detected_type,
      chunks: chunks.length,
      embeddings: embeddingsCreated,
      suggestions: linkSuggestions.length,
      timeMs: processingTimeMs,
    })

    return {
      document_id: documentId,
      detected_type: classification.detected_type,
      confidence: classification.confidence,
      extracted_fields: classification.extracted_fields,
      chunks_created: chunks.length,
      embeddings_created: embeddingsCreated,
      link_suggestions: linkSuggestions,
      processing_time_ms: processingTimeMs,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    log('ERROR', 'Document processing failed', { documentId, error: errorMessage })

    // Mark document as failed if we have an ID
    if (documentId) {
      await markDocumentFailed(supabase, documentId, errorMessage)
    }

    throw error
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

Deno.serve(async (req) => {
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

    // Initialize Supabase client with service role
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
    const request: ProcessDocumentRequest = await req.json()

    // Validate required fields
    if (!request.storage_path) {
      return new Response(
        JSON.stringify({ success: false, error: 'storage_path is required' }),
        { status: 400, headers: corsHeaders }
      )
    }

    if (!request.file_type || !['pdf', 'pptx', 'docx', 'image'].includes(request.file_type)) {
      return new Response(
        JSON.stringify({ success: false, error: 'file_type must be one of: pdf, pptx, docx, image' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate source
    if (request.source && !['web', 'whatsapp', 'email'].includes(request.source)) {
      return new Response(
        JSON.stringify({ success: false, error: 'source must be one of: web, whatsapp, email' }),
        { status: 400, headers: corsHeaders }
      )
    }

    log('INFO', 'Processing request', {
      userId: user.id,
      path: request.storage_path,
      type: request.file_type,
      source: request.source || 'web',
    })

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

    // Process document
    const result = await processDocument(supabase, genAI, user.id, request)

    return new Response(
      JSON.stringify({ success: true, ...result }),
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
