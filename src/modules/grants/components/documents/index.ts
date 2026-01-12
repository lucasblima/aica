/**
 * Document Processing Components
 * Issue #114 - Upload e extração de conteúdo de documentos
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
