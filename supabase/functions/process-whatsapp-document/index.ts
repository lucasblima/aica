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
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

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
}

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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
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

/**
 * Transcribe audio using Gemini (placeholder for now)
 */
async function transcribeAudio(geminiFileName: string): Promise<string> {
  log('WARN', 'Audio transcription not yet implemented', { geminiFileName })
  // TODO: Implement with Gemini audio API or Whisper
  return '[Audio transcription coming soon]'
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
  contactName?: string
): Promise<string> {
  log('INFO', 'Saving document reference to database')

  // Get Journey corpus (shared between Journey moments and WhatsApp documents)
  const corpusId = await ensureJourneyCorpus(supabase, userId)

  const { data, error } = await supabase
    .from('file_search_documents')
    .insert({
      user_id: userId,
      corpus_id: corpusId, // ✅ NEW: Associate with Journey corpus
      gemini_file_name: geminiFileName,
      original_filename: originalFileName,
      mime_type: 'application/pdf', // Simplified for now
      file_size_bytes: fileSize,
      module_type: 'whatsapp',
      indexing_status: 'completed',
      custom_metadata: { // ✅ FIXED: Changed from 'metadata' to 'custom_metadata'
        source: 'whatsapp',
        contact_id: contactId,
        contact_name: contactName || 'Unknown',
        message_id: messageId,
        media_type: mediaType,
        extracted_text_preview: extractedText.substring(0, 500),
      },
    })
    .select('id')
    .single()

  if (error) {
    log('ERROR', 'Failed to save document reference', { error: error.message })
    throw new Error(`Failed to save document reference: ${error.message}`)
  }

  // ✅ NEW: Update corpus document count
  await supabase.rpc('increment_corpus_document_count', { corpus_id: corpusId })

  log('INFO', 'Document reference saved', { documentId: data.id, corpusId })

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
    switch (request.media_type) {
      case 'document':
        extractedText = await extractPDFText(geminiFileName)
        break
      case 'image':
        extractedText = await extractImageText(geminiFileName)
        break
      case 'audio':
        extractedText = await transcribeAudio(geminiFileName)
        break
      default:
        extractedText = `[${request.media_type} processing not implemented]`
    }

    // 5. Save to file_search_documents
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
      message.contact_network?.name
    )

    // 6. Update whatsapp_messages
    await supabase
      .from('whatsapp_messages')
      .update({
        document_processed: true,
        gemini_file_name: geminiFileName,
        file_search_document_id: documentId,
      })
      .eq('id', request.message_id)

    const processingTimeMs = Date.now() - startTime

    log('INFO', 'Document processed successfully', {
      documentId,
      geminiFileName,
      processingTimeMs,
      textLength: extractedText.length,
    })

    const response: ProcessResponse = {
      success: true,
      gemini_file_name: geminiFileName,
      document_id: documentId,
      extracted_text: extractedText.substring(0, 200), // Preview only
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
