-- Add ai_categorized column to finance_transactions
-- This column is referenced by the application code (statementService.ts)
-- but was never created in the database, causing silent insert failures.

ALTER TABLE finance_transactions
ADD COLUMN IF NOT EXISTS ai_categorized BOOLEAN DEFAULT false;
