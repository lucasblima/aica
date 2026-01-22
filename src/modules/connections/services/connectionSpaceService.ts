import { supabase } from '@/services/supabaseClient';
import type {
  ConnectionSpace,
  CreateSpacePayload,
  UpdateSpacePayload,
  Archetype
} from '../types';

// ==================== CONNECTION SPACES ====================

/**
 * Retrieves all active connection spaces for a specific user.
 * Results are ordered by most recently accessed first.
 *
 * @param userId - The unique identifier of the user
 * @returns Promise resolving to an array of ConnectionSpace objects
 * @throws {Error} If the database query fails
 *
 * @example
 * const spaces = await getConnectionSpaces(user.id);
 * console.log(`User has ${spaces.length} active spaces`);
 */
export async function getConnectionSpaces(userId: string): Promise<ConnectionSpace[]> {
  const { data, error } = await supabase
    .from('connection_spaces')
    .select('*')
    .eq('owner_id', userId)
    .eq('is_active', true)
    .order('last_accessed_at', { ascending: false, nullsFirst: false });

  if (error) throw error;
  return data || [];
}

/**
 * Retrieves all active connection spaces for a specific user filtered by archetype.
 * Results are ordered alphabetically by name.
 *
 * @param userId - The unique identifier of the user
 * @param archetype - The archetype filter (habitat, ventures, academia, or tribo)
 * @returns Promise resolving to an array of ConnectionSpace objects
 * @throws {Error} If the database query fails
 *
 * @example
 * const habitats = await getConnectionSpacesByArchetype(user.id, 'habitat');
 * const ventures = await getConnectionSpacesByArchetype(user.id, 'ventures');
 */
export async function getConnectionSpacesByArchetype(
  userId: string,
  archetype: Archetype
): Promise<ConnectionSpace[]> {
  const { data, error } = await supabase
    .from('connection_spaces')
    .select('*')
    .eq('owner_id', userId)
    .eq('archetype', archetype)
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data || [];
}

/**
 * Retrieves a single connection space by its ID.
 *
 * @param spaceId - The unique identifier of the space
 * @returns Promise resolving to a ConnectionSpace object, or null if not found
 * @throws {Error} If the database query fails (excluding not found errors)
 *
 * @example
 * const space = await getConnectionSpaceById('space-123');
 * if (space) {
 *   console.log(`Found space: ${space.name}`);
 * }
 */
export async function getConnectionSpaceById(spaceId: string): Promise<ConnectionSpace | null> {
  const { data, error } = await supabase
    .from('connection_spaces')
    .select('*')
    .eq('id', spaceId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Creates a new connection space for the authenticated user.
 * The user automatically becomes the owner of the space.
 *
 * @param userId - The unique identifier of the user creating the space
 * @param input - The space creation data
 * @param input.name - Display name for the space
 * @param input.archetype - One of: habitat, ventures, academia, tribo
 * @param input.subtitle - Optional subtitle
 * @param input.description - Optional description
 * @param input.icon - Optional custom icon (defaults to archetype icon)
 * @param input.color_theme - Optional color theme (defaults to archetype theme)
 * @returns Promise resolving to the created ConnectionSpace
 * @throws {Error} If space creation fails
 *
 * @example
 * const space = await createConnectionSpace(user.id, {
 *   name: 'My Apartment',
 *   archetype: 'habitat',
 *   subtitle: 'Downtown Living',
 *   description: 'Shared apartment expenses'
 * });
 */
export async function createConnectionSpace(
  userId: string,
  input: CreateSpacePayload
): Promise<ConnectionSpace> {
  const { data, error } = await supabase
    .from('connection_spaces')
    .insert({
      owner_id: userId,
      archetype: input.archetype,
      name: input.name,
      subtitle: input.subtitle,
      description: input.description,
      icon: input.icon,
      color_theme: input.color_theme,
      settings: {},
      is_active: true,
      is_favorite: false
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Updates an existing connection space.
 * Only mutable fields will be updated; archetype cannot be changed.
 *
 * @param spaceId - The unique identifier of the space to update
 * @param input - Partial update payload with fields to modify
 * @param input.name - Updated display name (optional)
 * @param input.subtitle - Updated subtitle (optional)
 * @param input.description - Updated description (optional)
 * @param input.icon - Updated icon (optional)
 * @param input.color_theme - Updated color theme (optional)
 * @returns Promise resolving to the updated ConnectionSpace
 * @throws {Error} If the update fails or space doesn't exist
 *
 * @example
 * const updated = await updateConnectionSpace('space-123', {
 *   name: 'Updated Apartment Name',
 *   description: 'New shared living arrangement'
 * });
 */
export async function updateConnectionSpace(
  spaceId: string,
  input: UpdateSpacePayload
): Promise<ConnectionSpace> {
  const { data, error } = await supabase
    .from('connection_spaces')
    .update({
      ...input,
      updated_at: new Date().toISOString()
    })
    .eq('id', spaceId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Soft deletes a connection space by setting is_active to false.
 * The space and its data remain in the database but are hidden from queries.
 *
 * @param spaceId - The unique identifier of the space to delete
 * @returns Promise that resolves when deletion is complete
 * @throws {Error} If deletion fails
 *
 * @example
 * await deleteConnectionSpace('space-123');
 * console.log('Space archived successfully');
 */
export async function deleteConnectionSpace(spaceId: string): Promise<void> {
  // Soft delete
  const { error } = await supabase
    .from('connection_spaces')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', spaceId);

  if (error) throw error;
}

/**
 * Toggles the favorite status of a connection space.
 * Favorited spaces appear first in the space list.
 *
 * @param spaceId - The unique identifier of the space
 * @param isFavorite - True to mark as favorite, false to unfavorite
 * @returns Promise that resolves when the update is complete
 * @throws {Error} If the update fails
 *
 * @example
 * await toggleFavorite('space-123', true);  // Mark as favorite
 * await toggleFavorite('space-456', false); // Remove favorite
 */
export async function toggleFavorite(spaceId: string, isFavorite: boolean): Promise<void> {
  const { error } = await supabase
    .from('connection_spaces')
    .update({ is_favorite: isFavorite, updated_at: new Date().toISOString() })
    .eq('id', spaceId);

  if (error) throw error;
}

/**
 * Updates the last_accessed_at timestamp for a space.
 * Used for tracking recently accessed spaces in the UI.
 *
 * @param spaceId - The unique identifier of the space
 * @returns Promise that resolves when the update is complete
 * @throws {Error} If the update fails
 *
 * @example
 * // Call when user opens a space detail page
 * await updateLastAccessed('space-123');
 */
export async function updateLastAccessed(spaceId: string): Promise<void> {
  const { error } = await supabase
    .from('connection_spaces')
    .update({ last_accessed_at: new Date().toISOString() })
    .eq('id', spaceId);

  if (error) throw error;
}
