-- =====================================================
-- TEST DATA: ai_usage_analytics
-- Description: Sample AI usage data for testing the Cost Dashboard
-- IMPORTANT: Replace 'YOUR_USER_ID_HERE' with an actual user UUID
-- =====================================================

-- This script creates realistic test data for the last 30 days
-- It includes various operation types, models, and costs

-- Define user ID (REPLACE THIS!)
DO $$
DECLARE
  v_user_id UUID := 'YOUR_USER_ID_HERE'; -- REPLACE with actual user ID
  v_date DATE;
  v_day_offset INT;
BEGIN
  -- Generate data for last 30 days
  FOR v_day_offset IN 0..29 LOOP
    v_date := CURRENT_DATE - v_day_offset;

    -- Day 1-10: Heavy usage period (testing features)
    IF v_day_offset < 10 THEN
      -- Gemini text generation (grants module)
      INSERT INTO public.ai_usage_analytics (
        user_id, operation_type, ai_model,
        input_tokens, output_tokens, total_tokens,
        input_cost_usd, output_cost_usd, total_cost_usd,
        module_type, created_at
      ) VALUES
        (v_user_id, 'text_generation', 'gemini-2.0-flash-exp',
         2500, 1200, 3700,
         0.00025, 0.00012, 0.00037,
         'grants', v_date + TIME '09:30:00'),
        (v_user_id, 'text_generation', 'gemini-2.0-flash-exp',
         1800, 900, 2700,
         0.00018, 0.00009, 0.00027,
         'grants', v_date + TIME '14:15:00');

      -- File search operations (grants)
      INSERT INTO public.ai_usage_analytics (
        user_id, operation_type, ai_model,
        total_cost_usd, module_type, created_at
      ) VALUES
        (v_user_id, 'file_indexing', 'gemini-file-search',
         0.15, 'grants', v_date + TIME '10:00:00'),
        (v_user_id, 'file_search_query', 'gemini-file-search',
         0.05, 'grants', v_date + TIME '10:30:00');

      -- Podcast transcription
      INSERT INTO public.ai_usage_analytics (
        user_id, operation_type, ai_model,
        duration_seconds, total_cost_usd,
        module_type, created_at
      ) VALUES
        (v_user_id, 'transcription', 'gemini-multimodal',
         1800, 0.45, 'podcast', v_date + TIME '16:00:00');

    -- Day 11-20: Moderate usage
    ELSIF v_day_offset < 20 THEN
      -- Regular text generation
      INSERT INTO public.ai_usage_analytics (
        user_id, operation_type, ai_model,
        input_tokens, output_tokens, total_tokens,
        input_cost_usd, output_cost_usd, total_cost_usd,
        module_type, created_at
      ) VALUES
        (v_user_id, 'text_generation', 'gemini-2.0-flash-exp',
         1200, 600, 1800,
         0.00012, 0.00006, 0.00018,
         'chat', v_date + TIME '11:00:00');

      -- Image analysis (journey module)
      INSERT INTO public.ai_usage_analytics (
        user_id, operation_type, ai_model,
        total_tokens, total_cost_usd,
        module_type, created_at
      ) VALUES
        (v_user_id, 'image_analysis', 'gemini-2.0-flash-exp',
         500, 0.025, 'journey', v_date + TIME '15:00:00');

    -- Day 21-30: Light usage
    ELSE
      -- Minimal daily usage
      INSERT INTO public.ai_usage_analytics (
        user_id, operation_type, ai_model,
        input_tokens, output_tokens, total_tokens,
        input_cost_usd, output_cost_usd, total_cost_usd,
        module_type, created_at
      ) VALUES
        (v_user_id, 'text_generation', 'gemini-2.0-flash-exp',
         800, 400, 1200,
         0.00008, 0.00004, 0.00012,
         'atlas', v_date + TIME '13:00:00');
    END IF;
  END LOOP;

  -- Add some expensive operations for "Top 5" table
  INSERT INTO public.ai_usage_analytics (
    user_id, operation_type, ai_model,
    duration_seconds, total_cost_usd,
    module_type, request_metadata, created_at
  ) VALUES
    (v_user_id, 'video_generation', 'veo-2',
     120, 5.50, 'podcast',
     '{"prompt": "Create intro animation for podcast episode", "resolution": "1080p"}',
     CURRENT_DATE - 5 + TIME '10:00:00'),

    (v_user_id, 'image_generation', 'imagen-3',
     NULL, 2.25, 'journey',
     '{"prompt": "Generate album cover art", "style": "photorealistic"}',
     CURRENT_DATE - 8 + TIME '14:30:00'),

    (v_user_id, 'transcription', 'gemini-multimodal',
     3600, 0.90, 'podcast',
     '{"duration": "60 minutes", "language": "pt-BR"}',
     CURRENT_DATE - 3 + TIME '09:00:00');

  RAISE NOTICE 'Test data created successfully for user %', v_user_id;
END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check total records created
-- SELECT COUNT(*) as total_records FROM ai_usage_analytics;

-- Check date range
-- SELECT MIN(created_at)::DATE as earliest, MAX(created_at)::DATE as latest
-- FROM ai_usage_analytics;

-- Check total cost
-- SELECT SUM(total_cost_usd) as total_cost_last_30_days
-- FROM ai_usage_analytics
-- WHERE created_at >= CURRENT_DATE - 30;

-- Verify operation breakdown
-- SELECT operation_type, COUNT(*) as count, SUM(total_cost_usd) as total_cost
-- FROM ai_usage_analytics
-- GROUP BY operation_type
-- ORDER BY total_cost DESC;

-- Verify model breakdown
-- SELECT ai_model, COUNT(*) as count, SUM(total_cost_usd) as total_cost
-- FROM ai_usage_analytics
-- GROUP BY ai_model
-- ORDER BY total_cost DESC;
