-- Update action_credit_costs with values recalculated from real usage data (3x margin).
-- Uses INSERT ... ON CONFLICT to safely upsert existing + new actions.

INSERT INTO action_credit_costs (action, credits, updated_at)
VALUES
  -- 1 credit tier (lightweight, <2K tokens avg)
  ('analyze_moment_sentiment', 1, now()),
  ('evaluate_quality', 1, now()),
  ('generate_daily_question', 1, now()),
  ('route_entities_to_modules', 1, now()),
  ('text_embedding', 1, now()),
  ('classify_intent', 1, now()),
  ('chat', 1, now()),
  ('chat_aica', 1, now()),
  ('analyze_moment', 1, now()),
  ('generate_tags', 1, now()),
  ('chat_aica_stream', 1, now()),
  ('transcribe_audio', 1, now()),
  ('analyze_content_realtime', 1, now()),
  ('extract_task_from_voice', 1, now()),
  ('generate_post_capture_insight', 1, now()),
  ('chat_with_agent', 1, now()),
  ('atlas_suggest', 1, now()),

  -- 2 credits tier (moderate, 2-5K tokens avg)
  ('build_conversation_threads', 2, now()),
  ('whatsapp_sentiment', 2, now()),
  ('generate_report', 2, now()),
  ('generate_briefing', 2, now()),
  ('generate_field_content', 2, now()),
  ('generate_ice_breakers', 2, now()),
  ('build_profile', 2, now()),
  ('interview_extract_insights', 2, now()),
  ('generate_interview_followup', 2, now()),
  ('atlas_prioritize', 2, now()),
  ('atlas_breakdown', 2, now()),

  -- 3 credits tier (heavy, 5-10K tokens avg)
  ('build_contact_dossier', 3, now()),
  ('research_guest', 3, now()),
  ('generate_pauta_outline', 3, now()),
  ('pattern_synthesis', 3, now()),
  ('generate_dossier', 3, now()),
  ('generate_pauta_questions', 3, now()),
  ('plan_and_execute', 3, now()),

  -- 5 credits tier (very heavy, >10K tokens)
  ('life_council', 5, now()),
  ('generate_weekly_summary', 5, now()),

  -- 8 credits tier (PDF parsing, ~13K tokens avg)
  ('parse_statement', 8, now())

ON CONFLICT (action) DO UPDATE SET
  credits = EXCLUDED.credits,
  updated_at = EXCLUDED.updated_at;
