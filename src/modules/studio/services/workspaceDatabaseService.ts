/**
 * Workspace Database Service - Studio Module
 *
 * Provides database operations for podcast workspace:
 * - Episode CRUD operations
 * - Topic management
 * - Category management
 * - Real-time subscriptions
 *
 * Database tables:
 * - podcast_episodes
 * - podcast_topics
 * - podcast_topic_categories
 *
 * Migration Note: Extracted podcast-specific functions from _deprecated/modules/podcast/services/databaseService.ts
 * Wave 8: Validation & Fixes - Service Migrations
 */

import { supabase } from '@/services/supabaseClient'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Topic, TopicCategory } from '../types'
import { createNamespacedLogger } from '@/lib/logger';
import { syncEntityToGoogle } from '@/services/calendarSyncService';
import { studioEpisodeToGoogleEvent } from '@/services/calendarSyncTransforms';
import { isGoogleCalendarConnected } from '@/services/googleAuthService';

const log = createNamespacedLogger('workspaceDatabaseService');

// =====================================================
// TYPES
// =====================================================

/**
 * Represents a podcast episode as stored in the database.
 * Database table: `podcast_episodes`
 *
 * Note: `controversies` is JSONB in DB — stores structured objects
 * `{title, summary, source, sentiment, date}` or legacy string arrays.
 * The workspace Dossier type may flatten these to `string[]` for display.
 *
 * @see supabase/migrations/20260217130000_studio_schema_alignment.sql
 * @see supabase/migrations/20251201000000_staging_bootstrap.sql
 */
export interface Episode {
  id: string
  title: string
  guest_name: string
  episode_theme: string
  biography: string
  /**
   * DB column: `controversies` (JSONB, default '[]').
   * Schema: [{title, summary, source, sentiment, date}] or legacy string[].
   * Uses `any[]` because DB may contain either structured objects or plain strings.
   */
  controversies: any[]
  ice_breakers: string[]
  status: 'draft' | 'in_production' | 'published' | 'archived'
  season?: string
  scheduled_date?: string
  location?: string
  duration_minutes?: number
  user_id?: string
  created_at: string
  updated_at: string
}

/**
 * Represents a topic/talking point for a podcast episode
 * Database table: podcast_topics
 */
export interface TopicDB {
  id: string
  episode_id: string
  text: string
  order: number
  completed: boolean
  archived: boolean
  category_id?: string
  sponsor_script?: string
  created_at: string
  updated_at: string
}

/**
 * Represents a category for organizing topics
 * Database table: podcast_topic_categories
 */
export interface TopicCategoryDB {
  id: string
  episode_id: string
  name: string
  description?: string
  color?: string
  icon?: string
  order?: number
  created_at: string
  updated_at: string
}

// =====================================================
// EPISODES CRUD
// =====================================================

/**
 * Creates a new podcast episode
 */
export async function createEpisode(episode: Partial<Episode>): Promise<Episode> {
  const { data, error } = await supabase
    .from('podcast_episodes')
    .insert([episode])
    .select()
    .single()

  if (error) throw new Error(`Failed to create episode: ${error.message}`)

  // Sync to Google Calendar if episode has a scheduled_date (non-blocking)
  if (data.scheduled_date) {
    isGoogleCalendarConnected().then((connected) => {
      if (!connected) return
      const eventData = studioEpisodeToGoogleEvent({
        id: data.id,
        title: data.title,
        guest_name: data.guest_name,
        scheduled_date: data.scheduled_date,
        duration_minutes: data.duration_minutes,
        location: data.location,
      })
      syncEntityToGoogle('studio', data.id, eventData).catch((err) =>
        log.warn('Calendar sync failed for new episode:', err)
      )
    })
  }

  return data
}

/**
 * Retrieves a single podcast episode by ID
 */
export async function getEpisode(id: string): Promise<Episode | null> {
  const { data, error } = await supabase
    .from('podcast_episodes')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    log.error('Failed to get episode:', error)
    return null
  }
  return data
}

/**
 * Updates an existing podcast episode
 */
export async function updateEpisode(id: string, updates: Partial<Episode>): Promise<Episode> {
  const { data, error } = await supabase
    .from('podcast_episodes')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update episode: ${error.message}`)

  // Sync updated episode to Google Calendar if it has a scheduled_date (non-blocking)
  if (data.scheduled_date) {
    isGoogleCalendarConnected().then((connected) => {
      if (!connected) return
      const eventData = studioEpisodeToGoogleEvent({
        id: data.id,
        title: data.title,
        guest_name: data.guest_name,
        scheduled_date: data.scheduled_date,
        duration_minutes: data.duration_minutes,
        location: data.location,
      })
      syncEntityToGoogle('studio', data.id, eventData).catch((err) =>
        log.warn('Calendar sync failed for updated episode:', err)
      )
    })
  }

  return data
}

/**
 * Lists all podcast episodes
 */
export async function listEpisodes(limit = 50): Promise<Episode[]> {
  const { data, error } = await supabase
    .from('podcast_episodes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Failed to list episodes: ${error.message}`)
  return data || []
}

/**
 * Lists podcast episodes for a specific season
 */
export async function listEpisodesBySeason(season: string, limit = 50): Promise<Episode[]> {
  const { data, error } = await supabase
    .from('podcast_episodes')
    .select('*')
    .eq('season', season)
    .order('scheduled_date', { ascending: true })
    .limit(limit)

  if (error) throw new Error(`Failed to list episodes by season: ${error.message}`)
  return data || []
}

/**
 * Deletes a podcast episode and all related data (cascading)
 */
export async function deleteEpisode(id: string): Promise<void> {
  const { error } = await supabase
    .from('podcast_episodes')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Failed to delete episode: ${error.message}`)
}

// =====================================================
// TOPICS CRUD
// =====================================================

/**
 * Creates a new topic for a podcast episode
 */
export async function createTopic(episodeId: string, topic: Partial<TopicDB>): Promise<TopicDB> {
  const { data, error } = await supabase
    .from('podcast_topics')
    .insert([{ ...topic, episode_id: episodeId }])
    .select()
    .single()

  if (error) throw new Error(`Failed to create topic: ${error.message}`)
  return data
}

/**
 * Retrieves all topics for a podcast episode
 */
export async function getTopics(episodeId: string): Promise<TopicDB[]> {
  const { data, error } = await supabase
    .from('podcast_topics')
    .select('*')
    .eq('episode_id', episodeId)
    .order('order', { ascending: true })

  if (error) throw new Error(`Failed to get topics: ${error.message}`)
  return data || []
}

/**
 * Updates an existing topic
 */
export async function updateTopic(id: string, updates: Partial<TopicDB>): Promise<TopicDB> {
  const { data, error } = await supabase
    .from('podcast_topics')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update topic: ${error.message}`)
  return data
}

/**
 * Deletes a topic
 */
export async function deleteTopic(id: string): Promise<void> {
  const { error } = await supabase
    .from('podcast_topics')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Failed to delete topic: ${error.message}`)
}

/**
 * Updates multiple topics in bulk
 */
export async function bulkUpdateTopics(topics: Partial<TopicDB>[]): Promise<void> {
  const promises = topics.map(topic => {
    if (!topic.id) return Promise.resolve()
    return updateTopic(topic.id, topic)
  })

  await Promise.all(promises)
}

// =====================================================
// CATEGORIES CRUD
// =====================================================

/**
 * Creates a new topic category for an episode
 */
export async function createCategory(
  episodeId: string,
  category: { name: string; description?: string; color?: string; icon?: string }
): Promise<TopicCategoryDB> {
  const { color, ...categoryWithoutColor } = category

  const { data, error } = await supabase
    .from('podcast_topic_categories')
    .insert([{ ...categoryWithoutColor, episode_id: episodeId }])
    .select()
    .single()

  if (error) throw new Error(`Failed to create category: ${error.message}`)

  // If creation succeeded and color was provided, update with color
  if (data && color) {
    const { error: updateError } = await supabase
      .from('podcast_topic_categories')
      .update({ color })
      .eq('id', data.id)

    if (!updateError) {
      data.color = color
    }
  }

  return data
}

/**
 * Retrieves all categories for a podcast episode
 */
export async function getCategories(episodeId: string): Promise<TopicCategoryDB[]> {
  const { data, error } = await supabase
    .from('podcast_topic_categories')
    .select('*')
    .eq('episode_id', episodeId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to get categories: ${error.message}`)
  return data || []
}

/**
 * Updates an existing category
 */
export async function updateCategory(
  id: string,
  updates: { name?: string; description?: string; color?: string; icon?: string }
): Promise<TopicCategoryDB> {
  const { data, error } = await supabase
    .from('podcast_topic_categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update category: ${error.message}`)
  return data
}

/**
 * Deletes a category
 * Topics in this category will have their category_id set to null
 */
export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from('podcast_topic_categories')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Failed to delete category: ${error.message}`)
}

// =====================================================
// REALTIME SUBSCRIPTIONS
// =====================================================

/**
 * Subscribes to real-time changes for topics of a specific episode
 */
export function subscribeToTopics(
  episodeId: string,
  callback: (topics: TopicDB[]) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`topics:${episodeId}`)
    .on(
      'postgres_changes',
      {
        event: '*', // Listen to INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'podcast_topics',
        filter: `episode_id=eq.${episodeId}`
      },
      async () => {
        // When any change happens, refetch all topics
        const topics = await getTopics(episodeId)
        callback(topics)
      }
    )
    .subscribe()

  return channel
}

/**
 * Subscribes to real-time changes for all podcast episodes
 */
export function subscribeToEpisodes(
  callback: (episodes: Episode[]) => void
): RealtimeChannel {
  const channel = supabase
    .channel('episodes:all')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'podcast_episodes'
      },
      async () => {
        const episodes = await listEpisodes()
        callback(episodes)
      }
    )
    .subscribe()

  return channel
}

// =====================================================
// TYPE CONVERTERS
// =====================================================

/**
 * Converts database TopicDB to workspace Topic
 */
export function dbTopicToWorkspace(dbTopic: TopicDB): Topic {
  return {
    id: dbTopic.id,
    text: dbTopic.text,
    completed: dbTopic.completed,
    order: dbTopic.order,
    archived: dbTopic.archived,
    categoryId: dbTopic.category_id,
    sponsorScript: dbTopic.sponsor_script
  }
}

/**
 * Converts workspace Topic to database TopicDB
 */
export function workspaceTopicToDb(topic: Topic, episodeId: string): Partial<TopicDB> {
  return {
    id: topic.id,
    episode_id: episodeId,
    text: topic.text,
    completed: topic.completed,
    order: topic.order,
    archived: topic.archived,
    category_id: topic.categoryId,
    sponsor_script: topic.sponsorScript
  }
}

/**
 * Converts database TopicCategoryDB to workspace TopicCategory
 */
export function dbCategoryToWorkspace(dbCategory: TopicCategoryDB): TopicCategory {
  return {
    id: dbCategory.id,
    name: dbCategory.name,
    color: dbCategory.color || '#3B82F6',
    episode_id: dbCategory.episode_id,
    description: dbCategory.description,
    icon: dbCategory.icon,
    order: dbCategory.order,
    created_at: dbCategory.created_at,
    updated_at: dbCategory.updated_at
  }
}

/**
 * Converts workspace TopicCategory to database TopicCategoryDB
 */
export function workspaceCategoryToDb(category: TopicCategory): Partial<TopicCategoryDB> {
  return {
    id: category.id,
    episode_id: category.episode_id,
    name: category.name,
    description: category.description,
    color: category.color,
    icon: category.icon,
    order: category.order
  }
}
