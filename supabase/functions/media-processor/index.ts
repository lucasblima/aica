/**
 * Media Processor Edge Function
 * Issue #12: WhatsApp Integration via Evolution API
 *
 * Processes WhatsApp media files:
 * - Downloads media from Evolution API
 * - Uploads to Supabase Storage
 * - Transcribes audio using Gemini
 * - Performs OCR on images using Gemini Vision
 * - Updates message records with processed data
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0"

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!
const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL')
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY')

// Processing limits
const MAX_AUDIO_DURATION_SECONDS = 600 // 10 minutes
const MAX_FILE_SIZE_BYTES = 52428800 // 50MB
const TRANSCRIPTION_TIMEOUT_MS = 120000 // 2 minutes

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

// ============================================================================
// TYPES
// ============================================================================

interface ProcessingRequest {
  message_id: string
  message_type: string
  user_id: string
  queued_at?: string
}

interface MessageRecord {
  id: string
  user_id: string
  message_type: string
  media_url: string | null
  media_mimetype: string | null
  media_filename: string | null
  media_size_bytes: number | null
  media_duration_seconds: number | null
  processing_status: string
}

interface ProcessingResult {
  success: boolean
  transcription?: string
  ocr_text?: string
  storage_url?: string
  error?: string
}

// ============================================================================
// HELPERS
// ============================================================================

function log(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, data?: unknown) {
  const timestamp = new Date().toISOString()
  const logData = data ? `: ${JSON.stringify(data)}` : ''
  console.log(`[${timestamp}] [${level}] [media-processor] ${message}${logData}`)
}

/**
 * Download media from Evolution API
 */
async function downloadMedia(mediaUrl: string): Promise<{ data: Uint8Array; contentType: string } | null> {
  try {
    // Evolution API media URLs are usually temporary signed URLs
    const response = await fetch(mediaUrl, {
      headers: EVOLUTION_API_KEY ? { 'apikey': EVOLUTION_API_KEY } : {},
    })

    if (!response.ok) {
      log('ERROR', 'Failed to download media', { status: response.status, url: mediaUrl.substring(0, 50) })
      return null
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    const arrayBuffer = await response.arrayBuffer()

    return {
      data: new Uint8Array(arrayBuffer),
      contentType,
    }
  } catch (error) {
    log('ERROR', 'Media download error', (error as Error).message)
    return null
  }
}

/**
 * Upload media to Supabase Storage
 */
async function uploadToStorage(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  filename: string,
  data: Uint8Array,
  contentType: string,
  mediaType: string
): Promise<string | null> {
  try {
    // Generate storage path: {user_id}/{media_type}/{date}/{unique_filename}
    const date = new Date()
    const datePath = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
    const uniqueId = crypto.randomUUID().substring(0, 8)
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${userId}/${mediaType}/${datePath}/${uniqueId}_${safeFilename}`

    const { error } = await supabase.storage
      .from('whatsapp-media')
      .upload(storagePath, data, {
        contentType,
        upsert: false,
      })

    if (error) {
      log('ERROR', 'Storage upload error', error)
      return null
    }

    // Get public URL (or signed URL if bucket is private)
    const { data: urlData } = await supabase.storage
      .from('whatsapp-media')
      .createSignedUrl(storagePath, 3600 * 24 * 7) // 7 day signed URL

    log('INFO', 'Media uploaded to storage', { path: storagePath })
    return urlData?.signedUrl || null
  } catch (error) {
    log('ERROR', 'Storage upload exception', (error as Error).message)
    return null
  }
}

/**
 * Transcribe audio using Gemini
 */
async function transcribeAudio(
  audioData: Uint8Array,
  mimeType: string
): Promise<string | null> {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

    // Use Gemini 2.0 Flash for audio transcription
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
      },
    })

    // Convert audio to base64
    const base64Audio = btoa(String.fromCharCode(...audioData))

    const prompt = `Transcribe this audio message in its original language.
If the audio is in Portuguese, transcribe in Portuguese.
If the audio is in English, transcribe in English.
Return ONLY the transcription text, nothing else.
If you cannot hear or understand the audio, return "[Audio inaudivel]".`

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Audio,
        },
      },
    ])

    const response = await result.response
    const transcription = response.text().trim()

    log('INFO', 'Audio transcribed', { length: transcription.length })
    return transcription || null
  } catch (error) {
    log('ERROR', 'Audio transcription error', (error as Error).message)
    return null
  }
}

/**
 * Extract text from image using Gemini Vision OCR
 */
async function extractImageText(
  imageData: Uint8Array,
  mimeType: string
): Promise<string | null> {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
      },
    })

    // Convert image to base64
    const base64Image = btoa(String.fromCharCode(...imageData))

    const prompt = `Extract any visible text from this image using OCR.
Include:
- Main text content
- Text in signs, labels, or documents
- Handwritten text if legible

If the image contains no readable text, describe what you see briefly.
Return the extracted text only, preserving the original language and formatting where possible.`

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Image,
        },
      },
    ])

    const response = await result.response
    const ocrText = response.text().trim()

    log('INFO', 'Image OCR completed', { length: ocrText.length })
    return ocrText || null
  } catch (error) {
    log('ERROR', 'Image OCR error', (error as Error).message)
    return null
  }
}

/**
 * Analyze image sentiment/content for context
 */
async function analyzeImage(
  imageData: Uint8Array,
  mimeType: string
): Promise<{ description: string; sentiment: string } | null> {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 512,
      },
    })

    const base64Image = btoa(String.fromCharCode(...imageData))

    const prompt = `Analyze this WhatsApp image briefly.
Return a JSON object with:
{
  "description": "Brief description in Portuguese (max 100 chars)",
  "sentiment": "positive|neutral|negative",
  "context": "personal|work|family|social|other"
}
Return ONLY valid JSON.`

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Image,
        },
      },
    ])

    const response = await result.response
    const text = response.text().replace(/```json\n?|\n?```/g, '').trim()

    return JSON.parse(text)
  } catch (error) {
    log('WARN', 'Image analysis error', (error as Error).message)
    return null
  }
}

/**
 * Process a single message
 */
async function processMessage(
  supabase: ReturnType<typeof createClient>,
  message: MessageRecord
): Promise<ProcessingResult> {
  const { id, user_id, message_type, media_url, media_mimetype, media_filename, media_duration_seconds } = message

  // Validate we have a media URL
  if (!media_url) {
    return { success: false, error: 'No media URL' }
  }

  // Check size/duration limits
  if (message_type === 'audio' && media_duration_seconds && media_duration_seconds > MAX_AUDIO_DURATION_SECONDS) {
    return { success: false, error: `Audio too long: ${media_duration_seconds}s > ${MAX_AUDIO_DURATION_SECONDS}s` }
  }

  // Download media
  const mediaResult = await downloadMedia(media_url)
  if (!mediaResult) {
    return { success: false, error: 'Failed to download media' }
  }

  // Check file size
  if (mediaResult.data.length > MAX_FILE_SIZE_BYTES) {
    return { success: false, error: `File too large: ${mediaResult.data.length} bytes` }
  }

  // Upload to Supabase Storage
  const filename = media_filename || `${message_type}_${Date.now()}`
  const storageUrl = await uploadToStorage(
    supabase,
    user_id,
    filename,
    mediaResult.data,
    media_mimetype || mediaResult.contentType,
    message_type
  )

  const result: ProcessingResult = {
    success: true,
    storage_url: storageUrl || undefined,
  }

  // Process based on media type
  switch (message_type) {
    case 'audio':
      const transcription = await transcribeAudio(
        mediaResult.data,
        media_mimetype || 'audio/ogg'
      )
      result.transcription = transcription || undefined
      break

    case 'image':
      const ocrText = await extractImageText(
        mediaResult.data,
        media_mimetype || 'image/jpeg'
      )
      result.ocr_text = ocrText || undefined
      break

    case 'video':
      // For video, we could extract audio and transcribe
      // For now, just store the file
      log('INFO', 'Video stored without transcription', { id })
      break

    case 'document':
      // For documents, could extract text from PDFs
      log('INFO', 'Document stored', { id })
      break

    default:
      log('DEBUG', 'Media type not processed', { type: message_type })
  }

  return result
}

/**
 * Update message record with processing results
 */
async function updateMessageRecord(
  supabase: ReturnType<typeof createClient>,
  messageId: string,
  result: ProcessingResult
): Promise<void> {
  const updates: Record<string, unknown> = {
    processing_status: result.success ? 'completed' : 'failed',
    processed_at: new Date().toISOString(),
  }

  if (result.transcription) {
    updates.content_transcription = result.transcription
  }

  if (result.ocr_text) {
    updates.content_ocr = result.ocr_text
  }

  if (result.storage_url) {
    updates.media_url = result.storage_url // Update to Supabase Storage URL
  }

  if (result.error) {
    updates.processing_error = result.error
  }

  const { error } = await supabase
    .from('whatsapp_messages')
    .update(updates)
    .eq('id', messageId)

  if (error) {
    log('ERROR', 'Failed to update message record', error)
  }
}

// ============================================================================
// MAIN SERVER
// ============================================================================

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: corsHeaders }
    )
  }

  try {
    // Parse request
    const body = await req.json() as ProcessingRequest
    const { message_id } = body

    if (!message_id) {
      return new Response(
        JSON.stringify({ error: 'message_id is required' }),
        { status: 400, headers: corsHeaders }
      )
    }

    log('INFO', 'Processing request received', { message_id })

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch message record
    const { data: message, error: fetchError } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('id', message_id)
      .single()

    if (fetchError || !message) {
      log('ERROR', 'Message not found', { message_id, error: fetchError })
      return new Response(
        JSON.stringify({ error: 'Message not found' }),
        { status: 404, headers: corsHeaders }
      )
    }

    // Check if already processed
    if (message.processing_status === 'completed') {
      log('INFO', 'Message already processed', { message_id })
      return new Response(
        JSON.stringify({ success: true, status: 'already_processed' }),
        { headers: corsHeaders }
      )
    }

    // Mark as processing
    await supabase
      .from('whatsapp_messages')
      .update({ processing_status: 'processing' })
      .eq('id', message_id)

    // Process the message
    const result = await processMessage(supabase, message as MessageRecord)

    // Update record with results
    await updateMessageRecord(supabase, message_id, result)

    log('INFO', 'Processing completed', { message_id, success: result.success })

    return new Response(
      JSON.stringify({
        success: result.success,
        message_id,
        has_transcription: !!result.transcription,
        has_ocr: !!result.ocr_text,
        storage_url: result.storage_url ? 'stored' : null,
        error: result.error,
      }),
      { headers: corsHeaders }
    )

  } catch (error) {
    const err = error as Error
    log('ERROR', 'Processing failed', err.message)

    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: corsHeaders }
    )
  }
})
