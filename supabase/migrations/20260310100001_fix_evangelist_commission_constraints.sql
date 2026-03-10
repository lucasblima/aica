-- Prevent duplicate commission entries per conversion per period.
-- If confirm-referral runs twice for the same conversion, the second insert
-- will be rejected instead of creating a duplicate ledger row.
CREATE UNIQUE INDEX IF NOT EXISTS idx_commission_ledger_unique_entry
  ON public.commission_ledger(referral_conversion_id, period_month)
  WHERE referral_conversion_id IS NOT NULL;
