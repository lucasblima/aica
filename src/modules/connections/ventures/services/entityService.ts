import { supabase } from '@/lib/supabase';
import type {
  VenturesEntity,
  CreateEntityPayload,
  UpdateEntityPayload,
} from '../types';

/**
 * Entity Service
 *
 * Handles all CRUD operations for Ventures entities (businesses/companies).
 */
export const entityService = {
  /**
   * Get all entities for a specific space
   */
  async getEntitiesBySpace(spaceId: string): Promise<VenturesEntity[]> {
    try {
      const { data, error } = await supabase
        .from('ventures_entities')
        .select('*')
        .eq('space_id', spaceId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching ventures entities:', error);
        throw new Error(`Failed to fetch entities: ${error.message}`);
      }

      return data as VenturesEntity[];
    } catch (error) {
      console.error('Error in getEntitiesBySpace:', error);
      throw error;
    }
  },

  /**
   * Get a single entity by ID
   */
  async getEntityById(entityId: string): Promise<VenturesEntity> {
    try {
      const { data, error } = await supabase
        .from('ventures_entities')
        .select('*')
        .eq('id', entityId)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching entity:', error);
        throw new Error(`Failed to fetch entity: ${error.message}`);
      }

      if (!data) {
        throw new Error('Entity not found');
      }

      return data as VenturesEntity;
    } catch (error) {
      console.error('Error in getEntityById:', error);
      throw error;
    }
  },

  /**
   * Create a new entity
   */
  async createEntity(payload: CreateEntityPayload): Promise<VenturesEntity> {
    try {
      const { data, error } = await supabase
        .from('ventures_entities')
        .insert({
          ...payload,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating entity:', error);
        throw new Error(`Failed to create entity: ${error.message}`);
      }

      return data as VenturesEntity;
    } catch (error) {
      console.error('Error in createEntity:', error);
      throw error;
    }
  },

  /**
   * Update an existing entity
   */
  async updateEntity(
    entityId: string,
    payload: UpdateEntityPayload
  ): Promise<VenturesEntity> {
    try {
      const { data, error } = await supabase
        .from('ventures_entities')
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entityId)
        .select()
        .single();

      if (error) {
        console.error('Error updating entity:', error);
        throw new Error(`Failed to update entity: ${error.message}`);
      }

      if (!data) {
        throw new Error('Entity not found');
      }

      return data as VenturesEntity;
    } catch (error) {
      console.error('Error in updateEntity:', error);
      throw error;
    }
  },

  /**
   * Soft delete an entity (set is_active to false)
   */
  async deleteEntity(entityId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('ventures_entities')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entityId);

      if (error) {
        console.error('Error deleting entity:', error);
        throw new Error(`Failed to delete entity: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in deleteEntity:', error);
      throw error;
    }
  },
};
