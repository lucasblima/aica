import { supabase } from './supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('SupabaseService');


// Fetch all associations from Supabase
export const getAssociations = async () => {
    try {
        const { data, error } = await supabase
            .from('associations')
            .select(`
        id,
        name,
        description,
        type,
        cnpj,
        is_active,
        created_at,
        updated_at
      `)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        log.error('Error fetching associations from Supabase:', { error: error });
        return []; // Return empty array instead of throwing
    }
};

// Fetch association by ID
export const getAssociationById = async (id: string) => {
    try {
        const { data, error } = await supabase
            .from('associations')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        log.error(`Error fetching association ${id}:`, { error: error });
        return null; // Return null for single item queries
    }
};

// Fetch states for an association
export const getStatesByAssociation = async (associationId: string) => {
    try {
        const { data, error } = await supabase
            .from('states')
            .select('*')
            .eq('association_id', associationId)
            .eq('entity_type', 'work_item')
            .order('sequence', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        log.error(`Error fetching states for association ${associationId}:`, { error: error });
        return []; // Return empty array instead of throwing
    }
};

// Fetch work items for an association
export const getWorkItemsByAssociation = async (associationId: string) => {
    try {
        const { data, error } = await supabase
            .from('work_items')
            .select(`
        *,
        state:states(id, name),
        assignees:work_item_assignees(
          user:users(id, name)
        )
      `)
            .eq('association_id', associationId)
            .eq('archived', false)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        log.error(`Error fetching work items for association ${associationId}:`, { error: error });
        return []; // Return empty array instead of throwing
    }
};

// Update association sync status
export const updateAssociationSyncStatus = async (
    associationId: string,
    syncStatus: { synced_at?: string }
) => {
    try {
        const { data, error } = await supabase
            .from('associations')
            .update({
                ...syncStatus,
                updated_at: new Date().toISOString(),
            })
            .eq('id', associationId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        log.error(`Error updating association ${associationId} sync status:`, { error: error });
        throw error;
    }
};

// Get user profile from user_profiles table
// This is used to check onboarding status and other profile data
export const getUserProfile = async (userId: string) => {
    try {
        // First ensure user exists in public.users table
        await supabase.rpc('ensure_user_profile_exists', { p_user_id: userId });

        // Then query the user_profiles table for onboarding status
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) {
            // PGRST116 = no rows returned - user hasn't started onboarding yet
            if (error.code === 'PGRST116') {
                return null;
            }
            throw error;
        }

        return data;
    } catch (error) {
        log.error(`Error fetching profile for user ${userId}:`, { error: error });
        // Return null instead of throwing to avoid redirect loop on errors
        return null;
    }
};

// Get daily agenda (work items due today or overdue)
export const getDailyAgenda = async () => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('work_items')
            .select(`
                *,
                association:associations(name)
            `)
            .lte('due_date', today) // Due today or earlier (overdue) - simplified filter
            .eq('archived', false)
            .order('due_date', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        log.error('Error fetching daily agenda:', { error: error });
        return []; // Return empty array instead of throwing
    }
};

// Get life areas (modules)
export const getLifeAreas = async () => {
    try {
        const { data: modules, error: modulesError } = await supabase
            .from('modules')
            .select(`
                *,
                association:associations(name)
            `)
            .eq('archived', false);

        if (modulesError) throw modulesError;

        return modules || [];
    } catch (error) {
        log.error('Error fetching life areas:', { error: error });
        return []; // Return empty array instead of throwing
    }
};

// Get all work items (simplified query to avoid 400 Bad Request)
export const getWorkItems = async () => {
    try {
        // Simplificação: Buscar apenas tarefas não arquivadas e não concluídas.
        // Removido o filtro .or() complexo que causava erro 400.
        const { data, error } = await supabase
            .from('work_items')
            .select('*, association:associations(name)')
            .is('completed_at', null)
            .eq('archived', false)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        log.error('Error fetching work items:', { error: error });
        return []; // Retorna array vazio para não quebrar a UI
    }
};

// Create a new work item
export const createWorkItem = async (item: {
    title: string;
    association_id: string;
    priority?: string;
    due_date?: string;
    module_id?: string;
    description?: string;
    estimated_duration?: number;
    priority_quadrant?: 'urgent-important' | 'important' | 'urgent' | 'low';
}) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Get default state (first one)
        const { data: states, error: statesError } = await supabase
            .from('states')
            .select('id')
            .eq('association_id', item.association_id)
            .order('sequence', { ascending: true })
            .limit(1);

        if (statesError) {
            log.warn('[createWorkItem] Could not fetch states:', statesError);
        }

        const state_id = states?.[0]?.id;

        // If no state exists, we'll create the work item without a state_id
        const workItemData = {
            title: item.title,
            association_id: item.association_id,
            module_id: item.module_id || null,
            due_date: item.due_date || null,
            description: item.description || null,
            estimated_duration: item.estimated_duration || null,
            priority: item.priority || 'medium',
            priority_quadrant: item.priority_quadrant || 'low',
            state_id: state_id || null,
            created_by: user.id,
            archived: false,
            completed_at: null
        };

        const { data, error } = await supabase
            .from('work_items')
            .insert([workItemData])
            .select()
            .single();

        if (error) {
            log.error('[createWorkItem] Insert error:', { error: error });
            throw error;
        }

        return data;
    } catch (error) {
        log.error('Error creating work item:', { error: error });
        throw error;
    }
};


// Create a new module
export const createModule = async (module: {
    name: string;
    association_id: string;
    description?: string;
}) => {
    try {
        const { data, error } = await supabase
            .from('modules')
            .insert([module])
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        log.error('Error creating module:', { error: error });
        throw error;
    }
};

// Create a new association
export const createAssociation = async (association: {
    name: string;
    description?: string;
    type: 'personal' | 'association' | 'company' | 'network';
}) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Generate a unique slug from name + timestamp
        const baseSlug = association.name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
        const uniqueSlug = `${baseSlug}-${Date.now()}`;

        const { data, error } = await supabase
            .from('associations')
            .insert([{
                ...association,
                slug: uniqueSlug,
                workspace_id: '11111111-1111-1111-1111-111111111111', // Default workspace for MVP
                owner_user_id: user.id,
                is_active: true
            }])
            .select()
            .single();

        if (error) throw error;

        // Add user as admin member
        await supabase
            .from('association_members')
            .insert([{
                association_id: data.id,
                user_id: user.id,
                role: 'admin'
            }]);

        // Create default states for the association
        const states = [
            { name: 'A Fazer', color: '#EF4444', sequence: 1 },
            { name: 'Fazendo', color: '#FBBF24', sequence: 2 },
            { name: 'Feito', color: '#10B981', sequence: 3 }
        ];

        await supabase
            .from('states')
            .insert(states.map(s => ({
                association_id: data.id,
                entity_type: 'work_item',
                ...s
            })));

        return data;
    } catch (error) {
        log.error('Error creating association:', { error: error });
        throw error;
    }
};

// Get modules for a specific association
export const getAssociationModules = async (associationId: string) => {
    try {
        const { data, error } = await supabase
            .from('modules')
            .select('*')
            .eq('association_id', associationId)
            .eq('archived', false)
            .order('name');

        if (error) throw error;
        return data || [];
    } catch (error) {
        log.error(`Error fetching modules for association ${associationId}:`, { error: error });
        throw error;
    }
};

// Send WhatsApp message (via Supabase -> Webhook -> n8n)
export const sendMessage = async (content: string, senderId: string, matchId: string) => {
    try {
        const { data, error } = await supabase
            .from('pair_conversations')
            .insert([
                {
                    content,
                    sender_id: senderId,
                    match_id: matchId,
                    delivered: false,
                    moderation_status: 'pending'
                }
            ])
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        log.error('Error sending message:', { error: error });
        throw error;
    }
};

// Subscribe to message status updates
export const subscribeToMessageStatus = (messageId: string, onUpdate: (status: string) => void) => {
    return supabase
        .channel(`message-${messageId}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'pair_conversations',
                filter: `id=eq.${messageId}`
            },
            (payload) => {
                // Assuming 'moderation_status' or a new 'status' field tracks delivery
                // The user mentioned 'status' = 'sent' in their example, but schema has 'delivered' boolean and 'moderation_status'.
                // We will check 'delivered' boolean or 'moderation_status'.
                // Let's assume n8n updates 'delivered' to true.
                if (payload.new.delivered === true) {
                    onUpdate('sent');
                }
            }
        )
        .subscribe();
};

// ============================================
// LIFE VISUALIZATION & GAMIFICATION SERVICES
// ============================================

interface WeekMetrics {
    tasksCompleted: number;
    focusHours: number;
    avgMood?: number;
    achievements: string[];
}

interface WeekBlock {
    weekNumber: number;
    year: number;
    weekStartDate: Date;
    isPast: boolean;
    metrics: WeekMetrics;
    color: string;
    symbol?: 'trophy' | 'heart' | 'star' | 'fire';
}

interface TaskMetrics {
    difficulty: number;
    estimatedDuration: number;
    actualDuration?: number;
    priorityQuadrant: 'urgent-important' | 'important' | 'urgent' | 'low';
    roiScore?: number;
}

interface UserStats {
    totalTasks: number;
    level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Master';
    efficiencyScore: number;
    currentStreak: number;
    longestStreak: number;
    achievements: any[];
}

// Get user's birthdate from profile
export const getUserBirthdate = async (userId: string): Promise<Date | null> => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('birthdate')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return data?.birthdate ? new Date(data.birthdate) : null;
    } catch (error) {
        log.error('Error fetching user birthdate:', { error: error });
        return null;
    }
};

// Calculate life expectancy based on country
const getLifeExpectancy = (country: string = 'BR'): number => {
    const expectancies: Record<string, number> = {
        'BR': 76, // Brazil
        'US': 79,
        'JP': 84,
        'DE': 81,
        // Add more countries as needed
    };
    return expectancies[country] || 75; // Default
};

// Get all life weeks data for visualization
export const getLifeWeeksData = async (userId: string): Promise<WeekBlock[]> => {
    try {
        // Fetch user profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('birthdate, country')
            .eq('id', userId)
            .single();

        if (!profile?.birthdate) {
            throw new Error('User birthdate not set');
        }

        const birthdate = new Date(profile.birthdate);
        const lifeExpectancy = getLifeExpectancy(profile.country || 'BR');
        const totalWeeks = lifeExpectancy * 52;
        const now = new Date();

        // Calculate weeks lived
        const weeksLived = Math.floor((now.getTime() - birthdate.getTime()) / (7 * 24 * 60 * 60 * 1000));

        // Fetch all completed work items with dates
        const { data: workItems } = await supabase
            .from('work_items')
            .select('completed_at, id')
            .eq('archived', false)
            .not('completed_at', 'is', null);

        // Group tasks by week number
        const tasksByWeek: Record<number, number> = {};
        workItems?.forEach(item => {
            if (item.completed_at) {
                const completedDate = new Date(item.completed_at);
                const weeksSinceBirth = Math.floor((completedDate.getTime() - birthdate.getTime()) / (7 * 24 * 60 * 60 * 1000));
                tasksByWeek[weeksSinceBirth] = (tasksByWeek[weeksSinceBirth] || 0) + 1;
            }
        });

        // Generate week blocks
        const weeks: WeekBlock[] = [];
        for (let i = 0; i < totalWeeks; i++) {
            const weekStartDate = new Date(birthdate);
            weekStartDate.setDate(birthdate.getDate() + (i * 7));

            const isPast = i < weeksLived;
            const tasksCompleted = tasksByWeek[i] || 0;

            // Determine color based on productivity
            let color = '#E5E7EB'; // Gray for future
            if (isPast) {
                if (tasksCompleted === 0) {
                    color = '#1F2937'; // Black for no data
                } else if (tasksCompleted >= 5) {
                    color = '#10B981'; // Green for high productivity
                } else if (tasksCompleted >= 2) {
                    color = '#FBBF24'; // Yellow for moderate
                } else {
                    color = '#EF4444'; // Red for low
                }
            }

            weeks.push({
                weekNumber: i + 1,
                year: Math.floor(i / 52) + 1,
                weekStartDate,
                isPast,
                metrics: {
                    tasksCompleted,
                    focusHours: 0, // TODO: calculate from actual_duration
                    achievements: []
                },
                color,
                symbol: tasksCompleted >= 10 ? 'trophy' : undefined
            });
        }

        return weeks;
    } catch (error) {
        log.error('Error fetching life weeks data:', { error: error });
        throw error;
    }
};

// Get detailed metrics for a specific week
export const getWeekMetrics = async (userId: string, weekNumber: number): Promise<WeekMetrics> => {
    try {
        const birthdate = await getUserBirthdate(userId);
        if (!birthdate) throw new Error('Birthdate not found');

        // Calculate week date range
        const weekStart = new Date(birthdate);
        weekStart.setDate(birthdate.getDate() + ((weekNumber - 1) * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        // Fetch tasks completed in this week
        const { data: tasks, error } = await supabase
            .from('work_items')
            .select('id, completed_at, estimate_hours, actual_hours')
            .gte('completed_at', weekStart.toISOString())
            .lt('completed_at', weekEnd.toISOString())
            .eq('archived', false);

        if (error) throw error;

        const tasksCompleted = tasks?.length || 0;
        const focusHours = tasks?.reduce((sum, task) => sum + (task.actual_hours || task.estimate_hours || 0), 0) || 0;

        return {
            tasksCompleted,
            focusHours,
            achievements: [] // TODO: fetch from activity_log
        };
    } catch (error) {
        log.error('Error fetching week metrics:', { error: error });
        throw error;
    }
};

// Calculate task difficulty automatically based on various factors
export const calculateTaskDifficulty = async (taskId: string): Promise<number> => {
    try {
        const { data: task } = await supabase
            .from('work_items')
            .select('estimate_hours, priority')
            .eq('id', taskId)
            .single();

        if (!task) return 3; // Default medium difficulty

        // Simple heuristic: combine time estimate and priority
        let difficulty = 3;
        if (task.estimate_hours) {
            if (task.estimate_hours >= 8) difficulty = 5;
            else if (task.estimate_hours >= 4) difficulty = 4;
            else if (task.estimate_hours <= 1) difficulty = 2;
        }

        if (task.priority === 'urgent') difficulty = Math.min(5, difficulty + 1);

        return difficulty;
    } catch (error) {
        log.error('Error calculating task difficulty:', { error: error });
        return 3;
    }
};

// Update task metrics (difficulty, duration, ROI)
export const updateTaskMetrics = async (taskId: string, metrics: Partial<TaskMetrics>): Promise<void> => {
    try {
        const updateData: any = {};
        if (metrics.difficulty) updateData.difficulty = metrics.difficulty;
        if (metrics.estimatedDuration) updateData.estimated_duration = metrics.estimatedDuration;
        if (metrics.actualDuration) updateData.actual_duration = metrics.actualDuration;

        const { error } = await supabase
            .from('work_items')
            .update(updateData)
            .eq('id', taskId);

        if (error) throw error;
    } catch (error) {
        log.error('Error updating task metrics:', { error: error });
        throw error;
    }
};

// Get tasks for a specific module (Life Area)
export const getModuleTasks = async (moduleId: string, limit: number = 3) => {
    try {
        // Since we might not have a dedicated 'module' column in work_items yet,
        // we'll use a text search on title/description or tags if available.
        // Ideally, this should use a 'module' column or a 'tags' array.

        // Mapping module IDs to keywords
        const keywords: Record<string, string[]> = {
            'finance': ['pagar', 'compra', 'investimento', 'banco', 'cartão', 'dinheiro', 'finanças'],
            'health': ['médico', 'exame', 'treino', 'dieta', 'saúde', 'dentista', 'terapia'],
            'education': ['estudar', 'curso', 'aula', 'livro', 'ler', 'faculdade', 'inglês'],
            'legal': ['contrato', 'advogado', 'processo', 'documento', 'cartório', 'lei'],
            'community': ['reunião', 'festa', 'encontro', 'evento', 'associação', 'grupo'],
        };

        const searchTerms = keywords[moduleId] || [];

        let query = supabase
            .from('work_items')
            .select('*')
            .eq('archived', false)
            .is('completed_at', null) // Only pending tasks
            .order('created_at', { ascending: false })
            .limit(limit);

        if (searchTerms.length > 0) {
            // Construct an OR filter for keywords
            // ilike(column, pattern)
            // We want: title.ilike.%term1% OR title.ilike.%term2%...
            // Supabase 'or' syntax: 'title.ilike.%term1%,title.ilike.%term2%'
            const orFilter = searchTerms.map(term => `title.ilike.%${term}%`).join(',');
            query = query.or(orFilter);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
    } catch (error) {
        log.error(`Error fetching tasks for module ${moduleId}:`, { error: error });
        return [];
    }
};

// Get productivity statistics for a period
export const getProductivityStats = async (userId: string, period: 'week' | 'month' | 'year' = 'week'): Promise<any> => {
    try {
        const now = new Date();
        const startDate = new Date();

        switch (period) {
            case 'week':
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(now.getMonth() - 1);
                break;
            case 'year':
                startDate.setFullYear(now.getFullYear() - 1);
                break;
        }

        // Fetch completed tasks in period via associations
        const { data: tasks } = await supabase
            .from('work_items')
            .select(`
                id, 
                completed_at, 
                actual_hours, 
                estimate_hours,
                association_id,
                associations!inner (
                    association_members!inner (user_id)
                )
            `)
            .gte('completed_at', startDate.toISOString())
            .lte('completed_at', now.toISOString());

        const userTasks = tasks?.filter((task: any) =>
            task.associations?.association_members?.some((m: any) => m.user_id === userId)
        ) || [];

        const totalTasks = userTasks.length;
        const totalHours = userTasks.reduce((sum: number, task: any) =>
            sum + (task.actual_hours || task.estimate_hours || 0), 0
        );

        return {
            totalTasks,
            totalHours,
            avgTasksPerDay: totalTasks / (period === 'week' ? 7 : period === 'month' ? 30 : 365),
            efficiencyScore: totalHours > 0 ? (totalTasks / totalHours) * 10 : 0
        };
    } catch (error) {
        log.error('Error fetching productivity stats:', { error: error });
        return { totalTasks: 0, totalHours: 0, avgTasksPerDay: 0, efficiencyScore: 0 };
    }
};

// Get user's current level and stats
export const getUserLevel = async (userId: string): Promise<UserStats> => {
    try {
        const { data, error } = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) {
            // Return default if no stats yet
            return {
                totalTasks: 0,
                level: 'Beginner',
                efficiencyScore: 0,
                currentStreak: 0,
                longestStreak: 0,
                achievements: []
            };
        }

        return {
            totalTasks: data.total_tasks,
            level: data.level,
            efficiencyScore: data.efficiency_score,
            currentStreak: data.current_streak,
            longestStreak: data.longest_streak,
            achievements: data.achievements
        };
    } catch (error) {
        log.error('Error fetching user level:', { error: error });
        throw error;
    }
};

// Get user achievements
export const getAchievements = async (userId: string): Promise<any[]> => {
    try {
        const stats = await getUserLevel(userId);
        return stats.achievements || [];
    } catch (error) {
        log.error('Error fetching achievements:', { error: error });
        return [];
    }
};

// Award achievement to user
export const awardAchievement = async (userId: string, achievementId: string): Promise<void> => {
    try {
        const stats = await getUserLevel(userId);

        // Check if achievement already exists
        const hasAchievement = stats.achievements.some((a: any) => a.id === achievementId);
        if (hasAchievement) return;

        // Add new achievement
        const newAchievements = [
            ...stats.achievements,
            {
                id: achievementId,
                date: new Date().toISOString()
            }
        ];

        const { error } = await supabase
            .from('user_stats')
            .update({ achievements: newAchievements, updated_at: new Date().toISOString() })
            .eq('user_id', userId);

        if (error) throw error;
    } catch (error) {
        log.error('Error awarding achievement:', { error: error });
        throw error;
    }
};


// Update user profile (e.g. birth_date)
export const updateUserProfile = async (userId: string, updates: any) => {
    try {
        // 1. Try to update first
        const { data, error } = await supabase
            .from('users')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', userId)
            .select(); // Remove .single() to avoid error on 0 rows

        if (error) throw error;

        // 2. If updated successfully and found a row, return it
        if (data && data.length > 0) {
            return data[0];
        }

        // 3. If no row updated, user might not exist in public.users. Let's create them.
        log.debug('User not found in public.users, creating...');

        // Get auth user details to populate required fields (like name)
        const { data: { user } } = await supabase.auth.getUser();

        if (!user || user.id !== userId) {
            throw new Error('User context mismatch or not logged in');
        }

        // Determine name from metadata or email
        const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';

        // Insert new user row with required fields
        const { data: newData, error: insertError } = await supabase
            .from('users')
            .insert([{
                id: userId,
                name: name, // Required field based on error logs
                active: true,
                ...updates,
                updated_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (insertError) throw insertError;
        return newData;

    } catch (error) {
        log.error('Error updating user profile:', { error: error });
        throw error;
    }
};

// Get life events
export const getLifeEvents = async () => {
    try {
        const { data, error } = await supabase
            .from('life_events')
            .select('*')
            .order('week_number', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        log.error('Error fetching life events:', { error: error });
        throw error;
    }
};

// Create life event
export const createLifeEvent = async (event: {
    title: string;
    description?: string;
    week_number: number;
    event_date?: string;
    type?: string;
    status?: string;
    module?: string;
}) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('life_events')
            .insert([{
                ...event,
                user_id: user.id
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        log.error('Error creating life event:', { error: error });
        throw error;
    }
};

// ============================================
// ONBOARDING SERVICES
// ============================================

/**
 * Current onboarding version - increment this when adding new onboarding features
 * that should be shown to existing users.
 *
 * Version history:
 * - 0: No onboarding completed
 * - 1: Legacy onboarding (basic wizard)
 * - 2: New onboarding with Welcome Tour, Trails, and Moment Capture
 */
export const CURRENT_ONBOARDING_VERSION = 2;

// Check if user has completed the CURRENT onboarding version
export const hasCompletedOnboarding = async (userId: string): Promise<boolean> => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('onboarding_completed, onboarding_version')
            .eq('id', userId)
            .single();

        if (error) {
            // If user doesn't exist yet, they haven't completed onboarding
            return false;
        }

        // User must have completed onboarding AND be on the current version
        const userVersion = data?.onboarding_version ?? 0;
        const hasCompleted = data?.onboarding_completed ?? false;

        // If user's version is less than current, they need to see new onboarding
        if (userVersion < CURRENT_ONBOARDING_VERSION) {
            log.debug(`[Onboarding] User ${userId} has version ${userVersion}, current is ${CURRENT_ONBOARDING_VERSION}. Showing onboarding.`);
            return false;
        }

        return hasCompleted;
    } catch (error) {
        log.error('Error checking onboarding status:', { error: error });
        return false;
    }
};

// Mark onboarding as completed with current version
export const completeOnboarding = async (userId: string, connectedCalendar: boolean = false): Promise<void> => {
    try {
        const { error } = await supabase
            .from('users')
            .update({
                onboarding_completed: true,
                onboarding_version: CURRENT_ONBOARDING_VERSION,
                onboarding_completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (error) {
            // If update fails, user might not exist - create them
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';

            const { error: insertError } = await supabase
                .from('users')
                .insert([{
                    id: userId,
                    name: name,
                    active: true,
                    onboarding_completed: true,
                    onboarding_version: CURRENT_ONBOARDING_VERSION,
                    onboarding_completed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }]);

            if (insertError) throw insertError;
        }

        // Log onboarding completion
        log.debug(`[Onboarding] User ${userId} completed onboarding v${CURRENT_ONBOARDING_VERSION}. Calendar connected: ${connectedCalendar}`);
    } catch (error) {
        log.error('Error completing onboarding:', { error: error });
        throw error;
    }
};
