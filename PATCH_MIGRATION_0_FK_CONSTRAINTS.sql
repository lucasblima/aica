-- ============================================================================
-- PATCH: Make Foreign Key Constraints Idempotent for Migration 0
-- Execute this INSTEAD of the original DO blocks for FK constraints
-- ============================================================================

-- Add FK to organizations if table exists (IDEMPOTENT)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'organizations'
  ) THEN
    -- Try to add constraint, ignore if exists
    BEGIN
      ALTER TABLE public.processed_documents
        ADD CONSTRAINT fk_processed_documents_organization
        FOREIGN KEY (organization_id)
        REFERENCES public.organizations(id)
        ON DELETE SET NULL;
      RAISE NOTICE 'Added FK constraint to organizations table';
    EXCEPTION
      WHEN duplicate_object THEN
        RAISE NOTICE 'FK constraint to organizations already exists - skipping';
    END;
  END IF;
END $$;

-- Add FK to grant_projects if table exists (IDEMPOTENT)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'grant_projects'
  ) THEN
    -- Try to add constraint, ignore if exists
    BEGIN
      ALTER TABLE public.processed_documents
        ADD CONSTRAINT fk_processed_documents_project
        FOREIGN KEY (project_id)
        REFERENCES public.grant_projects(id)
        ON DELETE SET NULL;
      RAISE NOTICE 'Added FK constraint to grant_projects table';
    EXCEPTION
      WHEN duplicate_object THEN
        RAISE NOTICE 'FK constraint to grant_projects already exists - skipping';
    END;
  END IF;
END $$;
