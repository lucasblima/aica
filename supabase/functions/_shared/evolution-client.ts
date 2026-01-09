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
// SPRINT 1: Contact Sync Types
// ============================================================================

export interface WhatsAppContact {
  id: string // remoteJid (e.g., "5521999999999@s.whatsapp.net")
  name: string | null // Contact name from address book
  pushName: string | null // Name they set in WhatsApp
  profilePicUrl: string | null
  isGroup: boolean
  isMyContact: boolean // Is in user's contact list
  lastMessageTimestamp?: number // Unix timestamp
}

export interface WhatsAppMessageData {
  key: {
    remoteJid: string
    fromMe: boolean
    id: string
    participant?: string
  }
  pushName?: string
  message?: {
    conversation?: string
    extendedTextMessage?: { text: string }
    imageMessage?: WebhookMediaMessage
    audioMessage?: WebhookMediaMessage
    videoMessage?: WebhookMediaMessage
    documentMessage?: WebhookMediaMessage
  }
  messageTimestamp?: number | string
}

export interface WebhookMediaMessage {
  url?: string
  mimetype?: string
  caption?: string
  fileName?: string
  fileLength?: string
  seconds?: number
}

export interface GroupMetadata {
  id: string
  subject: string // Group name
  owner: string
  creation: number // Unix timestamp
  participants: Array<{
    id: string
    admin: 'admin' | 'superadmin' | null
  }>
  desc?: string // Group description
  descOwner?: string
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
 * Make authenticated request to Evolution API with retry logic
 * @param method - HTTP method
 * @param endpoint - API endpoint
 * @param body - Request body (optional)
 * @param retryCount - Current retry attempt (internal use)
 */
async function makeRequest<T = any>(
  method: string,
  endpoint: string,
  body?: any,
  retryCount = 0
): Promise<T> {
  const url = `${EVOLUTION_API_URL}${endpoint}`
  const maxRetries = 3

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

  console.log(`[evolution-client] ${method} ${endpoint} (attempt ${retryCount + 1})`)

  try {
    const response = await fetch(url, options)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[evolution-client] Error ${response.status}: ${errorText}`)

      // Don't retry on 4xx errors (client errors)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Evolution API client error: ${response.status} - ${errorText}`)
      }

      // Retry on 5xx errors (server errors) and rate limiting
      if ((response.status >= 500 || response.status === 429) && retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
        console.log(`[evolution-client] Retrying after ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return makeRequest<T>(method, endpoint, body, retryCount + 1)
      }

      throw new Error(`Evolution API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json() as T
    return data
  } catch (error) {
    const err = error as Error

    // Network errors - retry
    if (err.message.includes('fetch failed') && retryCount < maxRetries) {
      const delay = Math.pow(2, retryCount) * 1000
      console.log(`[evolution-client] Network error, retrying after ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
      return makeRequest<T>(method, endpoint, body, retryCount + 1)
    }

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

// ============================================================================
// SPRINT 1: Contact Sync Functions
// ============================================================================

/**
 * Fetch all contacts from WhatsApp
 * @param instanceName - Name of the instance
 * @returns Array of WhatsApp contacts
 */
export async function fetchAllContacts(
  instanceName: string
): Promise<WhatsAppContact[]> {
  if (!instanceName) {
    throw new Error('Instance name is required')
  }

  try {
    const response = await makeRequest<{ data?: WhatsAppContact[] }>(
      'GET',
      `/chat/findContacts/${instanceName}`
    )

    // Evolution API returns contacts in a 'data' property
    return response.data || []
  } catch (error) {
    const err = error as Error
    console.error(`[evolution-client] fetchAllContacts error:`, err.message)

    // Return empty array instead of throwing on API errors
    // This allows graceful degradation if API is temporarily down
    if (err.message.includes('5')) {
      console.warn('[evolution-client] API server error, returning empty contacts')
      return []
    }

    throw err
  }
}

/**
 * Fetch chat messages with a contact
 * @param instanceName - Name of the instance
 * @param remoteJid - Contact's WhatsApp ID (e.g., "5521999999999@s.whatsapp.net")
 * @param limit - Maximum number of messages to fetch (default: 50)
 * @returns Array of WhatsApp messages
 */
export async function fetchChatMessages(
  instanceName: string,
  remoteJid: string,
  limit: number = 50
): Promise<WhatsAppMessageData[]> {
  if (!instanceName || !remoteJid) {
    throw new Error('Instance name and remote JID are required')
  }

  if (limit < 1 || limit > 1000) {
    throw new Error('Limit must be between 1 and 1000')
  }

  try {
    const response = await makeRequest<{ data?: WhatsAppMessageData[] }>(
      'GET',
      `/chat/findMessages/${instanceName}?remoteJid=${encodeURIComponent(remoteJid)}&limit=${limit}`
    )

    return response.data || []
  } catch (error) {
    const err = error as Error
    console.error(`[evolution-client] fetchChatMessages error:`, err.message)

    // Return empty array for graceful degradation
    if (err.message.includes('5')) {
      console.warn('[evolution-client] API server error, returning empty messages')
      return []
    }

    throw err
  }
}

/**
 * Fetch group metadata
 * @param instanceName - Name of the instance
 * @param groupJid - Group's WhatsApp ID (e.g., "120363123456789@g.us")
 * @returns Group metadata including participants
 */
export async function fetchGroupMetadata(
  instanceName: string,
  groupJid: string
): Promise<GroupMetadata> {
  if (!instanceName || !groupJid) {
    throw new Error('Instance name and group JID are required')
  }

  if (!groupJid.endsWith('@g.us')) {
    throw new Error('Invalid group JID format (must end with @g.us)')
  }

  const response = await makeRequest<GroupMetadata>(
    'GET',
    `/group/metadata/${instanceName}?groupJid=${encodeURIComponent(groupJid)}`
  )

  return response
}

export default {
  createInstance,
  generatePairingCode,
  sendMessage,
  sendMedia,
  getInstanceInfo,
  restartInstance,
  deleteInstance,
  // Sprint 1: Contact Sync
  fetchAllContacts,
  fetchChatMessages,
  fetchGroupMetadata,
}
