/**
 * Presentation Content Generator Service
 * Issue #117 - Phase 3: RAG Integration + Content Generation
 *
 * Service for generating slide content using Gemini API with RAG context.
 * Includes validation, retry logic, and token tracking.
 *
 * @module modules/grants/services/presentationContentGenerator
 */

import { createNamespacedLogger } from '@/lib/logger';
import { getPromptForSlide, getRefinePrompt } from './presentationPrompts';
import {
  validateSlideContent as zodValidateSlideContent,
  sanitizeSlideContent,
} from './presentationContentSchemas';
import type {
  GenerateSlideOptions,
  GeneratedPresentation,
  GeneratedSlide,
  ContentGenerationError,
  GenerationStats,
  ValidationResult,
} from '../types/presentationRAG';
import type { SlideType, TemplateType as TemplateId } from '../types/presentation';
import { buildPresentationContext, enrichContext, validateContext } from './presentationRAGService';

const log = createNamespacedLogger('PresentationContentGenerator');

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_TEMPERATURE = 0.7; // Balanced creativity
const DEFAULT_MAX_TOKENS = 2000; // Sufficient for most slides
const MAX_RETRIES = 3; // Maximum retry attempts
const RETRY_DELAY_MS = 1000; // Base delay between retries


// =============================================================================
// MAIN CONTENT GENERATION
// =============================================================================

/**
 * Generate content for a single slide using Gemini + RAG context
 *
 * @param options - Slide generation options
 * @returns Generated slide content as validated JSON
 * @throws {ContentGenerationError} If generation fails after retries
 */
export async function generateSlideContent(
  options: GenerateSlideOptions
): Promise<Record<string, unknown>> {
  const {
    slideType,
    context,
    targetFocus = 'general',
    temperature = DEFAULT_TEMPERATURE,
    maxTokens = DEFAULT_MAX_TOKENS,
    existingContent,
  } = options;

  log.info('Generating slide content', { slideType, targetFocus });

  // Validate context before generation
  const contextValidation = validateContext(context);
  if (!contextValidation.valid) {
    log.error('Invalid context', { errors: contextValidation.errors });
    throw createContentError(
      'validation_error',
      `Invalid context: ${contextValidation.errors.join(', ')}`,
      slideType,
      false
    );
  }

  // Build prompt
  const prompt = existingContent
    ? getRefinePrompt(slideType, existingContent, 'Improve and optimize the content', targetFocus)
    : getPromptForSlide(options);

  // Call Gemini with retry logic
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      log.debug(`Generation attempt ${attempt}/${MAX_RETRIES}`, { slideType });

      const content = await callGeminiForSlideContent(prompt, temperature, maxTokens);

      // Validate generated content
      const validation = validateSlideContent(slideType, content);

      if (!validation.valid) {
        log.warn('Generated content failed validation', {
          slideType,
          errors: validation.errors,
        });

        // Use sanitized content if available
        if (validation.sanitizedContent) {
          log.info('Using sanitized content');
          return validation.sanitizedContent;
        }

        // Retry with validation feedback
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS * attempt); // Exponential backoff
          continue;
        }

        throw createContentError(
          'validation_error',
          `Content validation failed: ${validation.errors?.join(', ')}`,
          slideType,
          true
        );
      }

      log.info('Slide content generated successfully', { slideType });
      return content;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      log.error(`Generation attempt ${attempt} failed`, { error: lastError.message });

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  // All retries exhausted
  throw createContentError(
    'api_error',
    lastError?.message || 'Failed to generate content after retries',
    slideType,
    true
  );
}

/**
 * Generate complete presentation with all slides
 *
 * @param organizationId - Organization ID for context
 * @param projectId - Project ID (optional)
 * @param slideTypes - Array of slide types to generate
 * @param targetFocus - Target audience
 * @param template - Visual template ID
 * @returns Generated presentation with all slides
 */
export async function generateFullPresentation(
  organizationId: string,
  projectId: string | null,
  slideTypes: SlideType[],
  targetFocus: 'esg' | 'tax' | 'brand' | 'impact' | 'general',
  template: TemplateId
): Promise<GeneratedPresentation> {
  log.info('Generating full presentation', {
    organizationId,
    projectId,
    slideTypes,
    targetFocus,
    template,
  });

  const startTime = performance.now();

  // Step 1: Build context via RAG
  log.info('Building presentation context via RAG');
  let context = await buildPresentationContext({
    organizationId,
    projectId: projectId || undefined,
    targetFocus,
  });

  // Enrich context with computed fields
  context = enrichContext(context);

  // Step 2: Generate content for each slide
  const slides: GeneratedSlide[] = [];
  const stats: GenerationStats = {
    totalSlides: slideTypes.length,
    successful: 0,
    failed: 0,
    tokensUsed: 0,
    totalTimeMs: 0,
    averageTimePerSlideMs: 0,
  };

  for (const [index, slideType] of slideTypes.entries()) {
    const slideStartTime = performance.now();

    try {
      const content = await generateSlideContent({
        slideType,
        context,
        targetFocus,
      });

      slides.push({
        slide_type: slideType,
        content,
        sort_order: index,
        metadata: {
          generated_at: new Date().toISOString(),
          confidence: 0.85, // Placeholder - could calculate based on context quality
        },
      });

      stats.successful++;
      log.info(`Generated slide ${index + 1}/${slideTypes.length}`, { slideType });
    } catch (error) {
      stats.failed++;
      log.error(`Failed to generate slide ${index + 1}/${slideTypes.length}`, {
        slideType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Create fallback slide with placeholder content
      slides.push({
        slide_type: slideType,
        content: getFallbackContent(slideType, context),
        sort_order: index,
        metadata: {
          generated_at: new Date().toISOString(),
          confidence: 0.3, // Low confidence for fallback
        },
      });
    }

    const slideTime = performance.now() - slideStartTime;
    stats.totalTimeMs += slideTime;
  }

  stats.averageTimePerSlideMs = stats.totalTimeMs / slideTypes.length;

  const totalTime = performance.now() - startTime;

  log.info('Presentation generation complete', {
    totalSlides: stats.totalSlides,
    successful: stats.successful,
    failed: stats.failed,
    totalTimeMs: totalTime,
  });

  return {
    title: context.project?.title || `Apresentação ${context.organization.name}`,
    template,
    target_focus: targetFocus,
    slides,
    metadata: {
      organization_id: organizationId,
      project_id: projectId || undefined,
      generated_at: new Date().toISOString(),
      rag_stats: {
        total_documents_searched:
          context.rawDocuments.organization.length +
          context.rawDocuments.project.length +
          context.rawDocuments.impact.length,
        total_chunks_retrieved:
          context.rawDocuments.organization.length +
          context.rawDocuments.project.length +
          context.rawDocuments.impact.length,
        average_similarity: calculateAverageSimilarity(context),
      },
    },
  };
}

// =============================================================================
// GEMINI API INTEGRATION
// =============================================================================

/**
 * Call Gemini API for slide content generation
 *
 * NOTE: The `generate-slide-content` Edge Function does not exist yet.
 * This stub throws until the EF is deployed.
 */
async function callGeminiForSlideContent(
  _prompt: string,
  _temperature: number,
  _maxTokens: number
): Promise<Record<string, unknown>> {
  throw new Error(
    'Edge Function generate-slide-content is not deployed. ' +
    'Deploy it before using presentation content generation.'
  );
}

// =============================================================================
// CONTENT VALIDATION
// =============================================================================

/**
 * Validate generated slide content against Zod schema
 */
function validateSlideContent(
  slideType: SlideType,
  content: Record<string, unknown>
): ValidationResult {
  // Use Zod schemas for validation
  const result = zodValidateSlideContent(slideType, content);

  if (result.success) {
    return {
      valid: true,
      sanitizedContent: result.data,
    };
  }

  // Attempt sanitization if validation failed
  const sanitized = sanitizeSlideContent(slideType, content);

  if (sanitized) {
    const retryResult = zodValidateSlideContent(slideType, sanitized);

    if (retryResult.success) {
      return {
        valid: true,
        warnings: ['Content was auto-sanitized to fix validation errors'],
        sanitizedContent: retryResult.data,
      };
    }
  }

  // Validation failed and could not be sanitized
  return {
    valid: false,
    errors: 'errors' in result ? result.errors : [],
  };
}

// =============================================================================
// FALLBACK CONTENT
// =============================================================================

/**
 * Generate fallback content when AI generation fails
 */
function getFallbackContent(
  slideType: SlideType,
  context: any
): Record<string, unknown> {
  const fallbacks: Record<SlideType, Record<string, unknown>> = {
    cover: {
      title: context.project?.title || context.organization?.name || 'Apresentação',
      subtitle: 'Conheça nosso projeto e impacto',
    },

    organization: {
      name: context.organization?.name || 'Organização',
      description: context.organization?.mission || 'Organização comprometida com a transformação social',
      achievements: ['Impacto positivo na comunidade'],
    },

    project: {
      title: context.project?.title || 'Projeto',
      description: 'Projeto de impacto social',
      objectives: ['Gerar impacto positivo'],
    },

    'impact-metrics': {
      title: 'Nosso Impacto',
      metrics: [
        {
          label: 'Beneficiários',
          value: context.impact?.beneficiaries || 'Em crescimento',
        },
      ],
    },

    timeline: {
      title: 'Cronograma',
      events: [
        {
          date: new Date().getFullYear().toString(),
          title: 'Início do Projeto',
        },
      ],
    },

    team: {
      title: 'Nossa Equipe',
      members: [
        {
          name: context.organization?.name || 'Equipe',
          role: 'Organização',
        },
      ],
    },

    'incentive-law': {
      title: 'Benefícios Fiscais',
      lawName: 'Lei de Incentivo',
      deductionPercentage: 100,
      benefits: ['Dedução fiscal'],
    },

    tiers: {
      title: 'Categorias de Apoio',
      tiers: [
        {
          name: 'Apoiador',
          amount: 0,
          benefits: ['Agradecimento'],
        },
      ],
    },

    testimonials: {
      title: 'Depoimentos',
      testimonials: [],
    },

    media: {
      title: 'Na Mídia',
      mediaItems: [],
    },

    comparison: {
      title: 'Resultados',
      comparisonItems: [],
    },

    contact: {
      title: 'Fale Conosco',
      organizationName: context.organization?.name || 'Organização',
      email: 'contato@organizacao.org',
      callToAction: 'Entre em contato conosco!',
    },
  };

  return fallbacks[slideType] || { title: 'Slide' };
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Create content generation error
 */
function createContentError(
  type: ContentGenerationError['type'],
  message: string,
  slideType?: SlideType,
  retryable: boolean = true
): ContentGenerationError {
  return {
    type,
    message,
    slideType,
    retryable,
  };
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate average similarity score from RAG results
 */
function calculateAverageSimilarity(context: any): number {
  const allDocs = [
    ...context.rawDocuments.organization,
    ...context.rawDocuments.project,
    ...context.rawDocuments.impact,
  ];

  if (allDocs.length === 0) return 0;

  const totalSimilarity = allDocs.reduce((sum, doc) => sum + (doc.similarity || 0), 0);
  return totalSimilarity / allDocs.length;
}
