/**
 * HABITAT MAINTENANCE SERVICE
 * Manages maintenance records for properties
 */

import { supabase } from '@/services/supabaseClient';
import type {
  MaintenanceRecord,
  CreateMaintenanceRecordPayload,
  UpdateMaintenanceRecordPayload,
  MaintenanceSummary,
} from '../types';

/**
 * Get all maintenance records for a property
 */
export async function getMaintenanceByProperty(
  propertyId: string
): Promise<MaintenanceRecord[]> {
  const { data, error } = await supabase
    .from('habitat_maintenance')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get a single maintenance record by ID
 */
export async function getMaintenanceById(
  maintenanceId: string
): Promise<MaintenanceRecord | null> {
  const { data, error } = await supabase
    .from('habitat_maintenance')
    .select('*')
    .eq('id', maintenanceId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

/**
 * Create a new maintenance record
 */
export async function createMaintenanceRecord(
  payload: CreateMaintenanceRecordPayload
): Promise<MaintenanceRecord> {
  const { data, error } = await supabase
    .from('habitat_maintenance')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a maintenance record
 */
export async function updateMaintenanceRecord(
  payload: UpdateMaintenanceRecordPayload
): Promise<MaintenanceRecord> {
  const { id, ...updates } = payload;

  const { data, error } = await supabase
    .from('habitat_maintenance')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a maintenance record
 */
export async function deleteMaintenanceRecord(maintenanceId: string): Promise<void> {
  const { error } = await supabase.from('habitat_maintenance').delete().eq('id', maintenanceId);

  if (error) throw error;
}

/**
 * Mark maintenance as completed
 */
export async function completeMaintenanceRecord(
  maintenanceId: string,
  actualCost?: number
): Promise<MaintenanceRecord> {
  const updates: Partial<MaintenanceRecord> = {
    status: 'completed',
    completed_at: new Date().toISOString(),
  };

  if (actualCost !== undefined) {
    updates.actual_cost = actualCost;
  }

  const { data, error } = await supabase
    .from('habitat_maintenance')
    .update(updates)
    .eq('id', maintenanceId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get maintenance by status
 */
export async function getMaintenanceByStatus(
  propertyId: string,
  status: string
): Promise<MaintenanceRecord[]> {
  const { data, error } = await supabase
    .from('habitat_maintenance')
    .select('*')
    .eq('property_id', propertyId)
    .eq('status', status)
    .order('scheduled_date', { ascending: true, nullsFirst: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get urgent maintenance (alta + emergencia)
 */
export async function getUrgentMaintenance(propertyId: string): Promise<MaintenanceRecord[]> {
  const { data, error } = await supabase
    .from('habitat_maintenance')
    .select('*')
    .eq('property_id', propertyId)
    .in('urgency', ['alta', 'emergencia'])
    .neq('status', 'completed')
    .neq('status', 'cancelled')
    .order('urgency', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get upcoming scheduled maintenance
 */
export async function getUpcomingMaintenance(
  propertyId: string,
  daysAhead: number = 30
): Promise<MaintenanceRecord[]> {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + daysAhead);

  const { data, error } = await supabase
    .from('habitat_maintenance')
    .select('*')
    .eq('property_id', propertyId)
    .in('status', ['scheduled', 'pending'])
    .gte('scheduled_date', today.toISOString())
    .lte('scheduled_date', futureDate.toISOString())
    .order('scheduled_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get maintenance summary for a property
 */
export async function getMaintenanceSummary(propertyId: string): Promise<MaintenanceSummary> {
  const { data, error } = await supabase
    .from('habitat_maintenance')
    .select('*')
    .eq('property_id', propertyId)
    .neq('status', 'completed')
    .neq('status', 'cancelled');

  if (error) throw error;

  const records = data || [];

  const total_pending = records.filter((r) => r.status === 'pending').length;
  const total_scheduled = records.filter((r) => r.status === 'scheduled').length;
  const total_in_progress = records.filter((r) => r.status === 'in_progress').length;
  const urgent_count = records.filter((r) =>
    ['alta', 'emergencia'].includes(r.urgency)
  ).length;

  const total_estimated_cost = records.reduce((sum, r) => sum + (r.estimated_cost || 0), 0);

  return {
    total_pending,
    total_scheduled,
    total_in_progress,
    total_estimated_cost,
    urgent_count,
  };
}

/**
 * Get maintenance by inventory item
 */
export async function getMaintenanceByItem(itemId: string): Promise<MaintenanceRecord[]> {
  const { data, error } = await supabase
    .from('habitat_maintenance')
    .select('*')
    .eq('inventory_item_id', itemId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
