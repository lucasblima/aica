/**
 * process-workout-automations Edge Function
 *
 * Scheduled execution of workout automation engine
 * Runs every 5 minutes via Cloud Scheduler
 *
 * Detects triggers (microcycle start, low adherence, trial expiring, etc.)
 * and executes actions (send WhatsApp, create alert, etc.)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// CORS
// ============================================================================

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://dev.aica.guru',
  'https://aica.guru',
];

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Authenticate: require cron secret or valid JWT
  const cronSecret = req.headers.get('x-cron-secret');
  const expectedSecret = Deno.env.get('CRON_SECRET');
  const authHeader = req.headers.get('Authorization');

  if (!cronSecret && !authHeader) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (cronSecret && cronSecret !== expectedSecret) {
    return new Response(
      JSON.stringify({ error: 'Invalid cron secret' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[AutomationEngine] Starting automation processing...');

    // Get all users with active automations
    const { data: automations, error: automationsError } = await supabase
      .from('workout_automations')
      .select('user_id')
      .eq('is_active', true);

    if (automationsError) {
      throw automationsError;
    }

    if (!automations || automations.length === 0) {
      console.log('[AutomationEngine] No active automations found');
      return new Response(
        JSON.stringify({ success: true, message: 'No active automations', results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get unique user IDs
    const userIds = [...new Set(automations.map((a) => a.user_id))];
    console.log(`[AutomationEngine] Processing automations for ${userIds.length} users`);

    const allResults = [];

    // Process each user's automations
    for (const userId of userIds) {
      try {
        const userResults = await processUserAutomations(supabase, userId);
        allResults.push(...userResults);
      } catch (error) {
        console.error(`[AutomationEngine] Error processing user ${userId}:`, error);
        allResults.push({
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const triggeredCount = allResults.filter((r) => r.triggered).length;
    const executedCount = allResults.filter((r) => r.actionExecuted).length;

    console.log(
      `[AutomationEngine] Complete - ${triggeredCount} triggered, ${executedCount} executed`
    );

    return new Response(
      JSON.stringify({
        success: true,
        totalProcessed: allResults.length,
        triggered: triggeredCount,
        executed: executedCount,
        results: allResults,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[AutomationEngine] Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Process all automations for a single user
 */
async function processUserAutomations(supabase: any, userId: string) {
  const results = [];

  // Fetch all active automations for user
  const { data: automations, error } = await supabase
    .from('workout_automations')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) throw error;
  if (!automations || automations.length === 0) return results;

  console.log(`[AutomationEngine] Processing ${automations.length} automations for user ${userId}`);

  // Process each automation
  for (const automation of automations) {
    try {
      const result = await processAutomation(supabase, automation);
      results.push(result);

      if (result.triggered && result.actionExecuted) {
        // Update automation stats
        await supabase
          .from('workout_automations')
          .update({
            last_triggered_at: new Date().toISOString(),
            times_triggered: automation.times_triggered + 1,
          })
          .eq('id', automation.id);
      }
    } catch (error) {
      console.error(`[AutomationEngine] Error processing automation ${automation.id}:`, error);
      results.push({
        automationId: automation.id,
        triggered: false,
        actionExecuted: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

/**
 * Process a single automation: evaluate trigger + execute action
 */
async function processAutomation(supabase: any, automation: any) {
  // 1. Evaluate trigger
  const evaluation = await evaluateTrigger(supabase, automation);

  if (!evaluation.shouldTrigger) {
    return {
      automationId: automation.id,
      triggered: false,
      actionExecuted: false,
      reason: evaluation.reason,
    };
  }

  // 2. Execute action
  try {
    const actionResult = await executeAction(supabase, automation, evaluation.context);

    return {
      automationId: automation.id,
      triggered: true,
      actionExecuted: true,
      details: actionResult,
    };
  } catch (error) {
    return {
      automationId: automation.id,
      triggered: true,
      actionExecuted: false,
      error: error instanceof Error ? error.message : 'Action execution failed',
    };
  }
}

/**
 * Evaluate trigger conditions
 */
async function evaluateTrigger(supabase: any, automation: any) {
  switch (automation.trigger_type) {
    case 'microcycle_starts':
      return await checkMicrocycleStart(supabase, automation);

    case 'consistency_drops':
      return await checkConsistencyDrops(supabase, automation);

    case 'trial_expiring':
      return await checkTrialExpiring(supabase, automation);

    case 'weekly_summary':
      return checkWeeklySummary();

    default:
      return {
        shouldTrigger: false,
        reason: `Trigger type ${automation.trigger_type} not implemented`,
      };
  }
}

/**
 * Check if microcycle just started
 */
async function checkMicrocycleStart(supabase: any, automation: any) {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  let query = supabase
    .from('microcycles')
    .select('*, athlete_profiles!inner(*)')
    .eq('user_id', automation.user_id)
    .eq('status', 'active')
    .gte('updated_at', fiveMinutesAgo);

  if (automation.applies_to_athletes && automation.applies_to_athletes.length > 0) {
    query = query.in('athlete_id', automation.applies_to_athletes);
  }

  const { data: microcycles, error } = await query;

  if (error) throw error;

  if (microcycles && microcycles.length > 0) {
    return { shouldTrigger: true, context: { microcycles } };
  }

  return { shouldTrigger: false, reason: 'No recently started microcycles' };
}

/**
 * Check if consistency dropped
 */
async function checkConsistencyDrops(supabase: any, automation: any) {
  const threshold = automation.trigger_config?.consistency_threshold || 70;

  let query = supabase
    .from('athlete_profiles')
    .select('*')
    .eq('user_id', automation.user_id)
    .lt('consistency_rate', threshold);

  if (automation.applies_to_athletes && automation.applies_to_athletes.length > 0) {
    query = query.in('athlete_id', automation.applies_to_athletes);
  }

  const { data: athletes, error } = await query;

  if (error) throw error;

  if (athletes && athletes.length > 0) {
    return { shouldTrigger: true, context: { athletes, threshold } };
  }

  return { shouldTrigger: false, reason: `No athletes with consistency < ${threshold}%` };
}

/**
 * Check if trial expiring
 */
async function checkTrialExpiring(supabase: any, automation: any) {
  const daysBeforeExpiry = automation.trigger_config?.days_before_expiry || 3;

  const today = new Date();
  const expiryDate = new Date();
  expiryDate.setDate(today.getDate() + daysBeforeExpiry);

  const { data: athletes, error } = await supabase
    .from('athletes')
    .select('*')
    .eq('user_id', automation.user_id)
    .eq('status', 'trial')
    .gte('trial_expires_at', today.toISOString())
    .lte('trial_expires_at', expiryDate.toISOString());

  if (error) throw error;

  if (athletes && athletes.length > 0) {
    return { shouldTrigger: true, context: { athletes, daysBeforeExpiry } };
  }

  return { shouldTrigger: false, reason: `No trials expiring in ${daysBeforeExpiry} days` };
}

/**
 * Check if it's time for weekly summary
 */
function checkWeeklySummary() {
  const today = new Date();
  if (today.getDay() === 0) {
    // Sunday
    return { shouldTrigger: true, context: { day: 'Sunday' } };
  }
  return { shouldTrigger: false, reason: 'Not Sunday' };
}

/**
 * Execute action
 */
async function executeAction(supabase: any, automation: any, context?: any) {
  switch (automation.action_type) {
    case 'send_whatsapp':
      return await executeSendWhatsApp(supabase, automation, context);

    case 'create_alert':
      return await executeCreateAlert(supabase, automation, context);

    default:
      throw new Error(`Action type ${automation.action_type} not implemented`);
  }
}

/**
 * Send WhatsApp via notification-sender
 */
async function executeSendWhatsApp(supabase: any, automation: any, context?: any) {
  const messageTemplateId = automation.action_config?.message_template_id;
  if (!messageTemplateId) throw new Error('No message template configured');

  const { data: template, error: templateError } = await supabase
    .from('coach_messages')
    .select('*')
    .eq('id', messageTemplateId)
    .single();

  if (templateError || !template) throw new Error('Message template not found');

  const athletes = context?.athletes || context?.microcycles?.map((m: any) => m.athlete_profiles) || [];
  if (athletes.length === 0) throw new Error('No target athletes');

  let messagesSent = 0;

  for (const athlete of athletes) {
    try {
      await supabase.from('scheduled_notifications').insert({
        user_id: automation.user_id,
        target_phone: athlete.phone,
        target_name: athlete.name,
        notification_type: 'automation',
        message_template: template.message_template,
        message_variables: {
          athlete_name: athlete.name,
          consistency_rate: athlete.consistency_rate || 0,
        },
        scheduled_for: new Date().toISOString(),
        timezone: 'America/Sao_Paulo',
        status: 'scheduled',
        priority: 8,
      });

      messagesSent++;
    } catch (error) {
      console.error(`Error sending WhatsApp to ${athlete.name}:`, error);
    }
  }

  return `Sent ${messagesSent} WhatsApp message(s)`;
}

/**
 * Create alert
 */
async function executeCreateAlert(supabase: any, automation: any, context?: any) {
  const severity = automation.action_config?.alert_severity || 'medium';
  const athletes = context?.athletes || [];

  let alertsCreated = 0;

  for (const athlete of athletes) {
    try {
      await supabase.from('alerts').insert({
        user_id: automation.user_id,
        athlete_id: athlete.athlete_id || athlete.id,
        alert_type: 'motivation',
        severity,
        keywords_detected: [],
        message_preview: `Automation triggered: ${automation.name}`,
        feedback_id: null,
      });

      alertsCreated++;
    } catch (error) {
      console.error(`Error creating alert for ${athlete.name}:`, error);
    }
  }

  return `Created ${alertsCreated} alert(s)`;
}
