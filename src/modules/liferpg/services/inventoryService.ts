/**
 * Inventory Service — CRUD for entity_inventory table.
 */

import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type { InventoryItem } from '../types/liferpg';

const log = createNamespacedLogger('InventoryService');

export interface CreateInventoryItemInput {
  persona_id: string;
  name: string;
  category?: string;
  subcategory?: string;
  location?: string;
  condition?: number;
  quantity?: number;
  unit?: string;
  attributes?: Record<string, unknown>;
  purchase_price?: number;
  current_value?: number;
  purchase_date?: string;
  photo_urls?: string[];
  notes?: string;
}

export interface UpdateInventoryItemInput {
  name?: string;
  category?: string;
  subcategory?: string;
  location?: string;
  condition?: number;
  quantity?: number;
  unit?: string;
  attributes?: Record<string, unknown>;
  purchase_price?: number;
  current_value?: number;
  purchase_date?: string;
  photo_urls?: string[];
  notes?: string;
}

export interface InventoryFilters {
  category?: string;
  location?: string;
  conditionBelow?: number;
  searchTerm?: string;
}

export class InventoryService {
  static async getItems(
    personaId: string,
    filters?: InventoryFilters
  ): Promise<{ data: InventoryItem[] | null; error: unknown }> {
    try {
      let query = supabase
        .from('entity_inventory')
        .select('*')
        .eq('persona_id', personaId)
        .order('updated_at', { ascending: false });

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.location) {
        query = query.eq('location', filters.location);
      }
      if (filters?.conditionBelow) {
        query = query.lt('condition', filters.conditionBelow);
      }
      if (filters?.searchTerm) {
        query = query.ilike('name', `%${filters.searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      log.error('Failed to get inventory items', { err });
      return { data: null, error: err };
    }
  }

  static async createItem(
    input: CreateInventoryItemInput
  ): Promise<{ data: InventoryItem | null; error: unknown }> {
    try {
      const { data, error } = await supabase
        .from('entity_inventory')
        .insert(input)
        .select()
        .single();

      if (error) throw error;

      // Log event
      await supabase.from('entity_event_log').insert({
        persona_id: input.persona_id,
        event_type: 'item_added',
        event_data: { item_name: input.name, category: input.category },
        triggered_by: 'user',
      });

      return { data, error: null };
    } catch (err) {
      log.error('Failed to create inventory item', { err });
      return { data: null, error: err };
    }
  }

  static async updateItem(
    itemId: string,
    input: UpdateInventoryItemInput
  ): Promise<{ data: InventoryItem | null; error: unknown }> {
    try {
      const { data, error } = await supabase
        .from('entity_inventory')
        .update(input)
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      log.error('Failed to update inventory item', { err });
      return { data: null, error: err };
    }
  }

  static async deleteItem(
    itemId: string,
    personaId: string,
    itemName: string
  ): Promise<{ success: boolean; error: unknown }> {
    try {
      const { error } = await supabase
        .from('entity_inventory')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      // Log event
      await supabase.from('entity_event_log').insert({
        persona_id: personaId,
        event_type: 'item_removed',
        event_data: { item_name: itemName },
        triggered_by: 'user',
      });

      return { success: true, error: null };
    } catch (err) {
      log.error('Failed to delete inventory item', { err });
      return { success: false, error: err };
    }
  }

  static async getStats(personaId: string): Promise<{
    totalItems: number;
    totalValue: number;
    lowConditionCount: number;
    categories: string[];
    locations: string[];
  }> {
    try {
      const { data } = await supabase
        .from('entity_inventory')
        .select('category, location, condition, current_value')
        .eq('persona_id', personaId);

      if (!data) return { totalItems: 0, totalValue: 0, lowConditionCount: 0, categories: [], locations: [] };

      const categories = [...new Set(data.map((i) => i.category).filter(Boolean))] as string[];
      const locations = [...new Set(data.map((i) => i.location).filter(Boolean))] as string[];

      return {
        totalItems: data.length,
        totalValue: data.reduce((sum, i) => sum + (i.current_value || 0), 0),
        lowConditionCount: data.filter((i) => (i.condition || 100) < 30).length,
        categories,
        locations,
      };
    } catch (err) {
      log.error('Failed to get inventory stats', { err });
      return { totalItems: 0, totalValue: 0, lowConditionCount: 0, categories: [], locations: [] };
    }
  }
}
