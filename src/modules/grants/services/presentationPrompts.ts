/**
 * Presentation Prompts Service
 * Issue #117 - Phase 3: RAG Integration + Content Generation
 *
 * Prompt engineering templates for generating slide content personalized
 * by target audience. Each audience type has specific tone, emphasis,
 * and content requirements.
 *
 * @module modules/grants/services/presentationPrompts
 */

import type {
  PresentationContext,
  TargetFocus,
  AudiencePromptConfig,
  GenerateSlideOptions,
} from '../types/presentationRAG';
import type { SlideType } from '../types/presentation';

// =============================================================================
// AUDIENCE CONFIGURATIONS
// =============================================================================

/**
 * Prompt configurations for each target audience
 */
export const AUDIENCE_PROMPT_CONFIGS: Record<TargetFocus, AudiencePromptConfig> = {
  esg: {
    tone: 'Foco em sustentabilidade, impacto socioambiental, ODS (Objetivos de Desenvolvimento Sustentável), responsabilidade social e transformação positiva',
    emphasis: [
      'métricas de impacto social e ambiental',
      'alinhamento com ODS',
      'sustentabilidade de longo prazo',
      'transformação comunitária',
      'benefícios ambientais',
    ],
    style: 'Profissional, inspirador e orientado a valores',
    keywords: ['impacto', 'sustentabilidade', 'transformação', 'comunidade', 'meio ambiente', 'ODS'],
    avoidKeywords: ['lucro', 'vendas', 'marketing'],
  },

  tax: {
    tone: 'Foco em benefícios fiscais, dedução de impostos, compliance, ROI para empresa, vantagens tributárias e segurança jurídica',
    emphasis: [
      'percentuais de dedução fiscal',
      'economia de impostos',
      'compliance com leis de incentivo',
      'retorno financeiro',
      'segurança jurídica',
    ],
    style: 'Técnico, objetivo e orientado a resultados financeiros',
    keywords: [
      'dedução fiscal',
      'incentivo fiscal',
      'ROI',
      'compliance',
      'economia tributária',
      'Lei Rouanet',
      'Lei do Esporte',
    ],
    avoidKeywords: ['emoção', 'sentimento', 'caridade'],
  },

  brand: {
    tone: 'Foco em visibilidade de marca, associação positiva, reputação, marketing institucional e engajamento de público',
    emphasis: [
      'exposição de marca',
      'associação com valores positivos',
      'cobertura de mídia',
      'engajamento de stakeholders',
      'reputação corporativa',
    ],
    style: 'Persuasivo, orientado a marketing e storytelling',
    keywords: [
      'visibilidade',
      'marca',
      'reputação',
      'mídia',
      'engajamento',
      'stakeholders',
      'storytelling',
    ],
    avoidKeywords: ['dedução', 'imposto', 'compliance'],
  },

  impact: {
    tone: 'Foco em transformação social, mudança de vida, resultados tangíveis, beneficiários diretos e histórias humanas',
    emphasis: [
      'vidas transformadas',
      'resultados concretos',
      'beneficiários diretos',
      'mudança mensurável',
      'histórias de sucesso',
    ],
    style: 'Emocional, narrativo e humanizado',
    keywords: [
      'transformação',
      'beneficiários',
      'vidas mudadas',
      'impacto direto',
      'histórias',
      'comunidade',
    ],
    avoidKeywords: ['técnico', 'compliance', 'fiscal'],
  },

  general: {
    tone: 'Abordagem equilibrada, abrangendo impacto social, benefícios institucionais e resultados práticos',
    emphasis: [
      'impacto social',
      'resultados mensuráveis',
      'benefícios mútuos',
      'sustentabilidade',
      'transparência',
    ],
    style: 'Profissional, claro e equilibrado',
    keywords: ['impacto', 'resultados', 'parceria', 'transparência', 'sustentabilidade'],
    avoidKeywords: [],
  },
};

// =============================================================================
// SLIDE CONTENT SCHEMAS
// =============================================================================

/**
 * JSON schemas for each slide type to guide AI generation
 */
export const SLIDE_CONTENT_SCHEMAS: Record<SlideType, string> = {
  cover: `{
  "title": "string (máximo 80 caracteres, impactante)",
  "subtitle": "string (máximo 150 caracteres, complementa o título)",
  "tagline": "string (máximo 100 caracteres, frase de efeito opcional)",
  "backgroundImage": "string (URL opcional para imagem de fundo)"
}`,

  organization: `{
  "name": "string (nome da organização)",
  "description": "string (200-300 palavras, descrição clara e envolvente)",
  "mission": "string (uma frase concisa)",
  "vision": "string (uma frase concisa)",
  "achievements": ["string (3-5 conquistas principais)"],
  "logoUrl": "string (URL opcional)",
  "foundedYear": "number (ano de fundação, opcional)"
}`,

  project: `{
  "title": "string (título do projeto, máximo 80 caracteres)",
  "description": "string (300-400 palavras, descrição detalhada)",
  "objectives": ["string (3-5 objetivos principais)"],
  "budget": {
    "total": "number (valor total em R$)",
    "breakdown": [{"category": "string", "amount": "number"}]
  },
  "timeline": [{"phase": "string", "duration": "string", "description": "string"}],
  "expectedImpact": "string (100-150 palavras)"
}`,

  'impact-metrics': `{
  "title": "string (título da seção, ex: 'Nosso Impacto')",
  "metrics": [
    {
      "label": "string (ex: 'Beneficiários Atendidos')",
      "value": "string | number (ex: '15.000' ou 15000)",
      "unit": "string (opcional, ex: 'pessoas', '%')",
      "icon": "string (nome do ícone opcional)",
      "description": "string (contexto adicional, opcional)"
    }
  ],
  "impactStatement": "string (frase de impacto principal, 100-150 caracteres)"
}`,

  timeline: `{
  "title": "string (ex: 'Cronograma do Projeto')",
  "events": [
    {
      "date": "string (ex: 'Jan 2024' ou '2024-01')",
      "title": "string (nome do marco/evento)",
      "description": "string (descrição opcional)",
      "isHighlighted": "boolean (destacar evento importante)"
    }
  ]
}`,

  team: `{
  "title": "string (ex: 'Nossa Equipe')",
  "members": [
    {
      "name": "string (nome completo)",
      "role": "string (cargo/função)",
      "bio": "string (50-100 palavras, resumo profissional)",
      "photoUrl": "string (URL opcional)",
      "linkedIn": "string (URL opcional)"
    }
  ]
}`,

  'incentive-law': `{
  "title": "string (ex: 'Benefícios Fiscais')",
  "lawName": "string (ex: 'Lei Rouanet', 'Lei do Esporte')",
  "deductionPercentage": "number (ex: 100 para 100%)",
  "benefits": ["string (lista de benefícios fiscais)"],
  "howItWorks": "string (explicação em 150-200 palavras)",
  "disclaimer": "string (aviso legal breve, opcional)"
}`,

  tiers: `{
  "title": "string (ex: 'Categorias de Patrocínio')",
  "tiers": [
    {
      "name": "string (ex: 'Ouro', 'Platina')",
      "amount": "number (valor em R$)",
      "benefits": ["string (lista de benefícios)"],
      "color": "string (código de cor hex opcional)"
    }
  ]
}`,

  testimonials: `{
  "title": "string (ex: 'Depoimentos')",
  "testimonials": [
    {
      "quote": "string (depoimento, 100-200 palavras)",
      "author": "string (nome da pessoa)",
      "role": "string (cargo/contexto)",
      "photoUrl": "string (URL opcional)",
      "organization": "string (organização, opcional)"
    }
  ]
}`,

  media: `{
  "title": "string (ex: 'Na Mídia')",
  "mediaItems": [
    {
      "outlet": "string (veículo de mídia)",
      "title": "string (título da matéria)",
      "date": "string (data da publicação)",
      "url": "string (link para matéria, opcional)",
      "thumbnail": "string (URL da imagem, opcional)"
    }
  ]
}`,

  comparison: `{
  "title": "string (ex: 'Antes e Depois')",
  "subtitle": "string (contexto, opcional)",
  "comparisonItems": [
    {
      "label": "string (métrica comparada)",
      "before": "string | number (valor anterior)",
      "after": "string | number (valor atual)",
      "improvement": "string (percentual ou descrição de melhoria)"
    }
  ]
}`,

  contact: `{
  "title": "string (ex: 'Fale Conosco')",
  "organizationName": "string",
  "address": "string (endereço completo)",
  "phone": "string (telefone)",
  "email": "string (e-mail)",
  "website": "string (URL)",
  "socialMedia": {
    "facebook": "string (URL opcional)",
    "instagram": "string (URL opcional)",
    "linkedin": "string (URL opcional)",
    "twitter": "string (URL opcional)"
  },
  "callToAction": "string (mensagem final, ex: 'Vamos transformar vidas juntos?')"
}`,
};

// =============================================================================
// PROMPT TEMPLATES
// =============================================================================

/**
 * Generate prompt for a specific slide type and audience
 */
export function getPromptForSlide(options: GenerateSlideOptions): string {
  const { slideType, context, targetFocus = 'general' } = options;

  const audienceConfig = AUDIENCE_PROMPT_CONFIGS[targetFocus];
  const schema = SLIDE_CONTENT_SCHEMAS[slideType];

  // Build context summary
  const contextSummary = buildContextSummary(context, targetFocus);

  // Build the complete prompt
  const prompt = `Você é um especialista em criação de apresentações para captação de recursos e patrocínios.

## CONTEXTO DA ORGANIZAÇÃO

${contextSummary}

## PÚBLICO-ALVO: ${targetFocus.toUpperCase()}

**Tom e Estilo:** ${audienceConfig.tone}

**Pontos a Enfatizar:**
${audienceConfig.emphasis.map((point, i) => `${i + 1}. ${point}`).join('\n')}

**Estilo de Linguagem:** ${audienceConfig.style}

**Palavras-chave Recomendadas:** ${audienceConfig.keywords.join(', ')}
${audienceConfig.avoidKeywords.length > 0 ? `**Evitar:** ${audienceConfig.avoidKeywords.join(', ')}` : ''}

## TAREFA

Gere conteúdo para um slide do tipo **"${slideType}"** seguindo EXATAMENTE este JSON schema:

${schema}

## DIRETRIZES IMPORTANTES

1. **Use dados reais** do contexto fornecido acima
2. **Adapte a linguagem** para o público ${targetFocus}
3. **Seja conciso** - slides devem ter textos curtos e impactantes
4. **Inclua números e métricas** quando disponível no contexto
5. **Mantenha consistência** com o tom e estilo do público-alvo
6. **Retorne APENAS o JSON**, sem markdown, explicações ou texto adicional
7. **Valide** que todos os campos obrigatórios do schema estejam preenchidos

## OUTPUT

Retorne o JSON válido do conteúdo do slide:`;

  return prompt;
}

// =============================================================================
// CONTEXT SUMMARY BUILDER
// =============================================================================

/**
 * Build a concise context summary for the prompt
 */
function buildContextSummary(context: PresentationContext, targetFocus: TargetFocus): string {
  const sections: string[] = [];

  // Organization section
  sections.push('### Organização');
  sections.push(`**Nome:** ${context.organization.name}`);

  if (context.organization.mission) {
    sections.push(`**Missão:** ${context.organization.mission}`);
  }

  if (context.organization.vision) {
    sections.push(`**Visão:** ${context.organization.vision}`);
  }

  if (context.organization.history) {
    sections.push(`**História:** ${truncateText(context.organization.history, 300)}`);
  }

  if (context.organization.values) {
    sections.push(`**Valores:** ${truncateText(context.organization.values, 200)}`);
  }

  // Project section (if available)
  if (context.project) {
    sections.push('\n### Projeto');
    sections.push(`**Título:** ${context.project.title}`);

    if (context.project.objectives) {
      sections.push(`**Objetivos:** ${truncateText(context.project.objectives, 300)}`);
    }

    if (context.project.budget) {
      sections.push(`**Orçamento:** ${context.project.budget}`);
    }

    if (context.project.timeline) {
      sections.push(`**Cronograma:** ${truncateText(context.project.timeline, 200)}`);
    }
  }

  // Impact section (prioritize based on audience)
  const hasImpactData = Object.values(context.impact).some((v) => Boolean(v));
  if (hasImpactData) {
    sections.push('\n### Impacto e Resultados');

    // Prioritize fields based on audience
    const impactPriority = getImpactPriorityByAudience(targetFocus);

    for (const field of impactPriority) {
      const value = context.impact[field as keyof typeof context.impact];
      if (value) {
        const label = field.charAt(0).toUpperCase() + field.slice(1);
        sections.push(`**${label}:** ${truncateText(value, 200)}`);
      }
    }
  }

  return sections.join('\n');
}

/**
 * Get impact field priority based on target audience
 */
function getImpactPriorityByAudience(targetFocus: TargetFocus): string[] {
  const priorities: Record<TargetFocus, string[]> = {
    esg: ['metrics', 'results', 'beneficiaries', 'testimonials', 'awards', 'media'],
    tax: ['metrics', 'results', 'awards', 'beneficiaries', 'media', 'testimonials'],
    brand: ['media', 'awards', 'metrics', 'testimonials', 'results', 'beneficiaries'],
    impact: ['beneficiaries', 'testimonials', 'results', 'metrics', 'awards', 'media'],
    general: ['metrics', 'results', 'beneficiaries', 'awards', 'media', 'testimonials'],
  };

  return priorities[targetFocus];
}

/**
 * Truncate text to maximum length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - 3) + '...';
}

// =============================================================================
// REGENERATION PROMPTS
// =============================================================================

/**
 * Generate prompt for refining existing slide content
 */
export function getRefinePrompt(
  slideType: SlideType,
  existingContent: Record<string, unknown>,
  refinementInstructions: string,
  targetFocus: TargetFocus
): string {
  const audienceConfig = AUDIENCE_PROMPT_CONFIGS[targetFocus];
  const schema = SLIDE_CONTENT_SCHEMAS[slideType];

  return `Você é um especialista em refinamento de conteúdo para apresentações.

## CONTEÚDO ATUAL DO SLIDE (${slideType})

${JSON.stringify(existingContent, null, 2)}

## INSTRUÇÕES DE REFINAMENTO

${refinementInstructions}

## PÚBLICO-ALVO: ${targetFocus.toUpperCase()}

**Tom:** ${audienceConfig.tone}
**Estilo:** ${audienceConfig.style}

## TAREFA

Refine o conteúdo do slide seguindo as instruções acima, mantendo este JSON schema:

${schema}

## DIRETRIZES

1. Mantenha os pontos fortes do conteúdo atual
2. Aplique as melhorias solicitadas
3. Adapte ao público ${targetFocus}
4. Retorne APENAS o JSON refinado

## OUTPUT

Retorne o JSON válido do conteúdo refinado:`;
}
