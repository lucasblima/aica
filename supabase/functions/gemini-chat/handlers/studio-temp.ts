// handlers/studio-temp.ts — Studio module handlers (temporary — until gemini-studio Edge Function)
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.21.0'
import { MODELS } from '../../_shared/gemini-helpers.ts'
import { extractJSON } from '../../_shared/model-router.ts'
import type {
  GenerateDossierPayload, DossierResult,
  IceBreakerPayload, IceBreakerResult,
  PautaQuestionsPayload, PautaQuestionsResult,
  PautaOutlinePayload, PautaOutlineResult,
  ResearchGuestPayload, GuestProfile,
} from '../../_shared/gemini-types.ts'

// ============================================================================
// PROMPT TEMPLATES (Studio-specific)
// ============================================================================

const STUDIO_PROMPTS = {
  generate_dossier: (guestName: string, theme?: string) => `Voce e um pesquisador especializado em preparacao de entrevistas para podcasts brasileiros.

Crie um dossie completo e detalhado sobre "${guestName}"${theme ? ` com foco no tema "${theme}"` : ''}.

Pesquise e retorne APENAS um JSON valido no formato EXATO abaixo (sem texto antes ou depois):
{
  "biography": "Biografia detalhada com 3-5 paragrafos cobrindo trajetoria profissional, realizacoes, e fatos relevantes",
  "controversies": ["Controversia ou ponto polemico 1", "Controversia 2"],
  "suggestedTopics": ["Topico 1 para entrevista", "Topico 2", "Topico 3", "Topico 4", "Topico 5"],
  "iceBreakers": ["Pergunta quebra-gelo 1", "Pergunta 2", "Pergunta 3"],
  "technicalSheet": {
    "fullName": "Nome completo",
    "occupation": "Ocupacao principal",
    "birthDate": "Data de nascimento se disponivel",
    "socialMedia": "Principais redes sociais",
    "notableWorks": "Obras ou projetos notaveis",
    "education": "Formacao academica se disponivel"
  }
}

IMPORTANTE:
- biography DEVE ser uma string com 3-5 paragrafos detalhados
- controversies DEVE ser um array de strings (pode ser vazio se nao houver)
- suggestedTopics DEVE conter 5-10 topicos relevantes para entrevista
- iceBreakers DEVE conter 3-5 perguntas leves para iniciar a conversa
- technicalSheet DEVE ser um objeto com dados factuais
- NAO inclua campos extras como "title" ou "content"
- Retorne APENAS o JSON, sem markdown, sem texto explicativo`,

  generate_ice_breakers: (guestName: string, keyFacts: string[] = [], occupation?: string) => `Crie 5 perguntas quebra-gelo personalizadas para ${guestName}. ${occupation ? `Ocupacao: ${occupation}` : ''} Retorne um JSON com iceBreakers array. Retorne APENAS JSON valido.`,

  generate_pauta_questions: (payload: PautaQuestionsPayload) => `Gere perguntas para entrevista com ${payload.guestName}. Retorne JSON com questions array. Retorne APENAS JSON valido.`,

  generate_pauta_outline: (payload: PautaOutlinePayload) => `Crie uma pauta estruturada para entrevista com ${payload.guestName} sobre ${payload.theme}. Retorne JSON com title, introduction, mainSections, conclusion. Retorne APENAS JSON valido.`,
}

// ============================================================================
// HANDLERS
// ============================================================================

export async function handleGenerateDossier(genAI: GoogleGenerativeAI, payload: GenerateDossierPayload): Promise<DossierResult> {
  if (!payload.guestName) throw new Error('Campo "guestName" e obrigatorio')

  const model = genAI.getGenerativeModel({ model: MODELS.smart, generationConfig: { temperature: 0.7, topP: 0.9, topK: 40, maxOutputTokens: 8192 } })
  const result = await model.generateContent(STUDIO_PROMPTS.generate_dossier(payload.guestName, payload.theme))
  const text = result.response.text()

  let parsed: DossierResult
  parsed = extractJSON(text)

  // Rescue: if model returned {content} instead of {biography}, use content as biography
  if (!parsed.biography && (parsed as any).content) {
    parsed.biography = (parsed as any).content
    delete (parsed as any).content
  }
  // Rescue: if model returned {title} instead of structured data, remove it
  if ((parsed as any).title && !parsed.biography) {
    parsed.biography = (parsed as any).title
    delete (parsed as any).title
  }

  parsed.biography = parsed.biography || 'Nao foi possivel gerar biografia'
  parsed.controversies = Array.isArray(parsed.controversies) ? parsed.controversies : []
  parsed.suggestedTopics = Array.isArray(parsed.suggestedTopics) ? parsed.suggestedTopics.slice(0, 10) : []
  parsed.iceBreakers = Array.isArray(parsed.iceBreakers) ? parsed.iceBreakers.slice(0, 5) : []
  // Ensure technicalSheet is an object
  parsed.technicalSheet = parsed.technicalSheet && typeof parsed.technicalSheet === 'object' ? parsed.technicalSheet : undefined

  return parsed
}

export async function handleGenerateIceBreakers(genAI: GoogleGenerativeAI, payload: IceBreakerPayload): Promise<IceBreakerResult> {
  if (!payload.guestName) throw new Error('Campo "guestName" e obrigatorio')

  const model = genAI.getGenerativeModel({ model: MODELS.smart, generationConfig: { temperature: 0.8, topP: 0.95, topK: 40, maxOutputTokens: 4096 } })
  const result = await model.generateContent(STUDIO_PROMPTS.generate_ice_breakers(payload.guestName, payload.keyFacts || [], payload.occupation))
  const text = result.response.text()

  let parsed: IceBreakerResult
  parsed = extractJSON(text)

  parsed.iceBreakers = Array.isArray(parsed.iceBreakers) ? parsed.iceBreakers.slice(0, 5) : []
  return parsed
}

export async function handleGeneratePautaQuestions(genAI: GoogleGenerativeAI, payload: PautaQuestionsPayload): Promise<PautaQuestionsResult> {
  if (!payload.guestName) throw new Error('Campo "guestName" e obrigatorio')
  if (!payload.outline || !Array.isArray(payload.outline.mainSections)) throw new Error('Campo "outline" e obrigatorio')

  const model = genAI.getGenerativeModel({ model: MODELS.smart, generationConfig: { temperature: 0.7, topP: 0.9, topK: 40, maxOutputTokens: 4096 } })
  const result = await model.generateContent(STUDIO_PROMPTS.generate_pauta_questions(payload))
  const text = result.response.text()

  let parsed: PautaQuestionsResult
  parsed = extractJSON(text)

  parsed.questions = Array.isArray(parsed.questions) ? parsed.questions.slice(0, 20) : []
  return parsed
}

export async function handleGeneratePautaOutline(genAI: GoogleGenerativeAI, payload: PautaOutlinePayload): Promise<PautaOutlineResult> {
  if (!payload.guestName) throw new Error('Campo "guestName" e obrigatorio')
  if (!payload.theme) throw new Error('Campo "theme" e obrigatorio')

  const model = genAI.getGenerativeModel({ model: MODELS.smart, generationConfig: { temperature: 0.7, topP: 0.9, topK: 40, maxOutputTokens: 4096 } })
  const result = await model.generateContent(STUDIO_PROMPTS.generate_pauta_outline(payload))
  const text = result.response.text()

  let parsed: PautaOutlineResult
  parsed = extractJSON(text)

  parsed.title = parsed.title || 'Entrevista sem titulo'
  parsed.mainSections = Array.isArray(parsed.mainSections) ? parsed.mainSections : []
  return parsed
}

export async function handleResearchGuest(genAI: GoogleGenerativeAI, payload: ResearchGuestPayload): Promise<GuestProfile> {
  const { guest_name, reference, prompt: customPrompt, system_instruction } = payload

  if (!guest_name || typeof guest_name !== 'string' || guest_name.trim().length < 2) {
    throw new Error('Campo "guest_name" e obrigatorio e deve ter pelo menos 2 caracteres')
  }

  const model = genAI.getGenerativeModel({
    model: MODELS.smart,
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 4096,
    },
  })

  const defaultSystemInstruction = `Voce e um assistente de pesquisa especializado em preparar entrevistas para podcasts.

Responsabilidades:
- Pesquisar informacoes precisas e verificaveis sobre figuras publicas
- Focar em conquistas e fatos recentes (ultimos 2 anos)
- Identificar topicos de interesse relevantes para uma entrevista
- Alertar sobre controversias importantes que o entrevistador deve conhecer
- Retornar apenas informacoes confiaveis

Estilo:
- Seja conciso mas informativo
- Use linguagem clara e objetiva
- Priorize qualidade sobre quantidade
- Indique quando informacoes nao sao confiaveis

Formato:
Retorne APENAS um objeto JSON valido, sem markdown ou texto adicional.`

  const defaultPrompt = `Pesquise a seguinte pessoa para uma entrevista de podcast:

Nome: ${guest_name}
${reference ? `Contexto/Referencia: ${reference}` : ''}

Por favor, forneca:
1. Nome completo e titulo profissional
2. Uma biografia de 2-3 frases
3. 3-5 fatos notaveis ou conquistas recentes (ultimos 2 anos)
4. 3-5 topicos pelos quais a pessoa e conhecida ou apaixonada
5. Quaisquer controversias significativas que um entrevistador deveria saber

Retorne as informacoes no seguinte formato JSON:
{
  "name": "string (nome completo)",
  "title": "string (titulo profissional/cargo)",
  "biography": "string (biografia de 2-3 frases)",
  "recent_facts": ["string", "string", ...],
  "topics_of_interest": ["string", "string", ...],
  "controversies": ["string", "string", ...],
  "is_reliable": true/false (true se encontrou informacoes confiaveis),
  "confidence_score": number (0-100, confianca na precisao das informacoes)
}

Se voce nao conseguir encontrar informacoes confiaveis sobre esta pessoa, retorne um objeto com is_reliable: false e confidence_score: 0.

IMPORTANTE: Retorne APENAS o objeto JSON, sem markdown, sem blocos de codigo, sem texto adicional.`

  const finalSystemInstruction = system_instruction || defaultSystemInstruction
  const finalPrompt = customPrompt || defaultPrompt

  const result = await model.generateContent({
    contents: [
      { role: 'user', parts: [{ text: finalSystemInstruction }, { text: finalPrompt }] }
    ],
  })

  const text = result.response.text()

  let parsed: Omit<GuestProfile, 'researched_at'>
  try {
    parsed = extractJSON(text)
  } catch {
    console.error('[research_guest] Failed to parse JSON response:', text)
    throw new Error('Falha ao processar resposta do modelo')
  }

  // Validate and normalize response
  const profile: GuestProfile = {
    name: String(parsed.name || guest_name),
    title: String(parsed.title || reference || ''),
    biography: String(parsed.biography || 'Informacoes detalhadas nao disponiveis no momento.'),
    recent_facts: Array.isArray(parsed.recent_facts) ? parsed.recent_facts.map(String).slice(0, 10) : [],
    topics_of_interest: Array.isArray(parsed.topics_of_interest) ? parsed.topics_of_interest.map(String).slice(0, 10) : [],
    controversies: Array.isArray(parsed.controversies) ? parsed.controversies.map(String).slice(0, 5) : [],
    image_url: parsed.image_url ? String(parsed.image_url) : undefined,
    is_reliable: Boolean(parsed.is_reliable),
    confidence_score: typeof parsed.confidence_score === 'number' ? Math.max(0, Math.min(100, parsed.confidence_score)) : 0,
    researched_at: new Date().toISOString(),
  }

  return {
    ...profile,
    __usageMetadata: result.response.usageMetadata
  } as any
}
