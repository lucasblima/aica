/**
 * Sync WhatsApp Contacts Edge Function
 * Sprint 2: Contact Synchronization
 *
 * Fetches contacts from Evolution API and syncs with contact_network table
 *
 * POST /sync-whatsapp-contacts
 * Body: { instanceName: string }
 * Headers: { Authorization: Bearer <token> }
 *
 * Response:
 * {
 *   success: boolean
 *   contactsSynced: number
 *   errors: string[]
 *   syncLogId: string
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { fetchAllContacts, WhatsAppContact } from '../_shared/evolution-client.ts'

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

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Get user from auth token
    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      throw new Error('Invalid authentication token')
    }

    console.log(`[sync-whatsapp-contacts] Starting sync for user ${user.id}`)

    // Parse request body
    const body: SyncRequest = await req.json()
    const instanceName = body.instanceName || Deno.env.get('EVOLUTION_INSTANCE_NAME')

    if (!instanceName) {
      throw new Error('Instance name is required')
    }

    // Create sync log entry
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

    // Fetch contacts from Evolution API
    console.log(`[sync-whatsapp-contacts] Fetching contacts from Evolution API...`)
    const whatsappContacts = await fetchAllContacts(instanceName)

    console.log(`[sync-whatsapp-contacts] Found ${whatsappContacts.length} WhatsApp contacts`)

    // Sync contacts to database
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

    // Update sync log
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

    console.log(`[sync-whatsapp-contacts] Sync completed: ${contactsSynced} synced, ${contactsSkipped} skipped`)

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
 * Sync individual contact to contact_network table
 */
async function syncContactToDatabase(
  supabase: any,
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
    whatsapp_phone: phone,
    whatsapp_id: remoteJid,
    whatsapp_name: contact.pushName || contact.name,
    whatsapp_profile_pic_url: contact.profilePicUrl,
    whatsapp_sync_enabled: true,
    last_whatsapp_message_at: contact.lastMessageTimestamp
      ? new Date(contact.lastMessageTimestamp * 1000).toISOString()
      : null,
    whatsapp_metadata: {
      isGroup,
      isMyContact: contact.isMyContact,
      syncedAt: new Date().toISOString(),
    },
    tags: isGroup ? ['whatsapp', 'group'] : ['whatsapp'],
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
