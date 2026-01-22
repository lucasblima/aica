/**
 * Presentation RAG Service
 * Issue #117 - Phase 3: RAG Integration + Content Generation
 *
 * Service for building presentation context using RAG (Retrieval Augmented Generation).
 * Searches organization documents using semantic search and extracts structured information
 * for slide content generation.
 *
 * @module modules/grants/services/presentationRAGService
 */

import { searchDocuments } from './documentProcessingService';
import { createNamespacedLogger } from '@/lib/logger';
import type {
  PresentationContext,
  OrganizationInfo,
  ProjectInfo,
  ImpactMetrics,
  DocumentSearchResult,
  BuildContextOptions,
  TargetFocus,
  FieldExtractionConfig,
  ContextBuildError,
} from '../types/presentationRAG';

const log = createNamespacedLogger('PresentationRAGService');

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_MAX_DOCUMENTS = 10;
const DEFAULT_SIMILARITY_THRESHOLD = 0.7;
const CONTEXT_CHUNK_LIMIT = 5; // Number of adjacent chunks to include for context

// =============================================================================
// FIELD EXTRACTION CONFIGURATIONS
// =============================================================================

/**
 * Configuration for extracting organization fields via RAG
 */
const ORGANIZATION_FIELD_CONFIGS: FieldExtractionConfig[] = [
  {
    fieldName: 'name',
    searchQuery: 'nome da organização, razão social, instituição',
    required: true,
  },
  {
    fieldName: 'mission',
    searchQuery: 'missão, propósito organizacional, objetivo institucional',
    required: false,
  },
  {
    fieldName: 'vision',
    searchQuery: 'visão, futuro da organização, onde queremos chegar',
    required: false,
  },
  {
    fieldName: 'history',
    searchQuery: 'história, fundação, trajetória, origem, ano de criação',
    required: false,
  },
  {
    fieldName: 'team',
    searchQuery: 'equipe, time, liderança, diretoria, fundadores, conselho',
    required: false,
  },
  {
    fieldName: 'values',
    searchQuery: 'valores, princípios, cultura organizacional',
    required: false,
  },
  {
    fieldName: 'cnpj',
    searchQuery: 'CNPJ, registro, identificação fiscal',
    required: false,
  },
];

/**
 * Configuration for extracting project fields via RAG
 */
const PROJECT_FIELD_CONFIGS: FieldExtractionConfig[] = [
  {
    fieldName: 'title',
    searchQuery: 'título do projeto, nome do projeto',
    required: true,
  },
  {
    fieldName: 'objectives',
    searchQuery: 'objetivos do projeto, finalidade, o que pretende',
    required: false,
  },
  {
    fieldName: 'goals',
    searchQuery: 'metas, alvos, targets, resultados esperados',
    required: false,
  },
  {
    fieldName: 'budget',
    searchQuery: 'orçamento, investimento, recursos financeiros, custo',
    required: false,
  },
  {
    fieldName: 'timeline',
    searchQuery: 'cronograma, prazo, duração, etapas temporais',
    required: false,
  },
  {
    fieldName: 'beneficiaries',
    searchQuery: 'beneficiários, público-alvo, quem será impactado',
    required: false,
  },
  {
    fieldName: 'deliverables',
    searchQuery: 'entregas, produtos, resultados tangíveis',
    required: false,
  },
];

/**
 * Configuration for extracting impact metrics via RAG
 */
const IMPACT_FIELD_CONFIGS: FieldExtractionConfig[] = [
  {
    fieldName: 'beneficiaries',
    searchQuery: 'número de beneficiários, pessoas atendidas, alcance',
    required: false,
  },
  {
    fieldName: 'metrics',
    searchQuery: 'métricas de impacto, KPIs, indicadores, estatísticas',
    required: false,
  },
  {
    fieldName: 'testimonials',
    searchQuery: 'depoimentos, testemunhos, histórias de sucesso, relatos',
    required: false,
  },
  {
    fieldName: 'results',
    searchQuery: 'resultados alcançados, conquistas, realizações',
    required: false,
  },
  {
    fieldName: 'media',
    searchQuery: 'mídia, imprensa, cobertura, matérias, reportagens',
    required: false,
  },
  {
    fieldName: 'awards',
    searchQuery: 'prêmios, reconhecimentos, certificações, selos',
    required: false,
  },
];

// =============================================================================
// MAIN CONTEXT BUILDER
// =============================================================================

/**
 * Build complete presentation context from organization documents using RAG
 *
 * @param options - Context building options
 * @returns Structured presentation context
 * @throws {ContextBuildError} If context building fails
 */
export async function buildPresentationContext(
  options: BuildContextOptions
): Promise<PresentationContext> {
  const {
    organizationId,
    projectId,
    targetFocus = 'general',
    maxDocumentsPerCategory = DEFAULT_MAX_DOCUMENTS,
    similarityThreshold = DEFAULT_SIMILARITY_THRESHOLD,
  } = options;

  log.info('Building presentation context', {
    organizationId,
    projectId,
    targetFocus,
  });

  try {
    // 1. Search organization documents
    const orgDocs = await searchOrganizationDocuments(
      organizationId,
      maxDocumentsPerCategory,
      similarityThreshold
    );

    // 2. Search project documents (if project_id provided)
    let projectDocs: DocumentSearchResult[] = [];
    if (projectId) {
      projectDocs = await searchProjectDocuments(
        projectId,
        maxDocumentsPerCategory,
        similarityThreshold
      );
    }

    // 3. Search impact/results documents
    const impactDocs = await searchImpactDocuments(
      organizationId,
      maxDocumentsPerCategory,
      similarityThreshold
    );

    // 4. Extract structured information
    const organization = await extractOrganizationInfo(orgDocs);
    const project = projectId ? await extractProjectInfo(projectDocs) : null;
    const impact = await extractImpactMetrics(impactDocs);

    log.info('Context built successfully', {
      organizationFields: Object.keys(organization).length,
      projectFields: project ? Object.keys(project).length : 0,
      impactFields: Object.keys(impact).length,
    });

    return {
      organization,
      project,
      impact,
      targetFocus,
      rawDocuments: {
        organization: orgDocs,
        project: projectDocs,
        impact: impactDocs,
      },
    };
  } catch (error) {
    const contextError: ContextBuildError = {
      type: 'search_failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      originalError: error instanceof Error ? error : undefined,
    };

    log.error('Failed to build presentation context', contextError);
    throw contextError;
  }
}

// =============================================================================
// DOCUMENT SEARCH FUNCTIONS
// =============================================================================

/**
 * Search organization documents using comprehensive queries
 */
async function searchOrganizationDocuments(
  organizationId: string,
  limit: number,
  threshold: number
): Promise<DocumentSearchResult[]> {
  const query = ORGANIZATION_FIELD_CONFIGS.map((config) => config.searchQuery).join(', ');

  log.debug('Searching organization documents', { organizationId, query });

  const results = await searchDocuments(query, {
    organizationId,
    limit,
    threshold,
  });

  log.debug(`Found ${results.length} organization documents`);
  return results;
}

/**
 * Search project documents using comprehensive queries
 */
async function searchProjectDocuments(
  projectId: string,
  limit: number,
  threshold: number
): Promise<DocumentSearchResult[]> {
  const query = PROJECT_FIELD_CONFIGS.map((config) => config.searchQuery).join(', ');

  log.debug('Searching project documents', { projectId, query });

  const results = await searchDocuments(query, {
    projectId,
    limit,
    threshold,
  });

  log.debug(`Found ${results.length} project documents`);
  return results;
}

/**
 * Search impact/results documents
 */
async function searchImpactDocuments(
  organizationId: string,
  limit: number,
  threshold: number
): Promise<DocumentSearchResult[]> {
  const query = IMPACT_FIELD_CONFIGS.map((config) => config.searchQuery).join(', ');

  log.debug('Searching impact documents', { organizationId, query });

  const results = await searchDocuments(query, {
    organizationId,
    limit: Math.ceil(limit / 2), // Fewer impact docs needed
    threshold,
  });

  log.debug(`Found ${results.length} impact documents`);
  return results;
}

// =============================================================================
// INFORMATION EXTRACTION FUNCTIONS
// =============================================================================

/**
 * Extract organization information from search results
 */
async function extractOrganizationInfo(
  documents: DocumentSearchResult[]
): Promise<OrganizationInfo> {
  const info: OrganizationInfo = {
    name: '',
  };

  for (const config of ORGANIZATION_FIELD_CONFIGS) {
    const value = await extractField(documents, config);
    if (value) {
      info[config.fieldName as keyof OrganizationInfo] = value as never;
    }
  }

  // Validate required fields
  if (!info.name) {
    log.warn('Organization name not found in documents, using placeholder');
    info.name = 'Organização'; // Fallback
  }

  return info;
}

/**
 * Extract project information from search results
 */
async function extractProjectInfo(
  documents: DocumentSearchResult[]
): Promise<ProjectInfo> {
  const info: ProjectInfo = {
    title: '',
  };

  for (const config of PROJECT_FIELD_CONFIGS) {
    const value = await extractField(documents, config);
    if (value) {
      info[config.fieldName as keyof ProjectInfo] = value as never;
    }
  }

  // Validate required fields
  if (!info.title) {
    log.warn('Project title not found in documents, using placeholder');
    info.title = 'Projeto'; // Fallback
  }

  return info;
}

/**
 * Extract impact metrics from search results
 */
async function extractImpactMetrics(
  documents: DocumentSearchResult[]
): Promise<ImpactMetrics> {
  const metrics: ImpactMetrics = {};

  for (const config of IMPACT_FIELD_CONFIGS) {
    const value = await extractField(documents, config);
    if (value) {
      metrics[config.fieldName as keyof ImpactMetrics] = value;
    }
  }

  return metrics;
}

// =============================================================================
// FIELD EXTRACTION UTILITIES
// =============================================================================

/**
 * Extract a specific field value from documents using keyword matching
 *
 * This is a simplified extraction. For production, consider:
 * 1. Using a smaller LLM for structured extraction
 * 2. Implementing NER (Named Entity Recognition)
 * 3. Using regex patterns for structured data (CNPJ, dates, etc.)
 */
async function extractField(
  documents: DocumentSearchResult[],
  config: FieldExtractionConfig
): Promise<string | undefined> {
  if (documents.length === 0) {
    return config.defaultValue;
  }

  // Find most relevant chunk based on search query keywords
  const keywords = config.searchQuery.toLowerCase().split(',').map((k) => k.trim());

  let bestMatch: DocumentSearchResult | null = null;
  let bestScore = 0;

  for (const doc of documents) {
    const text = doc.chunk_text.toLowerCase();
    let score = doc.similarity; // Start with semantic similarity

    // Boost score if keywords are present
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        score += 0.1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = doc;
    }
  }

  if (!bestMatch) {
    return config.defaultValue;
  }

  // Extract relevant portion of text (first 500 chars for context)
  let extracted = bestMatch.chunk_text.trim();

  // Apply post-processing if configured
  if (config.postProcess) {
    extracted = applyPostProcessing(extracted, config.postProcess);
  }

  // Limit length to avoid overly long fields
  if (extracted.length > 500) {
    extracted = extracted.substring(0, 500) + '...';
  }

  return extracted;
}

/**
 * Apply post-processing to extracted text
 */
function applyPostProcessing(
  text: string,
  postProcess: 'trim' | 'lowercase' | 'uppercase' | 'capitalize'
): string {
  switch (postProcess) {
    case 'trim':
      return text.trim();
    case 'lowercase':
      return text.toLowerCase();
    case 'uppercase':
      return text.toUpperCase();
    case 'capitalize':
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    default:
      return text;
  }
}

// =============================================================================
// CONTEXT ENRICHMENT
// =============================================================================

/**
 * Enrich context with additional computed fields
 *
 * This can include:
 * - Extracting year from history text
 * - Parsing CNPJ format
 * - Calculating metrics from numbers in text
 * - Extracting structured data from semi-structured text
 */
export function enrichContext(context: PresentationContext): PresentationContext {
  // Extract founded year from history if available
  if (context.organization.history && !context.organization.foundedYear) {
    const yearMatch = context.organization.history.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      context.organization.foundedYear = parseInt(yearMatch[0], 10);
    }
  }

  // Extract CNPJ if present in text
  if (!context.organization.cnpj) {
    const allTexts = [
      context.organization.name,
      context.organization.history,
      context.organization.values,
    ]
      .filter(Boolean)
      .join(' ');

    const cnpjMatch = allTexts.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
    if (cnpjMatch) {
      context.organization.cnpj = cnpjMatch[0];
    }
  }

  return context;
}

// =============================================================================
// CONTEXT VALIDATION
// =============================================================================

/**
 * Validate that context has minimum required information
 */
export function validateContext(context: PresentationContext): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Organization validation
  if (!context.organization.name) {
    errors.push('Organization name is required');
  }

  // Project validation (if project context exists)
  if (context.project && !context.project.title) {
    errors.push('Project title is required when project context is provided');
  }

  // Warn if no impact data (not an error, but good to know)
  const hasImpactData = Object.values(context.impact).some((value) => Boolean(value));
  if (!hasImpactData) {
    log.warn('No impact data found in context');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// AUDIENCE-SPECIFIC CONTEXT FILTERING
// =============================================================================

/**
 * Filter and prioritize context based on target audience
 *
 * Different audiences care about different information:
 * - ESG: Impact, sustainability, values
 * - Tax: Budget, compliance, financial data
 * - Brand: Media, awards, visibility
 * - Impact: Beneficiaries, results, testimonials
 */
export function filterContextByAudience(
  context: PresentationContext,
  targetFocus: TargetFocus
): PresentationContext {
  // This is a placeholder for audience-specific filtering
  // In production, you might want to:
  // 1. Re-rank documents based on audience
  // 2. Filter out irrelevant information
  // 3. Boost certain fields based on audience priorities

  log.debug('Filtering context for audience', { targetFocus });

  // For now, return context as-is
  // Future enhancement: implement audience-specific filtering logic
  return context;
}
