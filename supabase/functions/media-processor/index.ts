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
import { getCorsHeaders } from '../_shared/cors.ts'

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

// Note: Content-Type is set per-response, not via CORS headers

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
  detected_document_type?: string
  pending_action_id?: string
  totalTokensIn?: number
  totalTokensOut?: number
}

interface OrganizationDocumentDetection {
  is_organization_document: boolean
  document_type: 'cartao_cnpj' | 'estatuto' | 'comprovante_endereco' | 'unknown'
  confidence: number
  cnpj?: string
  razao_social?: string
  nome_fantasia?: string
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
): Promise<{ text: string | null; tokensIn: number; tokensOut: number }> {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

    // Use Gemini 2.0 Flash for audio transcription
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
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
    const usageMeta = response.usageMetadata
    const transcription = response.text().trim()

    log('INFO', 'Audio transcribed', { length: transcription.length })
    return { text: transcription || null, tokensIn: usageMeta?.promptTokenCount || 0, tokensOut: usageMeta?.candidatesTokenCount || 0 }
  } catch (error) {
    log('ERROR', 'Audio transcription error', (error as Error).message)
    return { text: null, tokensIn: 0, tokensOut: 0 }
  }
}

/**
 * Extract text from image using Gemini Vision OCR
 */
async function extractImageText(
  imageData: Uint8Array,
  mimeType: string
): Promise<{ text: string | null; tokensIn: number; tokensOut: number }> {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
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
    const usageMeta = response.usageMetadata
    const ocrText = response.text().trim()

    log('INFO', 'Image OCR completed', { length: ocrText.length })
    return { text: ocrText || null, tokensIn: usageMeta?.promptTokenCount || 0, tokensOut: usageMeta?.candidatesTokenCount || 0 }
  } catch (error) {
    log('ERROR', 'Image OCR error', (error as Error).message)
    return { text: null, tokensIn: 0, tokensOut: 0 }
  }
}

/**
 * Extract text from PDF using Gemini
 */
async function extractPdfText(
  pdfData: Uint8Array
): Promise<{ text: string | null; tokensIn: number; tokensOut: number }> {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
      },
    })

    // Convert PDF to base64
    const base64Pdf = btoa(String.fromCharCode(...pdfData))

    const prompt = `Extract all text content from this PDF document.
Include:
- Main text content
- Tables (formatted as text)
- Headers and footers
- Any visible text

Focus on preserving:
- Document structure
- Field labels and values
- Numbers (especially CNPJ, dates, phone numbers)

Return the extracted text only, preserving the original language.
If the PDF is a Brazilian business document (Cartao CNPJ, Estatuto), extract all fields carefully.`

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: base64Pdf,
        },
      },
    ])

    const response = await result.response
    const usageMeta = response.usageMetadata
    const pdfText = response.text().trim()

    log('INFO', 'PDF text extracted', { length: pdfText.length })
    return { text: pdfText || null, tokensIn: usageMeta?.promptTokenCount || 0, tokensOut: usageMeta?.candidatesTokenCount || 0 }
  } catch (error) {
    log('ERROR', 'PDF text extraction error', (error as Error).message)
    return { text: null, tokensIn: 0, tokensOut: 0 }
  }
}

/**
 * Analyze image sentiment/content for context
 */
async function analyzeImage(
  imageData: Uint8Array,
  mimeType: string
): Promise<{ description: string; sentiment: string; tokensIn: number; tokensOut: number } | null> {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
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
    const usageMeta = response.usageMetadata
    const text = response.text().replace(/```json\n?|\n?```/g, '').trim()

    const parsed = JSON.parse(text)
    return { ...parsed, tokensIn: usageMeta?.promptTokenCount || 0, tokensOut: usageMeta?.candidatesTokenCount || 0 }
  } catch (error) {
    log('WARN', 'Image analysis error', (error as Error).message)
    return null
  }
}

/**
 * Detect if OCR text contains organization document (Cartão CNPJ, etc.)
 */
function detectOrganizationDocument(ocrText: string): OrganizationDocumentDetection {
  const text = ocrText.toUpperCase()

  // CNPJ pattern: XX.XXX.XXX/XXXX-XX
  const cnpjRegex = /(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/
  const cnpjMatch = ocrText.match(cnpjRegex)

  // Key indicators for Cartão CNPJ
  const cnpjIndicators = [
    'CNPJ',
    'COMPROVANTE DE INSCRICAO',
    'CADASTRO NACIONAL',
    'RECEITA FEDERAL',
    'NATUREZA JURIDICA',
    'RAZAO SOCIAL',
    'NOME FANTASIA',
    'DATA DE ABERTURA',
    'SITUACAO CADASTRAL',
    'ATIVIDADE ECONOMICA',
    'CNAE',
  ]

  const indicatorMatches = cnpjIndicators.filter(ind => text.includes(ind))
  const indicatorScore = indicatorMatches.length / cnpjIndicators.length

  // Check for Cartão CNPJ
  if (cnpjMatch && indicatorScore >= 0.3) {
    // Extract key fields from OCR text
    const razaoSocialMatch = ocrText.match(/RAZ[AÃÂÄ]O SOCIAL[:\s]*([^\n]+)/i)
    const nomeFantasiaMatch = ocrText.match(/NOME FANTASIA[:\s]*([^\n]+)/i)

    return {
      is_organization_document: true,
      document_type: 'cartao_cnpj',
      confidence: Math.min(0.5 + indicatorScore, 1.0),
      cnpj: cnpjMatch[1].replace(/\D/g, ''),
      razao_social: razaoSocialMatch?.[1]?.trim(),
      nome_fantasia: nomeFantasiaMatch?.[1]?.trim(),
    }
  }

  // Check for Estatuto (legal document)
  const estatutoIndicators = ['ESTATUTO', 'CONTRATO SOCIAL', 'ATA DE CONSTITUICAO', 'REGISTRO CIVIL']
  if (estatutoIndicators.some(ind => text.includes(ind)) && cnpjMatch) {
    return {
      is_organization_document: true,
      document_type: 'estatuto',
      confidence: 0.6,
      cnpj: cnpjMatch[1].replace(/\D/g, ''),
    }
  }

  // Check for address proof
  const enderecoIndicators = ['COMPROVANTE DE ENDERECO', 'CONTA DE LUZ', 'CONTA DE AGUA', 'IPTU']
  if (enderecoIndicators.some(ind => text.includes(ind))) {
    return {
      is_organization_document: true,
      document_type: 'comprovante_endereco',
      confidence: 0.5,
    }
  }

  return {
    is_organization_document: false,
    document_type: 'unknown',
    confidence: 0,
  }
}

/**
 * Create pending action for organization document
 */
async function createPendingOrganizationAction(
  supabase: ReturnType<typeof createClient>,
  message: MessageRecord,
  detection: OrganizationDocumentDetection,
  storageUrl: string | null
): Promise<string | null> {
  try {
    // Get user info for message response
    const { data: userData } = await supabase
      .from('profiles')
      .select('first_name')
      .eq('id', message.user_id)
      .single()

    const userName = userData?.first_name || 'Usuario'

    // Create pending action
    const { data: pendingAction, error: insertError } = await supabase
      .from('whatsapp_pending_actions')
      .insert({
        user_id: message.user_id,
        contact_phone: (message as unknown as { contact_phone: string }).contact_phone,
        remote_jid: (message as unknown as { remote_jid: string }).remote_jid,
        instance_name: (message as unknown as { instance_name: string }).instance_name,
        source_message_id: message.id,
        action_type: 'register_organization',
        action_payload: {
          document_type: detection.document_type,
          confidence: detection.confidence,
          cnpj: detection.cnpj,
          razao_social: detection.razao_social,
          nome_fantasia: detection.nome_fantasia,
          storage_url: storageUrl,
        },
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      })
      .select('id')
      .single()

    if (insertError) {
      log('ERROR', 'Failed to create pending action', insertError)
      return null
    }

    // Send confirmation message
    const confirmationMessage = buildConfirmationMessage(userName, detection)
    await sendWhatsAppConfirmation(
      supabase,
      (message as unknown as { instance_name: string }).instance_name,
      (message as unknown as { remote_jid: string }).remote_jid,
      confirmationMessage
    )

    log('INFO', 'Pending action created and confirmation sent', {
      actionId: pendingAction.id,
      documentType: detection.document_type,
    })

    return pendingAction.id
  } catch (error) {
    log('ERROR', 'Failed to create pending action', (error as Error).message)
    return null
  }
}

/**
 * Build confirmation message for organization document
 */
function buildConfirmationMessage(userName: string, detection: OrganizationDocumentDetection): string {
  const docTypeNames: Record<string, string> = {
    'cartao_cnpj': 'Cartao CNPJ',
    'estatuto': 'Estatuto Social',
    'comprovante_endereco': 'Comprovante de Endereco',
    'unknown': 'documento',
  }

  const docName = docTypeNames[detection.document_type] || 'documento'

  let message = `Ola ${userName}! 👋\n\n`
  message += `📄 Identifiquei um *${docName}*`

  if (detection.document_type === 'cartao_cnpj' && detection.cnpj) {
    const cnpjFormatted = detection.cnpj.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5'
    )
    message += ` (CNPJ: ${cnpjFormatted})`
  }

  message += `.\n\n`

  if (detection.razao_social) {
    message += `📌 *Razao Social:* ${detection.razao_social}\n`
  }
  if (detection.nome_fantasia) {
    message += `🏢 *Nome Fantasia:* ${detection.nome_fantasia}\n`
  }

  message += `\n*Deseja cadastrar esta organizacao?*\n\n`
  message += `✅ Responda *SIM* para cadastrar\n`
  message += `❌ Responda *NAO* para ignorar`

  return message
}

/**
 * Send WhatsApp confirmation message
 */
async function sendWhatsAppConfirmation(
  supabase: ReturnType<typeof createClient>,
  instanceName: string,
  remoteJid: string,
  message: string
): Promise<boolean> {
  try {
    // Get Evolution API instance
    const { data: instance } = await supabase
      .from('whatsapp_sessions')
      .select('evolution_api_url, evolution_api_key')
      .eq('instance_name', instanceName)
      .single()

    const apiUrl = instance?.evolution_api_url || EVOLUTION_API_URL
    const apiKey = instance?.evolution_api_key || EVOLUTION_API_KEY

    if (!apiUrl || !apiKey) {
      log('ERROR', 'Evolution API credentials not found')
      return false
    }

    const response = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({
        number: remoteJid,
        text: message,
      }),
    })

    if (!response.ok) {
      log('ERROR', 'Failed to send confirmation message', { status: response.status })
      return false
    }

    log('INFO', 'Confirmation message sent', { instanceName, remoteJid: remoteJid.substring(0, 10) })
    return true
  } catch (error) {
    log('ERROR', 'Send confirmation exception', (error as Error).message)
    return false
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
    totalTokensIn: 0,
    totalTokensOut: 0,
  }

  // Process based on media type
  switch (message_type) {
    case 'audio':
      const audioResult = await transcribeAudio(
        mediaResult.data,
        media_mimetype || 'audio/ogg'
      )
      result.transcription = audioResult.text || undefined
      result.totalTokensIn! += audioResult.tokensIn
      result.totalTokensOut! += audioResult.tokensOut
      break

    case 'image':
      const imageResult = await extractImageText(
        mediaResult.data,
        media_mimetype || 'image/jpeg'
      )
      result.ocr_text = imageResult.text || undefined
      result.totalTokensIn! += imageResult.tokensIn
      result.totalTokensOut! += imageResult.tokensOut

      // Detect organization documents from OCR
      if (imageResult.text) {
        const detection = detectOrganizationDocument(imageResult.text)
        if (detection.is_organization_document && detection.confidence >= 0.5) {
          result.detected_document_type = detection.document_type
          const pendingActionId = await createPendingOrganizationAction(
            supabase,
            message,
            detection,
            storageUrl
          )
          result.pending_action_id = pendingActionId || undefined
          log('INFO', 'Organization document detected', {
            id,
            type: detection.document_type,
            confidence: detection.confidence,
          })
        }
      }
      break

    case 'video':
      // For video, we could extract audio and transcribe
      // For now, just store the file
      log('INFO', 'Video stored without transcription', { id })
      break

    case 'document':
      // For PDF documents, extract text and detect organization docs
      if (media_mimetype === 'application/pdf' || media_filename?.toLowerCase().endsWith('.pdf')) {
        const pdfResult = await extractPdfText(mediaResult.data)
        result.ocr_text = pdfResult.text || undefined
        result.totalTokensIn! += pdfResult.tokensIn
        result.totalTokensOut! += pdfResult.tokensOut

        // Detect organization documents from PDF
        if (pdfResult.text) {
          const pdfDetection = detectOrganizationDocument(pdfResult.text)
          if (pdfDetection.is_organization_document && pdfDetection.confidence >= 0.5) {
            result.detected_document_type = pdfDetection.document_type
            const pdfPendingActionId = await createPendingOrganizationAction(
              supabase,
              message,
              pdfDetection,
              storageUrl
            )
            result.pending_action_id = pdfPendingActionId || undefined
            log('INFO', 'Organization PDF document detected', {
              id,
              type: pdfDetection.document_type,
              confidence: pdfDetection.confidence,
            })
          }
        }
      } else {
        log('INFO', 'Document stored', { id, mimetype: media_mimetype })
      }
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

  // Set detected_intent for organization documents
  if (result.detected_document_type) {
    updates.detected_intent = `organization_document:${result.detected_document_type}`
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
  const corsHeaders = { ...getCorsHeaders(req), 'Content-Type': 'application/json' }

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

    // Fire-and-forget usage tracking
    if (result.success && message.user_id) {
      supabase.rpc('log_interaction', {
        p_user_id: message.user_id,
        p_action: 'analyze_moment',
        p_module: 'connections',
        p_model: 'gemini-2.5-flash',
        p_tokens_in: result.totalTokensIn || 0,
        p_tokens_out: result.totalTokensOut || 0,
      }).catch((err: Error) => {
        log('WARN', 'Failed to log interaction', err.message)
      })
    }

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
