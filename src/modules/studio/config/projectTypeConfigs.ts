/**
 * Project Type Configuration Registry
 *
 * Central registry that defines behavior, UI, and data mapping
 * for each project type in Studio. Used by wizard, library, and
 * workspace to adapt their behavior per project type.
 */

import type { ProjectType, ProjectTypeConfig } from '../types/studio';

// ============================================
// INDIVIDUAL CONFIGS
// ============================================

const PODCAST_CONFIG: ProjectTypeConfig = {
  type: 'podcast',
  label: 'Podcast',
  iconName: 'Mic2',
  description: 'Produção completa de episodios de podcast com pesquisa, pauta e gravação',
  color: 'amber',
  requiredFields: ['title', 'guestName', 'theme'],
  optionalFields: ['description', 'scheduledDate', 'scheduledTime', 'location', 'season'],
  databaseTable: 'podcast_episodes',
  parentTable: 'podcast_shows',
  hasParentHierarchy: true,
  stages: ['setup', 'research', 'pauta', 'production'],
  comingSoon: false,
};

const VIDEO_CONFIG: ProjectTypeConfig = {
  type: 'vídeo',
  label: 'Video',
  iconName: 'Video',
  description: 'Produção de videos com roteiro, filmagem e edição',
  color: 'blue',
  requiredFields: ['title', 'theme'],
  optionalFields: ['description', 'scheduledDate'],
  databaseTable: 'video_projects',
  hasParentHierarchy: false,
  stages: ['upload', 'transcricao', 'clips', 'review'],
  comingSoon: false,
};

const ARTICLE_CONFIG: ProjectTypeConfig = {
  type: 'article',
  label: 'Artigo',
  iconName: 'FileText',
  description: 'Escrita de artigos com pesquisa, rascunho e revisão',
  color: 'emerald',
  requiredFields: ['title', 'theme'],
  optionalFields: ['description', 'targetPublication'],
  databaseTable: 'article_projects',
  hasParentHierarchy: false,
  stages: ['pesquisa', 'outline', 'rascunho', 'revisão'],
  comingSoon: false,
};

const NEWSLETTER_CONFIG: ProjectTypeConfig = {
  type: 'newsletter',
  label: 'Newsletter',
  iconName: 'Mail',
  description: 'Newsletters com curadoria e escrita assistida por IA',
  color: 'violet',
  requiredFields: ['title', 'theme'],
  optionalFields: ['description', 'scheduledDate'],
  databaseTable: 'studio_newsletters',
  hasParentHierarchy: false,
  stages: ['curate', 'write', 'design', 'review', 'send'],
  comingSoon: true,
};

const CLIP_CONFIG: ProjectTypeConfig = {
  type: 'clip',
  label: 'Clip Social',
  iconName: 'Scissors',
  description: 'Clips curtos derivados de podcasts e videos para redes sociais',
  color: 'pink',
  requiredFields: ['title'],
  optionalFields: ['platform', 'caption'],
  databaseTable: 'studio_clips',
  hasParentHierarchy: true,
  stages: ['select', 'edit', 'caption', 'schedule'],
  comingSoon: true,
};

// ============================================
// REGISTRY
// ============================================

export const PROJECT_TYPE_CONFIGS: Record<ProjectType, ProjectTypeConfig> = {
  podcast: PODCAST_CONFIG,
  video: VIDEO_CONFIG,
  article: ARTICLE_CONFIG,
  newsletter: NEWSLETTER_CONFIG,
  clip: CLIP_CONFIG,
};

// ============================================
// ACCESSORS
// ============================================

export function getProjectTypeConfig(type: ProjectType): ProjectTypeConfig {
  return PROJECT_TYPE_CONFIGS[type];
}

export function getAvailableProjectTypes(): ProjectTypeConfig[] {
  return Object.values(PROJECT_TYPE_CONFIGS).filter(c => !c.comingSoon);
}

export function getAllProjectTypes(): ProjectTypeConfig[] {
  return Object.values(PROJECT_TYPE_CONFIGS);
}
