-- Add financial_status column to athletes
-- Coach-managed field to track athlete payment status
-- Used by frontend derived alerts in useAlerts.ts

ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS financial_status TEXT DEFAULT 'ok'
  CHECK (financial_status IN ('ok', 'pending', 'overdue'));

-- Comment for documentation
COMMENT ON COLUMN public.athletes.financial_status IS 'Coach-managed financial status: ok=paid, pending=payment due, overdue=payment late';
