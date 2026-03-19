// ==========================================================================
// intent-classifier.ts — Intent classification for chat routing
// Extracted from handlers/actions.ts to eliminate cross-handler imports
// ==========================================================================

import { extractJSON } from './model-router.ts'

export async function classifyIntent(payload: any, apiKey: string) {
  const { message, history, userPatterns } = payload;

  if (!message) {
    return { success: false, error: 'Message is required' };
  }

  const systemPrompt = `Você é um classificador de intenções para o AICA Life OS.
Analise a mensagem do usuário e classifique em UM dos módulos:
- atlas: gestão de tarefas, prioridades, Eisenhower Matrix, produtividade, to-do, prazos
- journey: momentos, emoções, diário, autoconhecimento, reflexão, meditação, gratidão
- connections: contatos, CRM pessoal, WhatsApp, pessoas, networking, relacionamentos
- finance: dinheiro, contas, orçamento, extratos, investimentos, gastos, receitas
- flux: treinos, atletas, exercícios, coaching esportivo, academia, séries
- studio: podcast, episódios, convidados, gravação, pauta, entrevistas
- captacao: editais, grants, FAPERJ, CNPq, propostas, captação de recursos, patrocínio
- agenda: reuniões, eventos, calendário, horários, compromissos, agendamentos
- coordinator: conversa geral sem módulo específico, ou envolve múltiplos módulos

## Detecção de Intenção de Entrevista
Se o usuário expressar desejo de registrar algo pessoal, reflexão, ou momento (ex: "quero registrar um momento", "preciso desabafar", "como me sinto hoje"), classifique como module="journey" E retorne interview_intent="register_moment".
Se o usuário pedir a pergunta do dia ou algo similar (ex: "me faça uma pergunta", "pergunta do dia"), retorne interview_intent="daily_question".
Caso contrário, interview_intent deve ser null.

${userPatterns ? `Padrões conhecidos do usuário: ${userPatterns.join(', ')}` : ''}

Retorne APENAS JSON válido:
{ "module": "nome_do_modulo", "confidence": 0.0-1.0, "action_hint": "breve descrição da ação detectada", "reasoning": "justificativa curta da classificação", "interview_intent": "register_moment" | "daily_question" | null }`;

  const contents = [];

  // Add history if provided (last 5 messages for context)
  if (history && Array.isArray(history)) {
    for (const msg of history.slice(-5)) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }
  }

  // Add current message
  contents.push({
    role: 'user',
    parts: [{ text: message }],
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('[classify_intent] API error:', errText);
    return { success: false, error: 'Classification API error' };
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  let classification;
  try {
    classification = extractJSON(text);
  } catch {
    console.warn('[classify_intent] Failed to parse classification, falling back to coordinator');
    return {
      success: true,
      classification: {
        module: 'coordinator',
        confidence: 0.3,
        action_hint: 'Classificação inconclusiva',
        reasoning: 'Não foi possível determinar o módulo',
      },
    };
  }

  if (!classification || !classification.module) {
    return {
      success: true,
      classification: {
        module: 'coordinator',
        confidence: 0.3,
        action_hint: 'Classificação inconclusiva',
        reasoning: 'Não foi possível determinar o módulo',
      },
    };
  }

  return {
    success: true,
    classification: {
      module: classification.module,
      confidence: Math.min(classification.confidence || 0.5, 1.0),
      action_hint: classification.action_hint || '',
      reasoning: classification.reasoning || '',
      interview_intent: classification.interview_intent || null,
    },
  };
}
