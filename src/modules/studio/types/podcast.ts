/**
 * Podcast-specific types for Studio module
 * Extracted from _deprecated/modules/podcast/types.ts
 */

export interface PodcastShow {
  id: string;
  title: string;
  description?: string;
  cover_url?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  episodes_count?: number;
}
