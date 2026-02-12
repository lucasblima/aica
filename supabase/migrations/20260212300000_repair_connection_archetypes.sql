-- =============================================================================
-- REPAIR MIGRATION: Connection Archetypes — Idempotent
-- Date: 2026-02-12
-- Purpose: Ensure all Connection module tables exist on the remote Supabase.
--          Every statement is idempotent: safe to run even if tables already exist.
--
-- Covers:
--   Base:      connection_spaces, connection_members, connection_events,
--              connection_documents, connection_transactions
--   Habitat:   habitat_properties, habitat_inventory, habitat_maintenance,
--              habitat_documents
--   Ventures:  ventures_entities, ventures_metrics, ventures_milestones,
--              ventures_stakeholders
--   Academia:  academia_journeys, academia_notes, academia_mentorships,
--              academia_credentials
--   Tribo:     tribo_rituals, tribo_ritual_occurrences, tribo_shared_resources,
--              tribo_group_funds, tribo_fund_contributions, tribo_discussions,
--              tribo_discussion_replies
--   Links:     work_items columns, connection_invitations, organizations link
-- =============================================================================

-- ===================== ENUM TYPES (idempotent) ==============================

DO $$ BEGIN CREATE TYPE public.connection_archetype_type AS ENUM ('habitat','ventures','academia','tribo'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.connection_member_role AS ENUM ('owner','admin','member','guest'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.connection_event_type AS ENUM ('meeting','social','milestone','deadline','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.connection_transaction_type AS ENUM ('income','expense','transfer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.connection_transaction_split_type AS ENUM ('equal','percentage','custom','payer_only'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.connection_invitation_status AS ENUM ('pending','accepted','rejected','expired'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.email_delivery_status AS ENUM ('pending','sent','delivered','bounced','failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===================== SECURITY DEFINER HELPERS =============================

CREATE OR REPLACE FUNCTION public.is_connection_space_member(_space_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.connection_members WHERE space_id = _space_id AND user_id = auth.uid() AND is_active = TRUE);
END; $$;

CREATE OR REPLACE FUNCTION public.is_connection_space_admin(_space_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.connection_members WHERE space_id = _space_id AND user_id = auth.uid() AND role IN ('owner','admin') AND is_active = TRUE);
END; $$;

CREATE OR REPLACE FUNCTION public.is_connection_space_owner(_space_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.connection_spaces WHERE id = _space_id AND owner_id = auth.uid());
END; $$;

-- ===================== BASE: connection_spaces ==============================

CREATE TABLE IF NOT EXISTS public.connection_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  archetype public.connection_archetype_type NOT NULL,
  name TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  icon TEXT,
  color_theme TEXT,
  cover_image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  is_favorite BOOLEAN DEFAULT FALSE NOT NULL,
  last_accessed_at TIMESTAMPTZ,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT check_name_not_empty CHECK (name <> '')
);

-- Ensure all columns exist (handles tables created with partial schema)
ALTER TABLE public.connection_spaces ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.connection_spaces ADD COLUMN IF NOT EXISTS archetype public.connection_archetype_type;
ALTER TABLE public.connection_spaces ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.connection_spaces ADD COLUMN IF NOT EXISTS subtitle TEXT;
ALTER TABLE public.connection_spaces ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.connection_spaces ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE public.connection_spaces ADD COLUMN IF NOT EXISTS color_theme TEXT;
ALTER TABLE public.connection_spaces ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE public.connection_spaces ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.connection_spaces ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;
ALTER TABLE public.connection_spaces ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ;
ALTER TABLE public.connection_spaces ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.connection_spaces ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.connection_spaces ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE OR REPLACE FUNCTION public.update_connection_spaces_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_connection_spaces_updated_at ON public.connection_spaces;
CREATE TRIGGER update_connection_spaces_updated_at BEFORE UPDATE ON public.connection_spaces FOR EACH ROW EXECUTE FUNCTION public.update_connection_spaces_updated_at();

ALTER TABLE public.connection_spaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "connection_spaces_select" ON public.connection_spaces;
CREATE POLICY "connection_spaces_select" ON public.connection_spaces FOR SELECT USING (owner_id = auth.uid() OR is_connection_space_member(id));
DROP POLICY IF EXISTS "connection_spaces_insert" ON public.connection_spaces;
CREATE POLICY "connection_spaces_insert" ON public.connection_spaces FOR INSERT WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS "connection_spaces_update" ON public.connection_spaces;
CREATE POLICY "connection_spaces_update" ON public.connection_spaces FOR UPDATE USING (is_connection_space_owner(id)) WITH CHECK (is_connection_space_owner(id));
DROP POLICY IF EXISTS "connection_spaces_delete" ON public.connection_spaces;
CREATE POLICY "connection_spaces_delete" ON public.connection_spaces FOR DELETE USING (is_connection_space_owner(id));

CREATE INDEX IF NOT EXISTS idx_connection_spaces_owner_id ON public.connection_spaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_connection_spaces_archetype ON public.connection_spaces(owner_id, archetype);
CREATE INDEX IF NOT EXISTS idx_connection_spaces_is_active ON public.connection_spaces(owner_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_connection_spaces_is_favorite ON public.connection_spaces(owner_id, is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_connection_spaces_created_at ON public.connection_spaces(owner_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.connection_spaces TO authenticated;

-- ===================== BASE: connection_members =============================

CREATE TABLE IF NOT EXISTS public.connection_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  external_name TEXT,
  external_email TEXT,
  external_phone TEXT,
  external_avatar_url TEXT,
  role public.connection_member_role DEFAULT 'member' NOT NULL,
  permissions JSONB DEFAULT '{}'::jsonb,
  context_label TEXT,
  context_data JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_interaction_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT member_identifier_required CHECK (user_id IS NOT NULL OR external_email IS NOT NULL OR external_phone IS NOT NULL)
);

CREATE OR REPLACE FUNCTION public.update_connection_members_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_connection_members_updated_at ON public.connection_members;
CREATE TRIGGER update_connection_members_updated_at BEFORE UPDATE ON public.connection_members FOR EACH ROW EXECUTE FUNCTION public.update_connection_members_updated_at();

ALTER TABLE public.connection_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "connection_members_select" ON public.connection_members;
CREATE POLICY "connection_members_select" ON public.connection_members FOR SELECT USING (user_id = auth.uid() OR is_connection_space_admin(space_id));
DROP POLICY IF EXISTS "connection_members_insert" ON public.connection_members;
CREATE POLICY "connection_members_insert" ON public.connection_members FOR INSERT WITH CHECK (is_connection_space_admin(space_id));
DROP POLICY IF EXISTS "connection_members_update" ON public.connection_members;
CREATE POLICY "connection_members_update" ON public.connection_members FOR UPDATE USING (is_connection_space_admin(space_id)) WITH CHECK (is_connection_space_admin(space_id));
DROP POLICY IF EXISTS "connection_members_delete" ON public.connection_members;
CREATE POLICY "connection_members_delete" ON public.connection_members FOR DELETE USING (is_connection_space_admin(space_id));

CREATE INDEX IF NOT EXISTS idx_connection_members_space_id ON public.connection_members(space_id);
CREATE INDEX IF NOT EXISTS idx_connection_members_user_id ON public.connection_members(user_id);
CREATE INDEX IF NOT EXISTS idx_connection_members_space_user ON public.connection_members(space_id, user_id);
CREATE INDEX IF NOT EXISTS idx_connection_members_role ON public.connection_members(space_id, role);
CREATE INDEX IF NOT EXISTS idx_connection_members_is_active ON public.connection_members(space_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_connection_members_external_email ON public.connection_members(space_id, external_email) WHERE external_email IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.connection_members TO authenticated;

-- ===================== BASE: connection_events ==============================

CREATE TABLE IF NOT EXISTS public.connection_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  is_all_day BOOLEAN DEFAULT FALSE NOT NULL,
  recurrence_rule TEXT,
  event_type public.connection_event_type DEFAULT 'other' NOT NULL,
  rsvp_enabled BOOLEAN DEFAULT FALSE NOT NULL,
  rsvp_deadline TIMESTAMPTZ,
  google_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT check_title_not_empty CHECK (title <> '')
);

CREATE OR REPLACE FUNCTION public.update_connection_events_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_connection_events_updated_at ON public.connection_events;
CREATE TRIGGER update_connection_events_updated_at BEFORE UPDATE ON public.connection_events FOR EACH ROW EXECUTE FUNCTION public.update_connection_events_updated_at();
ALTER TABLE public.connection_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "connection_events_select" ON public.connection_events;
CREATE POLICY "connection_events_select" ON public.connection_events FOR SELECT USING (is_connection_space_member(space_id));
DROP POLICY IF EXISTS "connection_events_insert" ON public.connection_events;
CREATE POLICY "connection_events_insert" ON public.connection_events FOR INSERT WITH CHECK (is_connection_space_member(space_id) AND created_by = auth.uid());
DROP POLICY IF EXISTS "connection_events_update" ON public.connection_events;
CREATE POLICY "connection_events_update" ON public.connection_events FOR UPDATE USING (created_by = auth.uid() OR is_connection_space_admin(space_id)) WITH CHECK (created_by = auth.uid() OR is_connection_space_admin(space_id));
DROP POLICY IF EXISTS "connection_events_delete" ON public.connection_events;
CREATE POLICY "connection_events_delete" ON public.connection_events FOR DELETE USING (created_by = auth.uid() OR is_connection_space_admin(space_id));

CREATE INDEX IF NOT EXISTS idx_connection_events_space_id ON public.connection_events(space_id);
CREATE INDEX IF NOT EXISTS idx_connection_events_starts_at ON public.connection_events(space_id, starts_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.connection_events TO authenticated;

-- ===================== BASE: connection_documents ===========================

CREATE TABLE IF NOT EXISTS public.connection_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  category TEXT,
  tags TEXT[] DEFAULT '{}'::text[],
  version INTEGER DEFAULT 1 NOT NULL,
  parent_document_id UUID REFERENCES public.connection_documents(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT check_file_name_not_empty CHECK (file_name <> ''),
  CONSTRAINT check_file_path_not_empty CHECK (file_path <> ''),
  CONSTRAINT check_file_size_positive CHECK (file_size_bytes > 0),
  CONSTRAINT check_version_positive CHECK (version > 0)
);

CREATE OR REPLACE FUNCTION public.update_connection_documents_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_connection_documents_updated_at ON public.connection_documents;
CREATE TRIGGER update_connection_documents_updated_at BEFORE UPDATE ON public.connection_documents FOR EACH ROW EXECUTE FUNCTION public.update_connection_documents_updated_at();
ALTER TABLE public.connection_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "connection_documents_select" ON public.connection_documents;
CREATE POLICY "connection_documents_select" ON public.connection_documents FOR SELECT USING (is_connection_space_member(space_id));
DROP POLICY IF EXISTS "connection_documents_insert" ON public.connection_documents;
CREATE POLICY "connection_documents_insert" ON public.connection_documents FOR INSERT WITH CHECK (is_connection_space_member(space_id) AND uploaded_by = auth.uid());
DROP POLICY IF EXISTS "connection_documents_update" ON public.connection_documents;
CREATE POLICY "connection_documents_update" ON public.connection_documents FOR UPDATE USING (uploaded_by = auth.uid() OR is_connection_space_admin(space_id)) WITH CHECK (uploaded_by = auth.uid() OR is_connection_space_admin(space_id));
DROP POLICY IF EXISTS "connection_documents_delete" ON public.connection_documents;
CREATE POLICY "connection_documents_delete" ON public.connection_documents FOR DELETE USING (uploaded_by = auth.uid() OR is_connection_space_admin(space_id));

CREATE INDEX IF NOT EXISTS idx_connection_documents_space_id ON public.connection_documents(space_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.connection_documents TO authenticated;

-- ===================== BASE: connection_transactions ========================

CREATE TABLE IF NOT EXISTS public.connection_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'USD' NOT NULL,
  type public.connection_transaction_type NOT NULL,
  category TEXT,
  transaction_date TIMESTAMPTZ NOT NULL,
  split_type public.connection_transaction_split_type DEFAULT 'payer_only' NOT NULL,
  split_data JSONB DEFAULT '{}'::jsonb,
  is_paid BOOLEAN DEFAULT FALSE NOT NULL,
  paid_at TIMESTAMPTZ,
  paid_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_recurring BOOLEAN DEFAULT FALSE NOT NULL,
  recurrence_rule TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT check_description_not_empty CHECK (description <> ''),
  CONSTRAINT check_amount_positive CHECK (amount > 0),
  CONSTRAINT check_currency_not_empty CHECK (currency <> '')
);

CREATE OR REPLACE FUNCTION public.update_connection_transactions_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_connection_transactions_updated_at ON public.connection_transactions;
CREATE TRIGGER update_connection_transactions_updated_at BEFORE UPDATE ON public.connection_transactions FOR EACH ROW EXECUTE FUNCTION public.update_connection_transactions_updated_at();
ALTER TABLE public.connection_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "connection_transactions_select" ON public.connection_transactions;
CREATE POLICY "connection_transactions_select" ON public.connection_transactions FOR SELECT USING (is_connection_space_member(space_id));
DROP POLICY IF EXISTS "connection_transactions_insert" ON public.connection_transactions;
CREATE POLICY "connection_transactions_insert" ON public.connection_transactions FOR INSERT WITH CHECK (is_connection_space_member(space_id) AND created_by = auth.uid());
DROP POLICY IF EXISTS "connection_transactions_update" ON public.connection_transactions;
CREATE POLICY "connection_transactions_update" ON public.connection_transactions FOR UPDATE USING (created_by = auth.uid() OR is_connection_space_admin(space_id)) WITH CHECK (created_by = auth.uid() OR is_connection_space_admin(space_id));
DROP POLICY IF EXISTS "connection_transactions_delete" ON public.connection_transactions;
CREATE POLICY "connection_transactions_delete" ON public.connection_transactions FOR DELETE USING (created_by = auth.uid() OR is_connection_space_admin(space_id));

CREATE INDEX IF NOT EXISTS idx_connection_transactions_space_id ON public.connection_transactions(space_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.connection_transactions TO authenticated;

-- ===================== HABITAT ==============================================

CREATE TABLE IF NOT EXISTS public.habitat_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,
  property_type TEXT NOT NULL CHECK (property_type IN ('apartment','house','condo','room','other')),
  address_line1 TEXT, address_line2 TEXT, city TEXT, state TEXT, postal_code TEXT, country TEXT DEFAULT 'BR',
  building_name TEXT, unit_number TEXT, floor_number INTEGER,
  bedrooms INTEGER CHECK (bedrooms >= 0), bathrooms INTEGER CHECK (bathrooms >= 0),
  parking_spots INTEGER DEFAULT 0 CHECK (parking_spots >= 0), area_sqm NUMERIC(8,2) CHECK (area_sqm > 0),
  monthly_rent NUMERIC(10,2) CHECK (monthly_rent >= 0), condominium_fee NUMERIC(10,2) CHECK (condominium_fee >= 0), property_tax_annual NUMERIC(10,2) CHECK (property_tax_annual >= 0),
  portaria_phone TEXT, sindico_name TEXT, sindico_phone TEXT,
  administradora_name TEXT, administradora_phone TEXT, administradora_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT check_address_exists CHECK (address_line1 IS NOT NULL OR city IS NOT NULL)
);

CREATE OR REPLACE FUNCTION public.update_habitat_properties_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_habitat_properties_updated_at ON public.habitat_properties;
CREATE TRIGGER update_habitat_properties_updated_at BEFORE UPDATE ON public.habitat_properties FOR EACH ROW EXECUTE FUNCTION public.update_habitat_properties_updated_at();
ALTER TABLE public.habitat_properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "habitat_properties_select" ON public.habitat_properties;
CREATE POLICY "habitat_properties_select" ON public.habitat_properties FOR SELECT USING (is_connection_space_member(space_id));
DROP POLICY IF EXISTS "habitat_properties_insert" ON public.habitat_properties;
CREATE POLICY "habitat_properties_insert" ON public.habitat_properties FOR INSERT WITH CHECK (is_connection_space_admin(space_id));
DROP POLICY IF EXISTS "habitat_properties_update" ON public.habitat_properties;
CREATE POLICY "habitat_properties_update" ON public.habitat_properties FOR UPDATE USING (is_connection_space_admin(space_id)) WITH CHECK (is_connection_space_admin(space_id));
DROP POLICY IF EXISTS "habitat_properties_delete" ON public.habitat_properties;
CREATE POLICY "habitat_properties_delete" ON public.habitat_properties FOR DELETE USING (is_connection_space_admin(space_id));
CREATE INDEX IF NOT EXISTS idx_habitat_properties_space_id ON public.habitat_properties(space_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habitat_properties TO authenticated;

CREATE TABLE IF NOT EXISTS public.habitat_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.habitat_properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL, category TEXT, brand TEXT, model TEXT, serial_number TEXT,
  purchase_date DATE, purchase_price NUMERIC(10,2) CHECK (purchase_price >= 0), purchase_location TEXT,
  warranty_expiry DATE, warranty_notes TEXT,
  room TEXT, notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','maintenance','sold','disposed','lost')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT check_name_not_empty CHECK (name <> '')
);

CREATE OR REPLACE FUNCTION public.update_habitat_inventory_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_habitat_inventory_updated_at ON public.habitat_inventory;
CREATE TRIGGER update_habitat_inventory_updated_at BEFORE UPDATE ON public.habitat_inventory FOR EACH ROW EXECUTE FUNCTION public.update_habitat_inventory_updated_at();
ALTER TABLE public.habitat_inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "habitat_inventory_select" ON public.habitat_inventory;
CREATE POLICY "habitat_inventory_select" ON public.habitat_inventory FOR SELECT USING (is_connection_space_member(space_id));
DROP POLICY IF EXISTS "habitat_inventory_insert" ON public.habitat_inventory;
CREATE POLICY "habitat_inventory_insert" ON public.habitat_inventory FOR INSERT WITH CHECK (is_connection_space_member(space_id));
DROP POLICY IF EXISTS "habitat_inventory_update" ON public.habitat_inventory;
CREATE POLICY "habitat_inventory_update" ON public.habitat_inventory FOR UPDATE USING (is_connection_space_member(space_id)) WITH CHECK (is_connection_space_member(space_id));
DROP POLICY IF EXISTS "habitat_inventory_delete" ON public.habitat_inventory;
CREATE POLICY "habitat_inventory_delete" ON public.habitat_inventory FOR DELETE USING (is_connection_space_admin(space_id));
CREATE INDEX IF NOT EXISTS idx_habitat_inventory_space_id ON public.habitat_inventory(space_id);
CREATE INDEX IF NOT EXISTS idx_habitat_inventory_warranty ON public.habitat_inventory(warranty_expiry) WHERE warranty_expiry IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habitat_inventory TO authenticated;

CREATE TABLE IF NOT EXISTS public.habitat_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.habitat_properties(id) ON DELETE CASCADE,
  assigned_to_member_id UUID REFERENCES public.connection_members(id) ON DELETE SET NULL,
  title TEXT NOT NULL, description TEXT,
  category TEXT, urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('baixa','normal','alta','emergencia')),
  scheduled_date TIMESTAMPTZ, completed_at TIMESTAMPTZ,
  provider_name TEXT, provider_phone TEXT, provider_email TEXT,
  estimated_cost NUMERIC(10,2) CHECK (estimated_cost >= 0), actual_cost NUMERIC(10,2) CHECK (actual_cost >= 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','scheduled','in_progress','completed','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT check_title_not_empty CHECK (title <> '')
);

CREATE OR REPLACE FUNCTION public.update_habitat_maintenance_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_habitat_maintenance_updated_at ON public.habitat_maintenance;
CREATE TRIGGER update_habitat_maintenance_updated_at BEFORE UPDATE ON public.habitat_maintenance FOR EACH ROW EXECUTE FUNCTION public.update_habitat_maintenance_updated_at();
ALTER TABLE public.habitat_maintenance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "habitat_maintenance_select" ON public.habitat_maintenance;
CREATE POLICY "habitat_maintenance_select" ON public.habitat_maintenance FOR SELECT USING (is_connection_space_member(space_id));
DROP POLICY IF EXISTS "habitat_maintenance_insert" ON public.habitat_maintenance;
CREATE POLICY "habitat_maintenance_insert" ON public.habitat_maintenance FOR INSERT WITH CHECK (is_connection_space_member(space_id));
DROP POLICY IF EXISTS "habitat_maintenance_update" ON public.habitat_maintenance;
CREATE POLICY "habitat_maintenance_update" ON public.habitat_maintenance FOR UPDATE USING (is_connection_space_member(space_id)) WITH CHECK (is_connection_space_member(space_id));
DROP POLICY IF EXISTS "habitat_maintenance_delete" ON public.habitat_maintenance;
CREATE POLICY "habitat_maintenance_delete" ON public.habitat_maintenance FOR DELETE USING (is_connection_space_admin(space_id));
CREATE INDEX IF NOT EXISTS idx_habitat_maintenance_space_id ON public.habitat_maintenance(space_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habitat_maintenance TO authenticated;

CREATE TABLE IF NOT EXISTS public.habitat_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.habitat_properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL, document_type TEXT, category TEXT,
  file_url TEXT, file_name TEXT, file_size_kb INTEGER CHECK (file_size_kb > 0),
  notes TEXT, tags TEXT[] DEFAULT '{}'::text[],
  valid_from DATE, valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT check_title_not_empty CHECK (title <> '')
);

CREATE OR REPLACE FUNCTION public.update_habitat_documents_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_habitat_documents_updated_at ON public.habitat_documents;
CREATE TRIGGER update_habitat_documents_updated_at BEFORE UPDATE ON public.habitat_documents FOR EACH ROW EXECUTE FUNCTION public.update_habitat_documents_updated_at();
ALTER TABLE public.habitat_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "habitat_documents_select" ON public.habitat_documents;
CREATE POLICY "habitat_documents_select" ON public.habitat_documents FOR SELECT USING (is_connection_space_member(space_id));
DROP POLICY IF EXISTS "habitat_documents_insert" ON public.habitat_documents;
CREATE POLICY "habitat_documents_insert" ON public.habitat_documents FOR INSERT WITH CHECK (is_connection_space_member(space_id));
DROP POLICY IF EXISTS "habitat_documents_update" ON public.habitat_documents;
CREATE POLICY "habitat_documents_update" ON public.habitat_documents FOR UPDATE USING (is_connection_space_member(space_id)) WITH CHECK (is_connection_space_member(space_id));
DROP POLICY IF EXISTS "habitat_documents_delete" ON public.habitat_documents;
CREATE POLICY "habitat_documents_delete" ON public.habitat_documents FOR DELETE USING (is_connection_space_admin(space_id));
CREATE INDEX IF NOT EXISTS idx_habitat_documents_space_id ON public.habitat_documents(space_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habitat_documents TO authenticated;

-- ===================== VENTURES =============================================

CREATE TABLE IF NOT EXISTS public.ventures_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,
  legal_name TEXT NOT NULL, trading_name TEXT, cnpj TEXT,
  entity_type TEXT, email TEXT, phone TEXT, website TEXT,
  address_line1 TEXT, address_line2 TEXT, city TEXT, state TEXT, postal_code TEXT, country TEXT DEFAULT 'BR',
  founded_at DATE, sector TEXT, subsector TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT check_legal_name_not_empty CHECK (legal_name <> '')
);

CREATE OR REPLACE FUNCTION public.update_ventures_entities_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_ventures_entities_updated_at ON public.ventures_entities;
CREATE TRIGGER update_ventures_entities_updated_at BEFORE UPDATE ON public.ventures_entities FOR EACH ROW EXECUTE FUNCTION public.update_ventures_entities_updated_at();
ALTER TABLE public.ventures_entities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ventures_entities_select" ON public.ventures_entities;
CREATE POLICY "ventures_entities_select" ON public.ventures_entities FOR SELECT USING (is_connection_space_member(space_id));
DROP POLICY IF EXISTS "ventures_entities_insert" ON public.ventures_entities;
CREATE POLICY "ventures_entities_insert" ON public.ventures_entities FOR INSERT WITH CHECK (is_connection_space_admin(space_id));
DROP POLICY IF EXISTS "ventures_entities_update" ON public.ventures_entities;
CREATE POLICY "ventures_entities_update" ON public.ventures_entities FOR UPDATE USING (is_connection_space_admin(space_id)) WITH CHECK (is_connection_space_admin(space_id));
DROP POLICY IF EXISTS "ventures_entities_delete" ON public.ventures_entities;
CREATE POLICY "ventures_entities_delete" ON public.ventures_entities FOR DELETE USING (is_connection_space_admin(space_id));
CREATE INDEX IF NOT EXISTS idx_ventures_entities_space_id ON public.ventures_entities(space_id);
CREATE INDEX IF NOT EXISTS idx_ventures_entities_is_active ON public.ventures_entities(space_id, is_active) WHERE is_active = TRUE;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ventures_entities TO authenticated;

CREATE TABLE IF NOT EXISTS public.ventures_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.ventures_entities(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL, period_start DATE NOT NULL, period_end DATE NOT NULL,
  mrr NUMERIC(12,2), arr NUMERIC(12,2), total_revenue NUMERIC(12,2),
  total_expenses NUMERIC(12,2), payroll NUMERIC(12,2), operational NUMERIC(12,2), marketing NUMERIC(12,2),
  burn_rate NUMERIC(12,2), cash_balance NUMERIC(12,2), runway_months INTEGER,
  gross_margin_pct NUMERIC(5,2), net_margin_pct NUMERIC(5,2), ebitda NUMERIC(12,2),
  active_customers INTEGER, new_customers INTEGER, churned_customers INTEGER, churn_rate_pct NUMERIC(5,2),
  cac NUMERIC(10,2), ltv NUMERIC(10,2), ltv_cac_ratio NUMERIC(5,2),
  employee_count INTEGER, contractor_count INTEGER,
  is_current BOOLEAN DEFAULT FALSE, is_projected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT check_period_type CHECK (period_type IN ('monthly','quarterly','yearly')),
  CONSTRAINT check_period_dates CHECK (period_end > period_start),
  CONSTRAINT unique_entity_period UNIQUE(entity_id, period_start, period_end)
);

CREATE OR REPLACE FUNCTION public.update_ventures_metrics_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_ventures_metrics_updated_at ON public.ventures_metrics;
CREATE TRIGGER update_ventures_metrics_updated_at BEFORE UPDATE ON public.ventures_metrics FOR EACH ROW EXECUTE FUNCTION public.update_ventures_metrics_updated_at();
ALTER TABLE public.ventures_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ventures_metrics_select" ON public.ventures_metrics;
CREATE POLICY "ventures_metrics_select" ON public.ventures_metrics FOR SELECT USING (EXISTS (SELECT 1 FROM public.ventures_entities ve WHERE ve.id = ventures_metrics.entity_id AND is_connection_space_member(ve.space_id)));
DROP POLICY IF EXISTS "ventures_metrics_insert" ON public.ventures_metrics;
CREATE POLICY "ventures_metrics_insert" ON public.ventures_metrics FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.ventures_entities ve WHERE ve.id = ventures_metrics.entity_id AND is_connection_space_admin(ve.space_id)));
DROP POLICY IF EXISTS "ventures_metrics_update" ON public.ventures_metrics;
CREATE POLICY "ventures_metrics_update" ON public.ventures_metrics FOR UPDATE USING (EXISTS (SELECT 1 FROM public.ventures_entities ve WHERE ve.id = ventures_metrics.entity_id AND is_connection_space_admin(ve.space_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.ventures_entities ve WHERE ve.id = ventures_metrics.entity_id AND is_connection_space_admin(ve.space_id)));
DROP POLICY IF EXISTS "ventures_metrics_delete" ON public.ventures_metrics;
CREATE POLICY "ventures_metrics_delete" ON public.ventures_metrics FOR DELETE USING (EXISTS (SELECT 1 FROM public.ventures_entities ve WHERE ve.id = ventures_metrics.entity_id AND is_connection_space_admin(ve.space_id)));
CREATE INDEX IF NOT EXISTS idx_ventures_metrics_entity_id ON public.ventures_metrics(entity_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ventures_metrics TO authenticated;

CREATE TABLE IF NOT EXISTS public.ventures_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.ventures_entities(id) ON DELETE CASCADE,
  title TEXT NOT NULL, description TEXT, category TEXT,
  target_date DATE, target_value NUMERIC(12,2), target_metric TEXT, target_unit TEXT,
  current_value NUMERIC(12,2), progress_pct INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', achieved_at TIMESTAMPTZ,
  priority TEXT DEFAULT 'medium',
  depends_on_milestone_id UUID REFERENCES public.ventures_milestones(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT check_title_not_empty CHECK (title <> ''),
  CONSTRAINT check_progress_range CHECK (progress_pct BETWEEN 0 AND 100),
  CONSTRAINT check_status CHECK (status IN ('pending','in_progress','achieved','missed','cancelled')),
  CONSTRAINT check_priority CHECK (priority IN ('low','medium','high','critical'))
);

CREATE OR REPLACE FUNCTION public.update_ventures_milestones_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_ventures_milestones_updated_at ON public.ventures_milestones;
CREATE TRIGGER update_ventures_milestones_updated_at BEFORE UPDATE ON public.ventures_milestones FOR EACH ROW EXECUTE FUNCTION public.update_ventures_milestones_updated_at();
ALTER TABLE public.ventures_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ventures_milestones_select" ON public.ventures_milestones;
CREATE POLICY "ventures_milestones_select" ON public.ventures_milestones FOR SELECT USING (EXISTS (SELECT 1 FROM public.ventures_entities ve WHERE ve.id = ventures_milestones.entity_id AND is_connection_space_member(ve.space_id)));
DROP POLICY IF EXISTS "ventures_milestones_insert" ON public.ventures_milestones;
CREATE POLICY "ventures_milestones_insert" ON public.ventures_milestones FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.ventures_entities ve WHERE ve.id = ventures_milestones.entity_id AND is_connection_space_member(ve.space_id)));
DROP POLICY IF EXISTS "ventures_milestones_update" ON public.ventures_milestones;
CREATE POLICY "ventures_milestones_update" ON public.ventures_milestones FOR UPDATE USING (EXISTS (SELECT 1 FROM public.ventures_entities ve WHERE ve.id = ventures_milestones.entity_id AND is_connection_space_member(ve.space_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.ventures_entities ve WHERE ve.id = ventures_milestones.entity_id AND is_connection_space_member(ve.space_id)));
DROP POLICY IF EXISTS "ventures_milestones_delete" ON public.ventures_milestones;
CREATE POLICY "ventures_milestones_delete" ON public.ventures_milestones FOR DELETE USING (EXISTS (SELECT 1 FROM public.ventures_entities ve WHERE ve.id = ventures_milestones.entity_id AND is_connection_space_admin(ve.space_id)));
CREATE INDEX IF NOT EXISTS idx_ventures_milestones_entity_id ON public.ventures_milestones(entity_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ventures_milestones TO authenticated;

CREATE TABLE IF NOT EXISTS public.ventures_stakeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.ventures_entities(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.connection_members(id) ON DELETE SET NULL,
  stakeholder_type TEXT NOT NULL, role_title TEXT,
  equity_pct NUMERIC(5,2), shares_count BIGINT, share_class TEXT,
  vesting_start_date DATE, vesting_cliff_months INTEGER, vesting_period_months INTEGER, vesting_schedule TEXT,
  investment_amount NUMERIC(12,2), investment_date DATE, investment_round TEXT, investment_instrument TEXT,
  employment_type TEXT, start_date DATE, end_date DATE, salary NUMERIC(10,2),
  bio TEXT, linkedin_url TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT check_stakeholder_type CHECK (stakeholder_type IN ('founder','co-founder','investor','advisor','employee','contractor','board')),
  CONSTRAINT check_equity_range CHECK (equity_pct IS NULL OR equity_pct BETWEEN 0 AND 100)
);

CREATE OR REPLACE FUNCTION public.update_ventures_stakeholders_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_ventures_stakeholders_updated_at ON public.ventures_stakeholders;
CREATE TRIGGER update_ventures_stakeholders_updated_at BEFORE UPDATE ON public.ventures_stakeholders FOR EACH ROW EXECUTE FUNCTION public.update_ventures_stakeholders_updated_at();
ALTER TABLE public.ventures_stakeholders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ventures_stakeholders_select" ON public.ventures_stakeholders;
CREATE POLICY "ventures_stakeholders_select" ON public.ventures_stakeholders FOR SELECT USING (EXISTS (SELECT 1 FROM public.ventures_entities ve WHERE ve.id = ventures_stakeholders.entity_id AND is_connection_space_member(ve.space_id)));
DROP POLICY IF EXISTS "ventures_stakeholders_insert" ON public.ventures_stakeholders;
CREATE POLICY "ventures_stakeholders_insert" ON public.ventures_stakeholders FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.ventures_entities ve WHERE ve.id = ventures_stakeholders.entity_id AND is_connection_space_admin(ve.space_id)));
DROP POLICY IF EXISTS "ventures_stakeholders_update" ON public.ventures_stakeholders;
CREATE POLICY "ventures_stakeholders_update" ON public.ventures_stakeholders FOR UPDATE USING (EXISTS (SELECT 1 FROM public.ventures_entities ve WHERE ve.id = ventures_stakeholders.entity_id AND is_connection_space_admin(ve.space_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.ventures_entities ve WHERE ve.id = ventures_stakeholders.entity_id AND is_connection_space_admin(ve.space_id)));
DROP POLICY IF EXISTS "ventures_stakeholders_delete" ON public.ventures_stakeholders;
CREATE POLICY "ventures_stakeholders_delete" ON public.ventures_stakeholders FOR DELETE USING (EXISTS (SELECT 1 FROM public.ventures_entities ve WHERE ve.id = ventures_stakeholders.entity_id AND is_connection_space_admin(ve.space_id)));
CREATE INDEX IF NOT EXISTS idx_ventures_stakeholders_entity_id ON public.ventures_stakeholders(entity_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ventures_stakeholders TO authenticated;

-- ===================== ACADEMIA =============================================

CREATE TABLE IF NOT EXISTS public.academia_journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL, description TEXT, provider TEXT, instructor TEXT,
  journey_type TEXT NOT NULL,
  total_modules INTEGER, completed_modules INTEGER DEFAULT 0, progress_pct INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ, target_completion_date DATE, completed_at TIMESTAMPTZ,
  estimated_hours INTEGER, logged_hours INTEGER DEFAULT 0,
  url TEXT, materials_notes TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT check_title_not_empty CHECK (title <> ''),
  CONSTRAINT check_progress_valid CHECK (progress_pct >= 0 AND progress_pct <= 100)
);

CREATE OR REPLACE FUNCTION public.update_academia_journeys_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_academia_journeys_updated_at ON public.academia_journeys;
CREATE TRIGGER update_academia_journeys_updated_at BEFORE UPDATE ON public.academia_journeys FOR EACH ROW EXECUTE FUNCTION public.update_academia_journeys_updated_at();
ALTER TABLE public.academia_journeys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "academia_journeys_select" ON public.academia_journeys;
CREATE POLICY "academia_journeys_select" ON public.academia_journeys FOR SELECT USING (is_connection_space_member(space_id));
DROP POLICY IF EXISTS "academia_journeys_insert" ON public.academia_journeys;
CREATE POLICY "academia_journeys_insert" ON public.academia_journeys FOR INSERT WITH CHECK (is_connection_space_member(space_id));
DROP POLICY IF EXISTS "academia_journeys_update" ON public.academia_journeys;
CREATE POLICY "academia_journeys_update" ON public.academia_journeys FOR UPDATE USING (is_connection_space_member(space_id)) WITH CHECK (is_connection_space_member(space_id));
DROP POLICY IF EXISTS "academia_journeys_delete" ON public.academia_journeys;
CREATE POLICY "academia_journeys_delete" ON public.academia_journeys FOR DELETE USING (is_connection_space_admin(space_id));
CREATE INDEX IF NOT EXISTS idx_academia_journeys_space_id ON public.academia_journeys(space_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academia_journeys TO authenticated;

CREATE TABLE IF NOT EXISTS public.academia_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,
  journey_id UUID REFERENCES public.academia_journeys(id) ON DELETE SET NULL,
  title TEXT NOT NULL, content TEXT NOT NULL, content_type TEXT DEFAULT 'markdown',
  note_type TEXT DEFAULT 'fleeting',
  source_reference TEXT, linked_note_ids UUID[] DEFAULT '{}'::uuid[],
  tags TEXT[] DEFAULT '{}'::text[],
  ai_summary TEXT, ai_key_concepts TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT check_title_not_empty CHECK (title <> ''),
  CONSTRAINT check_content_not_empty CHECK (content <> '')
);

CREATE OR REPLACE FUNCTION public.update_academia_notes_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_academia_notes_updated_at ON public.academia_notes;
CREATE TRIGGER update_academia_notes_updated_at BEFORE UPDATE ON public.academia_notes FOR EACH ROW EXECUTE FUNCTION public.update_academia_notes_updated_at();
ALTER TABLE public.academia_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "academia_notes_select" ON public.academia_notes;
CREATE POLICY "academia_notes_select" ON public.academia_notes FOR SELECT USING (is_connection_space_member(space_id));
DROP POLICY IF EXISTS "academia_notes_insert" ON public.academia_notes;
CREATE POLICY "academia_notes_insert" ON public.academia_notes FOR INSERT WITH CHECK (is_connection_space_member(space_id));
DROP POLICY IF EXISTS "academia_notes_update" ON public.academia_notes;
CREATE POLICY "academia_notes_update" ON public.academia_notes FOR UPDATE USING (is_connection_space_member(space_id)) WITH CHECK (is_connection_space_member(space_id));
DROP POLICY IF EXISTS "academia_notes_delete" ON public.academia_notes;
CREATE POLICY "academia_notes_delete" ON public.academia_notes FOR DELETE USING (is_connection_space_member(space_id));
CREATE INDEX IF NOT EXISTS idx_academia_notes_space_id ON public.academia_notes(space_id);
CREATE INDEX IF NOT EXISTS idx_academia_notes_tags ON public.academia_notes USING GIN(tags);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academia_notes TO authenticated;

CREATE TABLE IF NOT EXISTS public.academia_mentorships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,
  mentor_member_id UUID REFERENCES public.connection_members(id) ON DELETE SET NULL,
  mentee_member_id UUID REFERENCES public.connection_members(id) ON DELETE SET NULL,
  relationship_type TEXT NOT NULL,
  focus_areas TEXT[] DEFAULT '{}'::text[], objectives JSONB DEFAULT '[]'::jsonb,
  frequency TEXT, duration_minutes INTEGER DEFAULT 60, next_session_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT check_relationship_type_valid CHECK (relationship_type IN ('giving','receiving'))
);

CREATE OR REPLACE FUNCTION public.update_academia_mentorships_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_academia_mentorships_updated_at ON public.academia_mentorships;
CREATE TRIGGER update_academia_mentorships_updated_at BEFORE UPDATE ON public.academia_mentorships FOR EACH ROW EXECUTE FUNCTION public.update_academia_mentorships_updated_at();
ALTER TABLE public.academia_mentorships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "academia_mentorships_select" ON public.academia_mentorships;
CREATE POLICY "academia_mentorships_select" ON public.academia_mentorships FOR SELECT USING (is_connection_space_member(space_id));
DROP POLICY IF EXISTS "academia_mentorships_insert" ON public.academia_mentorships;
CREATE POLICY "academia_mentorships_insert" ON public.academia_mentorships FOR INSERT WITH CHECK (is_connection_space_member(space_id));
DROP POLICY IF EXISTS "academia_mentorships_update" ON public.academia_mentorships;
CREATE POLICY "academia_mentorships_update" ON public.academia_mentorships FOR UPDATE USING (is_connection_space_member(space_id)) WITH CHECK (is_connection_space_member(space_id));
DROP POLICY IF EXISTS "academia_mentorships_delete" ON public.academia_mentorships;
CREATE POLICY "academia_mentorships_delete" ON public.academia_mentorships FOR DELETE USING (is_connection_space_admin(space_id));
CREATE INDEX IF NOT EXISTS idx_academia_mentorships_space_id ON public.academia_mentorships(space_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academia_mentorships TO authenticated;

CREATE TABLE IF NOT EXISTS public.academia_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,
  journey_id UUID REFERENCES public.academia_journeys(id) ON DELETE SET NULL,
  title TEXT NOT NULL, issuer TEXT NOT NULL, credential_type TEXT,
  issued_at DATE NOT NULL, expires_at DATE,
  credential_url TEXT, credential_id TEXT, document_url TEXT,
  display_order INTEGER, is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT check_title_not_empty CHECK (title <> ''),
  CONSTRAINT check_issuer_not_empty CHECK (issuer <> '')
);

CREATE OR REPLACE FUNCTION public.update_academia_credentials_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_academia_credentials_updated_at ON public.academia_credentials;
CREATE TRIGGER update_academia_credentials_updated_at BEFORE UPDATE ON public.academia_credentials FOR EACH ROW EXECUTE FUNCTION public.update_academia_credentials_updated_at();
ALTER TABLE public.academia_credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "academia_credentials_select" ON public.academia_credentials;
CREATE POLICY "academia_credentials_select" ON public.academia_credentials FOR SELECT USING (is_connection_space_member(space_id));
DROP POLICY IF EXISTS "academia_credentials_insert" ON public.academia_credentials;
CREATE POLICY "academia_credentials_insert" ON public.academia_credentials FOR INSERT WITH CHECK (is_connection_space_member(space_id));
DROP POLICY IF EXISTS "academia_credentials_update" ON public.academia_credentials;
CREATE POLICY "academia_credentials_update" ON public.academia_credentials FOR UPDATE USING (is_connection_space_member(space_id)) WITH CHECK (is_connection_space_member(space_id));
DROP POLICY IF EXISTS "academia_credentials_delete" ON public.academia_credentials;
CREATE POLICY "academia_credentials_delete" ON public.academia_credentials FOR DELETE USING (is_connection_space_admin(space_id));
CREATE INDEX IF NOT EXISTS idx_academia_credentials_space_id ON public.academia_credentials(space_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academia_credentials TO authenticated;

-- ===================== TRIBO ================================================

CREATE TABLE IF NOT EXISTS public.tribo_rituals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL, description TEXT, recurrence_rule TEXT NOT NULL,
  default_time TIME, default_duration_minutes INTEGER DEFAULT 60, default_location TEXT,
  is_mandatory BOOLEAN DEFAULT FALSE, typical_attendance INTEGER,
  is_active BOOLEAN DEFAULT TRUE, next_occurrence_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT check_name_not_empty CHECK (name <> ''),
  CONSTRAINT check_recurrence_not_empty CHECK (recurrence_rule <> '')
);

CREATE OR REPLACE FUNCTION public.update_tribo_rituals_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_tribo_rituals_updated_at ON public.tribo_rituals;
CREATE TRIGGER update_tribo_rituals_updated_at BEFORE UPDATE ON public.tribo_rituals FOR EACH ROW EXECUTE FUNCTION public.update_tribo_rituals_updated_at();
ALTER TABLE public.tribo_rituals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tribo_rituals_select" ON public.tribo_rituals;
CREATE POLICY "tribo_rituals_select" ON public.tribo_rituals FOR SELECT USING (is_connection_space_member(space_id));
DROP POLICY IF EXISTS "tribo_rituals_insert" ON public.tribo_rituals;
CREATE POLICY "tribo_rituals_insert" ON public.tribo_rituals FOR INSERT WITH CHECK (is_connection_space_admin(space_id));
DROP POLICY IF EXISTS "tribo_rituals_update" ON public.tribo_rituals;
CREATE POLICY "tribo_rituals_update" ON public.tribo_rituals FOR UPDATE USING (is_connection_space_admin(space_id)) WITH CHECK (is_connection_space_admin(space_id));
DROP POLICY IF EXISTS "tribo_rituals_delete" ON public.tribo_rituals;
CREATE POLICY "tribo_rituals_delete" ON public.tribo_rituals FOR DELETE USING (is_connection_space_admin(space_id));
CREATE INDEX IF NOT EXISTS idx_tribo_rituals_space_id ON public.tribo_rituals(space_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tribo_rituals TO authenticated;

CREATE TABLE IF NOT EXISTS public.tribo_ritual_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ritual_id UUID NOT NULL REFERENCES public.tribo_rituals(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.connection_events(id) ON DELETE SET NULL,
  occurrence_date TIMESTAMPTZ NOT NULL, location TEXT, notes TEXT,
  bring_list JSONB DEFAULT '[]'::jsonb, rsvp_data JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled')),
  actual_attendance INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE OR REPLACE FUNCTION public.update_tribo_ritual_occurrences_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_tribo_ritual_occurrences_updated_at ON public.tribo_ritual_occurrences;
CREATE TRIGGER update_tribo_ritual_occurrences_updated_at BEFORE UPDATE ON public.tribo_ritual_occurrences FOR EACH ROW EXECUTE FUNCTION public.update_tribo_ritual_occurrences_updated_at();
ALTER TABLE public.tribo_ritual_occurrences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tribo_occurrences_select" ON public.tribo_ritual_occurrences;
CREATE POLICY "tribo_occurrences_select" ON public.tribo_ritual_occurrences FOR SELECT USING (EXISTS (SELECT 1 FROM public.tribo_rituals r WHERE r.id = tribo_ritual_occurrences.ritual_id AND is_connection_space_member(r.space_id)));
DROP POLICY IF EXISTS "tribo_occurrences_insert" ON public.tribo_ritual_occurrences;
CREATE POLICY "tribo_occurrences_insert" ON public.tribo_ritual_occurrences FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.tribo_rituals r WHERE r.id = tribo_ritual_occurrences.ritual_id AND is_connection_space_admin(r.space_id)));
DROP POLICY IF EXISTS "tribo_occurrences_update" ON public.tribo_ritual_occurrences;
CREATE POLICY "tribo_occurrences_update" ON public.tribo_ritual_occurrences FOR UPDATE USING (EXISTS (SELECT 1 FROM public.tribo_rituals r WHERE r.id = tribo_ritual_occurrences.ritual_id AND is_connection_space_admin(r.space_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.tribo_rituals r WHERE r.id = tribo_ritual_occurrences.ritual_id AND is_connection_space_admin(r.space_id)));
DROP POLICY IF EXISTS "tribo_occurrences_delete" ON public.tribo_ritual_occurrences;
CREATE POLICY "tribo_occurrences_delete" ON public.tribo_ritual_occurrences FOR DELETE USING (EXISTS (SELECT 1 FROM public.tribo_rituals r WHERE r.id = tribo_ritual_occurrences.ritual_id AND is_connection_space_admin(r.space_id)));
CREATE INDEX IF NOT EXISTS idx_tribo_occurrences_ritual_id ON public.tribo_ritual_occurrences(ritual_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tribo_ritual_occurrences TO authenticated;

CREATE TABLE IF NOT EXISTS public.tribo_shared_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL, description TEXT, category TEXT DEFAULT 'equipment',
  is_available BOOLEAN DEFAULT TRUE,
  current_holder_id UUID REFERENCES public.connection_members(id) ON DELETE SET NULL,
  checked_out_at TIMESTAMPTZ, return_date DATE,
  estimated_value NUMERIC(10,2), images TEXT[] DEFAULT '{}'::text[], usage_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT check_name_not_empty CHECK (name <> '')
);

CREATE OR REPLACE FUNCTION public.update_tribo_shared_resources_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_tribo_shared_resources_updated_at ON public.tribo_shared_resources;
CREATE TRIGGER update_tribo_shared_resources_updated_at BEFORE UPDATE ON public.tribo_shared_resources FOR EACH ROW EXECUTE FUNCTION public.update_tribo_shared_resources_updated_at();
ALTER TABLE public.tribo_shared_resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tribo_resources_select" ON public.tribo_shared_resources;
CREATE POLICY "tribo_resources_select" ON public.tribo_shared_resources FOR SELECT USING (is_connection_space_member(space_id));
DROP POLICY IF EXISTS "tribo_resources_insert" ON public.tribo_shared_resources;
CREATE POLICY "tribo_resources_insert" ON public.tribo_shared_resources FOR INSERT WITH CHECK (is_connection_space_admin(space_id));
DROP POLICY IF EXISTS "tribo_resources_update" ON public.tribo_shared_resources;
CREATE POLICY "tribo_resources_update" ON public.tribo_shared_resources FOR UPDATE USING (is_connection_space_member(space_id)) WITH CHECK (is_connection_space_member(space_id));
DROP POLICY IF EXISTS "tribo_resources_delete" ON public.tribo_shared_resources;
CREATE POLICY "tribo_resources_delete" ON public.tribo_shared_resources FOR DELETE USING (is_connection_space_admin(space_id));
CREATE INDEX IF NOT EXISTS idx_tribo_resources_space_id ON public.tribo_shared_resources(space_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tribo_shared_resources TO authenticated;

CREATE TABLE IF NOT EXISTS public.tribo_group_funds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL, description TEXT, purpose TEXT,
  target_amount NUMERIC(10,2) NOT NULL, current_amount NUMERIC(10,2) DEFAULT 0, deadline DATE,
  contribution_type TEXT DEFAULT 'voluntary',
  status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT check_title_not_empty CHECK (title <> ''),
  CONSTRAINT check_target_positive CHECK (target_amount > 0)
);

CREATE OR REPLACE FUNCTION public.update_tribo_group_funds_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_tribo_group_funds_updated_at ON public.tribo_group_funds;
CREATE TRIGGER update_tribo_group_funds_updated_at BEFORE UPDATE ON public.tribo_group_funds FOR EACH ROW EXECUTE FUNCTION public.update_tribo_group_funds_updated_at();
ALTER TABLE public.tribo_group_funds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tribo_funds_select" ON public.tribo_group_funds;
CREATE POLICY "tribo_funds_select" ON public.tribo_group_funds FOR SELECT USING (is_connection_space_member(space_id));
DROP POLICY IF EXISTS "tribo_funds_insert" ON public.tribo_group_funds;
CREATE POLICY "tribo_funds_insert" ON public.tribo_group_funds FOR INSERT WITH CHECK (is_connection_space_admin(space_id));
DROP POLICY IF EXISTS "tribo_funds_update" ON public.tribo_group_funds;
CREATE POLICY "tribo_funds_update" ON public.tribo_group_funds FOR UPDATE USING (is_connection_space_admin(space_id)) WITH CHECK (is_connection_space_admin(space_id));
DROP POLICY IF EXISTS "tribo_funds_delete" ON public.tribo_group_funds;
CREATE POLICY "tribo_funds_delete" ON public.tribo_group_funds FOR DELETE USING (is_connection_space_admin(space_id));
CREATE INDEX IF NOT EXISTS idx_tribo_funds_space_id ON public.tribo_group_funds(space_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tribo_group_funds TO authenticated;

CREATE TABLE IF NOT EXISTS public.tribo_fund_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID NOT NULL REFERENCES public.tribo_group_funds(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.connection_members(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  contributed_at TIMESTAMPTZ DEFAULT NOW(),
  is_confirmed BOOLEAN DEFAULT FALSE, confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_method TEXT, transaction_id UUID, notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT check_amount_positive CHECK (amount > 0)
);

ALTER TABLE public.tribo_fund_contributions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tribo_contributions_select" ON public.tribo_fund_contributions;
CREATE POLICY "tribo_contributions_select" ON public.tribo_fund_contributions FOR SELECT USING (EXISTS (SELECT 1 FROM public.tribo_group_funds gf WHERE gf.id = tribo_fund_contributions.fund_id AND is_connection_space_member(gf.space_id)));
DROP POLICY IF EXISTS "tribo_contributions_insert" ON public.tribo_fund_contributions;
CREATE POLICY "tribo_contributions_insert" ON public.tribo_fund_contributions FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.tribo_group_funds gf WHERE gf.id = tribo_fund_contributions.fund_id AND is_connection_space_member(gf.space_id)));
DROP POLICY IF EXISTS "tribo_contributions_update" ON public.tribo_fund_contributions;
CREATE POLICY "tribo_contributions_update" ON public.tribo_fund_contributions FOR UPDATE USING (EXISTS (SELECT 1 FROM public.tribo_group_funds gf WHERE gf.id = tribo_fund_contributions.fund_id AND is_connection_space_admin(gf.space_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.tribo_group_funds gf WHERE gf.id = tribo_fund_contributions.fund_id AND is_connection_space_admin(gf.space_id)));
DROP POLICY IF EXISTS "tribo_contributions_delete" ON public.tribo_fund_contributions;
CREATE POLICY "tribo_contributions_delete" ON public.tribo_fund_contributions FOR DELETE USING (EXISTS (SELECT 1 FROM public.tribo_group_funds gf WHERE gf.id = tribo_fund_contributions.fund_id AND is_connection_space_admin(gf.space_id)));
CREATE INDEX IF NOT EXISTS idx_tribo_contributions_fund_id ON public.tribo_fund_contributions(fund_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tribo_fund_contributions TO authenticated;

CREATE TABLE IF NOT EXISTS public.tribo_discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL, content TEXT, category TEXT DEFAULT 'general',
  is_poll BOOLEAN DEFAULT FALSE, poll_options JSONB DEFAULT '[]'::jsonb, poll_votes JSONB DEFAULT '{}'::jsonb, poll_deadline TIMESTAMPTZ,
  is_pinned BOOLEAN DEFAULT FALSE, is_resolved BOOLEAN DEFAULT FALSE, resolved_at TIMESTAMPTZ,
  reply_count INTEGER DEFAULT 0, last_reply_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT check_title_not_empty CHECK (title <> '')
);

CREATE OR REPLACE FUNCTION public.update_tribo_discussions_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_tribo_discussions_updated_at ON public.tribo_discussions;
CREATE TRIGGER update_tribo_discussions_updated_at BEFORE UPDATE ON public.tribo_discussions FOR EACH ROW EXECUTE FUNCTION public.update_tribo_discussions_updated_at();
ALTER TABLE public.tribo_discussions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tribo_discussions_select" ON public.tribo_discussions;
CREATE POLICY "tribo_discussions_select" ON public.tribo_discussions FOR SELECT USING (is_connection_space_member(space_id));
DROP POLICY IF EXISTS "tribo_discussions_insert" ON public.tribo_discussions;
CREATE POLICY "tribo_discussions_insert" ON public.tribo_discussions FOR INSERT WITH CHECK (is_connection_space_member(space_id) AND created_by = auth.uid());
DROP POLICY IF EXISTS "tribo_discussions_update" ON public.tribo_discussions;
CREATE POLICY "tribo_discussions_update" ON public.tribo_discussions FOR UPDATE USING (created_by = auth.uid() OR is_connection_space_admin(space_id)) WITH CHECK (created_by = auth.uid() OR is_connection_space_admin(space_id));
DROP POLICY IF EXISTS "tribo_discussions_delete" ON public.tribo_discussions;
CREATE POLICY "tribo_discussions_delete" ON public.tribo_discussions FOR DELETE USING (created_by = auth.uid() OR is_connection_space_admin(space_id));
CREATE INDEX IF NOT EXISTS idx_tribo_discussions_space_id ON public.tribo_discussions(space_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tribo_discussions TO authenticated;

CREATE TABLE IF NOT EXISTS public.tribo_discussion_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES public.tribo_discussions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_reply_id UUID REFERENCES public.tribo_discussion_replies(id) ON DELETE CASCADE,
  reactions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT check_content_not_empty CHECK (content <> '')
);

CREATE OR REPLACE FUNCTION public.update_tribo_discussion_replies_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_tribo_discussion_replies_updated_at ON public.tribo_discussion_replies;
CREATE TRIGGER update_tribo_discussion_replies_updated_at BEFORE UPDATE ON public.tribo_discussion_replies FOR EACH ROW EXECUTE FUNCTION public.update_tribo_discussion_replies_updated_at();
ALTER TABLE public.tribo_discussion_replies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tribo_replies_select" ON public.tribo_discussion_replies;
CREATE POLICY "tribo_replies_select" ON public.tribo_discussion_replies FOR SELECT USING (EXISTS (SELECT 1 FROM public.tribo_discussions d WHERE d.id = tribo_discussion_replies.discussion_id AND is_connection_space_member(d.space_id)));
DROP POLICY IF EXISTS "tribo_replies_insert" ON public.tribo_discussion_replies;
CREATE POLICY "tribo_replies_insert" ON public.tribo_discussion_replies FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.tribo_discussions d WHERE d.id = tribo_discussion_replies.discussion_id AND is_connection_space_member(d.space_id)) AND author_id = auth.uid());
DROP POLICY IF EXISTS "tribo_replies_update" ON public.tribo_discussion_replies;
CREATE POLICY "tribo_replies_update" ON public.tribo_discussion_replies FOR UPDATE USING (author_id = auth.uid() OR EXISTS (SELECT 1 FROM public.tribo_discussions d WHERE d.id = tribo_discussion_replies.discussion_id AND is_connection_space_admin(d.space_id))) WITH CHECK (author_id = auth.uid() OR EXISTS (SELECT 1 FROM public.tribo_discussions d WHERE d.id = tribo_discussion_replies.discussion_id AND is_connection_space_admin(d.space_id)));
DROP POLICY IF EXISTS "tribo_replies_delete" ON public.tribo_discussion_replies;
CREATE POLICY "tribo_replies_delete" ON public.tribo_discussion_replies FOR DELETE USING (author_id = auth.uid() OR EXISTS (SELECT 1 FROM public.tribo_discussions d WHERE d.id = tribo_discussion_replies.discussion_id AND is_connection_space_admin(d.space_id)));
CREATE INDEX IF NOT EXISTS idx_tribo_replies_discussion_id ON public.tribo_discussion_replies(discussion_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tribo_discussion_replies TO authenticated;

-- Tribo triggers for fund amounts and discussion stats
CREATE OR REPLACE FUNCTION public.update_tribo_fund_amount() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_confirmed AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.is_confirmed = FALSE)) THEN
    UPDATE public.tribo_group_funds SET current_amount = current_amount + NEW.amount WHERE id = NEW.fund_id;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tribo_fund_contribution_update ON public.tribo_fund_contributions;
CREATE TRIGGER tribo_fund_contribution_update AFTER INSERT OR UPDATE ON public.tribo_fund_contributions FOR EACH ROW EXECUTE FUNCTION public.update_tribo_fund_amount();

CREATE OR REPLACE FUNCTION public.update_tribo_discussion_stats() RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.tribo_discussions SET reply_count = (SELECT COUNT(*) FROM public.tribo_discussion_replies WHERE discussion_id = NEW.discussion_id), last_reply_at = NOW() WHERE id = NEW.discussion_id;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tribo_discussion_reply_update ON public.tribo_discussion_replies;
CREATE TRIGGER tribo_discussion_reply_update AFTER INSERT ON public.tribo_discussion_replies FOR EACH ROW EXECUTE FUNCTION public.update_tribo_discussion_stats();

-- ===================== WORK_ITEMS LINK ======================================

CREATE OR REPLACE FUNCTION public.can_link_task_to_connection_space(_space_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN public.is_connection_space_member(_space_id); END; $$;

CREATE OR REPLACE FUNCTION public.validate_work_item_archetype_refs(_space_id uuid, _habitat_property_id uuid, _ventures_entity_id uuid, _academia_journey_id uuid, _tribo_ritual_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _space_archetype public.connection_archetype_type; _non_null_refs_count int := 0;
BEGIN
  SELECT archetype INTO _space_archetype FROM public.connection_spaces WHERE id = _space_id;
  IF _space_archetype IS NULL THEN RETURN FALSE; END IF;
  _non_null_refs_count := COALESCE(CASE WHEN _habitat_property_id IS NOT NULL THEN 1 ELSE 0 END,0) + COALESCE(CASE WHEN _ventures_entity_id IS NOT NULL THEN 1 ELSE 0 END,0) + COALESCE(CASE WHEN _academia_journey_id IS NOT NULL THEN 1 ELSE 0 END,0) + COALESCE(CASE WHEN _tribo_ritual_id IS NOT NULL THEN 1 ELSE 0 END,0);
  IF _non_null_refs_count > 1 THEN RETURN FALSE; END IF;
  IF _non_null_refs_count = 0 THEN RETURN TRUE; END IF;
  CASE _space_archetype WHEN 'habitat' THEN RETURN _habitat_property_id IS NOT NULL; WHEN 'ventures' THEN RETURN _ventures_entity_id IS NOT NULL; WHEN 'academia' THEN RETURN _academia_journey_id IS NOT NULL; WHEN 'tribo' THEN RETURN _tribo_ritual_id IS NOT NULL; ELSE RETURN FALSE; END CASE;
END; $$;

ALTER TABLE public.work_items ADD COLUMN IF NOT EXISTS connection_space_id UUID REFERENCES public.connection_spaces(id) ON DELETE SET NULL;
ALTER TABLE public.work_items ADD COLUMN IF NOT EXISTS habitat_property_id UUID;
ALTER TABLE public.work_items ADD COLUMN IF NOT EXISTS ventures_entity_id UUID;
ALTER TABLE public.work_items ADD COLUMN IF NOT EXISTS academia_journey_id UUID;
ALTER TABLE public.work_items ADD COLUMN IF NOT EXISTS tribo_ritual_id UUID;

CREATE INDEX IF NOT EXISTS idx_work_items_connection_space_id ON public.work_items(connection_space_id) WHERE connection_space_id IS NOT NULL;

DROP POLICY IF EXISTS "Users can view their own work items" ON public.work_items;
DROP POLICY IF EXISTS "Users can insert their own work items" ON public.work_items;
DROP POLICY IF EXISTS "Users can update their own work items" ON public.work_items;
DROP POLICY IF EXISTS "Users can delete their own work items" ON public.work_items;
DROP POLICY IF EXISTS "work_items_select" ON public.work_items;
CREATE POLICY "work_items_select" ON public.work_items FOR SELECT USING (auth.uid() = user_id OR (connection_space_id IS NOT NULL AND public.is_connection_space_member(connection_space_id)));
DROP POLICY IF EXISTS "work_items_insert" ON public.work_items;
CREATE POLICY "work_items_insert" ON public.work_items FOR INSERT WITH CHECK (auth.uid() = user_id AND (connection_space_id IS NULL OR public.can_link_task_to_connection_space(connection_space_id)) AND (connection_space_id IS NULL OR public.validate_work_item_archetype_refs(connection_space_id, habitat_property_id, ventures_entity_id, academia_journey_id, tribo_ritual_id)));
DROP POLICY IF EXISTS "work_items_update" ON public.work_items;
CREATE POLICY "work_items_update" ON public.work_items FOR UPDATE USING (auth.uid() = user_id OR (connection_space_id IS NOT NULL AND public.is_connection_space_admin(connection_space_id))) WITH CHECK (auth.uid() = user_id AND (connection_space_id IS NULL OR public.can_link_task_to_connection_space(connection_space_id)) AND (connection_space_id IS NULL OR public.validate_work_item_archetype_refs(connection_space_id, habitat_property_id, ventures_entity_id, academia_journey_id, tribo_ritual_id)));
DROP POLICY IF EXISTS "work_items_delete" ON public.work_items;
CREATE POLICY "work_items_delete" ON public.work_items FOR DELETE USING (auth.uid() = user_id OR (connection_space_id IS NOT NULL AND public.is_connection_space_admin(connection_space_id)));

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_max_one_archetype_ref') THEN ALTER TABLE public.work_items ADD CONSTRAINT check_max_one_archetype_ref CHECK ((CASE WHEN habitat_property_id IS NOT NULL THEN 1 ELSE 0 END) + (CASE WHEN ventures_entity_id IS NOT NULL THEN 1 ELSE 0 END) + (CASE WHEN academia_journey_id IS NOT NULL THEN 1 ELSE 0 END) + (CASE WHEN tribo_ritual_id IS NOT NULL THEN 1 ELSE 0 END) <= 1); END IF; END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_items TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_link_task_to_connection_space(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_work_item_archetype_refs(uuid, uuid, uuid, uuid, uuid) TO authenticated;

-- ===================== CONNECTION INVITATIONS ================================

CREATE TABLE IF NOT EXISTS public.connection_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL, token TEXT NOT NULL UNIQUE,
  status public.connection_invitation_status DEFAULT 'pending' NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.connection_member_role DEFAULT 'member' NOT NULL,
  email_sent_at TIMESTAMPTZ, email_delivery_status public.email_delivery_status DEFAULT 'pending' NOT NULL, email_delivery_error TEXT,
  expires_at TIMESTAMPTZ NOT NULL, accepted_at TIMESTAMPTZ, rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE OR REPLACE FUNCTION public.update_connection_invitations_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_connection_invitations_updated_at ON public.connection_invitations;
CREATE TRIGGER update_connection_invitations_updated_at BEFORE UPDATE ON public.connection_invitations FOR EACH ROW EXECUTE FUNCTION public.update_connection_invitations_updated_at();

CREATE OR REPLACE FUNCTION public.can_manage_invitations(_space_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.connection_members WHERE space_id = _space_id AND user_id = auth.uid() AND role IN ('owner','admin') AND is_active = TRUE) OR EXISTS (SELECT 1 FROM public.connection_spaces WHERE id = _space_id AND owner_id = auth.uid());
END; $$;

ALTER TABLE public.connection_invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "connection_invitations_select" ON public.connection_invitations;
CREATE POLICY "connection_invitations_select" ON public.connection_invitations FOR SELECT USING (can_manage_invitations(space_id) OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "connection_invitations_insert" ON public.connection_invitations;
CREATE POLICY "connection_invitations_insert" ON public.connection_invitations FOR INSERT WITH CHECK (can_manage_invitations(space_id) AND invited_by = auth.uid());
DROP POLICY IF EXISTS "connection_invitations_update" ON public.connection_invitations;
CREATE POLICY "connection_invitations_update" ON public.connection_invitations FOR UPDATE USING (can_manage_invitations(space_id)) WITH CHECK (can_manage_invitations(space_id));
DROP POLICY IF EXISTS "connection_invitations_delete" ON public.connection_invitations;
CREATE POLICY "connection_invitations_delete" ON public.connection_invitations FOR DELETE USING (can_manage_invitations(space_id));
CREATE INDEX IF NOT EXISTS idx_connection_invitations_space_id ON public.connection_invitations(space_id);
CREATE INDEX IF NOT EXISTS idx_connection_invitations_token ON public.connection_invitations(token);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connection_invitations TO authenticated;

-- ===================== ORGANIZATIONS LINK ===================================

ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS connection_space_id UUID REFERENCES public.connection_spaces(id) ON DELETE SET NULL;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS ventures_entity_id UUID REFERENCES public.ventures_entities(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_connection_space ON public.organizations(connection_space_id) WHERE connection_space_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_ventures_entity ON public.organizations(ventures_entity_id) WHERE ventures_entity_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_venture_from_organization(p_organization_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org RECORD; v_space_id UUID; v_entity_id UUID; v_entity_type VARCHAR(20); v_sector VARCHAR(100);
BEGIN
  SELECT * INTO v_org FROM public.organizations WHERE id = p_organization_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Organization not found: %', p_organization_id; END IF;
  IF v_org.ventures_entity_id IS NOT NULL THEN RETURN json_build_object('success', false, 'error', 'Already linked', 'ventures_entity_id', v_org.ventures_entity_id); END IF;
  v_entity_type := CASE v_org.organization_type WHEN 'empresa' THEN 'LTDA' WHEN 'ong' THEN 'NONPROFIT' WHEN 'instituto' THEN 'NONPROFIT' WHEN 'associacao' THEN 'NONPROFIT' WHEN 'cooperativa' THEN 'LTDA' WHEN 'governo' THEN 'NONPROFIT' ELSE 'LTDA' END;
  v_sector := CASE WHEN array_length(v_org.areas_of_activity, 1) > 0 THEN v_org.areas_of_activity[1] ELSE NULL END;
  INSERT INTO public.connection_spaces (owner_id, archetype, name, subtitle, description, icon, color_theme, is_active, is_favorite) VALUES (v_org.user_id, 'ventures', COALESCE(v_org.name, v_org.legal_name, 'Nova Empresa'), v_org.legal_name, v_org.description, 'building-2', COALESCE((v_org.brand_colors->>'primary')::VARCHAR, '#3B82F6'), true, false) RETURNING id INTO v_space_id;
  INSERT INTO public.ventures_entities (space_id, legal_name, trading_name, cnpj, entity_type, email, phone, website, address_line1, city, state, postal_code, country, sector, founded_at, is_active) VALUES (v_space_id, COALESCE(v_org.legal_name, v_org.name), v_org.name, v_org.document_number, v_entity_type, v_org.email, v_org.phone, v_org.website, CONCAT_WS(', ', v_org.address_street, v_org.address_number, v_org.address_complement), v_org.address_city, v_org.address_state, v_org.address_zip, COALESCE(v_org.address_country, 'Brasil'), v_sector, CASE WHEN v_org.foundation_year IS NOT NULL THEN make_date(v_org.foundation_year, 1, 1)::TEXT ELSE NULL END, true) RETURNING id INTO v_entity_id;
  UPDATE public.organizations SET connection_space_id = v_space_id, ventures_entity_id = v_entity_id, updated_at = NOW() WHERE id = p_organization_id;
  RETURN json_build_object('success', true, 'organization_id', p_organization_id, 'connection_space_id', v_space_id, 'ventures_entity_id', v_entity_id);
EXCEPTION WHEN OTHERS THEN RETURN json_build_object('success', false, 'error', SQLERRM, 'organization_id', p_organization_id);
END; $$;

CREATE OR REPLACE FUNCTION public.sync_organization_to_venture(p_organization_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org RECORD; v_entity_type VARCHAR(20); v_sector VARCHAR(100);
BEGIN
  SELECT * INTO v_org FROM public.organizations WHERE id = p_organization_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Organization not found: %', p_organization_id; END IF;
  IF v_org.ventures_entity_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not linked'); END IF;
  v_entity_type := CASE v_org.organization_type WHEN 'empresa' THEN 'LTDA' WHEN 'ong' THEN 'NONPROFIT' WHEN 'instituto' THEN 'NONPROFIT' WHEN 'associacao' THEN 'NONPROFIT' WHEN 'cooperativa' THEN 'LTDA' WHEN 'governo' THEN 'NONPROFIT' ELSE 'LTDA' END;
  v_sector := CASE WHEN array_length(v_org.areas_of_activity, 1) > 0 THEN v_org.areas_of_activity[1] ELSE NULL END;
  UPDATE public.connection_spaces SET name = COALESCE(v_org.name, v_org.legal_name), subtitle = v_org.legal_name, description = v_org.description, color_theme = COALESCE((v_org.brand_colors->>'primary')::VARCHAR, color_theme), updated_at = NOW() WHERE id = v_org.connection_space_id;
  UPDATE public.ventures_entities SET legal_name = COALESCE(v_org.legal_name, v_org.name), trading_name = v_org.name, cnpj = v_org.document_number, entity_type = v_entity_type, email = v_org.email, phone = v_org.phone, website = v_org.website, address_line1 = CONCAT_WS(', ', v_org.address_street, v_org.address_number, v_org.address_complement), city = v_org.address_city, state = v_org.address_state, postal_code = v_org.address_zip, country = COALESCE(v_org.address_country, 'Brasil'), sector = v_sector, founded_at = CASE WHEN v_org.foundation_year IS NOT NULL THEN make_date(v_org.foundation_year, 1, 1)::TEXT ELSE founded_at END, updated_at = NOW() WHERE id = v_org.ventures_entity_id;
  RETURN json_build_object('success', true, 'organization_id', p_organization_id, 'ventures_entity_id', v_org.ventures_entity_id, 'synced_at', NOW());
EXCEPTION WHEN OTHERS THEN RETURN json_build_object('success', false, 'error', SQLERRM);
END; $$;

CREATE OR REPLACE FUNCTION public.trigger_sync_org_to_venture() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN IF NEW.ventures_entity_id IS NOT NULL THEN PERFORM public.sync_organization_to_venture(NEW.id); END IF; RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trigger_auto_sync_org_venture ON public.organizations;
CREATE TRIGGER trigger_auto_sync_org_venture AFTER UPDATE ON public.organizations FOR EACH ROW WHEN (OLD.ventures_entity_id IS NOT NULL) EXECUTE FUNCTION public.trigger_sync_org_to_venture();

-- ===================== MARK ORIGINAL MIGRATIONS AS APPLIED ==================
-- If the original migration files exist in the schema_migrations table but
-- their SQL failed, this repair will have created the tables.
-- If they DON'T exist in schema_migrations, supabase db push will try to
-- run them too (and they'll no-op since tables already exist via IF NOT EXISTS).
-- Either way, this migration ensures the tables exist.

-- ===================== DONE =================================================
