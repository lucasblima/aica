/**
 * HABITAT ARCHETYPE TYPES
 * Filosofia: Âncora Físico - gestão do lar como manutenção silenciosa
 * Design: Tons terrosos, cards pesados, sensação de estabilidade
 */

// =====================================================
// ENUMS
// =====================================================

export type PropertyType = 'apartment' | 'house' | 'condo' | 'room' | 'other';

export type InventoryCategory =
  | 'eletrodomestico'
  | 'moveis'
  | 'eletronicos'
  | 'decoracao'
  | 'ferramentas'
  | 'outros';

export type InventoryStatus = 'active' | 'maintenance' | 'sold' | 'disposed' | 'lost';

export type MaintenanceCategory = 'preventiva' | 'corretiva' | 'melhoria' | 'emergencia';

export type MaintenanceUrgency = 'baixa' | 'normal' | 'alta' | 'emergencia';

export type MaintenanceStatus =
  | 'pending'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type DocumentType =
  | 'deed'
  | 'contract'
  | 'manual'
  | 'warranty'
  | 'invoice'
  | 'receipt'
  | 'other';

// =====================================================
// CORE TYPES
// =====================================================

export interface HabitatProperty {
  id: string;
  space_id: string;

  // Property Details
  property_type: PropertyType;

  // Address
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country: string;

  // Building Details
  building_name?: string;
  unit_number?: string;
  floor_number?: number;

  // Property Specs
  bedrooms?: number;
  bathrooms?: number;
  parking_spots: number;
  area_sqm?: number;

  // Financials
  condominium_fee?: number;
  rent_value?: number;
  property_tax_annual?: number;

  // Contacts
  portaria_phone?: string;
  sindico_name?: string;
  sindico_phone?: string;
  administradora_name?: string;
  administradora_phone?: string;
  administradora_email?: string;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  property_id: string;

  // Item Details
  name: string;
  category?: InventoryCategory;
  brand?: string;
  model?: string;
  serial_number?: string;

  // Purchase Info
  purchase_date?: string;
  purchase_price?: number;
  purchase_location?: string;

  // Warranty
  warranty_expiry?: string;
  warranty_document_id?: string;
  warranty_notes?: string;

  // Location & Status
  room?: string;
  notes?: string;
  status: InventoryStatus;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface MaintenanceRecord {
  id: string;
  property_id: string;
  inventory_item_id?: string;

  // Maintenance Details
  title: string;
  description?: string;
  category?: MaintenanceCategory;
  urgency: MaintenanceUrgency;

  // Scheduling
  scheduled_date?: string;
  completed_at?: string;

  // Provider Info
  provider_name?: string;
  provider_phone?: string;
  provider_email?: string;
  provider_notes?: string;

  // Financials
  estimated_cost?: number;
  actual_cost?: number;
  transaction_id?: string;

  // Status
  status: MaintenanceStatus;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface HabitatDocument {
  id: string;
  property_id: string;
  inventory_item_id?: string;

  // Document Details
  title: string;
  document_type: DocumentType;
  file_url?: string;
  file_name?: string;
  file_size_kb?: number;

  // Metadata
  uploaded_at: string;
  notes?: string;
}

// =====================================================
// PAYLOAD TYPES (for creation/updates)
// =====================================================

export interface CreateHabitatPropertyPayload {
  space_id: string;
  property_type: PropertyType;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  building_name?: string;
  unit_number?: string;
  floor_number?: number;
  bedrooms?: number;
  bathrooms?: number;
  parking_spots?: number;
  area_sqm?: number;
  condominium_fee?: number;
  rent_value?: number;
  property_tax_annual?: number;
  portaria_phone?: string;
  sindico_name?: string;
  sindico_phone?: string;
  administradora_name?: string;
  administradora_phone?: string;
  administradora_email?: string;
}

export interface UpdateHabitatPropertyPayload extends Partial<CreateHabitatPropertyPayload> {
  id: string;
}

export interface CreateInventoryItemPayload {
  property_id: string;
  name: string;
  category?: InventoryCategory;
  brand?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  purchase_price?: number;
  purchase_location?: string;
  warranty_expiry?: string;
  warranty_document_id?: string;
  warranty_notes?: string;
  room?: string;
  notes?: string;
  status?: InventoryStatus;
}

export interface UpdateInventoryItemPayload extends Partial<CreateInventoryItemPayload> {
  id: string;
}

export interface CreateMaintenanceRecordPayload {
  property_id: string;
  inventory_item_id?: string;
  title: string;
  description?: string;
  category?: MaintenanceCategory;
  urgency?: MaintenanceUrgency;
  scheduled_date?: string;
  provider_name?: string;
  provider_phone?: string;
  provider_email?: string;
  provider_notes?: string;
  estimated_cost?: number;
  status?: MaintenanceStatus;
}

export interface UpdateMaintenanceRecordPayload extends Partial<CreateMaintenanceRecordPayload> {
  id: string;
  completed_at?: string;
  actual_cost?: number;
  transaction_id?: string;
}

export interface CreateHabitatDocumentPayload {
  property_id: string;
  inventory_item_id?: string;
  title: string;
  document_type: DocumentType;
  file_url?: string;
  file_name?: string;
  file_size_kb?: number;
  notes?: string;
}

export interface UpdateHabitatDocumentPayload extends Partial<CreateHabitatDocumentPayload> {
  id: string;
}

// =====================================================
// UTILITY TYPES
// =====================================================

export interface PropertyFinancialSummary {
  monthly_total: number;
  condominium_fee: number;
  rent_value: number;
  property_tax_monthly: number;
}

export interface MaintenanceSummary {
  total_pending: number;
  total_scheduled: number;
  total_in_progress: number;
  total_estimated_cost: number;
  urgent_count: number;
}

export interface WarrantyAlert {
  item_id: string;
  item_name: string;
  warranty_expiry: string;
  days_remaining: number;
}

export interface HabitatStats {
  total_properties: number;
  total_inventory_items: number;
  total_maintenance_records: number;
  pending_maintenance: number;
  urgent_maintenance: number;
  warranties_expiring_soon: number;
  total_monthly_costs: number;
}
