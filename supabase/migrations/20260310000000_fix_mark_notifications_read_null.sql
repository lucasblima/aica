-- ============================================================================
-- Fix: mark_notifications_read RPC — handle NULL array for "mark all"
-- When p_notification_ids IS NULL, mark ALL unread notifications for the user.
-- Previously, ANY(NULL) matched nothing, causing markAllAsRead to silently fail.
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_notifications_read(p_user_id UUID, p_notification_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE agent_notifications
  SET read_at = NOW()
  WHERE user_id = p_user_id
    AND (p_notification_ids IS NULL OR id = ANY(p_notification_ids))
    AND read_at IS NULL;
END;
$$;
