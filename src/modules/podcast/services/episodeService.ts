/**
 * Episode Service
 *
 * Handles database operations for podcast episodes.
 * Part of the Guest Identification Wizard (Task 1.5) - Direct Contact flow integration.
 */

import { supabase } from '../../../services/supabaseClient';
import type { EpisodeCreationData } from '../types/wizard.types';

/**
 * Podcast Episode Database Schema
 * Matches the podcast_episodes table in Supabase
 */
export interface PodcastEpisode {
  id: string;
  show_id: string;
  user_id: string;

  // Guest Information
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  guest_type: 'public-figure' | 'direct-contact';

  // Episode Details
  title?: string;
  episode_theme: string;
  theme_mode: 'auto' | 'manual';
  season: number;
  episode_number?: number;

  // Scheduling
  location?: string;
  scheduled_date?: string;
  scheduled_time?: string;

  // Status
  status: 'draft' | 'scheduled' | 'recording' | 'editing' | 'published';

  // Guest Approval (Phase 2)
  approval_token?: string;
  approval_token_created_at?: string;
  approved_by_guest?: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Service Response Type
 * Consistent error handling pattern
 */
export interface ServiceResponse<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Create a new podcast episode
 *
 * Workflow:
 * 1. Get current authenticated user
 * 2. Get or create podcast show
 * 3. Calculate next episode number
 * 4. Create episode in database
 *
 * @param episodeData - Episode creation data from wizard
 * @returns ServiceResponse with created episode or error
 */
export async function createEpisode(
  episodeData: EpisodeCreationData & { show_id?: string; guest_type?: 'public-figure' | 'direct-contact' }
): Promise<ServiceResponse<PodcastEpisode>> {
  try {
    console.log('[episodeService] Creating episode with data:', episodeData);

    // 1. Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Usuário não autenticado');
    }

    console.log('[episodeService] User authenticated:', user.id);

    // 2. Get or create podcast show
    let showId = episodeData.show_id;
    if (!showId) {
      console.log('[episodeService] No show_id provided, searching for existing show...');

      const { data: shows, error: showsError } = await supabase
        .from('podcast_shows')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1);

      if (showsError) {
        console.error('[episodeService] Error fetching shows:', showsError);
        throw showsError;
      }

      if (shows && shows.length > 0) {
        showId = shows[0].id;
        console.log('[episodeService] Using existing show:', showId);
      } else {
        console.log('[episodeService] No shows found, creating default show...');

        // Create default show
        const { data: newShow, error: createShowError } = await supabase
          .from('podcast_shows')
          .insert({
            user_id: user.id,
            title: 'Meu Podcast',
            description: 'Podcast criado automaticamente',
          })
          .select('id')
          .single();

        if (createShowError) {
          console.error('[episodeService] Error creating show:', createShowError);
          throw createShowError;
        }

        showId = newShow.id;
        console.log('[episodeService] Created default show:', showId);
      }
    }

    // 3. Get next episode number for this season
    const { data: lastEpisode } = await supabase
      .from('podcast_episodes')
      .select('episode_number')
      .eq('show_id', showId)
      .eq('season', episodeData.season)
      .order('episode_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const episodeNumber = lastEpisode ? (lastEpisode.episode_number || 0) + 1 : 1;
    console.log('[episodeService] Next episode number:', episodeNumber);

    // 4. Format scheduled_time if both date and time are provided
    let scheduledTime: string | undefined;
    if (episodeData.scheduled_date && episodeData.scheduled_time) {
      scheduledTime = `${episodeData.scheduled_date}T${episodeData.scheduled_time}:00`;
      console.log('[episodeService] Formatted scheduled_time:', scheduledTime);
    }

    // 5. Create episode
    const newEpisodeData = {
      show_id: showId,
      user_id: user.id,
      guest_name: episodeData.guest_name,
      guest_email: episodeData.guest_email,
      guest_phone: episodeData.guest_phone,
      guest_type: episodeData.guest_type || 'direct-contact',
      title: `Ep. ${episodeNumber} - ${episodeData.guest_name}`,
      episode_theme: episodeData.episode_theme,
      theme_mode: episodeData.theme_mode,
      season: episodeData.season,
      episode_number: episodeNumber,
      location: episodeData.location,
      scheduled_time: scheduledTime,
      status: 'draft' as const,
    };

    console.log('[episodeService] Inserting episode into database:', newEpisodeData);

    const { data: episode, error: insertError } = await supabase
      .from('podcast_episodes')
      .insert(newEpisodeData)
      .select()
      .single();

    if (insertError) {
      console.error('[episodeService] Error inserting episode:', insertError);
      throw insertError;
    }

    console.log('[episodeService] Episode created successfully:', episode.id);

    return { data: episode, error: null };
  } catch (error) {
    console.error('[episodeService] Error creating episode:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get a single episode by ID
 *
 * @param episodeId - Episode UUID
 * @returns ServiceResponse with episode data or error
 */
export async function getEpisode(episodeId: string): Promise<ServiceResponse<PodcastEpisode>> {
  try {
    console.log('[episodeService] Fetching episode:', episodeId);

    const { data, error } = await supabase
      .from('podcast_episodes')
      .select('*')
      .eq('id', episodeId)
      .single();

    if (error) {
      console.error('[episodeService] Error fetching episode:', error);
      throw error;
    }

    console.log('[episodeService] Episode fetched successfully:', data.id);

    return { data, error: null };
  } catch (error) {
    console.error('[episodeService] Error in getEpisode:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Update an existing episode
 *
 * @param episodeId - Episode UUID
 * @param updates - Partial episode data to update
 * @returns ServiceResponse with updated episode or error
 */
export async function updateEpisode(
  episodeId: string,
  updates: Partial<Omit<PodcastEpisode, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'show_id'>>
): Promise<ServiceResponse<PodcastEpisode>> {
  try {
    console.log('[episodeService] Updating episode:', episodeId, updates);

    const { data, error } = await supabase
      .from('podcast_episodes')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', episodeId)
      .select()
      .single();

    if (error) {
      console.error('[episodeService] Error updating episode:', error);
      throw error;
    }

    console.log('[episodeService] Episode updated successfully:', data.id);

    return { data, error: null };
  } catch (error) {
    console.error('[episodeService] Error in updateEpisode:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Delete an episode
 *
 * @param episodeId - Episode UUID
 * @returns ServiceResponse with success flag or error
 */
export async function deleteEpisode(episodeId: string): Promise<ServiceResponse<boolean>> {
  try {
    console.log('[episodeService] Deleting episode:', episodeId);

    const { error } = await supabase
      .from('podcast_episodes')
      .delete()
      .eq('id', episodeId);

    if (error) {
      console.error('[episodeService] Error deleting episode:', error);
      throw error;
    }

    console.log('[episodeService] Episode deleted successfully');

    return { data: true, error: null };
  } catch (error) {
    console.error('[episodeService] Error in deleteEpisode:', error);
    return { data: null, error: error as Error };
  }
}
