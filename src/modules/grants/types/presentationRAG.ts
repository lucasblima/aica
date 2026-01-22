/**
 * Presentation RAG Types
 * Issue #117 - Phase 3: RAG Integration + Content Generation
 *
 * Types for the presentation generation system using RAG (Retrieval Augmented Generation)
 * to build context from organization documents and generate personalized slide content.
 *
 * @module modules/grants/types/presentationRAG
 */

import { SlideType, TemplateId } from './presentation';

// =============================================================================
// TARGET AUDIENCE & FOCUS
// =============================================================================

/**
 * Target audience focus for presentation personalization
 *
 * Each focus type adjusts the tone, emphasis, and content of generated slides:
 * - esg: Environmental, Social, Governance impact
 * - tax: Tax benefits and fiscal incentives
 * - brand: Brand visibility and reputation
 * - impact: Social transformation and tangible results
 * - general: Balanced approach for mixed audiences
 */
export type TargetFocus = 'esg' | 'tax' | 'brand' | 'impact' | 'general';

// =============================================================================
// RAG CONTEXT STRUCTURES
// =============================================================================

/**
 * Complete presentation context built from RAG document search
 */
export interface PresentationContext {
  /** Organization information extracted from documents */
  organization: OrganizationInfo;

  /** Project information (if project_id provided) */
  project: ProjectInfo | null;

  /** Impact metrics and results */
  impact: ImpactMetrics;

  /** Target audience focus */
  targetFocus: TargetFocus;

  /** Raw search results for advanced use cases */
  rawDocuments: {
    organization: DocumentSearchResult[];
    project: DocumentSearchResult[];
    impact: DocumentSearchResult[];
  };
}

/**
 * Organization information extracted from RAG search
 */
export interface OrganizationInfo {
  /** Organization name */
  name: string;

  /** Mission statement */
  mission?: string;

  /** Vision statement */
  vision?: string;

  /** Organizational history and background */
  history?: string;

  /** Team composition and leadership */
  team?: string;

  /** Core values and principles */
  values?: string;

  /** CNPJ (Brazilian tax ID) */
  cnpj?: string;

  /** Year founded */
  foundedYear?: number;

  /** Areas of activity */
  areasOfActivity?: string[];
}

/**
 * Project information extracted from RAG search
 */
export interface ProjectInfo {
  /** Project title */
  title: string;

  /** Main objectives */
  objectives?: string;

  /** Specific goals and targets */
  goals?: string;

  /** Budget information */
  budget?: string;

  /** Project timeline */
  timeline?: string;

  /** Target beneficiaries */
  beneficiaries?: string;

  /** Expected deliverables */
  deliverables?: string;
}

/**
 * Impact metrics extracted from RAG search
 */
export interface ImpactMetrics {
  /** Number of beneficiaries served */
  beneficiaries?: string;

  /** Key performance indicators and metrics */
  metrics?: string;

  /** Testimonials and success stories */
  testimonials?: string;

  /** Concrete results achieved */
  results?: string;

  /** Media coverage and recognition */
  media?: string;

  /** Awards and certifications */
  awards?: string;
}

/**
 * Document search result from RAG system
 */
export interface DocumentSearchResult {
  document_id: string;
  chunk_id: string;
  chunk_text: string;
  similarity: number;
  document_name: string;
  detected_type: string | null;
  organization_id?: string;
  project_id?: string;
}

// =============================================================================
// CONTENT GENERATION
// =============================================================================

/**
 * Generated presentation with all slides
 */
export interface GeneratedPresentation {
  /** Presentation title */
  title: string;

  /** Visual template to use */
  template: TemplateId;

  /** Target audience focus */
  target_focus: TargetFocus;

  /** Generated slides with content */
  slides: GeneratedSlide[];

  /** Optional metadata */
  metadata?: {
    /** Organization ID used for context */
    organization_id?: string;

    /** Project ID used for context */
    project_id?: string;

    /** Generation timestamp */
    generated_at?: string;

    /** RAG search statistics */
    rag_stats?: {
      total_documents_searched: number;
      total_chunks_retrieved: number;
      average_similarity: number;
    };
  };
}

/**
 * Single generated slide with content
 */
export interface GeneratedSlide {
  /** Type of slide (determines structure) */
  slide_type: SlideType;

  /** Slide content (structure varies by type) */
  content: Record<string, unknown>;

  /** Display order */
  sort_order: number;

  /** Optional custom CSS overrides */
  custom_css?: string;

  /** Generation metadata */
  metadata?: {
    /** Source documents used */
    source_documents?: string[];

    /** Confidence score (0-1) */
    confidence?: number;

    /** Generation timestamp */
    generated_at?: string;
  };
}

// =============================================================================
// RAG SEARCH OPTIONS
// =============================================================================

/**
 * Options for building presentation context via RAG
 */
export interface BuildContextOptions {
  /** Organization ID (required) */
  organizationId: string;

  /** Project ID (optional, for project-specific presentations) */
  projectId?: string;

  /** Target audience focus */
  targetFocus?: TargetFocus;

  /** Maximum documents to retrieve per category */
  maxDocumentsPerCategory?: number;

  /** Minimum similarity threshold (0-1) */
  similarityThreshold?: number;

  /** Include historical data from previous presentations */
  includeHistory?: boolean;
}

/**
 * Options for generating slide content
 */
export interface GenerateSlideOptions {
  /** Slide type to generate */
  slideType: SlideType;

  /** Presentation context */
  context: PresentationContext;

  /** Target audience focus */
  targetFocus?: TargetFocus;

  /** Temperature for content generation (0-1, higher = more creative) */
  temperature?: number;

  /** Maximum tokens for generation */
  maxTokens?: number;

  /** Existing slide content to refine (for regeneration) */
  existingContent?: Record<string, unknown>;
}

// =============================================================================
// PROMPT ENGINEERING
// =============================================================================

/**
 * Audience-specific prompt configuration
 */
export interface AudiencePromptConfig {
  /** Tone and style guidelines */
  tone: string;

  /** Key points to emphasize */
  emphasis: string[];

  /** Language style (formal, casual, persuasive, etc.) */
  style: string;

  /** Keywords to include */
  keywords?: string[];

  /** Keywords to avoid */
  avoidKeywords?: string[];
}

/**
 * Field extraction configuration for context building
 */
export interface FieldExtractionConfig {
  /** Field name */
  fieldName: string;

  /** Search query for RAG */
  searchQuery: string;

  /** Required or optional field */
  required: boolean;

  /** Default value if not found */
  defaultValue?: string;

  /** Post-processing function name */
  postProcess?: 'trim' | 'lowercase' | 'uppercase' | 'capitalize';
}

// =============================================================================
// VALIDATION & SCHEMAS
// =============================================================================

/**
 * Validation result for generated content
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;

  /** Validation errors (if any) */
  errors?: string[];

  /** Validation warnings (if any) */
  warnings?: string[];

  /** Sanitized/corrected content (if auto-fix applied) */
  sanitizedContent?: Record<string, unknown>;
}

/**
 * Content generation statistics
 */
export interface GenerationStats {
  /** Total slides generated */
  totalSlides: number;

  /** Successful generations */
  successful: number;

  /** Failed generations */
  failed: number;

  /** Total tokens consumed */
  tokensUsed: number;

  /** Total time in milliseconds */
  totalTimeMs: number;

  /** Average time per slide */
  averageTimePerSlideMs: number;
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * RAG context building error
 */
export interface ContextBuildError {
  /** Error type */
  type: 'missing_documents' | 'search_failed' | 'extraction_failed' | 'validation_failed';

  /** Error message */
  message: string;

  /** Field that failed (if applicable) */
  field?: string;

  /** Original error */
  originalError?: Error;
}

/**
 * Content generation error
 */
export interface ContentGenerationError {
  /** Error type */
  type: 'api_error' | 'validation_error' | 'timeout' | 'rate_limit' | 'unknown';

  /** Error message */
  message: string;

  /** Slide type that failed */
  slideType?: SlideType;

  /** Retry possible? */
  retryable: boolean;

  /** Original error */
  originalError?: Error;
}
