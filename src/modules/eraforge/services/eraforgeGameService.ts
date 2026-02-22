/**
 * EraForge Game Service
 *
 * CRUD operations for eraforge game tables: child_profiles, worlds, world_members.
 * Follows Flux AthleteService pattern (static class, { data, error } tuples).
 */

import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type {
  ChildProfile,
  ChildProfileCreateInput,
  ChildProfileUpdateInput,
  World,
  WorldCreateInput,
  WorldUpdateInput,
  WorldMember,
  WorldMemberCreateInput,
} from '../types/eraforge.types';

const log = createNamespacedLogger('EraforgeGameService');

export class EraforgeGameService {
  // ============================================
  // CHILD PROFILES
  // ============================================

  static async getChildProfiles(): Promise<{ data: ChildProfile[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('eraforge_child_profiles')
        .select('*')
        .order('display_name');

      return { data, error };
    } catch (error) {
      log.error('Error fetching child profiles:', error);
      return { data: null, error };
    }
  }

  static async getChildProfile(id: string): Promise<{ data: ChildProfile | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('eraforge_child_profiles')
        .select('*')
        .eq('id', id)
        .single();

      return { data, error };
    } catch (error) {
      log.error('Error fetching child profile:', error);
      return { data: null, error };
    }
  }

  static async createChildProfile(input: ChildProfileCreateInput): Promise<{ data: ChildProfile | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('eraforge_child_profiles')
        .insert(input)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      log.error('Error creating child profile:', error);
      return { data: null, error };
    }
  }

  static async updateChildProfile(id: string, input: ChildProfileUpdateInput): Promise<{ data: ChildProfile | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('eraforge_child_profiles')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      log.error('Error updating child profile:', error);
      return { data: null, error };
    }
  }

  static async deleteChildProfile(id: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('eraforge_child_profiles')
        .delete()
        .eq('id', id);

      return { error };
    } catch (error) {
      log.error('Error deleting child profile:', error);
      return { error };
    }
  }

  // ============================================
  // WORLDS
  // ============================================

  static async getWorlds(): Promise<{ data: World[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('eraforge_worlds')
        .select('*')
        .order('created_at', { ascending: false });

      return { data, error };
    } catch (error) {
      log.error('Error fetching worlds:', error);
      return { data: null, error };
    }
  }

  static async getWorld(id: string): Promise<{ data: World | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('eraforge_worlds')
        .select('*')
        .eq('id', id)
        .single();

      return { data, error };
    } catch (error) {
      log.error('Error fetching world:', error);
      return { data: null, error };
    }
  }

  static async createWorld(input: WorldCreateInput): Promise<{ data: World | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('eraforge_worlds')
        .insert(input)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      log.error('Error creating world:', error);
      return { data: null, error };
    }
  }

  static async updateWorld(id: string, input: WorldUpdateInput): Promise<{ data: World | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('eraforge_worlds')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      log.error('Error updating world:', error);
      return { data: null, error };
    }
  }

  // ============================================
  // WORLD MEMBERS
  // ============================================

  static async getWorldMembers(worldId: string): Promise<{ data: WorldMember[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('eraforge_world_members')
        .select('*')
        .eq('world_id', worldId);

      return { data, error };
    } catch (error) {
      log.error('Error fetching world members:', error);
      return { data: null, error };
    }
  }

  static async joinWorld(input: WorldMemberCreateInput): Promise<{ data: WorldMember | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('eraforge_world_members')
        .insert(input)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      log.error('Error joining world:', error);
      return { data: null, error };
    }
  }

  static async getChildMember(worldId: string, childId: string): Promise<{ data: WorldMember | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('eraforge_world_members')
        .select('*')
        .eq('world_id', worldId)
        .eq('child_id', childId)
        .single();

      return { data, error };
    } catch (error) {
      log.error('Error fetching child member:', error);
      return { data: null, error };
    }
  }
}
