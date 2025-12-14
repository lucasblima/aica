-- ============================================================================
-- MIGRATION: Connection Habitat - Family/Home Management Archetype
-- Date: 2025-12-14
-- Author: Aica System Architecture
--
-- PURPOSE:
-- Create specialized tables for the Habitat archetype:
-- - habitat_properties: Property details and ownership
-- - habitat_inventory: Items, appliances, and inventory management
-- - habitat_maintenance: Maintenance tasks and schedules
-- - habitat_documents: Property-related documents
--
-- PHILOSOPHY:
-- Habitat is the "Âncora Físico" - silent maintenance, comfort, stability.
-- Focus on property management and household coordination.
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE HABITAT_PROPERTIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.habitat_properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,

    -- Property type
    property_type TEXT NOT NULL CHECK (property_type IN ('apartment', 'house', 'condo', 'room', 'other')),

    -- Address information
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'BR',

    -- Building details
    building_name TEXT,
    unit_number TEXT,
    floor_number INTEGER,

    -- Property specifications
    bedrooms INTEGER CHECK (bedrooms >= 0),
    bathrooms INTEGER CHECK (bathrooms >= 0),
    parking_spots INTEGER DEFAULT 0 CHECK (parking_spots >= 0),
    area_sqm NUMERIC(8, 2) CHECK (area_sqm > 0),

    -- Financial information
    monthly_rent NUMERIC(10, 2) CHECK (monthly_rent >= 0),
    condominium_fee NUMERIC(10, 2) CHECK (condominium_fee >= 0),
    property_tax_annual NUMERIC(10, 2) CHECK (property_tax_annual >= 0),

    -- Contact information
    portaria_phone TEXT,
    sindico_name TEXT,
    sindico_phone TEXT,
    administradora_name TEXT,
    administradora_phone TEXT,
    administradora_email TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT check_address_exists CHECK (
        address_line1 IS NOT NULL OR city IS NOT NULL
    )
);

COMMENT ON TABLE public.habitat_properties IS
'Property details for Habitat spaces. Stores home/residential property information.';
COMMENT ON COLUMN public.habitat_properties.property_type IS 'Type of property: apartment, house, condo, room, other';
COMMENT ON COLUMN public.habitat_properties.monthly_rent IS 'Monthly rent value if property is rented';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_habitat_properties_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_habitat_properties_updated_at
    BEFORE UPDATE ON public.habitat_properties
    FOR EACH ROW
    EXECUTE FUNCTION public.update_habitat_properties_updated_at();

-- Enable RLS
ALTER TABLE public.habitat_properties ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "habitat_properties_select"
    ON public.habitat_properties FOR SELECT
    USING (is_connection_space_member(space_id));

CREATE POLICY "habitat_properties_insert"
    ON public.habitat_properties FOR INSERT
    WITH CHECK (is_connection_space_admin(space_id));

CREATE POLICY "habitat_properties_update"
    ON public.habitat_properties FOR UPDATE
    USING (is_connection_space_admin(space_id))
    WITH CHECK (is_connection_space_admin(space_id));

CREATE POLICY "habitat_properties_delete"
    ON public.habitat_properties FOR DELETE
    USING (is_connection_space_admin(space_id));

-- Indexes
CREATE INDEX idx_habitat_properties_space_id
    ON public.habitat_properties(space_id);
CREATE INDEX idx_habitat_properties_type
    ON public.habitat_properties(space_id, property_type);
CREATE INDEX idx_habitat_properties_city
    ON public.habitat_properties(space_id, city)
    WHERE city IS NOT NULL;

-- ============================================================================
-- PART 2: CREATE HABITAT_INVENTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.habitat_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.habitat_properties(id) ON DELETE CASCADE,

    -- Item details
    name TEXT NOT NULL,
    category TEXT,
    brand TEXT,
    model TEXT,
    serial_number TEXT,

    -- Purchase information
    purchase_date DATE,
    purchase_price NUMERIC(10, 2) CHECK (purchase_price >= 0),
    purchase_location TEXT,

    -- Warranty information
    warranty_expiry DATE,
    warranty_notes TEXT,

    -- Location and status
    room TEXT,
    notes TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'sold', 'disposed', 'lost')),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT check_name_not_empty CHECK (name <> '')
);

COMMENT ON TABLE public.habitat_inventory IS
'Inventory items (appliances, furniture, electronics) within Habitat properties.';
COMMENT ON COLUMN public.habitat_inventory.status IS 'Item status: active, maintenance, sold, disposed, lost';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_habitat_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_habitat_inventory_updated_at
    BEFORE UPDATE ON public.habitat_inventory
    FOR EACH ROW
    EXECUTE FUNCTION public.update_habitat_inventory_updated_at();

-- Enable RLS
ALTER TABLE public.habitat_inventory ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "habitat_inventory_select"
    ON public.habitat_inventory FOR SELECT
    USING (is_connection_space_member(space_id));

CREATE POLICY "habitat_inventory_insert"
    ON public.habitat_inventory FOR INSERT
    WITH CHECK (is_connection_space_member(space_id));

CREATE POLICY "habitat_inventory_update"
    ON public.habitat_inventory FOR UPDATE
    USING (is_connection_space_member(space_id))
    WITH CHECK (is_connection_space_member(space_id));

CREATE POLICY "habitat_inventory_delete"
    ON public.habitat_inventory FOR DELETE
    USING (is_connection_space_admin(space_id));

-- Indexes
CREATE INDEX idx_habitat_inventory_space_id
    ON public.habitat_inventory(space_id);
CREATE INDEX idx_habitat_inventory_property_id
    ON public.habitat_inventory(property_id)
    WHERE property_id IS NOT NULL;
CREATE INDEX idx_habitat_inventory_category
    ON public.habitat_inventory(space_id, category)
    WHERE category IS NOT NULL;
CREATE INDEX idx_habitat_inventory_status
    ON public.habitat_inventory(space_id, status);
CREATE INDEX idx_habitat_inventory_warranty
    ON public.habitat_inventory(warranty_expiry)
    WHERE warranty_expiry IS NOT NULL;

-- ============================================================================
-- PART 3: CREATE HABITAT_MAINTENANCE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.habitat_maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.habitat_properties(id) ON DELETE CASCADE,
    assigned_to_member_id UUID REFERENCES public.connection_members(id) ON DELETE SET NULL,

    -- Maintenance details
    title TEXT NOT NULL,
    description TEXT,
    category TEXT, -- 'preventiva', 'corretiva', 'melhoria', 'emergencia'
    urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('baixa', 'normal', 'alta', 'emergencia')),

    -- Scheduling
    scheduled_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Provider information
    provider_name TEXT,
    provider_phone TEXT,
    provider_email TEXT,

    -- Financial
    estimated_cost NUMERIC(10, 2) CHECK (estimated_cost >= 0),
    actual_cost NUMERIC(10, 2) CHECK (actual_cost >= 0),

    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled')),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT check_title_not_empty CHECK (title <> '')
);

COMMENT ON TABLE public.habitat_maintenance IS
'Maintenance tasks and schedules for Habitat properties.';
COMMENT ON COLUMN public.habitat_maintenance.urgency IS 'Urgency level: baixa, normal, alta, emergencia';
COMMENT ON COLUMN public.habitat_maintenance.category IS 'Category: preventiva (preventive), corretiva (corrective), melhoria (improvement), emergencia (emergency)';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_habitat_maintenance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_habitat_maintenance_updated_at
    BEFORE UPDATE ON public.habitat_maintenance
    FOR EACH ROW
    EXECUTE FUNCTION public.update_habitat_maintenance_updated_at();

-- Enable RLS
ALTER TABLE public.habitat_maintenance ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "habitat_maintenance_select"
    ON public.habitat_maintenance FOR SELECT
    USING (is_connection_space_member(space_id));

CREATE POLICY "habitat_maintenance_insert"
    ON public.habitat_maintenance FOR INSERT
    WITH CHECK (is_connection_space_member(space_id));

CREATE POLICY "habitat_maintenance_update"
    ON public.habitat_maintenance FOR UPDATE
    USING (is_connection_space_member(space_id))
    WITH CHECK (is_connection_space_member(space_id));

CREATE POLICY "habitat_maintenance_delete"
    ON public.habitat_maintenance FOR DELETE
    USING (is_connection_space_admin(space_id));

-- Indexes
CREATE INDEX idx_habitat_maintenance_space_id
    ON public.habitat_maintenance(space_id);
CREATE INDEX idx_habitat_maintenance_property_id
    ON public.habitat_maintenance(property_id)
    WHERE property_id IS NOT NULL;
CREATE INDEX idx_habitat_maintenance_status
    ON public.habitat_maintenance(space_id, status);
CREATE INDEX idx_habitat_maintenance_urgency
    ON public.habitat_maintenance(space_id, urgency);
CREATE INDEX idx_habitat_maintenance_scheduled
    ON public.habitat_maintenance(scheduled_date)
    WHERE scheduled_date IS NOT NULL AND status != 'completed';
CREATE INDEX idx_habitat_maintenance_assigned_to
    ON public.habitat_maintenance(assigned_to_member_id)
    WHERE assigned_to_member_id IS NOT NULL;

-- ============================================================================
-- PART 4: CREATE HABITAT_DOCUMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.habitat_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.habitat_properties(id) ON DELETE CASCADE,

    -- Document details
    title TEXT NOT NULL,
    document_type TEXT, -- 'deed', 'contract', 'manual', 'warranty', 'invoice', 'receipt', 'other'
    category TEXT,

    -- File information
    file_url TEXT,
    file_name TEXT,
    file_size_kb INTEGER CHECK (file_size_kb > 0),

    -- Metadata
    notes TEXT,
    tags TEXT[] DEFAULT '{}'::text[],

    -- Document validity
    valid_from DATE,
    valid_until DATE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT check_title_not_empty CHECK (title <> '')
);

COMMENT ON TABLE public.habitat_documents IS
'Documents related to Habitat properties: deeds, contracts, manuals, warranties.';
COMMENT ON COLUMN public.habitat_documents.document_type IS 'Type: deed, contract, manual, warranty, invoice, receipt, other';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_habitat_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_habitat_documents_updated_at
    BEFORE UPDATE ON public.habitat_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_habitat_documents_updated_at();

-- Enable RLS
ALTER TABLE public.habitat_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "habitat_documents_select"
    ON public.habitat_documents FOR SELECT
    USING (is_connection_space_member(space_id));

CREATE POLICY "habitat_documents_insert"
    ON public.habitat_documents FOR INSERT
    WITH CHECK (is_connection_space_member(space_id));

CREATE POLICY "habitat_documents_update"
    ON public.habitat_documents FOR UPDATE
    USING (is_connection_space_member(space_id))
    WITH CHECK (is_connection_space_member(space_id));

CREATE POLICY "habitat_documents_delete"
    ON public.habitat_documents FOR DELETE
    USING (is_connection_space_admin(space_id));

-- Indexes
CREATE INDEX idx_habitat_documents_space_id
    ON public.habitat_documents(space_id);
CREATE INDEX idx_habitat_documents_property_id
    ON public.habitat_documents(property_id)
    WHERE property_id IS NOT NULL;
CREATE INDEX idx_habitat_documents_type
    ON public.habitat_documents(space_id, document_type)
    WHERE document_type IS NOT NULL;
CREATE INDEX idx_habitat_documents_category
    ON public.habitat_documents(space_id, category)
    WHERE category IS NOT NULL;
CREATE INDEX idx_habitat_documents_tags
    ON public.habitat_documents USING GIN(tags);
CREATE INDEX idx_habitat_documents_valid_until
    ON public.habitat_documents(valid_until)
    WHERE valid_until IS NOT NULL;

-- ============================================================================
-- PART 5: GRANT PERMISSIONS TO AUTHENTICATED USERS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.habitat_properties TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habitat_inventory TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habitat_maintenance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habitat_documents TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETION VERIFICATION
-- ============================================================================

-- Tables created:
-- 1. habitat_properties - Property details and information
-- 2. habitat_inventory - Items, appliances, and inventory management
-- 3. habitat_maintenance - Maintenance tasks and schedules
-- 4. habitat_documents - Property-related documents
--
-- All tables:
-- - Have RLS enabled with proper SECURITY DEFINER function usage
-- - Include proper indexes for performance
-- - Have updated_at triggers for automatic timestamp updates
-- - Use consistent schema naming (public.*)
-- - Support space-based access control
--
-- Verification query:
-- SELECT tablename, policyname FROM pg_policies
-- WHERE tablename LIKE 'habitat_%'
-- ORDER BY tablename, policyname;
