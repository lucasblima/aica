-- Migration: 20260216000003_update_user_memory_constraints.sql
-- Description: Update user_memory CHECK constraints to support the interviewer system.
--              Adds 'flux' to module constraint and 'interview' to source constraint.

-- ============================================================================
-- 1. Update module CHECK constraint — add 'flux'
-- ============================================================================

-- Drop the existing auto-named constraint
ALTER TABLE user_memory DROP CONSTRAINT IF EXISTS user_memory_module_check;

-- Recreate with 'flux' added
ALTER TABLE user_memory ADD CONSTRAINT user_memory_module_check
  CHECK (module IN ('atlas', 'journey', 'studio', 'captacao', 'finance', 'connections', 'flux'));

-- ============================================================================
-- 2. Update source CHECK constraint — add 'interview'
-- ============================================================================

-- Drop the existing auto-named constraint
ALTER TABLE user_memory DROP CONSTRAINT IF EXISTS user_memory_source_check;

-- Recreate with 'interview' added
ALTER TABLE user_memory ADD CONSTRAINT user_memory_source_check
  CHECK (source IN ('explicit', 'inferred', 'observed', 'interview'));

-- ============================================================================
-- 3. Update table comments to reflect new values
-- ============================================================================

COMMENT ON COLUMN user_memory.module IS
  'Module context (atlas, journey, studio, captacao, finance, connections, flux) or NULL for global';

COMMENT ON COLUMN user_memory.source IS
  'How this memory was obtained: explicit (user said), inferred (LLM deduced), observed (system tracked), interview (structured questionnaire)';
