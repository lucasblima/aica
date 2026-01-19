/**
 * Organization Ventures Service
 * Issue #100 - Links organizations to ventures when created via wizard
 *
 * This service calls the RPC function `create_venture_from_organization`
 * which creates a ConnectionSpace and VenturesEntity for the organization.
 */

import { supabase } from '@/services/supabaseClient';

interface VentureCreationResult {
  success: boolean;
  organization_id?: string;
  connection_space_id?: string;
  ventures_entity_id?: string;
  error?: string;
}

/**
 * Creates a venture from an organization after wizard completion
 * Calls the database RPC function that creates:
 * 1. A ConnectionSpace with archetype 'ventures'
 * 2. A VenturesEntity linked to that space
 * 3. Updates the organization with the new IDs
 */
export async function createVentureFromOrganization(
  organizationId: string
): Promise<{ success: boolean; ventureId?: string; error?: string }> {
  try {
    console.log('[organizationVenturesService] Creating venture from organization:', organizationId);

    // Call the RPC function defined in migration 20260114000002
    const { data, error } = await supabase.rpc('create_venture_from_organization', {
      p_organization_id: organizationId,
    });

    if (error) {
      console.error('[organizationVenturesService] RPC error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    // Parse the JSON result from the RPC function
    const result = data as VentureCreationResult;

    if (!result.success) {
      console.warn('[organizationVenturesService] Venture creation failed:', result.error);
      return {
        success: false,
        error: result.error || 'Unknown error creating venture',
      };
    }

    console.log('[organizationVenturesService] Venture created successfully:', {
      organizationId: result.organization_id,
      connectionSpaceId: result.connection_space_id,
      venturesEntityId: result.ventures_entity_id,
    });

    return {
      success: true,
      ventureId: result.ventures_entity_id,
    };
  } catch (error) {
    console.error('[organizationVenturesService] Error creating venture:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Sync organization data to linked venture
 * Called when organization is updated after initial creation
 */
export async function syncOrganizationToVenture(
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[organizationVenturesService] Syncing organization to venture:', organizationId);

    const { data, error } = await supabase.rpc('sync_organization_to_venture', {
      p_organization_id: organizationId,
    });

    if (error) {
      console.error('[organizationVenturesService] Sync RPC error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    const result = data as VentureCreationResult;

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Unknown error syncing venture',
      };
    }

    console.log('[organizationVenturesService] Venture synced successfully');
    return { success: true };
  } catch (error) {
    console.error('[organizationVenturesService] Error syncing venture:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
