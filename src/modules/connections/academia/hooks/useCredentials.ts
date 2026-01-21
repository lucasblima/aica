/**
 * useCredentials Hook
 *
 * Manages academic credentials with expiration tracking.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { credentialService } from '../services/credentialService';
import type {
import { createNamespacedLogger } from '@/lib/logger';
const log = createNamespacedLogger('useCredentials');
  AcademiaCredential,
  CreateCredentialPayload,
  UpdateCredentialPayload,
  CredentialType,
} from '../types';

interface UseCredentialsOptions {
  spaceId: string;
  journeyId?: string;
  credentialType?: CredentialType;
  autoFetch?: boolean;
}

interface UseCredentialsReturn {
  credentials: AcademiaCredential[];
  loading: boolean;
  error: Error | null;
  createCredential: (payload: CreateCredentialPayload) => Promise<AcademiaCredential>;
  updateCredential: (
    id: string,
    payload: UpdateCredentialPayload
  ) => Promise<AcademiaCredential>;
  deleteCredential: (id: string) => Promise<void>;
  isExpired: (credential: AcademiaCredential) => boolean;
  isExpiringSoon: (credential: AcademiaCredential) => boolean;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing Academia credentials
 *
 * @example
 * ```tsx
 * const { credentials, loading, createCredential, isExpired } = useCredentials({
 *   spaceId: 'space-123',
 *   credentialType: 'certificate'
 * });
 *
 * // Create a new credential
 * await createCredential({
 *   title: 'AWS Certified Developer',
 *   issuer: 'Amazon Web Services',
 *   credential_type: 'certificate',
 *   issued_at: '2024-01-15',
 *   expires_at: '2027-01-15'
 * });
 * ```
 */
export function useCredentials(options: UseCredentialsOptions): UseCredentialsReturn {
  const { user } = useAuth();
  const { spaceId, journeyId, credentialType, autoFetch = true } = options;

  const [credentials, setCredentials] = useState<AcademiaCredential[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch credentials
  const fetchCredentials = useCallback(async () => {
    if (!user?.id || !spaceId) return;

    try {
      setLoading(true);
      setError(null);

      let data: AcademiaCredential[];

      if (journeyId) {
        data = await credentialService.getCredentialsByJourney(journeyId);
      } else if (credentialType) {
        data = await credentialService.getCredentialsByType(spaceId, credentialType);
      } else {
        data = await credentialService.getCredentials(spaceId);
      }

      setCredentials(data);
    } catch (err) {
      setError(err as Error);
      log.error('Error fetching credentials:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, spaceId, journeyId, credentialType]);

  // Create new credential
  const createCredential = useCallback(
    async (payload: CreateCredentialPayload): Promise<AcademiaCredential> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        setLoading(true);
        setError(null);

        const newCredential = await credentialService.createCredential(spaceId, payload);

        // Add to list if it matches current filter
        const matchesFilter =
          (!journeyId || newCredential.journey_id === journeyId) &&
          (!credentialType || newCredential.credential_type === credentialType);

        if (matchesFilter) {
          setCredentials((prev) => [newCredential, ...prev]);
        }

        return newCredential;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id, spaceId, journeyId, credentialType]
  );

  // Update credential
  const updateCredential = useCallback(
    async (
      id: string,
      payload: UpdateCredentialPayload
    ): Promise<AcademiaCredential> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        setLoading(true);
        setError(null);

        const updatedCredential = await credentialService.updateCredential(id, payload);

        setCredentials((prev) =>
          prev.map((credential) =>
            credential.id === id ? updatedCredential : credential
          )
        );

        return updatedCredential;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  // Delete credential
  const deleteCredential = useCallback(
    async (id: string): Promise<void> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        setLoading(true);
        setError(null);

        await credentialService.deleteCredential(id);

        setCredentials((prev) => prev.filter((credential) => credential.id !== id));
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  // Check if expired
  const isExpired = useCallback((credential: AcademiaCredential): boolean => {
    return credentialService.isExpired(credential);
  }, []);

  // Check if expiring soon
  const isExpiringSoon = useCallback((credential: AcademiaCredential): boolean => {
    return credentialService.isExpiringSoon(credential);
  }, []);

  // Refresh credentials
  const refresh = useCallback(async () => {
    await fetchCredentials();
  }, [fetchCredentials]);

  // Auto-fetch on mount and dependencies change
  useEffect(() => {
    if (autoFetch && user?.id && spaceId) {
      fetchCredentials();
    }
  }, [autoFetch, user?.id, spaceId, fetchCredentials]);

  return {
    credentials,
    loading,
    error,
    createCredential,
    updateCredential,
    deleteCredential,
    isExpired,
    isExpiringSoon,
    refresh,
  };
}

export default useCredentials;
