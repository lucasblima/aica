-- Migration: Create grant_operations table for async operation tracking
-- Created: 2025-12-09
-- Description: Enables real-time progress tracking of long-running operations (field transfer, PDF extraction, etc.)
-- Priority: HIGH - Critical for UX feedback on async operations

-- ============================================================================
-- 1. CREATE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS grant_operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES grant_projects(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES grant_opportunities(id) ON DELETE CASCADE,

  -- Operation details
  operation_type TEXT NOT NULL CHECK (operation_type IN (
    'transfer_briefing_fields',
    'generate_field',
    'generate_all_fields',
    'extract_pdf',
    'extract_edital_pdf',
    'auto_submit',
    'batch_save_responses',
    'calculate_completion'
  )),

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',
    'in_progress',
    'completed',
    'failed',
    'cancelled'
  )),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),

  -- Metadata (flexible JSON for operation-specific data)
  metadata JSONB DEFAULT '{}',
  -- Examples:
  -- transfer_briefing_fields: {fields_count: 19, fields_transferred: 5, current_field: "project_description"}
  -- generate_field: {field_id: "description", model: "gemini-2.0-flash", tokens_used: 1500}
  -- extract_pdf: {file_name: "edital.pdf", pages: 25, current_page: 10}

  -- Error tracking
  error_message TEXT NULL,
  error_code TEXT NULL,
  error_stack TEXT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Performance metrics
  duration_ms INTEGER, -- Calculated: completed_at - started_at

  CONSTRAINT valid_timestamps CHECK (
    (started_at IS NULL OR started_at >= created_at) AND
    (completed_at IS NULL OR completed_at >= started_at)
  )
);

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

-- Primary queries
CREATE INDEX idx_grant_operations_user_id
ON grant_operations(user_id);

CREATE INDEX idx_grant_operations_project_id
ON grant_operations(project_id)
WHERE project_id IS NOT NULL;

CREATE INDEX idx_grant_operations_opportunity_id
ON grant_operations(opportunity_id)
WHERE opportunity_id IS NOT NULL;

-- Status queries (active operations)
CREATE INDEX idx_grant_operations_active
ON grant_operations(user_id, status, created_at DESC)
WHERE status IN ('pending', 'in_progress');

-- Operation type analytics
CREATE INDEX idx_grant_operations_type
ON grant_operations(operation_type, status);

-- Recent operations (for audit trail)
CREATE INDEX idx_grant_operations_recent
ON grant_operations(user_id, created_at DESC);

-- Performance analytics (slow operations)
CREATE INDEX idx_grant_operations_duration
ON grant_operations(operation_type, duration_ms DESC)
WHERE duration_ms IS NOT NULL;

-- GIN index for metadata searches
CREATE INDEX idx_grant_operations_metadata_gin
ON grant_operations USING GIN (metadata);

-- ============================================================================
-- 3. RLS POLICIES
-- ============================================================================

ALTER TABLE grant_operations ENABLE ROW LEVEL SECURITY;

-- Users can view their own operations
CREATE POLICY "Users can view own operations"
  ON grant_operations FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own operations
CREATE POLICY "Users can create own operations"
  ON grant_operations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own operations
CREATE POLICY "Users can update own operations"
  ON grant_operations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own operations
CREATE POLICY "Users can delete own operations"
  ON grant_operations FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. UPDATED_AT TRIGGER
-- ============================================================================

CREATE TRIGGER update_grant_operations_updated_at
  BEFORE UPDATE ON grant_operations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. DURATION CALCULATION TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_operation_duration()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate duration when operation is completed
  IF NEW.status = 'completed' AND NEW.completed_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
    NEW.duration_ms := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_operation_duration
  BEFORE UPDATE ON grant_operations
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION calculate_operation_duration();

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Start an operation
CREATE OR REPLACE FUNCTION start_grant_operation(
  p_operation_type TEXT,
  p_project_id UUID DEFAULT NULL,
  p_opportunity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS grant_operations AS $$
DECLARE
  new_operation grant_operations;
BEGIN
  INSERT INTO grant_operations (
    user_id,
    project_id,
    opportunity_id,
    operation_type,
    status,
    metadata,
    started_at
  ) VALUES (
    auth.uid(),
    p_project_id,
    p_opportunity_id,
    p_operation_type,
    'in_progress',
    p_metadata,
    NOW()
  )
  RETURNING * INTO new_operation;

  RETURN new_operation;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION start_grant_operation IS 'Creates and starts a new operation with status=in_progress';

-- Update operation progress
CREATE OR REPLACE FUNCTION update_operation_progress(
  p_operation_id UUID,
  p_progress INTEGER,
  p_metadata JSONB DEFAULT NULL
) RETURNS grant_operations AS $$
DECLARE
  updated_operation grant_operations;
BEGIN
  UPDATE grant_operations
  SET
    progress_percentage = p_progress,
    metadata = COALESCE(p_metadata, metadata),
    updated_at = NOW()
  WHERE id = p_operation_id
    AND user_id = auth.uid()
  RETURNING * INTO updated_operation;

  IF updated_operation IS NULL THEN
    RAISE EXCEPTION 'Operation not found or access denied';
  END IF;

  RETURN updated_operation;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION update_operation_progress IS 'Updates progress percentage and metadata of an operation';

-- Complete an operation
CREATE OR REPLACE FUNCTION complete_grant_operation(
  p_operation_id UUID,
  p_metadata JSONB DEFAULT NULL
) RETURNS grant_operations AS $$
DECLARE
  updated_operation grant_operations;
BEGIN
  UPDATE grant_operations
  SET
    status = 'completed',
    progress_percentage = 100,
    completed_at = NOW(),
    metadata = COALESCE(p_metadata, metadata),
    updated_at = NOW()
  WHERE id = p_operation_id
    AND user_id = auth.uid()
  RETURNING * INTO updated_operation;

  IF updated_operation IS NULL THEN
    RAISE EXCEPTION 'Operation not found or access denied';
  END IF;

  RETURN updated_operation;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION complete_grant_operation IS 'Marks operation as completed and sets completion timestamp';

-- Fail an operation
CREATE OR REPLACE FUNCTION fail_grant_operation(
  p_operation_id UUID,
  p_error_message TEXT,
  p_error_code TEXT DEFAULT NULL,
  p_error_stack TEXT DEFAULT NULL
) RETURNS grant_operations AS $$
DECLARE
  updated_operation grant_operations;
BEGIN
  UPDATE grant_operations
  SET
    status = 'failed',
    error_message = p_error_message,
    error_code = p_error_code,
    error_stack = p_error_stack,
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_operation_id
    AND user_id = auth.uid()
  RETURNING * INTO updated_operation;

  IF updated_operation IS NULL THEN
    RAISE EXCEPTION 'Operation not found or access denied';
  END IF;

  RETURN updated_operation;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION fail_grant_operation IS 'Marks operation as failed and stores error details';

-- Get active operations for user
CREATE OR REPLACE FUNCTION get_active_operations(
  p_project_id UUID DEFAULT NULL
) RETURNS SETOF grant_operations AS $$
BEGIN
  IF p_project_id IS NOT NULL THEN
    RETURN QUERY
    SELECT *
    FROM grant_operations
    WHERE user_id = auth.uid()
      AND project_id = p_project_id
      AND status IN ('pending', 'in_progress')
    ORDER BY created_at DESC;
  ELSE
    RETURN QUERY
    SELECT *
    FROM grant_operations
    WHERE user_id = auth.uid()
      AND status IN ('pending', 'in_progress')
    ORDER BY created_at DESC;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION get_active_operations IS 'Returns all active (pending/in_progress) operations for current user';

-- ============================================================================
-- 7. ANALYTICS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW grant_operations_analytics AS
SELECT
  operation_type,
  status,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
  ROUND(AVG(duration_ms)) as avg_duration_ms,
  MIN(duration_ms) as min_duration_ms,
  MAX(duration_ms) as max_duration_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) as median_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration_ms
FROM grant_operations
WHERE duration_ms IS NOT NULL
GROUP BY operation_type, status;

COMMENT ON VIEW grant_operations_analytics IS 'Analytics view for operation performance metrics';

-- ============================================================================
-- 8. COMMENTS
-- ============================================================================

COMMENT ON TABLE grant_operations IS 'Tracks async operations (field transfer, PDF extraction, etc.) for real-time UX feedback';
COMMENT ON COLUMN grant_operations.operation_type IS 'Type of operation being tracked';
COMMENT ON COLUMN grant_operations.status IS 'Current status: pending → in_progress → completed/failed';
COMMENT ON COLUMN grant_operations.progress_percentage IS 'Progress from 0-100 for real-time UI updates';
COMMENT ON COLUMN grant_operations.metadata IS 'Flexible JSON for operation-specific data (field count, current page, etc.)';
COMMENT ON COLUMN grant_operations.duration_ms IS 'Operation duration in milliseconds (auto-calculated)';

-- ============================================================================
-- 9. EXAMPLE USAGE (for frontend developers)
-- ============================================================================

/*
-- TypeScript Example:

// 1. Start operation
const { data: operation } = await supabase.rpc('start_grant_operation', {
  p_operation_type: 'transfer_briefing_fields',
  p_project_id: projectId,
  p_metadata: { fields_count: 19 }
});

// 2. Subscribe to real-time updates
const subscription = supabase
  .channel('grant_operations')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'grant_operations',
    filter: `id=eq.${operation.id}`
  }, (payload) => {
    setProgress(payload.new.progress_percentage);
    setMetadata(payload.new.metadata);
  })
  .subscribe();

// 3. Update progress during operation
for (let i = 0; i < fields.length; i++) {
  await saveResponse(fields[i]);

  await supabase.rpc('update_operation_progress', {
    p_operation_id: operation.id,
    p_progress: Math.round(((i + 1) / fields.length) * 100),
    p_metadata: { fields_transferred: i + 1 }
  });
}

// 4. Complete operation
await supabase.rpc('complete_grant_operation', {
  p_operation_id: operation.id,
  p_metadata: { fields_transferred: fields.length }
});

// 5. Cleanup subscription
subscription.unsubscribe();
*/

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- List all active operations
-- SELECT * FROM get_active_operations();

-- Check operation performance
-- SELECT * FROM grant_operations_analytics ORDER BY avg_duration_ms DESC;

-- Find slow operations (> 3 seconds)
-- SELECT
--   id,
--   operation_type,
--   duration_ms,
--   metadata
-- FROM grant_operations
-- WHERE duration_ms > 3000
-- ORDER BY duration_ms DESC;
