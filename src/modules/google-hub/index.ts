/**
 * Google Hub Module - Public API
 *
 * Barrel export for the Google Hub module.
 * Includes Google Hub page with Gmail and Drive integration.
 * Lazy-loaded by AppRouter.tsx
 */

export { GoogleHubPage } from './pages/GoogleHubPage';
export { GoogleContextPanel } from './components/GoogleContextPanel';
export { EmailCategoryBadge } from './components/EmailCategoryBadge';
export { useEmailCategories } from './hooks/useEmailCategories';
export { useEmailTaskExtraction } from './hooks/useEmailTaskExtraction';
export type {
  EmailCategory,
  CategorizedEmail,
  ExtractedTask,
  ExtractedTaskPreview,
  ExtractedContact,
  ContactEnrichment,
  EmailCategoryConfig,
} from './types';
