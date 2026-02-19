-- ============================================================================
-- Add 'email' as a valid source_module for platform_contacts
--
-- Enables the email → platform_contacts pipeline: when emails are
-- categorized by AI, extracted contacts are synced as platform contacts
-- with source_module='email'.
-- ============================================================================

-- Drop and recreate the CHECK constraint to include 'email'
ALTER TABLE public.platform_contacts
  DROP CONSTRAINT IF EXISTS platform_contacts_source_module_check;

ALTER TABLE public.platform_contacts
  ADD CONSTRAINT platform_contacts_source_module_check
  CHECK (source_module IN ('studio', 'flux', 'connections', 'grants', 'manual', 'email'));
