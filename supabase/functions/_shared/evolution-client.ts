/**
 * Evolution API Client
 * Shared module for WhatsApp integration via Evolution API
 */

// ============================================================================
// TYPES
// ============================================================================

export interface InstanceConfig {
  instanceName: string
  qrcode: boolean
}

export interface GeneratePairingCodeResponse {
  code: string
  base64?: string
}

export interface SendMessageParams {
  instanceName: string
  remoteJid: string
  text: string
}

export interface SendMediaParams {
  instanceName: string
  remoteJid: string
  mediaUrl: string
  mediaType?: 'image' | 'video' | 'audio' | 'document'
  caption?: string
}

export interface EvolutionApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL')
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY')

if (!EVOLUTION_API_URL) {
  throw new Error('EVOLUTION_API_URL environment variable is not set')
}

if (!EVOLUTION_API_KEY) {
  throw new Error('EVOLUTION_API_KEY environment variable is not set')
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Make authenticated request to Evolution API
 */
async function makeRequest<T = any>(
  method: string,
  endpoint: string,
  body?: any
): Promise<T> {
  const url = `${EVOLUTION_API_URL}${endpoint}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': EVOLUTION_API_KEY,
  }

  const options: RequestInit = {
    method,
    headers,
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  console.log(`[evolution-client] ${method} ${endpoint}`)

  try {
    const response = await fetch(url, options)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[evolution-client] Error ${response.status}: ${errorText}`)
      throw new Error(`Evolution API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json() as T
    return data
  } catch (error) {
    const err = error as Error
    console.error(`[evolution-client] Request failed:`, err.message)
    throw err
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Create a new WhatsApp instance
 * @param instanceName - Name for the instance
 * @param qrcode - If true, generate QR code for connection
 */
export async function createInstance(
  instanceName: string,
  qrcode: boolean = false
): Promise<EvolutionApiResponse> {
  if (!instanceName || typeof instanceName !== 'string') {
    throw new Error('Instance name is required and must be a string')
  }

  const response = await makeRequest(
    'POST',
    '/instance/create',
    {
      instanceName,
      qrcode,
    }
  )

  return response as EvolutionApiResponse
}

/**
 * Generate a pairing code for the instance
 * @param instanceName - Name of the instance
 * @param phoneNumber - Phone number to pair (format: 5511987654321)
 */
export async function generatePairingCode(
  instanceName: string,
  phoneNumber: string
): Promise<GeneratePairingCodeResponse> {
  if (!instanceName || !phoneNumber) {
    throw new Error('Instance name and phone number are required')
  }

  // Validate phone format
  if (!/^\d{10,15}$/.test(phoneNumber.replace(/\D/g, ''))) {
    throw new Error('Invalid phone number format')
  }

  const response = await makeRequest(
    'POST',
    `/instance/${instanceName}/create-code`,
    {
      phoneNumber,
    }
  )

  return response as GeneratePairingCodeResponse
}

/**
 * Send a text message via WhatsApp
 * @param instanceName - Name of the instance
 * @param remoteJid - Recipient's WhatsApp ID (format: 5511987654321@s.whatsapp.net)
 * @param text - Message text
 */
export async function sendMessage(
  instanceName: string,
  remoteJid: string,
  text: string
): Promise<EvolutionApiResponse> {
  if (!instanceName || !remoteJid || !text) {
    throw new Error('Instance name, remote JID, and message text are required')
  }

  if (text.trim().length === 0) {
    throw new Error('Message text cannot be empty')
  }

  if (text.length > 4096) {
    throw new Error('Message text exceeds maximum length (4096 characters)')
  }

  const response = await makeRequest(
    'POST',
    `/message/sendText/${instanceName}`,
    {
      number: remoteJid,
      text,
    }
  )

  return response as EvolutionApiResponse
}

/**
 * Send a media file via WhatsApp
 * @param instanceName - Name of the instance
 * @param remoteJid - Recipient's WhatsApp ID
 * @param mediaUrl - URL of the media file
 * @param mediaType - Type of media (image, video, audio, document)
 * @param caption - Optional caption for the media
 */
export async function sendMedia(
  instanceName: string,
  remoteJid: string,
  mediaUrl: string,
  mediaType: 'image' | 'video' | 'audio' | 'document' = 'image',
  caption?: string
): Promise<EvolutionApiResponse> {
  if (!instanceName || !remoteJid || !mediaUrl) {
    throw new Error('Instance name, remote JID, and media URL are required')
  }

  // Validate URL
  try {
    new URL(mediaUrl)
  } catch {
    throw new Error('Invalid media URL')
  }

  const typeMap: Record<string, string> = {
    'image': 'image',
    'video': 'video',
    'audio': 'audio',
    'document': 'document',
  }

  const mappedType = typeMap[mediaType] || 'image'

  const payload: Record<string, any> = {
    number: remoteJid,
    mediaType: mappedType,
    media: mediaUrl,
  }

  if (caption) {
    payload.caption = caption
  }

  const response = await makeRequest(
    'POST',
    `/message/sendMedia/${instanceName}`,
    payload
  )

  return response as EvolutionApiResponse
}

/**
 * Get instance information
 * @param instanceName - Name of the instance
 */
export async function getInstanceInfo(
  instanceName: string
): Promise<EvolutionApiResponse> {
  if (!instanceName) {
    throw new Error('Instance name is required')
  }

  const response = await makeRequest(
    'GET',
    `/instance/info/${instanceName}`
  )

  return response as EvolutionApiResponse
}

/**
 * Restart/reconnect an instance
 * @param instanceName - Name of the instance
 */
export async function restartInstance(
  instanceName: string
): Promise<EvolutionApiResponse> {
  if (!instanceName) {
    throw new Error('Instance name is required')
  }

  const response = await makeRequest(
    'PUT',
    `/instance/restart/${instanceName}`
  )

  return response as EvolutionApiResponse
}

/**
 * Delete an instance
 * @param instanceName - Name of the instance
 */
export async function deleteInstance(
  instanceName: string
): Promise<EvolutionApiResponse> {
  if (!instanceName) {
    throw new Error('Instance name is required')
  }

  const response = await makeRequest(
    'DELETE',
    `/instance/delete/${instanceName}`
  )

  return response as EvolutionApiResponse
}

export default {
  createInstance,
  generatePairingCode,
  sendMessage,
  sendMedia,
  getInstanceInfo,
  restartInstance,
  deleteInstance,
}
