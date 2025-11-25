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
