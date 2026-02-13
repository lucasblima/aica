-- ============================================================================
-- Migration: Email Import Support
-- Description: Extends whatsapp_file_imports for email import channel
--              and creates audit log for received emails.
-- Phase 3 of Evolution API removal plan.
-- ============================================================================

-- 1. Extend whatsapp_file_imports with source tracking
ALTER TABLE public.whatsapp_file_imports
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web_upload'
    CHECK (source IN ('web_upload', 'email_import')),
  ADD COLUMN IF NOT EXISTS sender_email TEXT,
  ADD COLUMN IF NOT EXISTS email_message_id TEXT;

COMMENT ON COLUMN public.whatsapp_file_imports.source IS 'How the file was imported: web_upload (drag-and-drop) or email_import (via import@import.aica.guru)';
COMMENT ON COLUMN public.whatsapp_file_imports.sender_email IS 'Email address that sent the import (only for email_import source)';
COMMENT ON COLUMN public.whatsapp_file_imports.email_message_id IS 'Resend message ID for email imports (for audit trail)';

-- 2. Email import audit log
CREATE TABLE IF NOT EXISTS public.email_import_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_message_id TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  resolved_user_id UUID REFERENCES auth.users(id),
  subject TEXT,
  attachment_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'received'
    CHECK (status IN ('received', 'processing', 'completed', 'rejected', 'failed')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.email_import_log ENABLE ROW LEVEL SECURITY;

-- Users can read their own email import logs
CREATE POLICY "Users can view own email import logs"
  ON public.email_import_log FOR SELECT
  USING (resolved_user_id = auth.uid());

-- Service role can insert/update (Edge Function uses service role)
CREATE POLICY "Service role can manage email import logs"
  ON public.email_import_log FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for lookup by sender email
CREATE INDEX IF NOT EXISTS idx_email_import_log_sender
  ON public.email_import_log (sender_email);

-- Index for lookup by status
CREATE INDEX IF NOT EXISTS idx_email_import_log_status
  ON public.email_import_log (status)
  WHERE status IN ('received', 'processing');

-- 3. Rate limiting: count imports per user per day
CREATE OR REPLACE FUNCTION public.count_user_email_imports_today(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(COUNT(*)::INTEGER, 0)
  FROM public.email_import_log
  WHERE resolved_user_id = p_user_id
    AND created_at >= CURRENT_DATE
    AND status != 'rejected';
$$;

GRANT EXECUTE ON FUNCTION public.count_user_email_imports_today(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_user_email_imports_today(UUID) TO service_role;
