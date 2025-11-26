import { supabase } from './supabaseClient';

// Fetch all associations from Supabase
export const getAssociations = async () => {
    try {
        const { data, error } = await supabase
            .from('associations')
            .select(`
        id,
        name,
        description,
        cnpj,
        plane_project_id,
        plane_workspace_slug,
        plane_synced_at,
        is_active,
        created_at,
        updated_at
      `)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching associations from Supabase:', error);
        throw error;
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
        console.error(`Error fetching association ${id}:`, error);
        throw error;
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
        console.error(`Error fetching states for association ${associationId}:`, error);
        throw error;
    }
};

// Fetch work items for an association
export const getWorkItemsByAssociation = async (associationId: string) => {
    try {
        const { data, error } = await supabase
            .from('work_items')
            .select(`
        *,
        state:states(id, name, plane_state_id),
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
        console.error(`Error fetching work items for association ${associationId}:`, error);
        throw error;
    }
};

// Update association sync status
export const updateAssociationSyncStatus = async (
    associationId: string,
    syncStatus: { plane_synced_at?: string }
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
        console.error(`Error updating association ${associationId} sync status:`, error);
        throw error;
    }
};

// Get user plane mapping
export const getUserPlaneMapping = async (userId: string) => {
    try {
        const { data, error } = await supabase
            .from('user_plane_mapping')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            throw error;
        }
        return data;
    } catch (error) {
        console.error(`Error fetching plane mapping for user ${userId}:`, error);
        throw error;
    }
};

// Get user profile
export const getUserProfile = async (userId: string) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error(`Error fetching profile for user ${userId}:`, error);
        throw error;
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
            .or(`due_date.eq.${today},due_date.lt.${today}`) // Today or Overdue
            .eq('archived', false)
            .order('due_date', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching daily agenda:', error);
        throw error;
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
        console.error('Error fetching life areas:', error);
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
        console.error('Error sending message:', error);
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
        console.error('Error fetching user birthdate:', error);
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
        console.error('Error fetching life weeks data:', error);
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
        console.error('Error fetching week metrics:', error);
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
        console.error('Error calculating task difficulty:', error);
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
        if (metrics.priorityQuadrant) updateData.priority_quadrant = metrics.priorityQuadrant;
        if (metrics.roiScore) updateData.roi_score = metrics.roiScore;

        const { error } = await supabase
            .from('task_metrics')
            .upsert({ work_item_id: taskId, ...updateData, updated_at: new Date().toISOString() })
            .eq('work_item_id', taskId);

        if (error) throw error;
    } catch (error) {
        console.error('Error updating task metrics:', error);
        throw error;
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
        console.error('Error fetching productivity stats:', error);
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
        console.error('Error fetching user level:', error);
        throw error;
    }
};

// Get user achievements
export const getAchievements = async (userId: string): Promise<any[]> => {
    try {
        const stats = await getUserLevel(userId);
        return stats.achievements || [];
    } catch (error) {
        console.error('Error fetching achievements:', error);
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
        console.error('Error awarding achievement:', error);
        throw error;
    }
};

