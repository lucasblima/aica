-- Migration: LGPD Consent Records for WhatsApp Integration
-- Issue #12: WhatsApp Integration via Evolution API
--
-- This migration creates the consent management system for LGPD compliance
-- including opt-in/opt-out tracking and data processing consent

-- ============================================================================
-- TABLE: whatsapp_consent_records
-- ============================================================================
-- Tracks user consent for WhatsApp data processing (LGPD compliance)

CREATE TABLE IF NOT EXISTS whatsapp_consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User reference
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Contact who gave consent (may be different from user)
  contact_phone TEXT NOT NULL,
  contact_name TEXT,

  -- Consent details
  consent_type TEXT NOT NULL CHECK (consent_type IN (
    'data_collection',  -- Permission to collect message data
    'ai_processing',  -- Permission to process with AI
    'sentiment_analysis',  -- Permission for sentiment analysis
    'notifications',  -- Permission to send notifications
    'data_retention',  -- Permission for extended data retention
    'third_party_sharing'  -- Permission to share with third parties (future)
  )),

  -- Consent status
  status TEXT NOT NULL CHECK (status IN ('granted', 'revoked', 'pending')),

  -- How consent was obtained
  consent_method TEXT NOT NULL CHECK (consent_method IN (
    'whatsapp_keyword',  -- Via keyword like "ACEITO"
    'web_form',  -- Via web interface
    'api',  -- Via API call
    'verbal',  -- Recorded verbal consent
    'implied'  -- Implied from continued use (with notice)
  )),

  -- Evidence
  consent_message TEXT,  -- Original message if via WhatsApp
  consent_ip_address TEXT,  -- IP if via web
  consent_user_agent TEXT,  -- Browser/device info if via web

  -- Legal basis (LGPD Article 7)
  legal_basis TEXT CHECK (legal_basis IN (
    'consent',  -- Explicit consent (Art. 7, I)
    'legitimate_interest',  -- Legitimate interest (Art. 7, IX)
    'contract_execution',  -- Contract execution (Art. 7, V)
    'legal_obligation'  -- Legal obligation (Art. 7, II)
  )),

  -- Timestamps
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,  -- Optional expiration

  -- Audit trail
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Version tracking (for consent policy changes)
  policy_version TEXT DEFAULT '1.0',

  -- Unique constraint per user/contact/consent_type
  CONSTRAINT unique_consent_record UNIQUE(user_id, contact_phone, consent_type)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_consent_records_user
  ON whatsapp_consent_records(user_id, consent_type);

CREATE INDEX IF NOT EXISTS idx_consent_records_contact
  ON whatsapp_consent_records(contact_phone, consent_type);

CREATE INDEX IF NOT EXISTS idx_consent_records_status
  ON whatsapp_consent_records(status, consent_type);

CREATE INDEX IF NOT EXISTS idx_consent_records_expiration
  ON whatsapp_consent_records(expires_at)
  WHERE expires_at IS NOT NULL AND status = 'granted';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE whatsapp_consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consent records"
  ON whatsapp_consent_records
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage consent via service"
  ON whatsapp_consent_records
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- TABLE: whatsapp_opt_keywords
-- ============================================================================
-- Keywords for opt-in/opt-out via WhatsApp

CREATE TABLE IF NOT EXISTS whatsapp_opt_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  keyword TEXT NOT NULL,
  keyword_normalized TEXT NOT NULL,  -- Lowercase, trimmed
  action TEXT NOT NULL CHECK (action IN ('opt_in', 'opt_out')),
  consent_type TEXT NOT NULL,
  language TEXT DEFAULT 'pt-BR',

  -- Response message
  response_message TEXT NOT NULL,

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT unique_keyword UNIQUE(keyword_normalized, language)
);

-- Default keywords
INSERT INTO whatsapp_opt_keywords (keyword, keyword_normalized, action, consent_type, response_message, language)
VALUES
  -- Portuguese opt-in keywords
  ('ACEITO', 'aceito', 'opt_in', 'data_collection', 'Obrigado! Seu consentimento foi registrado. Voce pode revogar a qualquer momento enviando CANCELAR.', 'pt-BR'),
  ('SIM', 'sim', 'opt_in', 'data_collection', 'Perfeito! Consentimento registrado. Para cancelar, envie CANCELAR.', 'pt-BR'),
  ('CONCORDO', 'concordo', 'opt_in', 'data_collection', 'Consentimento registrado com sucesso! Envie CANCELAR para revogar.', 'pt-BR'),
  ('ATIVAR', 'ativar', 'opt_in', 'notifications', 'Notificacoes ativadas! Envie DESATIVAR para parar de receber.', 'pt-BR'),

  -- Portuguese opt-out keywords
  ('CANCELAR', 'cancelar', 'opt_out', 'data_collection', 'Seu consentimento foi revogado. Seus dados serao removidos em ate 72 horas conforme LGPD.', 'pt-BR'),
  ('PARAR', 'parar', 'opt_out', 'notifications', 'Notificacoes desativadas. Envie ATIVAR para reativar.', 'pt-BR'),
  ('SAIR', 'sair', 'opt_out', 'data_collection', 'Consentimento revogado. Seus dados serao removidos conforme LGPD.', 'pt-BR'),
  ('DESATIVAR', 'desativar', 'opt_out', 'notifications', 'Notificacoes desativadas com sucesso.', 'pt-BR'),
  ('NAO', 'nao', 'opt_out', 'data_collection', 'Entendido. Nenhum dado sera coletado.', 'pt-BR'),

  -- English opt-in keywords
  ('ACCEPT', 'accept', 'opt_in', 'data_collection', 'Thank you! Your consent has been recorded. Send STOP to revoke.', 'en'),
  ('YES', 'yes', 'opt_in', 'data_collection', 'Consent recorded. Send STOP to opt out.', 'en'),

  -- English opt-out keywords
  ('STOP', 'stop', 'opt_out', 'data_collection', 'Your consent has been revoked. Data will be deleted within 72 hours per LGPD.', 'en'),
  ('CANCEL', 'cancel', 'opt_out', 'data_collection', 'Consent revoked. Your data will be removed.', 'en'),
  ('NO', 'no', 'opt_out', 'data_collection', 'Understood. No data will be collected.', 'en')
ON CONFLICT (keyword_normalized, language) DO NOTHING;

-- Index for keyword lookup
CREATE INDEX IF NOT EXISTS idx_opt_keywords_lookup
  ON whatsapp_opt_keywords(keyword_normalized, language, is_active);

-- ============================================================================
-- TABLE: data_deletion_requests
-- ============================================================================
-- Tracks LGPD data deletion requests

CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Requester
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_phone TEXT,  -- If deletion is for a specific contact

  -- Request details
  request_type TEXT NOT NULL CHECK (request_type IN (
    'full_deletion',  -- Delete all data
    'partial_deletion',  -- Delete specific data types
    'anonymization',  -- Anonymize instead of delete
    'export'  -- Export before deletion
  )),

  data_types_requested TEXT[],  -- e.g., ['messages', 'media', 'analytics']

  -- Processing
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'processing',
    'completed',
    'failed',
    'cancelled'
  )),

  -- Execution details
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '72 hours'),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,

  -- What was deleted
  deletion_summary JSONB,  -- e.g., {"messages": 150, "media_files": 25, "bytes_freed": 52428800}

  -- Audit
  requested_via TEXT NOT NULL CHECK (requested_via IN ('whatsapp', 'web', 'api', 'support')),
  request_ip TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deletion_requests_user
  ON data_deletion_requests(user_id, status);

CREATE INDEX IF NOT EXISTS idx_deletion_requests_pending
  ON data_deletion_requests(scheduled_for)
  WHERE status = 'pending';

-- RLS
ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deletion requests"
  ON data_deletion_requests
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create deletion requests"
  ON data_deletion_requests
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- FUNCTION: Check consent status
-- ============================================================================

CREATE OR REPLACE FUNCTION check_whatsapp_consent(
  p_user_id UUID,
  p_contact_phone TEXT,
  p_consent_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  consent_status TEXT;
BEGIN
  SELECT status INTO consent_status
  FROM whatsapp_consent_records
  WHERE user_id = p_user_id
    AND contact_phone = p_contact_phone
    AND consent_type = p_consent_type
    AND (expires_at IS NULL OR expires_at > now());

  RETURN COALESCE(consent_status = 'granted', false);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Record consent from keyword
-- ============================================================================

CREATE OR REPLACE FUNCTION process_consent_keyword(
  p_user_id UUID,
  p_contact_phone TEXT,
  p_message TEXT,
  p_language TEXT DEFAULT 'pt-BR'
)
RETURNS TABLE(
  matched BOOLEAN,
  action TEXT,
  consent_type TEXT,
  response_message TEXT
) AS $$
DECLARE
  keyword_record RECORD;
  normalized_message TEXT;
BEGIN
  -- Normalize message
  normalized_message := lower(trim(p_message));

  -- Look for matching keyword
  SELECT * INTO keyword_record
  FROM whatsapp_opt_keywords
  WHERE keyword_normalized = normalized_message
    AND (language = p_language OR language = 'pt-BR')
    AND is_active = true
  LIMIT 1;

  IF keyword_record IS NULL THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Process the consent
  IF keyword_record.action = 'opt_in' THEN
    INSERT INTO whatsapp_consent_records (
      user_id, contact_phone, consent_type, status,
      consent_method, consent_message, legal_basis, granted_at
    )
    VALUES (
      p_user_id, p_contact_phone, keyword_record.consent_type, 'granted',
      'whatsapp_keyword', p_message, 'consent', now()
    )
    ON CONFLICT (user_id, contact_phone, consent_type) DO UPDATE SET
      status = 'granted',
      granted_at = now(),
      revoked_at = NULL,
      consent_message = p_message,
      updated_at = now();
  ELSE
    UPDATE whatsapp_consent_records
    SET status = 'revoked',
        revoked_at = now(),
        updated_at = now()
    WHERE user_id = p_user_id
      AND contact_phone = p_contact_phone
      AND consent_type = keyword_record.consent_type;

    -- Also create deletion request for data_collection opt-out
    IF keyword_record.consent_type = 'data_collection' THEN
      INSERT INTO data_deletion_requests (
        user_id, contact_phone, request_type, data_types_requested, requested_via
      )
      VALUES (
        p_user_id, p_contact_phone, 'partial_deletion',
        ARRAY['messages', 'media'], 'whatsapp'
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN QUERY SELECT
    true,
    keyword_record.action,
    keyword_record.consent_type,
    keyword_record.response_message;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Execute data deletion
-- ============================================================================

CREATE OR REPLACE FUNCTION execute_data_deletion(p_request_id UUID)
RETURNS JSONB AS $$
DECLARE
  req RECORD;
  deleted_counts JSONB := '{}';
  msg_count INTEGER;
  media_count INTEGER;
BEGIN
  SELECT * INTO req FROM data_deletion_requests WHERE id = p_request_id;

  IF req IS NULL THEN
    RAISE EXCEPTION 'Deletion request not found';
  END IF;

  IF req.status != 'pending' THEN
    RAISE EXCEPTION 'Request is not in pending status';
  END IF;

  -- Update status
  UPDATE data_deletion_requests
  SET status = 'processing', started_at = now(), updated_at = now()
  WHERE id = p_request_id;

  -- Delete messages
  IF req.contact_phone IS NOT NULL THEN
    -- Delete specific contact's data
    UPDATE whatsapp_messages
    SET deleted_at = now(), deletion_reason = 'lgpd_request'
    WHERE user_id = req.user_id AND contact_phone = req.contact_phone;

    GET DIAGNOSTICS msg_count = ROW_COUNT;
  ELSE
    -- Delete all user's data
    UPDATE whatsapp_messages
    SET deleted_at = now(), deletion_reason = 'lgpd_request'
    WHERE user_id = req.user_id;

    GET DIAGNOSTICS msg_count = ROW_COUNT;
  END IF;

  deleted_counts := jsonb_build_object('messages', msg_count);

  -- Update completion
  UPDATE data_deletion_requests
  SET status = 'completed',
      completed_at = now(),
      deletion_summary = deleted_counts,
      updated_at = now()
  WHERE id = p_request_id;

  RETURN deleted_counts;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CRON JOB: Process pending deletion requests
-- ============================================================================

SELECT cron.schedule(
  'process-lgpd-deletion-requests',
  '0 */6 * * *',  -- Every 6 hours
  $$
  SELECT execute_data_deletion(id)
  FROM data_deletion_requests
  WHERE status = 'pending'
    AND scheduled_for <= now()
  LIMIT 10
  $$
);

-- ============================================================================
-- CRON JOB: Expire old consent records
-- ============================================================================

SELECT cron.schedule(
  'expire-whatsapp-consent',
  '0 3 * * *',  -- Daily at 3 AM
  $$
  UPDATE whatsapp_consent_records
  SET status = 'revoked',
      revoked_at = now(),
      updated_at = now()
  WHERE expires_at IS NOT NULL
    AND expires_at < now()
    AND status = 'granted'
  $$
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE whatsapp_consent_records IS 'LGPD compliant consent tracking for WhatsApp data processing';
COMMENT ON TABLE whatsapp_opt_keywords IS 'Keywords for opt-in/opt-out via WhatsApp messages';
COMMENT ON TABLE data_deletion_requests IS 'LGPD right to erasure request tracking';

COMMENT ON FUNCTION check_whatsapp_consent IS 'Check if user has valid consent for specific data processing';
COMMENT ON FUNCTION process_consent_keyword IS 'Process opt-in/opt-out keywords from WhatsApp messages';
COMMENT ON FUNCTION execute_data_deletion IS 'Execute LGPD data deletion request';
