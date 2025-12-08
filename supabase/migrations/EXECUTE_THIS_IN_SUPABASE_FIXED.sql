-- =====================================================
-- INSTRUÇÕES:
-- 1. Acesse: https://supabase.com/dashboard/project/hfjhthwspbivfbcvdniq/sql
-- 2. Cole TODO este arquivo no SQL Editor
-- 3. Clique em RUN (ou Ctrl+Enter)
-- 4. Aguarde a execução (pode levar 10-15 segundos)
-- =====================================================

-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- STEP 1: Create new tables
-- =====================================================

-- Create finance_processing_logs table
CREATE TABLE IF NOT EXISTS finance_processing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  statement_id UUID REFERENCES finance_statements(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'upload_started', 'file_validated', 'extraction_started', 'extraction_completed',
    'parsing_started', 'parsing_completed', 'validation_started', 'validation_completed',
    'save_started', 'save_completed', 'processing_failed', 'duplicate_detected', 'reconciliation_error'
  )),
  message TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  error_details JSONB,
  duration_ms INTEGER,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  severity TEXT CHECK (severity IN ('info', 'warning', 'error', 'critical'))
);

-- Create finance_categorization_rules table
CREATE TABLE IF NOT EXISTS finance_categorization_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  rule_type TEXT CHECK (rule_type IN ('keyword', 'merchant', 'amount_range', 'regex')),
  keywords TEXT[],
  merchant_pattern TEXT,
  amount_min NUMERIC(15,2),
  amount_max NUMERIC(15,2),
  regex_pattern TEXT,
  target_category TEXT NOT NULL,
  target_subcategory TEXT,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  match_count INTEGER DEFAULT 0,
  last_matched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- STEP 2: Add columns to existing tables
-- =====================================================

-- Enhance finance_statements table
ALTER TABLE finance_statements
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'pdf',
  ADD COLUMN IF NOT EXISTS source_bank TEXT,
  ADD COLUMN IF NOT EXISTS file_format_version TEXT,
  ADD COLUMN IF NOT EXISTS raw_data_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS raw_data_hash TEXT,
  ADD COLUMN IF NOT EXISTS processing_metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS reprocessed_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reprocessed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reconciliation_errors JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS has_duplicates BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS duplicate_count INTEGER DEFAULT 0;

-- Add constraints to finance_statements (only if columns were just created)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_statements_source_type_check') THEN
    ALTER TABLE finance_statements ADD CONSTRAINT finance_statements_source_type_check
      CHECK (source_type IN ('csv', 'pdf', 'manual'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_statements_source_bank_check') THEN
    ALTER TABLE finance_statements ADD CONSTRAINT finance_statements_source_bank_check
      CHECK (source_bank IN ('nubank', 'inter', 'itau', 'bradesco', 'caixa', 'santander', 'banco_brasil', 'other'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_statements_validation_status_check') THEN
    ALTER TABLE finance_statements ADD CONSTRAINT finance_statements_validation_status_check
      CHECK (validation_status IN ('pending', 'valid', 'invalid', 'warning'));
  END IF;
END $$;

-- Enhance finance_transactions table
ALTER TABLE finance_transactions
  ADD COLUMN IF NOT EXISTS transaction_hash TEXT,
  ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS duplicate_of UUID,
  ADD COLUMN IF NOT EXISTS duplicate_detected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_line_number INTEGER,
  ADD COLUMN IF NOT EXISTS raw_description TEXT,
  ADD COLUMN IF NOT EXISTS categorization_history JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_anomaly BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS anomaly_reason TEXT;

-- Add foreign key for duplicate_of (only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_transactions_duplicate_of_fkey') THEN
    ALTER TABLE finance_transactions
      ADD CONSTRAINT finance_transactions_duplicate_of_fkey
      FOREIGN KEY (duplicate_of) REFERENCES finance_transactions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =====================================================
-- STEP 3: Create indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_processing_logs_statement_id ON finance_processing_logs(statement_id);
CREATE INDEX IF NOT EXISTS idx_processing_logs_user_id ON finance_processing_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_processing_logs_timestamp ON finance_processing_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_processing_logs_event_type ON finance_processing_logs(event_type);

CREATE INDEX IF NOT EXISTS idx_statements_source_type ON finance_statements(source_type);
CREATE INDEX IF NOT EXISTS idx_statements_source_bank ON finance_statements(source_bank);
CREATE INDEX IF NOT EXISTS idx_statements_validation_status ON finance_statements(validation_status);
CREATE INDEX IF NOT EXISTS idx_statements_has_duplicates ON finance_statements(has_duplicates) WHERE has_duplicates = TRUE;

CREATE INDEX IF NOT EXISTS idx_transactions_hash ON finance_transactions(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_is_duplicate ON finance_transactions(is_duplicate) WHERE is_duplicate = TRUE;
CREATE INDEX IF NOT EXISTS idx_transactions_duplicate_of ON finance_transactions(duplicate_of) WHERE duplicate_of IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_source_line ON finance_transactions(source_line_number);
CREATE INDEX IF NOT EXISTS idx_transactions_is_anomaly ON finance_transactions(is_anomaly) WHERE is_anomaly = TRUE;

CREATE INDEX IF NOT EXISTS idx_categorization_rules_user_id ON finance_categorization_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_categorization_rules_active ON finance_categorization_rules(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_categorization_rules_priority ON finance_categorization_rules(priority DESC);
CREATE INDEX IF NOT EXISTS idx_categorization_rules_type ON finance_categorization_rules(rule_type);

-- =====================================================
-- STEP 4: Enable RLS and create policies
-- =====================================================

ALTER TABLE finance_processing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_categorization_rules ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own logs" ON finance_processing_logs;
  DROP POLICY IF EXISTS "Users can view system and own rules" ON finance_categorization_rules;
  DROP POLICY IF EXISTS "Users can manage own rules" ON finance_categorization_rules;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignore errors if policies don't exist
END $$;

-- Create policies
CREATE POLICY "Users can view own logs" ON finance_processing_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view system and own rules" ON finance_categorization_rules FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "Users can manage own rules" ON finance_categorization_rules FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- STEP 5: Create functions
-- =====================================================

-- Function: generate_transaction_hash
CREATE OR REPLACE FUNCTION generate_transaction_hash(
  p_user_id UUID, p_date DATE, p_description TEXT, p_amount NUMERIC
) RETURNS TEXT AS $$
BEGIN
  RETURN encode(digest(p_user_id::text || '|' || p_date::text || '|' || LOWER(TRIM(p_description)) || '|' || ROUND(p_amount, 2)::text, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: validate_statement_balance
CREATE OR REPLACE FUNCTION validate_statement_balance(p_statement_id UUID) RETURNS JSONB AS $$
DECLARE
  v_statement RECORD; v_calculated_closing NUMERIC(15,2); v_discrepancy NUMERIC(15,2); v_result JSONB;
BEGIN
  SELECT * INTO v_statement FROM finance_statements WHERE id = p_statement_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('valid', false, 'error', 'Statement not found'); END IF;

  v_calculated_closing := COALESCE(v_statement.opening_balance, 0) + COALESCE(v_statement.total_credits, 0) - COALESCE(v_statement.total_debits, 0);
  v_discrepancy := COALESCE(v_statement.closing_balance, 0) - v_calculated_closing;

  v_result := jsonb_build_object('valid', ABS(v_discrepancy) < 0.01, 'opening_balance', v_statement.opening_balance, 'closing_balance', v_statement.closing_balance, 'calculated_closing', v_calculated_closing, 'discrepancy', v_discrepancy);

  UPDATE finance_statements SET validation_status = CASE WHEN ABS(v_discrepancy) < 0.01 THEN 'valid' WHEN ABS(v_discrepancy) < 1.00 THEN 'warning' ELSE 'invalid' END WHERE id = p_statement_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: detect_duplicate_transactions
CREATE OR REPLACE FUNCTION detect_duplicate_transactions(p_statement_id UUID) RETURNS JSONB AS $$
DECLARE v_duplicates JSONB; v_count INTEGER;
BEGIN
  WITH duplicates AS (
    SELECT transaction_hash, array_agg(id ORDER BY created_at) AS transaction_ids, COUNT(*) AS duplicate_count
    FROM finance_transactions WHERE statement_id = p_statement_id AND transaction_hash IS NOT NULL
    GROUP BY transaction_hash HAVING COUNT(*) > 1
  )
  SELECT COUNT(*), jsonb_agg(jsonb_build_object('transaction_hash', transaction_hash, 'duplicate_count', duplicate_count, 'transaction_ids', transaction_ids))
  INTO v_count, v_duplicates FROM duplicates;

  UPDATE finance_transactions t SET is_duplicate = TRUE,
    duplicate_of = (SELECT id FROM finance_transactions WHERE transaction_hash = t.transaction_hash AND statement_id = p_statement_id ORDER BY created_at LIMIT 1),
    duplicate_detected_at = NOW()
  WHERE statement_id = p_statement_id AND id != (SELECT id FROM finance_transactions WHERE transaction_hash = t.transaction_hash AND statement_id = p_statement_id ORDER BY created_at LIMIT 1);

  UPDATE finance_statements SET has_duplicates = CASE WHEN v_count > 0 THEN TRUE ELSE FALSE END, duplicate_count = v_count WHERE id = p_statement_id;

  RETURN jsonb_build_object('duplicate_groups', COALESCE(v_count, 0), 'details', COALESCE(v_duplicates, '[]'::jsonb));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: recalculate_closing_balance
CREATE OR REPLACE FUNCTION recalculate_closing_balance(p_statement_id UUID) RETURNS JSONB AS $$
DECLARE v_statement RECORD; v_total_income NUMERIC(15,2); v_total_expense NUMERIC(15,2); v_new_closing NUMERIC(15,2); v_old_closing NUMERIC(15,2);
BEGIN
  SELECT * INTO v_statement FROM finance_statements WHERE id = p_statement_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Statement not found'); END IF;

  SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0), COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
  INTO v_total_income, v_total_expense FROM finance_transactions WHERE statement_id = p_statement_id AND (is_duplicate = FALSE OR is_duplicate IS NULL);

  v_new_closing := COALESCE(v_statement.opening_balance, 0) + v_total_income - v_total_expense;
  v_old_closing := v_statement.closing_balance;

  UPDATE finance_statements SET closing_balance = v_new_closing, total_credits = v_total_income, total_debits = v_total_expense,
    transaction_count = (SELECT COUNT(*) FROM finance_transactions WHERE statement_id = p_statement_id AND (is_duplicate = FALSE OR is_duplicate IS NULL)),
    reprocessed_count = reprocessed_count + 1, reprocessed_at = NOW()
  WHERE id = p_statement_id;

  RETURN jsonb_build_object('old_closing_balance', v_old_closing, 'new_closing_balance', v_new_closing, 'discrepancy', v_new_closing - v_old_closing);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: check_period_continuity
CREATE OR REPLACE FUNCTION check_period_continuity(p_user_id UUID) RETURNS JSONB AS $$
DECLARE v_errors JSONB := '[]'::jsonb; v_prev RECORD; v_curr RECORD;
BEGIN
  FOR v_curr IN SELECT * FROM finance_statements WHERE user_id = p_user_id AND processing_status = 'completed' ORDER BY statement_period_start
  LOOP
    IF v_prev IS NOT NULL THEN
      IF ABS(COALESCE(v_prev.closing_balance, 0) - COALESCE(v_curr.opening_balance, 0)) > 0.01 THEN
        v_errors := v_errors || jsonb_build_object('prev_statement_id', v_prev.id, 'prev_closing', v_prev.closing_balance, 'curr_statement_id', v_curr.id, 'curr_opening', v_curr.opening_balance, 'gap', COALESCE(v_curr.opening_balance, 0) - COALESCE(v_prev.closing_balance, 0));
      END IF;
    END IF;
    v_prev := v_curr;
  END LOOP;
  RETURN jsonb_build_object('valid', jsonb_array_length(v_errors) = 0, 'errors', v_errors);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- STEP 6: Create triggers
-- =====================================================

-- Trigger: generate transaction_hash on insert
CREATE OR REPLACE FUNCTION trigger_generate_transaction_hash() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_hash IS NULL THEN
    NEW.transaction_hash := generate_transaction_hash(NEW.user_id, NEW.transaction_date, NEW.description, NEW.amount);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS before_transaction_insert ON finance_transactions;
CREATE TRIGGER before_transaction_insert BEFORE INSERT ON finance_transactions FOR EACH ROW EXECUTE FUNCTION trigger_generate_transaction_hash();

-- Trigger: auto-validate statement after completion
CREATE OR REPLACE FUNCTION trigger_validate_statement() RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.processing_status = 'completed') THEN PERFORM validate_statement_balance(NEW.id); END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS after_statement_completed ON finance_statements;
CREATE TRIGGER after_statement_completed AFTER INSERT OR UPDATE OF processing_status ON finance_statements FOR EACH ROW WHEN (NEW.processing_status = 'completed') EXECUTE FUNCTION trigger_validate_statement();

-- =====================================================
-- STEP 7: Seed categorization rules
-- =====================================================

INSERT INTO finance_categorization_rules (rule_name, rule_type, keywords, target_category, target_subcategory, priority) VALUES
  ('Delivery Apps', 'keyword', ARRAY['ifood', 'uber eats', 'rappi', '99food'], 'food', 'delivery', 100),
  ('Restaurantes', 'keyword', ARRAY['restaurante', 'lanchonete', 'padaria', 'pizzaria'], 'food', 'restaurant', 90),
  ('Supermercados', 'keyword', ARRAY['supermercado', 'mercado', 'carrefour', 'extra'], 'food', 'groceries', 90),
  ('Uber/99', 'keyword', ARRAY['uber', '99', '99pop'], 'transport', 'ride_sharing', 100),
  ('Combustível', 'keyword', ARRAY['posto', 'gasolina', 'shell', 'ipiranga'], 'transport', 'fuel', 90),
  ('Estacionamento', 'keyword', ARRAY['estacionamento', 'estapar'], 'transport', 'parking', 80),
  ('Aluguel', 'keyword', ARRAY['aluguel', 'locacao'], 'housing', 'rent', 100),
  ('Energia', 'keyword', ARRAY['enel', 'cemig', 'copel'], 'housing', 'electricity', 90),
  ('Internet', 'keyword', ARRAY['vivo fibra', 'claro net', 'oi fibra'], 'housing', 'internet', 90),
  ('Farmácia', 'keyword', ARRAY['farmacia', 'drogaria'], 'health', 'pharmacy', 100),
  ('Streaming', 'keyword', ARRAY['netflix', 'spotify', 'amazon prime'], 'entertainment', 'streaming', 100)
ON CONFLICT DO NOTHING;

-- =====================================================
-- STEP 8: Add comments
-- =====================================================

COMMENT ON TABLE finance_processing_logs IS 'Audit trail completo de operações de processamento de extratos';
COMMENT ON TABLE finance_categorization_rules IS 'Regras determinísticas para categorização automática de transações';
COMMENT ON COLUMN finance_statements.source_type IS 'Tipo de fonte: csv, pdf, manual';
COMMENT ON COLUMN finance_statements.validation_status IS 'Status de validação matemática do extrato';
COMMENT ON COLUMN finance_transactions.transaction_hash IS 'Hash SHA256 para deduplicação';
COMMENT ON COLUMN finance_transactions.is_duplicate IS 'Flag indicando se a transação é duplicata';
COMMENT ON COLUMN finance_transactions.categorization_history IS 'Histórico de categorizações (AI + manual)';

-- =====================================================
-- SUCCESS!
-- =====================================================
SELECT '✓ Migration 20251208_finance_robust_processing applied successfully!' as status,
       'Execute VERIFY_MIGRATION.sql para verificar' as next_step;