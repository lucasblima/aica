/**
 * module-preview-chat — AI Chat Preview for Coming Soon modules
 * CS-003: AI Chat Preview
 *
 * POST { module_id, message, chat_history }
 * - Loads system prompt from module_registry.ai_preview_system_prompt
 * - Calls Gemini Flash with maxOutputTokens: 4096
 * - 10 messages per session limit
 * - Returns { response, suggested_questions, remaining_messages }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_MESSAGES_PER_SESSION = 10;

// Suggested questions per module
const SUGGESTED_QUESTIONS: Record<string, string[]> = {
  gmail: [
    "Como funciona a triagem inteligente de emails?",
    "Como a IA categoriza meus emails automaticamente?",
    "Posso integrar com meus projetos no Atlas?",
  ],
  connections: [
    "Como funciona a analise de conversas do WhatsApp?",
    "O que e o dossie automatico de contatos?",
    "Como a IA detecta intencoes nas mensagens?",
  ],
  eraforge: [
    "Me conte sobre uma civilizacao antiga!",
    "Como funciona a simulacao historica?",
    "Quais civilizacoes posso explorar?",
  ],
  drive: [
    "Como funciona a busca semantica de documentos?",
    "Como a IA organiza meus arquivos por projeto?",
    "Posso encontrar documentos pelo conteudo?",
  ],
};

function getDefaultSuggestions(moduleId: string): string[] {
  return SUGGESTED_QUESTIONS[moduleId] || [
    "O que esse modulo faz?",
    "Como posso usar isso no meu dia a dia?",
    "Quando estara disponivel?",
  ];
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { module_id, message, chat_history = [] } = await req.json();

    if (!module_id || !message) {
      return new Response(
        JSON.stringify({ success: false, error: "module_id and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check session message limit
    const messageCount = chat_history.length + 1;
    if (messageCount > MAX_MESSAGES_PER_SESSION) {
      return new Response(
        JSON.stringify({
          success: true,
          response: "Voce atingiu o limite de mensagens para esta demonstracao. Entre na lista de espera para ser avisado quando o modulo estiver disponivel!",
          suggested_questions: [],
          remaining_messages: 0,
          limit_reached: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load system prompt from module_registry
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: moduleData, error: moduleError } = await supabase
      .from("module_registry")
      .select("ai_preview_system_prompt, name, ai_preview_enabled")
      .eq("id", module_id)
      .single();

    if (moduleError || !moduleData) {
      return new Response(
        JSON.stringify({ success: false, error: "Module not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!moduleData.ai_preview_enabled) {
      return new Response(
        JSON.stringify({ success: false, error: "AI preview not enabled for this module" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = moduleData.ai_preview_system_prompt ||
      `Voce e o assistente do modulo ${moduleData.name} da AICA. Responda em portugues brasileiro de forma concisa.`;

    // Build conversation history for Gemini
    const genai = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genai.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        maxOutputTokens: 4096,
      },
    });

    const historyForGemini = chat_history.map((msg: { role: string; content: string }) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: `INSTRUCOES DO SISTEMA: ${systemPrompt}\n\nDiga "Entendi" para confirmar.` }] },
        { role: "model", parts: [{ text: "Entendi! Estou pronto para ajudar." }] },
        ...historyForGemini,
      ],
    });

    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    const remaining = MAX_MESSAGES_PER_SESSION - messageCount;
    const suggestions = remaining > 0
      ? getDefaultSuggestions(module_id)
      : [];

    return new Response(
      JSON.stringify({
        success: true,
        response: responseText,
        suggested_questions: suggestions,
        remaining_messages: Math.max(0, remaining),
        limit_reached: remaining <= 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[module-preview-chat] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
