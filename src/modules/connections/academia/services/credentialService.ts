import { supabase } from '@/lib/supabase';
import type {
  AcademiaCredential,
  CreateCredentialPayload,
  UpdateCredentialPayload,
  CredentialType,
} from '../types';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('credentialService');

/**
 * Credential Service
 *
 * Handles all CRUD operations and business logic for Academia credentials.
 * Manages certificates, diplomas, badges, publications, and awards.
 */
export const credentialService = {
  /**
   * Get all credentials for a space
   * Ordered by issue date (most recent first)
   */
  async getCredentials(spaceId: string): Promise<AcademiaCredential[]> {
    try {
      const { data, error } = await supabase
        .from('academia_credentials')
        .select('*')
        .eq('space_id', spaceId)
        .order('issued_at', { ascending: false });

      if (error) {
        log.error('Error fetching credentials:', error);
        throw new Error(`Failed to fetch credentials: ${error.message}`);
      }

      return data as AcademiaCredential[];
    } catch (error) {
      log.error('Error in getCredentials:', error);
      throw error;
    }
  },

  /**
   * Get credentials by type
   */
  async getCredentialsByType(
    spaceId: string,
    credentialType: CredentialType
  ): Promise<AcademiaCredential[]> {
    try {
      const { data, error } = await supabase
        .from('academia_credentials')
        .select('*')
        .eq('space_id', spaceId)
        .eq('credential_type', credentialType)
        .order('issued_at', { ascending: false });

      if (error) {
        log.error('Error fetching credentials by type:', error);
        throw new Error(
          `Failed to fetch ${credentialType} credentials: ${error.message}`
        );
      }

      return data as AcademiaCredential[];
    } catch (error) {
      log.error('Error in getCredentialsByType:', error);
      throw error;
    }
  },

  /**
   * Get credentials for a specific journey
   */
  async getCredentialsByJourney(journeyId: string): Promise<AcademiaCredential[]> {
    try {
      const { data, error } = await supabase
        .from('academia_credentials')
        .select('*')
        .eq('journey_id', journeyId)
        .order('issued_at', { ascending: false });

      if (error) {
        log.error('Error fetching credentials by journey:', error);
        throw new Error(`Failed to fetch journey credentials: ${error.message}`);
      }

      return data as AcademiaCredential[];
    } catch (error) {
      log.error('Error in getCredentialsByJourney:', error);
      throw error;
    }
  },

  /**
   * Get expiring credentials (expiring within next 30 days)
   */
  async getExpiringCredentials(spaceId: string): Promise<AcademiaCredential[]> {
    try {
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('academia_credentials')
        .select('*')
        .eq('space_id', spaceId)
        .gte('expires_at', now.toISOString().split('T')[0])
        .lte('expires_at', thirtyDaysFromNow.toISOString().split('T')[0])
        .order('expires_at', { ascending: true });

      if (error) {
        log.error('Error fetching expiring credentials:', error);
        throw new Error(`Failed to fetch expiring credentials: ${error.message}`);
      }

      return data as AcademiaCredential[];
    } catch (error) {
      log.error('Error in getExpiringCredentials:', error);
      throw error;
    }
  },

  /**
   * Get a single credential by ID
   */
  async getCredentialById(id: string): Promise<AcademiaCredential> {
    try {
      const { data, error } = await supabase
        .from('academia_credentials')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        log.error('Error fetching credential:', error);
        throw new Error(`Failed to fetch credential: ${error.message}`);
      }

      if (!data) {
        throw new Error('Credential not found');
      }

      return data as AcademiaCredential;
    } catch (error) {
      log.error('Error in getCredentialById:', error);
      throw error;
    }
  },

  /**
   * Create a new credential
   */
  async createCredential(
    spaceId: string,
    payload: CreateCredentialPayload
  ): Promise<AcademiaCredential> {
    try {
      const credentialData = {
        space_id: spaceId,
        ...payload,
      };

      const { data, error } = await supabase
        .from('academia_credentials')
        .insert(credentialData)
        .select()
        .single();

      if (error) {
        log.error('Error creating credential:', error);
        throw new Error(`Failed to create credential: ${error.message}`);
      }

      return data as AcademiaCredential;
    } catch (error) {
      log.error('Error in createCredential:', error);
      throw error;
    }
  },

  /**
   * Update an existing credential
   */
  async updateCredential(
    id: string,
    payload: UpdateCredentialPayload
  ): Promise<AcademiaCredential> {
    try {
      const updateData = {
        ...payload,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('academia_credentials')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        log.error('Error updating credential:', error);
        throw new Error(`Failed to update credential: ${error.message}`);
      }

      if (!data) {
        throw new Error('Credential not found');
      }

      return data as AcademiaCredential;
    } catch (error) {
      log.error('Error in updateCredential:', error);
      throw error;
    }
  },

  /**
   * Delete a credential
   */
  async deleteCredential(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('academia_credentials')
        .delete()
        .eq('id', id);

      if (error) {
        log.error('Error deleting credential:', error);
        throw new Error(`Failed to delete credential: ${error.message}`);
      }
    } catch (error) {
      log.error('Error in deleteCredential:', error);
      throw error;
    }
  },

  /**
   * Check if a credential is expired
   */
  isExpired(credential: AcademiaCredential): boolean {
    if (!credential.expires_at) {
      return false;
    }

    const expiryDate = new Date(credential.expires_at);
    const now = new Date();

    return expiryDate < now;
  },

  /**
   * Check if a credential is expiring soon (within 30 days)
   */
  isExpiringSoon(credential: AcademiaCredential): boolean {
    if (!credential.expires_at) {
      return false;
    }

    const expiryDate = new Date(credential.expires_at);
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return expiryDate >= now && expiryDate <= thirtyDaysFromNow;
  },

  /**
   * Get credential statistics for a space
   */
  async getCredentialStats(spaceId: string): Promise<{
    total: number;
    byType: Record<CredentialType, number>;
    expiring: number;
    expired: number;
  }> {
    try {
      const credentials = await this.getCredentials(spaceId);
      const expiringCredentials = await this.getExpiringCredentials(spaceId);

      const byType: Record<CredentialType, number> = {
        certificate: 0,
        diploma: 0,
        badge: 0,
        publication: 0,
        award: 0,
      };

      credentials.forEach((cred) => {
        if (cred.credential_type) {
          byType[cred.credential_type]++;
        }
      });

      const expired = credentials.filter((cred) => this.isExpired(cred)).length;

      return {
        total: credentials.length,
        byType,
        expiring: expiringCredentials.length,
        expired,
      };
    } catch (error) {
      log.error('Error in getCredentialStats:', error);
      throw error;
    }
  },
};
