-- =====================================================
-- Finance Statements Table - Complete Schema
-- Fixes: PGRST204 errors for storage_path and account_type
-- Created: 2025-12-06
-- =====================================================

-- Drop table if exists (for clean recreation)
DROP TABLE IF EXISTS finance_statements CASCADE;

-- Create finance_statements table with ALL columns used by TypeScript code
CREATE TABLE finance_statements (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- File metadata
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER,
  file_hash TEXT NOT NULL,
  storage_path TEXT,  -- Path in Supabase Storage (was missing!)
  mime_type TEXT DEFAULT 'application/pdf',

  -- Statement metadata
  bank_name TEXT,
  account_type TEXT CHECK (account_type IN ('checking', 'savings', 'credit_card', 'investment', 'other')),  -- Was missing!
  statement_period_start DATE,
  statement_period_end DATE,
  currency TEXT DEFAULT 'BRL' NOT NULL,  -- Was missing!

  -- Processing status
  processing_status TEXT DEFAULT 'pending' NOT NULL
    CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'partial')),
  processing_error TEXT,
  processing_started_at TIMESTAMPTZ,  -- Was missing!
  processing_completed_at TIMESTAMPTZ,  -- Was missing!

  -- Financial summary
  opening_balance NUMERIC(12, 2),  -- Was missing!
  closing_balance NUMERIC(12, 2),  -- Was missing!
  total_credits NUMERIC(12, 2) DEFAULT 0,  -- Was missing!
  total_debits NUMERIC(12, 2) DEFAULT 0,  -- Was missing!
  transaction_count INTEGER DEFAULT 0 NOT NULL,  -- Was missing!

  -- Content extraction
  markdown_content TEXT,
  markdown_generated_at TIMESTAMPTZ,  -- Was missing!
  raw_text TEXT,
  tables_json JSONB DEFAULT '[]'::jsonb,

  -- PDF metadata
  pages_count INTEGER DEFAULT 0,
  tables_count INTEGER DEFAULT 0,
  pdf_metadata JSONB DEFAULT '{}'::jsonb,

  -- AI analysis
  ai_summary TEXT,  -- Was missing!
  ai_insights JSONB,  -- Was missing!
  ai_analyzed_at TIMESTAMPTZ,  -- Was missing!

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  UNIQUE(user_id, file_hash)  -- Prevent duplicate uploads
);

-- =====================================================
-- Indexes for performance
-- =====================================================

CREATE INDEX idx_finance_statements_user_id ON finance_statements(user_id);
CREATE INDEX idx_finance_statements_file_hash ON finance_statements(file_hash);
CREATE INDEX idx_finance_statements_status ON finance_statements(processing_status);
CREATE INDEX idx_finance_statements_created ON finance_statements(created_at DESC);
CREATE INDEX idx_finance_statements_period ON finance_statements(statement_period_start, statement_period_end);

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

ALTER TABLE finance_statements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own statements" ON finance_statements;
DROP POLICY IF EXISTS "Users can insert own statements" ON finance_statements;
DROP POLICY IF EXISTS "Users can update own statements" ON finance_statements;
DROP POLICY IF EXISTS "Users can delete own statements" ON finance_statements;

-- RLS Policies: Users can only access their own statements
CREATE POLICY "Users can view own statements"
  ON finance_statements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own statements"
  ON finance_statements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own statements"
  ON finance_statements FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own statements"
  ON finance_statements FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- Trigger for automatic updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_finance_statements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_finance_statements_updated_at
  BEFORE UPDATE ON finance_statements
  FOR EACH ROW
  EXECUTE FUNCTION update_finance_statements_updated_at();

-- =====================================================
-- Comments for documentation
-- =====================================================

COMMENT ON TABLE finance_statements IS 'Stores uploaded bank statement PDFs with extracted data and AI analysis';
COMMENT ON COLUMN finance_statements.storage_path IS 'Path to PDF in Supabase Storage bucket';
COMMENT ON COLUMN finance_statements.account_type IS 'Type of bank account (checking, savings, credit_card, investment, other)';
COMMENT ON COLUMN finance_statements.file_hash IS 'SHA256 hash of file content to prevent duplicate uploads';
COMMENT ON COLUMN finance_statements.transaction_count IS 'Number of transactions extracted from statement';
COMMENT ON COLUMN finance_statements.ai_insights IS 'JSONB array of AI-generated insights about spending patterns';

-- =====================================================
-- Storage Bucket (if not exists)
-- =====================================================

-- Create finance-statements bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('finance-statements', 'finance-statements', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
CREATE POLICY "Users can upload own finance statements"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'finance-statements'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own finance statements"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'finance-statements'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own finance statements"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'finance-statements'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- =====================================================
-- Foreign Key to link statements to transactions
-- =====================================================

-- Add statement_id to finance_transactions if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'finance_transactions'
    AND column_name = 'statement_id'
  ) THEN
    ALTER TABLE finance_transactions ADD COLUMN statement_id UUID REFERENCES finance_statements(id) ON DELETE CASCADE;
    CREATE INDEX idx_finance_transactions_statement_id ON finance_transactions(statement_id);
  END IF;
END$$;
