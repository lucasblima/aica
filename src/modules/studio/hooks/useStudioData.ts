import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabaseClient';
import type { Topic, TopicCategory } from '@/modules/studio/types';
import { getCategories } from '../services/workspaceDatabaseService';
import { arrayMove } from '@dnd-kit/sortable';
import { DragEndEvent } from '@dnd-kit/core';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('useStudioData');

// Database type for topics (from Supabase)
interface TopicDB {
    id: string;
    text: string;
    completed: boolean;
    order: number;
    archived: boolean;
    category_id?: string;
}

// Ice Breaker type
interface IceBreaker {
    text: string;
    archived: boolean;
}

interface UseStudioDataProps {
    projectId: string;
    dossier: any;
}

export const useStudioData = ({ projectId, dossier }: UseStudioDataProps) => {
    // Topics State
    const [topics, setTopics] = useState<Topic[]>([]);
    const [loadingTopics, setLoadingTopics] = useState(true);
    const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());

    // Categories State
    const [categories, setCategories] = useState<TopicCategory[]>([]);

    // Ice Breakers State
    const [localIceBreakers, setLocalIceBreakers] = useState<IceBreaker[]>([]);

    // Project Edit State
    const [isEditingProject, setIsEditingProject] = useState(false);
    const [editedProject, setEditedProject] = useState<{
        season?: string;
        location?: string;
        duration_minutes?: number;
        scheduled_date?: string;
    }>({});
    const [isSavingProject, setIsSavingProject] = useState(false);

    // Helper to trigger highlight
    const triggerHighlight = (id: string) => {
        setHighlightedIds(prev => new Set(prev).add(id));
        setTimeout(() => {
            setHighlightedIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }, 2000);
    };

    // Load Categories
    useEffect(() => {
        if (!projectId) return;
        const fetchCategories = async () => {
            try {
                const cats = await getCategories(projectId);
                // Convert TopicCategoryDB to TopicCategory
                const converted: TopicCategory[] = cats.map(cat => ({
                    id: cat.id,
                    name: cat.name,
                    color: cat.color || '#3B82F6',
                    episode_id: cat.episode_id,
                    description: cat.description,
                    icon: cat.icon,
                    order: cat.order,
                    created_at: cat.created_at,
                    updated_at: cat.updated_at
                }));
                setCategories(converted);
            } catch (error) {
                log.error('Error loading categories:', error);
            }
        };
        fetchCategories();
    }, [projectId]);

    // Load Topics & Realtime
    useEffect(() => {
        if (!projectId) return;

        const fetchTopics = async () => {
            setLoadingTopics(true);
            const { data, error } = await supabase
                .from('podcast_topics')
                .select('*')
                .eq('episode_id', projectId)
                .order('order', { ascending: true });

            if (error) log.error('Error fetching topics:', error);
            else if (data) {
                setTopics(data.map((t: TopicDB) => ({
                    id: t.id,
                    text: t.text,
                    completed: t.completed,
                    order: t.order,
                    archived: t.archived,
                    categoryId: t.category_id
                })));
            }
            setLoadingTopics(false);
        };

        fetchTopics();

        const channel = supabase
            .channel(`project_topics_${projectId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'podcast_topics', filter: `episode_id=eq.${projectId}` }, payload => {
                if (payload.eventType === 'INSERT') {
                    const newTopic = payload.new as TopicDB;
                    setTopics(prev => {
                        if (prev.some(t => t.id === newTopic.id)) return prev;
                        return [...prev, {
                            id: newTopic.id,
                            text: newTopic.text,
                            completed: newTopic.completed,
                            order: newTopic.order,
                            archived: newTopic.archived,
                            categoryId: newTopic.category_id
                        }].sort((a, b) => a.order - b.order);
                    });
                    triggerHighlight(newTopic.id);
                } else if (payload.eventType === 'UPDATE') {
                    const updated = payload.new as TopicDB;
                    setTopics(prev =>
                        prev.map(t => (t.id === updated.id ? {
                            ...t,
                            text: updated.text,
                            completed: updated.completed,
                            order: updated.order,
                            archived: updated.archived,
                            categoryId: updated.category_id
                        } : t)).sort((a, b) => a.order - b.order)
                    );
                } else if (payload.eventType === 'DELETE') {
                    setTopics(prev => prev.filter(t => t.id !== payload.old.id));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [projectId]);

    // Initialize Ice Breakers
    useEffect(() => {
        if (dossier && dossier.iceBreakers) {
            const normalized: IceBreaker[] = dossier.iceBreakers.map((ib: any) =>
                typeof ib === 'string'
                    ? { text: ib, archived: false }
                    : ib
            );
            setLocalIceBreakers(normalized);
        }
    }, [dossier]);

    // Topic Actions
    const addTopic = async (text: string, categoryId?: string | null) => {
        if (!text.trim()) return;
        const order = topics.filter(t => !t.archived).length;
        const { data } = await supabase
            .from('podcast_topics')
            .insert([{
                episode_id: projectId,
                text,
                order,
                completed: false,
                archived: false,
                category_id: categoryId
            }])
            .select();

        if (data && data[0]) {
            triggerHighlight(data[0].id);
        }
    };

    const toggleTopic = async (id: string) => {
        const topic = topics.find(t => t.id === id);
        if (topic) {
            // Optimistic update
            setTopics(prev => prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t)));
            await supabase.from('podcast_topics').update({ completed: !topic.completed }).eq('id', id);
        }
    };

    const archiveTopic = async (id: string) => {
        setTopics(prev => prev.map(t => (t.id === id ? { ...t, archived: true } : t)));
        await supabase.from('podcast_topics').update({ archived: true }).eq('id', id);
    };

    const unarchiveTopic = async (id: string) => {
        setTopics(prev => prev.map(t => (t.id === id ? { ...t, archived: false } : t)));
        await supabase.from('podcast_topics').update({ archived: false }).eq('id', id);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIdx = topics.findIndex(i => i.id === active.id);
            const newIdx = topics.findIndex(i => i.id === over.id);
            const newItems = arrayMove(topics, oldIdx, newIdx);
            const updated = newItems.map((item: Topic, idx) => ({ ...item, order: idx }));
            setTopics(updated);
            await Promise.all(updated.map(item => supabase.from('podcast_topics').update({ order: item.order }).eq('id', item.id)));
        }
    };

    // Ice Breaker Actions
    const updateIceBreakers = async (updated: IceBreaker[]) => {
        setLocalIceBreakers(updated);
        await supabase
            .from('podcast_episodes')
            .update({ ice_breakers: updated })
            .eq('id', projectId);
    };

    // Project Actions
    const updateProjectInfo = async (updates: any) => {
        setIsSavingProject(true);
        try {
            const { error } = await supabase
                .from('podcast_episodes')
                .update(updates)
                .eq('id', projectId);

            if (error) throw error;
            setIsEditingProject(false);
        } catch (e) {
            log.error('Failed to save project:', e);
            throw e;
        } finally {
            setIsSavingProject(false);
        }
    };

    return {
        topics,
        loadingTopics,
        highlightedIds,
        categories,
        localIceBreakers,
        isEditingProject,
        editedProject,
        isSavingProject,
        setIsEditingProject,
        setEditedProject,
        addTopic,
        toggleTopic,
        archiveTopic,
        unarchiveTopic,
        handleDragEnd,
        updateIceBreakers,
        updateProjectInfo
    };
};
