-- Migration: PAR-Q+ (Physical Activity Readiness Questionnaire) System
-- Description: Complete PAR-Q+ system for fitness coaching app — tables, storage,
--   RLS policies, RPCs, triggers, and indexes.
-- Author: Claude Opus 4.6
-- Date: 2026-02-16
-- Depends on:
--   - 20260212162507_flow_module_complete.sql (athletes table)
--   - 20260215000000_athlete_user_linking.sql (auth_user_id column)
--   - 20260213110000_add_athlete_health_config.sql (allow_parq_onboarding column)

-- ==============================================
-- 1. TABLE: parq_responses
-- ==============================================
-- Stores PAR-Q+ questionnaire responses. Each row is one filled-out questionnaire.
-- Supports versioning, digital signature, 12-month validity, and superseding history.

CREATE TABLE IF NOT EXISTS public.parq_responses (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id               UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  filled_by                UUID NOT NULL REFERENCES auth.users(id),
  filled_by_role           TEXT NOT NULL CHECK (filled_by_role IN ('athlete', 'coach')),
  version                  TEXT NOT NULL DEFAULT '2024-parq-plus',

  -- Page 1: 7 classic PAR-Q questions (boolean)
  q1_cardiac_condition     BOOLEAN NOT NULL DEFAULT false,
  q2_chest_pain_activity   BOOLEAN NOT NULL DEFAULT false,
  q3_chest_pain_rest       BOOLEAN NOT NULL DEFAULT false,
  q4_dizziness_balance     BOOLEAN NOT NULL DEFAULT false,
  q5_bone_joint_problem    BOOLEAN NOT NULL DEFAULT false,
  q6_blood_pressure_meds   BOOLEAN NOT NULL DEFAULT false,
  q7_other_physical_reason BOOLEAN NOT NULL DEFAULT false,

  -- Pages 2-3: Follow-up answers (flexible JSONB for variable follow-ups)
  followup_answers         JSONB,

  -- Risk assessment result
  risk_level               TEXT NOT NULL CHECK (risk_level IN ('low', 'intermediate', 'high')),
  clearance_status         TEXT NOT NULL CHECK (clearance_status IN ('cleared', 'cleared_with_restrictions', 'blocked')),
  restrictions             TEXT[],

  -- Digital signature
  signed_at                TIMESTAMPTZ,
  signature_text           TEXT,

  -- Validity (12 months from creation)
  expires_at               TIMESTAMPTZ NOT NULL,
  superseded_by            UUID REFERENCES public.parq_responses(id),

  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.parq_responses IS 'PAR-Q+ questionnaire responses. Each row = one completed questionnaire for an athlete.';

-- ==============================================
-- 2. TABLE: athlete_documents
-- ==============================================
-- Stores metadata for medical documents (atestados, exames, laudos, etc.)
-- linked to athletes. Actual files live in the medical-documents storage bucket.

CREATE TABLE IF NOT EXISTS public.athlete_documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id        UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  uploaded_by       UUID NOT NULL REFERENCES auth.users(id),
  parq_response_id  UUID REFERENCES public.parq_responses(id),

  document_type     TEXT NOT NULL CHECK (document_type IN (
    'atestado_medico', 'exame_cardiologico', 'laudo_medico',
    'exame_laboratorial', 'receita_medica', 'liberacao_atividade', 'outros'
  )),
  title             TEXT NOT NULL,
  description       TEXT,

  -- Storage reference
  storage_path      TEXT NOT NULL,
  file_name         TEXT NOT NULL,
  file_size_bytes   BIGINT NOT NULL,
  mime_type         TEXT NOT NULL,

  -- Document validity
  issued_at         DATE,
  expires_at        DATE,

  -- Coach review workflow
  reviewed_by       UUID REFERENCES auth.users(id),
  reviewed_at       TIMESTAMPTZ,
  review_status     TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected')),
  review_notes      TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.athlete_documents IS 'Medical document metadata for athletes. Files stored in medical-documents bucket.';

-- ==============================================
-- 3. ADD parq_clearance_status TO athletes
-- ==============================================

ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS parq_clearance_status TEXT
    DEFAULT 'pending'
    CHECK (parq_clearance_status IN ('pending', 'cleared', 'cleared_with_restrictions', 'blocked', 'expired'));

COMMENT ON COLUMN public.athletes.parq_clearance_status IS
  'Derived clearance status from latest PAR-Q response and document reviews. Updated by trigger.';

-- ==============================================
-- 4. STORAGE BUCKET: medical-documents
-- ==============================================
-- Private bucket for medical documents (atestados, exames, etc.)
-- 20MB file size limit. Common medical file types allowed.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical-documents',
  'medical-documents',
  false,  -- Private bucket
  20971520,  -- 20MB limit
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/heic'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

-- ==============================================
-- 5. HELPER FUNCTION: is_athlete_or_coach
-- ==============================================
-- Returns true if the current authenticated user is either:
--   a) the athlete themselves (athletes.auth_user_id = auth.uid())
--   b) the coach who manages this athlete (athletes.user_id = auth.uid())

CREATE OR REPLACE FUNCTION public.is_athlete_or_coach(p_athlete_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.athletes a
    WHERE a.id = p_athlete_id
      AND (
        a.user_id = auth.uid()          -- Coach owns this athlete
        OR a.auth_user_id = auth.uid()  -- Athlete's own account
      )
  );
$$;

COMMENT ON FUNCTION public.is_athlete_or_coach(UUID) IS
  'Check if current user is the athlete or their coach. Used by RLS policies.';

-- ==============================================
-- 6. RLS POLICIES: parq_responses
-- ==============================================

ALTER TABLE public.parq_responses ENABLE ROW LEVEL SECURITY;

-- Athletes can read their own PAR-Q responses
CREATE POLICY "parq_athlete_select" ON public.parq_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = parq_responses.athlete_id
        AND a.auth_user_id = auth.uid()
    )
  );

-- Athletes can insert their own PAR-Q responses
CREATE POLICY "parq_athlete_insert" ON public.parq_responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = parq_responses.athlete_id
        AND a.auth_user_id = auth.uid()
    )
    AND filled_by = auth.uid()
    AND filled_by_role = 'athlete'
  );

-- Coaches can read PAR-Q responses for their athletes
CREATE POLICY "parq_coach_select" ON public.parq_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = parq_responses.athlete_id
        AND a.user_id = auth.uid()
    )
  );

-- Coaches can insert PAR-Q responses for their athletes
CREATE POLICY "parq_coach_insert" ON public.parq_responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = parq_responses.athlete_id
        AND a.user_id = auth.uid()
    )
    AND filled_by = auth.uid()
    AND filled_by_role = 'coach'
  );

-- Coaches can update PAR-Q responses for their athletes (e.g., add restrictions)
CREATE POLICY "parq_coach_update" ON public.parq_responses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = parq_responses.athlete_id
        AND a.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = parq_responses.athlete_id
        AND a.user_id = auth.uid()
    )
  );

-- Service role full access
CREATE POLICY "parq_service_role_full" ON public.parq_responses
  FOR ALL USING (auth.role() = 'service_role');

-- ==============================================
-- 7. RLS POLICIES: athlete_documents
-- ==============================================

ALTER TABLE public.athlete_documents ENABLE ROW LEVEL SECURITY;

-- Athletes can read their own documents
CREATE POLICY "docs_athlete_select" ON public.athlete_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = athlete_documents.athlete_id
        AND a.auth_user_id = auth.uid()
    )
  );

-- Athletes can upload their own documents
CREATE POLICY "docs_athlete_insert" ON public.athlete_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = athlete_documents.athlete_id
        AND a.auth_user_id = auth.uid()
    )
    AND uploaded_by = auth.uid()
  );

-- Coaches can read documents for their athletes
CREATE POLICY "docs_coach_select" ON public.athlete_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = athlete_documents.athlete_id
        AND a.user_id = auth.uid()
    )
  );

-- Coaches can upload documents for their athletes
CREATE POLICY "docs_coach_insert" ON public.athlete_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = athlete_documents.athlete_id
        AND a.user_id = auth.uid()
    )
    AND uploaded_by = auth.uid()
  );

-- Coaches can update documents for their athletes (review workflow)
CREATE POLICY "docs_coach_update" ON public.athlete_documents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = athlete_documents.athlete_id
        AND a.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = athlete_documents.athlete_id
        AND a.user_id = auth.uid()
    )
  );

-- Service role full access
CREATE POLICY "docs_service_role_full" ON public.athlete_documents
  FOR ALL USING (auth.role() = 'service_role');

-- ==============================================
-- 8. STORAGE RLS POLICIES: medical-documents
-- ==============================================
-- Path pattern: {user_id}/medical/{athlete_id}/{file}
-- Both coach (user_id) and athlete (auth_user_id) can access via is_athlete_or_coach()

-- Drop existing policies to avoid conflicts on re-run
DROP POLICY IF EXISTS "medical_docs_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "medical_docs_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "medical_docs_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "medical_docs_delete_policy" ON storage.objects;

-- SELECT: Coach or athlete can read medical docs
CREATE POLICY "medical_docs_select_policy"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'medical-documents'
  AND public.is_athlete_or_coach(
    ((storage.foldername(name))[3])::UUID  -- Extract athlete_id from path
  )
);

-- INSERT: Coach or athlete can upload medical docs
CREATE POLICY "medical_docs_insert_policy"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'medical-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text  -- First folder = uploader's user_id
  AND (storage.foldername(name))[2] = 'medical'          -- Second folder = 'medical'
  AND public.is_athlete_or_coach(
    ((storage.foldername(name))[3])::UUID  -- Third folder = athlete_id
  )
);

-- UPDATE: Coach or athlete can update medical docs
CREATE POLICY "medical_docs_update_policy"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'medical-documents'
  AND public.is_athlete_or_coach(
    ((storage.foldername(name))[3])::UUID
  )
)
WITH CHECK (
  bucket_id = 'medical-documents'
  AND public.is_athlete_or_coach(
    ((storage.foldername(name))[3])::UUID
  )
);

-- DELETE: Coach or athlete can delete medical docs
CREATE POLICY "medical_docs_delete_policy"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'medical-documents'
  AND public.is_athlete_or_coach(
    ((storage.foldername(name))[3])::UUID
  )
);

-- ==============================================
-- 9. RPC: get_parq_status(p_athlete_id)
-- ==============================================
-- Returns current PAR-Q status for an athlete.
-- SECURITY DEFINER so both athlete and coach can call it regardless of RLS.

CREATE OR REPLACE FUNCTION public.get_parq_status(p_athlete_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_latest RECORD;
  v_has_clearance_doc BOOLEAN;
BEGIN
  -- Verify caller is the athlete or coach
  IF NOT public.is_athlete_or_coach(p_athlete_id) THEN
    RAISE EXCEPTION 'Access denied: not athlete or coach for this athlete';
  END IF;

  -- Get latest PAR-Q response (not superseded)
  SELECT
    pr.id,
    pr.clearance_status,
    pr.risk_level,
    pr.expires_at,
    pr.expires_at < now() AS is_expired,
    pr.restrictions,
    pr.signed_at,
    pr.created_at
  INTO v_latest
  FROM public.parq_responses pr
  WHERE pr.athlete_id = p_athlete_id
    AND pr.superseded_by IS NULL
  ORDER BY pr.created_at DESC
  LIMIT 1;

  -- Check for approved clearance document
  SELECT EXISTS (
    SELECT 1
    FROM public.athlete_documents ad
    WHERE ad.athlete_id = p_athlete_id
      AND ad.document_type IN ('liberacao_atividade', 'atestado_medico', 'laudo_medico')
      AND ad.review_status = 'approved'
      AND (ad.expires_at IS NULL OR ad.expires_at >= CURRENT_DATE)
  ) INTO v_has_clearance_doc;

  v_result := jsonb_build_object(
    'has_parq', v_latest.id IS NOT NULL,
    'clearance_status', COALESCE(v_latest.clearance_status, 'pending'),
    'risk_level', v_latest.risk_level,
    'expires_at', v_latest.expires_at,
    'is_expired', COALESCE(v_latest.is_expired, false),
    'has_clearance_document', v_has_clearance_doc,
    'restrictions', v_latest.restrictions,
    'signed_at', v_latest.signed_at,
    'parq_response_id', v_latest.id
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_parq_status(UUID) IS
  'Get current PAR-Q status for an athlete. Returns JSON with clearance info.';

-- ==============================================
-- 10. RPC: check_workout_clearance(p_athlete_id)
-- ==============================================
-- Determines whether an athlete is cleared to train.
-- Business rules:
--   - If allow_parq_onboarding = false -> always cleared (PAR-Q not required by coach)
--   - If no PAR-Q response -> blocked
--   - If PAR-Q expired -> blocked
--   - If clearance_status = 'blocked' AND no approved clearance document -> blocked
--   - If clearance_status = 'cleared_with_restrictions' -> cleared with restrictions
--   - Otherwise -> cleared

CREATE OR REPLACE FUNCTION public.check_workout_clearance(p_athlete_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_athlete RECORD;
  v_parq RECORD;
  v_has_approved_doc BOOLEAN;
  v_missing_docs TEXT[] := '{}';
BEGIN
  -- Verify caller is the athlete or coach
  IF NOT public.is_athlete_or_coach(p_athlete_id) THEN
    RAISE EXCEPTION 'Access denied: not athlete or coach for this athlete';
  END IF;

  -- Get athlete config
  SELECT
    a.allow_parq_onboarding,
    a.requires_cardio_exam,
    a.requires_clearance_cert,
    a.parq_clearance_status
  INTO v_athlete
  FROM public.athletes a
  WHERE a.id = p_athlete_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'cleared', false,
      'reason', 'Atleta nao encontrado',
      'parq_status', 'unknown',
      'missing_documents', '{}'::TEXT[]
    );
  END IF;

  -- If PAR-Q onboarding is disabled by coach -> always cleared
  IF COALESCE(v_athlete.allow_parq_onboarding, false) = false THEN
    RETURN jsonb_build_object(
      'cleared', true,
      'reason', 'PAR-Q nao obrigatorio',
      'parq_status', 'not_required',
      'missing_documents', '{}'::TEXT[]
    );
  END IF;

  -- Get latest non-superseded PAR-Q response
  SELECT
    pr.clearance_status,
    pr.risk_level,
    pr.expires_at,
    pr.restrictions,
    pr.expires_at < now() AS is_expired
  INTO v_parq
  FROM public.parq_responses pr
  WHERE pr.athlete_id = p_athlete_id
    AND pr.superseded_by IS NULL
  ORDER BY pr.created_at DESC
  LIMIT 1;

  -- No PAR-Q response at all
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'cleared', false,
      'reason', 'PAR-Q nao preenchido',
      'parq_status', 'missing',
      'missing_documents', ARRAY['parq_response']
    );
  END IF;

  -- PAR-Q expired
  IF v_parq.is_expired THEN
    RETURN jsonb_build_object(
      'cleared', false,
      'reason', 'PAR-Q expirado',
      'parq_status', 'expired',
      'missing_documents', ARRAY['parq_response']
    );
  END IF;

  -- Check for approved clearance document
  SELECT EXISTS (
    SELECT 1
    FROM public.athlete_documents ad
    WHERE ad.athlete_id = p_athlete_id
      AND ad.document_type IN ('liberacao_atividade', 'atestado_medico', 'laudo_medico')
      AND ad.review_status = 'approved'
      AND (ad.expires_at IS NULL OR ad.expires_at >= CURRENT_DATE)
  ) INTO v_has_approved_doc;

  -- Build missing_documents list based on coach requirements
  IF COALESCE(v_athlete.requires_cardio_exam, false) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.athlete_documents ad
      WHERE ad.athlete_id = p_athlete_id
        AND ad.document_type = 'exame_cardiologico'
        AND ad.review_status = 'approved'
        AND (ad.expires_at IS NULL OR ad.expires_at >= CURRENT_DATE)
    ) THEN
      v_missing_docs := array_append(v_missing_docs, 'exame_cardiologico');
    END IF;
  END IF;

  IF COALESCE(v_athlete.requires_clearance_cert, false) THEN
    IF NOT v_has_approved_doc THEN
      v_missing_docs := array_append(v_missing_docs, 'liberacao_atividade');
    END IF;
  END IF;

  -- Blocked and no approved clearance document
  IF v_parq.clearance_status = 'blocked' AND NOT v_has_approved_doc THEN
    RETURN jsonb_build_object(
      'cleared', false,
      'reason', 'Atestado medico pendente',
      'parq_status', 'blocked',
      'missing_documents', array_cat(v_missing_docs, ARRAY['atestado_medico'])
    );
  END IF;

  -- Cleared with restrictions
  IF v_parq.clearance_status = 'cleared_with_restrictions' THEN
    RETURN jsonb_build_object(
      'cleared', true,
      'reason', 'Liberado com restricoes',
      'parq_status', 'cleared_with_restrictions',
      'restrictions', COALESCE(v_parq.restrictions, '{}'::TEXT[]),
      'missing_documents', v_missing_docs
    );
  END IF;

  -- Fully cleared
  RETURN jsonb_build_object(
    'cleared', true,
    'reason', 'Liberado para atividades',
    'parq_status', 'cleared',
    'missing_documents', v_missing_docs
  );
END;
$$;

COMMENT ON FUNCTION public.check_workout_clearance(UUID) IS
  'Check if athlete is cleared to train. Returns cleared status, reason, and missing documents.';

-- ==============================================
-- 11. RPC: get_my_parq_history()
-- ==============================================
-- Returns all PAR-Q responses for the currently logged-in athlete.
-- Uses auth_user_id to identify the athlete.

CREATE OR REPLACE FUNCTION public.get_my_parq_history()
RETURNS SETOF public.parq_responses
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
    SELECT pr.*
    FROM public.parq_responses pr
    INNER JOIN public.athletes a ON a.id = pr.athlete_id
    WHERE a.auth_user_id = auth.uid()
    ORDER BY pr.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_my_parq_history() IS
  'Get all PAR-Q responses for the logged-in athlete (via auth_user_id). Ordered by newest first.';

-- ==============================================
-- 12. TRIGGER FUNCTION: sync_parq_clearance_status
-- ==============================================
-- Syncs athletes.parq_clearance_status based on:
--   - New PAR-Q response inserted -> set to response clearance_status
--   - Document review approved for a blocked athlete -> upgrade to cleared_with_restrictions
--   - Check expiration

CREATE OR REPLACE FUNCTION public.sync_parq_clearance_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_athlete_id UUID;
  v_new_status TEXT;
  v_latest_parq RECORD;
  v_has_approved_doc BOOLEAN;
BEGIN
  -- Determine athlete_id based on which table triggered
  IF TG_TABLE_NAME = 'parq_responses' THEN
    v_athlete_id := NEW.athlete_id;

    -- Set status directly from the new PAR-Q response
    v_new_status := NEW.clearance_status;

    -- Check if PAR-Q is already expired at creation (edge case)
    IF NEW.expires_at < now() THEN
      v_new_status := 'expired';
    END IF;

    UPDATE public.athletes
    SET parq_clearance_status = v_new_status,
        updated_at = now()
    WHERE id = v_athlete_id;

    RETURN NEW;

  ELSIF TG_TABLE_NAME = 'athlete_documents' THEN
    v_athlete_id := NEW.athlete_id;

    -- Only act when review_status changes to 'approved'
    IF NEW.review_status = 'approved' AND (OLD.review_status IS DISTINCT FROM 'approved') THEN

      -- Get current PAR-Q clearance status
      SELECT pr.clearance_status, pr.expires_at
      INTO v_latest_parq
      FROM public.parq_responses pr
      WHERE pr.athlete_id = v_athlete_id
        AND pr.superseded_by IS NULL
      ORDER BY pr.created_at DESC
      LIMIT 1;

      -- If PAR-Q is expired, mark as expired regardless of document
      IF v_latest_parq IS NOT NULL AND v_latest_parq.expires_at < now() THEN
        UPDATE public.athletes
        SET parq_clearance_status = 'expired',
            updated_at = now()
        WHERE id = v_athlete_id;
        RETURN NEW;
      END IF;

      -- If athlete was blocked and now has an approved clearance document,
      -- upgrade to cleared_with_restrictions
      IF v_latest_parq.clearance_status = 'blocked' THEN
        SELECT EXISTS (
          SELECT 1
          FROM public.athlete_documents ad
          WHERE ad.athlete_id = v_athlete_id
            AND ad.document_type IN ('liberacao_atividade', 'atestado_medico', 'laudo_medico')
            AND ad.review_status = 'approved'
            AND (ad.expires_at IS NULL OR ad.expires_at >= CURRENT_DATE)
        ) INTO v_has_approved_doc;

        IF v_has_approved_doc THEN
          UPDATE public.athletes
          SET parq_clearance_status = 'cleared_with_restrictions',
              updated_at = now()
          WHERE id = v_athlete_id;
        END IF;
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_parq_clearance_status() IS
  'Trigger function to sync athletes.parq_clearance_status when PAR-Q responses or documents change.';

-- Apply trigger on parq_responses (AFTER INSERT)
DROP TRIGGER IF EXISTS trg_sync_parq_on_response ON public.parq_responses;
CREATE TRIGGER trg_sync_parq_on_response
  AFTER INSERT ON public.parq_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_parq_clearance_status();

-- Apply trigger on athlete_documents (AFTER UPDATE of review_status)
DROP TRIGGER IF EXISTS trg_sync_parq_on_document_review ON public.athlete_documents;
CREATE TRIGGER trg_sync_parq_on_document_review
  AFTER UPDATE OF review_status ON public.athlete_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_parq_clearance_status();

-- ==============================================
-- 13. INDEXES
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_parq_responses_athlete
  ON public.parq_responses(athlete_id);

CREATE INDEX IF NOT EXISTS idx_parq_responses_expires
  ON public.parq_responses(expires_at);

-- Index for finding latest non-superseded PAR-Q per athlete
CREATE INDEX IF NOT EXISTS idx_parq_responses_active
  ON public.parq_responses(athlete_id, created_at DESC)
  WHERE superseded_by IS NULL;

CREATE INDEX IF NOT EXISTS idx_athlete_documents_athlete
  ON public.athlete_documents(athlete_id);

CREATE INDEX IF NOT EXISTS idx_athlete_documents_review
  ON public.athlete_documents(review_status);

-- Composite index for clearance document lookups
CREATE INDEX IF NOT EXISTS idx_athlete_documents_clearance
  ON public.athlete_documents(athlete_id, document_type, review_status)
  WHERE review_status = 'approved';

-- ==============================================
-- 14. UPDATED_AT TRIGGER
-- ==============================================
-- Reuse existing update_updated_at_column() function (already defined in prior migrations).
-- Apply to both new tables.

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_parq_responses_updated_at ON public.parq_responses;
CREATE TRIGGER update_parq_responses_updated_at
  BEFORE UPDATE ON public.parq_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_athlete_documents_updated_at ON public.athlete_documents;
CREATE TRIGGER update_athlete_documents_updated_at
  BEFORE UPDATE ON public.athlete_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================
-- 15. VERIFICATION QUERIES (commented out)
-- ==============================================

-- Verify tables created:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name IN ('parq_responses', 'athlete_documents');

-- Verify RLS enabled:
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public' AND tablename IN ('parq_responses', 'athlete_documents');

-- Verify RPCs exist:
-- SELECT routine_name FROM information_schema.routines
-- WHERE routine_schema = 'public'
--   AND routine_name IN ('get_parq_status', 'check_workout_clearance', 'get_my_parq_history',
--                        'is_athlete_or_coach', 'sync_parq_clearance_status');

-- Verify storage bucket:
-- SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'medical-documents';

-- Verify athletes column added:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'athletes' AND column_name = 'parq_clearance_status';

-- ==============================================
-- 16. UPDATE RPC: get_my_athlete_profile()
-- ==============================================
-- Add PAR-Q fields to the athlete portal RPC so the frontend can gate on them.

CREATE OR REPLACE FUNCTION public.get_my_athlete_profile()
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'athlete_id', a.id,
    'athlete_name', a.name,
    'coach_name', COALESCE(
      (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = a.user_id),
      'Coach'
    ),
    'modality', a.modality,
    'level', a.level,
    'status', a.status,
    'allow_parq_onboarding', COALESCE(a.allow_parq_onboarding, false),
    'parq_clearance_status', a.parq_clearance_status,
    'active_microcycle', (
      SELECT json_build_object(
        'id', m.id,
        'name', m.name,
        'status', m.status,
        'start_date', m.start_date,
        'current_week', GREATEST(1, LEAST(3,
          EXTRACT(WEEK FROM NOW()) - EXTRACT(WEEK FROM m.start_date) + 1
        )),
        'total_slots', (SELECT COUNT(*) FROM public.workout_slots ws WHERE ws.microcycle_id = m.id),
        'completed_slots', (SELECT COUNT(*) FROM public.workout_slots ws WHERE ws.microcycle_id = m.id AND ws.is_completed = true),
        'slots', (
          SELECT json_agg(
            json_build_object(
              'id', ws.id,
              'day_of_week', ws.day_of_week,
              'week_number', ws.week_number,
              'time_of_day', ws.time_of_day,
              'is_completed', ws.is_completed,
              'completed_at', ws.completed_at,
              'athlete_feedback', ws.athlete_feedback,
              'custom_duration', ws.custom_duration,
              'custom_notes', ws.custom_notes,
              'template', json_build_object(
                'id', wt.id,
                'name', wt.name,
                'category', wt.category,
                'duration', wt.duration,
                'intensity', wt.intensity
              )
            )
            ORDER BY ws.week_number, ws.day_of_week
          )
          FROM public.workout_slots ws
          LEFT JOIN public.workout_templates wt ON wt.id = ws.template_id
          WHERE ws.microcycle_id = m.id
        )
      )
      FROM public.microcycles m
      WHERE m.athlete_id = a.id
        AND m.status IN ('active', 'draft')
      ORDER BY m.created_at DESC
      LIMIT 1
    )
  ) INTO v_result
  FROM public.athletes a
  WHERE a.auth_user_id = auth.uid()
  LIMIT 1;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_my_athlete_profile() TO authenticated;
-- Grant RPCs
GRANT EXECUTE ON FUNCTION public.get_parq_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_workout_clearance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_parq_history() TO authenticated;
