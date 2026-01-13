/**
 * Sync WhatsApp Contacts Edge Function
 *
 * Synchronizes contacts from Evolution API to contact_network table.
 * Multi-instance architecture: uses user's own WhatsApp instance.
 *
 * Endpoint: POST /functions/v1/sync-whatsapp-contacts
 * Body: { instanceName?: string } (optional, defaults to user's session)
 * Response: {
 *   success: boolean,
 *   contactsSynced: number,
 *   contactsSkipped: number,
 *   errors: string[],
 *   syncLogId?: string,
 *   durationMs: number
 * }
 *
 * Authentication:
 * - Uses ANON_KEY client to validate user token
 * - Uses SERVICE_ROLE_KEY client for database operations
 *
 * Epic: #122 - Multi-Instance WhatsApp Architecture
 * Issue: #127 - Update sync-whatsapp-contacts for multi-instance
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SyncRequest {
  instanceName?: string
}

interface ContactSyncResult {
  success: boolean
  contactsSynced: number
  contactsSkipped: number
  errors: string[]
  syncLogId?: string
  durationMs: number
}

interface WhatsAppContact {
  id: string
  pushName?: string
  name?: string
  profilePicUrl?: string
  isMyContact?: boolean
  lastMessageTimestamp?: number
}

serve(async (req: Request) => {
  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    // 2. Validate authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // 3. Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Auth client (to validate user token)
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token)

    if (authError || !user) {
      console.error('[sync-whatsapp-contacts] Auth error:', authError?.message)
      throw new Error('Invalid authentication token')
    }

    // Service client (for database operations bypassing RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    console.log(`[sync-whatsapp-contacts] Starting sync for user ${user.id}`)

    // 4. Parse request body
    let body: SyncRequest = {}
    try {
      body = await req.json()
    } catch {
      // Empty body is OK - will use user's session
    }

    // 5. Get user's WhatsApp session (multi-instance architecture)
    let instanceName = body.instanceName
    let sessionId: string | null = null

    if (!instanceName) {
      const { data: session, error: sessionError } = await supabase
        .from('whatsapp_sessions')
        .select('id, instance_name, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (sessionError || !session) {
        console.error('[sync-whatsapp-contacts] No session found:', sessionError?.message)
        throw new Error('No WhatsApp session found. Please connect your WhatsApp first.')
      }

      if (session.status !== 'connected') {
        throw new Error(`WhatsApp not connected. Current status: ${session.status}`)
      }

      instanceName = session.instance_name
      sessionId = session.id
      console.log(`[sync-whatsapp-contacts] Using session instance: ${instanceName}`)
    }

    // Legacy fallback for backward compatibility
    if (!instanceName) {
      instanceName = Deno.env.get('EVOLUTION_INSTANCE_NAME')
    }

    if (!instanceName) {
      throw new Error('Instance name is required')
    }

    // 6. Create sync log entry
    const { data: syncLog, error: syncLogError } = await supabase
      .from('whatsapp_sync_logs')
      .insert({
        user_id: user.id,
        sync_type: 'contacts',
        status: 'in_progress',
        started_at: new Date().toISOString(),
        metadata: { instanceName },
      })
      .select()
      .single()

    if (syncLogError) {
      console.error('[sync-whatsapp-contacts] Error creating sync log:', syncLogError)
      throw syncLogError
    }

    console.log(`[sync-whatsapp-contacts] Sync log created: ${syncLog.id}`)

    // 7. Fetch contacts from Evolution API
    console.log(`[sync-whatsapp-contacts] Fetching contacts from Evolution API...`)
    const whatsappContacts = await fetchAllContacts(instanceName)
    console.log(`[sync-whatsapp-contacts] Found ${whatsappContacts.length} WhatsApp contacts`)

    // 8. Sync contacts to database
    let contactsSynced = 0
    let contactsSkipped = 0
    const errors: string[] = []

    for (const contact of whatsappContacts) {
      try {
        await syncContactToDatabase(supabase, user.id, contact)
        contactsSynced++
      } catch (error) {
        const err = error as Error
        console.error(`[sync-whatsapp-contacts] Error syncing contact ${contact.id}:`, err.message)
        errors.push(`Contact ${contact.id}: ${err.message}`)
        contactsSkipped++
      }
    }

    const durationMs = Date.now() - startTime

    // 9. Update sync log with results
    await supabase
      .from('whatsapp_sync_logs')
      .update({
        status: 'completed',
        contacts_synced: contactsSynced,
        completed_at: new Date().toISOString(),
        metadata: {
          instanceName,
          totalContacts: whatsappContacts.length,
          contactsSkipped,
          durationMs,
        },
      })
      .eq('id', syncLog.id)

    // 10. Update session sync stats (multi-instance architecture)
    if (sessionId) {
      await supabase.rpc('update_session_sync_stats', {
        p_session_id: sessionId,
        p_contacts_count: contactsSynced,
      })
      console.log(`[sync-whatsapp-contacts] Session sync stats updated: ${contactsSynced} contacts`)
    }

    console.log(`[sync-whatsapp-contacts] Sync completed: ${contactsSynced} synced, ${contactsSkipped} skipped`)

    // 11. Return success response
    const result: ContactSyncResult = {
      success: true,
      contactsSynced,
      contactsSkipped,
      errors,
      syncLogId: syncLog.id,
      durationMs,
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    const err = error as Error
    console.error('[sync-whatsapp-contacts] Error:', err.message)

    return new Response(
      JSON.stringify({
        success: false,
        error: err.message,
        contactsSynced: 0,
        contactsSkipped: 0,
        errors: [err.message],
        durationMs: Date.now() - startTime,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

/**
 * Fetch all contacts from Evolution API
 *
 * @param instanceName - The Evolution API instance name
 * @returns Array of WhatsApp contacts
 * @throws Error if API credentials are not configured or API call fails
 */
async function fetchAllContacts(instanceName: string): Promise<WhatsAppContact[]> {
  const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL')
  const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')

  if (!evolutionApiUrl || !evolutionApiKey) {
    throw new Error('Evolution API credentials not configured')
  }

  const url = `${evolutionApiUrl}/chat/findContacts/${instanceName}`

  console.log(`[evolution-api] Fetching contacts from: ${url}`)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: evolutionApiKey,
    },
    body: JSON.stringify({
      where: {},
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`[evolution-api] Error response: ${errorText}`)
    throw new Error(`Evolution API error: ${response.status} ${response.statusText}`)
  }

  const contacts = await response.json()

  if (!Array.isArray(contacts)) {
    console.error(`[evolution-api] Invalid response format:`, contacts)
    throw new Error('Invalid response from Evolution API')
  }

  console.log(`[evolution-api] Successfully fetched ${contacts.length} contacts`)

  return contacts
}

/**
 * Sync individual contact to contact_network table
 *
 * Upserts contact data using whatsapp_id as conflict key.
 * Handles both individual contacts and groups.
 *
 * @param supabase - Supabase client with SERVICE_ROLE_KEY
 * @param userId - The authenticated user's ID
 * @param contact - WhatsApp contact data from Evolution API
 * @throws Error if upsert fails
 */
async function syncContactToDatabase(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  contact: WhatsAppContact
): Promise<void> {
  // Extract phone number from remoteJid (e.g., "5521999999999@s.whatsapp.net" -> "5521999999999")
  const remoteJid = (contact as any).remoteJid || contact.id
  const phoneMatch = remoteJid.match(/^(\d+)@/)
  const phone = phoneMatch ? phoneMatch[1] : null

  // Determine if this is a group
  const isGroup = remoteJid.includes('@g.us') || remoteJid.includes('@lid')

  // Prepare contact data
  const contactData = {
    user_id: userId,
    name: contact.pushName || contact.name || `WhatsApp ${phone || 'Contact'}`,
    phone_number: phone ? `+${phone}` : null, // E.164 format for consistency
    whatsapp_phone: phone,
    whatsapp_id: remoteJid,
    whatsapp_name: contact.pushName || contact.name,
    whatsapp_profile_pic_url: contact.profilePicUrl,
    whatsapp_sync_enabled: true,
    whatsapp_synced_at: new Date().toISOString(),
    last_whatsapp_message_at: contact.lastMessageTimestamp
      ? new Date(contact.lastMessageTimestamp * 1000).toISOString()
      : null,
    whatsapp_metadata: {
      isGroup,
      isMyContact: contact.isMyContact,
      syncedAt: new Date().toISOString(),
    },
    tags: isGroup ? ['whatsapp', 'group'] : ['whatsapp'],
    // CRITICAL: Set sync_source so UI filtering works correctly
    sync_source: 'whatsapp',
    last_synced_at: new Date().toISOString(),
  }

  // Upsert contact (update if exists, insert if new)
  const { error: upsertError } = await supabase
    .from('contact_network')
    .upsert(contactData, {
      onConflict: 'user_id,whatsapp_id',
      ignoreDuplicates: false,
    })

  if (upsertError) {
    console.error(`[sync-whatsapp-contacts] Upsert error for ${remoteJid}:`, upsertError)
    throw upsertError
  }

  console.log(`[sync-whatsapp-contacts] Synced contact: ${contactData.name} (${remoteJid})`)
}
