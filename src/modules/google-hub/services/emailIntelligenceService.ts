/**
 * Email Intelligence Service
 *
 * Calls the email-intelligence Edge Function for AI-powered categorization,
 * task extraction, and contact enrichment. Also queries local DB for results.
 */

import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type { EmailCategory, CategorizedEmail, ExtractedTask, ContactEnrichment } from '../types';

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

    if (error) {
      log.error('[categorizeInbox] Edge Function error:', { error });
      return { categorized: 0, error: error.message };
    }

    if (!data?.success) {
      log.warn('[categorizeInbox] API error:', data?.error);
      return { categorized: 0, error: data?.error || 'Erro na categorizacao' };
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
      body: { action: 'get_message_body', message_id: messageId },
    });

    if (error) {
      log.error('[getMessageBody] Edge Function error:', { error });
      return null;
    }

    return data?.success ? (data.body ?? null) : null;
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
