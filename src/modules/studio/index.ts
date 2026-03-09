/**
 * Studio Module Public API
 *
 * This module provides a generic content creation hub.
 * Currently supports podcasts, extensible to video/articles.
 */

// Types
export type {
  StudioMode,
  ProjectType,
  StudioProject,
  ProjectMetadata,
  PodcastProjectMetadata,
  VideoProjectMetadata,
  ArticleProjectMetadata,
  NewsletterProjectMetadata,
  StudioNewsletter,
  ProjectTypeConfig,
  StudioState,
  StudioAction,
  StudioActions,
  StudioContextValue,
  StudioLibraryProps,
  StudioWizardProps,
  StudioWorkspaceProps,
  StudioDataLoadResult,
  CreateProjectConfig,
} from './types/studio';

export { INITIAL_STUDIO_STATE } from './types/studio';

// Config
export {
  PROJECT_TYPE_CONFIGS,
  getProjectTypeConfig,
  getAvailableProjectTypes,
  getAllProjectTypes,
} from './config/projectTypeConfigs';

// Views
export { StudioLibrary } from './views/StudioLibrary';
export { default as StudioWizard } from './views/StudioWizard';
export { default as StudioMainView } from './views/StudioMainView';
export { default as StudioWorkspace } from './views/StudioWorkspace';

// Newsletter Components
export { NewsletterEditor, NewsletterPreview } from './components/newsletter';

// Context
export { StudioProvider, useStudio } from './context/StudioContext';

// Workspace Components
export { ArticleWorkspace, VideoWorkspace } from './components/workspace';

// Hooks
export { useGeminiLiveAudio } from './hooks/useGeminiLiveAudio';
export type { UseGeminiLiveAudioOptions, UseGeminiLiveAudioReturn } from './hooks/useGeminiLiveAudio';
export { useStudioComments } from './hooks/useStudioComments';
export type { StudioCommentRow, UseStudioCommentsReturn } from './hooks/useStudioComments';

// Cross-Module Services
export {
  fetchContactAsGuest,
  syncRecordingToCalendar,
  awardEpisodeCompletionCP,
} from './services/crossModuleService';
export type {
  ContactAsGuest,
  CalendarEventResult,
  CPAwardResult,
} from './services/crossModuleService';
