-- Athletes avatar_url — display Google profile pictures on athlete cards
-- Adds avatar_url column, backfills from auth.users metadata, and creates
-- a trigger to auto-populate when an athlete is linked via auth_user_id.

-- 1. Add column (idempotent)
ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Backfill from auth.users metadata (try both 'avatar_url' and 'picture' keys)
UPDATE public.athletes a
SET avatar_url = (
  SELECT COALESCE(
    raw_user_meta_data->>'avatar_url',
    raw_user_meta_data->>'picture'
  )
  FROM auth.users u
  WHERE u.id = a.auth_user_id
)
WHERE a.auth_user_id IS NOT NULL
  AND a.avatar_url IS NULL;

-- 3. Trigger: auto-populate avatar_url when auth_user_id is set or changed
CREATE OR REPLACE FUNCTION public.sync_athlete_avatar()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.auth_user_id IS NOT NULL AND (OLD.auth_user_id IS NULL OR OLD.auth_user_id != NEW.auth_user_id) THEN
    NEW.avatar_url := (
      SELECT COALESCE(
        raw_user_meta_data->>'avatar_url',
        raw_user_meta_data->>'picture'
      )
      FROM auth.users WHERE id = NEW.auth_user_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sync_athlete_avatar
  BEFORE INSERT OR UPDATE OF auth_user_id ON public.athletes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_athlete_avatar();
