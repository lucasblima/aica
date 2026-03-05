-- Fix: qualify digest() with extensions schema so trigger works for authenticated users
-- The generate_transaction_hash function used digest() without schema,
-- but pgcrypto is installed in the "extensions" schema on Supabase.
-- PostgREST authenticated role's search_path doesn't include "extensions".

CREATE OR REPLACE FUNCTION generate_transaction_hash(
  p_user_id UUID,
  p_date DATE,
  p_description TEXT,
  p_amount NUMERIC
) RETURNS TEXT AS $$
BEGIN
  RETURN encode(
    extensions.digest(
      p_user_id::text || '|' ||
      p_date::text || '|' ||
      LOWER(TRIM(p_description)) || '|' ||
      ROUND(p_amount, 2)::text,
      'sha256'
    ),
    'hex'
  );
END;
$$ LANGUAGE plpgsql STABLE;
