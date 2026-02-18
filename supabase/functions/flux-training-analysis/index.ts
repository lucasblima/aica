/**
 * flux-training-analysis — AI-powered training load analysis for Flux module
 *
 * Actions:
 *   - analyze_load: Analyze weekly training load and provide personalized suggestions
 *   - suggest_recovery: Suggest recovery strategies based on fatigue indicators
 *   - weekly_training_summary: Generate a weekly training narrative summary
 *
 * Uses Gemini 2.5 Flash via REST API (raw fetch, no SDK).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";
import { withHealthTracking } from "../_shared/health-tracker.ts";

// ============================================================================
// TYPES
// ============================================================================

interface WorkoutData {
  id: string;
  name: string;
  duration: number;
  intensity: "low" | "medium" | "high";
  modality: string;
  type?: string;
  sets?: number;
  reps?: string;
  rest?: string;
  notes?: string;
}

interface AnalyzeLoadPayload {
  weekWorkouts: WorkoutData[];
  athleteProfile: {
    level: string;
    ftp?: number;
    pace_threshold?: string;
  };
}

interface SuggestRecoveryPayload {
  recentWorkouts: WorkoutData[];
  fatigueLevel: number; // 1-10
  sleepQuality?: number; // 1-10
}

interface WeeklySummaryPayload {
  weekWorkouts: WorkoutData[];
  athleteLevel: string;
}

interface LoadAnalysisResult {
  suggestions: Array<{
    type: "warning" | "success" | "info";
    text: string;
  }>;
  adjustments: Array<{
    dayOfWeek: number;
    workoutId: string;
    adjustment: "reduce" | "increase" | "remove";
    percentage?: number;
    reason: string;
  }>;
  loadLevel: "low" | "moderate" | "high" | "overload";
  tssEstimate: number;
  narrative: string;
}

// ============================================================================
// GEMINI CALL (raw fetch, no SDK)
// ============================================================================

async function callGemini(prompt: string, geminiApiKey: string): Promise<string> {
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

  const response = await fetch(geminiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
      },
      thinkingConfig: { thinkingBudget: 0 },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText.substring(0, 300)}`);
  }

  const data = await response.json();

  // Filter out thinking tokens — only keep non-thought parts
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const textParts = parts.filter((p: { thought?: boolean }) => !p.thought);
  const text = textParts.map((p: { text?: string }) => p.text || "").join("");

  if (!text) {
    throw new Error("Gemini returned empty response");
  }

  return text;
}

// ============================================================================
// extractJSON helper
// ============================================================================

function extractJSON<T>(raw: string): T {
  // Strip code fences FIRST
  let cleaned = raw.replace(/```(?:json)?\s*\n?/g, "").replace(/```\s*$/g, "");

  // Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to find JSON object/array in the text
    const jsonMatch = cleaned.match(/[\[{][\s\S]*[\]}]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error(`Failed to extract JSON from: ${cleaned.substring(0, 200)}`);
  }
}

// ============================================================================
// ACTION HANDLERS
// ============================================================================

async function handleAnalyzeLoad(
  payload: AnalyzeLoadPayload,
  geminiApiKey: string,
): Promise<LoadAnalysisResult> {
  const { weekWorkouts, athleteProfile } = payload;

  if (!weekWorkouts || weekWorkouts.length === 0) {
    return {
      suggestions: [{ type: "info", text: "Nenhum treino na semana para analisar." }],
      adjustments: [],
      loadLevel: "low",
      tssEstimate: 0,
      narrative: "Semana sem treinos programados.",
    };
  }

  const workoutSummary = weekWorkouts
    .map(
      (w, i) =>
        `Treino ${i + 1}: ${w.name} - ${w.duration}min, intensidade ${w.intensity}, modalidade ${w.modality}${w.type ? `, tipo ${w.type}` : ""}${w.sets ? `, ${w.sets} series` : ""}`,
    )
    .join("\n");

  const prompt = `Voce e um preparador fisico esportivo brasileiro experiente. Analise a carga de treino semanal deste atleta e responda em JSON.

PERFIL DO ATLETA:
- Nivel: ${athleteProfile.level}
${athleteProfile.ftp ? `- FTP: ${athleteProfile.ftp}W` : ""}
${athleteProfile.pace_threshold ? `- Pace limiar: ${athleteProfile.pace_threshold}` : ""}

TREINOS DA SEMANA:
${workoutSummary}

Responda EXCLUSIVAMENTE com um JSON no formato:
{
  "suggestions": [
    { "type": "warning" | "success" | "info", "text": "sugestao em portugues" }
  ],
  "adjustments": [
    {
      "dayOfWeek": 0-6,
      "workoutId": "id do treino",
      "adjustment": "reduce" | "increase" | "remove",
      "percentage": 10-30,
      "reason": "motivo em portugues"
    }
  ],
  "loadLevel": "low" | "moderate" | "high" | "overload",
  "tssEstimate": numero,
  "narrative": "resumo narrativo de 2-3 frases em portugues sobre a semana de treinos"
}

Regras:
- Calcule o TSS estimado com base em duracao e intensidade (low=0.5x, medium=1.0x, high=1.5x por minuto)
- Para nivel "beginner", TSS > 400 e sobrecarga. Para "intermediate", > 600. Para "advanced"/"elite", > 900.
- Forneca 2-4 sugestoes praticas e especificas
- Ajustes sao opcionais — so sugira se realmente necessario
- Toda resposta em portugues brasileiro`;

  const raw = await callGemini(prompt, geminiApiKey);
  const result = extractJSON<LoadAnalysisResult>(raw);

  // Validate required fields
  if (!result.suggestions || !Array.isArray(result.suggestions)) {
    result.suggestions = [{ type: "info", text: "Analise concluida." }];
  }
  if (!result.adjustments) result.adjustments = [];
  if (!result.loadLevel) result.loadLevel = "moderate";
  if (!result.tssEstimate) result.tssEstimate = 0;
  if (!result.narrative) result.narrative = "";

  return result;
}

async function handleSuggestRecovery(
  payload: SuggestRecoveryPayload,
  geminiApiKey: string,
): Promise<{ suggestions: Array<{ type: string; text: string }>; narrative: string }> {
  const { recentWorkouts, fatigueLevel, sleepQuality } = payload;

  const workoutSummary = recentWorkouts
    .map((w) => `${w.name}: ${w.duration}min (${w.intensity})`)
    .join(", ");

  const prompt = `Voce e um preparador fisico esportivo. Com base nos dados abaixo, sugira estrategias de recuperacao.

TREINOS RECENTES: ${workoutSummary}
NIVEL DE FADIGA: ${fatigueLevel}/10
${sleepQuality ? `QUALIDADE DO SONO: ${sleepQuality}/10` : ""}

Responda EXCLUSIVAMENTE com JSON:
{
  "suggestions": [
    { "type": "warning" | "success" | "info", "text": "sugestao em portugues" }
  ],
  "narrative": "resumo de 2-3 frases"
}`;

  const raw = await callGemini(prompt, geminiApiKey);
  return extractJSON(raw);
}

async function handleWeeklySummary(
  payload: WeeklySummaryPayload,
  geminiApiKey: string,
): Promise<{ summary: string; highlights: string[] }> {
  const { weekWorkouts, athleteLevel } = payload;

  const workoutSummary = weekWorkouts
    .map((w) => `${w.name}: ${w.duration}min (${w.intensity}, ${w.modality})`)
    .join("; ");

  const prompt = `Voce e um preparador fisico esportivo. Gere um resumo narrativo da semana de treinos.

NIVEL DO ATLETA: ${athleteLevel}
TREINOS: ${workoutSummary}

Responda EXCLUSIVAMENTE com JSON:
{
  "summary": "resumo narrativo de 3-4 frases em portugues",
  "highlights": ["destaque 1", "destaque 2", "destaque 3"]
}`;

  const raw = await callGemini(prompt, geminiApiKey);
  return extractJSON(raw);
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
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Parse request
    const { action, payload } = await req.json();

    if (!action || !payload) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing action or payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let result: unknown;

    switch (action) {
      case "analyze_load":
        result = await withHealthTracking(
          { functionName: "flux-training-analysis", actionName: "analyze_load" },
          supabase,
          () => handleAnalyzeLoad(payload as AnalyzeLoadPayload, geminiApiKey),
        );
        break;

      case "suggest_recovery":
        result = await withHealthTracking(
          { functionName: "flux-training-analysis", actionName: "suggest_recovery" },
          supabase,
          () => handleSuggestRecovery(payload as SuggestRecoveryPayload, geminiApiKey),
        );
        break;

      case "weekly_training_summary":
        result = await withHealthTracking(
          { functionName: "flux-training-analysis", actionName: "weekly_training_summary" },
          supabase,
          () => handleWeeklySummary(payload as WeeklySummaryPayload, geminiApiKey),
        );
        break;

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[flux-training-analysis] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
