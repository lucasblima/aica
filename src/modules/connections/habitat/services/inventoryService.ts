/**
 * HABITAT INVENTORY SERVICE
 * Manages inventory items (appliances, furniture, electronics)
 */

import { supabase } from '@/services/supabaseClient';
import type {
  InventoryItem,
  CreateInventoryItemPayload,
  UpdateInventoryItemPayload,
  WarrantyAlert,
} from '../types';

/**
 * Get all inventory items for a property
 */
export async function getInventoryByProperty(propertyId: string): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('habitat_inventory')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get a single inventory item by ID
 */
export async function getInventoryItemById(itemId: string): Promise<InventoryItem | null> {
  const { data, error } = await supabase
    .from('habitat_inventory')
    .select('*')
    .eq('id', itemId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

/**
 * Create a new inventory item
 */
export async function createInventoryItem(
  payload: CreateInventoryItemPayload
): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from('habitat_inventory')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an inventory item
 */
export async function updateInventoryItem(
  payload: UpdateInventoryItemPayload
): Promise<InventoryItem> {
  const { id, ...updates } = payload;

  const { data, error } = await supabase
    .from('habitat_inventory')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete an inventory item
 */
export async function deleteInventoryItem(itemId: string): Promise<void> {
  const { error } = await supabase.from('habitat_inventory').delete().eq('id', itemId);

  if (error) throw error;
}

/**
 * Get items with warranties expiring soon (within X days)
 */
export async function getWarrantyAlerts(
  propertyId: string,
  daysThreshold: number = 30
): Promise<WarrantyAlert[]> {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + daysThreshold);

  const { data, error } = await supabase
    .from('habitat_inventory')
    .select('id, name, warranty_expiry')
    .eq('property_id', propertyId)
    .eq('status', 'active')
    .gte('warranty_expiry', today.toISOString())
    .lte('warranty_expiry', futureDate.toISOString())
    .order('warranty_expiry', { ascending: true });

  if (error) throw error;

  return (
    data?.map((item) => {
      const expiryDate = new Date(item.warranty_expiry);
      const daysRemaining = Math.ceil(
        (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        item_id: item.id,
        item_name: item.name,
        warranty_expiry: item.warranty_expiry,
        days_remaining: daysRemaining,
      };
    }) || []
  );
}

/**
 * Filter inventory by category
 */
export async function getInventoryByCategory(
  propertyId: string,
  category: string
): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('habitat_inventory')
    .select('*')
    .eq('property_id', propertyId)
    .eq('category', category)
    .order('name');

  if (error) throw error;
  return data || [];
}

/**
 * Filter inventory by status
 */
export async function getInventoryByStatus(
  propertyId: string,
  status: string
): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('habitat_inventory')
    .select('*')
    .eq('property_id', propertyId)
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Search inventory by name
 */
export async function searchInventory(
  propertyId: string,
  searchTerm: string
): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('habitat_inventory')
    .select('*')
    .eq('property_id', propertyId)
    .ilike('name', `%${searchTerm}%`)
    .order('name');

  if (error) throw error;
  return data || [];
}
