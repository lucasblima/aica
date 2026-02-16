-- Ensure all existing users have at least 5 lifetime invites.
-- Adds the difference to available_invites so used invites are preserved.
-- Example: user had 3 lifetime, used 1 (available=2) → lifetime=5, available=4

UPDATE public.user_invites
SET available_invites = available_invites + (5 - lifetime_invites),
    lifetime_invites = 5
WHERE lifetime_invites < 5;
