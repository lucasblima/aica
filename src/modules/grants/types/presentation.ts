/**
 * Copyright (c) 2024 - Present. Aica Engineering. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Presentation Generator Types
 * Issue #117 - Gerador de Apresentacoes HTML/PDF
 *
 * Tipos TypeScript para geração de apresentacoes HTML interativas
 * com export para PDF usando RAG + Gemini.
 *
 * @module modules/grants/types/presentation
 */

// =============================================================================
// CORE TYPES
// =============================================================================

/**
 * Template visual disponível
 */
export type TemplateType = 'professional' | 'creative' | 'institutional';

/**
 * Tipos de slides disponíveis (12 tipos)
 */
export type SlideType =
  | 'cover'
  | 'organization'
  | 'project'
  | 'impact-metrics'
  | 'timeline'
  | 'team'
  | 'incentive-law'
  | 'tiers'
  | 'testimonials'
  | 'media'
  | 'comparison'
  | 'contact';

/**
 * Publico-alvo para geração de conteúdo
 */
export type AudienceType = 'esg' | 'tax' | 'brand' | 'impact' | 'general';

/**
 * Status do deck
 */
export type DeckStatus = 'draft' | 'generating' | 'ready' | 'exported';

// =============================================================================
// DATABASE ENTITIES
// =============================================================================

/**
 * Deck gerado (tabela generated_decks)
 */
export interface GeneratedDeck {
  id: string;
  userId: string;
  organizationId: string | null;
  projectId: string | null;
  title: string;
  description: string | null;
  templateId: TemplateType;
  targetAudience: AudienceType;
  status: DeckStatus;
  version: number;
  lastExportedAt: string | null;
  exportCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Slide individual (tabela deck_slides)
 */
export interface DeckSlide {
  id: string;
  deckId: string;
  slideType: SlideType;
  slideOrder: number;
  content: SlideContent;
  customCss: string | null;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Union type para conteúdo de todos os slides
 */
export type SlideContent =
  | CoverSlideContent
  | OrganizationSlideContent
  | ProjectSlideContent
  | ImpactMetricsSlideContent
  | TimelineSlideContent
  | TeamSlideContent
  | IncentiveLawSlideContent
  | TiersSlideContent
  | TestimonialsSlideContent
  | MediaSlideContent
  | ComparisonSlideContent
  | ContactSlideContent;

// =============================================================================
// SLIDE CONTENT TYPES (12 TIPOS)
// =============================================================================

/**
 * 1. Cover Slide - Capa com logo e título
 */
export interface CoverSlideContent {
  type: 'cover';
  title: string;
  subtitle: string;
  tagline?: string;
  logoUrl?: string;
  backgroundUrl?: string;
  approvalNumber?: string;
}

/**
 * 2. Organization Slide - Sobre a organizacao
 */
export interface OrganizationSlideContent {
  type: 'organization';
  name: string;
  description: string;
  mission?: string;
  vision?: string;
  achievements: string[];
  logoUrl?: string;
  foundedYear?: number;
}

/**
 * 3. Project Slide - Detalhes do projeto
 */
export interface ProjectSlideContent {
  type: 'project';
  name: string;
  executiveSummary: string;
  objectives: string[];
  duration: string;
  location?: string;
  targetAudience?: string;
}

/**
 * 4. Impact Metrics Slide - Métricas e numeros de impacto
 */
export interface ImpactMetricsSlideContent {
  type: 'impact-metrics';
  title: string;
  metrics: Array<{
    label: string;
    value: string | number;
    unit?: string;
    icon?: string;
    description?: string;
  }>;
  impactStatement?: string;
}

/**
 * 5. Timeline Slide - Linha do tempo / cronograma
 */
export interface TimelineSlideContent {
  type: 'timeline';
  title: string;
  events: Array<{
    date: string;
    title: string;
    description?: string;
    isHighlighted?: boolean;
  }>;
}

/**
 * 6. Team Slide - Equipe do projeto
 */
export interface TeamSlideContent {
  type: 'team';
  title: string;
  members: Array<{
    name: string;
    role: string;
    bio?: string;
    photoUrl?: string;
    linkedIn?: string;
  }>;
}

/**
 * 7. Incentive Law Slide - Beneficios da Lei de Incentivo
 */
export interface IncentiveLawSlideContent {
  type: 'incentive-law';
  lawName: string;
  lawShortName: string;
  jurisdiction: string;
  taxType: string;
  deductionPercentage: number;
  approvalNumber?: string;
  validityPeriod?: string;
  benefits: string[];
}

/**
 * 8. Tiers Slide - Cotas de patrocinio
 */
export interface TiersSlideContent {
  type: 'tiers';
  title: string;
  tiers: Array<{
    id: string;
    name: string;
    value: number;
    quantityTotal: number;
    quantityAvailable: number;
    deliverables: string[];
    isHighlighted: boolean;
    color?: string;
  }>;
  currency: string;
}

/**
 * 9. Testimonials Slide - Depoimentos com fotos
 */
export interface TestimonialsSlideContent {
  type: 'testimonials';
  title: string;
  testimonials: Array<{
    name: string;
    role: string;
    organization?: string;
    quote: string;
    photoUrl?: string;
  }>;
}

/**
 * 10. Media Slide - Galeria de imagens/videos
 */
export interface MediaSlideContent {
  type: 'media';
  title: string;
  description?: string;
  items: Array<{
    type: 'image' | 'video';
    url: string;
    thumbnailUrl?: string;
    caption?: string;
  }>;
}

/**
 * 11. Comparison Slide - Tabela comparativa
 */
export interface ComparisonSlideContent {
  type: 'comparison';
  title: string;
  description?: string;
  rows: Array<{
    label: string;
    values: Array<string | number | boolean>;
  }>;
  columnHeaders: string[];
}

/**
 * 12. Contact Slide - CTA e informações de contato
 */
export interface ContactSlideContent {
  type: 'contact';
  organizationName: string;
  contactName: string;
  email: string;
  phone?: string;
  website?: string;
  socialLinks?: Record<string, string>;
  callToAction: string;
  qrCodeUrl?: string;
}

// =============================================================================
// UI COMPONENT PROPS
// =============================================================================

/**
 * Props base para todos os componentes de slide
 */
export interface BaseSlideProps<T extends SlideContent> {
  content: T;
  template: TemplateType;
  editMode?: boolean;
  onChange?: (content: T) => void;
  className?: string;
}

/**
 * Props para SlideCanvas
 */
export interface SlideCanvasProps {
  slides: DeckSlide[];
  currentSlideIndex: number;
  template: TemplateType;
  zoom: number;
  onSlideChange: (index: number) => void;
  onZoomChange: (zoom: number) => void;
  editMode?: boolean;
  onSlideUpdate?: (slideId: string, content: SlideContent) => void;
}

/**
 * Props para EditableText
 */
export interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  tag?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  className?: string;
  editMode?: boolean;
  placeholder?: string;
  multiline?: boolean;
}

/**
 * Props para SlideSorter
 */
export interface SlideSorterProps {
  slides: DeckSlide[];
  currentSlideIndex: number;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onSelectSlide: (index: number) => void;
  onDeleteSlide?: (slideId: string) => void;
}

// =============================================================================
// PRESENTATION STATE
// =============================================================================

/**
 * Estado completo da apresentação
 */
export interface Presentation {
  id: string;
  title: string;
  template: TemplateType;
  slides: DeckSlide[];
  metadata: GeneratedDeck;
}

/**
 * Opções de zoom
 */
export const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5] as const;
export type ZoomLevel = typeof ZOOM_LEVELS[number];

/**
 * Dimensoes do viewport (1920x1080)
 */
export const SLIDE_DIMENSIONS = {
  width: 1920,
  height: 1080,
} as const;
