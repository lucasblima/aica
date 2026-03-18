-- ============================================================================
-- Expand get_council_context to include ALL AICA modules
-- Previously only fetched Journey (moments) + Atlas (tasks).
-- Now includes Finance, Connections, Flux, Studio, and Grants.
-- Returns available_modules array so Edge Function activates personas dynamically.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_council_context(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_moments JSONB;
  v_tasks JSONB;
  v_report JSONB;
  v_activity_times JSONB;
  v_finance JSONB;
  v_connections JSONB;
  v_flux JSONB;
  v_studio JSONB;
  v_grants JSONB;
  v_available_modules TEXT[];
BEGIN
  -- Moments from last 24h
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'content', COALESCE(m.content, ''),
    'emotion', COALESCE(m.emotion, ''),
    'sentiment_data', COALESCE(m.sentiment_data, '{}'),
    'tags', COALESCE(m.tags, '{}'),
    'created_at', m.created_at
  ) ORDER BY m.created_at DESC), '[]'::jsonb)
  INTO v_moments
  FROM moments m
  WHERE m.user_id = p_user_id
    AND m.created_at >= NOW() - INTERVAL '24 hours';

  -- Work items: completed today + pending/overdue
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'title', w.title,
    'status', w.status,
    'priority', COALESCE(w.priority, 'none'),
    'due_date', w.due_date,
    'completed_at', w.completed_at
  )), '[]'::jsonb)
  INTO v_tasks
  FROM work_items w
  WHERE w.user_id = p_user_id
    AND (
      w.completed_at >= NOW() - INTERVAL '24 hours'
      OR (w.status IN ('todo', 'in_progress', 'pending') AND w.due_date <= CURRENT_DATE + 1)
    );

  -- Latest daily report (if exists for today)
  SELECT COALESCE(jsonb_build_object(
    'report_content', r.report_content,
    'insights_count', r.insights_count,
    'actions_identified', r.actions_identified
  ), '{}'::jsonb)
  INTO v_report
  FROM daily_reports r
  WHERE r.user_id = p_user_id
    AND r.report_date = CURRENT_DATE
  LIMIT 1;

  -- Activity timestamps (last 48h for Bio-Hacker analysis)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'created_at', m.created_at,
    'type', m.type
  ) ORDER BY m.created_at), '[]'::jsonb)
  INTO v_activity_times
  FROM moments m
  WHERE m.user_id = p_user_id
    AND m.created_at >= NOW() - INTERVAL '48 hours';

  -- =========================================================================
  -- NEW: Finance — income/expense summary last 30 days
  -- =========================================================================
  SELECT COALESCE(jsonb_build_object(
    'total_income', COALESCE(SUM(CASE WHEN ft.type = 'income' THEN ft.amount ELSE 0 END), 0),
    'total_expense', COALESCE(SUM(CASE WHEN ft.type = 'expense' THEN ft.amount ELSE 0 END), 0),
    'transaction_count', COUNT(*),
    'top_categories', (
      SELECT COALESCE(jsonb_agg(cat_row), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object('category', ft2.category, 'total', SUM(ft2.amount)) AS cat_row
        FROM finance_transactions ft2
        WHERE ft2.user_id = p_user_id
          AND ft2.transaction_date >= CURRENT_DATE - 30
          AND ft2.type = 'expense'
        GROUP BY ft2.category
        ORDER BY SUM(ft2.amount) DESC
        LIMIT 5
      ) sub
    )
  ), '{}'::jsonb)
  INTO v_finance
  FROM finance_transactions ft
  WHERE ft.user_id = p_user_id
    AND ft.transaction_date >= CURRENT_DATE - 30;

  -- =========================================================================
  -- NEW: Connections — active contacts + avg health score
  -- =========================================================================
  SELECT COALESCE(jsonb_build_object(
    'active_contacts', COUNT(*),
    'avg_health_score', ROUND(AVG(COALESCE(cn.health_score, 0))::numeric, 1),
    'contacts_needing_attention', COUNT(*) FILTER (WHERE cn.health_score < 40)
  ), '{}'::jsonb)
  INTO v_connections
  FROM contact_network cn
  WHERE cn.user_id = p_user_id
    AND cn.is_active = true;

  -- =========================================================================
  -- NEW: Flux — workout completion from active microcycle
  -- =========================================================================
  SELECT COALESCE(jsonb_build_object(
    'total_slots', COUNT(*),
    'completed_slots', COUNT(*) FILTER (WHERE ws.completed = true),
    'completion_rate', CASE WHEN COUNT(*) > 0
      THEN ROUND((COUNT(*) FILTER (WHERE ws.completed = true))::numeric / COUNT(*)::numeric * 100, 1)
      ELSE 0 END,
    'modalities', (
      SELECT COALESCE(jsonb_agg(DISTINCT ws2.modality), '[]'::jsonb)
      FROM workout_slots ws2
        JOIN microcycles mc2 ON ws2.microcycle_id = mc2.id
      WHERE mc2.user_id = p_user_id AND mc2.status = 'active'
    )
  ), '{}'::jsonb)
  INTO v_flux
  FROM workout_slots ws
    JOIN microcycles mc ON ws.microcycle_id = mc.id
  WHERE mc.user_id = p_user_id
    AND mc.status = 'active';

  -- =========================================================================
  -- NEW: Studio — episode count + status
  -- =========================================================================
  SELECT COALESCE(jsonb_build_object(
    'total_episodes', COUNT(*),
    'published', COUNT(*) FILTER (WHERE pe.status = 'published'),
    'in_production', COUNT(*) FILTER (WHERE pe.status IN ('draft', 'recording', 'editing')),
    'latest_title', (
      SELECT pe2.title FROM podcast_episodes pe2
        JOIN podcast_shows ps2 ON pe2.show_id = ps2.id
      WHERE ps2.user_id = p_user_id
      ORDER BY pe2.created_at DESC LIMIT 1
    )
  ), '{}'::jsonb)
  INTO v_studio
  FROM podcast_episodes pe
    JOIN podcast_shows ps ON pe.show_id = ps.id
  WHERE ps.user_id = p_user_id;

  -- =========================================================================
  -- NEW: Grants — active projects + nearest deadline
  -- =========================================================================
  SELECT COALESCE(jsonb_build_object(
    'active_projects', (
      SELECT COUNT(*) FROM grant_projects gp2
      WHERE gp2.user_id = p_user_id AND gp2.status = 'active'
    ),
    'nearest_deadline', (
      SELECT MIN(go2.submission_deadline) FROM grant_opportunities go2
      WHERE go2.user_id = p_user_id
        AND go2.submission_deadline >= NOW()
    ),
    'nearest_opportunity', (
      SELECT go3.title FROM grant_opportunities go3
      WHERE go3.user_id = p_user_id
        AND go3.submission_deadline >= NOW()
      ORDER BY go3.submission_deadline ASC LIMIT 1
    )
  ), '{}'::jsonb)
  INTO v_grants;

  -- =========================================================================
  -- Build available_modules array dynamically
  -- =========================================================================
  v_available_modules := '{}';

  IF jsonb_array_length(v_moments) > 0 THEN
    v_available_modules := v_available_modules || ARRAY['journey'];
  END IF;

  IF jsonb_array_length(v_tasks) > 0 THEN
    v_available_modules := v_available_modules || ARRAY['atlas'];
  END IF;

  IF (v_finance->>'transaction_count')::int > 0 THEN
    v_available_modules := v_available_modules || ARRAY['finance'];
  END IF;

  IF (v_connections->>'active_contacts')::int > 0 THEN
    v_available_modules := v_available_modules || ARRAY['connections'];
  END IF;

  IF (v_flux->>'total_slots')::int > 0 THEN
    v_available_modules := v_available_modules || ARRAY['flux'];
  END IF;

  IF (v_studio->>'total_episodes')::int > 0 THEN
    v_available_modules := v_available_modules || ARRAY['studio'];
  END IF;

  IF (v_grants->>'active_projects')::int > 0 THEN
    v_available_modules := v_available_modules || ARRAY['grants'];
  END IF;

  RETURN jsonb_build_object(
    'moments', v_moments,
    'tasks', v_tasks,
    'daily_report', COALESCE(v_report, '{}'::jsonb),
    'activity_times', v_activity_times,
    'moments_count', jsonb_array_length(v_moments),
    'tasks_count', jsonb_array_length(v_tasks),
    'finance', v_finance,
    'connections', v_connections,
    'flux', v_flux,
    'studio', v_studio,
    'grants', v_grants,
    'available_modules', to_jsonb(v_available_modules)
  );
END;
$$;
