/**
 * Email Intelligence Service
 *
 * Calls the email-intelligence Edge Function for AI-powered categorization,
 * task extraction, and contact enrichment. Also queries local DB for results.
 */

import { supabase } from '@/services/supabaseClient';
import { findOrCreateContact } from '@/services/platformContactService';
import { createNamespacedLogger } from '@/lib/logger';
import type { EmailCategory, CategorizedEmail, ExtractedTask, ContactEnrichment, ExtractedContact } from '../types';

const log = createNamespacedLogger('EmailIntelligenceService');

// ============================================================================
// AI Operations (via Edge Function)
// ============================================================================

/**
 * Trigger AI categorization for recent inbox emails.
 */
export async function categorizeInbox(limit = 20): Promise<{ categorized: number; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('email-intelligence', {
      body: { action: 'categorize_batch', limit },
    });

    console.log('[categorizeInbox] Response:', JSON.stringify({ data, error }));

    if (error) {
      log.error('[categorizeInbox] Edge Function error:', { error });
      return { categorized: 0, error: error.message };
    }

    if (!data?.success) {
      log.warn('[categorizeInbox] API error:', data?.error);
      if (data?._debug) log.warn('[categorizeInbox] Debug:', data._debug);
      return { categorized: 0, error: data?.error || 'Erro na categorização' };
    }

    // Log debug info from Edge Function for diagnostics
    if (data?._debug) {
      log.info('[categorizeInbox] EF debug:', data._debug);
    }

    return { categorized: data.categorized ?? 0 };
  } catch (err) {
    log.error('[categorizeInbox] Exception:', { error: err });
    return { categorized: 0, error: err instanceof Error ? err.message : 'Erro inesperado' };
  }
}

/**
 * Extract tasks from specific emails via AI.
 */
export async function extractTasksFromEmails(messageIds: string[]): Promise<{ extracted: number; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('email-intelligence', {
      body: { action: 'extract_tasks_batch', message_ids: messageIds },
    });

    if (error) {
      log.error('[extractTasksFromEmails] Edge Function error:', { error });
      return { extracted: 0, error: error.message };
    }

    if (!data?.success) {
      return { extracted: 0, error: data?.error || 'Erro na extracao de tarefas' };
    }

    return { extracted: data.extracted ?? 0 };
  } catch (err) {
    log.error('[extractTasksFromEmails] Exception:', { error: err });
    return { extracted: 0, error: err instanceof Error ? err.message : 'Erro inesperado' };
  }
}

/**
 * Enrich a contact profile from email history via AI.
 */
export async function enrichContactFromEmails(contactEmail: string): Promise<ContactEnrichment | null> {
  try {
    const { data, error } = await supabase.functions.invoke('email-intelligence', {
      body: { action: 'enrich_contact', contact_email: contactEmail },
    });

    if (error) {
      log.error('[enrichContactFromEmails] Edge Function error:', { error });
      return null;
    }

    return data?.success ? (data.enrichment ?? null) : null;
  } catch (err) {
    log.error('[enrichContactFromEmails] Exception:', { error: err });
    return null;
  }
}

/**
 * Fetch a full message body via gmail-proxy.
 */
export async function getMessageBody(messageId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('gmail-proxy', {
      body: { action: 'get_message_body', payload: { messageId } },
    });

    if (error) {
      log.error('[getMessageBody] Edge Function error:', { error });
      return null;
    }

    if (!data?.success) return null;

    const bodyText = data.data?.body ?? null;
    if (!bodyText) return null;

    // Strip HTML if content type is text/html
    if (data.data?.content_type === 'text/html') {
      return bodyText
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    return bodyText;
  } catch (err) {
    log.error('[getMessageBody] Exception:', { error: err });
    return null;
  }
}

// ============================================================================
// Database Queries
// ============================================================================

/**
 * Get categorized emails from DB (optionally filtered by category).
 */
export async function getCategorizedEmails(
  category?: EmailCategory,
  limit = 20,
): Promise<CategorizedEmail[]> {
  try {
    const { data, error } = await supabase.rpc('get_categorized_emails', {
      p_user_id: (await supabase.auth.getUser()).data.user?.id,
      p_category: category ?? null,
      p_limit: limit,
    });

    if (error) {
      log.error('[getCategorizedEmails] RPC error:', { error });
      return [];
    }

    return (data as CategorizedEmail[]) ?? [];
  } catch (err) {
    log.error('[getCategorizedEmails] Exception:', { error: err });
    return [];
  }
}

/**
 * Get extracted tasks from DB (optionally filtered by status).
 */
export async function getExtractedTasks(status?: string): Promise<ExtractedTask[]> {
  try {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return [];

    let query = supabase
      .from('email_extracted_tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      log.error('[getExtractedTasks] Query error:', { error });
      return [];
    }

    return (data as ExtractedTask[]) ?? [];
  } catch (err) {
    log.error('[getExtractedTasks] Exception:', { error: err });
    return [];
  }
}

/**
 * Accept an extracted task — links it to an Atlas work_item.
 */
export async function acceptTask(taskId: string, workItemId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('accept_extracted_task', {
      p_task_id: taskId,
      p_work_item_id: workItemId,
    });

    if (error) {
      log.error('[acceptTask] RPC error:', { error });
      return false;
    }

    return data === true;
  } catch (err) {
    log.error('[acceptTask] Exception:', { error: err });
    return false;
  }
}

/**
 * Dismiss an extracted task.
 */
export async function dismissTask(taskId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('email_extracted_tasks')
      .update({ status: 'dismissed' })
      .eq('id', taskId);

    if (error) {
      log.error('[dismissTask] Update error:', { error });
      return false;
    }

    return true;
  } catch (err) {
    log.error('[dismissTask] Exception:', { error: err });
    return false;
  }
}

// ============================================================================
// Email → Platform Contacts Pipeline
// ============================================================================

/**
 * Sync extracted contacts from gmail_email_categories into platform_contacts.
 * Reads unique contacts from categorized emails and creates platform contacts
 * with source_module='email'. Self-contacts are filtered by findOrCreateContact.
 *
 * Returns the number of new contacts created.
 */
export async function syncExtractedContactsToPlatform(): Promise<{
  synced: number;
  skipped: number;
  error?: string;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { synced: 0, skipped: 0, error: 'Not authenticated' };

    // Fetch all categorized emails that have extracted_contacts
    const { data: rows, error: queryError } = await supabase
      .from('gmail_email_categories')
      .select('extracted_contacts')
      .eq('user_id', user.id)
      .not('extracted_contacts', 'eq', '[]');

    if (queryError) {
      log.error('[syncExtractedContactsToPlatform] Query error:', { error: queryError });
      return { synced: 0, skipped: 0, error: queryError.message };
    }

    if (!rows || rows.length === 0) {
      return { synced: 0, skipped: 0 };
    }

    // Collect unique contacts by email (lowercase)
    const uniqueContacts = new Map<string, ExtractedContact>();
    for (const row of rows) {
      const contacts = (row.extracted_contacts ?? []) as ExtractedContact[];
      for (const contact of contacts) {
        if (contact.email) {
          const key = contact.email.toLowerCase().trim();
          if (!uniqueContacts.has(key)) {
            uniqueContacts.set(key, contact);
          }
        }
      }
    }

    let synced = 0;
    let skipped = 0;

    for (const [, contact] of uniqueContacts) {
      const displayName = contact.name || contact.email;
      const { data, error: createError } = await findOrCreateContact(
        displayName,
        contact.email,
        null,
        'email',
        { discovered_from: 'email_intelligence' }
      );

      if (createError) {
        log.warn('[syncExtractedContactsToPlatform] Error for', contact.email, createError);
        skipped++;
        continue;
      }

      // findOrCreateContact returns null for self-contacts (self-exclusion)
      if (!data) {
        skipped++;
        continue;
      }

      synced++;
    }

    log.debug(`[syncExtractedContactsToPlatform] Done: synced=${synced}, skipped=${skipped}`);
    return { synced, skipped };
  } catch (err) {
    log.error('[syncExtractedContactsToPlatform] Exception:', { error: err });
    return { synced: 0, skipped: 0, error: err instanceof Error ? err.message : 'Erro inesperado' };
  }
}
