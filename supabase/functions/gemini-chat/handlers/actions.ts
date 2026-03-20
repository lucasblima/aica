// handlers/actions.ts — Intent classification + chat action execution (permanent)
import { extractJSON } from '../../_shared/model-router.ts'

// ============================================================================
// CLASSIFY INTENT HANDLER
// ============================================================================

export async function handleClassifyIntent(payload: any, apiKey: string) {
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
        maxOutputTokens: 1024,
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

// ============================================================================
// EXECUTE CHAT ACTION HANDLER
// ============================================================================

const ALLOWED_ACTION_TYPES = ['complete_task', 'start_task', 'update_priority', 'reschedule_task', 'create_moment'] as const

export async function handleExecuteChatAction(
  supabaseAdmin: any,
  userId: string,
  payload: { action_type: string; params: Record<string, any> }
): Promise<{ success: boolean; action_type: string; result?: any; error?: string }> {
  const { action_type, params } = payload

  if (!action_type || !ALLOWED_ACTION_TYPES.includes(action_type as any)) {
    return { success: false, action_type: action_type || 'unknown', error: `Tipo de acao invalido: ${action_type}` }
  }

  if (!params || typeof params !== 'object') {
    return { success: false, action_type, error: 'Parametros invalidos' }
  }

  try {
    switch (action_type) {
      case 'complete_task': {
        if (!params.task_id) return { success: false, action_type, error: 'task_id e obrigatorio' }
        const { data, error } = await supabaseAdmin
          .from('work_items')
          .update({ status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', params.task_id)
          .eq('user_id', userId)
          .select('id, title, status')
          .single()
        if (error) return { success: false, action_type, error: error.message }
        return { success: true, action_type, result: data }
      }

      case 'start_task': {
        if (!params.task_id) return { success: false, action_type, error: 'task_id e obrigatorio' }
        const { data, error } = await supabaseAdmin
          .from('work_items')
          .update({ status: 'in_progress', updated_at: new Date().toISOString() })
          .eq('id', params.task_id)
          .eq('user_id', userId)
          .select('id, title, status')
          .single()
        if (error) return { success: false, action_type, error: error.message }
        return { success: true, action_type, result: data }
      }

      case 'update_priority': {
        if (!params.task_id) return { success: false, action_type, error: 'task_id e obrigatorio' }
        const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
        if (params.is_urgent !== undefined) updateData.is_urgent = Boolean(params.is_urgent)
        if (params.is_important !== undefined) updateData.is_important = Boolean(params.is_important)
        const { data, error } = await supabaseAdmin
          .from('work_items')
          .update(updateData)
          .eq('id', params.task_id)
          .eq('user_id', userId)
          .select('id, title, is_urgent, is_important')
          .single()
        if (error) return { success: false, action_type, error: error.message }
        return { success: true, action_type, result: data }
      }

      case 'reschedule_task': {
        if (!params.task_id) return { success: false, action_type, error: 'task_id e obrigatorio' }
        if (!params.new_date) return { success: false, action_type, error: 'new_date e obrigatorio' }
        const { data, error } = await supabaseAdmin
          .from('work_items')
          .update({ due_date: params.new_date, updated_at: new Date().toISOString() })
          .eq('id', params.task_id)
          .eq('user_id', userId)
          .select('id, title, due_date')
          .single()
        if (error) return { success: false, action_type, error: error.message }
        return { success: true, action_type, result: data }
      }

      case 'create_moment': {
        if (!params.content) return { success: false, action_type, error: 'content e obrigatorio' }
        const { data, error } = await supabaseAdmin
          .from('moments')
          .insert({
            user_id: userId,
            content: params.content,
            emotion: params.emotion || 'neutral',
            type: params.type || 'text',
          })
          .select('id, content, emotion')
          .single()
        if (error) return { success: false, action_type, error: error.message }
        return { success: true, action_type, result: data }
      }

      default:
        return { success: false, action_type, error: `Tipo de acao nao implementado: ${action_type}` }
    }
  } catch (error) {
    console.error(`[execute_chat_action] Error executing ${action_type}:`, (error as Error).message)
    return { success: false, action_type, error: (error as Error).message }
  }
}
