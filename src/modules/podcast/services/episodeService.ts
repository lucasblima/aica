/**
 * Episode Service
 *
 * Handles CRUD operations for podcast episodes in Supabase.
 * This service manages episode creation, updates, and retrieval.
 */

import { supabase } from '@/services/supabaseClient';
import type { Episode } from '../types';
import type { EpisodeCreationData, GuestProfile } from '../types/wizard.types';

/**
 * PodcastEpisode type - extends Episode with additional fields
 */
export type PodcastEpisode = Episode;

/**
 * Create episode request payload
 */
interface CreateEpisodeRequest extends Partial<EpisodeCreationData> {
  show_id: string;
  guest_type: 'public-figure' | 'direct-contact';
}

/**
 * Create a new podcast episode
 *
 * @param data - Episode creation data
 * @returns Created episode or error
 */
export async function createEpisode(data: CreateEpisodeRequest): Promise<{
  data: PodcastEpisode | null;
  error: Error | null;
}> {
  try {
    console.log('[episodeService] Creating episode...', data);

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        data: null,
        error: new Error('Usuário não autenticado'),
      };
    }

    // Prepare episode data for database
    const episodeData = {
      show_id: data.show_id,
      user_id: user.id,
      title: `Episódio com ${data.guest_name}`,
      status: data.status || 'draft',
      guest_name: data.guest_name,
      guest_email: data.guest_email || null,
      guest_phone: data.guest_phone || null,
      guest_reference: data.guest_reference || null,
      guest_profile: data.guest_profile || null,
      episode_theme: data.episode_theme || null,
      theme_mode: data.theme_mode || 'auto',
      season: String(data.season || 1),
      location: data.location || null,
      scheduled_date: data.scheduled_date || null,
      scheduled_time: data.scheduled_time || null,
    };

    // Insert episode into Supabase
    const { data: episode, error } = await supabase
      .from('podcast_episodes')
      .insert(episodeData)
      .select()
      .single();

    if (error) {
      console.error('[episodeService] Error creating episode:', error);
      return {
        data: null,
        error: new Error(error.message),
      };
    }

    console.log('[episodeService] Episode created successfully:', episode.id);

    return {
      data: episode as PodcastEpisode,
      error: null,
    };
  } catch (error) {
    console.error('[episodeService] Unexpected error:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Erro desconhecido'),
    };
  }
}

/**
 * Get episode by ID
 *
 * @param episodeId - Episode ID
 * @returns Episode or null
 */
export async function getEpisode(episodeId: string): Promise<PodcastEpisode | null> {
  try {
    const { data, error } = await supabase
      .from('podcast_episodes')
      .select('*')
      .eq('id', episodeId)
      .single();

    if (error) {
      console.error('[episodeService] Error fetching episode:', error);
      return null;
    }

    return data as PodcastEpisode;
  } catch (error) {
    console.error('[episodeService] Unexpected error:', error);
    return null;
  }
}

/**
 * Update episode
 *
 * @param episodeId - Episode ID
 * @param updates - Partial episode data to update
 * @returns Updated episode or null
 */
export async function updateEpisode(
  episodeId: string,
  updates: Partial<Episode>
): Promise<PodcastEpisode | null> {
  try {
    const { data, error } = await supabase
      .from('podcast_episodes')
      .update(updates)
      .eq('id', episodeId)
      .select()
      .single();

    if (error) {
      console.error('[episodeService] Error updating episode:', error);
      return null;
    }

    return data as PodcastEpisode;
  } catch (error) {
    console.error('[episodeService] Unexpected error:', error);
    return null;
  }
}

/**
 * List episodes for a show
 *
 * @param showId - Show ID
 * @returns Array of episodes
 */
export async function listEpisodes(showId: string): Promise<PodcastEpisode[]> {
  try {
    const { data, error } = await supabase
      .from('podcast_episodes')
      .select('*')
      .eq('show_id', showId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[episodeService] Error listing episodes:', error);
      return [];
    }

    return data as PodcastEpisode[];
  } catch (error) {
    console.error('[episodeService] Unexpected error:', error);
    return [];
  }
}

/**
 * Delete episode
 *
 * @param episodeId - Episode ID
 * @returns Success boolean
 */
export async function deleteEpisode(episodeId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('podcast_episodes')
      .delete()
      .eq('id', episodeId);

    if (error) {
      console.error('[episodeService] Error deleting episode:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[episodeService] Unexpected error:', error);
    return false;
  }
}
