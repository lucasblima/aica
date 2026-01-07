/**
 * Contact Sync Orchestrator Service
 * Manages synchronization between Google Contacts and WhatsApp/Evolution API
 * Handles deduplication, merging, and conflict resolution
 */

import { supabase } from './supabaseClient';
import { syncGoogleContacts, SyncReport as GoogleSyncReport } from './googleContactsService';

/**
 * Comprehensive sync report combining all sources
 */
export interface FullSyncReport {
  google: GoogleSyncReport;
  whatsapp: {
    total: number;
    merged: number;
    errors: number;
  };
  deduplication: {
    duplicatesFound: number;
    merged: number;
    errors: number;
  };
  overallStatus: 'success' | 'partial' | 'failed';
  totalDuration: number;
}

/**
 * Execute full synchronization (Google + WhatsApp)
 * This is the main entry point for contact sync
 */
export async function fullSync(): Promise<FullSyncReport> {
  const startTime = Date.now();

  const report: FullSyncReport = {
    google: {
      total: 0,
      created: 0,
      updated: 0,
      errors: 0,
      errorDetails: [],
      duration: 0,
    },
    whatsapp: {
      total: 0,
      merged: 0,
      errors: 0,
    },
    deduplication: {
      duplicatesFound: 0,
      merged: 0,
      errors: 0,
    },
    overallStatus: 'success',
    totalDuration: 0,
  };

  try {
    // Step 1: Sync from Google Contacts
    console.log('[contactSyncService] Starting full sync: Google + WhatsApp...');
    try {
      report.google = await syncGoogleContacts();
      console.log('[contactSyncService] Google sync complete:', report.google);
    } catch (error) {
      console.error('[contactSyncService] Google sync failed:', error);
      report.google.errors++;
      report.overallStatus = 'partial';
    }

    // Step 2: Merge with WhatsApp contacts (already synced via Evolution API)
    try {
      const mergeResult = await mergeWhatsAppContacts();
      report.whatsapp = mergeResult;
      console.log('[contactSyncService] WhatsApp merge complete:', mergeResult);
    } catch (error) {
      console.error('[contactSyncService] WhatsApp merge failed:', error);
      report.whatsapp.errors++;
      report.overallStatus = 'partial';
    }

    // Step 3: Deduplicate contacts
    try {
      const dedupResult = await deduplicateAllContacts();
      report.deduplication = dedupResult;
      console.log('[contactSyncService] Deduplication complete:', dedupResult);
    } catch (error) {
      console.error('[contactSyncService] Deduplication failed:', error);
      report.deduplication.errors++;
      report.overallStatus = 'partial';
    }

    // Overall status
    if (
      report.google.errors === 0 &&
      report.whatsapp.errors === 0 &&
      report.deduplication.errors === 0
    ) {
      report.overallStatus = 'success';
    }

    report.totalDuration = Date.now() - startTime;
    console.log('[contactSyncService] Full sync complete:', report);

    return report;
  } catch (error) {
    console.error('[contactSyncService] Full sync failed:', error);
    report.overallStatus = 'failed';
    report.totalDuration = Date.now() - startTime;
    throw error;
  }
}

/**
 * Incremental sync - only fetch and merge recent changes
 * Useful for periodic background syncs
 */
export async function incrementalSync(): Promise<FullSyncReport> {
  console.log('[contactSyncService] Starting incremental sync...');
  // Similar to fullSync but with WHERE last_synced_at < NOW() - 24h
  // For now, delegates to fullSync
  return fullSync();
}

/**
 * Merge WhatsApp contacts with existing Google contacts
 * Prefers Google data for metadata, Evolution for interaction history
 */
async function mergeWhatsAppContacts(): Promise<{
  total: number;
  merged: number;
  errors: number;
}> {
  const result = { total: 0, merged: 0, errors: 0 };

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return result;

    // Fetch WhatsApp contacts (sync_source = 'evolution' or 'whatsapp')
    const { data: whatsappContacts, error: whatsappError } = await supabase
      .from('contact_network')
      .select('*')
      .eq('user_id', user.id)
      .in('sync_source', ['evolution', 'whatsapp']);

    if (whatsappError) {
      console.error('[contactSyncService] Error fetching WhatsApp contacts:', whatsappError);
      result.errors++;
      return result;
    }

    result.total = whatsappContacts?.length || 0;

    // Fetch Google contacts
    const { data: googleContacts, error: googleError } = await supabase
      .from('contact_network')
      .select('*')
      .eq('user_id', user.id)
      .eq('sync_source', 'google');

    if (googleError) {
      console.error('[contactSyncService] Error fetching Google contacts:', googleError);
      result.errors++;
      return result;
    }

    // Match and merge
    for (const whatsappContact of whatsappContacts || []) {
      const googleMatch = (googleContacts || []).find(
        g =>
          (g.phone_number && g.phone_number === whatsappContact.phone_number) ||
          (g.email && g.email === whatsappContact.email)
      );

      if (googleMatch) {
        // Merge: Keep Google metadata, preserve WhatsApp interaction data
        const { error: updateError } = await supabase
          .from('contact_network')
          .update({
            // Keep Google's metadata (name, avatar, email) as primary
            name: googleMatch.name || whatsappContact.name,
            avatar_url: googleMatch.avatar_url || whatsappContact.avatar_url,
            email: googleMatch.email || whatsappContact.email,
            // Preserve WhatsApp interaction history
            last_interaction_at: whatsappContact.last_interaction_at,
            interaction_count: whatsappContact.interaction_count,
            interaction_topics: whatsappContact.interaction_topics,
            // Mark as merged
            sync_source: 'google+whatsapp',
          })
          .eq('id', whatsappContact.id);

        if (updateError) {
          console.error('[contactSyncService] Merge error:', updateError);
          result.errors++;
        } else {
          result.merged++;
        }
      }
    }

    console.log('[contactSyncService] WhatsApp merge complete:', result);
    return result;
  } catch (error) {
    console.error('[contactSyncService] WhatsApp merge failed:', error);
    result.errors++;
    return result;
  }
}

/**
 * Find and deduplicate contacts by email or phone
 * Keeps the one with more metadata, deletes duplicates
 */
async function deduplicateAllContacts(): Promise<{
  duplicatesFound: number;
  merged: number;
  errors: number;
}> {
  const result = { duplicatesFound: 0, merged: 0, errors: 0 };

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return result;

    // Fetch all contacts
    const { data: allContacts, error: fetchError } = await supabase
      .from('contact_network')
      .select('*')
      .eq('user_id', user.id);

    if (fetchError) {
      console.error('[contactSyncService] Error fetching contacts for dedup:', fetchError);
      result.errors++;
      return result;
    }

    if (!allContacts || allContacts.length === 0) {
      return result;
    }

    // Build map of email/phone → contacts
    const emailMap = new Map<string, any[]>();
    const phoneMap = new Map<string, any[]>();

    for (const contact of allContacts) {
      if (contact.email) {
        const existing = emailMap.get(contact.email) || [];
        existing.push(contact);
        emailMap.set(contact.email, existing);
      }
      if (contact.phone_number) {
        const existing = phoneMap.get(contact.phone_number) || [];
        existing.push(contact);
        phoneMap.set(contact.phone_number, existing);
      }
    }

    // Find and merge duplicates
    const processedIds = new Set<string>();

    // By email duplicates
    for (const [, contactGroup] of emailMap) {
      if (contactGroup.length > 1) {
        result.duplicatesFound++;
        const merged = await mergeDuplicateContacts(contactGroup, processedIds);
        if (merged) result.merged++;
        else result.errors++;
      }
    }

    // By phone duplicates (skip already processed)
    for (const [, contactGroup] of phoneMap) {
      if (contactGroup.length > 1 && !contactGroup.every(c => processedIds.has(c.id))) {
        result.duplicatesFound++;
        const merged = await mergeDuplicateContacts(
          contactGroup.filter(c => !processedIds.has(c.id)),
          processedIds
        );
        if (merged) result.merged++;
        else result.errors++;
      }
    }

    console.log('[contactSyncService] Deduplication complete:', result);
    return result;
  } catch (error) {
    console.error('[contactSyncService] Deduplication failed:', error);
    result.errors++;
    return result;
  }
}

/**
 * Merge duplicate contacts
 * Keeps primary contact, deletes duplicates
 */
async function mergeDuplicateContacts(
  contacts: any[],
  processedIds: Set<string>
): Promise<boolean> {
  try {
    // Sort by completeness: prefer Google sync + more data
    const sorted = contacts.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      if (a.sync_source === 'google') scoreA += 10;
      if (b.sync_source === 'google') scoreB += 10;

      if (a.avatar_url) scoreA += 3;
      if (b.avatar_url) scoreB += 3;

      if (a.last_interaction_at) scoreA += 2;
      if (b.last_interaction_at) scoreB += 2;

      return scoreB - scoreA;
    });

    const primary = sorted[0];
    const duplicates = sorted.slice(1);

    // Delete duplicates
    for (const dup of duplicates) {
      const { error } = await supabase
        .from('contact_network')
        .delete()
        .eq('id', dup.id);

      if (error) {
        console.error('[contactSyncService] Error deleting duplicate:', error);
        return false;
      }

      processedIds.add(dup.id);
    }

    processedIds.add(primary.id);
    return true;
  } catch (error) {
    console.error('[contactSyncService] Error merging duplicates:', error);
    return false;
  }
}

/**
 * Get sync statistics for dashboard
 */
export async function getSyncStats() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('contact_network')
    .select('sync_source, last_synced_at')
    .eq('user_id', user.id);

  if (error) {
    console.error('[contactSyncService] Error getting sync stats:', error);
    return null;
  }

  const stats = {
    total: data?.length || 0,
    fromGoogle: data?.filter(c => c.sync_source === 'google').length || 0,
    fromWhatsApp: data?.filter(c => c.sync_source === 'evolution' || c.sync_source === 'whatsapp').length || 0,
    merged: data?.filter(c => c.sync_source === 'google+whatsapp').length || 0,
    lastSync: data
      ?.filter(c => c.last_synced_at)
      .sort((a, b) => new Date(b.last_synced_at).getTime() - new Date(a.last_synced_at).getTime())[0]
      ?.last_synced_at || null,
  };

  return stats;
}
