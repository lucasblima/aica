/**
 * suggest-inventory-items — AI-powered inventory recommendations
 *
 * Analyzes a persona's inventory and suggests:
 *   - Missing items the entity likely needs
 *   - Items in bad condition that should be replaced
 *   - Organization improvements
 *
 * @issue Life RPG inventory AI suggest
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'No auth header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const apiKey = Deno.env.get('GEMINI_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { persona_id } = await req.json();
    if (!persona_id) {
      return new Response(JSON.stringify({ success: false, error: 'persona_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load persona
    const { data: persona, error: personaError } = await supabase
      .from('entity_personas')
      .select('*')
      .eq('id', persona_id)
      .eq('user_id', user.id)
      .single();

    if (personaError || !persona) {
      return new Response(JSON.stringify({ success: false, error: 'Persona not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load inventory
    const { data: inventory } = await supabase
      .from('entity_inventory')
      .select('name, category, subcategory, location, condition, quantity, attributes')
      .eq('persona_id', persona_id)
      .order('condition', { ascending: true });

    const inventoryList = (inventory || []).map((item: Record<string, unknown>) =>
      `- ${item.name} (${item.category || 'sem categoria'}, local: ${item.location || '?'}, condicao: ${item.condition}%)`
    ).join('\n');

    const statsStr = Object.entries(persona.stats || {})
      .map(([k, v]) => `${k}: ${v}/100`)
      .join(', ');

    // Build Gemini prompt
    const prompt = `Voce e um assistente inteligente analisando o inventario de uma entidade do tipo "${persona.entity_type}" chamada "${persona.persona_name}".

Estado atual:
- HP: ${persona.hp}/100
- Level: ${persona.level}
- Stats: ${statsStr || 'nenhum'}

Inventario atual (${(inventory || []).length} itens):
${inventoryList || 'Vazio'}

Com base no tipo de entidade e no inventario atual, gere sugestoes praticas em JSON:

{
  "missing_items": [
    { "name": "nome do item", "category": "categoria", "reason": "por que e importante", "priority": "high|medium|low" }
  ],
  "replace_items": [
    { "current_item": "nome atual", "reason": "por que substituir", "suggestion": "sugestao de substituicao" }
  ],
  "organization_tips": [
    { "tip": "dica de organizacao", "affected_items": ["item1", "item2"] }
  ]
}

Regras:
- Max 5 missing_items, 3 replace_items, 3 organization_tips
- Se o inventario esta vazio, sugira itens essenciais para o tipo de entidade
- Para itens com condicao < 30%, sugira substituicao
- Foque em sugestoes praticas e realistas
- Responda SOMENTE com o JSON, sem texto adicional`;

    // Call Gemini
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 4096,
          temperature: 0.7,
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error('Gemini API error:', errText);
      return new Response(JSON.stringify({ success: false, error: 'AI generation failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const geminiData = await geminiResponse.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // extractJSON pattern
    const suggestions = extractJSON(rawText);

    if (!suggestions) {
      return new Response(JSON.stringify({ success: false, error: 'Failed to parse AI response' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log event
    try {
      await supabase.from('entity_event_log').insert({
        persona_id,
        event_type: 'agent_chat',
        event_data: {
          action: 'inventory_suggest',
          suggestion_count:
            (suggestions.missing_items?.length || 0) +
            (suggestions.replace_items?.length || 0) +
            (suggestions.organization_tips?.length || 0),
        },
        triggered_by: 'ai',
      });
    } catch (logErr) {
      console.error('Failed to log event:', logErr);
    }

    return new Response(JSON.stringify({ success: true, data: suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('suggest-inventory-items error:', err);
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});

function extractJSON(text: string): Record<string, unknown> | null {
  try {
    // Strip code fences first
    const cleaned = text.replace(/```(?:json)?\s*\n?/g, '').replace(/```\s*$/g, '');
    // Try direct parse
    try {
      return JSON.parse(cleaned);
    } catch {
      // Find JSON object boundaries
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        return JSON.parse(cleaned.slice(start, end + 1));
      }
    }
    return null;
  } catch {
    return null;
  }
}
