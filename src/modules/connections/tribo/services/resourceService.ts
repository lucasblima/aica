import { supabase } from '@/lib/supabase';
import type {
  SharedResource,
  CreateResourcePayload,
  UpdateResourcePayload,
  CheckoutResourcePayload,
} from '../types';

export const resourceService = {
  // Get all resources for a space
  async getResources(spaceId: string): Promise<SharedResource[]> {
    const { data, error } = await supabase
      .from('tribo_shared_resources')
      .select(
        `
        *,
        currentHolder:connection_members!current_holder_id(
          id,
          user_id,
          display_name,
          avatar_url
        )
      `
      )
      .eq('space_id', spaceId)
      .order('name', { ascending: true });

    if (error) throw error;

    return (data || []).map(transformResourceFromDB);
  },

  // Get available resources
  async getAvailableResources(spaceId: string): Promise<SharedResource[]> {
    const { data, error } = await supabase
      .from('tribo_shared_resources')
      .select('*')
      .eq('space_id', spaceId)
      .eq('is_available', true)
      .order('name', { ascending: true });

    if (error) throw error;

    return (data || []).map(transformResourceFromDB);
  },

  // Get resources by category
  async getResourcesByCategory(
    spaceId: string,
    category: string
  ): Promise<SharedResource[]> {
    const { data, error } = await supabase
      .from('tribo_shared_resources')
      .select(
        `
        *,
        currentHolder:connection_members!current_holder_id(
          id,
          user_id,
          display_name,
          avatar_url
        )
      `
      )
      .eq('space_id', spaceId)
      .eq('category', category)
      .order('name', { ascending: true });

    if (error) throw error;

    return (data || []).map(transformResourceFromDB);
  },

  // Get single resource
  async getResource(resourceId: string): Promise<SharedResource> {
    const { data, error } = await supabase
      .from('tribo_shared_resources')
      .select(
        `
        *,
        currentHolder:connection_members!current_holder_id(
          id,
          user_id,
          display_name,
          avatar_url
        )
      `
      )
      .eq('id', resourceId)
      .single();

    if (error) throw error;

    return transformResourceFromDB(data);
  },

  // Create resource
  async createResource(payload: CreateResourcePayload): Promise<SharedResource> {
    const { data, error } = await supabase
      .from('tribo_shared_resources')
      .insert({
        space_id: payload.spaceId,
        name: payload.name,
        description: payload.description,
        category: payload.category || 'equipment',
        estimated_value: payload.estimatedValue,
        images: payload.images || [],
        usage_notes: payload.usageNotes,
      })
      .select()
      .single();

    if (error) throw error;

    return transformResourceFromDB(data);
  },

  // Update resource
  async updateResource(
    resourceId: string,
    payload: UpdateResourcePayload
  ): Promise<SharedResource> {
    const updateData: any = {};

    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.category !== undefined) updateData.category = payload.category;
    if (payload.estimatedValue !== undefined)
      updateData.estimated_value = payload.estimatedValue;
    if (payload.images !== undefined) updateData.images = payload.images;
    if (payload.usageNotes !== undefined) updateData.usage_notes = payload.usageNotes;

    const { data, error } = await supabase
      .from('tribo_shared_resources')
      .update(updateData)
      .eq('id', resourceId)
      .select(
        `
        *,
        currentHolder:connection_members!current_holder_id(
          id,
          user_id,
          display_name,
          avatar_url
        )
      `
      )
      .single();

    if (error) throw error;

    return transformResourceFromDB(data);
  },

  // Checkout (reserve) resource
  async checkoutResource(payload: CheckoutResourcePayload): Promise<SharedResource> {
    const { data, error } = await supabase
      .from('tribo_shared_resources')
      .update({
        is_available: false,
        current_holder_id: payload.memberId,
        checked_out_at: new Date().toISOString(),
        return_date: payload.returnDate,
      })
      .eq('id', payload.resourceId)
      .select(
        `
        *,
        currentHolder:connection_members!current_holder_id(
          id,
          user_id,
          display_name,
          avatar_url
        )
      `
      )
      .single();

    if (error) throw error;

    return transformResourceFromDB(data);
  },

  // Return resource
  async returnResource(resourceId: string): Promise<SharedResource> {
    const { data, error } = await supabase
      .from('tribo_shared_resources')
      .update({
        is_available: true,
        current_holder_id: null,
        checked_out_at: null,
        return_date: null,
      })
      .eq('id', resourceId)
      .select()
      .single();

    if (error) throw error;

    return transformResourceFromDB(data);
  },

  // Delete resource
  async deleteResource(resourceId: string): Promise<void> {
    const { error } = await supabase
      .from('tribo_shared_resources')
      .delete()
      .eq('id', resourceId);

    if (error) throw error;
  },

  // Get resources checked out by a member
  async getMemberResources(memberId: string): Promise<SharedResource[]> {
    const { data, error } = await supabase
      .from('tribo_shared_resources')
      .select(
        `
        *,
        currentHolder:connection_members!current_holder_id(
          id,
          user_id,
          display_name,
          avatar_url
        )
      `
      )
      .eq('current_holder_id', memberId)
      .order('checked_out_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(transformResourceFromDB);
  },

  // Get overdue resources
  async getOverdueResources(spaceId: string): Promise<SharedResource[]> {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('tribo_shared_resources')
      .select(
        `
        *,
        currentHolder:connection_members!current_holder_id(
          id,
          user_id,
          display_name,
          avatar_url
        )
      `
      )
      .eq('space_id', spaceId)
      .eq('is_available', false)
      .lt('return_date', today)
      .order('return_date', { ascending: true });

    if (error) throw error;

    return (data || []).map(transformResourceFromDB);
  },
};

// ============= TRANSFORMERS =============

function transformResourceFromDB(data: any): SharedResource {
  return {
    id: data.id,
    spaceId: data.space_id,
    name: data.name,
    description: data.description,
    category: data.category,
    isAvailable: data.is_available,
    currentHolderId: data.current_holder_id,
    checkedOutAt: data.checked_out_at,
    returnDate: data.return_date,
    estimatedValue: data.estimated_value,
    images: data.images || [],
    usageNotes: data.usage_notes,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    currentHolder: data.currentHolder
      ? {
          id: data.currentHolder.id,
          userId: data.currentHolder.user_id,
          displayName: data.currentHolder.display_name,
          avatarUrl: data.currentHolder.avatar_url,
        }
      : undefined,
  };
}
