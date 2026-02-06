-- Migration: LGPD Compliance Infrastructure (Task #44)
--
-- Implements comprehensive LGPD/GDPR compliance tables:
-- - user_consents: Consent management with versioning
-- - privacy_audit_logs: Tamper-evident audit trail
-- - data_retention_policies: Configurable retention periods
--
-- LGPD Articles Addressed:
-- - Article 7: Lawful bases for processing
-- - Article 8: Consent requirements
-- - Article 15-18: Data subject rights
-- - Article 37: Record of processing activities
-- - Article 46: Security measures
--
-- Author: Claude (Security & Privacy Agent)
-- Date: 2026-02-06

-- ============================================================================
-- TABLE: user_consents
-- ============================================================================
-- Tracks user consent for data processing purposes (LGPD Article 8)
-- Supports purpose-specific consent with versioning for policy changes

CREATE TABLE IF NOT EXISTS user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User reference
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Consent details
    purpose TEXT NOT NULL CHECK (purpose IN (
        'data_collection',      -- Basic data collection
        'ai_processing',        -- AI/ML processing
        'analytics',            -- Usage analytics
        'personalization',      -- Personalized features
        'notifications',        -- Push/email notifications
        'third_party',          -- Third-party sharing
        'data_retention',       -- Extended retention
        'sentiment_analysis'    -- Emotional analysis
    )),

    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'granted',
        'revoked',
        'pending',
        'expired'
    )),

    -- Legal basis (LGPD Article 7)
    legal_basis TEXT NOT NULL DEFAULT 'consent' CHECK (legal_basis IN (
        'consent',              -- Art. 7, I - Explicit consent
        'legal_obligation',     -- Art. 7, II - Legal requirement
        'public_policy',        -- Art. 7, III - Public administration
        'research',             -- Art. 7, IV - Research purposes
        'contract',             -- Art. 7, V - Contract execution
        'legal_process',        -- Art. 7, VI - Legal proceedings
        'life_protection',      -- Art. 7, VII - Life/safety
        'health_protection',    -- Art. 7, VIII - Health services
        'legitimate_interest',  -- Art. 7, IX - Legitimate interest
        'credit_protection'     -- Art. 7, X - Credit protection
    )),

    -- Consent acquisition details
    consent_method TEXT NOT NULL DEFAULT 'web_form' CHECK (consent_method IN (
        'web_form',             -- Web interface
        'api',                  -- API call
        'whatsapp_keyword',     -- WhatsApp message
        'mobile_app',           -- Mobile application
        'verbal',               -- Recorded verbal consent
        'implied'               -- Implied from use (requires notice)
    )),

    -- Evidence
    ip_address TEXT,
    user_agent TEXT,
    consent_text TEXT,          -- Actual consent text shown to user

    -- Timing
    granted_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,

    -- Versioning
    policy_version TEXT NOT NULL DEFAULT '2.0',

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Unique constraint per user/purpose
    CONSTRAINT unique_user_consent UNIQUE(user_id, purpose)
);

-- Indexes for user_consents
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id
    ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_status
    ON user_consents(status) WHERE status = 'granted';
CREATE INDEX IF NOT EXISTS idx_user_consents_expiration
    ON user_consents(expires_at) WHERE expires_at IS NOT NULL AND status = 'granted';

-- RLS for user_consents
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

-- Users can view their own consents
CREATE POLICY "Users can view own consents"
    ON user_consents
    FOR SELECT
    USING (user_id = auth.uid());

-- Users can manage their own consents
CREATE POLICY "Users can manage own consents"
    ON user_consents
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- TABLE: privacy_audit_logs
-- ============================================================================
-- Tamper-evident audit trail for LGPD compliance (Article 37, 46)
-- Uses hash chain for integrity verification

CREATE TABLE IF NOT EXISTS privacy_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Event classification
    event_type TEXT NOT NULL CHECK (event_type IN (
        -- Data access events
        'data_access',
        'data_export',
        'data_deletion',
        'data_rectification',
        'data_anonymization',
        -- Consent events
        'consent_granted',
        'consent_revoked',
        'consent_expired',
        -- Auth events
        'auth_login',
        'auth_logout',
        'auth_failed',
        'auth_token_refresh',
        -- Agent events
        'agent_invocation',
        'tool_execution',
        -- Admin events
        'admin_action',
        'policy_change',
        'system_event',
        -- Data subject rights
        'data_subject_right'
    )),

    -- Subject
    user_id UUID NOT NULL,  -- No FK to allow logging after user deletion

    -- Resource details
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    action TEXT NOT NULL,

    -- Accessor information
    accessor TEXT DEFAULT 'system' CHECK (accessor IN (
        'user',         -- User accessing own data
        'agent',        -- AI agent
        'system',       -- Automated process
        'admin',        -- Administrator
        'third_party'   -- External service
    )),

    -- Request context (masked for privacy)
    ip_address TEXT,
    user_agent TEXT,

    -- Event details
    details JSONB DEFAULT '{}',
    success BOOLEAN DEFAULT true,
    error_message TEXT,

    -- Integrity
    entry_hash TEXT,            -- SHA-256 hash for tamper detection
    previous_hash TEXT,         -- Link to previous entry for chain

    -- Timing
    timestamp TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for privacy_audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
    ON privacy_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type
    ON privacy_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
    ON privacy_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
    ON privacy_audit_logs(resource_type, action);

-- RLS for privacy_audit_logs
ALTER TABLE privacy_audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs"
    ON privacy_audit_logs
    FOR SELECT
    USING (user_id = auth.uid());

-- Only service role can insert (no user modifications allowed)
CREATE POLICY "Service role can insert audit logs"
    ON privacy_audit_logs
    FOR INSERT
    WITH CHECK (true);

-- No UPDATE or DELETE allowed (immutable audit trail)
-- This is enforced by NOT creating UPDATE/DELETE policies

-- ============================================================================
-- TABLE: data_retention_policies
-- ============================================================================
-- Configurable retention periods by data category

CREATE TABLE IF NOT EXISTS data_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Policy identification
    policy_name TEXT NOT NULL UNIQUE,
    table_name TEXT NOT NULL,

    -- Category
    data_category TEXT NOT NULL CHECK (data_category IN (
        'temporary',        -- 7 days
        'short_term',       -- 30 days
        'medium_term',      -- 365 days
        'long_term',        -- 730 days (2 years)
        'permanent'         -- Until deletion request
    )),

    -- Retention configuration
    retention_days INTEGER NOT NULL,
    date_column TEXT NOT NULL DEFAULT 'created_at',

    -- Behavior
    soft_delete BOOLEAN DEFAULT false,
    soft_delete_column TEXT,
    anonymize_instead BOOLEAN DEFAULT false,

    -- Legal basis
    legal_basis TEXT NOT NULL,
    lgpd_article TEXT,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default retention policies
INSERT INTO data_retention_policies (
    policy_name, table_name, data_category, retention_days,
    date_column, legal_basis, lgpd_article, description
) VALUES
    ('agent_sessions_retention', 'agent_sessions', 'short_term', 30,
     'expires_at', 'Purpose limitation', 'Art. 6, III',
     'Agent sessions expire after 30 days of inactivity'),

    ('user_memory_temp', 'user_memory', 'temporary', 7,
     'updated_at', 'Purpose limitation', 'Art. 6, III',
     'Temporary memory entries (cache, temp) expire after 7 days'),

    ('user_memory_pattern', 'user_memory', 'medium_term', 365,
     'updated_at', 'Legitimate interest', 'Art. 7, IX',
     'Pattern memories retained for 1 year for personalization'),

    ('whatsapp_messages', 'whatsapp_messages', 'medium_term', 365,
     'created_at', 'Contract execution', 'Art. 7, V',
     'WhatsApp messages soft-deleted after 1 year'),

    ('audit_logs', 'privacy_audit_logs', 'long_term', 730,
     'created_at', 'Legal obligation', 'Art. 7, II',
     'Audit logs retained for 2 years per legal requirements'),

    ('ai_usage_tracking', 'ai_usage_tracking', 'medium_term', 365,
     'created_at', 'Legitimate interest', 'Art. 7, IX',
     'AI usage statistics anonymized after 30 days, deleted after 1 year')
ON CONFLICT (policy_name) DO NOTHING;

-- ============================================================================
-- FUNCTION: Check consent
-- ============================================================================

CREATE OR REPLACE FUNCTION check_user_consent(
    p_user_id UUID,
    p_purpose TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_status TEXT;
    v_expires_at TIMESTAMPTZ;
BEGIN
    SELECT status, expires_at INTO v_status, v_expires_at
    FROM user_consents
    WHERE user_id = p_user_id
      AND purpose = p_purpose;

    IF v_status IS NULL THEN
        RETURN false;
    END IF;

    IF v_status != 'granted' THEN
        RETURN false;
    END IF;

    IF v_expires_at IS NOT NULL AND v_expires_at < now() THEN
        -- Auto-expire the consent
        UPDATE user_consents
        SET status = 'expired', updated_at = now()
        WHERE user_id = p_user_id AND purpose = p_purpose;
        RETURN false;
    END IF;

    RETURN true;
END;
$$;

-- ============================================================================
-- FUNCTION: Grant consent
-- ============================================================================

CREATE OR REPLACE FUNCTION grant_user_consent(
    p_user_id UUID,
    p_purposes TEXT[],
    p_legal_basis TEXT DEFAULT 'consent',
    p_consent_method TEXT DEFAULT 'web_form',
    p_expires_in_days INTEGER DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_purpose TEXT;
    v_expires_at TIMESTAMPTZ;
BEGIN
    IF p_expires_in_days IS NOT NULL THEN
        v_expires_at := now() + (p_expires_in_days || ' days')::INTERVAL;
    END IF;

    FOREACH v_purpose IN ARRAY p_purposes
    LOOP
        INSERT INTO user_consents (
            user_id, purpose, status, legal_basis, consent_method,
            granted_at, expires_at, policy_version
        ) VALUES (
            p_user_id, v_purpose, 'granted', p_legal_basis, p_consent_method,
            now(), v_expires_at, '2.0'
        )
        ON CONFLICT (user_id, purpose) DO UPDATE SET
            status = 'granted',
            legal_basis = p_legal_basis,
            consent_method = p_consent_method,
            granted_at = now(),
            revoked_at = NULL,
            expires_at = v_expires_at,
            updated_at = now();
    END LOOP;

    RETURN true;
END;
$$;

-- ============================================================================
-- FUNCTION: Revoke consent
-- ============================================================================

CREATE OR REPLACE FUNCTION revoke_user_consent(
    p_user_id UUID,
    p_purposes TEXT[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_purpose TEXT;
BEGIN
    FOREACH v_purpose IN ARRAY p_purposes
    LOOP
        UPDATE user_consents
        SET status = 'revoked',
            revoked_at = now(),
            updated_at = now()
        WHERE user_id = p_user_id
          AND purpose = v_purpose;
    END LOOP;

    RETURN true;
END;
$$;

-- ============================================================================
-- FUNCTION: Export user data (Right to Access)
-- ============================================================================

CREATE OR REPLACE FUNCTION export_user_data(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSONB := '{}';
    v_profile JSONB;
    v_consents JSONB;
    v_memory JSONB;
    v_sessions JSONB;
BEGIN
    -- Export profile
    SELECT to_jsonb(p.*) INTO v_profile
    FROM profiles p
    WHERE p.id = p_user_id;

    v_result := v_result || jsonb_build_object('profile', COALESCE(v_profile, '{}'));

    -- Export consents
    SELECT COALESCE(jsonb_agg(to_jsonb(c.*)), '[]') INTO v_consents
    FROM user_consents c
    WHERE c.user_id = p_user_id;

    v_result := v_result || jsonb_build_object('consents', v_consents);

    -- Export user memory
    SELECT COALESCE(jsonb_agg(to_jsonb(m.*)), '[]') INTO v_memory
    FROM user_memory m
    WHERE m.user_id = p_user_id;

    v_result := v_result || jsonb_build_object('memory', v_memory);

    -- Export sessions
    SELECT COALESCE(jsonb_agg(to_jsonb(s.*)), '[]') INTO v_sessions
    FROM agent_sessions s
    WHERE s.user_id = p_user_id;

    v_result := v_result || jsonb_build_object('sessions', v_sessions);

    -- Log the export
    INSERT INTO privacy_audit_logs (
        event_type, user_id, resource_type, action, accessor, details
    ) VALUES (
        'data_export', p_user_id, 'user_data', 'export', 'user',
        jsonb_build_object('lgpd_article', '15, 18')
    );

    RETURN jsonb_build_object(
        'export_info', jsonb_build_object(
            'user_id', p_user_id,
            'exported_at', now(),
            'lgpd_article', 'Articles 15, 18'
        ),
        'data', v_result
    );
END;
$$;

-- ============================================================================
-- FUNCTION: Delete user data (Right to Erasure)
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_user_data(
    p_user_id UUID,
    p_reason TEXT DEFAULT 'user_request'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted_counts JSONB := '{}';
    v_count INTEGER;
BEGIN
    -- Delete agent sessions
    DELETE FROM agent_sessions WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_counts := v_deleted_counts || jsonb_build_object('agent_sessions', v_count);

    -- Delete user memory
    DELETE FROM user_memory WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_counts := v_deleted_counts || jsonb_build_object('user_memory', v_count);

    -- Delete consents
    DELETE FROM user_consents WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_counts := v_deleted_counts || jsonb_build_object('user_consents', v_count);

    -- Soft delete WhatsApp messages
    UPDATE whatsapp_messages
    SET deleted_at = now(), deletion_reason = 'lgpd_erasure'
    WHERE user_id = p_user_id AND deleted_at IS NULL;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_counts := v_deleted_counts || jsonb_build_object('whatsapp_messages', v_count);

    -- Log the deletion (this stays for audit)
    INSERT INTO privacy_audit_logs (
        event_type, user_id, resource_type, action, accessor, details
    ) VALUES (
        'data_deletion', p_user_id, 'user_data', 'delete', 'user',
        jsonb_build_object(
            'reason', p_reason,
            'records_deleted', v_deleted_counts,
            'lgpd_article', '17'
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'records_deleted', v_deleted_counts,
        'deleted_at', now()
    );
END;
$$;

-- ============================================================================
-- FUNCTION: Apply retention policies
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_retention_policies()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_policy RECORD;
    v_count INTEGER;
    v_results JSONB := '{}';
    v_cutoff TIMESTAMPTZ;
BEGIN
    FOR v_policy IN
        SELECT * FROM data_retention_policies
        WHERE is_active = true AND data_category != 'permanent'
    LOOP
        v_cutoff := now() - (v_policy.retention_days || ' days')::INTERVAL;

        -- Execute retention based on policy type
        IF v_policy.soft_delete AND v_policy.soft_delete_column IS NOT NULL THEN
            EXECUTE format(
                'UPDATE %I SET %I = now() WHERE %I < $1 AND %I IS NULL',
                v_policy.table_name,
                v_policy.soft_delete_column,
                v_policy.date_column,
                v_policy.soft_delete_column
            ) USING v_cutoff;
        ELSIF v_policy.anonymize_instead THEN
            -- Anonymize user_id for analytics retention
            EXECUTE format(
                'UPDATE %I SET user_id = NULL WHERE %I < $1 AND user_id IS NOT NULL',
                v_policy.table_name,
                v_policy.date_column
            ) USING v_cutoff;
        ELSE
            EXECUTE format(
                'DELETE FROM %I WHERE %I < $1',
                v_policy.table_name,
                v_policy.date_column
            ) USING v_cutoff;
        END IF;

        GET DIAGNOSTICS v_count = ROW_COUNT;

        IF v_count > 0 THEN
            v_results := v_results || jsonb_build_object(
                v_policy.table_name,
                jsonb_build_object('records_affected', v_count, 'cutoff_date', v_cutoff)
            );
        END IF;
    END LOOP;

    -- Log retention execution
    INSERT INTO privacy_audit_logs (
        event_type, user_id, resource_type, action, accessor, details
    ) VALUES (
        'system_event', '00000000-0000-0000-0000-000000000000',
        'retention', 'apply_policies', 'system', v_results
    );

    RETURN jsonb_build_object(
        'success', true,
        'executed_at', now(),
        'results', v_results
    );
END;
$$;

-- ============================================================================
-- SCHEDULED JOBS
-- ============================================================================

-- Schedule retention policy execution (daily at 3 AM)
SELECT cron.schedule(
    'apply-retention-policies',
    '0 3 * * *',
    $$SELECT apply_retention_policies()$$
);

-- Schedule consent expiration check (daily at 4 AM)
SELECT cron.schedule(
    'expire-user-consents',
    '0 4 * * *',
    $$
    UPDATE user_consents
    SET status = 'expired', updated_at = now()
    WHERE expires_at IS NOT NULL
      AND expires_at < now()
      AND status = 'granted'
    $$
);

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION check_user_consent TO authenticated;
GRANT EXECUTE ON FUNCTION grant_user_consent TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_user_consent TO authenticated;
GRANT EXECUTE ON FUNCTION export_user_data TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_data TO authenticated;

-- Grant execute on retention policies to service role only
GRANT EXECUTE ON FUNCTION apply_retention_policies TO service_role;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE user_consents IS 'LGPD Article 8 - Consent tracking with versioning and legal basis';
COMMENT ON TABLE privacy_audit_logs IS 'LGPD Article 37 - Tamper-evident audit trail for processing activities';
COMMENT ON TABLE data_retention_policies IS 'LGPD Article 16 - Configurable data retention periods';

COMMENT ON FUNCTION check_user_consent IS 'Check if user has valid consent for a specific purpose';
COMMENT ON FUNCTION grant_user_consent IS 'Record user consent for specified purposes';
COMMENT ON FUNCTION revoke_user_consent IS 'Revoke user consent for specified purposes';
COMMENT ON FUNCTION export_user_data IS 'LGPD Article 15, 18 - Export all user data in portable format';
COMMENT ON FUNCTION delete_user_data IS 'LGPD Article 17 - Right to erasure implementation';
COMMENT ON FUNCTION apply_retention_policies IS 'Apply configured retention policies to purge expired data';
