/**
 * calculate-entity-decay — Weekly HP and stat decay for entities
 *
 * Designed for CRON (weekly).
 *
 * Decay rules by entity type:
 *   Habitat:
 *     -2 cleanliness/month without cleaning quest completed
 *     -5 HP per overdue maintenance quest
 *     -3 HP per expired food in inventory
 *     -10 HP per critical quest ignored 30+ days
 *
 *   Person:
 *     -10 proximity after 30 days no contact
 *     -5 trust after 90 days
 *     -15 trust if forgotten birthday (future enhancement)
 *
 *   Organization:
 *     -10 efficiency if project delayed
 *     -15 health if overdue bill
 *
 * Notifications:
 *   HP < 50 → warning
 *   HP < 30 → critical
 *   Stat < 20 → auto-generate quest
 *
 * Recovery:
 *   Quest complete → +5 HP (handled by complete_entity_quest RPC)
 *   Feedback answered → +2 HP (handled by useFeedbackQueue)
 *   Item added → +1 HP
 *
 * @issue #354 (LR-007)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";

// ============================================================================
// CONSTANTS
// ============================================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ============================================================================
// TYPES
// ============================================================================

interface DecayResult {
  persona_id: string;
  persona_name: string;
  old_hp: number;
  new_hp: number;
  stat_changes: Record<string, { old: number; new: number }>;
  reasons: string[];
  notifications: string[];
}

// ============================================================================
// DECAY CALCULATORS
// ============================================================================

async function calculateHabitatDecay(
  supabase: ReturnType<typeof createClient>,
  persona: Record<string, unknown>
): Promise<DecayResult> {
  const result: DecayResult = {
    persona_id: persona.id as string,
    persona_name: persona.persona_name as string,
    old_hp: persona.hp as number,
    new_hp: persona.hp as number,
    stat_changes: {},
    reasons: [],
    notifications: [],
  };

  const stats = { ...(persona.stats as Record<string, number> || {}) };

  // Check overdue quests (30+ days)
  const { data: overdueQuests } = await supabase
    .from("entity_quests")
    .select("id, title, priority, created_at")
    .eq("persona_id", persona.id as string)
    .in("status", ["pending", "accepted"])
    .lt("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  if (overdueQuests) {
    for (const quest of overdueQuests) {
      if (quest.priority === "critical") {
        result.new_hp -= 10;
        result.reasons.push(`-10 HP: quest critica ignorada 30+ dias: "${quest.title}"`);
      } else {
        result.new_hp -= 5;
        result.reasons.push(`-5 HP: quest pendente 30+ dias: "${quest.title}"`);
      }
    }
  }

  // Check expired food in inventory
  const { data: expiredFood } = await supabase
    .from("entity_inventory")
    .select("id, name, attributes")
    .eq("persona_id", persona.id as string)
    .eq("category", "food");

  if (expiredFood) {
    const now = new Date();
    for (const item of expiredFood) {
      const attrs = item.attributes as Record<string, unknown> | null;
      if (attrs?.expiry_date) {
        const expiry = new Date(attrs.expiry_date as string);
        if (expiry < now) {
          result.new_hp -= 3;
          result.reasons.push(`-3 HP: alimento expirado: "${item.name}"`);
        }
      }
    }
  }

  // Cleanliness decay: -2/month if no cleaning quest completed recently
  const { count: recentCleaningQuests } = await supabase
    .from("entity_quests")
    .select("id", { count: "exact", head: true })
    .eq("persona_id", persona.id as string)
    .eq("status", "completed")
    .eq("quest_type", "maintenance")
    .gte("completed_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  if ((recentCleaningQuests || 0) === 0 && stats.cleanliness !== undefined) {
    const oldVal = stats.cleanliness;
    stats.cleanliness = Math.max(0, stats.cleanliness - 2);
    if (oldVal !== stats.cleanliness) {
      result.stat_changes.cleanliness = { old: oldVal, new: stats.cleanliness };
      result.reasons.push(`-2 limpeza: sem manutencao no ultimo mes`);
    }
  }

  // Maintenance decay if no maintenance quest completed
  if ((recentCleaningQuests || 0) === 0 && stats.maintenance !== undefined) {
    const oldVal = stats.maintenance;
    stats.maintenance = Math.max(0, stats.maintenance - 1);
    if (oldVal !== stats.maintenance) {
      result.stat_changes.maintenance = { old: oldVal, new: stats.maintenance };
    }
  }

  result.new_hp = Math.max(0, result.new_hp);

  // Update persona
  if (result.new_hp !== result.old_hp || Object.keys(result.stat_changes).length > 0) {
    await supabase
      .from("entity_personas")
      .update({ hp: result.new_hp, stats })
      .eq("id", persona.id as string);
  }

  return result;
}

async function calculatePersonDecay(
  supabase: ReturnType<typeof createClient>,
  persona: Record<string, unknown>
): Promise<DecayResult> {
  const result: DecayResult = {
    persona_id: persona.id as string,
    persona_name: persona.persona_name as string,
    old_hp: persona.hp as number,
    new_hp: persona.hp as number,
    stat_changes: {},
    reasons: [],
    notifications: [],
  };

  const stats = { ...(persona.stats as Record<string, number> || {}) };
  const lastInteraction = persona.last_interaction as string | null;

  if (lastInteraction) {
    const daysSince = (Date.now() - new Date(lastInteraction).getTime()) / (1000 * 60 * 60 * 24);

    // -10 proximity after 30 days
    if (daysSince > 30 && stats.proximity !== undefined) {
      const oldVal = stats.proximity;
      stats.proximity = Math.max(0, stats.proximity - 10);
      result.stat_changes.proximity = { old: oldVal, new: stats.proximity };
      result.new_hp -= 5;
      result.reasons.push(`-10 proximidade, -5 HP: ${Math.floor(daysSince)} dias sem contato`);
    }

    // -5 trust after 90 days
    if (daysSince > 90 && stats.trust !== undefined) {
      const oldVal = stats.trust;
      stats.trust = Math.max(0, stats.trust - 5);
      result.stat_changes.trust = { old: oldVal, new: stats.trust };
      result.reasons.push(`-5 confianca: ${Math.floor(daysSince)} dias sem contato`);
    }
  }

  result.new_hp = Math.max(0, result.new_hp);

  if (result.new_hp !== result.old_hp || Object.keys(result.stat_changes).length > 0) {
    await supabase
      .from("entity_personas")
      .update({ hp: result.new_hp, stats })
      .eq("id", persona.id as string);
  }

  return result;
}

async function calculateOrganizationDecay(
  supabase: ReturnType<typeof createClient>,
  persona: Record<string, unknown>
): Promise<DecayResult> {
  const result: DecayResult = {
    persona_id: persona.id as string,
    persona_name: persona.persona_name as string,
    old_hp: persona.hp as number,
    new_hp: persona.hp as number,
    stat_changes: {},
    reasons: [],
    notifications: [],
  };

  const stats = { ...(persona.stats as Record<string, number> || {}) };

  // Check overdue financial quests
  const { count: overdueFinancial } = await supabase
    .from("entity_quests")
    .select("id", { count: "exact", head: true })
    .eq("persona_id", persona.id as string)
    .eq("quest_type", "financial")
    .in("status", ["pending", "accepted"])
    .lt("due_date", new Date().toISOString().split("T")[0]);

  if ((overdueFinancial || 0) > 0) {
    result.new_hp -= 15;
    if (stats.health !== undefined) {
      const oldVal = stats.health;
      stats.health = Math.max(0, stats.health - 15);
      result.stat_changes.health = { old: oldVal, new: stats.health };
    }
    result.reasons.push(`-15 HP, -15 saude: ${overdueFinancial} contas atrasadas`);
  }

  // Check overdue project quests
  const { count: overdueProjects } = await supabase
    .from("entity_quests")
    .select("id", { count: "exact", head: true })
    .eq("persona_id", persona.id as string)
    .not("quest_type", "eq", "financial")
    .in("status", ["pending", "accepted"])
    .lt("due_date", new Date().toISOString().split("T")[0]);

  if ((overdueProjects || 0) > 0) {
    if (stats.efficiency !== undefined) {
      const oldVal = stats.efficiency;
      stats.efficiency = Math.max(0, stats.efficiency - 10);
      result.stat_changes.efficiency = { old: oldVal, new: stats.efficiency };
    }
    result.new_hp -= 10;
    result.reasons.push(`-10 HP, -10 eficiencia: ${overdueProjects} projetos atrasados`);
  }

  result.new_hp = Math.max(0, result.new_hp);

  if (result.new_hp !== result.old_hp || Object.keys(result.stat_changes).length > 0) {
    await supabase
      .from("entity_personas")
      .update({ hp: result.new_hp, stats })
      .eq("id", persona.id as string);
  }

  return result;
}

// ============================================================================
// NOTIFICATION HELPERS
// ============================================================================

function generateNotifications(result: DecayResult): string[] {
  const notifications: string[] = [];

  if (result.new_hp < 30 && result.old_hp >= 30) {
    notifications.push(`CRITICO: ${result.persona_name} HP caiu para ${result.new_hp}! Acao imediata necessaria.`);
  } else if (result.new_hp < 50 && result.old_hp >= 50) {
    notifications.push(`ALERTA: ${result.persona_name} HP em ${result.new_hp}. Precisa de atencao.`);
  }

  for (const [stat, change] of Object.entries(result.stat_changes)) {
    if (change.new < 20 && change.old >= 20) {
      notifications.push(`ALERTA: ${result.persona_name} - ${stat} muito baixo (${change.new}/100). Quest automatica sera gerada.`);
    }
  }

  return notifications;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Load all active personas
    const { data: personas, error: personasError } = await supabase
      .from("entity_personas")
      .select("*")
      .eq("is_active", true)
      .limit(200);

    if (personasError) throw personasError;
    if (!personas || personas.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No active personas", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: DecayResult[] = [];

    for (const persona of personas) {
      try {
        let decayResult: DecayResult;

        switch (persona.entity_type) {
          case "habitat":
            decayResult = await calculateHabitatDecay(supabase, persona);
            break;
          case "person":
            decayResult = await calculatePersonDecay(supabase, persona);
            break;
          case "organization":
            decayResult = await calculateOrganizationDecay(supabase, persona);
            break;
          default:
            continue;
        }

        // Generate notifications
        const notifications = generateNotifications(decayResult);
        decayResult.notifications = notifications;

        // Log decay events
        if (decayResult.reasons.length > 0) {
          await supabase.from("entity_event_log").insert({
            persona_id: decayResult.persona_id,
            event_type: "decay_applied",
            event_data: {
              old_hp: decayResult.old_hp,
              new_hp: decayResult.new_hp,
              stat_changes: decayResult.stat_changes,
              reasons: decayResult.reasons,
            },
            triggered_by: "cron",
          });
        }

        // Insert notifications into scheduled_notifications (if table exists)
        for (const notif of notifications) {
          try {
            await supabase.from("scheduled_notifications").insert({
              user_id: persona.user_id,
              title: `Life RPG: ${persona.persona_name}`,
              body: notif,
              channel: "in_app",
              scheduled_for: new Date().toISOString(),
              status: "pending",
              metadata: {
                source: "liferpg_decay",
                persona_id: decayResult.persona_id,
              },
            });
          } catch {
            // scheduled_notifications table may not exist, skip silently
          }
        }

        results.push(decayResult);
      } catch (personaErr) {
        console.error(`[calculate-entity-decay] Error for persona ${persona.id}:`, personaErr);
      }
    }

    const totalDecayed = results.filter((r) => r.reasons.length > 0).length;
    const totalNotifications = results.reduce((sum, r) => sum + r.notifications.length, 0);

    return new Response(
      JSON.stringify({
        success: true,
        processed: personas.length,
        decayed: totalDecayed,
        notifications: totalNotifications,
        details: results.filter((r) => r.reasons.length > 0),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[calculate-entity-decay] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
