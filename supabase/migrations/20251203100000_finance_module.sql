-- =====================================================
-- AICA FINANCE MODULE - Database Schema
-- Privacy-First Financial Tracking System
-- =====================================================

-- Create finance_transactions table
CREATE TABLE IF NOT EXISTS finance_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category TEXT NOT NULL,
    transaction_date DATE NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    hash_id TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_finance_transactions_user_id 
    ON finance_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_date 
    ON finance_transactions(transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_category 
    ON finance_transactions(category);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_type 
    ON finance_transactions(type);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_hash 
    ON finance_transactions(hash_id);

-- Composite index for common dashboard queries
CREATE INDEX IF NOT EXISTS idx_finance_transactions_user_date 
    ON finance_transactions(user_id, transaction_date DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own transactions" ON finance_transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON finance_transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON finance_transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON finance_transactions;

-- RLS Policy: Users can only view their own transactions
CREATE POLICY "Users can view their own transactions"
    ON finance_transactions
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Users can only insert their own transactions
CREATE POLICY "Users can insert their own transactions"
    ON finance_transactions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only update their own transactions
CREATE POLICY "Users can update their own transactions"
    ON finance_transactions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only delete their own transactions
CREATE POLICY "Users can delete their own transactions"
    ON finance_transactions
    FOR DELETE
    USING (auth.uid() = user_id);

-- Add helpful comments
COMMENT ON TABLE finance_transactions IS 'Stores user financial transactions with privacy-first approach';
COMMENT ON COLUMN finance_transactions.hash_id IS 'Unique hash (Date + Amount + Description) to prevent duplicate imports';
COMMENT ON COLUMN finance_transactions.is_recurring IS 'Automatically identified recurring transactions (e.g., rent, utilities)';
COMMENT ON COLUMN finance_transactions.category IS 'Auto-categorized transaction type (housing, food, transport, etc.)';
