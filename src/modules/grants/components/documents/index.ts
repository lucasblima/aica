/**
 * Document Processing Components
 * Epic #113 - File Processing Pipeline
 * Issues #114 (Upload), #115 (Classification), #116 (Search)
 *
 * @module modules/grants/components/documents
 */

export { DocumentUploader } from './DocumentUploader';
export type {
  DocumentUploaderProps,
  ProcessedDocument,
  LinkSuggestion,
  FileType,
  UploadStatus,
} from './DocumentUploader';

export { DocumentPreview } from './DocumentPreview';
export type { DocumentPreviewProps } from './DocumentPreview';

export { DocumentList } from './DocumentList';
export type { DocumentListProps } from './DocumentList';

export { DocumentSearchBox } from './DocumentSearchBox';
export type { DocumentSearchBoxProps } from './DocumentSearchBox';

// Sprint 3 - Classification and Automatic Linking (#115)
export { LinkSuggestionsPanel } from './LinkSuggestionsPanel';
export type { LinkSuggestionsPanelProps } from './LinkSuggestionsPanel';

export {
  DocumentTypeBadge,
  getDocumentTypeConfig,
  getAvailableDocumentTypes,
  isValidDocumentType,
} from './DocumentTypeBadge';
export type { DocumentTypeBadgeProps } from './DocumentTypeBadge';

export { LinkConfirmationModal } from './LinkConfirmationModal';
export type { LinkConfirmationModalProps } from './LinkConfirmationModal';
