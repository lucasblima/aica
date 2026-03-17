/**
 * Cross-Module Service — Studio Module
 *
 * Provides cross-module integrations for the Studio module:
 *
 * 1. Connections -> Studio: Fetch contact data as guest info
 * 2. Agenda -> Studio: Sync recording dates to calendar (via Google Calendar)
 * 3. Journey -> Studio: Award CP for episode completion
 *
 * ARCHITECTURE: All cross-module integration uses SHARED SUPABASE TABLES.
 * We never import from other module's internal services or hooks.
 * This service is a thin data access layer over Supabase.
 *
 * @module studio/services/crossModuleService
 */

import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('StudioCrossModule');

/**
 * Sanitize search term to prevent PostgREST injection via special characters.
 * Removes characters that have special meaning in PostgREST/PostgreSQL LIKE patterns.
 */
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[%_,().]/g, '')
}

// =============================================================================
// TYPES
// =============================================================================

/** Contact data returned from Connections module tables */
export interface ContactAsGuest {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  topics: string[];
  source: 'contact_network' | 'connection_members';
}

/** Calendar event data for recording sync */
export interface CalendarEventResult {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  source: string;
}

/** Moment created for CP award */
export interface CPAwardResult {
  id: string;
  content: string;
  emotion: string;
  points: number;
}

// =============================================================================
// 1. CONNECTIONS -> STUDIO: Fetch contact as guest
// =============================================================================

/**
 * Search for a contact by name in the user's Connections data.
 *
 * Searches both `contact_network` (WhatsApp contacts with dossiers)
 * and `connection_members` (space members with external info).
 *
 * Returns matching contacts that can pre-fill guest info.
 *
 * @param contactName - Name to search for (case-insensitive partial match)
 * @param userId - The authenticated user's ID
 * @returns Array of matching contacts with available data
 */
export async function fetchContactAsGuest(
  contactName: string,
  userId: string
): Promise<ContactAsGuest[]> {
  if (!contactName.trim() || !userId) {
    return [];
  }

  const results: ContactAsGuest[] = [];
  const searchTerm = contactName.trim().toLowerCase();

  // Search contact_network table (WhatsApp contacts with dossier data)
  try {
    const { data: networkContacts, error: networkError } = await supabase
      .from('contact_network')
      .select('id, contact_name, name, contact_phone, whatsapp_phone, dossier_summary, dossier_topics')
      .eq('user_id', userId)
      .or(`contact_name.ilike.%${sanitizeSearchTerm(searchTerm)}%,name.ilike.%${sanitizeSearchTerm(searchTerm)}%`)
      .limit(5);

    if (networkError) {
      log.warn('Error searching contact_network:', networkError.message);
    } else if (networkContacts) {
      for (const contact of networkContacts) {
        results.push({
          id: contact.id,
          name: contact.name || contact.contact_name || '',
          email: null, // contact_network doesn't store email
          phone: contact.whatsapp_phone || contact.contact_phone || null,
          bio: contact.dossier_summary || null,
          topics: contact.dossier_topics || [],
          source: 'contact_network',
        });
      }
    }
  } catch (err) {
    log.warn('contact_network query failed (table may not exist):', err);
  }

  // Search connection_members table (space members with external info)
  // Filter by user's spaces to ensure user_id scoping
  try {
    const { data: userSpaces } = await supabase
      .from('connection_spaces')
      .select('id')
      .eq('user_id', userId);

    const spaceIds = userSpaces?.map(s => s.id) || [];

    if (spaceIds.length > 0) {
      const { data: members, error: memberError } = await supabase
        .from('connection_members')
        .select('id, external_name, external_email, external_phone, context_data, space_id')
        .eq('is_active', true)
        .in('space_id', spaceIds)
        .ilike('external_name', `%${sanitizeSearchTerm(searchTerm)}%`)
        .limit(5);

      if (memberError) {
        log.warn('Error searching connection_members:', memberError.message);
      } else if (members) {
        for (const member of members) {
          // Avoid duplicates (same name already found in contact_network)
          const alreadyFound = results.some(
            (r) => r.name.toLowerCase() === (member.external_name || '').toLowerCase()
          );
          if (!alreadyFound && member.external_name) {
            const contextData = (member.context_data || {}) as Record<string, unknown>;
            results.push({
              id: member.id,
              name: member.external_name,
              email: member.external_email || null,
              phone: member.external_phone || null,
              bio: (contextData.bio as string) || (contextData.occupation as string) || null,
              topics: [],
              source: 'connection_members',
            });
          }
        }
      }
    }
  } catch (err) {
    log.warn('connection_members query failed (table may not exist):', err);
  }

  return results;
}

// =============================================================================
// 2. AGENDA -> STUDIO: Sync recording to calendar
// =============================================================================

/**
 * Sync a recording date to the user's calendar.
 *
 * Since the `calendar_events` table may not exist (the Agenda module
 * uses Google Calendar sync via calendarSyncService), this function
 * inserts into `calendar_events` if available, providing a local
 * calendar record alongside the Google Calendar sync that already
 * happens in workspaceDatabaseService.
 *
 * @param episode - Episode scheduling data
 * @param userId - The authenticated user's ID
 * @returns The created calendar event, or null if sync is not available
 */
export async function syncRecordingToCalendar(
  episode: {
    title: string;
    scheduledDate: string;
    scheduledTime?: string;
    guestName?: string;
    location?: string;
  },
  userId: string
): Promise<CalendarEventResult | null> {
  if (!episode.scheduledDate || !userId) {
    return null;
  }

  const guestLabel = episode.guestName ? ` com ${episode.guestName}` : '';
  const title = `Gravação: ${episode.title || 'Episódio'}${guestLabel}`;

  // Build start_time as ISO string
  const time = episode.scheduledTime || '10:00';
  const startIso = `${episode.scheduledDate}T${time}:00`;

  // End time = start + 90 minutes
  const startDate = new Date(startIso);
  const endDate = new Date(startDate.getTime() + 90 * 60 * 1000);
  const endIso = endDate.toISOString();

  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .insert({
        user_id: userId,
        title,
        start_time: startIso,
        end_time: endIso,
        event_type: 'recording',
        source: 'studio',
        location: episode.location || null,
        description: `Gravação do episódio${guestLabel}. Criado pelo Studio.`,
      })
      .select('id, title, start_time, end_time, source')
      .single();

    if (error) {
      // Table may not exist yet — graceful degradation
      log.warn('calendar_events insert failed (table may not exist):', error.message);
      return null;
    }

    log.debug('Recording synced to calendar:', data?.id);
    return data as CalendarEventResult;
  } catch (err) {
    log.warn('Calendar sync failed gracefully:', err);
    return null;
  }
}

// =============================================================================
// 3. JOURNEY -> STUDIO: Award CP for episode completion
// =============================================================================

/**
 * Award Consciousness Points (CP) when an episode is published.
 *
 * Creates a moment in the `moments` table with achievement category
 * and pride emotion, representing a significant creative accomplishment.
 *
 * @param episode - Episode data (id, title, status)
 * @param userId - The authenticated user's ID
 * @returns The CP award result, or null if award failed
 */
export async function awardEpisodeCompletionCP(
  episode: {
    id: string;
    title: string;
    status: string;
  },
  userId: string
): Promise<CPAwardResult | null> {
  if (episode.status !== 'published' || !userId) {
    return null;
  }

  // Check if CP was already awarded for this episode (prevent duplicates)
  try {
    const { data: existing } = await supabase
      .from('moments')
      .select('id')
      .eq('user_id', userId)
      .contains('tags', [`#episode:${episode.id}`])
      .limit(1);

    if (existing && existing.length > 0) {
      log.debug('CP already awarded for episode:', episode.id);
      return null;
    }
  } catch (err) {
    log.warn('CP duplicate check failed, proceeding with insert:', err)
  }

  const CP_AMOUNT = 15;

  try {
    const { data, error } = await supabase
      .from('moments')
      .insert({
        user_id: userId,
        type: 'text',
        content: `Episódio publicado: ${episode.title}`,
        emotion: 'proud',
        tags: ['#vitoria', '#studio', '#publicacao', `#episode:${episode.id}`],
      })
      .select('id, content, emotion')
      .single();

    if (error) {
      log.warn('moments insert failed (table may not exist):', error.message);
      return null;
    }

    log.debug('CP awarded for episode publication:', { episodeId: episode.id, momentId: data?.id });

    return {
      id: data.id,
      content: data.content,
      emotion: data.emotion || 'proud',
      points: CP_AMOUNT,
    };
  } catch (err) {
    log.warn('CP award failed gracefully:', err);
    return null;
  }
}
