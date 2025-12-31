-- ============================================================================
-- WhatsApp Gamification Tracking Migration
-- ============================================================================
-- Created: 2025-01-01
-- Purpose: Track WhatsApp user activities for gamification badge unlocks
-- Related: WhatsApp + Gamification Integration
-- ============================================================================

-- ============================================================================
-- 1. CREATE ACTIVITY TRACKING TABLE
-- ============================================================================

-- Track WhatsApp-specific user activities for gamification
CREATE TABLE IF NOT EXISTS whatsapp_user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'connection',
    'consent_grant',
    'analytics_view',
    'contact_analysis',
    'anomaly_check'
  )),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

-- Index for fast user queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_activity_user
  ON whatsapp_user_activity(user_id, created_at DESC);

-- Index for activity type queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_activity_type
  ON whatsapp_user_activity(user_id, activity_type);

-- Index for metadata queries (GIN index for JSONB)
CREATE INDEX IF NOT EXISTS idx_whatsapp_activity_metadata
  ON whatsapp_user_activity USING GIN (metadata);

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on the table
ALTER TABLE whatsapp_user_activity ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own activities
CREATE POLICY "Users can view own whatsapp activities"
  ON whatsapp_user_activity
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only insert their own activities
CREATE POLICY "Users can insert own whatsapp activities"
  ON whatsapp_user_activity
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 4. HELPER FUNCTION: Count Analytics Views
-- ============================================================================

-- Count total analytics views for a user
CREATE OR REPLACE FUNCTION count_whatsapp_analytics_views(p_user_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM whatsapp_user_activity
  WHERE user_id = p_user_id
    AND activity_type = 'analytics_view';
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION count_whatsapp_analytics_views(UUID) TO authenticated;

-- Comment on function
COMMENT ON FUNCTION count_whatsapp_analytics_views(UUID) IS
  'Returns total count of analytics views for a user (for badge unlocks)';

-- ============================================================================
-- 5. HELPER FUNCTION: Count Unique Contacts Analyzed
-- ============================================================================

-- Count unique contacts analyzed by a user
CREATE OR REPLACE FUNCTION count_unique_contacts_analyzed(p_user_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(DISTINCT metadata->>'contact_hash')::INTEGER
  FROM whatsapp_user_activity
  WHERE user_id = p_user_id
    AND activity_type = 'contact_analysis'
    AND metadata->>'contact_hash' IS NOT NULL;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION count_unique_contacts_analyzed(UUID) TO authenticated;

-- Comment on function
COMMENT ON FUNCTION count_unique_contacts_analyzed(UUID) IS
  'Returns count of unique contacts analyzed by a user (for badge unlocks)';

-- ============================================================================
-- 6. HELPER FUNCTION: Check All WhatsApp Consents Granted
-- ============================================================================

-- Check if all 5 WhatsApp consents are granted for a user
CREATE OR REPLACE FUNCTION check_all_whatsapp_consents_granted(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*) = 5  -- Must have all 5 consent types granted
  FROM whatsapp_consent_records
  WHERE user_id = p_user_id
    AND status = 'granted'
    AND consent_type IN (
      'data_collection',
      'ai_processing',
      'sentiment_analysis',
      'notifications',
      'data_retention'
    );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_all_whatsapp_consents_granted(UUID) TO authenticated;

-- Comment on function
COMMENT ON FUNCTION check_all_whatsapp_consents_granted(UUID) IS
  'Returns TRUE if user has granted all 5 WhatsApp consent types (for "Consent Champion" badge)';

-- ============================================================================
-- 7. HELPER FUNCTION: Get User Activity Summary
-- ============================================================================

-- Get activity summary for a user (useful for debugging/admin)
CREATE OR REPLACE FUNCTION get_whatsapp_activity_summary(p_user_id UUID)
RETURNS TABLE (
  activity_type TEXT,
  count BIGINT,
  first_activity TIMESTAMPTZ,
  last_activity TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT
    activity_type,
    COUNT(*) as count,
    MIN(created_at) as first_activity,
    MAX(created_at) as last_activity
  FROM whatsapp_user_activity
  WHERE user_id = p_user_id
  GROUP BY activity_type
  ORDER BY count DESC;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_whatsapp_activity_summary(UUID) TO authenticated;

-- Comment on function
COMMENT ON FUNCTION get_whatsapp_activity_summary(UUID) IS
  'Returns activity summary grouped by type for a user';

-- ============================================================================
-- 8. TABLE COMMENTS
-- ============================================================================

COMMENT ON TABLE whatsapp_user_activity IS
  'Tracks WhatsApp-related user activities for gamification badge unlocks and XP rewards';

COMMENT ON COLUMN whatsapp_user_activity.id IS
  'Unique identifier for each activity record';

COMMENT ON COLUMN whatsapp_user_activity.user_id IS
  'User who performed the activity';

COMMENT ON COLUMN whatsapp_user_activity.activity_type IS
  'Type of activity: connection, consent_grant, analytics_view, contact_analysis, anomaly_check';

COMMENT ON COLUMN whatsapp_user_activity.metadata IS
  'Optional metadata (e.g., contact_hash for contact_analysis, consent_type for consent_grant)';

COMMENT ON COLUMN whatsapp_user_activity.created_at IS
  'Timestamp when the activity occurred';

-- ============================================================================
-- 9. SAMPLE QUERIES (for documentation)
-- ============================================================================

/*
-- Example 1: Get total analytics views for current user
SELECT count_whatsapp_analytics_views(auth.uid());

-- Example 2: Get unique contacts analyzed by current user
SELECT count_unique_contacts_analyzed(auth.uid());

-- Example 3: Check if current user has all consents granted
SELECT check_all_whatsapp_consents_granted(auth.uid());

-- Example 4: Get activity summary for current user
SELECT * FROM get_whatsapp_activity_summary(auth.uid());

-- Example 5: Get last 10 activities for current user
SELECT
  activity_type,
  metadata,
  created_at
FROM whatsapp_user_activity
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 10;

-- Example 6: Count activities by type for current user
SELECT
  activity_type,
  COUNT(*) as count
FROM whatsapp_user_activity
WHERE user_id = auth.uid()
GROUP BY activity_type
ORDER BY count DESC;
*/

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration success
DO $$
BEGIN
  RAISE NOTICE 'Migration 20250101_whatsapp_gamification_tracking completed successfully';
  RAISE NOTICE 'Created: whatsapp_user_activity table';
  RAISE NOTICE 'Created: 4 RPC functions for badge tracking';
  RAISE NOTICE 'Created: 3 indexes for performance';
  RAISE NOTICE 'Created: 2 RLS policies for security';
END
$$;
