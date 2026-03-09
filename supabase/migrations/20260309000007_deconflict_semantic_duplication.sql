-- =============================================================================
-- Migration: Deconflict semantic duplication in podcast_episodes
-- Sprint 3, Task 3.3: Mark deprecated columns, create unified guest info view
-- Created: 2026-03-09
--
-- Problem: podcast_episodes has `biography` and `ice_breakers` columns that
-- duplicate data that also lives in:
--   - podcast_guest_research.biography (authoritative source for guest bio)
--   - podcast_generated_pautas.ice_breakers (authoritative source for ice breakers)
--
-- Strategy: Mark the podcast_episodes columns as DEPRECATED via SQL comments.
-- Do NOT drop them (backward compat). Create a VIEW that joins the authoritative
-- sources for clean consumption by new code.
-- =============================================================================

-- ============================================================================
-- 1. DEPRECATION COMMENTS on podcast_episodes columns
-- ============================================================================

COMMENT ON COLUMN public.podcast_episodes.biography IS
  'DEPRECATED: Use podcast_guest_research.biography instead. This column exists for backward compatibility and will be removed in a future migration.';

COMMENT ON COLUMN public.podcast_episodes.ice_breakers IS
  'DEPRECATED: Use podcast_generated_pautas.ice_breakers instead. This column exists for backward compatibility and will be removed in a future migration.';

-- Also mark controversies as deprecated (same duplication pattern)
COMMENT ON COLUMN public.podcast_episodes.controversies IS
  'DEPRECATED: Use podcast_guest_research.controversies instead. This column exists for backward compatibility and will be removed in a future migration.';

-- ============================================================================
-- 2. CREATE VIEW v_episode_guest_info
-- ============================================================================
-- Unified view that joins podcast_episodes with podcast_guest_research and
-- the active podcast_generated_pautas to provide a clean, single-source view
-- of guest information per episode.
--
-- Usage: SELECT * FROM v_episode_guest_info WHERE user_id = auth.uid();
-- The view inherits RLS from the underlying tables.

CREATE OR REPLACE VIEW public.v_episode_guest_info AS
SELECT
  -- Episode identity
  pe.id AS episode_id,
  pe.user_id,
  pe.show_id,
  pe.title AS episode_title,
  pe.status AS episode_status,

  -- Guest basics (from episode)
  pe.guest_name,
  pe.guest_title,
  pe.guest_contact,
  pe.guest_bio,
  pe.guest_reference,

  -- Guest research (authoritative source for biography/controversies)
  gr.id AS research_id,
  gr.biography,
  gr.bio_summary,
  gr.full_name AS research_full_name,
  gr.occupation AS research_occupation,
  gr.known_for AS research_known_for,
  gr.controversies,
  gr.recent_news,
  gr.social_media,
  gr.profile_confidence_score,
  gr.research_quality_score,
  gr.low_context_warning,

  -- Pauta (authoritative source for ice_breakers)
  gp.id AS pauta_id,
  gp.ice_breakers,
  gp.theme AS pauta_theme,
  gp.research_summary AS pauta_research_summary,
  gp.confidence_score AS pauta_confidence_score,

  -- Fallback values: prefer authoritative source, fall back to episode columns
  COALESCE(gr.biography, pe.biography) AS resolved_biography,
  COALESCE(gr.controversies, pe.controversies) AS resolved_controversies,
  COALESCE(gp.ice_breakers, pe.ice_breakers) AS resolved_ice_breakers

FROM public.podcast_episodes pe
LEFT JOIN public.podcast_guest_research gr
  ON gr.episode_id = pe.id
LEFT JOIN public.podcast_generated_pautas gp
  ON gp.episode_id = pe.id
  AND gp.is_active = true;

COMMENT ON VIEW public.v_episode_guest_info IS
  'Unified view of episode + guest research + active pauta. Resolves deprecated columns (biography, controversies, ice_breakers) by preferring authoritative sources (podcast_guest_research, podcast_generated_pautas) with fallback to podcast_episodes columns.';

-- ============================================================================
-- 3. MIGRATION SUMMARY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 20260309000007_deconflict_semantic_duplication completed';
  RAISE NOTICE '  - Marked podcast_episodes.biography as DEPRECATED (use podcast_guest_research.biography)';
  RAISE NOTICE '  - Marked podcast_episodes.ice_breakers as DEPRECATED (use podcast_generated_pautas.ice_breakers)';
  RAISE NOTICE '  - Marked podcast_episodes.controversies as DEPRECATED (use podcast_guest_research.controversies)';
  RAISE NOTICE '  - Created VIEW v_episode_guest_info with resolved_* fallback columns';
  RAISE NOTICE '  - NOTE: No columns dropped — backward compatibility preserved';
END $$;
