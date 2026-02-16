/**
 * Copyright (c) 2024 - Present. Aica Engineering. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Generate Sponsor Deck Edge Function
 * Issue #98 - Gerador de Deck de Patrocinio
 *
 * Generates professional PowerPoint presentations (PPTX) for cultural projects
 * seeking sponsors. Uses Gemini AI to generate persuasive content and pptxgenjs
 * to build the presentation.
 *
 * @module supabase/functions/generate-sponsor-deck
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0"
import PptxGenJS from "npm:pptxgenjs@3.12.0"
import { getCorsHeaders } from '../_shared/cors.ts'

// =============================================================================
// ENVIRONMENT & CONFIGURATION
// =============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

if (!GEMINI_API_KEY) {
  console.error('[generate-sponsor-deck] GEMINI_API_KEY not found in environment variables')
}

// =============================================================================
// SLIDE LAYOUT CONSTANTS
// Extracted to avoid magic numbers throughout the code
// =============================================================================

const SLIDE_LAYOUT = {
  // Margins and padding
  margin: 0.5,
  contentWidth: '90%',

  // Title positions
  title: { x: 0.5, y: 0.3, h: 0.8, fontSize: 32 },
  subtitle: { x: 0.5, y: 1.1, h: 0.5, fontSize: 18 },

  // Content positions
  content: { x: 0.5, y: 1.8, fontSize: 14 },

  // Cover slide
  cover: {
    title: { y: 2, h: 1, fontSize: 44 },
    tagline: { y: 3, h: 0.8, fontSize: 24 },
    organization: { y: 4.5, h: 0.5, fontSize: 18 },
    badge: { x: 3.5, y: 5.2, w: 3, h: 0.4, fontSize: 12 },
  },

  // Table defaults
  table: { x: 0.5, y: 2, w: 9 },
} as const

// =============================================================================
// TYPES
// =============================================================================

interface GenerateDeckRequest {
  projectId: string
  templateId: string
  options: DeckOptions
}

interface DeckOptions {
  highlightTierId?: string
  includeFinancials: boolean
  language: 'pt-BR' | 'en-US'
  colorScheme?: string
}

interface GeneratedContent {
  tagline: string
  executiveSummary: string
  whySponsorship: Array<{ title: string; description: string }>
  callToAction: string
}

interface TemplateConfig {
  primary: string
  secondary: string
  accent: string
  background: string
  text: string
  fonts: {
    heading: string
    body: string
  }
}

interface ProjectData {
  id: string
  project_name: string
  status: string
  approved_value: number | null
  approval_number: string | null
  validity_start: string | null
  validity_end: string | null
  capture_status: string | null
  captured_value: number | null
  capture_goal: number | null
  incentive_law: {
    id: string
    name: string
    short_name: string
    jurisdiction: string
    tax_type: string
    max_deduction_percentage: number | null
  } | null
  proponent: {
    id: string
    name: string
    description: string | null
    email: string | null
    phone: string | null
    website: string | null
    logo_url: string | null
    mission: string | null
    achievements: string[] | null
  } | null
  tiers: Array<{
    id: string
    name: string
    description: string | null
    value: number
    quantity_total: number
    quantity_sold: number
    is_highlighted: boolean
    color: string | null
    deliverables: Array<{
      id: string
      category: string
      title: string
      description: string | null
      quantity: number | null
    }>
  }>
}

// =============================================================================
// TEMPLATE DEFINITIONS
// =============================================================================

const TEMPLATES: Record<string, TemplateConfig> = {
  professional: {
    primary: '#1a365d',
    secondary: '#2d4a6f',
    accent: '#ed8936',
    background: '#ffffff',
    text: '#1a202c',
    fonts: {
      heading: 'Arial',
      body: 'Calibri',
    },
  },
  creative: {
    primary: '#805ad5',
    secondary: '#d53f8c',
    accent: '#38b2ac',
    background: '#faf5ff',
    text: '#2d3748',
    fonts: {
      heading: 'Trebuchet MS',
      body: 'Segoe UI',
    },
  },
  institutional: {
    primary: '#2c5282',
    secondary: '#276749',
    accent: '#d69e2e',
    background: '#f7fafc',
    text: '#1a202c',
    fonts: {
      heading: 'Georgia',
      body: 'Calibri',
    },
  },
}

// =============================================================================
// GEMINI CONTENT GENERATION
// =============================================================================

/**
 * Generate persuasive content for the deck using Gemini AI
 */
async function generateDeckContent(
  genAI: GoogleGenerativeAI,
  projectData: ProjectData,
  language: 'pt-BR' | 'en-US'
): Promise<{ content: GeneratedContent; usageMetadata: any }> {
  const modelName = Deno.env.get('GEMINI_MODEL_NAME') || 'gemini-2.5-flash'
  const model = genAI.getGenerativeModel({ model: modelName })

  const langInstructions = language === 'pt-BR'
    ? 'Responda em portugues brasileiro formal.'
    : 'Respond in formal American English.'

  const projectContext = `
Projeto: ${projectData.project_name}
Organizacao: ${projectData.proponent?.name || 'Nao especificada'}
${projectData.proponent?.description ? `Descricao: ${projectData.proponent.description}` : ''}
${projectData.proponent?.mission ? `Missao: ${projectData.proponent.mission}` : ''}
Lei de Incentivo: ${projectData.incentive_law?.name || 'Nao especificada'}
${projectData.incentive_law?.max_deduction_percentage ? `Deducao: ${projectData.incentive_law.max_deduction_percentage}%` : ''}
Valor Aprovado: ${projectData.approved_value ? `R$ ${projectData.approved_value.toLocaleString('pt-BR')}` : 'Nao especificado'}
Cotas disponiveis: ${projectData.tiers.length} cotas de patrocinio
`.trim()

  const prompt = `
Voce e um especialista em marketing cultural e captacao de recursos para projetos aprovados em leis de incentivo fiscal.

${langInstructions}

Com base nas informacoes do projeto abaixo, gere conteudo persuasivo para uma apresentacao de patrocinio:

${projectContext}

Retorne um JSON com a seguinte estrutura:
{
  "tagline": "Frase de impacto do projeto (MAXIMO 10 palavras)",
  "executiveSummary": "Resumo executivo persuasivo (MAXIMO 50 palavras)",
  "whySponsorship": [
    {
      "title": "Titulo curto do argumento 1",
      "description": "Descricao persuasiva em 1-2 sentencas"
    },
    {
      "title": "Titulo curto do argumento 2",
      "description": "Descricao persuasiva em 1-2 sentencas"
    },
    {
      "title": "Titulo curto do argumento 3",
      "description": "Descricao persuasiva em 1-2 sentencas"
    }
  ],
  "callToAction": "Frase de chamada para acao (convite para patrocinar)"
}

IMPORTANTE:
- Retorne APENAS o JSON, sem markdown ou formatacao extra
- O tagline deve ser impactante e memoravel
- O resumo executivo deve destacar o valor unico do projeto
- Os 3 argumentos devem cobrir: impacto social, retorno de marca, beneficio fiscal
- A chamada para acao deve ser direta e convidativa
`

  console.log('[generate-sponsor-deck] Generating content with Gemini...')

  try {
    const result = await model.generateContent(prompt)
    let responseText = result.response.text()

    // Clean JSON response
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let content: GeneratedContent
    try {
      content = JSON.parse(responseText)
    } catch (parseError) {
      console.error('[generate-sponsor-deck] Failed to parse Gemini response as JSON:', parseError)
      console.error('[generate-sponsor-deck] Raw Gemini response:', responseText)
      throw new Error('Conteudo gerado pela IA nao esta em formato JSON valido.')
    }

    console.log('[generate-sponsor-deck] Content generated successfully')

    return {
      content,
      usageMetadata: result.response.usageMetadata || null,
    }
  } catch (error) {
    console.error('[generate-sponsor-deck] Gemini generation failed:', error)

    // Fallback content
    const fallbackContent: GeneratedContent = {
      tagline: projectData.project_name,
      executiveSummary: `${projectData.project_name} e um projeto cultural aprovado ${projectData.incentive_law ? `pela ${projectData.incentive_law.short_name}` : ''} que busca patrocinadores para sua realizacao.`,
      whySponsorship: [
        {
          title: 'Impacto Social',
          description: 'Associe sua marca a um projeto que transforma vidas atraves da cultura.',
        },
        {
          title: 'Visibilidade de Marca',
          description: 'Exponha sua marca para milhares de pessoas atraves de contrapartidas exclusivas.',
        },
        {
          title: 'Beneficio Fiscal',
          description: projectData.incentive_law?.max_deduction_percentage
            ? `Deduza ate ${projectData.incentive_law.max_deduction_percentage}% do ${projectData.incentive_law.tax_type} devido.`
            : 'Aproveite os beneficios fiscais da lei de incentivo.',
        },
      ],
      callToAction: 'Entre em contato conosco e faca parte dessa historia.',
    }

    return {
      content: fallbackContent,
      usageMetadata: null,
      usedFallback: true, // Flag to indicate fallback was used
    }
  }
}

// =============================================================================
// PPTX GENERATION
// =============================================================================

/**
 * Format currency for display
 */
function formatCurrency(
  value: number,
  language: 'pt-BR' | 'en-US',
  currencyCode: 'BRL' | 'USD' = 'BRL'
): string {
  return new Intl.NumberFormat(language, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Build the PowerPoint presentation
 */
async function buildPresentation(
  projectData: ProjectData,
  generatedContent: GeneratedContent,
  template: TemplateConfig,
  options: DeckOptions
): Promise<string> {
  const pptx = new PptxGenJS()

  // Set presentation properties
  pptx.author = 'Aica Life OS'
  pptx.company = projectData.proponent?.name || 'Aica'
  pptx.title = `${projectData.project_name} - Deck de Patrocinio`
  pptx.subject = 'Proposta de Patrocinio'
  pptx.layout = 'LAYOUT_16x9'

  // Define master slide
  pptx.defineSlideMaster({
    title: 'MASTER_SLIDE',
    background: { color: template.background.replace('#', '') },
  })

  // ===================
  // SLIDE 1: Cover
  // ===================
  const slide1 = pptx.addSlide({ masterName: 'MASTER_SLIDE' })

  // Background gradient effect
  slide1.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: '100%',
    h: '40%',
    fill: { color: template.primary.replace('#', '') },
  })

  // Project name
  slide1.addText(projectData.project_name, {
    x: 0.5,
    y: 1.5,
    w: '90%',
    h: 1,
    fontSize: 44,
    fontFace: template.fonts.heading,
    color: 'FFFFFF',
    bold: true,
    align: 'center',
  })

  // Tagline
  slide1.addText(generatedContent.tagline, {
    x: 0.5,
    y: 3,
    w: '90%',
    h: 0.8,
    fontSize: 24,
    fontFace: template.fonts.body,
    color: template.text.replace('#', ''),
    align: 'center',
    italic: true,
  })

  // Organization name
  if (projectData.proponent?.name) {
    slide1.addText(projectData.proponent.name, {
      x: 0.5,
      y: 4.5,
      w: '90%',
      h: 0.5,
      fontSize: 18,
      fontFace: template.fonts.body,
      color: template.secondary.replace('#', ''),
      align: 'center',
    })
  }

  // Approval number badge
  if (projectData.approval_number) {
    slide1.addShape(pptx.ShapeType.roundRect, {
      x: 3.5,
      y: 5.2,
      w: 3,
      h: 0.4,
      fill: { color: template.accent.replace('#', '') },
      rectRadius: 0.1,
    })
    slide1.addText(projectData.approval_number, {
      x: 3.5,
      y: 5.2,
      w: 3,
      h: 0.4,
      fontSize: 12,
      fontFace: template.fonts.body,
      color: 'FFFFFF',
      align: 'center',
      valign: 'middle',
    })
  }

  // ===================
  // SLIDE 2: Organization
  // ===================
  const slide2 = pptx.addSlide({ masterName: 'MASTER_SLIDE' })

  slide2.addText('Sobre o Proponente', {
    x: 0.5,
    y: 0.3,
    w: '90%',
    h: 0.6,
    fontSize: 32,
    fontFace: template.fonts.heading,
    color: template.primary.replace('#', ''),
    bold: true,
  })

  // Divider line
  slide2.addShape(pptx.ShapeType.line, {
    x: 0.5,
    y: 0.95,
    w: 2,
    h: 0,
    line: { color: template.accent.replace('#', ''), width: 3 },
  })

  // Organization name
  slide2.addText(projectData.proponent?.name || 'Organizacao Proponente', {
    x: 0.5,
    y: 1.2,
    w: '90%',
    h: 0.5,
    fontSize: 24,
    fontFace: template.fonts.heading,
    color: template.secondary.replace('#', ''),
    bold: true,
  })

  // Description
  slide2.addText(projectData.proponent?.description || 'Informacoes sobre a organizacao proponente do projeto.', {
    x: 0.5,
    y: 1.8,
    w: '60%',
    h: 1.5,
    fontSize: 14,
    fontFace: template.fonts.body,
    color: template.text.replace('#', ''),
    valign: 'top',
  })

  // Mission if available
  if (projectData.proponent?.mission) {
    slide2.addShape(pptx.ShapeType.roundRect, {
      x: 0.5,
      y: 3.5,
      w: '60%',
      h: 1,
      fill: { color: template.primary.replace('#', ''), transparency: 90 },
      rectRadius: 0.1,
    })
    slide2.addText(`Missao: ${projectData.proponent.mission}`, {
      x: 0.7,
      y: 3.6,
      w: '55%',
      h: 0.8,
      fontSize: 12,
      fontFace: template.fonts.body,
      color: template.text.replace('#', ''),
      italic: true,
    })
  }

  // Contact info on the right
  const contactY = 1.2
  if (projectData.proponent?.website) {
    slide2.addText(`Site: ${projectData.proponent.website}`, {
      x: 6.5,
      y: contactY,
      w: 3,
      h: 0.3,
      fontSize: 11,
      fontFace: template.fonts.body,
      color: template.text.replace('#', ''),
    })
  }
  if (projectData.proponent?.email) {
    slide2.addText(`Email: ${projectData.proponent.email}`, {
      x: 6.5,
      y: contactY + 0.35,
      w: 3,
      h: 0.3,
      fontSize: 11,
      fontFace: template.fonts.body,
      color: template.text.replace('#', ''),
    })
  }
  if (projectData.proponent?.phone) {
    slide2.addText(`Tel: ${projectData.proponent.phone}`, {
      x: 6.5,
      y: contactY + 0.7,
      w: 3,
      h: 0.3,
      fontSize: 11,
      fontFace: template.fonts.body,
      color: template.text.replace('#', ''),
    })
  }

  // ===================
  // SLIDE 3: Project Overview
  // ===================
  const slide3 = pptx.addSlide({ masterName: 'MASTER_SLIDE' })

  slide3.addText('O Projeto', {
    x: 0.5,
    y: 0.3,
    w: '90%',
    h: 0.6,
    fontSize: 32,
    fontFace: template.fonts.heading,
    color: template.primary.replace('#', ''),
    bold: true,
  })

  slide3.addShape(pptx.ShapeType.line, {
    x: 0.5,
    y: 0.95,
    w: 2,
    h: 0,
    line: { color: template.accent.replace('#', ''), width: 3 },
  })

  // Executive summary
  slide3.addText(generatedContent.executiveSummary, {
    x: 0.5,
    y: 1.3,
    w: '90%',
    h: 1.2,
    fontSize: 18,
    fontFace: template.fonts.body,
    color: template.text.replace('#', ''),
    valign: 'top',
  })

  // Key info cards
  const cardWidth = 2.8
  const cardHeight = 1.2
  const cardY = 3

  if (projectData.approved_value && options.includeFinancials) {
    slide3.addShape(pptx.ShapeType.roundRect, {
      x: 0.5,
      y: cardY,
      w: cardWidth,
      h: cardHeight,
      fill: { color: template.primary.replace('#', '') },
      rectRadius: 0.1,
    })
    slide3.addText('Valor Aprovado', {
      x: 0.5,
      y: cardY + 0.15,
      w: cardWidth,
      h: 0.4,
      fontSize: 12,
      fontFace: template.fonts.body,
      color: 'FFFFFF',
      align: 'center',
    })
    slide3.addText(formatCurrency(projectData.approved_value, options.language), {
      x: 0.5,
      y: cardY + 0.5,
      w: cardWidth,
      h: 0.6,
      fontSize: 22,
      fontFace: template.fonts.heading,
      color: 'FFFFFF',
      bold: true,
      align: 'center',
    })
  }

  if (projectData.incentive_law) {
    slide3.addShape(pptx.ShapeType.roundRect, {
      x: 3.6,
      y: cardY,
      w: cardWidth,
      h: cardHeight,
      fill: { color: template.secondary.replace('#', '') },
      rectRadius: 0.1,
    })
    slide3.addText('Lei de Incentivo', {
      x: 3.6,
      y: cardY + 0.15,
      w: cardWidth,
      h: 0.4,
      fontSize: 12,
      fontFace: template.fonts.body,
      color: 'FFFFFF',
      align: 'center',
    })
    slide3.addText(projectData.incentive_law.short_name, {
      x: 3.6,
      y: cardY + 0.5,
      w: cardWidth,
      h: 0.6,
      fontSize: 20,
      fontFace: template.fonts.heading,
      color: 'FFFFFF',
      bold: true,
      align: 'center',
    })
  }

  if (projectData.validity_end) {
    slide3.addShape(pptx.ShapeType.roundRect, {
      x: 6.7,
      y: cardY,
      w: cardWidth,
      h: cardHeight,
      fill: { color: template.accent.replace('#', '') },
      rectRadius: 0.1,
    })
    slide3.addText('Validade', {
      x: 6.7,
      y: cardY + 0.15,
      w: cardWidth,
      h: 0.4,
      fontSize: 12,
      fontFace: template.fonts.body,
      color: 'FFFFFF',
      align: 'center',
    })
    const validityDate = new Date(projectData.validity_end).toLocaleDateString(options.language)
    slide3.addText(`Ate ${validityDate}`, {
      x: 6.7,
      y: cardY + 0.5,
      w: cardWidth,
      h: 0.6,
      fontSize: 18,
      fontFace: template.fonts.heading,
      color: 'FFFFFF',
      bold: true,
      align: 'center',
    })
  }

  // ===================
  // SLIDE 4: Impact / Metrics
  // ===================
  const slide4 = pptx.addSlide({ masterName: 'MASTER_SLIDE' })

  slide4.addText('Impacto do Projeto', {
    x: 0.5,
    y: 0.3,
    w: '90%',
    h: 0.6,
    fontSize: 32,
    fontFace: template.fonts.heading,
    color: template.primary.replace('#', ''),
    bold: true,
  })

  slide4.addShape(pptx.ShapeType.line, {
    x: 0.5,
    y: 0.95,
    w: 2,
    h: 0,
    line: { color: template.accent.replace('#', ''), width: 3 },
  })

  // Impact description
  slide4.addText(
    'Este projeto visa gerar impacto social, cultural e economico significativo, ' +
    'conectando sua marca a valores positivos e a uma audiencia engajada.',
    {
      x: 0.5,
      y: 1.3,
      w: '90%',
      h: 0.8,
      fontSize: 16,
      fontFace: template.fonts.body,
      color: template.text.replace('#', ''),
    }
  )

  // Impact metrics placeholders (would be populated with real data)
  const metrics = [
    { label: 'Publico Estimado', value: '10.000+', icon: 'users' },
    { label: 'Alcance Digital', value: '100K+', icon: 'share' },
    { label: 'Presenca de Midia', value: 'Regional', icon: 'tv' },
  ]

  const metricWidth = 2.5
  const metricStartX = 1.5

  metrics.forEach((metric, index) => {
    const x = metricStartX + index * 3
    slide4.addShape(pptx.ShapeType.ellipse, {
      x: x + 0.5,
      y: 2.5,
      w: 1.5,
      h: 1.5,
      fill: { color: template.primary.replace('#', ''), transparency: 80 },
    })
    slide4.addText(metric.value, {
      x: x,
      y: 2.8,
      w: metricWidth,
      h: 0.6,
      fontSize: 24,
      fontFace: template.fonts.heading,
      color: template.primary.replace('#', ''),
      bold: true,
      align: 'center',
    })
    slide4.addText(metric.label, {
      x: x,
      y: 4.2,
      w: metricWidth,
      h: 0.4,
      fontSize: 14,
      fontFace: template.fonts.body,
      color: template.text.replace('#', ''),
      align: 'center',
    })
  })

  // ===================
  // SLIDE 5: Incentive Law Details
  // ===================
  if (projectData.incentive_law) {
    const slide5 = pptx.addSlide({ masterName: 'MASTER_SLIDE' })

    slide5.addText('Lei de Incentivo Fiscal', {
      x: 0.5,
      y: 0.3,
      w: '90%',
      h: 0.6,
      fontSize: 32,
      fontFace: template.fonts.heading,
      color: template.primary.replace('#', ''),
      bold: true,
    })

    slide5.addShape(pptx.ShapeType.line, {
      x: 0.5,
      y: 0.95,
      w: 2,
      h: 0,
      line: { color: template.accent.replace('#', ''), width: 3 },
    })

    // Law name and details
    slide5.addText(projectData.incentive_law.name, {
      x: 0.5,
      y: 1.2,
      w: '90%',
      h: 0.5,
      fontSize: 22,
      fontFace: template.fonts.heading,
      color: template.secondary.replace('#', ''),
      bold: true,
    })

    slide5.addText(`(${projectData.incentive_law.short_name})`, {
      x: 0.5,
      y: 1.7,
      w: '90%',
      h: 0.4,
      fontSize: 16,
      fontFace: template.fonts.body,
      color: template.text.replace('#', ''),
    })

    // Jurisdiction and tax type
    const jurisdictionLabel =
      projectData.incentive_law.jurisdiction === 'federal' ? 'Federal' :
      projectData.incentive_law.jurisdiction === 'state' ? 'Estadual' : 'Municipal'

    slide5.addText(`Esfera: ${jurisdictionLabel}`, {
      x: 0.5,
      y: 2.3,
      w: '45%',
      h: 0.4,
      fontSize: 14,
      fontFace: template.fonts.body,
      color: template.text.replace('#', ''),
    })

    slide5.addText(`Tributo: ${projectData.incentive_law.tax_type}`, {
      x: 5,
      y: 2.3,
      w: '45%',
      h: 0.4,
      fontSize: 14,
      fontFace: template.fonts.body,
      color: template.text.replace('#', ''),
    })

    // Big deduction percentage
    if (projectData.incentive_law.max_deduction_percentage) {
      slide5.addShape(pptx.ShapeType.ellipse, {
        x: 3.5,
        y: 3,
        w: 3,
        h: 2,
        fill: { color: template.accent.replace('#', '') },
      })
      slide5.addText(`${projectData.incentive_law.max_deduction_percentage}%`, {
        x: 3.5,
        y: 3.4,
        w: 3,
        h: 0.8,
        fontSize: 48,
        fontFace: template.fonts.heading,
        color: 'FFFFFF',
        bold: true,
        align: 'center',
      })
      slide5.addText('de deducao', {
        x: 3.5,
        y: 4.2,
        w: 3,
        h: 0.4,
        fontSize: 16,
        fontFace: template.fonts.body,
        color: 'FFFFFF',
        align: 'center',
      })
    }
  }

  // ===================
  // SLIDE 6: Sponsorship Tiers
  // ===================
  if (projectData.tiers.length > 0 && options.includeFinancials) {
    const slide6 = pptx.addSlide({ masterName: 'MASTER_SLIDE' })

    slide6.addText('Cotas de Patrocinio', {
      x: 0.5,
      y: 0.3,
      w: '90%',
      h: 0.6,
      fontSize: 32,
      fontFace: template.fonts.heading,
      color: template.primary.replace('#', ''),
      bold: true,
    })

    slide6.addShape(pptx.ShapeType.line, {
      x: 0.5,
      y: 0.95,
      w: 2,
      h: 0,
      line: { color: template.accent.replace('#', ''), width: 3 },
    })

    // Tier cards
    const tierCardWidth = 2.2
    const maxTiersPerRow = 4
    const tiersToShow = projectData.tiers.slice(0, maxTiersPerRow)
    const startX = (10 - tiersToShow.length * tierCardWidth - (tiersToShow.length - 1) * 0.3) / 2

    tiersToShow.forEach((tier, index) => {
      const x = startX + index * (tierCardWidth + 0.3)
      const isHighlighted = tier.is_highlighted || tier.id === options.highlightTierId
      const tierColor = tier.color?.replace('#', '') || (isHighlighted ? template.accent : template.primary).replace('#', '')

      // Card background
      slide6.addShape(pptx.ShapeType.roundRect, {
        x: x,
        y: 1.3,
        w: tierCardWidth,
        h: 3.8,
        fill: { color: tierColor },
        rectRadius: 0.15,
        shadow: isHighlighted ? { type: 'outer', blur: 10, offset: 3, angle: 45, opacity: 0.3 } : undefined,
      })

      // Tier name
      slide6.addText(tier.name, {
        x: x,
        y: 1.5,
        w: tierCardWidth,
        h: 0.5,
        fontSize: 16,
        fontFace: template.fonts.heading,
        color: 'FFFFFF',
        bold: true,
        align: 'center',
      })

      // Tier value
      slide6.addText(formatCurrency(tier.value, options.language), {
        x: x,
        y: 2.1,
        w: tierCardWidth,
        h: 0.5,
        fontSize: 20,
        fontFace: template.fonts.heading,
        color: 'FFFFFF',
        bold: true,
        align: 'center',
      })

      // Availability
      const available = tier.quantity_total - tier.quantity_sold
      slide6.addText(`${available}/${tier.quantity_total} disponiveis`, {
        x: x,
        y: 2.6,
        w: tierCardWidth,
        h: 0.3,
        fontSize: 10,
        fontFace: template.fonts.body,
        color: 'FFFFFF',
        align: 'center',
      })

      // Deliverables (first 4)
      const deliverablesToShow = tier.deliverables.slice(0, 4)
      deliverablesToShow.forEach((del, delIndex) => {
        slide6.addText(`• ${del.title}`, {
          x: x + 0.1,
          y: 3.1 + delIndex * 0.35,
          w: tierCardWidth - 0.2,
          h: 0.3,
          fontSize: 9,
          fontFace: template.fonts.body,
          color: 'FFFFFF',
        })
      })

      // More indicator
      if (tier.deliverables.length > 4) {
        slide6.addText(`+ ${tier.deliverables.length - 4} mais`, {
          x: x,
          y: 4.6,
          w: tierCardWidth,
          h: 0.3,
          fontSize: 9,
          fontFace: template.fonts.body,
          color: 'FFFFFF',
          italic: true,
          align: 'center',
        })
      }
    })
  }

  // ===================
  // SLIDE 7: Why Sponsor
  // ===================
  const slide7 = pptx.addSlide({ masterName: 'MASTER_SLIDE' })

  slide7.addText('Por que Patrocinar?', {
    x: 0.5,
    y: 0.3,
    w: '90%',
    h: 0.6,
    fontSize: 32,
    fontFace: template.fonts.heading,
    color: template.primary.replace('#', ''),
    bold: true,
  })

  slide7.addShape(pptx.ShapeType.line, {
    x: 0.5,
    y: 0.95,
    w: 2,
    h: 0,
    line: { color: template.accent.replace('#', ''), width: 3 },
  })

  // Arguments
  generatedContent.whySponsorship.forEach((arg, index) => {
    const y = 1.4 + index * 1.3

    // Number circle
    slide7.addShape(pptx.ShapeType.ellipse, {
      x: 0.5,
      y: y,
      w: 0.6,
      h: 0.6,
      fill: { color: template.accent.replace('#', '') },
    })
    slide7.addText(`${index + 1}`, {
      x: 0.5,
      y: y + 0.1,
      w: 0.6,
      h: 0.4,
      fontSize: 18,
      fontFace: template.fonts.heading,
      color: 'FFFFFF',
      bold: true,
      align: 'center',
    })

    // Title
    slide7.addText(arg.title, {
      x: 1.3,
      y: y,
      w: '70%',
      h: 0.4,
      fontSize: 18,
      fontFace: template.fonts.heading,
      color: template.primary.replace('#', ''),
      bold: true,
    })

    // Description
    slide7.addText(arg.description, {
      x: 1.3,
      y: y + 0.45,
      w: '70%',
      h: 0.6,
      fontSize: 14,
      fontFace: template.fonts.body,
      color: template.text.replace('#', ''),
    })
  })

  // ===================
  // SLIDE 8: Contact / CTA
  // ===================
  const slide8 = pptx.addSlide({ masterName: 'MASTER_SLIDE' })

  // Full color background
  slide8.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: '100%',
    h: '100%',
    fill: { color: template.primary.replace('#', '') },
  })

  // Call to action
  slide8.addText(generatedContent.callToAction, {
    x: 0.5,
    y: 1.5,
    w: '90%',
    h: 1,
    fontSize: 32,
    fontFace: template.fonts.heading,
    color: 'FFFFFF',
    bold: true,
    align: 'center',
  })

  // Contact info
  slide8.addText('Entre em Contato', {
    x: 0.5,
    y: 3,
    w: '90%',
    h: 0.5,
    fontSize: 20,
    fontFace: template.fonts.body,
    color: template.accent.replace('#', ''),
    align: 'center',
  })

  // Contact details
  const contactInfo = []
  if (projectData.proponent?.name) contactInfo.push(projectData.proponent.name)
  if (projectData.proponent?.email) contactInfo.push(projectData.proponent.email)
  if (projectData.proponent?.phone) contactInfo.push(projectData.proponent.phone)
  if (projectData.proponent?.website) contactInfo.push(projectData.proponent.website)

  slide8.addText(contactInfo.join(' | '), {
    x: 0.5,
    y: 3.6,
    w: '90%',
    h: 0.5,
    fontSize: 14,
    fontFace: template.fonts.body,
    color: 'FFFFFF',
    align: 'center',
  })

  // Approval badge
  if (projectData.approval_number) {
    slide8.addShape(pptx.ShapeType.roundRect, {
      x: 3.5,
      y: 4.5,
      w: 3,
      h: 0.5,
      fill: { color: template.accent.replace('#', '') },
      rectRadius: 0.1,
    })
    slide8.addText(projectData.approval_number, {
      x: 3.5,
      y: 4.5,
      w: 3,
      h: 0.5,
      fontSize: 14,
      fontFace: template.fonts.body,
      color: 'FFFFFF',
      align: 'center',
      valign: 'middle',
    })
  }

  // Generate base64
  console.log('[generate-sponsor-deck] Building PPTX file...')
  const pptxBase64 = await pptx.write({ outputType: 'base64' })
  console.log('[generate-sponsor-deck] PPTX generated successfully')

  return pptxBase64 as string
}

// =============================================================================
// DATA LOADING
// =============================================================================

/**
 * Load project data with all related information
 * @param supabase - Supabase client
 * @param projectId - Project ID to load
 * @param userId - User ID for ownership verification (security check)
 */
async function loadProjectData(
  supabase: ReturnType<typeof createClient>,
  projectId: string,
  userId: string
): Promise<ProjectData | null> {
  console.log('[generate-sponsor-deck] Loading project data...')

  // Load project with relations, ensuring it belongs to the user
  const { data: project, error: projectError } = await supabase
    .from('grant_projects')
    .select(`
      id,
      project_name,
      status,
      approved_value,
      approval_number,
      validity_start,
      validity_end,
      capture_status,
      captured_value,
      capture_goal,
      incentive_law_id,
      proponent_organization_id
    `)
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()

  if (projectError || !project) {
    console.error('[generate-sponsor-deck] Failed to load project or project not owned by user:', projectError)
    return null
  }

  // Load incentive law if exists
  let incentive_law = null
  if (project.incentive_law_id) {
    const { data: law } = await supabase
      .from('incentive_laws')
      .select('id, name, short_name, jurisdiction, tax_type, max_deduction_percentage')
      .eq('id', project.incentive_law_id)
      .single()
    incentive_law = law
  }

  // Load proponent organization if exists
  let proponent = null
  if (project.proponent_organization_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('id, name, description, email, phone, website, logo_url, mission, achievements')
      .eq('id', project.proponent_organization_id)
      .single()
    proponent = org
  }

  // Load sponsorship tiers with deliverables
  const { data: tiers } = await supabase
    .from('sponsorship_tiers')
    .select(`
      id,
      name,
      description,
      value,
      quantity_total,
      quantity_sold,
      is_highlighted,
      color,
      tier_deliverables (
        id,
        category,
        title,
        description,
        quantity
      )
    `)
    .eq('project_id', projectId)
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  const projectData: ProjectData = {
    id: project.id,
    project_name: project.project_name,
    status: project.status,
    approved_value: project.approved_value,
    approval_number: project.approval_number,
    validity_start: project.validity_start,
    validity_end: project.validity_end,
    capture_status: project.capture_status,
    captured_value: project.captured_value,
    capture_goal: project.capture_goal,
    incentive_law,
    proponent,
    tiers: (tiers || []).map(tier => ({
      ...tier,
      deliverables: tier.tier_deliverables || [],
    })),
  }

  console.log('[generate-sponsor-deck] Project data loaded successfully')
  return projectData
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
    })
  }

  try {
    // Validate API key
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header required' }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    }

    // Parse request body
    const { projectId, templateId, options }: GenerateDeckRequest = await req.json()

    if (!projectId) {
      return new Response(
        JSON.stringify({ success: false, error: 'projectId is required' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    }

    // Verify user authentication and get user_id
    const authClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await authClient.auth.getUser(token)

    if (authError || !user) {
      console.error('[generate-sponsor-deck] Authentication failed:', authError)
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired authentication token' }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    }

    const userId = user.id
    console.log(`[generate-sponsor-deck] Starting deck generation for project: ${projectId} by user: ${userId}`)

    // Initialize clients
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

    // Load project data (with ownership verification)
    const projectData = await loadProjectData(supabase, projectId, userId)
    if (!projectData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Project not found or access denied' }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    }

    // Get template colors
    const templateColors = TEMPLATES[templateId] || TEMPLATES.professional

    // Override primary color if custom scheme provided
    if (options.colorScheme) {
      templateColors.primary = options.colorScheme
    }

    // Generate content with Gemini
    const { content: generatedContent, usageMetadata } = await generateDeckContent(
      genAI,
      projectData,
      options.language || 'pt-BR'
    )

    // Build the presentation
    const pptxBase64 = await buildPresentation(
      projectData,
      generatedContent,
      templateColors,
      options
    )

    // Generate filename
    const sanitizedName = projectData.project_name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50)

    const filename = `${sanitizedName}_Deck_Patrocinio_${new Date().toISOString().split('T')[0]}.pptx`

    console.log('[generate-sponsor-deck] Deck generation completed successfully')

    return new Response(
      JSON.stringify({
        success: true,
        pptxBase64,
        filename,
        usageMetadata,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error) {
    console.error('[generate-sponsor-deck] Error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  }
})
