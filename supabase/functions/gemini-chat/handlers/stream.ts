// handlers/stream.ts — SSE streaming chat handler (permanent)
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.21.0'
import { MODELS, getDateContext } from '../../_shared/gemini-helpers.ts'
import { buildUserContext, generateSuggestedActions, generateSuggestedQuestions } from '../../_shared/context-builder.ts'
import { AGENT_SYSTEM_PROMPTS, VALID_AGENTS, INTERVIEWER_SYSTEM_PROMPT } from '../../_shared/agent-prompts.ts'
import type { UserContextResult } from '../../_shared/gemini-types.ts'
import { classifyIntent } from '../../_shared/intent-classifier.ts'
import { fetchRelevantDocuments } from '../../_shared/document-search.ts'

export async function handleStreamChat(
  genAI: GoogleGenerativeAI,
  payload: any,
  supabaseAdmin: any,
  userId: string | null,
  corsHeaders: Record<string, string>,
  apiKey: string
): Promise<Response> {
  const requestStartMs = Date.now()
  const streamMessage = payload?.message
  if (!streamMessage) throw new Error('Mensagem e obrigatoria')

  // Phase 4: Check for interview mode trigger from frontend CTAs
  const interviewMeta = payload?.interview as { type: string; intent: string } | undefined
  let isInterviewMode = interviewMeta?.type === 'interview_start'

  // Phase 3: Detect module via intent classification (fast, low tokens)
  let streamModule = payload?.module || 'coordinator'
  let detectedAgent = 'aica_coordinator'
  let detectedInterviewIntent: string | null = null

  if (isInterviewMode) {
    // Interview mode routes to journey for moment registration, or coordinator for others
    const interviewIntent = interviewMeta!.intent
    if (interviewIntent === 'register_moment' || interviewIntent === 'daily_question') {
      streamModule = 'journey'
      detectedAgent = 'aica_interviewer'
    }
    console.log(`[chat_aica_stream] Interview mode: intent=${interviewIntent}, module=${streamModule}`)
  } else if (!payload?.module) {
    try {
      const classifyResult = await classifyIntent(
        { message: streamMessage, history: payload?.history },
        apiKey
      )
      if (classifyResult.success && classifyResult.classification) {
        const cls = classifyResult.classification
        if (cls.confidence >= 0.6 && cls.module !== 'coordinator' && VALID_AGENTS.includes(cls.module)) {
          streamModule = cls.module
          detectedAgent = `aica_${cls.module}`
          console.log(`[chat_aica_stream] Detected module: ${cls.module} (confidence: ${cls.confidence})`)
        }
        // Natural language detected interview intent — activate interview mode
        if (cls.interview_intent && !isInterviewMode) {
          isInterviewMode = true
          detectedInterviewIntent = cls.interview_intent
          streamModule = 'journey'
          detectedAgent = 'aica_interviewer'
          console.log(`[chat_aica_stream] Natural interview intent detected: ${cls.interview_intent}`)
        }
      }
    } catch (e) {
      console.warn('[chat_aica_stream] Intent classification failed, staying on coordinator:', (e as Error).message)
    }
  }

  // Build user context (same as handleLegacyChat)
  let streamUserContext = ''
  let streamRawData: UserContextResult['rawData'] = { tasks: [], moments: [], transactions: [], events: [] }
  if (userId && supabaseAdmin) {
    try {
      const ctxResult = await buildUserContext(supabaseAdmin, userId, streamModule)
      streamUserContext = ctxResult.contextString
      streamRawData = ctxResult.rawData
    } catch (e) {
      console.warn('[chat_aica_stream] Failed to build context:', (e as Error).message)
    }
  }

  // RAG: search user's indexed documents for relevant context (grants, studio, etc.)
  let documentContext = ''
  if (userId && supabaseAdmin && !isInterviewMode) {
    try {
      const docResult = await fetchRelevantDocuments(supabaseAdmin, userId, streamModule, streamMessage, apiKey)
      if (docResult.found) {
        documentContext = docResult.contextString
        console.log(`[chat_aica_stream] RAG enrichment: ${docResult.sources.length} source(s), ${documentContext.length} chars`)
      }
    } catch (e) {
      console.warn('[chat_aica_stream] Document search failed (non-blocking):', (e as Error).message)
    }
  }

  // Build system prompt — use interviewer prompt for interview mode, else module-specific
  let agentConfig: { prompt: string; temperature: number; maxOutputTokens: number }

  if (isInterviewMode) {
    const interviewIntent = interviewMeta?.intent || detectedInterviewIntent || 'register_moment'
    agentConfig = {
      prompt: INTERVIEWER_SYSTEM_PROMPT(interviewIntent),
      temperature: 0.7,
      maxOutputTokens: 4096,
    }
  } else {
    agentConfig = AGENT_SYSTEM_PROMPTS[streamModule] || AGENT_SYSTEM_PROMPTS.coordinator
  }

  const streamModel = genAI.getGenerativeModel({
    model: MODELS.fast,
    generationConfig: {
      temperature: agentConfig.temperature,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: agentConfig.maxOutputTokens,
    },
  })

  let streamSystemPrompt = agentConfig.prompt

  if (payload?.systemPrompt) streamSystemPrompt = payload.systemPrompt

  const { today: todayStream, dayOfWeek: dowStream, tomorrow: tomorrowStream, timeStr: timeStrStream } = getDateContext()

  streamSystemPrompt += `\n\n## Data e Hora Atual\n- Hoje: ${todayStream} (${dowStream})\n- Amanha: ${tomorrowStream}\n- Horario: ${timeStrStream} (BRT)`

  if (streamUserContext) {
    streamSystemPrompt += `\n\n## Dados Reais do Usuario\n${streamUserContext}\n\n## Instrucoes de Contexto\n- Use os dados acima para dar respostas PERSONALIZADAS e especificas\n- Cite numeros, nomes, datas e detalhes dos dados reais\n- NUNCA pergunte qual e a data atual — voce JA SABE a data (veja acima)\n- NUNCA diga que nao tem acesso aos dados — voce TEM os dados acima\n- Liste dados em formato organizado (bullet points) quando houver multiplos itens\n- Se nao tiver dados suficientes, sugira acoes concretas`
  }

  // Append RAG document context if available
  if (documentContext) {
    streamSystemPrompt += `\n\n${documentContext}\n\n- Quando relevante, cite informacoes dos documentos acima\n- Indique a fonte quando usar dados dos documentos`
  }

  const streamHistory = payload?.history?.map((msg: any) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  })) || []

  // Thread context: if replying to a specific message, fetch parent content
  let threadContext = ''
  if (payload?.parent_message_id && userId && supabaseAdmin) {
    try {
      const { data: parentMsg } = await supabaseAdmin
        .from('chat_messages')
        .select('content, direction')
        .eq('id', payload.parent_message_id)
        .eq('user_id', userId)
        .single()
      if (parentMsg) {
        const role = parentMsg.direction === 'inbound' ? 'usuario' : 'assistente'
        threadContext = `[Respondendo a mensagem do ${role}: "${parentMsg.content.substring(0, 300)}"]`
        console.log(`[chat_aica_stream] Thread context: replying to ${payload.parent_message_id}`)
      }
    } catch (e) {
      console.warn('[chat_aica_stream] Failed to fetch parent message:', (e as Error).message)
    }
  }

  let streamFinalMessage = streamMessage
  if (threadContext) streamFinalMessage = `${threadContext}\n\n${streamMessage}`
  if (payload?.context) streamFinalMessage = `Contexto:\n${payload.context}\n\n${streamFinalMessage}`

  const streamChat = streamModel.startChat({
    history: [
      { role: 'user', parts: [{ text: `Sistema: ${streamSystemPrompt}` }] },
      { role: 'model', parts: [{ text: 'Entendido! Tenho acesso aos seus dados e vou dar respostas personalizadas.' }] },
      ...streamHistory,
    ],
  })

  // Try streaming first, fall back to non-streaming if it fails
  let streamResult: any
  try {
    streamResult = await streamChat.sendMessageStream(streamFinalMessage)
  } catch (streamInitError) {
    // sendMessageStream failed — fall back to non-streaming response
    console.warn('[chat_aica_stream] sendMessageStream failed, falling back:', (streamInitError as Error).message)
    const nonStreamResult = await streamChat.sendMessage(streamFinalMessage)
    const nonStreamText = nonStreamResult.response.text()
    const fallbackActions = generateSuggestedActions(streamMessage, streamRawData)
    const fallbackQuestions = generateSuggestedQuestions(streamMessage, nonStreamText, streamModule, streamRawData)
    const fallbackUsage = nonStreamResult.response.usageMetadata
    const fallbackLatencyMs = Date.now() - requestStartMs
    console.log(`[chat_aica_stream] METRIC user=${userId} module=${streamModule} latency=${fallbackLatencyMs}ms streaming=false fallback=true tokens_in=${fallbackUsage?.promptTokenCount || 0} tokens_out=${fallbackUsage?.candidatesTokenCount || 0}`)
    return new Response(JSON.stringify({
      success: true,
      text: nonStreamText,
      agent: detectedAgent,
      suggestedActions: fallbackActions,
      suggested_questions: fallbackQuestions,
      usage: { input: fallbackUsage?.promptTokenCount || 0, output: fallbackUsage?.candidatesTokenCount || 0 },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const sseStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      let fullText = ''
      let usageMeta: any = null

      try {
        // Phase 3: Emit agent_detected early so frontend can show badge during streaming
        if (detectedAgent !== 'aica_coordinator') {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'agent_detected', agent: detectedAgent })}\n\n`))
        }

        for await (const chunk of streamResult.stream) {
          const chunkText = chunk.text()
          if (chunkText) {
            fullText += chunkText
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'token', content: chunkText })}\n\n`))
          }
        }

        // Generate suggested actions and follow-up questions
        const streamActions = generateSuggestedActions(streamMessage, streamRawData)
        const streamQuestions = generateSuggestedQuestions(streamMessage, fullText, streamModule, streamRawData)

        // Get usage metadata safely
        try {
          const response = await streamResult.response
          usageMeta = response?.usageMetadata
        } catch {
          // usageMetadata not available — skip
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'done',
          fullText,
          agent: detectedAgent,
          actions: streamActions,
          suggested_questions: streamQuestions,
          usage: { input: usageMeta?.promptTokenCount || 0, output: usageMeta?.candidatesTokenCount || 0 },
        })}\n\n`))
      } catch (streamError) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          message: (streamError as Error).message || 'Erro no streaming',
        })}\n\n`))
      } finally {
        const latencyMs = Date.now() - requestStartMs
        const streamingSuccess = fullText.length > 0

        // Structured metric log for observability
        console.log(`[chat_aica_stream] METRIC user=${userId} module=${streamModule} latency=${latencyMs}ms streaming=${streamingSuccess} tokens_in=${usageMeta?.promptTokenCount || 0} tokens_out=${usageMeta?.candidatesTokenCount || 0}`)

        // Fire-and-forget: log interaction with real token counts from stream
        if (userId && supabaseAdmin) {
          supabaseAdmin.rpc('log_interaction', {
            p_user_id: userId,
            p_action: 'chat_aica_stream',
            p_module: streamModule,
            p_model: MODELS.fast,
            p_tokens_in: usageMeta?.promptTokenCount || 0,
            p_tokens_out: usageMeta?.candidatesTokenCount || 0,
          }).catch((err: any) => {
            console.warn(`[chat_aica_stream] Failed to log interaction: ${err.message}`)
          })
        }

        // Fire-and-forget: save conversation pair for pattern learning
        if (userId && supabaseAdmin && fullText) {
          const patternKey = `chat_${streamModule}_latest`
          supabaseAdmin
            .from('user_patterns')
            .upsert({
              user_id: userId,
              pattern_type: 'routine',
              pattern_key: patternKey,
              description: `Última conversa no módulo ${streamModule}: "${streamMessage.substring(0, 100)}"`,
              evidence: [JSON.stringify({
                module: streamModule,
                message_preview: streamMessage.substring(0, 200),
                response_preview: fullText.substring(0, 200),
                detected_at: new Date().toISOString(),
              })],
              confidence_score: 0.50,
              is_active: true,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id,pattern_key' })
            .then(({ error: patternErr }: { error: any }) => {
              if (patternErr) console.warn('[chat_aica_stream] Pattern save failed:', patternErr.message)
            })
        }

        controller.close()
      }
    },
  })

  return new Response(sseStream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
