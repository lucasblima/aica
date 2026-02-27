-- ============================================================================
-- LifeRPG: Weekly HP Decay + CP Counter Reset Cron Jobs
-- Issue: #518 (Gap 2 - HP Decay Cron, Gap 3 - CP counters)
-- Requires: pg_cron (1.6+), pg_net (0.19+)
-- ============================================================================

-- ============================================================================
-- Cron Job 1: Entity Decay — Weekly Sunday 03:00 UTC (00:00 BRT)
-- Calculates HP decay for habitat, person, and organization entities
-- Uses existing Edge Function: calculate-entity-decay (413 LOC)
-- ============================================================================

SELECT cron.unschedule('liferpg-entity-decay')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'liferpg-entity-decay'
);

SELECT cron.schedule(
  'liferpg-entity-decay',
  '0 3 * * 0',  -- Every Sunday at 03:00 UTC = 00:00 BRT
  $$SELECT trigger_edge_function_for_users('calculate-entity-decay')$$
);

-- ============================================================================
-- Cron Job 2: CP Daily Counter Reset — Daily at 06:00 UTC (03:00 BRT)
-- Resets cp_earned_today counter in user_stats.consciousness_points
-- ============================================================================

SELECT cron.unschedule('cp-daily-reset')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cp-daily-reset'
);

SELECT cron.schedule(
  'cp-daily-reset',
  '0 6 * * *',  -- Daily at 06:00 UTC = 03:00 BRT
  $$SELECT reset_daily_cp_counters()$$
);

-- ============================================================================
-- Cron Job 3: CP Weekly Counter Reset — Monday 06:00 UTC (03:00 BRT)
-- Resets cp_earned_this_week counter in user_stats.consciousness_points
-- ============================================================================

SELECT cron.unschedule('cp-weekly-reset')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cp-weekly-reset'
);

SELECT cron.schedule(
  'cp-weekly-reset',
  '0 6 * * 1',  -- Every Monday at 06:00 UTC = 03:00 BRT
  $$SELECT reset_weekly_cp_counters()$$
);

-- ============================================================================
-- Cron Job 4: CP Monthly Counter Reset — 1st of month 06:00 UTC (03:00 BRT)
-- Resets cp_earned_this_month counter in user_stats.consciousness_points
-- ============================================================================

SELECT cron.unschedule('cp-monthly-reset')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cp-monthly-reset'
);

SELECT cron.schedule(
  'cp-monthly-reset',
  '0 6 1 * *',  -- 1st of month at 06:00 UTC = 03:00 BRT
  $$SELECT reset_monthly_cp_counters()$$
);
