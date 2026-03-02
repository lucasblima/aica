-- Update action_credit_costs with values recalculated from real usage data (3x margin).
-- Uses INSERT ... ON CONFLICT to safely upsert existing + new actions.

INSERT INTO action_credit_costs (action, credits, tier, description)
VALUES
  -- 1 credit tier (lightweight, <2K tokens avg)
  ('analyze_moment_sentiment', 1, 'basic', 'Sentiment analysis on moments'),
  ('evaluate_quality', 1, 'basic', 'CP quality scoring'),
  ('generate_daily_question', 1, 'basic', 'AI daily question generation'),
  ('route_entities_to_modules', 1, 'basic', 'Entity routing from WhatsApp'),
  ('text_embedding', 1, 'basic', 'Text embedding generation'),
  ('classify_intent', 1, 'basic', 'Intent classification'),
  ('chat', 1, 'basic', 'Chat interaction'),
  ('chat_aica', 1, 'basic', 'AICA chat'),
  ('analyze_moment', 1, 'basic', 'Moment analysis'),
  ('generate_tags', 1, 'basic', 'Tag generation'),
  ('chat_aica_stream', 1, 'basic', 'AICA chat streaming'),
  ('transcribe_audio', 1, 'basic', 'Audio transcription'),
  ('analyze_content_realtime', 1, 'basic', 'Realtime content analysis'),
  ('extract_task_from_voice', 1, 'basic', 'Voice task extraction'),
  ('generate_post_capture_insight', 1, 'basic', 'Post-capture insight'),
  ('chat_with_agent', 1, 'basic', 'Agent chat'),
  ('atlas_suggest', 1, 'basic', 'Atlas task suggestion'),

  -- 2 credits tier (moderate, 2-5K tokens avg)
  ('build_conversation_threads', 2, 'standard', 'Conversation threading'),
  ('whatsapp_sentiment', 2, 'standard', 'WhatsApp sentiment analysis'),
  ('generate_report', 2, 'standard', 'Report generation'),
  ('generate_briefing', 2, 'standard', 'Briefing generation'),
  ('generate_field_content', 2, 'standard', 'Field content generation'),
  ('generate_ice_breakers', 2, 'standard', 'Ice breaker generation'),
  ('build_profile', 2, 'standard', 'Profile building'),
  ('interview_extract_insights', 2, 'standard', 'Interview insight extraction'),
  ('generate_interview_followup', 2, 'standard', 'Interview followup generation'),
  ('atlas_prioritize', 2, 'standard', 'Atlas task prioritization'),
  ('atlas_breakdown', 2, 'standard', 'Atlas task breakdown'),

  -- 3 credits tier (heavy, 5-10K tokens avg)
  ('build_contact_dossier', 3, 'advanced', 'Contact dossier building'),
  ('research_guest', 3, 'advanced', 'Guest research'),
  ('generate_pauta_outline', 3, 'advanced', 'Pauta outline generation'),
  ('pattern_synthesis', 3, 'advanced', 'Pattern synthesis (Pro model)'),
  ('generate_dossier', 3, 'advanced', 'Dossier generation'),
  ('generate_pauta_questions', 3, 'advanced', 'Pauta question generation'),
  ('plan_and_execute', 3, 'advanced', 'Plan and execute complex tasks'),

  -- 5 credits tier (very heavy, >10K tokens)
  ('life_council', 5, 'premium', 'Life Council multi-agent'),
  ('generate_weekly_summary', 5, 'premium', 'Weekly summary generation'),

  -- 8 credits tier (PDF parsing, ~13K tokens avg)
  ('parse_statement', 8, 'premium', 'PDF statement parsing')

ON CONFLICT (action) DO UPDATE SET
  credits = EXCLUDED.credits,
  tier = EXCLUDED.tier,
  description = EXCLUDED.description;
