-- #882: Enable RLS on shared reference tables (brazilian_holidays, weather_cache)
-- These tables have no user_id — shared data, read-only for authenticated users.

-- brazilian_holidays: public holidays reference data
ALTER TABLE brazilian_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read holidays"
  ON brazilian_holidays FOR SELECT
  TO authenticated
  USING (true);

-- weather_cache: shared weather forecast cache
ALTER TABLE weather_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read weather cache"
  ON weather_cache FOR SELECT
  TO authenticated
  USING (true);

-- Allow service_role to manage weather cache (insert/update/delete for background jobs)
CREATE POLICY "Service role manages weather cache"
  ON weather_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- #885: Drop redundant indexes on finance_transactions
-- idx_finance_transactions_hash duplicates the UNIQUE constraint finance_transactions_hash_id_key
DROP INDEX IF EXISTS idx_finance_transactions_hash;

-- idx_finance_transactions_user_id is covered by composite idx_finance_transactions_user_date (user_id, transaction_date DESC)
DROP INDEX IF EXISTS idx_finance_transactions_user_id;
