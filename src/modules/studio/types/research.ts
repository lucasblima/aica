// src/modules/studio/types/research.ts
import type { Dossier, WorkspaceCustomSource } from './podcast-workspace';

// === Suggestion Card Types ===

export type SuggestionCardType =
  | 'formacao'
  | 'carreira'
  | 'controversia'
  | 'publicacao'
  | 'rede_social'
  | 'opiniao'
  | 'atualidade'
  | 'custom';

export type SuggestionCardStatus = 'pending' | 'expanded' | 'inserted' | 'discarded';

export interface SuggestionCard {
  id: string;
  type: SuggestionCardType;
  title: string;
  previewText: string;
  fullText: string;
  targetSection: 'bio' | 'ficha' | 'noticias';
  relevanceScore: number; // 0-100
  sources?: Array<{ title: string; url: string }>;
  status: SuggestionCardStatus;
}

export interface GapAnalysisRequest {
  dossier: Dossier;
  guestName: string;
  theme: string;
  customSources?: WorkspaceCustomSource[];
}

export interface GapAnalysisResponse {
  success: boolean;
  data?: {
    suggestions: SuggestionCard[];
    analysisTimestamp: string;
  };
  error?: string;
}

// === Enrich Card Types ===

export interface EnrichCardRequest {
  cardType: SuggestionCardType;
  cardTitle: string;
  guestName: string;
  theme: string;
  existingDossier: string; // biography text
  fileSearchStoreId?: string;
}

export interface EnrichCardResponse {
  success: boolean;
  data?: {
    enrichedText: string;
    sources: Array<{ title: string; url: string }>;
  };
  error?: string;
}

// === File Search Types ===

export interface FileSearchRequest {
  sources: Array<{
    content: string;
    type: 'text' | 'url';
    label: string;
  }>;
}

export interface FileSearchResponse {
  success: boolean;
  data?: {
    storeId: string;
    indexedCount: number;
  };
  error?: string;
}

// === Research Chat Types ===

export interface ResearchChatContext {
  guestName: string;
  episodeTheme: string;
  dossierBiography: string;
  dossierControversies: string[];
  customSourcesSummary: string;
  approvedCards: string[];
  discardedCards: string[];
}

// === Card Icon/Color Config ===

export const CARD_TYPE_CONFIG: Record<SuggestionCardType, {
  icon: string; // Lucide icon name
  label: string;
  color: string; // Tailwind class
}> = {
  formacao: { icon: 'GraduationCap', label: 'Formacao Academica', color: 'text-blue-600' },
  carreira: { icon: 'Briefcase', label: 'Carreira', color: 'text-amber-600' },
  controversia: { icon: 'Zap', label: 'Controversia', color: 'text-red-500' },
  publicacao: { icon: 'BookOpen', label: 'Publicacao', color: 'text-purple-600' },
  rede_social: { icon: 'Globe', label: 'Presenca Digital', color: 'text-green-600' },
  opiniao: { icon: 'MessageCircle', label: 'Opiniao Publica', color: 'text-cyan-600' },
  atualidade: { icon: 'Newspaper', label: 'Noticias Recentes', color: 'text-orange-500' },
  custom: { icon: 'Search', label: 'Pesquisa Personalizada', color: 'text-ceramic-text-secondary' },
};
