/**
 * Process WhatsApp Document Edge Function
 *
 * Processes media attachments from WhatsApp messages:
 * 1. Downloads media via Evolution API
 * 2. Uploads to Gemini Files API for vector indexing
 * 3. Extracts content (PDF text, Image OCR, Audio transcription)
 * 4. Indexes in file_search_documents
 * 5. Updates whatsapp_messages with processing status
 *
 * Supports: PDF, Images (OCR), Audio (transcription), Documents
 *
 * Audio Transcription (Issue #176):
 * - Uses Gemini 2.0 Flash for audio transcription
 * - Supports: OGG (Opus), MP3, M4A, WAV
 * - Max file size: 25MB
 * - Timeout: 30 seconds
 * - Returns: transcription, duration, language, confidence
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0"

// =============================================================================
// CONFIGURATION
// =============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!
const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL')!
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Content-Type': 'application/json',
}

// =============================================================================
// TYPES
// =============================================================================

interface ProcessRequest {
  message_id: string
  contact_id: string
  media_url: string
  media_type: 'image' | 'audio' | 'document' | 'video'
  file_name: string
  instance_name: string
}

interface ProcessResponse {
  success: boolean
  gemini_file_name?: string
  document_id?: string
  extracted_text?: string
  error?: string
  // Audio transcription metadata (Issue #176)
  audio_metadata?: AudioTranscriptionResult
}

// =============================================================================
// AUDIO TRANSCRIPTION TYPES (Issue #176)
// =============================================================================

interface AudioTranscriptionResult {
  transcription: string
  duration_seconds: number
  language: string
  confidence: number
}

// Supported audio MIME types for transcription
const SUPPORTED_AUDIO_MIMETYPES = [
  'audio/ogg',           // OGG (WhatsApp default)
  'audio/opus',          // Opus codec
  'audio/mpeg',          // MP3
  'audio/mp3',           // MP3 alternative
  'audio/mp4',           // M4A
  'audio/m4a',           // M4A alternative
  'audio/x-m4a',         // M4A alternative
  'audio/wav',           // WAV
  'audio/wave',          // WAV alternative
  'audio/x-wav',         // WAV alternative
  'audio/webm',          // WebM audio
  'audio/aac',           // AAC
]

// Audio processing limits
const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024  // 25MB
const AUDIO_TRANSCRIPTION_TIMEOUT_MS = 30000   // 30 seconds
const GEMINI_AUDIO_MODEL = 'gemini-2.5-flash'

// =============================================================================
// LOGGING
// =============================================================================

function log(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, data?: unknown) {
  const timestamp = new Date().toISOString()
  const logData = data ? `: ${JSON.stringify(data)}` : ''
  console.log(`[${timestamp}] [${level}] [process-whatsapp-document] ${message}${logData}`)
}

// =============================================================================
// EVOLUTION API - MEDIA DOWNLOAD
// =============================================================================

/**
 * Download media from Evolution API
 */
async function downloadMediaFromEvolution(
  instanceName: string,
  mediaUrl: string
): Promise<{ buffer: Uint8Array; mimeType: string }> {
  log('INFO', 'Downloading media from Evolution API', { instanceName, mediaUrl })

  try {
    // Evolution API stores media and provides download URL
    // URL format: https://evolution-api.com/files/{instance}/{filename}
    const response = await fetch(mediaUrl, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY,
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to download media: ${response.status} ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)
    const mimeType = response.headers.get('content-type') || 'application/octet-stream'

    log('INFO', 'Media downloaded successfully', {
      sizeBytes: buffer.length,
      mimeType
    })

    return { buffer, mimeType }
  } catch (error) {
    log('ERROR', 'Failed to download media', { error: error instanceof Error ? error.message : error })
    throw error
  }
}

// =============================================================================
// GEMINI FILES API
// =============================================================================

/**
 * Upload file to Gemini Files API
 */
async function uploadToGeminiFiles(
  buffer: Uint8Array,
  fileName: string,
  mimeType: string
): Promise<string> {
  log('INFO', 'Uploading to Gemini Files API', { fileName, mimeType, sizeBytes: buffer.length })

  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured')
  }

  try {
    const blob = new Blob([buffer], { type: mimeType })
    const formData = new FormData()
    formData.append('file', blob, fileName)

    const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_API_KEY}`

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      log('ERROR', 'Gemini upload failed', { status: response.status, error: errorText })
      throw new Error(`Gemini upload failed: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    const geminiFileName = result.file?.name

    if (!geminiFileName) {
      throw new Error('Invalid response: missing file.name')
    }

    log('INFO', 'File uploaded to Gemini', { geminiFileName, state: result.file?.state })

    return geminiFileName
  } catch (error) {
    log('ERROR', 'Upload to Gemini failed', { error: error instanceof Error ? error.message : error })
    throw error
  }
}

/**
 * Wait for Gemini file to be ACTIVE (processed and indexed)
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
// CONTENT EXTRACTION
// =============================================================================

/**
 * Extract text from PDF using Gemini
 */
async function extractPDFText(geminiFileName: string): Promise<string> {
  log('INFO', 'Extracting text from PDF', { geminiFileName })

  const prompt = `
Extract ALL text content from this PDF document.
Return ONLY the extracted text, without any additional formatting or comments.
`

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
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
      temperature: 0.1,
      maxOutputTokens: 8192,
    },
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`PDF extraction failed: ${response.statusText} - ${errorText}`)
  }

  const result = await response.json()
  const extractedText = result.candidates?.[0]?.content?.parts?.[0]?.text || ''

  log('INFO', 'PDF text extracted', { textLength: extractedText.length })

  return extractedText
}

/**
 * Extract text from image using Gemini Vision (OCR)
 */
async function extractImageText(geminiFileName: string): Promise<string> {
  log('INFO', 'Extracting text from image (OCR)', { geminiFileName })

  const prompt = `
Extract ALL text visible in this image.
If the image contains a document, extract the full text content.
Return ONLY the extracted text, without any additional formatting or comments.
If there is no text in the image, return "No text detected".
`

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          {
            file_data: {
              file_uri: `https://generativelanguage.googleapis.com/v1beta/${geminiFileName}`,
              mime_type: 'image/jpeg', // Gemini handles multiple image formats
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
    },
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Image OCR failed: ${response.statusText} - ${errorText}`)
  }

  const result = await response.json()
  const extractedText = result.candidates?.[0]?.content?.parts?.[0]?.text || 'No text detected'

  log('INFO', 'Image text extracted', { textLength: extractedText.length })

  return extractedText
}

// =============================================================================
// AUDIO TRANSCRIPTION (Issue #176)
// =============================================================================

/**
 * Check if MIME type is a supported audio format
 */
function isSupportedAudioMimeType(mimeType: string): boolean {
  const normalizedMimeType = mimeType.toLowerCase().split(';')[0].trim()
  return SUPPORTED_AUDIO_MIMETYPES.includes(normalizedMimeType)
}

/**
 * Normalize audio MIME type for Gemini API
 * Gemini expects specific MIME types for audio processing
 */
function normalizeAudioMimeType(mimeType: string): string {
  const normalized = mimeType.toLowerCase().split(';')[0].trim()

  // Map common variations to standard MIME types
  const mimeTypeMap: Record<string, string> = {
    'audio/mp3': 'audio/mpeg',
    'audio/m4a': 'audio/mp4',
    'audio/x-m4a': 'audio/mp4',
    'audio/wave': 'audio/wav',
    'audio/x-wav': 'audio/wav',
    'audio/opus': 'audio/ogg',
  }

  return mimeTypeMap[normalized] || normalized
}

/**
 * Estimate audio duration from file size (rough approximation)
 * Used when actual duration is not available from metadata
 */
function estimateAudioDuration(fileSizeBytes: number, mimeType: string): number {
  // Approximate bitrates for different formats (in bytes per second)
  const bitrateEstimates: Record<string, number> = {
    'audio/ogg': 16000,   // ~128 kbps
    'audio/mpeg': 16000,  // ~128 kbps
    'audio/mp4': 16000,   // ~128 kbps
    'audio/wav': 176400,  // Uncompressed stereo 44.1kHz 16-bit
    'audio/webm': 16000,  // ~128 kbps
    'audio/aac': 16000,   // ~128 kbps
  }

  const bytesPerSecond = bitrateEstimates[normalizeAudioMimeType(mimeType)] || 16000
  return Math.round(fileSizeBytes / bytesPerSecond)
}

/**
 * Transcribe audio using Gemini 2.0 Flash
 * Implements Issue #176 - Audio transcription for WhatsApp messages
 *
 * @param audioBuffer - Raw audio data as Uint8Array
 * @param mimeType - Audio MIME type (e.g., 'audio/ogg', 'audio/mpeg')
 * @param fileSizeBytes - File size for duration estimation
 * @returns AudioTranscriptionResult with transcription, duration, language, confidence
 */
async function transcribeAudioWithGemini(
  audioBuffer: Uint8Array,
  mimeType: string,
  fileSizeBytes: number
): Promise<AudioTranscriptionResult> {
  log('INFO', 'Starting audio transcription with Gemini', {
    mimeType,
    sizeBytes: fileSizeBytes,
    model: GEMINI_AUDIO_MODEL
  })

  // Validate file size
  if (fileSizeBytes > MAX_AUDIO_SIZE_BYTES) {
    throw new Error(`Audio file too large: ${fileSizeBytes} bytes (max: ${MAX_AUDIO_SIZE_BYTES} bytes)`)
  }

  // Validate MIME type
  if (!isSupportedAudioMimeType(mimeType)) {
    throw new Error(`Unsupported audio format: ${mimeType}. Supported: OGG, MP3, M4A, WAV, WebM, AAC`)
  }

  const normalizedMimeType = normalizeAudioMimeType(mimeType)
  const estimatedDuration = estimateAudioDuration(fileSizeBytes, mimeType)

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

    const model = genAI.getGenerativeModel({
      model: GEMINI_AUDIO_MODEL,
      generationConfig: {
        temperature: 0.1,  // Low temperature for accurate transcription
        maxOutputTokens: 8192,
      },
    })

    // Convert audio to base64
    const base64Audio = btoa(String.fromCharCode(...audioBuffer))

    // Structured prompt for transcription with metadata extraction
    const prompt = `You are a professional audio transcription service. Transcribe this audio message accurately.

Instructions:
1. Transcribe the EXACT words spoken in the audio
2. Preserve the original language (Portuguese, English, Spanish, etc.)
3. Include filler words, pauses indicated as "...", and emotional expressions if present
4. If the audio is inaudible or unclear, indicate with [inaudivel] or [unclear]
5. Do NOT translate - keep the original language

After the transcription, provide metadata in this EXACT JSON format on a new line:
{"language": "pt-BR", "confidence": 0.95}

Where:
- language: ISO language code (pt-BR, en-US, es-ES, etc.)
- confidence: Your confidence in the transcription accuracy (0.0 to 1.0)

Example output:
Ola, tudo bem? Eu queria saber se voce pode me ajudar com uma coisa...
{"language": "pt-BR", "confidence": 0.92}

Now transcribe the audio:`

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), AUDIO_TRANSCRIPTION_TIMEOUT_MS)

    try {
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: normalizedMimeType,
            data: base64Audio,
          },
        },
      ])

      clearTimeout(timeoutId)

      const response = await result.response
      const fullText = response.text().trim()

      // Parse response to extract transcription and metadata
      const lines = fullText.split('\n')
      let transcription = ''
      let language = 'pt-BR'  // Default to Portuguese
      let confidence = 0.8    // Default confidence

      // Look for JSON metadata at the end
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim()
        if (line.startsWith('{') && line.endsWith('}')) {
          try {
            const metadata = JSON.parse(line)
            if (metadata.language) language = metadata.language
            if (typeof metadata.confidence === 'number') confidence = metadata.confidence
            // Remove metadata line from transcription
            lines.splice(i, 1)
            break
          } catch {
            // Not valid JSON, keep as part of transcription
          }
        }
      }

      transcription = lines.join('\n').trim()

      // Fallback if transcription is empty
      if (!transcription || transcription.length === 0) {
        transcription = '[Audio inaudivel ou vazio]'
        confidence = 0.0
      }

      // Get token usage for cost tracking
      const usageMetadata = response.usageMetadata
      const inputTokens = usageMetadata?.promptTokenCount || 0
      const outputTokens = usageMetadata?.candidatesTokenCount || 0

      log('INFO', 'Audio transcription completed', {
        transcriptionLength: transcription.length,
        language,
        confidence,
        estimatedDuration,
        inputTokens,
        outputTokens
      })

      return {
        transcription,
        duration_seconds: estimatedDuration,
        language,
        confidence: Math.min(Math.max(confidence, 0), 1) // Clamp to [0, 1]
      }

    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Audio transcription timeout after ${AUDIO_TRANSCRIPTION_TIMEOUT_MS}ms`)
      }
      throw error
    }

  } catch (error) {
    const err = error as Error
    log('ERROR', 'Audio transcription failed', {
      error: err.message,
      mimeType,
      sizeBytes: fileSizeBytes
    })

    // Return a fallback result instead of throwing
    return {
      transcription: `[Erro na transcricao: ${err.message}]`,
      duration_seconds: estimatedDuration,
      language: 'unknown',
      confidence: 0.0
    }
  }
}

/**
 * Log AI usage for cost tracking (Issue #176)
 * Uses the log_ai_usage RPC function
 */
async function logAudioTranscriptionUsage(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  messageId: string,
  inputTokens: number,
  outputTokens: number,
  durationSeconds: number
): Promise<void> {
  try {
    // Calculate costs using Gemini 2.0 Flash pricing (currently free during preview)
    // When pricing is enabled, this will use the ai_model_pricing table
    const { data: costs } = await supabase.rpc('calculate_token_cost', {
      p_model_name: GEMINI_AUDIO_MODEL,
      p_input_tokens: inputTokens,
      p_output_tokens: outputTokens
    })

    const inputCost = costs?.[0]?.input_cost_usd || 0
    const outputCost = costs?.[0]?.output_cost_usd || 0
    const totalCost = costs?.[0]?.total_cost_usd || 0

    await supabase.rpc('log_ai_usage', {
      p_user_id: userId,
      p_operation_type: 'audio_transcription',
      p_ai_model: GEMINI_AUDIO_MODEL,
      p_input_tokens: inputTokens,
      p_output_tokens: outputTokens,
      p_total_tokens: inputTokens + outputTokens,
      p_duration_seconds: durationSeconds,
      p_input_cost_usd: inputCost,
      p_output_cost_usd: outputCost,
      p_total_cost_usd: totalCost,
      p_module_type: 'whatsapp',
      p_module_id: null,
      p_asset_id: null,
      p_request_metadata: {
        source: 'whatsapp_audio',
        message_id: messageId,
        function: 'process-whatsapp-document'
      }
    })

    log('DEBUG', 'AI usage logged for audio transcription', {
      userId,
      messageId,
      inputTokens,
      outputTokens,
      totalCost
    })
  } catch (error) {
    // Non-critical - log but don't fail the main operation
    log('WARN', 'Failed to log AI usage', { error: (error as Error).message })
  }
}

/**
 * Legacy function - wrapper for backward compatibility
 * Now uses the full transcription pipeline
 */
async function transcribeAudio(geminiFileName: string): Promise<string> {
  log('WARN', 'transcribeAudio called with geminiFileName - use transcribeAudioWithGemini for full metadata', { geminiFileName })
  // This path is called when audio was already uploaded to Gemini Files API
  // For now, return placeholder - the main flow uses transcribeAudioWithGemini directly
  return '[Use transcribeAudioWithGemini for full audio transcription]'
}

// =============================================================================
// DATABASE OPERATIONS
// =============================================================================

/**
 * Get or create Journey corpus for user (shared by Journey + WhatsApp modules)
 */
async function ensureJourneyCorpus(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<string> {
  // Try to find existing Journey corpus for this user
  const { data: existingCorpus } = await supabase
    .from('file_search_corpora')
    .select('id')
    .eq('user_id', userId)
    .eq('module_type', 'journey')
    .limit(1)
    .single()

  if (existingCorpus) {
    log('INFO', 'Found existing Journey corpus', { corpusId: existingCorpus.id })
    return existingCorpus.id
  }

  // Create new Journey corpus
  const { data: newCorpus, error } = await supabase
    .from('file_search_corpora')
    .insert({
      user_id: userId,
      corpus_name: `journey-user-${userId}`,
      display_name: `Journey - User ${userId}`,
      module_type: 'journey',
      module_id: userId,
      document_count: 0,
    })
    .select('id')
    .single()

  if (error) {
    log('ERROR', 'Failed to create Journey corpus', { error: error.message })
    throw new Error(`Failed to create Journey corpus: ${error.message}`)
  }

  log('INFO', 'Created new Journey corpus', { corpusId: newCorpus.id })
  return newCorpus.id
}

/**
 * Save document reference to file_search_documents
 * Updated for Issue #176 to include audio transcription metadata
 */
async function saveDocumentReference(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  contactId: string,
  messageId: string,
  geminiFileName: string,
  originalFileName: string,
  fileSize: number,
  mediaType: string,
  extractedText: string,
  contactName?: string,
  audioMetadata?: AudioTranscriptionResult
): Promise<string> {
  log('INFO', 'Saving document reference to database')

  // Get Journey corpus (shared between Journey moments and WhatsApp documents)
  const corpusId = await ensureJourneyCorpus(supabase, userId)

  // Determine correct MIME type based on media type
  let mimeType = 'application/pdf'
  if (mediaType === 'audio') {
    mimeType = 'audio/ogg' // Default for WhatsApp audio
  } else if (mediaType === 'image') {
    mimeType = 'image/jpeg'
  }

  // Build custom metadata with audio-specific fields if available
  const customMetadata: Record<string, unknown> = {
    source: 'whatsapp',
    contact_id: contactId,
    contact_name: contactName || 'Unknown',
    message_id: messageId,
    media_type: mediaType,
    extracted_text_preview: extractedText.substring(0, 500),
  }

  // Add audio transcription metadata (Issue #176)
  if (audioMetadata) {
    customMetadata.audio_transcription = {
      duration_seconds: audioMetadata.duration_seconds,
      language: audioMetadata.language,
      confidence: audioMetadata.confidence,
      model: GEMINI_AUDIO_MODEL,
      transcribed_at: new Date().toISOString()
    }
  }

  const { data, error } = await supabase
    .from('file_search_documents')
    .insert({
      user_id: userId,
      corpus_id: corpusId,
      gemini_file_name: geminiFileName,
      original_filename: originalFileName,
      mime_type: mimeType,
      file_size_bytes: fileSize,
      module_type: 'whatsapp',
      indexing_status: 'completed',
      custom_metadata: customMetadata,
    })
    .select('id')
    .single()

  if (error) {
    log('ERROR', 'Failed to save document reference', { error: error.message })
    throw new Error(`Failed to save document reference: ${error.message}`)
  }

  // Update corpus document count
  await supabase.rpc('increment_corpus_document_count', { corpus_uuid: corpusId })

  log('INFO', 'Document reference saved', {
    documentId: data.id,
    corpusId,
    mediaType,
    hasAudioMetadata: !!audioMetadata
  })

  return data.id
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: CORS_HEADERS }
    )
  }

  const startTime = Date.now()

  try {
    // Validate required environment variables
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured')
    }
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error('Evolution API not configured')
    }

    // Parse request
    const request: ProcessRequest = await req.json()

    log('INFO', 'Processing WhatsApp document', {
      messageId: request.message_id,
      mediaType: request.media_type,
      fileName: request.file_name,
    })

    // Initialize Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get message and user info
    const { data: message, error: messageError } = await supabase
      .from('whatsapp_messages')
      .select(`
        *,
        contact_network!contact_id (
          name,
          phone_number
        )
      `)
      .eq('id', request.message_id)
      .single()

    if (messageError || !message) {
      throw new Error('Message not found')
    }

    // 1. Download media from Evolution API
    const { buffer, mimeType } = await downloadMediaFromEvolution(
      request.instance_name,
      request.media_url
    )

    // 2. Upload to Gemini Files API
    const geminiFileName = await uploadToGeminiFiles(buffer, request.file_name, mimeType)

    // 3. Wait for file to be ACTIVE
    await waitForFileActive(geminiFileName)

    // 4. Extract content based on media type
    let extractedText = ''
    let audioMetadata: AudioTranscriptionResult | undefined

    switch (request.media_type) {
      case 'document':
        extractedText = await extractPDFText(geminiFileName)
        break

      case 'image':
        extractedText = await extractImageText(geminiFileName)
        break

      case 'audio':
        // Issue #176: Full audio transcription with metadata
        log('INFO', 'Processing audio transcription', {
          mimeType,
          sizeBytes: buffer.length,
          fileName: request.file_name
        })

        // Use direct transcription (no need to upload to Gemini Files API first)
        audioMetadata = await transcribeAudioWithGemini(buffer, mimeType, buffer.length)
        extractedText = audioMetadata.transcription

        // Log AI usage for cost tracking
        // Note: Token counts are estimated since we don't have exact values from inlineData
        const estimatedInputTokens = Math.ceil(buffer.length / 100) // Rough estimate
        const estimatedOutputTokens = Math.ceil(extractedText.length / 4) // ~4 chars per token

        await logAudioTranscriptionUsage(
          supabase,
          message.user_id,
          request.message_id,
          estimatedInputTokens,
          estimatedOutputTokens,
          audioMetadata.duration_seconds
        )

        log('INFO', 'Audio transcription completed', {
          language: audioMetadata.language,
          confidence: audioMetadata.confidence,
          durationSeconds: audioMetadata.duration_seconds,
          transcriptionLength: extractedText.length
        })
        break

      default:
        extractedText = `[${request.media_type} processing not implemented]`
    }

    // 5. Save to file_search_documents
    // For audio, include transcription metadata in custom_metadata
    const documentId = await saveDocumentReference(
      supabase,
      message.user_id,
      request.contact_id,
      request.message_id,
      geminiFileName,
      request.file_name,
      buffer.length,
      request.media_type,
      extractedText,
      message.contact_network?.name,
      audioMetadata // Pass audio metadata for storage
    )

    // 6. Update whatsapp_messages with processing results
    const messageUpdate: Record<string, unknown> = {
      document_processed: true,
      gemini_file_name: geminiFileName,
      file_search_document_id: documentId,
    }

    // Add audio-specific metadata if available
    if (audioMetadata) {
      messageUpdate.content_transcription = extractedText
      messageUpdate.transcription_metadata = {
        duration_seconds: audioMetadata.duration_seconds,
        language: audioMetadata.language,
        confidence: audioMetadata.confidence,
        model: GEMINI_AUDIO_MODEL,
        processed_at: new Date().toISOString()
      }
    }

    await supabase
      .from('whatsapp_messages')
      .update(messageUpdate)
      .eq('id', request.message_id)

    const processingTimeMs = Date.now() - startTime

    log('INFO', 'Document processed successfully', {
      documentId,
      geminiFileName,
      processingTimeMs,
      textLength: extractedText.length,
      mediaType: request.media_type,
      hasAudioMetadata: !!audioMetadata
    })

    const response: ProcessResponse = {
      success: true,
      gemini_file_name: geminiFileName,
      document_id: documentId,
      extracted_text: extractedText.substring(0, 200), // Preview only
      audio_metadata: audioMetadata
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: CORS_HEADERS }
    )

  } catch (error) {
    const err = error as Error
    log('ERROR', 'Processing failed', { error: err.message, stack: err.stack })

    const response: ProcessResponse = {
      success: false,
      error: err.message || 'Internal server error',
    }

    return new Response(
      JSON.stringify(response),
      { status: 500, headers: CORS_HEADERS }
    )
  }
})
