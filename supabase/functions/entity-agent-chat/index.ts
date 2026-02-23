/**
 * entity-agent-chat — AI agent that speaks AS an entity persona (first person)
 *
 * Pipeline:
 *   1. Load persona + stats + pending quests + inventory summary
 *   2. Load last 20 events from event_log
 *   3. Load pending feedback_queue items
 *   4. Build system prompt with persona voice
 *   5. Call Gemini Flash with structured output schema
 *   6. Rate limit: 50 msgs/day per persona
 *   7. Log to event_log
 *
 * @issue #349 (LR-002)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";
import { withHealthTracking } from "../_shared/health-tracker.ts";

// ============================================================================
// CONSTANTS
// ============================================================================

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const RATE_LIMIT_PER_DAY = 50;
const MODEL = "gemini-2.5-flash";

// ============================================================================
// TYPES
// ============================================================================

interface ChatRequest {
  persona_id: string;
  message: string;
  history?: Array<{ role: string; content: string }>;
}

interface GeminiMessage {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

// ============================================================================
// HELPERS
// ============================================================================

function extractJSON(text: string): Record<string, unknown> | null {
  // Strip code fences FIRST
  let cleaned = text.replace(/```(?:json)?\s*\n?/g, "").replace(/```\s*$/g, "");
  // Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to find JSON object in text
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function buildSystemPrompt(persona: Record<string, unknown>, context: {
  quests: unknown[];
  events: unknown[];
  inventory: Record<string, unknown>;
  feedback: unknown[];
}): string {
  const name = persona.persona_name as string;
  const entityType = persona.entity_type as string;
  const voice = persona.persona_voice as string || "neutral";
  const traits = (persona.personality_traits as string[]) || [];
  const stats = persona.stats as Record<string, number> || {};
  const hp = persona.hp as number;
  const level = persona.level as number;
  const knowledge = persona.knowledge_summary as string || "Ainda nao tenho muitas informacoes.";

  const voiceInstructions: Record<string, string> = {
    neutral: "Tom equilibrado e informativo.",
    formal: "Tom formal e respeitoso, sem girias.",
    casual: "Tom descontraido e amigavel, pode usar girias leves.",
    playful: "Tom divertido e brincalhao, use humor quando apropriado.",
    serious: "Tom serio e direto, focado em eficiencia.",
    caring: "Tom caloroso e cuidadoso, demonstre preocupacao genuina.",
  };

  const statsDesc = Object.entries(stats)
    .map(([k, v]) => `  - ${k}: ${v}/100`)
    .join("\n") || "  (nenhuma stat definida ainda)";

  const questsDesc = context.quests.length > 0
    ? (context.quests as Array<Record<string, unknown>>).map(
        (q) => `  - [${q.priority}] ${q.title} (${q.status})`
      ).join("\n")
    : "  (nenhuma quest pendente)";

  const eventsDesc = context.events.length > 0
    ? (context.events as Array<Record<string, unknown>>).slice(0, 5).map(
        (e) => `  - ${e.event_type}: ${JSON.stringify(e.event_data).slice(0, 80)}`
      ).join("\n")
    : "  (nenhum evento recente)";

  const invDesc = `Total de itens: ${context.inventory.totalItems || 0}, valor total: R$${context.inventory.totalValue || 0}, itens em condicao ruim: ${context.inventory.lowConditionCount || 0}`;

  return `Voce e "${name}", um(a) ${entityType} no sistema Life RPG do AICA.

REGRAS ABSOLUTAS:
- Fale SEMPRE em 1a pessoa, como se voce FOSSE a entidade ("Eu sou...", "Meu estado...", "Preciso de...")
- NUNCA diga "o usuario" ou "o dono" — fale diretamente com a pessoa que cuida de voce
- Use PT-BR ${voice === "formal" ? "formal" : "informal e acessivel"}
- ${voiceInstructions[voice] || voiceInstructions.neutral}
- Se NAO souber algo, PERGUNTE — nunca invente informacoes
- Sugira acoes quando identificar necessidades
- Tracos de personalidade: ${traits.length > 0 ? traits.join(", ") : "nenhum definido"}

MEU ESTADO ATUAL:
- HP: ${hp}/100
- Level: ${level}
- Stats:
${statsDesc}

MINHAS QUESTS PENDENTES:
${questsDesc}

EVENTOS RECENTES:
${eventsDesc}

MEU INVENTARIO:
${invDesc}

MINHA BASE DE CONHECIMENTO:
${knowledge}

INSTRUCOES DE RESPOSTA:
Responda em JSON com este schema:
{
  "response": "sua resposta como a entidade",
  "tone": "friendly|concerned|proud|urgent|neutral",
  "suggested_actions": [{"type": "quest|inventory_check|feedback|maintenance", "label": "acao curta", "description": "descricao"}],
  "feedback_question": {"question": "pergunta", "question_type": "profile_completion|preference_discovery|state_verification|context|decision|feedback", "priority": 5} ou null,
  "knowledge_gap_detected": true/false
}`;
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
    // Auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: ChatRequest = await req.json();
    const { persona_id, message, history = [] } = body;

    if (!persona_id || !message) {
      return new Response(
        JSON.stringify({ success: false, error: "persona_id and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load persona
    const { data: persona, error: personaError } = await supabase
      .from("entity_personas")
      .select("*")
      .eq("id", persona_id)
      .eq("user_id", user.id)
      .single();

    if (personaError || !persona) {
      return new Response(
        JSON.stringify({ success: false, error: "Persona not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit check
    const today = new Date().toISOString().split("T")[0];
    const { count: msgCount } = await supabase
      .from("entity_event_log")
      .select("id", { count: "exact", head: true })
      .eq("persona_id", persona_id)
      .eq("event_type", "agent_chat")
      .gte("created_at", `${today}T00:00:00Z`);

    if ((msgCount || 0) >= RATE_LIMIT_PER_DAY) {
      return new Response(
        JSON.stringify({ success: false, error: "Rate limit exceeded (50 msgs/day per persona)" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load context
    const [questsRes, eventsRes, inventoryRes, feedbackRes] = await Promise.all([
      supabase
        .from("entity_quests")
        .select("id, title, description, quest_type, priority, status, xp_reward, difficulty, due_date")
        .eq("persona_id", persona_id)
        .not("status", "in", '("completed","skipped","failed")')
        .order("priority", { ascending: false })
        .limit(10),
      supabase
        .from("entity_event_log")
        .select("id, event_type, event_data, triggered_by, created_at")
        .eq("persona_id", persona_id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.rpc("get_persona_dashboard", { p_persona_id: persona_id }),
      supabase
        .from("entity_feedback_queue")
        .select("id, question, question_type, priority")
        .eq("persona_id", persona_id)
        .eq("status", "pending")
        .order("priority", { ascending: false })
        .limit(5),
    ]);

    const inventorySummary = inventoryRes.data?.inventorySummary || {
      totalItems: 0,
      totalValue: 0,
      lowConditionCount: 0,
      expiringCount: 0,
    };

    // Build system prompt
    const systemPrompt = buildSystemPrompt(persona, {
      quests: questsRes.data || [],
      events: eventsRes.data || [],
      inventory: inventorySummary,
      feedback: feedbackRes.data || [],
    });

    // Build Gemini messages
    const geminiHistory: GeminiMessage[] = history.map((h) => ({
      role: h.role === "user" ? "user" : "model",
      parts: [{ text: h.content }],
    }));

    geminiHistory.push({
      role: "user",
      parts: [{ text: message }],
    });

    // Call Gemini
    const geminiResponse = await withHealthTracking(
      { functionName: "entity-agent-chat", actionName: "chat" },
      supabase,
      async () => {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents: geminiHistory,
              generationConfig: {
                maxOutputTokens: 4096,
                temperature: 0.8,
              },
            }),
          }
        );

        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`Gemini API error ${resp.status}: ${errText}`);
        }

        const data = await resp.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("Empty Gemini response");
        return text;
      }
    );

    // Parse structured response
    const parsed = extractJSON(geminiResponse as string);
    const agentResponse = parsed || {
      response: geminiResponse as string,
      tone: "neutral",
      suggested_actions: [],
      feedback_question: null,
      knowledge_gap_detected: false,
    };

    // Log event
    await supabase.from("entity_event_log").insert({
      persona_id,
      event_type: "agent_chat",
      event_data: {
        user_message: message.slice(0, 200),
        agent_response: ((agentResponse as Record<string, unknown>).response as string || "").slice(0, 200),
        tone: (agentResponse as Record<string, unknown>).tone,
        knowledge_gap: (agentResponse as Record<string, unknown>).knowledge_gap_detected,
      },
      triggered_by: "user",
    });

    // Update last_interaction
    await supabase
      .from("entity_personas")
      .update({ last_interaction: new Date().toISOString() })
      .eq("id", persona_id);

    // If feedback question was generated, save it
    const feedbackQ = (agentResponse as Record<string, unknown>).feedback_question as Record<string, unknown> | null;
    if (feedbackQ && feedbackQ.question) {
      await supabase.from("entity_feedback_queue").insert({
        persona_id,
        user_id: user.id,
        question: feedbackQ.question,
        question_type: feedbackQ.question_type || "context",
        priority: feedbackQ.priority || 5,
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    return new Response(
      JSON.stringify({ success: true, data: agentResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[entity-agent-chat] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
