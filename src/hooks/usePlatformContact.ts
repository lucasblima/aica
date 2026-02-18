/**
 * usePlatformContact — hooks for platform contact management
 */

import { useState, useEffect, useCallback } from 'react';
import type { PlatformContact } from '@/services/platformContactService';
import {
  getContactsByOwner,
  getMyContactProfiles,
} from '@/services/platformContactService';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('usePlatformContact');

/** Single contact state */
export function usePlatformContact(contactId: string | null) {
  const [contact, setContact] = useState<PlatformContact | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!contactId) {
      setContact(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from('platform_contacts')
        .select('*')
        .eq('id', contactId)
        .single();

      if (dbError) {
        setError(dbError.message);
        return;
      }

      setContact(data as PlatformContact);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error('usePlatformContact refresh error:', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { contact, isLoading, error, refresh };
}

/** List of contacts for current owner */
export function usePlatformContacts(sourceModule?: PlatformContact['source_module']) {
  const [contacts, setContacts] = useState<PlatformContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: svcError } = await getContactsByOwner(sourceModule);
      if (svcError) {
        setError(svcError);
        return;
      }
      setContacts(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error('usePlatformContacts refresh error:', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [sourceModule]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { contacts, isLoading, error, refresh };
}

/** Contact profiles linked to current user (for portal pages) */
export function useMyContactProfiles() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: svcError } = await getMyContactProfiles();
      if (svcError) {
        setError(svcError);
        return;
      }
      setProfiles(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error('useMyContactProfiles refresh error:', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { profiles, isLoading, error, refresh };
}
