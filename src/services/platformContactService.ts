/**
 * Platform Contact Service
 * Unified contact management across AICA modules (Studio, Flux, Connections, Grants)
 */

import { supabase } from './supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('platformContactService');

export interface PlatformContact {
  id: string;
  owner_id: string;
  auth_user_id: string | null;
  display_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  source_module: 'studio' | 'flux' | 'connections' | 'grants' | 'manual';
  invitation_status: 'none' | 'pending' | 'sent' | 'connected';
  linked_at: string | null;
  invitation_sent_at: string | null;
  metadata: Record<string, any>;
  google_resource_name: string | null;
  last_synced_at: string | null;
  sync_source: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactProfile {
  contact: PlatformContact;
  owner_name: string;
  owner_email: string;
}

/** Find existing or create new contact (deduplicates by owner+email) */
export async function findOrCreateContact(
  displayName: string,
  email?: string | null,
  phone?: string | null,
  sourceModule: PlatformContact['source_module'] = 'manual',
  metadata: Record<string, any> = {}
): Promise<{ data: PlatformContact | null; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Not authenticated' };

    const { data, error } = await supabase.rpc('find_or_create_contact', {
      p_owner_id: user.id,
      p_display_name: displayName,
      p_email: email || null,
      p_phone: phone || null,
      p_source_module: sourceModule,
      p_metadata: metadata,
    });

    if (error) {
      log.error('find_or_create_contact RPC error:', error);
      return { data: null, error: error.message };
    }

    return { data: data as PlatformContact, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error('findOrCreateContact error:', message);
    return { data: null, error: message };
  }
}

/** Get contacts owned by the current user, optionally filtered by source module */
export async function getContactsByOwner(
  sourceModule?: PlatformContact['source_module']
): Promise<{ data: PlatformContact[]; error: string | null }> {
  try {
    let query = supabase
      .from('platform_contacts')
      .select('*')
      .order('created_at', { ascending: false });

    if (sourceModule) {
      query = query.eq('source_module', sourceModule);
    }

    const { data, error } = await query;

    if (error) {
      log.error('getContactsByOwner error:', error);
      return { data: [], error: error.message };
    }

    return { data: data as PlatformContact[], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error('getContactsByOwner error:', message);
    return { data: [], error: message };
  }
}

/** Send a module-specific invite email via Edge Function */
export async function sendModuleInvite(
  contactId: string,
  module: string,
  portalPath: string,
  customMessage?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-module-invite', {
      body: { contactId, module, portalPath, customMessage },
    });

    if (error) {
      log.error('sendModuleInvite error:', error);
      return { success: false, error: error.message };
    }

    return { success: data?.success ?? false, error: data?.error };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error('sendModuleInvite error:', message);
    return { success: false, error: message };
  }
}

/** Get contact profiles linked to the current user (for portal pages) */
export async function getMyContactProfiles(): Promise<{
  data: any[] | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase.rpc('get_my_contact_profiles');

    if (error) {
      log.error('getMyContactProfiles error:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error('getMyContactProfiles error:', message);
    return { data: null, error: message };
  }
}

/** Enrich an existing platform contact with Google Contacts data */
export async function enrichContactFromGoogle(
  contactId: string,
  googleResourceName: string,
  avatarUrl?: string | null
): Promise<{ data: PlatformContact | null; error: string | null }> {
  try {
    const updates: Record<string, any> = {
      google_resource_name: googleResourceName,
      last_synced_at: new Date().toISOString(),
      sync_source: 'google',
      updated_at: new Date().toISOString(),
    };

    // Only set avatar_url if provided and contact doesn't already have one
    if (avatarUrl) {
      // Fetch current contact to check existing avatar
      const { data: current, error: fetchError } = await supabase
        .from('platform_contacts')
        .select('avatar_url')
        .eq('id', contactId)
        .single();

      if (fetchError) {
        log.error('enrichContactFromGoogle fetch error:', fetchError);
        return { data: null, error: fetchError.message };
      }

      if (!current?.avatar_url) {
        updates.avatar_url = avatarUrl;
      }
    }

    const { data, error } = await supabase
      .from('platform_contacts')
      .update(updates)
      .eq('id', contactId)
      .select()
      .single();

    if (error) {
      log.error('enrichContactFromGoogle update error:', error);
      return { data: null, error: error.message };
    }

    return { data: data as PlatformContact, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error('enrichContactFromGoogle error:', message);
    return { data: null, error: message };
  }
}

/** Update an existing contact */
export async function updateContact(
  contactId: string,
  updates: Partial<Pick<PlatformContact, 'display_name' | 'email' | 'phone' | 'avatar_url' | 'bio' | 'metadata'>>
): Promise<{ data: PlatformContact | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('platform_contacts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', contactId)
      .select()
      .single();

    if (error) {
      log.error('updateContact error:', error);
      return { data: null, error: error.message };
    }

    return { data: data as PlatformContact, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error('updateContact error:', message);
    return { data: null, error: message };
  }
}
