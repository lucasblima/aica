/**
 * HABITAT PROPERTY SERVICE
 * Manages property data in the Habitat archetype
 */

import { supabase } from '@/services/supabaseClient';
import type {
  HabitatProperty,
  CreateHabitatPropertyPayload,
  UpdateHabitatPropertyPayload,
  PropertyFinancialSummary,
} from '../types';

/**
 * Get all properties for a space
 */
export async function getPropertiesBySpace(spaceId: string): Promise<HabitatProperty[]> {
  const { data, error } = await supabase
    .from('habitat_properties')
    .select('*')
    .eq('space_id', spaceId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get a single property by ID
 */
export async function getPropertyById(propertyId: string): Promise<HabitatProperty | null> {
  const { data, error } = await supabase
    .from('habitat_properties')
    .select('*')
    .eq('id', propertyId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

/**
 * Create a new property
 */
export async function createProperty(
  payload: CreateHabitatPropertyPayload
): Promise<HabitatProperty> {
  const { data, error } = await supabase
    .from('habitat_properties')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a property
 */
export async function updateProperty(
  payload: UpdateHabitatPropertyPayload
): Promise<HabitatProperty> {
  const { id, ...updates } = payload;

  const { data, error } = await supabase
    .from('habitat_properties')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a property
 */
export async function deleteProperty(propertyId: string): Promise<void> {
  const { error } = await supabase.from('habitat_properties').delete().eq('id', propertyId);

  if (error) throw error;
}

/**
 * Calculate financial summary for a property
 */
export function calculateFinancialSummary(property: HabitatProperty): PropertyFinancialSummary {
  const condominium_fee = property.condominium_fee || 0;
  const rent_value = property.rent_value || 0;
  const property_tax_monthly = property.property_tax_annual
    ? property.property_tax_annual / 12
    : 0;

  const monthly_total = condominium_fee + rent_value + property_tax_monthly;

  return {
    monthly_total,
    condominium_fee,
    rent_value,
    property_tax_monthly,
  };
}

/**
 * Get property address as formatted string
 */
export function formatPropertyAddress(property: HabitatProperty): string {
  const parts: string[] = [];

  if (property.address_line1) parts.push(property.address_line1);
  if (property.unit_number) parts.push(`Apt ${property.unit_number}`);
  if (property.city) parts.push(property.city);
  if (property.state) parts.push(property.state);
  if (property.postal_code) parts.push(property.postal_code);

  return parts.join(', ');
}
