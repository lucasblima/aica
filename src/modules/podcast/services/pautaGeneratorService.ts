/**
 * Pauta Generator Service
 *
 * Implementa geracao de pautas estilo NotebookLM usando Gemini Deep Research.
 * Gera pautas estruturadas com pesquisa profunda, multiplas fontes e
 * conteudo otimizado para entrevistas.
 *
 * Padroes:
 * - Usa gemini-2.5-flash para operacoes complexas
 * - Implementa retry com exponential backoff
 * - Suporta streaming para feedback em tempo real
 */

import { GeminiClient } from '@/lib/gemini/client'
import type { Dossier, Topic, TopicCategory } from '../types'

// =====================================================
// TYPES
// =====================================================

export interface PautaGenerationRequest {
  guestName: string
  theme?: string
  context?: string // Contexto adicional fornecido pelo usuario
  sources?: PautaSource[] // Fontes personalizadas (links, textos, arquivos)
  style?: PautaStyle
  duration?: number // Duracao estimada em minutos
}

export interface PautaSource {
  type: 'url' | 'text' | 'file'
  content: string // URL, texto ou nome do arquivo
  title?: string
}

export interface PautaStyle {
  tone: 'formal' | 'casual' | 'investigativo' | 'humano'
  depth: 'shallow' | 'medium' | 'deep'
  focusAreas?: string[] // Areas especificas para focar
}

export interface GeneratedPauta {
  // Estrutura principal
  outline: PautaOutline
  questions: PautaQuestion[]
  iceBreakers: string[]

  // Metadata
  sources: SourceCitation[]
  researchSummary: string
  estimatedDuration: number
  confidenceScore: number

  // Dados do dossier
  biography: string
  controversies: Controversy[]
  keyFacts: string[]
  technicalSheet?: TechnicalSheetData
}

export interface PautaOutline {
  title: string
  introduction: OutlineSection
  mainSections: OutlineSection[]
  conclusion: OutlineSection
}

export interface OutlineSection {
  title: string
  description: string
  duration: number // Minutos estimados
  keyPoints: string[]
  suggestedTransition?: string
}

export interface PautaQuestion {
  id: string
  text: string
  category: 'abertura' | 'desenvolvimento' | 'aprofundamento' | 'fechamento' | 'quebra-gelo'
  followUps: string[]
  context?: string // Contexto de pesquisa que gerou a pergunta
  sourceRefs?: number[] // Referencias as fontes
  priority: 'high' | 'medium' | 'low'
}

export interface SourceCitation {
  id: number
  url?: string
  title: string
  snippet: string
  date?: string
  reliability: 'high' | 'medium' | 'low'
}

export interface Controversy {
  title: string
  summary: string
  sentiment: 'positive' | 'negative' | 'neutral'
  date?: string
  sourceRef?: number
}

export interface TechnicalSheetData {
  fullName?: string
  birthDate?: string
  birthPlace?: string
  occupation?: string
  education?: string[]
  achievements?: string[]
  socialMedia?: Record<string, string>
}

// =====================================================
// SYSTEM PROMPTS
// =====================================================

const SYSTEM_PROMPTS = {
  pautaOutline: `
    Voce e um produtor de podcast experiente especializado em criar pautas para entrevistas de alta qualidade.

    Responsabilidades:
    - Analisar informacoes sobre o convidado e tema
    - Criar uma estrutura de pauta envolvente e informativa
    - Garantir fluxo natural de conversacao
    - Identificar momentos de tensao narrativa
    - Sugerir transicoes suaves entre topicos

    Estilo:
    - Estrutura clara e objetiva
    - Foco em storytelling
    - Equilibrio entre leveza e profundidade
    - Consideracao pelo tempo disponivel

    Formato de saida: JSON valido seguindo a estrutura fornecida.
  `,

  questionGeneration: `
    Voce e um jornalista investigativo experiente que cria perguntas para entrevistas.

    Responsabilidades:
    - Gerar perguntas abertas que estimulem respostas ricas
    - Criar follow-ups para aprofundar temas importantes
    - Identificar angulos inexplorados
    - Equilibrar perguntas factuais e emocionais
    - Incluir perguntas que gerem momentos memoraveis

    Estilo:
    - Perguntas diretas mas respeitosas
    - Evitar perguntas sim/nao
    - Usar "como" e "por que" frequentemente
    - Incluir contexto quando necessario
    - Considerar a audiencia do podcast

    Formato de saida: JSON valido com array de perguntas.
  `,

  deepResearch: `
    Voce e um pesquisador especializado em preparacao de entrevistas.

    Responsabilidades:
    - Coletar informacoes biograficas precisas
    - Identificar controversias e polemicas recentes
    - Encontrar fatos interessantes e pouco conhecidos
    - Verificar informacoes em multiplas fontes
    - Contextualizar a relevancia atual do entrevistado

    Estilo:
    - Pesquisa profunda e verificada
    - Neutralidade jornalistica
    - Foco em informacoes actionable
    - Priorizacao de fontes confiaveis

    Formato de saida: JSON valido com biografia, controversias e fatos-chave.
  `,

  iceBreakers: `
    Voce e um produtor criativo especializado em criar momentos de conexao em entrevistas.

    Responsabilidades:
    - Criar perguntas leves para quebrar o gelo
    - Identificar interesses pessoais do convidado
    - Sugerir topicos nao-obvios que gerem surpresa
    - Humanizar o entrevistado

    Estilo:
    - Perguntas inesperadas mas respeitosas
    - Tom leve e descontraido
    - Foco em curiosidades e preferencias pessoais
    - Evitar cliches

    Formato de saida: JSON array de strings com perguntas.
  `
}

// =====================================================
// SERVICE CLASS
// =====================================================

class PautaGeneratorService {
  private geminiClient: GeminiClient

  constructor() {
    this.geminiClient = GeminiClient.getInstance()
  }

  /**
   * Gera uma pauta completa com Deep Research estilo NotebookLM
   *
   * Fluxo:
   * 1. Deep Research sobre o convidado
   * 2. Geracao do outline da pauta
   * 3. Geracao de perguntas por categoria
   * 4. Geracao de ice breakers
   * 5. Compilacao final
   */
  async generateCompletePauta(
    request: PautaGenerationRequest,
    onProgress?: (step: string, progress: number) => void
  ): Promise<GeneratedPauta> {
    const { guestName, theme, context, sources, style, duration = 60 } = request

    try {
      // Step 1: Deep Research (30%)
      onProgress?.('Pesquisando informacoes sobre o convidado...', 10)
      const research = await this.performDeepResearch(guestName, theme, sources)
      onProgress?.('Pesquisa concluida', 30)

      // Step 2: Generate Outline (50%)
      onProgress?.('Criando estrutura da pauta...', 40)
      const outline = await this.generateOutline(
        guestName,
        theme || research.suggestedTheme,
        research,
        style,
        duration
      )
      onProgress?.('Estrutura criada', 50)

      // Step 3: Generate Questions (75%)
      onProgress?.('Gerando perguntas...', 60)
      const questions = await this.generateQuestions(
        guestName,
        outline,
        research,
        context
      )
      onProgress?.('Perguntas geradas', 75)

      // Step 4: Generate Ice Breakers (90%)
      onProgress?.('Criando perguntas quebra-gelo...', 80)
      const iceBreakers = await this.generateIceBreakers(guestName, research)
      onProgress?.('Quebra-gelos criados', 90)

      // Step 5: Compile Final Pauta (100%)
      onProgress?.('Finalizando pauta...', 95)
      const pauta = this.compilePauta(
        outline,
        questions,
        iceBreakers,
        research,
        duration
      )
      onProgress?.('Pauta completa!', 100)

      return pauta
    } catch (error) {
      console.error('Error generating pauta:', error)
      throw error
    }
  }

  /**
   * Realiza Deep Research sobre o convidado
   */
  private async performDeepResearch(
    guestName: string,
    theme?: string,
    sources?: PautaSource[]
  ): Promise<{
    biography: string
    controversies: Controversy[]
    keyFacts: string[]
    technicalSheet?: TechnicalSheetData
    sourceCitations: SourceCitation[]
    suggestedTheme: string
  }> {
    const sourcesContext = sources?.map(s =>
      `[${s.type.toUpperCase()}] ${s.title || 'Fonte'}: ${s.content.substring(0, 500)}`
    ).join('\n\n') || ''

    const prompt = `
${SYSTEM_PROMPTS.deepResearch}

Pesquise informacoes sobre: ${guestName}
${theme ? `Tema/Contexto: ${theme}` : ''}
${sourcesContext ? `\nFontes adicionais fornecidas:\n${sourcesContext}` : ''}

Retorne um JSON com a seguinte estrutura:
{
  "biography": "Biografia detalhada em 3-5 paragrafos",
  "controversies": [
    {
      "title": "Titulo da controversia",
      "summary": "Resumo objetivo",
      "sentiment": "negative|positive|neutral",
      "date": "YYYY-MM-DD ou null"
    }
  ],
  "keyFacts": ["Fato interessante 1", "Fato interessante 2"],
  "technicalSheet": {
    "fullName": "Nome completo",
    "birthDate": "YYYY-MM-DD ou null",
    "birthPlace": "Cidade, Estado/Pais",
    "occupation": "Ocupacao principal",
    "education": ["Formacao 1", "Formacao 2"],
    "achievements": ["Conquista 1", "Conquista 2"],
    "socialMedia": {"instagram": "@handle", "twitter": "@handle"}
  },
  "suggestedTheme": "Tema sugerido baseado na pesquisa se nao fornecido",
  "sourceCitations": [
    {
      "id": 1,
      "title": "Titulo da fonte",
      "snippet": "Trecho relevante",
      "reliability": "high|medium|low"
    }
  ]
}

Retorne APENAS JSON valido.
`

    try {
      const response = await this.geminiClient.call({
        action: 'deep_research',
        payload: { prompt, guestName, theme }
      })

      const data = typeof response.result === 'string'
        ? JSON.parse(response.result)
        : response.result

      return {
        biography: data.biography || `Informacoes sobre ${guestName} estao sendo pesquisadas.`,
        controversies: data.controversies || [],
        keyFacts: data.keyFacts || [],
        technicalSheet: data.technicalSheet,
        sourceCitations: data.sourceCitations || [],
        suggestedTheme: data.suggestedTheme || 'Trajetoria e Carreira'
      }
    } catch (error) {
      console.error('Deep research failed:', error)
      // Fallback data
      return {
        biography: `${guestName} e uma personalidade a ser pesquisada.`,
        controversies: [],
        keyFacts: [],
        sourceCitations: [],
        suggestedTheme: theme || 'Entrevista'
      }
    }
  }

  /**
   * Gera o outline estruturado da pauta
   */
  private async generateOutline(
    guestName: string,
    theme: string,
    research: {
      biography: string
      controversies: Controversy[]
      keyFacts: string[]
    },
    style?: PautaStyle,
    duration: number = 60
  ): Promise<PautaOutline> {
    const prompt = `
${SYSTEM_PROMPTS.pautaOutline}

Crie uma pauta para entrevista com:
- Convidado: ${guestName}
- Tema: ${theme}
- Duracao total: ${duration} minutos
- Tom: ${style?.tone || 'casual'}
- Profundidade: ${style?.depth || 'medium'}
${style?.focusAreas?.length ? `- Areas de foco: ${style.focusAreas.join(', ')}` : ''}

Contexto da pesquisa:
- Biografia: ${research.biography.substring(0, 500)}...
- Fatos-chave: ${research.keyFacts.join('; ')}
- Controversias: ${research.controversies.map(c => c.title).join('; ') || 'Nenhuma identificada'}

Retorne um JSON com estrutura:
{
  "title": "Titulo atraente para o episodio",
  "introduction": {
    "title": "Abertura",
    "description": "Como iniciar a entrevista",
    "duration": 5,
    "keyPoints": ["Ponto 1", "Ponto 2"],
    "suggestedTransition": "Transicao para proximo bloco"
  },
  "mainSections": [
    {
      "title": "Nome da secao",
      "description": "O que abordar",
      "duration": 15,
      "keyPoints": ["Ponto 1", "Ponto 2", "Ponto 3"],
      "suggestedTransition": "Transicao para proximo bloco"
    }
  ],
  "conclusion": {
    "title": "Fechamento",
    "description": "Como encerrar",
    "duration": 5,
    "keyPoints": ["Ponto final 1", "Ponto final 2"]
  }
}

Retorne APENAS JSON valido.
`

    try {
      const response = await this.geminiClient.call({
        action: 'generate_pauta_outline',
        payload: {
          guestName,
          theme,
          biography: research.biography,
          keyFacts: research.keyFacts,
          controversies: research.controversies.map(c => c.title),
          duration,
          style
        }
      })

      const data = typeof response.result === 'string'
        ? JSON.parse(response.result)
        : response.result

      return data as PautaOutline
    } catch (error) {
      console.error('Outline generation failed:', error)
      // Fallback outline
      return {
        title: `Entrevista com ${guestName}: ${theme}`,
        introduction: {
          title: 'Abertura',
          description: 'Apresentacao do convidado',
          duration: 5,
          keyPoints: ['Apresentar convidado', 'Contextualizar tema']
        },
        mainSections: [
          {
            title: 'Trajetoria',
            description: 'Historia e carreira',
            duration: 20,
            keyPoints: ['Inicio da carreira', 'Momentos marcantes', 'Desafios superados']
          },
          {
            title: 'Atualidade',
            description: 'Projetos atuais',
            duration: 20,
            keyPoints: ['Projetos em andamento', 'Visao de futuro']
          }
        ],
        conclusion: {
          title: 'Fechamento',
          description: 'Mensagem final',
          duration: 5,
          keyPoints: ['Agradecimentos', 'Proximos passos']
        }
      }
    }
  }

  /**
   * Gera perguntas categorizadas para a entrevista
   */
  private async generateQuestions(
    guestName: string,
    outline: PautaOutline,
    research: {
      biography: string
      controversies: Controversy[]
      keyFacts: string[]
    },
    additionalContext?: string
  ): Promise<PautaQuestion[]> {
    const sectionsContext = outline.mainSections.map(s =>
      `- ${s.title}: ${s.keyPoints.join(', ')}`
    ).join('\n')

    const prompt = `
${SYSTEM_PROMPTS.questionGeneration}

Gere perguntas para entrevista com ${guestName}.

Estrutura da pauta:
${sectionsContext}

Contexto da pesquisa:
- ${research.keyFacts.slice(0, 5).join('\n- ')}
${research.controversies.length ? `\nControversias a explorar:\n- ${research.controversies.map(c => c.title).join('\n- ')}` : ''}
${additionalContext ? `\nContexto adicional: ${additionalContext}` : ''}

Gere 15-20 perguntas distribuidas nas categorias:
- abertura (2-3 perguntas leves)
- desenvolvimento (8-10 perguntas principais)
- aprofundamento (3-4 perguntas investigativas)
- fechamento (2-3 perguntas de conclusao)

Retorne JSON:
{
  "questions": [
    {
      "id": "q1",
      "text": "Pergunta completa?",
      "category": "abertura|desenvolvimento|aprofundamento|fechamento",
      "followUps": ["Follow-up 1?", "Follow-up 2?"],
      "context": "Por que essa pergunta e relevante",
      "priority": "high|medium|low"
    }
  ]
}

Retorne APENAS JSON valido.
`

    try {
      const response = await this.geminiClient.call({
        action: 'generate_pauta_questions',
        payload: {
          guestName,
          outline: {
            title: outline.title,
            mainSections: outline.mainSections.map(s => ({
              title: s.title,
              keyPoints: s.keyPoints
            }))
          },
          keyFacts: research.keyFacts,
          controversies: research.controversies.map(c => c.title),
          additionalContext: additionalContext
        }
      })

      const data = typeof response.result === 'string'
        ? JSON.parse(response.result)
        : response.result

      return data.questions || []
    } catch (error) {
      console.error('Question generation failed:', error)
      // Fallback questions
      return [
        {
          id: 'q1',
          text: `${guestName}, como voce descreveria sua trajetoria ate aqui?`,
          category: 'abertura',
          followUps: ['O que te motivou a seguir esse caminho?'],
          priority: 'high'
        },
        {
          id: 'q2',
          text: 'Qual foi o maior desafio que voce enfrentou na carreira?',
          category: 'desenvolvimento',
          followUps: ['Como voce superou?', 'O que aprendeu com isso?'],
          priority: 'high'
        },
        {
          id: 'q3',
          text: 'O que voce diria para quem esta comecando na area?',
          category: 'fechamento',
          followUps: [],
          priority: 'medium'
        }
      ]
    }
  }

  /**
   * Gera perguntas quebra-gelo personalizadas
   */
  private async generateIceBreakers(
    guestName: string,
    research: {
      biography: string
      keyFacts: string[]
      technicalSheet?: TechnicalSheetData
    }
  ): Promise<string[]> {
    const prompt = `
${SYSTEM_PROMPTS.iceBreakers}

Crie 5 perguntas quebra-gelo para ${guestName}.

Informacoes disponiveis:
- ${research.keyFacts.slice(0, 3).join('\n- ')}
${research.technicalSheet?.occupation ? `- Ocupacao: ${research.technicalSheet.occupation}` : ''}

Retorne JSON:
{
  "iceBreakers": [
    "Pergunta leve e criativa 1?",
    "Pergunta leve e criativa 2?",
    "Pergunta leve e criativa 3?",
    "Pergunta leve e criativa 4?",
    "Pergunta leve e criativa 5?"
  ]
}

Retorne APENAS JSON valido.
`

    try {
      const response = await this.geminiClient.call({
        action: 'generate_ice_breakers',
        payload: {
          guestName,
          keyFacts: research.keyFacts,
          occupation: research.technicalSheet?.occupation
        }
      })

      const data = typeof response.result === 'string'
        ? JSON.parse(response.result)
        : response.result

      return data.iceBreakers || []
    } catch (error) {
      console.error('Ice breakers generation failed:', error)
      return [
        `${guestName}, qual foi a ultima coisa que te fez rir?`,
        'Se voce pudesse jantar com qualquer pessoa, viva ou morta, quem seria?',
        'Qual e a sua guilty pleasure?'
      ]
    }
  }

  /**
   * Compila todos os elementos na pauta final
   */
  private compilePauta(
    outline: PautaOutline,
    questions: PautaQuestion[],
    iceBreakers: string[],
    research: {
      biography: string
      controversies: Controversy[]
      keyFacts: string[]
      technicalSheet?: TechnicalSheetData
      sourceCitations: SourceCitation[]
    },
    estimatedDuration: number
  ): GeneratedPauta {
    // Calculate confidence based on research completeness
    const hasGoodBio = research.biography.length > 200
    const hasControversies = research.controversies.length > 0
    const hasFacts = research.keyFacts.length > 3
    const hasSources = research.sourceCitations.length > 0

    const confidenceScore = [hasGoodBio, hasControversies, hasFacts, hasSources]
      .filter(Boolean).length * 25

    return {
      outline,
      questions,
      iceBreakers,
      sources: research.sourceCitations,
      researchSummary: research.biography.substring(0, 300) + '...',
      estimatedDuration,
      confidenceScore,
      biography: research.biography,
      controversies: research.controversies,
      keyFacts: research.keyFacts,
      technicalSheet: research.technicalSheet
    }
  }

  /**
   * Converte GeneratedPauta para o formato Dossier existente
   */
  pautaToDossier(pauta: GeneratedPauta, guestName: string, theme: string): Dossier {
    return {
      guestName,
      episodeTheme: theme,
      biography: pauta.biography,
      controversies: pauta.controversies.map(c => c.summary),
      suggestedTopics: pauta.questions
        .filter(q => q.category === 'desenvolvimento' || q.category === 'aprofundamento')
        .map(q => q.text),
      iceBreakers: pauta.iceBreakers,
      technicalSheet: pauta.technicalSheet ? {
        fullName: pauta.technicalSheet.fullName,
        birthInfo: pauta.technicalSheet.birthDate ? {
          date: pauta.technicalSheet.birthDate,
          city: pauta.technicalSheet.birthPlace?.split(',')[0]?.trim(),
          state: pauta.technicalSheet.birthPlace?.split(',')[1]?.trim()
        } : undefined,
        education: pauta.technicalSheet.education?.map(e => ({
          degree: e,
          institution: ''
        })),
        careerHighlights: pauta.technicalSheet.achievements?.map(a => ({
          title: a,
          organization: ''
        }))
      } : undefined
    }
  }

  /**
   * Converte perguntas para Topics com categorias
   */
  questionsToTopics(questions: PautaQuestion[], episodeId: string): {
    topics: Topic[]
    categories: TopicCategory[]
  } {
    const categoryMap: Record<string, TopicCategory> = {
      'abertura': {
        id: 'abertura',
        name: 'Abertura',
        color: '#10B981',
        episode_id: episodeId
      },
      'desenvolvimento': {
        id: 'geral',
        name: 'Geral',
        color: '#3B82F6',
        episode_id: episodeId
      },
      'aprofundamento': {
        id: 'aprofundamento',
        name: 'Aprofundamento',
        color: '#8B5CF6',
        episode_id: episodeId
      },
      'fechamento': {
        id: 'fechamento',
        name: 'Fechamento',
        color: '#F59E0B',
        episode_id: episodeId
      },
      'quebra-gelo': {
        id: 'quebra-gelo',
        name: 'Quebra-Gelo',
        color: '#06B6D4',
        episode_id: episodeId
      }
    }

    const topics: Topic[] = questions.map((q, idx) => ({
      id: q.id,
      text: q.text,
      completed: false,
      order: idx,
      archived: false,
      categoryId: categoryMap[q.category]?.id || 'geral'
    }))

    const usedCategories = [...new Set(questions.map(q => q.category))]
    const categories = usedCategories
      .map(c => categoryMap[c])
      .filter(Boolean)

    return { topics, categories }
  }

  /**
   * Refina uma secao especifica da pauta com mais contexto
   */
  async refineSection(
    sectionTitle: string,
    currentContent: string,
    additionalContext: string,
    guestName: string
  ): Promise<string> {
    const prompt = `
Voce e um editor de pautas de podcast.

Refine a seguinte secao da pauta para ${guestName}:

Secao: ${sectionTitle}
Conteudo atual: ${currentContent}

Contexto adicional: ${additionalContext}

Melhore o conteudo mantendo a estrutura, mas adicionando mais profundidade e relevancia.
Retorne apenas o texto refinado, sem JSON.
`

    try {
      const response = await this.geminiClient.call({
        action: 'refine_pauta_section',
        payload: { prompt, sectionTitle, guestName }
      })

      return response.result || currentContent
    } catch (error) {
      console.error('Section refinement failed:', error)
      return currentContent
    }
  }

  /**
   * Enriquece a pauta com fontes adicionais
   */
  async enrichWithSources(
    currentPauta: GeneratedPauta,
    newSources: PautaSource[],
    guestName: string
  ): Promise<GeneratedPauta> {
    const sourcesContent = newSources.map(s =>
      `[${s.type.toUpperCase()}] ${s.title || 'Fonte'}: ${s.content.substring(0, 1000)}`
    ).join('\n\n')

    const prompt = `
Voce e um pesquisador de podcast.

Analise as novas fontes e enriqueca as informacoes sobre ${guestName}:

Fontes:
${sourcesContent}

Informacoes atuais:
- Biografia: ${currentPauta.biography.substring(0, 500)}
- Fatos: ${currentPauta.keyFacts.join('; ')}

Retorne JSON com novos fatos, perguntas adicionais e citacoes:
{
  "newFacts": ["Novo fato 1", "Novo fato 2"],
  "additionalQuestions": [
    {
      "text": "Nova pergunta baseada nas fontes?",
      "context": "Contexto da fonte"
    }
  ],
  "sourceCitations": [
    {
      "id": ${(currentPauta.sources?.length || 0) + 1},
      "title": "Titulo da fonte",
      "snippet": "Trecho relevante",
      "reliability": "high|medium|low"
    }
  ],
  "biographyAdditions": "Informacoes adicionais para a biografia"
}

Retorne APENAS JSON valido.
`

    try {
      const response = await this.geminiClient.call({
        action: 'enrich_pauta_with_sources',
        payload: { prompt, guestName, sourcesContent }
      })

      const data = typeof response.result === 'string'
        ? JSON.parse(response.result)
        : response.result

      // Merge new data with existing pauta
      return {
        ...currentPauta,
        keyFacts: [...currentPauta.keyFacts, ...(data.newFacts || [])],
        biography: currentPauta.biography + '\n\n' + (data.biographyAdditions || ''),
        sources: [...(currentPauta.sources || []), ...(data.sourceCitations || [])],
        questions: [
          ...currentPauta.questions,
          ...(data.additionalQuestions || []).map((q: any, idx: number) => ({
            id: `enriched-${Date.now()}-${idx}`,
            text: q.text,
            category: 'aprofundamento' as const,
            followUps: [],
            context: q.context,
            priority: 'medium' as const
          }))
        ]
      }
    } catch (error) {
      console.error('Source enrichment failed:', error)
      return currentPauta
    }
  }
}

// Singleton export
export const pautaGeneratorService = new PautaGeneratorService()

// Default export
export default pautaGeneratorService
