/**
 * Pauta Generator Service - Studio Module
 *
 * Implements NotebookLM-style pauta generation using Gemini Deep Research.
 * Generates structured pautas with deep research, multiple sources and
 * content optimized for interviews.
 *
 * Patterns:
 * - Uses gemini-2.5-flash for complex operations
 * - Implements retry with exponential backoff
 * - Supports streaming for real-time feedback
 *
 * Migration Note: Migrated from _deprecated/modules/podcast/services/pautaGeneratorService.ts
 * Wave 8: Validation & Fixes - Service Migrations
 */

import { GeminiClient } from '@/lib/gemini/client'
import type { Dossier, Topic, TopicCategory } from '../types'

// =====================================================
// TYPES
// =====================================================

export interface PautaGenerationRequest {
  guestName: string
  theme?: string
  context?: string // Additional context provided by user
  sources?: PautaSource[] // Custom sources (links, texts, files)
  style?: PautaStyle
  duration?: number // Estimated duration in minutes
}

export interface PautaSource {
  type: 'url' | 'text' | 'file'
  content: string // URL, text or file name
  title?: string
}

export interface PautaStyle {
  tone: 'formal' | 'casual' | 'investigativo' | 'humano'
  depth: 'shallow' | 'medium' | 'deep'
  focusAreas?: string[] // Specific areas to focus on
}

export interface GeneratedPauta {
  // Main structure
  outline: PautaOutline
  questions: PautaQuestion[]
  iceBreakers: string[]

  // Metadata
  sources: SourceCitation[]
  researchSummary: string
  estimatedDuration: number
  confidenceScore: number

  // Dossier data
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
  duration: number // Estimated minutes
  keyPoints: string[]
  suggestedTransition?: string
}

export interface PautaQuestion {
  id: string
  text: string
  category: 'abertura' | 'desenvolvimento' | 'aprofundamento' | 'fechamento' | 'quebra-gelo'
  followUps: string[]
  context?: string // Research context that generated the question
  sourceRefs?: number[] // Source references
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
    You are an experienced podcast producer specialized in creating high-quality interview pautas.

    Responsibilities:
    - Analyze guest information and theme
    - Create engaging and informative pauta structure
    - Ensure natural conversation flow
    - Identify narrative tension moments
    - Suggest smooth transitions between topics

    Style:
    - Clear and objective structure
    - Focus on storytelling
    - Balance between lightness and depth
    - Consider available time

    Output format: Valid JSON following the provided structure.
  `,

  questionGeneration: `
    You are an experienced investigative journalist who creates interview questions.

    Responsibilities:
    - Generate open questions that stimulate rich responses
    - Create follow-ups to deepen important themes
    - Identify unexplored angles
    - Balance factual and emotional questions
    - Include questions that create memorable moments

    Style:
    - Direct but respectful questions
    - Avoid yes/no questions
    - Use "how" and "why" frequently
    - Include context when necessary
    - Consider the podcast audience

    Output format: Valid JSON with question array.
  `,

  deepResearch: `
    You are a researcher specialized in interview preparation.

    Responsibilities:
    - Collect accurate biographical information
    - Identify recent controversies and polemics
    - Find interesting and little-known facts
    - Verify information from multiple sources
    - Contextualize the interviewee's current relevance

    Style:
    - Deep and verified research
    - Journalistic neutrality
    - Focus on actionable information
    - Prioritize reliable sources

    Output format: Valid JSON with biography, controversies and key facts.
  `,

  iceBreakers: `
    You are a creative producer specialized in creating connection moments in interviews.

    Responsibilities:
    - Create light questions to break the ice
    - Identify guest's personal interests
    - Suggest non-obvious topics that generate surprise
    - Humanize the interviewee

    Style:
    - Unexpected but respectful questions
    - Light and relaxed tone
    - Focus on curiosities and personal preferences
    - Avoid clichés

    Output format: JSON array of strings with questions.
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
   * Generates a complete pauta with NotebookLM-style Deep Research
   *
   * Flow:
   * 1. Deep Research about the guest
   * 2. Generate pauta outline
   * 3. Generate questions by category
   * 4. Generate ice breakers
   * 5. Final compilation
   */
  async generateCompletePauta(
    request: PautaGenerationRequest,
    onProgress?: (step: string, progress: number) => void
  ): Promise<GeneratedPauta> {
    const { guestName, theme, context, sources, style, duration = 60 } = request

    // Validate required fields
    if (!guestName || !guestName.trim()) {
      throw new Error('Guest name is required to generate pauta')
    }

    try {
      // Step 1: Deep Research (30%)
      onProgress?.('Researching information about the guest...', 10)
      const research = await this.performDeepResearch(guestName.trim(), theme?.trim(), sources)
      onProgress?.('Research complete', 30)

      // Step 2: Generate Outline (50%)
      onProgress?.('Creating pauta structure...', 40)
      const outline = await this.generateOutline(
        guestName,
        theme || research.suggestedTheme,
        research,
        style,
        duration
      )
      onProgress?.('Structure created', 50)

      // Step 3: Generate Questions (75%)
      onProgress?.('Generating questions...', 60)
      const questions = await this.generateQuestions(
        guestName,
        outline,
        research,
        context
      )
      onProgress?.('Questions generated', 75)

      // Step 4: Generate Ice Breakers (90%)
      onProgress?.('Creating ice breaker questions...', 80)
      const iceBreakers = await this.generateIceBreakers(guestName, research)
      onProgress?.('Ice breakers created', 90)

      // Step 5: Compile Final Pauta (100%)
      onProgress?.('Finalizing pauta...', 95)
      const pauta = this.compilePauta(
        outline,
        questions,
        iceBreakers,
        research,
        duration
      )
      onProgress?.('Complete pauta!', 100)

      return pauta
    } catch (error) {
      console.error('Error generating pauta:', error)
      throw error
    }
  }

  /**
   * Performs Deep Research about the guest
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
      `[${s.type.toUpperCase()}] ${s.title || 'Source'}: ${s.content.substring(0, 500)}`
    ).join('\n\n') || ''

    const prompt = `
${SYSTEM_PROMPTS.deepResearch}

Research information about: ${guestName}
${theme ? `Theme/Context: ${theme}` : ''}
${sourcesContext ? `\nAdditional sources provided:\n${sourcesContext}` : ''}

Return JSON with the following structure:
{
  "biography": "Detailed biography in 3-5 paragraphs",
  "controversies": [
    {
      "title": "Controversy title",
      "summary": "Objective summary",
      "sentiment": "negative|positive|neutral",
      "date": "YYYY-MM-DD or null"
    }
  ],
  "keyFacts": ["Interesting fact 1", "Interesting fact 2"],
  "technicalSheet": {
    "fullName": "Full name",
    "birthDate": "YYYY-MM-DD or null",
    "birthPlace": "City, State/Country",
    "occupation": "Main occupation",
    "education": ["Education 1", "Education 2"],
    "achievements": ["Achievement 1", "Achievement 2"],
    "socialMedia": {"instagram": "@handle", "twitter": "@handle"}
  },
  "suggestedTheme": "Suggested theme based on research if not provided",
  "sourceCitations": [
    {
      "id": 1,
      "title": "Source title",
      "snippet": "Relevant excerpt",
      "reliability": "high|medium|low"
    }
  ]
}

Return ONLY valid JSON.
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
        biography: data.biography || `Information about ${guestName} is being researched.`,
        controversies: data.controversies || [],
        keyFacts: data.keyFacts || [],
        technicalSheet: data.technicalSheet,
        sourceCitations: data.sourceCitations || [],
        suggestedTheme: data.suggestedTheme || 'Career and Trajectory'
      }
    } catch (error) {
      console.error('Deep research failed:', error)
      // Fallback data - ensure all required fields exist
      return {
        biography: `${guestName} is a personality to be researched. Detailed information will be available soon.`,
        controversies: [],
        keyFacts: [
          `Research about ${guestName}`,
          theme ? `Theme: ${theme}` : 'Theme to be defined'
        ],
        sourceCitations: [],
        suggestedTheme: theme || 'Career and Trajectory'
      }
    }
  }

  /**
   * Generates the structured pauta outline
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

Create a pauta for interview with:
- Guest: ${guestName}
- Theme: ${theme}
- Total duration: ${duration} minutes
- Tone: ${style?.tone || 'casual'}
- Depth: ${style?.depth || 'medium'}
${style?.focusAreas?.length ? `- Focus areas: ${style.focusAreas.join(', ')}` : ''}

Research context:
- Biography: ${research.biography.substring(0, 500)}...
- Key facts: ${research.keyFacts.join('; ')}
- Controversies: ${research.controversies.map(c => c.title).join('; ') || 'None identified'}

Return JSON with structure:
{
  "title": "Attractive episode title",
  "introduction": {
    "title": "Opening",
    "description": "How to start the interview",
    "duration": 5,
    "keyPoints": ["Point 1", "Point 2"],
    "suggestedTransition": "Transition to next block"
  },
  "mainSections": [
    {
      "title": "Section name",
      "description": "What to cover",
      "duration": 15,
      "keyPoints": ["Point 1", "Point 2", "Point 3"],
      "suggestedTransition": "Transition to next block"
    }
  ],
  "conclusion": {
    "title": "Closing",
    "description": "How to end",
    "duration": 5,
    "keyPoints": ["Final point 1", "Final point 2"]
  }
}

Return ONLY valid JSON.
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

      // Ensure all sections have keyPoints array
      if (data.introduction && !data.introduction.keyPoints) {
        data.introduction.keyPoints = []
      }
      if (data.mainSections) {
        data.mainSections = data.mainSections.map((section: any) => ({
          ...section,
          keyPoints: section.keyPoints || []
        }))
      }
      if (data.conclusion && !data.conclusion.keyPoints) {
        data.conclusion.keyPoints = []
      }

      return data as PautaOutline
    } catch (error) {
      console.error('Outline generation failed:', error)
      // Fallback outline
      return {
        title: `Interview with ${guestName}: ${theme}`,
        introduction: {
          title: 'Opening',
          description: 'Guest introduction',
          duration: 5,
          keyPoints: ['Introduce guest', 'Contextualize theme']
        },
        mainSections: [
          {
            title: 'Trajectory',
            description: 'Story and career',
            duration: 20,
            keyPoints: ['Career start', 'Memorable moments', 'Challenges overcome']
          },
          {
            title: 'Current Times',
            description: 'Current projects',
            duration: 20,
            keyPoints: ['Ongoing projects', 'Future vision']
          }
        ],
        conclusion: {
          title: 'Closing',
          description: 'Final message',
          duration: 5,
          keyPoints: ['Acknowledgments', 'Next steps']
        }
      }
    }
  }

  /**
   * Generates categorized questions for the interview
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
    // Ensure keyPoints exists for all sections (fallback to empty array)
    const sectionsContext = outline.mainSections.map(s =>
      `- ${s.title}: ${(s.keyPoints || []).join(', ')}`
    ).join('\n')

    const prompt = `
${SYSTEM_PROMPTS.questionGeneration}

Generate questions for interview with ${guestName}.

Pauta structure:
${sectionsContext}

Research context:
- ${research.keyFacts.slice(0, 5).join('\n- ')}
${research.controversies.length ? `\nControversies to explore:\n- ${research.controversies.map(c => c.title).join('\n- ')}` : ''}
${additionalContext ? `\nAdditional context: ${additionalContext}` : ''}

Generate 15-20 questions distributed across categories:
- abertura (2-3 light questions)
- desenvolvimento (8-10 main questions)
- aprofundamento (3-4 investigative questions)
- fechamento (2-3 conclusion questions)

Return JSON:
{
  "questions": [
    {
      "id": "q1",
      "text": "Complete question?",
      "category": "abertura|desenvolvimento|aprofundamento|fechamento",
      "followUps": ["Follow-up 1?", "Follow-up 2?"],
      "context": "Why this question is relevant",
      "priority": "high|medium|low"
    }
  ]
}

Return ONLY valid JSON.
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
          text: `${guestName}, how would you describe your trajectory so far?`,
          category: 'abertura',
          followUps: ['What motivated you to follow this path?'],
          priority: 'high'
        },
        {
          id: 'q2',
          text: 'What was the biggest challenge you faced in your career?',
          category: 'desenvolvimento',
          followUps: ['How did you overcome it?', 'What did you learn from this?'],
          priority: 'high'
        },
        {
          id: 'q3',
          text: 'What would you say to someone starting in the field?',
          category: 'fechamento',
          followUps: [],
          priority: 'medium'
        }
      ]
    }
  }

  /**
   * Generates personalized ice breaker questions
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

Create 5 ice breaker questions for ${guestName}.

Available information:
- ${research.keyFacts.slice(0, 3).join('\n- ')}
${research.technicalSheet?.occupation ? `- Occupation: ${research.technicalSheet.occupation}` : ''}

Return JSON:
{
  "iceBreakers": [
    "Light and creative question 1?",
    "Light and creative question 2?",
    "Light and creative question 3?",
    "Light and creative question 4?",
    "Light and creative question 5?"
  ]
}

Return ONLY valid JSON.
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
        `${guestName}, what was the last thing that made you laugh?`,
        'If you could have dinner with anyone, living or dead, who would it be?',
        'What is your guilty pleasure?'
      ]
    }
  }

  /**
   * Compiles all elements into the final pauta
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
   * Converts GeneratedPauta to existing Dossier format
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
   * Converts questions to Topics with categories
   */
  questionsToTopics(questions: PautaQuestion[], episodeId: string): {
    topics: Topic[]
    categories: TopicCategory[]
  } {
    const categoryMap: Record<string, TopicCategory> = {
      'abertura': {
        id: 'abertura',
        name: 'Opening',
        color: '#10B981',
        episode_id: episodeId
      },
      'desenvolvimento': {
        id: 'geral',
        name: 'General',
        color: '#3B82F6',
        episode_id: episodeId
      },
      'aprofundamento': {
        id: 'aprofundamento',
        name: 'Deep Dive',
        color: '#8B5CF6',
        episode_id: episodeId
      },
      'fechamento': {
        id: 'fechamento',
        name: 'Closing',
        color: '#F59E0B',
        episode_id: episodeId
      },
      'quebra-gelo': {
        id: 'quebra-gelo',
        name: 'Ice Breaker',
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
   * Refines a specific pauta section with more context
   */
  async refineSection(
    sectionTitle: string,
    currentContent: string,
    additionalContext: string,
    guestName: string
  ): Promise<string> {
    const prompt = `
You are a podcast pauta editor.

Refine the following pauta section for ${guestName}:

Section: ${sectionTitle}
Current content: ${currentContent}

Additional context: ${additionalContext}

Improve the content keeping the structure, but adding more depth and relevance.
Return only the refined text, no JSON.
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
   * Enriches the pauta with additional sources
   */
  async enrichWithSources(
    currentPauta: GeneratedPauta,
    newSources: PautaSource[],
    guestName: string
  ): Promise<GeneratedPauta> {
    const sourcesContent = newSources.map(s =>
      `[${s.type.toUpperCase()}] ${s.title || 'Source'}: ${s.content.substring(0, 1000)}`
    ).join('\n\n')

    const prompt = `
You are a podcast researcher.

Analyze the new sources and enrich the information about ${guestName}:

Sources:
${sourcesContent}

Current information:
- Biography: ${currentPauta.biography.substring(0, 500)}
- Facts: ${currentPauta.keyFacts.join('; ')}

Return JSON with new facts, additional questions and citations:
{
  "newFacts": ["New fact 1", "New fact 2"],
  "additionalQuestions": [
    {
      "text": "New question based on sources?",
      "context": "Source context"
    }
  ],
  "sourceCitations": [
    {
      "id": ${(currentPauta.sources?.length || 0) + 1},
      "title": "Source title",
      "snippet": "Relevant excerpt",
      "reliability": "high|medium|low"
    }
  ],
  "biographyAdditions": "Additional information for biography"
}

Return ONLY valid JSON.
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
