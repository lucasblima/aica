/**
 * Google Contacts Service
 * Handles synchronization with Google People API v1
 * https://developers.google.com/people/api/rest/v1
 */

import { supabase } from './supabaseClient';
import { getValidAccessToken } from './googleCalendarTokenService';
import { findOrCreateContact, enrichContactFromGoogle } from './platformContactService';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('GoogleContactsService');


/**
 * Google Person structure from People API
 */
export interface GooglePerson {
  resourceName: string; // e.g., "people/c1234567890"
  etag: string;
  names?: Array<{
    displayName: string;
    familyName?: string;
    givenName?: string;
  }>;
  emailAddresses?: Array<{
    value: string;
    type?: string; // 'home', 'work', 'other'
  }>;
  phoneNumbers?: Array<{
    value: string;
    type?: string;
  }>;
  photos?: Array<{
    url: string;
  }>;
}

/**
 * Sync report with statistics
 */
export interface SyncReport {
  total: number;
  created: number;
  updated: number;
  errors: number;
  errorDetails: string[];
  duration: number; // milliseconds
}

/**
 * Sync all Google Contacts for current user
 * Uses pagination to handle large contact lists
 *
 * Rate limit: 600 requests/min/user (Google People API)
 */
export async function syncGoogleContacts(): Promise<SyncReport> {
  const startTime = Date.now();
  const report: SyncReport = {
    total: 0,
    created: 0,
    updated: 0,
    errors: 0,
    errorDetails: [],
    duration: 0,
  };

  try {
    // Get access token from stored credentials
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      throw new Error('No Google access token available. Please authorize Google Contacts.');
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    // Fetch existing contacts
    const existingContacts = await getUserContacts(user.id);
    const contactMap = new Map(
      existingContacts.map(c => [
        `${c.email || c.phone_number}`,
        c
      ])
    );

    // Fetch Google Contacts with pagination
    const allPeople: GooglePerson[] = [];
    let pageToken: string | undefined;
    let pageCount = 0;

    do {
      try {
        const url = new URL('https://people.googleapis.com/v1/people/me/connections');
        url.searchParams.set('pageSize', '1000');
        url.searchParams.set('personFields', 'names,emailAddresses,phoneNumbers,photos');
        if (pageToken) {
          url.searchParams.set('pageToken', pageToken);
        }

        const response = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
          const error = await response.json();
          report.errorDetails.push(
            `Page ${pageCount}: ${error.error?.message || response.statusText}`
          );
          report.errors++;
          break;
        }

        const data = await response.json();
        allPeople.push(...(data.connections || []));
        pageToken = data.nextPageToken;
        pageCount++;

        log.debug(
          `[googleContactsService] Fetched page ${pageCount}: ${(data.connections || []).length} contacts`
        );
      } catch (pageError) {
        log.error('[googleContactsService] Error fetching page:', { error: pageError });
        report.errorDetails.push(`Page fetch error: ${String(pageError)}`);
        report.errors++;
        break;
      }
    } while (pageToken);

    report.total = allPeople.length;
    log.debug(`[googleContactsService] Total contacts fetched: ${report.total}`);

    // Get current user's email to exclude self-contacts
    const currentUserEmail = user?.email?.toLowerCase();

    // Process each contact
    for (const person of allPeople) {
      try {
        const email = person.emailAddresses?.[0]?.value;
        const phone = person.phoneNumbers?.[0]?.value;
        const name = person.names?.[0]?.displayName;
        const photo = person.photos?.[0]?.url;

        // Skip if no name or contact info
        if (!name || (!email && !phone)) {
          continue;
        }

        // Skip self-contacts: don't add the user as their own contact
        if (email && currentUserEmail && email.toLowerCase() === currentUserEmail) {
          continue;
        }

        const matchKey = `${email || phone}`;
        const existing = contactMap.get(matchKey);

        if (existing) {
          // Update existing contact
          const { error } = await supabase
            .from('contact_network')
            .update({
              name,
              email: email || existing.email,
              phone_number: phone || existing.phone_number,
              avatar_url: photo || existing.avatar_url,
              google_contact_id: person.resourceName,
              google_resource_name: person.resourceName,
              last_synced_at: new Date().toISOString(),
              sync_source: 'google',
            })
            .eq('id', existing.id);

          if (error) {
            report.errorDetails.push(`Update ${name}: ${error.message}`);
            report.errors++;
          } else {
            report.updated++;
          }
        } else {
          // Create new contact
          const { error } = await supabase
            .from('contact_network')
            .insert({
              user_id: user.id,
              name,
              email,
              phone_number: phone,
              avatar_url: photo,
              google_contact_id: person.resourceName,
              google_resource_name: person.resourceName,
              last_synced_at: new Date().toISOString(),
              sync_source: 'google',
              relationship_type: 'contact',
            });

          if (error) {
            report.errorDetails.push(`Create ${name}: ${error.message}`);
            report.errors++;
          } else {
            report.created++;
          }
        }
      } catch (contactError) {
        log.error('[googleContactsService] Error processing contact:', { error: contactError });
        report.errorDetails.push(`Contact processing error: ${String(contactError)}`);
        report.errors++;
      }
    }

    report.duration = Date.now() - startTime;
    log.debug('[googleContactsService] Sync complete:', report);

    return report;
  } catch (error) {
    log.error('[googleContactsService] Sync failed:', { error: error });
    report.duration = Date.now() - startTime;
    report.errors++;
    report.errorDetails.push(`Sync failed: ${String(error)}`);
    throw error;
  }
}

/**
 * Sync Google Contacts to the unified platform_contacts table
 * Runs in parallel with the existing syncGoogleContacts() which targets contact_network
 */
export async function syncGoogleContactsToPlatform(): Promise<SyncReport> {
  const startTime = Date.now();
  const report: SyncReport = {
    total: 0,
    created: 0,
    updated: 0,
    errors: 0,
    errorDetails: [],
    duration: 0,
  };

  try {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      throw new Error('No Google access token available. Please authorize Google Contacts.');
    }

    // Fetch Google Contacts with pagination
    const allPeople: GooglePerson[] = [];
    let pageToken: string | undefined;
    let pageCount = 0;

    do {
      try {
        const url = new URL('https://people.googleapis.com/v1/people/me/connections');
        url.searchParams.set('pageSize', '1000');
        url.searchParams.set('personFields', 'names,emailAddresses,phoneNumbers,photos');
        if (pageToken) {
          url.searchParams.set('pageToken', pageToken);
        }

        const response = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
          const error = await response.json();
          report.errorDetails.push(
            `Page ${pageCount}: ${error.error?.message || response.statusText}`
          );
          report.errors++;
          break;
        }

        const data = await response.json();
        allPeople.push(...(data.connections || []));
        pageToken = data.nextPageToken;
        pageCount++;

        log.debug(
          `[googleContactsService] Platform sync fetched page ${pageCount}: ${(data.connections || []).length} contacts`
        );
      } catch (pageError) {
        log.error('[googleContactsService] Platform sync page fetch error:', { error: pageError });
        report.errorDetails.push(`Page fetch error: ${String(pageError)}`);
        report.errors++;
        break;
      }
    } while (pageToken);

    report.total = allPeople.length;
    log.debug(`[googleContactsService] Platform sync total contacts: ${report.total}`);

    // Get current user's email to exclude self-contacts
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserEmail = user?.email?.toLowerCase();

    // Process each contact into platform_contacts
    for (const person of allPeople) {
      try {
        const email = person.emailAddresses?.[0]?.value;
        const phone = person.phoneNumbers?.[0]?.value;
        const name = person.names?.[0]?.displayName;
        const photo = person.photos?.[0]?.url;
        const resourceName = person.resourceName;

        // Skip if no name or contact info
        if (!name || (!email && !phone)) {
          continue;
        }

        // Skip self-contacts: don't add the user as their own contact
        if (email && currentUserEmail && email.toLowerCase() === currentUserEmail) {
          continue;
        }

        // Find or create the contact in platform_contacts
        const { data: contact, error: findError } = await findOrCreateContact(
          name,
          email,
          phone,
          'manual',
          { google_resource_name: resourceName }
        );

        if (findError || !contact) {
          report.errorDetails.push(`findOrCreate ${name}: ${findError || 'No data returned'}`);
          report.errors++;
          continue;
        }

        // Enrich with Google-specific data
        const { error: enrichError } = await enrichContactFromGoogle(
          contact.id,
          resourceName,
          photo
        );

        if (enrichError) {
          report.errorDetails.push(`enrich ${name}: ${enrichError}`);
          report.errors++;
          continue;
        }

        // Determine if this was a new create or update based on whether
        // the contact already had a google_resource_name
        if (contact.google_resource_name) {
          report.updated++;
        } else {
          report.created++;
        }
      } catch (contactError) {
        log.error('[googleContactsService] Platform sync contact error:', { error: contactError });
        report.errorDetails.push(`Contact processing error: ${String(contactError)}`);
        report.errors++;
      }
    }

    report.duration = Date.now() - startTime;
    log.debug('[googleContactsService] Platform sync complete:', report);

    return report;
  } catch (error) {
    log.error('[googleContactsService] Platform sync failed:', { error });
    report.duration = Date.now() - startTime;
    report.errors++;
    report.errorDetails.push(`Platform sync failed: ${String(error)}`);
    throw error;
  }
}

/**
 * Fetch user's contacts from database
 */
export async function getUserContacts(userId: string) {
  const { data, error } = await supabase
    .from('contact_network')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  if (error) {
    log.error('[googleContactsService] Error fetching contacts:', { error: error });
    throw error;
  }

  return data || [];
}

/**
 * Search contacts by name or email
 */
export async function searchContacts(query: string, userId: string) {
  const { data, error } = await supabase
    .from('contact_network')
    .select('*')
    .eq('user_id', userId)
    .or(
      `name.ilike.%${query}%,email.ilike.%${query}%,phone_number.ilike.%${query}%`
    )
    .order('name', { ascending: true });

  if (error) {
    log.error('[googleContactsService] Error searching contacts:', { error: error });
    throw error;
  }

  return data || [];
}

/**
 * Get single contact with full details
 */
export async function getContact(contactId: string) {
  const { data, error } = await supabase
    .from('contact_network')
    .select('*')
    .eq('id', contactId)
    .single();

  if (error) {
    log.error('[googleContactsService] Error fetching contact:', { error: error });
    throw error;
  }

  return data;
}

/**
 * Update contact notes or custom fields
 */
export async function updateContact(contactId: string, updates: Record<string, any>) {
  const { data, error } = await supabase
    .from('contact_network')
    .update(updates)
    .eq('id', contactId)
    .select()
    .single();

  if (error) {
    log.error('[googleContactsService] Error updating contact:', { error: error });
    throw error;
  }

  return data;
}

/**
 * Delete contact
 */
export async function deleteContact(contactId: string) {
  const { error } = await supabase
    .from('contact_network')
    .delete()
    .eq('id', contactId);

  if (error) {
    log.error('[googleContactsService] Error deleting contact:', { error: error });
    throw error;
  }
}

/**
 * Get contacts that need syncing (older than 24 hours)
 */
export async function getContactsNeedingSync(userId: string) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('contact_network')
    .select('*')
    .eq('user_id', userId)
    .eq('sync_source', 'google')
    .lt('last_synced_at', oneDayAgo);

  if (error) {
    log.error('[googleContactsService] Error fetching contacts to sync:', { error: error });
    throw error;
  }

  return data || [];
}
