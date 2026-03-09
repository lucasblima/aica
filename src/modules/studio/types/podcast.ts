/**
 * Podcast-specific types for Studio module
 * Extracted from _deprecated/modules/podcast/types.ts
 *
 * DB mapping:
 * - Raw table: `podcast_shows` (columns: name, cover_image_url)
 * - View: `podcast_shows_with_stats` (aliases: name→title, cover_image_url→cover_url, + episodes_count)
 * - Frontend queries use the VIEW, so `title` and `cover_url` are the primary fields.
 * - The raw columns (`name`, `cover_image_url`) are also returned by the view via `ps.*`.
 */

/**
 * Represents a podcast show as returned by the `podcast_shows_with_stats` view.
 *
 * The view aliases `podcast_shows.name` → `title` and `podcast_shows.cover_image_url` → `cover_url`,
 * and adds `episodes_count`. The raw table columns are also included via `ps.*`.
 *
 * @see supabase/migrations/20260217130000_studio_schema_alignment.sql — view definition
 * @see supabase/migrations/20251201000000_staging_bootstrap.sql — base table definition
 */
export interface PodcastShow {
  id: string;
  user_id: string;

  /** Aliased from `podcast_shows.name` by the view. Primary display field. */
  title: string;

  /** Raw column from `podcast_shows`. Same value as `title` (view aliases name→title). */
  name?: string;

  description?: string;

  /** Aliased from `podcast_shows.cover_image_url` by the view. Primary image field. */
  cover_url?: string;

  /** Raw column from `podcast_shows`. Same value as `cover_url` (view aliases cover_image_url→cover_url). */
  cover_image_url?: string;

  /** RSS feed URL for the podcast show. DB column: `rss_feed_url` */
  rss_feed_url?: string;

  /** Website URL for the podcast show. DB column: `website_url` */
  website_url?: string;

  /** Show status. DB column: `status` with CHECK ('active', 'archived', 'paused') */
  status?: 'active' | 'archived' | 'paused';

  created_at: string;
  updated_at: string;

  /** Computed by the view via COUNT(podcast_episodes.id). Only present when querying the view. */
  episodes_count?: number;
}
