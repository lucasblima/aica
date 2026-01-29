-- =============================================================================
-- Migration: Add increment_generation_count RPC function
-- Description: Safely increment generation_count in user_question_context_bank
-- Issue: #162 - generate-questions Edge Function references this RPC
-- =============================================================================

-- Create function to increment generation count
CREATE OR REPLACE FUNCTION public.increment_generation_count(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Increment generation_count for the user
  UPDATE user_question_context_bank
  SET generation_count = COALESCE(generation_count, 0) + 1
  WHERE user_id = p_user_id;

  -- If no row exists, create one with count = 1
  IF NOT FOUND THEN
    INSERT INTO user_question_context_bank (
      user_id,
      generation_count
    ) VALUES (
      p_user_id,
      1
    )
    ON CONFLICT (user_id) DO UPDATE
    SET generation_count = COALESCE(user_question_context_bank.generation_count, 0) + 1;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_generation_count(UUID) TO authenticated;

-- Grant execute permission to service_role (for Edge Functions)
GRANT EXECUTE ON FUNCTION public.increment_generation_count(UUID) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.increment_generation_count(UUID) IS
  'Safely increments generation_count in user_question_context_bank. Creates row if not exists. Called by generate-questions Edge Function.';
