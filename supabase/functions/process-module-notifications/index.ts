/**
 * process-module-notifications — Processes queued module status notifications
 * CS-005: Notification Pipeline
 *
 * Reads pending notifications from module_notification_queue,
 * creates in-app notifications (via scheduled_notifications table),
 * and marks them as processed.
 *
 * Triggered by cron or manual invocation.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BATCH_SIZE = 100;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 0. Recover stale "processing" items (older than 5 minutes)
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    await supabase
      .from("module_notification_queue")
      .update({ status: "pending" })
      .eq("status", "processing")
      .lt("created_at", fiveMinAgo);

    // 1. Fetch pending notifications
    const { data: pending, error: fetchError } = await supabase
      .from("module_notification_queue")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) throw fetchError;

    if (!pending || pending.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No pending notifications" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[process-module-notifications] Processing ${pending.length} notifications`);

    // 2. Mark as processing
    const pendingIds = pending.map((n: { id: string }) => n.id);
    const { error: markError } = await supabase
      .from("module_notification_queue")
      .update({ status: "processing" })
      .in("id", pendingIds);

    if (markError) {
      throw new Error(`Failed to mark as processing: ${markError.message}`);
    }

    let successCount = 0;
    let failCount = 0;

    // 3. Process each notification
    for (const notification of pending) {
      try {
        // Create in-app notification via scheduled_notifications
        const { error: insertError } = await supabase
          .from("scheduled_notifications")
          .insert({
            user_id: notification.user_id,
            notification_type: "custom",
            message_template: notification.body || notification.title,
            channel: "in_app",
            status: "sent",
            scheduled_for: new Date().toISOString(),
            sent_at: new Date().toISOString(),
            metadata: {
              source: "module_status_change",
              module_id: notification.module_id,
              notification_type: notification.notification_type,
              old_status: notification.old_status,
              new_status: notification.new_status,
              title: notification.title,
            },
          });

        if (insertError) throw insertError;

        // Mark as sent
        await supabase
          .from("module_notification_queue")
          .update({
            status: "sent",
            processed_at: new Date().toISOString(),
          })
          .eq("id", notification.id);

        successCount++;
      } catch (err) {
        console.error(
          `[process-module-notifications] Failed for ${notification.id}:`,
          (err as Error).message
        );

        // Mark as failed
        await supabase
          .from("module_notification_queue")
          .update({
            status: "failed",
            processed_at: new Date().toISOString(),
            error_message: (err as Error).message,
          })
          .eq("id", notification.id);

        failCount++;
      }
    }

    console.log(
      `[process-module-notifications] Done: ${successCount} sent, ${failCount} failed`
    );

    return new Response(
      JSON.stringify({
        success: true,
        processed: pending.length,
        sent: successCount,
        failed: failCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[process-module-notifications] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
