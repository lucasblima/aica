import { supabase } from '../../../../src/services/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

// =====================================================
// Types
// =====================================================

/**
 * Represents a podcast episode (formerly called "Project")
 * Database table: podcast_episodes
 */
export interface Project {
    id: string;
    title: string;
    guest_name: string;
    episode_theme: string;
    biography: string;
    controversies: string[];
    ice_breakers: string[];
    status: 'draft' | 'in_production' | 'published' | 'archived';
    season?: string;
    scheduled_date?: string;
    location?: string;
    duration_minutes?: number;
    user_id?: string; // Owner of the episode (added for multi-user support)
    created_at: string;
    updated_at: string;
}

/**
 * Represents a topic/talking point for a podcast episode
 * Database table: podcast_topics
 * Note: Uses episode_id (not project_id) to match database schema
 */
export interface TopicDB {
    id: string;
    episode_id: string; // Foreign key to podcast_episodes.id (previously project_id)
    text: string;
    order: number;
    completed: boolean;
    archived: boolean;
    category_id?: string; // Optional category for topic grouping
    created_at: string;
    updated_at: string;
}

/**
 * Represents a category for organizing topics
 * Database table: podcast_topic_categories
 * Note: Uses episode_id (not project_id) to match database schema
 */
export interface TopicCategory {
    id: string;
    episode_id: string; // Foreign key to podcast_episodes.id (previously project_id)
    name: string;
    description?: string;
    color?: string; // Hex color code for category badge
    created_at: string;
    updated_at: string;
}

// =====================================================
// Episodes CRUD (formerly "Projects")
// =====================================================

/**
 * Creates a new podcast episode
 * @param project - Episode data (Project is the legacy name for Episode)
 * @returns The created episode
 */
export async function createProject(project: Partial<Project>): Promise<Project> {
    const { data, error } = await supabase
        .from('podcast_episodes')
        .insert([project])
        .select()
        .single();

    if (error) throw new Error(`Failed to create episode: ${error.message}`);
    return data;
}

/**
 * Retrieves a single podcast episode by ID
 * @param id - Episode ID
 * @returns The episode or null if not found
 */
export async function getProject(id: string): Promise<Project | null> {
    const { data, error } = await supabase
        .from('podcast_episodes')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Failed to get episode:', error);
        return null;
    }
    return data;
}

/**
 * Updates an existing podcast episode
 * @param id - Episode ID
 * @param updates - Partial episode data to update
 * @returns The updated episode
 */
export async function updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const { data, error } = await supabase
        .from('podcast_episodes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(`Failed to update episode: ${error.message}`);
    return data;
}

/**
 * Lists all podcast episodes
 * @param limit - Maximum number of episodes to return
 * @returns Array of episodes ordered by creation date (newest first)
 */
export async function listProjects(limit = 50): Promise<Project[]> {
    const { data, error } = await supabase
        .from('podcast_episodes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw new Error(`Failed to list episodes: ${error.message}`);
    return data || [];
}

/**
 * Lists podcast episodes for a specific season
 * @param season - Season identifier
 * @param limit - Maximum number of episodes to return
 * @returns Array of episodes ordered by scheduled date
 */
export async function listProjectsBySeason(season: string, limit = 50): Promise<Project[]> {
    const { data, error } = await supabase
        .from('podcast_episodes')
        .select('*')
        .eq('season', season)
        .order('scheduled_date', { ascending: true })
        .limit(limit);

    if (error) throw new Error(`Failed to list episodes by season: ${error.message}`);
    return data || [];
}

/**
 * Lists podcast episodes for a specific recording location/studio
 * @param studio - Studio/location name
 * @param limit - Maximum number of episodes to return
 * @returns Array of episodes ordered by scheduled date
 */
export async function listProjectsByStudio(studio: string, limit = 50): Promise<Project[]> {
    const { data, error } = await supabase
        .from('podcast_episodes')
        .select('*')
        .eq('location', studio)
        .order('scheduled_date', { ascending: true })
        .limit(limit);

    if (error) throw new Error(`Failed to list episodes by studio: ${error.message}`);
    return data || [];
}

/**
 * Deletes a podcast episode and all related data (cascading)
 * @param id - Episode ID
 */
export async function deleteProject(id: string): Promise<void> {
    const { error } = await supabase
        .from('podcast_episodes')
        .delete()
        .eq('id', id);

    if (error) throw new Error(`Failed to delete episode: ${error.message}`);
}

// =====================================================
// Topics CRUD
// =====================================================

/**
 * Creates a new topic for a podcast episode
 * @param projectId - Episode ID (parameter name kept for backward compatibility, but represents episode_id)
 * @param topic - Topic data
 * @returns The created topic
 */
export async function createTopic(projectId: string, topic: Partial<TopicDB>): Promise<TopicDB> {
    const { data, error } = await supabase
        .from('podcast_topics')
        .insert([{ ...topic, episode_id: projectId }])
        .select()
        .single();

    if (error) throw new Error(`Failed to create topic: ${error.message}`);
    return data;
}

/**
 * Retrieves all topics for a podcast episode
 * @param projectId - Episode ID (parameter name kept for backward compatibility, but represents episode_id)
 * @returns Array of topics ordered by their order field
 */
export async function getTopics(projectId: string): Promise<TopicDB[]> {
    const { data, error } = await supabase
        .from('podcast_topics')
        .select('*')
        .eq('episode_id', projectId)
        .order('order', { ascending: true });

    if (error) throw new Error(`Failed to get topics: ${error.message}`);
    return data || [];
}

/**
 * Updates an existing topic
 * @param id - Topic ID
 * @param updates - Partial topic data to update
 * @returns The updated topic
 */
export async function updateTopic(id: string, updates: Partial<TopicDB>): Promise<TopicDB> {
    const { data, error } = await supabase
        .from('podcast_topics')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(`Failed to update topic: ${error.message}`);
    return data;
}

/**
 * Deletes a topic
 * @param id - Topic ID
 */
export async function deleteTopic(id: string): Promise<void> {
    const { error } = await supabase
        .from('podcast_topics')
        .delete()
        .eq('id', id);

    if (error) throw new Error(`Failed to delete topic: ${error.message}`);
}

/**
 * Updates multiple topics in bulk
 * Note: Supabase doesn't support atomic bulk updates with different values,
 * so this performs individual updates in parallel
 * @param topics - Array of partial topic data with IDs
 */
export async function bulkUpdateTopics(topics: Partial<TopicDB>[]): Promise<void> {
    // Update topics one by one (Supabase doesn't support bulk update with different values)
    const promises = topics.map(topic => {
        if (!topic.id) return Promise.resolve();
        return updateTopic(topic.id, topic);
    });

    await Promise.all(promises);
}

// =====================================================
// Realtime Subscription
// =====================================================

/**
 * Subscribes to real-time changes for topics of a specific episode
 * @param projectId - Episode ID (parameter name kept for backward compatibility, but represents episode_id)
 * @param callback - Function called when topics change
 * @returns Realtime channel (call unsubscribe() to stop listening)
 */
export function subscribeToTopics(
    projectId: string,
    callback: (topics: TopicDB[]) => void
): RealtimeChannel {
    const channel = supabase
        .channel(`topics:${projectId}`)
        .on(
            'postgres_changes',
            {
                event: '*', // Listen to INSERT, UPDATE, DELETE
                schema: 'public',
                table: 'podcast_topics',
                filter: `episode_id=eq.${projectId}`
            },
            async () => {
                // When any change happens, refetch all topics
                const topics = await getTopics(projectId);
                callback(topics);
            }
        )
        .subscribe();

    return channel;
}

/**
 * Subscribes to real-time changes for all podcast episodes
 * @param callback - Function called when episodes change
 * @returns Realtime channel (call unsubscribe() to stop listening)
 */
export function subscribeToProjects(
    callback: (projects: Project[]) => void
): RealtimeChannel {
    const channel = supabase
        .channel('projects:all')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'podcast_episodes'
            },
            async () => {
                const projects = await listProjects();
                callback(projects);
            }
        )
        .subscribe();

    return channel;
}

// =====================================================
// Topic Categories CRUD
// =====================================================

/**
 * Creates a new topic category for an episode
 * @param projectId - Episode ID (parameter name kept for backward compatibility, but represents episode_id)
 * @param category - Category data (name, description, color)
 * @returns The created category
 */
export async function createCategory(projectId: string, category: { name: string; description?: string; color?: string }): Promise<TopicCategory> {
    // Temporarily exclude color to test
    const { color, ...categoryWithoutColor } = category;

    const { data, error } = await supabase
        .from('podcast_topic_categories')
        .insert([{ ...categoryWithoutColor, episode_id: projectId }])
        .select()
        .single();

    if (error) throw new Error(`Failed to create category: ${error.message}`);

    // If creation succeeded and color was provided, update with color
    if (data && color) {
        const { error: updateError } = await supabase
            .from('podcast_topic_categories')
            .update({ color })
            .eq('id', data.id);

        if (!updateError) {
            data.color = color;
        }
    }

    return data;
}

/**
 * Retrieves all categories for a podcast episode
 * @param projectId - Episode ID (parameter name kept for backward compatibility, but represents episode_id)
 * @returns Array of categories ordered by creation date
 */
export async function getCategories(projectId: string): Promise<TopicCategory[]> {
    const { data, error } = await supabase
        .from('podcast_topic_categories')
        .select('*')
        .eq('episode_id', projectId)
        .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to get categories: ${error.message}`);
    return data || [];
}

/**
 * Updates an existing category
 * @param id - Category ID
 * @param updates - Partial category data to update
 * @returns The updated category
 */
export async function updateCategory(id: string, updates: { name?: string; description?: string; color?: string }): Promise<TopicCategory> {
    const { data, error } = await supabase
        .from('podcast_topic_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(`Failed to update category: ${error.message}`);
    return data;
}

/**
 * Deletes a category
 * Note: Topics in this category will have their category_id set to null
 * @param id - Category ID
 */
export async function deleteCategory(id: string): Promise<void> {
    const { error } = await supabase
        .from('podcast_topic_categories')
        .delete()
        .eq('id', id);

    if (error) throw new Error(`Failed to delete category: ${error.message}`);
}
