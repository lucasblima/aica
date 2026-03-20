// handlers/atlas-temp.ts — Atlas module handlers (temporary — until gemini-atlas Edge Function)
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.21.0'
import { MODELS, getDateContext } from '../../_shared/gemini-helpers.ts'
import { extractJSON } from '../../_shared/model-router.ts'

// ============================================================================
// VOICE-TO-TASK EXTRACTION HANDLER (Atlas - Voice Input)
// ============================================================================

export async function handleExtractTaskFromVoice(genAI: GoogleGenerativeAI, payload: { transcription: string }) {
  const { transcription } = payload

  if (!transcription) {
    throw new Error('transcription e obrigatorio')
  }

  const { today, dayOfWeek } = getDateContext()

  const model = genAI.getGenerativeModel({
    model: MODELS.fast,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
    },
  })

  const prompt = `Voce e um assistente que extrai dados estruturados de tarefas a partir de texto falado em portugues brasileiro.

Data de hoje: ${today} (${dayOfWeek})

A partir da transcricao abaixo, extraia os seguintes campos:
- title: titulo curto e claro da tarefa (max 100 chars)
- description: descricao adicional se houver detalhes relevantes (opcional)
- priority: "urgent" | "high" | "medium" | "low" (baseado no tom e urgencia)
- is_urgent: true se a tarefa precisa ser feita logo (prazo proximo ou linguagem urgente)
- is_important: true se a tarefa tem impacto significativo
- due_date: data no formato YYYY-MM-DD (resolva datas relativas como "amanha", "segunda", "semana que vem" a partir da data de hoje)
- scheduled_time: horario no formato HH:MM se mencionado (ex: "meio dia" → "12:00", "tres da tarde" → "15:00", "oito horas" → "08:00"). Omitir se nenhum horario for mencionado.
- estimated_duration: duracao estimada em minutos (1-480)
- task_type: "task" | "list" | "event" — classifique o tipo:
  * "event": encontros, almocos, jantares, reunioes, compromissos com horario marcado ou com outras pessoas
  * "list": listas de compras, itens enumerados separados por virgula ou "e", multiplos itens a fazer/comprar
  * "task": qualquer outra tarefa simples (padrao)
- checklist_items: array de strings com os itens da lista (SOMENTE quando task_type = "list"). Cada item deve ser curto e claro.

Exemplos:
Input: "Almoco com Rodrigo amanha meio dia"
Output: {"title":"Almoco com Rodrigo","due_date":"${new Date(Date.now() + 86400000).toISOString().split('T')[0]}","scheduled_time":"12:00","task_type":"event","priority":"medium","is_urgent":false,"is_important":true}

Input: "Comprar leite, pao e ovos"
Output: {"title":"Lista de compras","task_type":"list","checklist_items":["Leite","Pao","Ovos"],"priority":"medium","is_urgent":false,"is_important":false}

Input: "Preparar apresentacao do projeto"
Output: {"title":"Preparar apresentacao do projeto","task_type":"task","priority":"medium","is_urgent":false,"is_important":true,"estimated_duration":120}

Transcricao: "${transcription}"

Responda APENAS com JSON valido. Campos opcionais podem ser omitidos.`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  try {
    const parsed = extractJSON(text)
    return {
      ...parsed,
      __usageMetadata: result.response.usageMetadata,
    }
  } catch {
    // Fallback: use transcription as title
    console.warn('[gemini-chat] extract_task_from_voice: JSON parse failed, using fallback')
    return {
      title: transcription.slice(0, 100),
      priority: 'medium',
      is_urgent: false,
      is_important: false,
      __usageMetadata: result.response.usageMetadata,
    }
  }
}

// ============================================================================
// AUDIO TRANSCRIPTION HANDLER (Universal Input Funnel - Phase 0)
// ============================================================================

export async function handleTranscribeAudio(genAI: GoogleGenerativeAI, payload: any): Promise<{ transcription: string; language: string; confidence: number }> {
  const { audioBase64, mimeType = 'audio/webm' } = payload

  if (!audioBase64) {
    throw new Error('audioBase64 is required')
  }

  const model = genAI.getGenerativeModel({ model: MODELS.fast })
  const result = await model.generateContent([
    {
      inlineData: {
        mimeType,
        data: audioBase64,
      },
    },
    { text: 'Transcreva o audio acima em portugues. Retorne APENAS o texto transcrito, sem formatacao adicional.' },
  ])

  const raw = result.response.text().trim()
  // Strip Gemini thinking tokens that leak with 2.5 Flash
  const transcription = raw.replace(/<THINK>[\s\S]*?<\/THINK>\s*/gi, '').trim()

  return {
    transcription,
    language: 'pt-BR',
    confidence: 0.9,
    __usageMetadata: result.response.usageMetadata,
  } as any
}

// ============================================================================
// AUTO-TAGGING HANDLER
// ============================================================================

export async function handleGenerateTags(genAI: GoogleGenerativeAI, payload: any): Promise<{ text: string }> {
  const { prompt, temperature, maxOutputTokens } = payload
  const safeMaxTokens = Math.max(100, Math.min(8192, Number(maxOutputTokens) || 4096))
  const model = genAI.getGenerativeModel({ model: MODELS.fast, generationConfig: { temperature: temperature || 0.7, maxOutputTokens: safeMaxTokens } })
  const result = await model.generateContent(prompt)
  return {
    text: result.response.text(),
    __usageMetadata: result.response.usageMetadata,
  } as any
}
