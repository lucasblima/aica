import { supabase } from '../../../services/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

// =====================================================
// Types
// =====================================================

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
    created_at: string;
    updated_at: string;
}

export interface TopicDB {
    id: string;
    project_id: string;
    text: string;
    order: number;
    completed: boolean;
    archived: boolean;
    category_id?: string;
    created_at: string;
    updated_at: string;
}

export interface TopicCategory {
    id: string;
    project_id: string;
    name: string;
    description?: string;
    color?: string; // Hex color code for category badge
    created_at: string;
    updated_at: string;
}

// =====================================================
// Projects CRUD
// =====================================================

export async function createProject(project: Partial<Project>): Promise<Project> {
    const { data, error } = await supabase
        .from('podcast_episodes')
        .insert([project])
        .select()
        .single();

    if (error) throw new Error(`Failed to create project: ${error.message}`);
    return data;
}

export async function getProject(id: string): Promise<Project | null> {
    const { data, error } = await supabase
        .from('podcast_episodes')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Failed to get project:', error);
        return null;
    }
    return data;
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const { data, error } = await supabase
        .from('podcast_episodes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(`Failed to update project: ${error.message}`);
    return data;
}

export async function listProjects(limit = 50): Promise<Project[]> {
    const { data, error } = await supabase
        .from('podcast_episodes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw new Error(`Failed to list projects: ${error.message}`);
    return data || [];
}

export async function listProjectsBySeason(season: string, limit = 50): Promise<Project[]> {
    const { data, error } = await supabase
        .from('podcast_episodes')
        .select('*')
        .eq('season', season)
        .order('scheduled_date', { ascending: true })
        .limit(limit);

    if (error) throw new Error(`Failed to list projects by season: ${error.message}`);
    return data || [];
}

export async function listProjectsByStudio(studio: string, limit = 50): Promise<Project[]> {
    const { data, error } = await supabase
        .from('podcast_episodes')
        .select('*')
        .eq('location', studio)
        .order('scheduled_date', { ascending: true })
        .limit(limit);

    if (error) throw new Error(`Failed to list projects by studio: ${error.message}`);
    return data || [];
}

export async function deleteProject(id: string): Promise<void> {
    const { error } = await supabase
        .from('podcast_episodes')
        .delete()
        .eq('id', id);

    if (error) throw new Error(`Failed to delete project: ${error.message}`);
}

// =====================================================
// Topics CRUD
// =====================================================

export async function createTopic(projectId: string, topic: Partial<TopicDB>): Promise<TopicDB> {
    const { data, error } = await supabase
        .from('podcast_topics')
        .insert([{ ...topic, episode_id: projectId }])
        .select()
        .single();

    if (error) throw new Error(`Failed to create topic: ${error.message}`);
    return data;
}

export async function getTopics(projectId: string): Promise<TopicDB[]> {
    const { data, error } = await supabase
        .from('podcast_topics')
        .select('*')
        .eq('episode_id', projectId)
        .order('order', { ascending: true });

    if (error) throw new Error(`Failed to get topics: ${error.message}`);
    return data || [];
}

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

export async function deleteTopic(id: string): Promise<void> {
    const { error } = await supabase
        .from('podcast_topics')
        .delete()
        .eq('id', id);

    if (error) throw new Error(`Failed to delete topic: ${error.message}`);
}

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

export async function getCategories(projectId: string): Promise<TopicCategory[]> {
    const { data, error } = await supabase
        .from('podcast_topic_categories')
        .select('*')
        .eq('episode_id', projectId)
        .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to get categories: ${error.message}`);
    return data || [];
}

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

export async function deleteCategory(id: string): Promise<void> {
    const { error } = await supabase
        .from('podcast_topic_categories')
        .delete()
        .eq('id', id);

    if (error) throw new Error(`Failed to delete category: ${error.message}`);
}
