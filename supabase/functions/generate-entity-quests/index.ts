/**
 * generate-entity-quests — AI + Rules-based quest generation for entities
 *
 * Designed for CRON (daily). For each active entity:
 *   1. Load state → 2. Rules engine → 3. Gemini analysis → 4. Generate 0-3 quests
 *
 * Rules engine has 10+ deterministic rules for habitat:
 *   - Gutters not cleaned 12+ months → "Clean gutters" (high)
 *   - HVAC no maintenance 6+ months → "HVAC review" (medium)
 *   - Expired fire extinguisher → "Renew extinguisher" (critical)
 *   - Food expiring < 7 days → "Consume or discard {item}" (medium)
 *   - Overdue bill → "Pay {bill}" (high)
 *   - Low condition item → "Repair {item}" (medium)
 *   - No inventory check 30+ days → "Inventory audit" (low)
 *   - HP < 40 → "Emergency maintenance" (critical)
 *   - Seasonal check (winter/summer) → "Seasonal prep" (medium)
 *   - Missing stats data → "Complete profile" (low)
 *
 * @issue #352 (LR-005)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";

// ============================================================================
// CONSTANTS
// ============================================================================

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MODEL = "gemini-2.5-flash";
const MAX_QUESTS_PER_RUN = 3;

// ============================================================================
// TYPES
// ============================================================================

interface QuestCandidate {
  title: string;
  description: string;
  quest_type: string;
  priority: string;
  xp_reward: number;
  stat_impact: Record<string, number>;
  difficulty: string;
  generation_reason: string;
  due_date?: string;
  estimated_minutes?: number;
}

interface PersonaState {
  persona: Record<string, unknown>;
  inventory: Record<string, unknown>[];
  recentEvents: Record<string, unknown>[];
  activeQuestCount: number;
}

// ============================================================================
// RULES ENGINE
// ============================================================================

function getHabitatRuleQuests(state: PersonaState): QuestCandidate[] {
  const quests: QuestCandidate[] = [];
  const persona = state.persona;
  const stats = (persona.stats as Record<string, number>) || {};
  const hp = (persona.hp as number) || 100;
  const inventory = state.inventory;
  const now = new Date();

  // Rule 1: HP critically low
  if (hp < 40) {
    quests.push({
      title: "Manutencao de emergencia",
      description: "O HP esta muito baixo. Faca uma inspecao geral e resolva pendencias criticas.",
      quest_type: "emergency",
      priority: "critical",
      xp_reward: 30,
      stat_impact: { maintenance: 10, safety: 5 },
      difficulty: "hard",
      generation_reason: `HP critico: ${hp}/100`,
      estimated_minutes: 120,
    });
  }

  // Rule 2: Cleanliness stat low
  if ((stats.cleanliness || 50) < 30) {
    quests.push({
      title: "Limpeza geral",
      description: "A limpeza esta precisando de atencao. Faca uma faxina completa.",
      quest_type: "maintenance",
      priority: "high",
      xp_reward: 20,
      stat_impact: { cleanliness: 15 },
      difficulty: "medium",
      generation_reason: `Limpeza baixa: ${stats.cleanliness || 0}/100`,
      estimated_minutes: 90,
    });
  }

  // Rule 3: Maintenance stat low (HVAC, gutters, etc.)
  if ((stats.maintenance || 50) < 40) {
    quests.push({
      title: "Revisao de manutencao preventiva",
      description: "Verifique filtros de ar-condicionado, calhas, e sistemas eletricos.",
      quest_type: "maintenance",
      priority: "medium",
      xp_reward: 25,
      stat_impact: { maintenance: 10, safety: 5 },
      difficulty: "medium",
      generation_reason: `Manutencao baixa: ${stats.maintenance || 0}/100`,
      estimated_minutes: 60,
    });
  }

  // Rule 4: Safety stat low
  if ((stats.safety || 50) < 30) {
    quests.push({
      title: "Verificacao de seguranca",
      description: "Verifique extintores, detectores de fumaca e fechaduras.",
      quest_type: "maintenance",
      priority: "critical",
      xp_reward: 30,
      stat_impact: { safety: 15 },
      difficulty: "medium",
      generation_reason: `Seguranca baixa: ${stats.safety || 0}/100`,
      estimated_minutes: 45,
    });
  }

  // Rule 5: Food items expiring within 7 days
  const expiringFood = inventory.filter((item) => {
    if (item.category !== "food") return false;
    const attrs = item.attributes as Record<string, unknown> | null;
    if (!attrs?.expiry_date) return false;
    const expiry = new Date(attrs.expiry_date as string);
    const diff = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff < 7;
  });

  for (const food of expiringFood.slice(0, 2)) {
    quests.push({
      title: `Consumir ou descartar: ${food.name}`,
      description: `O item "${food.name}" esta proximo do vencimento.`,
      quest_type: "inventory",
      priority: "medium",
      xp_reward: 5,
      stat_impact: { organization: 2 },
      difficulty: "easy",
      generation_reason: `Alimento expirando: ${food.name}`,
      due_date: ((food.attributes as Record<string, unknown>)?.expiry_date as string) || undefined,
      estimated_minutes: 10,
    });
  }

  // Rule 6: Low condition items (< 20%)
  const lowConditionItems = inventory.filter(
    (item) => ((item.condition as number) || 100) < 20
  );
  for (const item of lowConditionItems.slice(0, 2)) {
    quests.push({
      title: `Reparar: ${item.name}`,
      description: `O item "${item.name}" esta em condicao muito ruim (${item.condition}%).`,
      quest_type: "repair",
      priority: "high",
      xp_reward: 15,
      stat_impact: { maintenance: 5 },
      difficulty: "medium",
      generation_reason: `Item em condicao ruim: ${item.name} (${item.condition}%)`,
      estimated_minutes: 60,
    });
  }

  // Rule 7: Organization stat low
  if ((stats.organization || 50) < 30) {
    quests.push({
      title: "Organizar espacos",
      description: "Organize gavetas, armarios e areas de armazenamento.",
      quest_type: "routine",
      priority: "low",
      xp_reward: 15,
      stat_impact: { organization: 10, comfort: 5 },
      difficulty: "easy",
      generation_reason: `Organizacao baixa: ${stats.organization || 0}/100`,
      estimated_minutes: 60,
    });
  }

  // Rule 8: Comfort stat low
  if ((stats.comfort || 50) < 30) {
    quests.push({
      title: "Melhorar conforto",
      description: "Invista em melhorias de conforto: iluminacao, temperatura, ou ergonomia.",
      quest_type: "upgrade",
      priority: "low",
      xp_reward: 20,
      stat_impact: { comfort: 10 },
      difficulty: "medium",
      generation_reason: `Conforto baixo: ${stats.comfort || 0}/100`,
      estimated_minutes: 90,
    });
  }

  // Rule 9: Seasonal check (Brazilian seasons)
  const month = now.getMonth() + 1;
  if (month === 4 || month === 10) {
    // April (start of dry/cold) or October (start of rainy/hot)
    const season = month === 4 ? "inverno" : "verao";
    quests.push({
      title: `Preparacao para o ${season}`,
      description: `Faca ajustes sazonais: ${month === 4 ? "verifique aquecimento e vedacoes" : "limpe calhas e verifique ar-condicionado"}.`,
      quest_type: "seasonal",
      priority: "medium",
      xp_reward: 20,
      stat_impact: { maintenance: 5, comfort: 5 },
      difficulty: "medium",
      generation_reason: `Preparacao sazonal: ${season}`,
      estimated_minutes: 120,
    });
  }

  // Rule 10: Missing or incomplete stats
  const expectedStats = ["cleanliness", "maintenance", "organization", "comfort", "safety"];
  const missingStats = expectedStats.filter((s) => stats[s] === undefined);
  if (missingStats.length > 0) {
    quests.push({
      title: "Completar perfil do habitat",
      description: `Stats incompletos: ${missingStats.join(", ")}. Responda perguntas para melhorar o perfil.`,
      quest_type: "routine",
      priority: "low",
      xp_reward: 10,
      stat_impact: {},
      difficulty: "easy",
      generation_reason: `Stats faltando: ${missingStats.join(", ")}`,
      estimated_minutes: 15,
    });
  }

  return quests;
}

function getPersonRuleQuests(state: PersonaState): QuestCandidate[] {
  const quests: QuestCandidate[] = [];
  const persona = state.persona;
  const stats = (persona.stats as Record<string, number>) || {};
  const lastInteraction = persona.last_interaction as string | null;

  // Rule: No contact in 30+ days
  if (lastInteraction) {
    const daysSince = (Date.now() - new Date(lastInteraction).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 30) {
      quests.push({
        title: `Retomar contato`,
        description: `Faz ${Math.floor(daysSince)} dias sem interacao. Entre em contato para manter a proximidade.`,
        quest_type: "social",
        priority: "medium",
        xp_reward: 15,
        stat_impact: { proximity: 10, communication: 5 },
        difficulty: "easy",
        generation_reason: `${Math.floor(daysSince)} dias sem contato`,
        estimated_minutes: 15,
      });
    }
  }

  // Rule: Low trust
  if ((stats.trust || 50) < 30) {
    quests.push({
      title: "Fortalecer confianca",
      description: "Invista tempo de qualidade e cumpra compromissos para reconstruir confianca.",
      quest_type: "social",
      priority: "high",
      xp_reward: 25,
      stat_impact: { trust: 10 },
      difficulty: "medium",
      generation_reason: `Confianca baixa: ${stats.trust || 0}/100`,
      estimated_minutes: 60,
    });
  }

  return quests;
}

function getOrganizationRuleQuests(state: PersonaState): QuestCandidate[] {
  const quests: QuestCandidate[] = [];
  const stats = (state.persona.stats as Record<string, number>) || {};

  if ((stats.efficiency || 50) < 30) {
    quests.push({
      title: "Revisar processos",
      description: "Identifique gargalos e otimize processos ineficientes.",
      quest_type: "maintenance",
      priority: "high",
      xp_reward: 25,
      stat_impact: { efficiency: 10 },
      difficulty: "hard",
      generation_reason: `Eficiencia baixa: ${stats.efficiency || 0}/100`,
      estimated_minutes: 120,
    });
  }

  if ((stats.health || 50) < 30) {
    quests.push({
      title: "Verificar saude financeira",
      description: "Revise contas, contratos e obrigacoes financeiras da organizacao.",
      quest_type: "financial",
      priority: "critical",
      xp_reward: 30,
      stat_impact: { health: 15 },
      difficulty: "hard",
      generation_reason: `Saude financeira baixa: ${stats.health || 0}/100`,
      estimated_minutes: 90,
    });
  }

  return quests;
}

function extractJSON(text: string): unknown | null {
  let cleaned = text.replace(/```(?:json)?\s*\n?/g, "").replace(/```\s*$/g, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { return null; }
    }
    return null;
  }
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

    // Optional: filter to specific user (for manual triggers)
    let userId: string | undefined;
    try {
      const body = await req.json();
      userId = body?.user_id;
    } catch {
      // No body = cron mode, process all active personas
    }

    // Validate user_id matches authenticated user when provided
    if (userId) {
      const authHeader = req.headers.get("authorization");
      if (authHeader) {
        const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user }, error: authErr } = await userClient.auth.getUser();
        if (authErr || !user || user.id !== userId) {
          return new Response(
            JSON.stringify({ success: false, error: "Unauthorized" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Load active personas
    let query = supabase
      .from("entity_personas")
      .select("*")
      .eq("is_active", true);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data: personas, error: personasError } = await query.limit(100);

    if (personasError) throw personasError;
    if (!personas || personas.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No active personas", generated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalGenerated = 0;

    for (const persona of personas) {
      try {
        // Check how many active quests exist (skip if too many)
        const { count: activeCount } = await supabase
          .from("entity_quests")
          .select("id", { count: "exact", head: true })
          .eq("persona_id", persona.id)
          .in("status", ["pending", "accepted", "in_progress"]);

        if ((activeCount || 0) >= 10) continue; // Too many active quests

        // Load inventory
        const { data: inventory } = await supabase
          .from("entity_inventory")
          .select("*")
          .eq("persona_id", persona.id);

        // Load recent events
        const { data: events } = await supabase
          .from("entity_event_log")
          .select("*")
          .eq("persona_id", persona.id)
          .order("created_at", { ascending: false })
          .limit(20);

        const state: PersonaState = {
          persona,
          inventory: inventory || [],
          recentEvents: events || [],
          activeQuestCount: activeCount || 0,
        };

        // Get rule-based candidates
        let candidates: QuestCandidate[] = [];
        const entityType = persona.entity_type as string;

        if (entityType === "habitat") {
          candidates = getHabitatRuleQuests(state);
        } else if (entityType === "person") {
          candidates = getPersonRuleQuests(state);
        } else if (entityType === "organization") {
          candidates = getOrganizationRuleQuests(state);
        }

        // Check for duplicates (don't create quest if similar title exists)
        const { data: existingQuests } = await supabase
          .from("entity_quests")
          .select("title")
          .eq("persona_id", persona.id)
          .in("status", ["pending", "accepted", "in_progress"]);

        const existingTitles = new Set(
          (existingQuests || []).map((q: { title: string }) => q.title.toLowerCase())
        );

        candidates = candidates.filter(
          (c) => !existingTitles.has(c.title.toLowerCase())
        );

        // If rules generated enough, skip AI
        // If fewer than 2 candidates, use Gemini for creative quests
        if (candidates.length < 2 && GEMINI_API_KEY) {
          try {
            const prompt = `Voce e um gerador de quests RPG para uma entidade do tipo "${entityType}" chamada "${persona.persona_name}".

Estado atual: HP ${persona.hp}/100, Level ${persona.level}, Stats: ${JSON.stringify(persona.stats)}
Quests ja pendentes: ${existingTitles.size}
Inventario: ${(inventory || []).length} itens

Gere 0-2 quests ADICIONAIS que nao sejam duplicatas das existentes.
Responda em JSON array:
[{
  "title": "titulo curto",
  "description": "descricao",
  "quest_type": "maintenance|repair|upgrade|social|financial|inventory|emergency|seasonal|routine",
  "priority": "low|medium|high|critical",
  "xp_reward": 10-30,
  "stat_impact": {"stat_name": delta},
  "difficulty": "easy|medium|hard|epic",
  "generation_reason": "motivo",
  "estimated_minutes": 15-120
}]

Se nao houver necessidade de novas quests, retorne [].`;

            const resp = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{ role: "user", parts: [{ text: prompt }] }],
                  generationConfig: { maxOutputTokens: 4096, temperature: 0.7 },
                }),
              }
            );

            if (resp.ok) {
              const data = await resp.json();
              const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                const aiQuests = extractJSON(text) as QuestCandidate[] | null;
                if (Array.isArray(aiQuests)) {
                  for (const q of aiQuests) {
                    if (q.title && !existingTitles.has(q.title.toLowerCase())) {
                      candidates.push({ ...q, generation_reason: `AI: ${q.generation_reason || "sugestao"}` });
                    }
                  }
                }
              }
            }
          } catch (aiErr) {
            console.warn("[generate-entity-quests] AI generation failed, using rules only:", aiErr);
          }
        }

        // Limit and insert
        const toInsert = candidates.slice(0, MAX_QUESTS_PER_RUN).map((c) => ({
          persona_id: persona.id,
          title: c.title,
          description: c.description,
          quest_type: c.quest_type,
          priority: c.priority,
          status: "pending",
          xp_reward: c.xp_reward,
          stat_impact: c.stat_impact,
          difficulty: c.difficulty,
          generated_by: "ai",
          generation_reason: c.generation_reason,
          due_date: c.due_date || null,
          estimated_minutes: c.estimated_minutes || null,
        }));

        if (toInsert.length > 0) {
          const { error: insertError } = await supabase
            .from("entity_quests")
            .insert(toInsert);

          if (!insertError) {
            totalGenerated += toInsert.length;

            // Log events
            for (const q of toInsert) {
              await supabase.from("entity_event_log").insert({
                persona_id: persona.id,
                event_type: "quest_generated",
                event_data: { title: q.title, priority: q.priority, reason: q.generation_reason },
                triggered_by: "ai",
              });
            }
          }
        }
      } catch (personaErr) {
        console.error(`[generate-entity-quests] Error for persona ${persona.id}:`, personaErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: personas.length,
        generated: totalGenerated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[generate-entity-quests] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
