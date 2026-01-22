import { supabase } from '@/services/supabaseClient';
import { ConnectionSpace, CreateSpacePayload, UpdateSpacePayload, Archetype, ConnectionMember, ARCHETYPE_CONFIG } from '../types';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('SpaceService');

/**
 * Space Service
 *
 * Handles all CRUD operations and business logic for Connection Spaces.
 * A space represents a single instance of an archetype (e.g., one house, one business, one course, or one club).
 */
export const spaceService = {
  /**
   * Lists all active spaces for the current user
   * Ordered by: favorites first, then by last accessed
   */
  async getSpaces(): Promise<ConnectionSpace[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('connection_spaces')
        .select('*')
        .eq('owner_id', user.id)
        .eq('is_active', true)
        .order('is_favorite', { ascending: false })
        .order('last_accessed_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) {
        log.error('Error fetching spaces:', { error });
        throw new Error(`Failed to fetch spaces: ${error.message}`);
      }

      return data as ConnectionSpace[];
    } catch (error) {
      log.error('Error in getSpaces:', { error });
      throw error;
    }
  },

  /**
   * Lists spaces filtered by a specific archetype
   */
  async getSpacesByArchetype(archetype: Archetype): Promise<ConnectionSpace[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('connection_spaces')
        .select('*')
        .eq('owner_id', user.id)
        .eq('archetype', archetype)
        .eq('is_active', true)
        .order('is_favorite', { ascending: false })
        .order('last_accessed_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) {
        log.error('Error fetching spaces by archetype:', { error, archetype });
        throw new Error(`Failed to fetch ${archetype} spaces: ${error.message}`);
      }

      return data as ConnectionSpace[];
    } catch (error) {
      log.error('Error in getSpacesByArchetype:', { error });
      throw error;
    }
  },

  /**
   * Fetches a single space by ID with its members
   * Returns space with populated members array, or null if not found
   */
  async getSpaceById(id: string): Promise<(ConnectionSpace & { members: ConnectionMember[] }) | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Fetch space - use maybeSingle to handle non-existent spaces gracefully
      const { data: spaceData, error: spaceError } = await supabase
        .from('connection_spaces')
        .select('*')
        .eq('id', id)
        .eq('owner_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (spaceError) {
        log.error('Error fetching space:', { error: spaceError, id });
        throw new Error(`Failed to fetch space: ${spaceError.message}`);
      }

      // Return null gracefully if space not found
      if (!spaceData) {
        return null;
      }

      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from('connection_members')
        .select('*')
        .eq('space_id', id)
        .eq('is_active', true)
        .order('role')
        .order('joined_at', { ascending: false });

      if (membersError) {
        log.error('Error fetching members:', { error: membersError, id });
        throw new Error(`Failed to fetch members: ${membersError.message}`);
      }

      return {
        ...spaceData,
        members: membersData as ConnectionMember[]
      } as ConnectionSpace & { members: ConnectionMember[] };
    } catch (error) {
      log.error('Error in getSpaceById:', { error });
      throw error;
    }
  },

  /**
   * Creates a new connection space
   * The current user automatically becomes the owner
   */
  async createSpace(data: CreateSpacePayload): Promise<ConnectionSpace> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Validate archetype
      if (!data.archetype || !ARCHETYPE_CONFIG[data.archetype]) {
        throw new Error(`Invalid archetype: ${data.archetype}. Must be one of: habitat, ventures, academia, tribo`);
      }

      // Get default archetype config (now guaranteed to exist)
      const archetypeConfig = ARCHETYPE_CONFIG[data.archetype];

      const spacePayload = {
        owner_id: user.id,
        archetype: data.archetype,
        name: data.name,
        subtitle: data.subtitle,
        description: data.description,
        icon: data.icon || archetypeConfig.icon,
        color_theme: data.color_theme || archetypeConfig.color_theme,
        is_active: true,
        is_favorite: false,
        settings: {}
      };

      const { data: spaceData, error } = await supabase
        .from('connection_spaces')
        .insert(spacePayload)
        .select()
        .single();

      if (error) {
        log.error('Error creating space:', { error, data });
        throw new Error(`Failed to create space: ${error.message}`);
      }

      return spaceData as ConnectionSpace;
    } catch (error) {
      log.error('Error in createSpace:', { error });
      throw error;
    }
  },

  /**
   * Updates an existing space
   * Only the space owner can update
   */
  async updateSpace(id: string, data: UpdateSpacePayload): Promise<ConnectionSpace> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      const updatePayload = {
        ...data,
        updated_at: new Date().toISOString()
      };

      const { data: spaceData, error } = await supabase
        .from('connection_spaces')
        .update(updatePayload)
        .eq('id', id)
        .eq('owner_id', user.id)
        .select()
        .single();

      if (error) {
        log.error('Error updating space:', { error, id, data });
        throw new Error(`Failed to update space: ${error.message}`);
      }

      if (!spaceData) {
        throw new Error('Space not found or you do not have permission to update it');
      }

      return spaceData as ConnectionSpace;
    } catch (error) {
      log.error('Error in updateSpace:', { error });
      throw error;
    }
  },

  /**
   * Soft deletes a space by setting is_active to false
   */
  async deleteSpace(id: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('connection_spaces')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('owner_id', user.id);

      if (error) {
        log.error('Error deleting space:', { error, id });
        throw new Error(`Failed to delete space: ${error.message}`);
      }
    } catch (error) {
      log.error('Error in deleteSpace:', { error });
      throw error;
    }
  },

  /**
   * Toggles the favorite status of a space
   */
  async toggleFavorite(id: string): Promise<ConnectionSpace> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      // First, get current favorite status
      const { data: currentSpace, error: fetchError } = await supabase
        .from('connection_spaces')
        .select('is_favorite')
        .eq('id', id)
        .eq('owner_id', user.id)
        .single();

      if (fetchError) {
        log.error('Error fetching space:', { error: fetchError, id });
        throw new Error(`Failed to fetch space: ${fetchError.message}`);
      }

      if (!currentSpace) {
        throw new Error('Space not found');
      }

      // Toggle favorite status
      const { data: spaceData, error: updateError } = await supabase
        .from('connection_spaces')
        .update({
          is_favorite: !currentSpace.is_favorite,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('owner_id', user.id)
        .select()
        .single();

      if (updateError) {
        log.error('Error toggling favorite:', { error: updateError, id });
        throw new Error(`Failed to toggle favorite: ${updateError.message}`);
      }

      return spaceData as ConnectionSpace;
    } catch (error) {
      log.error('Error in toggleFavorite:', { error });
      throw error;
    }
  },

  /**
   * Updates the last_accessed_at timestamp for a space
   * Used for tracking recently accessed spaces
   */
  async updateLastAccessed(id: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('connection_spaces')
        .update({
          last_accessed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('owner_id', user.id);

      if (error) {
        log.error('Error updating last accessed:', { error, id });
        throw new Error(`Failed to update last accessed: ${error.message}`);
      }
    } catch (error) {
      log.error('Error in updateLastAccessed:', { error });
      throw error;
    }
  },
};
