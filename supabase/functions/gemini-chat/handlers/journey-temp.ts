// handlers/journey-temp.ts — Journey module handlers (temporary — until gemini-journey Edge Function)
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.21.0'
import { MODELS } from '../../_shared/gemini-helpers.ts'
import { extractJSON } from '../../_shared/model-router.ts'
import type {
  SentimentAnalysisPayload, SentimentAnalysisResult,
  WeeklySummaryPayload, WeeklySummaryResult, MomentData,
  DailyReportPayload, DailyReportResult,
  AnalyzeMomentPayload, AnalyzeMomentResult,
  EvaluateQualityPayload, EvaluateQualityResult,
} from '../../_shared/gemini-types.ts'
import { VALID_EMOTION_VALUES } from '../../_shared/gemini-types.ts'

// ============================================================================
// PROMPT TEMPLATES (Journey-specific)
// ============================================================================

const JOURNEY_PROMPTS = {
  analyze_moment_sentiment: (content: string) => `Analise o sentimento do seguinte momento de diario:\n\n"${content}"\n\nRetorne um JSON com:\n- sentiment: 'very_positive', 'positive', 'neutral', 'negative', ou 'very_negative'\n- sentimentScore: numero de -1 (muito negativo) a 1 (muito positivo)\n- emotions: lista de emocoes detectadas (maximo 5)\n- triggers: lista de gatilhos/contextos (maximo 3)\n- energyLevel: nivel de energia percebido de 0 a 100\n\nRetorne APENAS o JSON.`,

  generate_weekly_summary: (moments: MomentData[]) => {
    const momentsList = moments.map((m, i) => {
      const sentimentInfo = m.sentiment_data ? `Sentimento: ${m.sentiment_data.sentiment} (score: ${m.sentiment_data.sentimentScore})` : 'Sentimento: nao analisado'
      return `${i + 1}. [${m.created_at}] Emocao: ${m.emotion}\n${sentimentInfo}\nTags: ${m.tags?.join(', ') || 'nenhuma'}\nConteudo: ${m.content.substring(0, 200)}${m.content.length > 200 ? '...' : ''}`
    }).join('\n\n')
    return `Voce e um coach de consciencia emocional. Analise os seguintes ${moments.length} momentos de diario da ultima semana:\n\n${momentsList}\n\nCrie um resumo semanal profundo e empatico retornando um JSON com emotionalTrend, dominantEmotions, keyMoments, insights, suggestedFocus. Retorne APENAS o JSON.`
  },
}

// ============================================================================
// HANDLERS
// ============================================================================

export async function handleAnalyzeMomentSentiment(genAI: GoogleGenerativeAI, payload: SentimentAnalysisPayload): Promise<SentimentAnalysisResult> {
  if (!payload.content || typeof payload.content !== 'string') throw new Error('Campo "content" e obrigatorio')
  if (payload.content.trim().length < 3) throw new Error('Conteudo muito curto para analise')

  const model = genAI.getGenerativeModel({ model: MODELS.fast, generationConfig: { temperature: 0.3, topP: 0.8, topK: 40, maxOutputTokens: 4096 } })
  const result = await model.generateContent(JOURNEY_PROMPTS.analyze_moment_sentiment(payload.content))
  const text = result.response.text()

  let parsed: Omit<SentimentAnalysisResult, 'timestamp'>
  try {
    parsed = extractJSON(text)
  } catch (e) {
    console.warn('[analyze_moment_sentiment] JSON parse failed, using defaults:', (e as Error).message)
    parsed = { sentiment: 'neutral', sentimentScore: 0, emotions: [], triggers: [], energyLevel: 50 } as any
  }

  const validSentiments = ['very_positive', 'positive', 'neutral', 'negative', 'very_negative']
  if (!validSentiments.includes(parsed.sentiment)) parsed.sentiment = 'neutral'
  parsed.sentimentScore = Math.max(-1, Math.min(1, parsed.sentimentScore || 0))
  parsed.emotions = Array.isArray(parsed.emotions) ? parsed.emotions.slice(0, 5) : []
  parsed.triggers = Array.isArray(parsed.triggers) ? parsed.triggers.slice(0, 3) : []
  parsed.energyLevel = Math.max(0, Math.min(100, parsed.energyLevel || 50))

  return { timestamp: new Date().toISOString(), ...parsed }
}

export async function handleGenerateWeeklySummary(genAI: GoogleGenerativeAI, payload: WeeklySummaryPayload): Promise<WeeklySummaryResult> {
  if (!payload.moments || !Array.isArray(payload.moments)) throw new Error('Campo "moments" e obrigatorio')
  if (payload.moments.length === 0) throw new Error('Array de momentos esta vazio')

  const model = genAI.getGenerativeModel({ model: MODELS.smart, generationConfig: { temperature: 0.5, topP: 0.9, topK: 40, maxOutputTokens: 2048 } })
  const result = await model.generateContent(JOURNEY_PROMPTS.generate_weekly_summary(payload.moments))
  const text = result.response.text()

  let parsed: WeeklySummaryResult
  parsed = extractJSON(text)

  const validTrends = ['ascending', 'stable', 'descending', 'volatile']
  if (!validTrends.includes(parsed.emotionalTrend)) parsed.emotionalTrend = 'stable'
  parsed.dominantEmotions = Array.isArray(parsed.dominantEmotions) ? parsed.dominantEmotions.slice(0, 5) : []
  parsed.keyMoments = Array.isArray(parsed.keyMoments) ? parsed.keyMoments.slice(0, 5) : []
  parsed.insights = Array.isArray(parsed.insights) ? parsed.insights.slice(0, 5) : []
  parsed.suggestedFocus = parsed.suggestedFocus || ''

  return parsed
}

export async function handleAnalyzeMoment(genAI: GoogleGenerativeAI, payload: AnalyzeMomentPayload): Promise<AnalyzeMomentResult> {
  if (!payload.content || typeof payload.content !== 'string') throw new Error('Campo "content" e obrigatorio')
  if (payload.content.trim().length < 3) throw new Error('Conteudo muito curto para analise')

  const model = genAI.getGenerativeModel({
    model: MODELS.fast,
    generationConfig: {
      temperature: 0.6,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 4096,
    },
  })

  const prompt = `Analise a emocao deste registro de diario em portugues. Retorne SOMENTE JSON.

EXEMPLOS:

Entrada: "Estou com muitas saudades das minhas filhas"
{"tags":["saudade","filhas","familia"],"mood":{"emoji":"😢","label":"Saudade","value":"sad"},"sentiment":"negative","sentimentScore":-0.6,"emotions":["saudade","tristeza"],"triggers":["distancia da familia"],"energyLevel":30}

Entrada: "Hoje foi um dia produtivo, consegui entregar tudo"
{"tags":["produtividade","entrega","trabalho"],"mood":{"emoji":"😎","label":"Confiante","value":"confident"},"sentiment":"very_positive","sentimentScore":0.8,"emotions":["satisfacao","orgulho"],"triggers":["trabalho concluido"],"energyLevel":85}

Entrada: "Nao consigo parar de pensar no que aconteceu"
{"tags":["ruminacao","pensamento","preocupacao"],"mood":{"emoji":"😰","label":"Ansioso","value":"anxious"},"sentiment":"negative","sentimentScore":-0.5,"emotions":["ansiedade","preocupacao"],"triggers":["evento passado"],"energyLevel":60}

Entrada: "Acordei repleto de energia e motivacao"
{"tags":["motivacao","energia","inicio"],"mood":{"emoji":"🤩","label":"Inspirado","value":"inspired"},"sentiment":"very_positive","sentimentScore":0.9,"emotions":["inspiracao","entusiasmo"],"triggers":["novo dia"],"energyLevel":95}

AGORA ANALISE:

Entrada: "${payload.content.replace(/"/g, '\\"')}"

REGRAS: Responda SOMENTE com o JSON. Nunca use "neutral" exceto para textos puramente factuais sem emocao. mood.value DEVE ser um destes: happy, sad, anxious, angry, thoughtful, calm, grateful, tired, inspired, excited, disappointed, frustrated, loving, scared, determined, sleepy, overwhelmed, confident, confused`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  console.log('[analyze_moment] Raw Gemini response:', text.substring(0, 500))

  // Build fallback mood from user_emotion if available
  let fallbackMood: AnalyzeMomentResult['mood'] = { emoji: '😐', label: 'Neutro', value: 'neutral' }
  if (payload.user_emotion) {
    // user_emotion can be a value string ('happy') or legacy "emoji label" format
    const isValueString = VALID_EMOTION_VALUES.includes(payload.user_emotion as any)
    if (isValueString) {
      fallbackMood = { emoji: '😐', label: payload.user_emotion, value: payload.user_emotion }
    } else {
      const emojiMatch = payload.user_emotion.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)/u)
      const fallbackEmoji = emojiMatch ? emojiMatch[0] : '😐'
      const fallbackLabel = payload.user_emotion.replace(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*/u, '').trim() || 'Neutro'
      fallbackMood = { emoji: fallbackEmoji, label: fallbackLabel, value: 'neutral' }
    }
  }

  let parsed: AnalyzeMomentResult
  try {
    parsed = extractJSON(text)
  } catch (e) {
    console.warn('[analyze_moment] JSON parse failed, using user_emotion as fallback:', (e as Error).message)
    parsed = {
      tags: [],
      mood: fallbackMood,
      sentiment: 'neutral',
      sentimentScore: 0,
      emotions: [],
      triggers: [],
      energyLevel: 50,
    }
  }

  // Validate and normalize
  parsed.tags = Array.isArray(parsed.tags) ? parsed.tags.slice(0, 7).map(t => String(t).toLowerCase()) : []
  if (!parsed.mood || typeof parsed.mood !== 'object') parsed.mood = { emoji: '😐', label: 'Neutro', value: 'neutral' }
  parsed.mood.label = String(parsed.mood.label || 'Neutro').substring(0, 20)
  parsed.mood.emoji = String(parsed.mood.emoji || '😐').substring(0, 4)
  // Normalize mood.value to a valid emotion value
  if (!parsed.mood.value || !VALID_EMOTION_VALUES.includes(parsed.mood.value as any)) {
    parsed.mood.value = 'neutral'
  }

  const validSentiments = ['very_positive', 'positive', 'neutral', 'negative', 'very_negative']
  if (!validSentiments.includes(parsed.sentiment)) parsed.sentiment = 'neutral'
  parsed.sentimentScore = Math.max(-1, Math.min(1, parsed.sentimentScore || 0))
  parsed.emotions = Array.isArray(parsed.emotions) ? parsed.emotions.slice(0, 5) : []
  parsed.triggers = Array.isArray(parsed.triggers) ? parsed.triggers.slice(0, 3) : []
  parsed.energyLevel = Math.max(0, Math.min(100, parsed.energyLevel || 50))

  return {
    ...parsed,
    __usageMetadata: result.response.usageMetadata,
  } as any
}

export async function handleEvaluateQuality(genAI: GoogleGenerativeAI, payload: EvaluateQualityPayload): Promise<EvaluateQualityResult> {
  if (!payload.content || typeof payload.content !== 'string') {
    // Empty/missing content → minimum score
    return {
      quality_score: 0.0,
      relevance: 0.0,
      depth: 0.0,
      authenticity: 0.0,
      clarity: 0.0,
      feedback_message: 'Tente escrever algo para ganhar mais pontos!',
      feedback_tier: 'low',
    }
  }

  const trimmed = payload.content.trim()
  if (trimmed.length < 2) {
    return {
      quality_score: 0.1,
      relevance: 0.1,
      depth: 0.0,
      authenticity: 0.1,
      clarity: 0.1,
      feedback_message: 'Obrigado por compartilhar! Tente escrever um pouco mais.',
      feedback_tier: 'low',
    }
  }

  const model = genAI.getGenerativeModel({
    model: MODELS.fast,
    generationConfig: {
      temperature: 0.2,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 4096,
    },
  })

  let contextLine = ''
  if (payload.input_type === 'question_answer' && payload.question_text) {
    contextLine = `Pergunta: "${payload.question_text}"\n`
  } else if (payload.input_type === 'reflection' && payload.summary_context) {
    contextLine = `Contexto do resumo semanal: "${payload.summary_context}"\n`
  }

  const prompt = `Voce e um avaliador empatico de reflexoes pessoais.
O publico-alvo tem escolaridade variada.
Respostas curtas mas genuinas devem ser VALORIZADAS.
Uma resposta simples e honesta vale MAIS que uma longa e vaga.

Tipo: ${payload.input_type}
${contextLine}Texto: "${trimmed}"

Avalie 0.0-1.0:
- relevance (30%): Aborda o proposto? (momentos: qualquer registro e relevante)
- depth (30%): Vai alem do superficial? (frases curtas podem ser profundas)
- authenticity (20%): Genuino e pessoal? (favor honestidade sobre elaboracao)
- clarity (20%): Compreensivel? (linguagem simples e OK)

CALIBRACAO:
- 1-3 palavras sinceras: quality_score minimo 0.3
- 1 frase genuina: minimo 0.5
- 2+ frases com reflexao: minimo 0.65
- NAO penalize erros de ortografia ou linguagem informal
- Respostas vagas/genericas: quality_score maximo 0.4

Tiers: low (<0.35), medium (0.35-0.6), high (0.6-0.85), exceptional (>=0.85)

Retorne JSON: { "quality_score": number, "relevance": number, "depth": number, "authenticity": number, "clarity": number, "feedback_message": "1 frase empatica em portugues", "feedback_tier": "low|medium|high|exceptional" }`

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const parsed = extractJSON<EvaluateQualityResult>(text)

    // Validate and clamp values
    parsed.quality_score = Math.max(0, Math.min(1, Number(parsed.quality_score) || 0.5))
    parsed.relevance = Math.max(0, Math.min(1, Number(parsed.relevance) || 0.5))
    parsed.depth = Math.max(0, Math.min(1, Number(parsed.depth) || 0.5))
    parsed.authenticity = Math.max(0, Math.min(1, Number(parsed.authenticity) || 0.5))
    parsed.clarity = Math.max(0, Math.min(1, Number(parsed.clarity) || 0.5))
    parsed.feedback_message = String(parsed.feedback_message || 'Obrigado por compartilhar!').substring(0, 200)

    const validTiers = ['low', 'medium', 'high', 'exceptional'] as const
    if (!validTiers.includes(parsed.feedback_tier as any)) {
      parsed.feedback_tier = parsed.quality_score < 0.35 ? 'low'
        : parsed.quality_score < 0.6 ? 'medium'
        : parsed.quality_score < 0.85 ? 'high'
        : 'exceptional'
    }

    return parsed
  } catch (error) {
    console.error('[evaluate_quality] Gemini call failed, using fallback:', (error as Error).message)
    // Fallback: quality=0.5 → 11 CP (median, safe experience)
    return {
      quality_score: 0.5,
      relevance: 0.5,
      depth: 0.5,
      authenticity: 0.5,
      clarity: 0.5,
      feedback_message: 'Obrigado por compartilhar sua reflexao!',
      feedback_tier: 'medium',
    }
  }
}

export async function handleAnalyzeContentRealtime(genAI: GoogleGenerativeAI, payload: any): Promise<{ text: string }> {
  const { prompt, temperature, maxOutputTokens } = payload
  const model = genAI.getGenerativeModel({ model: MODELS.fast, generationConfig: { temperature: temperature || 0.8, maxOutputTokens: maxOutputTokens || 150 } })
  const result = await model.generateContent(prompt)
  return {
    text: result.response.text(),
    __usageMetadata: result.response.usageMetadata
  }
}

export async function handleGeneratePostCaptureInsight(genAI: GoogleGenerativeAI, payload: any): Promise<{ text: string }> {
  const { prompt, temperature, maxOutputTokens } = payload
  const model = genAI.getGenerativeModel({ model: MODELS.fast, generationConfig: { temperature: temperature || 0.7, maxOutputTokens: maxOutputTokens || 200 } })
  const result = await model.generateContent(prompt)
  return {
    text: result.response.text(),
    __usageMetadata: result.response.usageMetadata
  }
}

export async function handleClusterMomentsByTheme(genAI: GoogleGenerativeAI, payload: any): Promise<{ text: string }> {
  const { prompt, temperature, maxOutputTokens } = payload
  const model = genAI.getGenerativeModel({ model: MODELS.fast, generationConfig: { temperature: temperature || 0.6, maxOutputTokens: maxOutputTokens || 500 } })
  const result = await model.generateContent(prompt)
  return {
    text: result.response.text(),
    __usageMetadata: result.response.usageMetadata
  }
}

export async function handleGenerateDailyReport(genAI: GoogleGenerativeAI, payload: DailyReportPayload): Promise<DailyReportResult> {
  const { date, tasksCompleted, tasksTotal, productivityScore, moodScore, energyLevel, activeModules, content } = payload

  const model = genAI.getGenerativeModel({ model: MODELS.fast, generationConfig: { temperature: 0.7, topP: 0.9, topK: 40, maxOutputTokens: 1024 } })
  const completionRate = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0

  const prompt = `Voce e um coach de produtividade e bem-estar. Gere um relatorio diario baseado nos dados abaixo:

Data: ${date}
Tarefas concluidas: ${tasksCompleted} de ${tasksTotal} (${completionRate}%)
Score de produtividade: ${productivityScore}%
${moodScore !== undefined ? `Score de humor: ${moodScore} (-1 a 1)` : ''}
${energyLevel !== undefined ? `Nivel de energia: ${energyLevel}%` : ''}
${activeModules?.length ? `Modulos ativos: ${activeModules.join(', ')}` : ''}
${content ? `Contexto adicional: ${content}` : ''}

Retorne um JSON com:
{
  "summary": "Resumo de 2-3 frases sobre o dia",
  "insights": ["3-4 insights sobre padroes e comportamentos observados"],
  "recommendations": ["2-3 recomendacoes praticas para melhoria"],
  "motivationalMessage": "Mensagem motivacional personalizada de 1-2 frases"
}

Seja empatico, construtivo e especifico. Retorne APENAS JSON valido.`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  let parsed: DailyReportResult
  try {
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim()
    parsed = JSON.parse(jsonStr)
  } catch {
    console.error('[generate_daily_report] Failed to parse JSON:', text)
    return {
      summary: `Hoje voce completou ${tasksCompleted} de ${tasksTotal} tarefas.`,
      insights: ['Continue acompanhando seu progresso diariamente.'],
      recommendations: ['Defina prioridades claras para amanha.'],
      motivationalMessage: 'Cada dia e uma nova oportunidade de crescimento!'
    }
  }

  parsed.summary = parsed.summary || 'Relatorio do dia gerado com sucesso.'
  parsed.insights = Array.isArray(parsed.insights) ? parsed.insights.slice(0, 4) : []
  parsed.recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 3) : []
  parsed.motivationalMessage = parsed.motivationalMessage || 'Continue assim!'

  return parsed
}
