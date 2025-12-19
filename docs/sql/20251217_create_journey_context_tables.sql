-- Migration: 20251217_create_journey_context_tables.sql
-- Purpose: Create tables for journey context validation system
--
-- This migration implements the Schema Validation system for Contextual Trails.
-- It stores user-provided context data for each journey (trail), enabling:
-- - Detection when journeys are blocked (missing required fields)
-- - Calculation of journey completion percentage
-- - Recommendations based on user context
-- - Progress tracking across all journeys

-- ============================================================================
-- TABLE: journey_contexts
-- PURPOSE: Store user context data for each journey/trail
-- DESIGN: JSONB column for flexible field storage, indexed for fast queries
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.journey_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User and journey reference
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journey_id TEXT NOT NULL,              -- e.g., 'finance', 'health-emotional'

  -- Context data stored as JSONB
  -- Structure: { field_key: field_value, ... }
  -- Example: { "total_debts": 5000, "monthly_income": 3000, "payment_plan": null }
  context_data JSONB NOT NULL DEFAULT '{}',

  -- Validation metadata
  is_complete BOOLEAN DEFAULT FALSE,     -- All required fields filled
  is_blocked BOOLEAN DEFAULT FALSE,      -- Has missing required fields
  completion_percentage INT DEFAULT 0,   -- 0-100 progress
  validation_status TEXT DEFAULT 'pending', -- 'pending', 'valid', 'invalid'
  validation_errors TEXT,                -- Errors if validation_status = 'invalid'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_validated_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT journey_context_unique UNIQUE (user_id, journey_id),
  CONSTRAINT valid_journey_id CHECK (journey_id IN ('health-emotional', 'health-physical', 'finance', 'relationships', 'growth')),
  CONSTRAINT valid_completion_range CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  CONSTRAINT valid_status CHECK (validation_status IN ('pending', 'valid', 'invalid'))
);

-- Enable RLS
ALTER TABLE public.journey_contexts ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_journey_contexts_user_id
  ON public.journey_contexts(user_id);

CREATE INDEX idx_journey_contexts_journey_id
  ON public.journey_contexts(journey_id);

CREATE INDEX idx_journey_contexts_user_journey
  ON public.journey_contexts(user_id, journey_id);

CREATE INDEX idx_journey_contexts_is_blocked
  ON public.journey_contexts(user_id, is_blocked)
  WHERE is_blocked = TRUE;

CREATE INDEX idx_journey_contexts_created_at
  ON public.journey_contexts(created_at DESC);

-- JSONB index for fast lookups in context_data
CREATE INDEX idx_journey_contexts_data
  ON public.journey_contexts USING GIN (context_data);

-- ============================================================================
-- TABLE: journey_context_history
-- PURPOSE: Track changes to journey context for audit and recovery
-- DESIGN: Append-only log of all updates
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.journey_context_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to main record
  journey_context_id UUID NOT NULL REFERENCES public.journey_contexts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journey_id TEXT NOT NULL,

  -- Changed data
  previous_data JSONB,                   -- State before update
  new_data JSONB NOT NULL,               -- State after update
  changed_fields TEXT[],                 -- Array of field keys that changed

  -- Change metadata
  change_reason TEXT,                    -- Why was this changed (manual, auto, validation, etc)
  validation_status_before TEXT,
  validation_status_after TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_journey_id CHECK (journey_id IN ('health-emotional', 'health-physical', 'finance', 'relationships', 'growth'))
);

-- Indexes
CREATE INDEX idx_journey_context_history_user_id
  ON public.journey_context_history(user_id);

CREATE INDEX idx_journey_context_history_journey_id
  ON public.journey_context_history(journey_id);

CREATE INDEX idx_journey_context_history_context_id
  ON public.journey_context_history(journey_context_id);

CREATE INDEX idx_journey_context_history_created_at
  ON public.journey_context_history(created_at DESC);

-- ============================================================================
-- FUNCTION: update_journey_contexts_updated_at()
-- PURPOSE: Auto-update the updated_at timestamp on row change
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_journey_contexts_updated_at()
  RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================================================
-- TRIGGER: journey_contexts_updated_at
-- PURPOSE: Trigger the updated_at function on UPDATE
-- ============================================================================

DROP TRIGGER IF EXISTS journey_contexts_updated_at ON public.journey_contexts CASCADE;
CREATE TRIGGER journey_contexts_updated_at
  BEFORE UPDATE ON public.journey_contexts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_journey_contexts_updated_at();

-- ============================================================================
-- FUNCTION: log_journey_context_change()
-- PURPOSE: Log changes to journey_context_history for audit trail
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_journey_context_change()
  RETURNS TRIGGER AS $$
DECLARE
  v_changed_fields TEXT[];
  v_key TEXT;
BEGIN
  -- Only log actual data changes
  IF NEW.context_data IS DISTINCT FROM OLD.context_data THEN
    -- Calculate which fields changed
    SELECT ARRAY_AGG(k)
    INTO v_changed_fields
    FROM (
      SELECT DISTINCT k
      FROM (
        SELECT jsonb_object_keys(OLD.context_data) AS k
        UNION ALL
        SELECT jsonb_object_keys(NEW.context_data) AS k
      ) t
      WHERE OLD.context_data ->> k IS DISTINCT FROM NEW.context_data ->> k
    ) changed;

    INSERT INTO public.journey_context_history (
      journey_context_id,
      user_id,
      journey_id,
      previous_data,
      new_data,
      changed_fields,
      change_reason,
      validation_status_before,
      validation_status_after
    ) VALUES (
      NEW.id,
      NEW.user_id,
      NEW.journey_id,
      OLD.context_data,
      NEW.context_data,
      COALESCE(v_changed_fields, ARRAY[]::TEXT[]),
      'manual_update',
      OLD.validation_status,
      NEW.validation_status
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================================================
-- TRIGGER: journey_context_change_log
-- PURPOSE: Automatically log changes to journey contexts
-- ============================================================================

DROP TRIGGER IF EXISTS journey_context_change_log ON public.journey_contexts CASCADE;
CREATE TRIGGER journey_context_change_log
  AFTER UPDATE ON public.journey_contexts
  FOR EACH ROW
  EXECUTE FUNCTION public.log_journey_context_change();

-- ============================================================================
-- RLS POLICIES: journey_contexts
-- ============================================================================

-- Users can view their own journey contexts
CREATE POLICY "Users can view own journey contexts"
  ON public.journey_contexts FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own journey contexts
CREATE POLICY "Users can insert own journey contexts"
  ON public.journey_contexts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own journey contexts
CREATE POLICY "Users can update own journey contexts"
  ON public.journey_contexts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own journey contexts
CREATE POLICY "Users can delete own journey contexts"
  ON public.journey_contexts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES: journey_context_history (read-only for users)
-- ============================================================================

-- Users can view history of their own journey contexts
CREATE POLICY "Users can view own journey context history"
  ON public.journey_context_history FOR SELECT
  USING (auth.uid() = user_id);

-- History is append-only, no updates or deletes allowed
-- (Enforced by not creating INSERT/UPDATE/DELETE policies)

-- ============================================================================
-- COMMENTS: Documentation
-- ============================================================================

COMMENT ON TABLE public.journey_contexts IS
  'Stores user context data for each journey/trail. Used to determine if journey is blocked (missing required fields) and calculate completion percentage.';

COMMENT ON COLUMN public.journey_contexts.context_data IS
  'JSONB object containing user-provided field values. Keys must match FieldSchema.key from src/data/journeySchemas.ts';

COMMENT ON COLUMN public.journey_contexts.is_blocked IS
  'TRUE if required fields are missing. When true, journey progression is blocked.';

COMMENT ON COLUMN public.journey_contexts.completion_percentage IS
  'Progress indicator: 0-100 representing filled fields / total fields';

COMMENT ON COLUMN public.journey_contexts.validation_status IS
  'pending: Not yet validated | valid: All checks passed | invalid: Has errors';

COMMENT ON TABLE public.journey_context_history IS
  'Append-only audit log of all changes to journey contexts. Used for debugging and data recovery.';

COMMENT ON FUNCTION public.update_journey_contexts_updated_at() IS
  'Auto-updates the updated_at timestamp when a journey context is modified.';

COMMENT ON FUNCTION public.log_journey_context_change() IS
  'Automatically logs changes to journey_context_history table for audit trail.';

-- ============================================================================
-- SAMPLE DATA (optional, for testing)
-- ============================================================================

-- Uncomment to add sample journey contexts for testing:
/*
INSERT INTO public.journey_contexts (user_id, journey_id, context_data, completion_percentage, validation_status)
VALUES (
  'user-uuid-here',
  'finance',
  '{
    "financial_status": "stressed",
    "financial_priorities": ["debt", "emergency"],
    "monthly_income": 3000,
    "total_debts": 15000,
    "monthly_expenses": null,
    "has_emergency_fund": false
  }'::jsonb,
  60,
  'valid'
)
ON CONFLICT (user_id, journey_id) DO NOTHING;
*/
