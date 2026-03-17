/**
 * File Search System - Type Definitions
 *
 * Unified types for the Gemini File Search integration.
 * This system allows semantic search across user documents using Gemini's RAG capabilities.
 *
 * @module types/fileSearch
 */

// ============================================================================
// Core Database Types
// ============================================================================

/**
 * Represents a File Search Store in the database
 * Corresponds to: user_file_search_stores table
 */
export interface FileSearchStore {
  /** Unique identifier */
  id: string;

  /** User who owns this store */
  user_id: string;

  /** Gemini File Search Store name (format: fileSearchStores/xxx) */
  store_name: string;

  /** Category/type of documents stored */
  store_category: StoreCategory;

  /** Human-readable display name */
  display_name: string | null;

  /** Store configuration options */
  store_config: StoreConfig;

  /** Timestamp when created */
  created_at: string;

  /** Timestamp when last updated */
  updated_at: string;
}

/**
 * Configuration options for a File Search Store
 */
export interface StoreConfig {
  /** Automatically index new files */
  auto_index?: boolean;

  /** Index image files (extract text from images) */
  index_images?: boolean;

  /** Index vídeo files (extract text from videos) */
  index_videos?: boolean;

  /** Maximum file size in MB */
  max_file_size_mb?: number;
}

/**
 * Available store categories
 * Each category represents a different type of document collection
 */
export type StoreCategory =
  | 'financial'       // Financial documents, invoices, receipts
  | 'documents'       // General documents
  | 'personal'        // Personal files
  | 'business'        // Business documents
  | 'grants'          // Grant proposals and related documents
  | 'podcast'         // Podcast transcripts and scripts
  | 'journey'         // Journey moments and stories
  | 'media'           // Photos, videos metadata
  | 'transcriptions'; // Audio transcriptions

/**
 * Represents an indexed document in the database
 * Corresponds to: indexed_documents table
 */
export interface IndexedDocument {
  /** Unique identifier */
  id: string;

  /** User who owns this document */
  user_id: string;

  /** Store this document belongs to */
  store_id: string;

  /** Gemini file name reference */
  gemini_file_name: string;

  /** Original filename when uploaded */
  original_filename: string;

  /** MIME type of the file */
  mime_type: string | null;

  /** File size in bytes */
  file_size_bytes: number | null;

  /** Custom metadata as JSON */
  custom_metadata: Record<string, any>;

  /** Current indexing status */
  indexing_status: IndexingStatus;

  /** Timestamp when indexing completed */
  indexed_at: string | null;

  /** Timestamp when document was created */
  created_at: string;
}

/**
 * Status of document indexing process
 */
export type IndexingStatus =
  | 'pending'     // Waiting to be indexed
  | 'processing'  // Currently being indexed
  | 'completed'   // Successfully indexed
  | 'failed';     // Indexing failed

/**
 * Represents a search query log entry
 * Corresponds to: file_search_queries table
 */
export interface FileSearchQueryLog {
  /** Unique identifier */
  id: string;

  /** User who made the query */
  user_id: string;

  /** Store names searched */
  store_names: string[];

  /** The search query text */
  query_text: string;

  /** Metadata filter applied (if any) */
  metadata_filter: string | null;

  /** Number of tokens in response */
  response_tokens: number | null;

  /** Citations returned in the response */
  citations: Citation[] | null;

  /** Timestamp when query was made */
  created_at: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request to create a new File Search Store
 */
export interface CreateStoreRequest {
  /** Category for the store */
  category: StoreCategory;
}

/**
 * Response from creating a store
 */
export interface CreateStoreResponse {
  /** The store name created in Gemini */
  store_name: string;
}

/**
 * Request to upload and index a document
 */
export interface UploadDocumentRequest {
  /** File to upload */
  file: File;

  /** Category/store to upload to */
  category: StoreCategory;

  /** Optional custom metadata */
  metadata?: Record<string, any>;
}

/**
 * Response from uploading a document
 */
export interface UploadDocumentResponse {
  /** Indexing status */
  status: IndexingStatus;

  /** Original file name */
  file_name: string;

  /** Store name where indexed */
  store_name: string;
}

/**
 * Request to search documents
 */
export interface SearchDocumentsRequest {
  /** Search query text */
  query: string;

  /** Categories to search in */
  categories: StoreCategory[];

  /** Optional metadata filters */
  filters?: Record<string, any>;

  /** Model to use for generation (default: gemini-2.5-flash) */
  model?: string;
}

/**
 * Result from a document search
 */
export interface FileSearchResult {
  /** Generated answer based on documents */
  answer: string;

  /** Source citations from documents */
  citations: Citation[];

  /** Model used for generation */
  model?: string;
}

/**
 * A citation/source reference from search results
 */
export interface Citation {
  /** Document URI or identifier */
  uri: string | null;

  /** Document title or name */
  title: string | null;

  /** Relevant text excerpt */
  text?: string;

  /** Relevance score (0-1) */
  score?: number;

  /** Source document name */
  source?: string;

  /** Content snippet */
  content?: string;

  /** Page number (for PDFs) */
  page?: number;
}

/**
 * A relevant text chunk from search results
 */
export interface FileSearchChunk {
  /** Text content of the chunk */
  text: string;

  /** Relevance score (0-1) */
  score: number;
}

// ============================================================================
// Module-Specific Types
// ============================================================================

/**
 * Module types that can use File Search
 */
export type ModuleType =
  | 'grants'    // Grants module
  | 'podcast'   // Podcast module
  | 'journey'   // Journey module
  | 'finance'   // Finance module
  | 'atlas'     // Atlas module
  | 'chat';     // Chat module

/**
 * Request to create a corpus (alternative to store)
 * Used for module-specific document collections
 */
export interface CreateCorpusRequest {
  /** Corpus name */
  name: string;

  /** Display name */
  display_name: string;

  /** Module this corpus belongs to */
  module_type?: ModuleType;

  /** Specific module item ID (e.g., grant ID, podcast ID) */
  module_id?: string;
}

/**
 * Represents a corpus (collection of documents)
 */
export interface FileSearchCorpus {
  /** Unique identifier */
  id: string;

  /** User who owns this corpus */
  user_id: string;

  /** Corpus name */
  name: string;

  /** Display name */
  display_name: string;

  /** Number of documents in corpus */
  document_count: number;

  /** Module type this corpus belongs to (optional) */
  module_type?: ModuleType;

  /** Module item ID (optional) */
  module_id?: string;

  /** Timestamp when created */
  created_at: string;
}

/**
 * Request to query a specific corpus
 */
export interface QueryCorpusRequest {
  /** Corpus ID to query */
  corpus_id: string;

  /** Search query */
  query: string;

  /** Number of results to return */
  result_count?: number;

  /** Filter by module type */
  module_type?: ModuleType;

  /** Filter by module item ID */
  module_id?: string;
}

/**
 * A document within a corpus
 */
export interface FileSearchDocument {
  /** Unique identifier */
  id: string;

  /** Corpus this document belongs to */
  corpus_id: string;

  /** User who owns this document */
  user_id: string;

  /** Gemini file ID */
  gemini_file_id: string;

  /** Original file name */
  file_name: string;

  /** MIME type */
  mime_type: string;

  /** File size in bytes */
  file_size: number;

  /** Storage path (e.g., Supabase Storage path) */
  storage_path: string | null;

  /** Module type this document belongs to */
  module_type: ModuleType | null;

  /** Module item ID */
  module_id: string | null;

  /** Custom metadata */
  metadata: DocumentMetadata;

  /** Timestamp when created */
  created_at: string;
}

/**
 * Request to index a document
 */
export interface IndexDocumentRequest {
  /** File to index */
  file: File;

  /** Corpus ID to add to */
  corpus_id: string;

  /** Display name for the document (optional) */
  display_name?: string;

  /** Module type (optional) */
  module_type?: ModuleType;

  /** Module item ID (optional) */
  module_id?: string;

  /** Custom metadata (optional) */
  metadata?: DocumentMetadata;

  /** Alias for metadata (for backward compatibility) */
  custom_metadata?: DocumentMetadata;
}

/**
 * Document metadata for different modules
 */
export interface DocumentMetadata {
  /** Module this document belongs to */
  module_type?: ModuleType;

  /** Module item ID */
  module_id?: string;

  /** Document type (e.g., 'grant_proposal', 'transcript', 'invoice') */
  document_type?: string;

  /** Document title */
  title?: string;

  /** Document date */
  date?: string;

  /** Tags */
  tags?: string[];

  /** Additional custom fields */
  [key: string]: any;
}

/**
 * Query parameters for searching documents
 */
export interface FileSearchQuery {
  /** Corpus ID to search (required if not using categories) */
  corpus_id?: string;

  /** Search query text */
  query: string;

  /** Number of results to return (default: 5) */
  result_count?: number;

  /** Filter by module type */
  module_type?: ModuleType;

  /** Filter by module item ID */
  module_id?: string;

  /** Categories to search (alternative to corpus_id) */
  categories?: StoreCategory[];

  /** Additional filters */
  filters?: Record<string, any>;
}

// ============================================================================
// Service Layer Types
// ============================================================================

/**
 * File Search Service configuration
 */
export interface FileSearchServiceConfig {
  /** Backend API base URL */
  baseUrl: string;

  /** Authentication token */
  authToken?: string;

  /** Default timeout in ms */
  timeout?: number;
}

/**
 * Upload progress callback
 */
export interface UploadProgress {
  /** Bytes uploaded so far */
  loaded: number;

  /** Total bytes to upload */
  total: number;

  /** Progress percentage (0-100) */
  percentage: number;

  /** Current stage of upload */
  stage: 'uploading' | 'processing' | 'indexing' | 'completed';
}

/**
 * Error response from the API
 */
export interface FileSearchError {
  /** Error message */
  detail: string;

  /** HTTP status code */
  status?: number;

  /** Error code */
  code?: string;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Chunking configuration for document indexing
 */
export interface ChunkingConfig {
  /** Maximum tokens per chunk */
  max_tokens_per_chunk?: number;

  /** Overlap tokens between chunks */
  max_overlap_tokens?: number;
}

/**
 * Metadata filter for searching
 */
export interface MetadataFilter {
  /** Field name */
  field: string;

  /** Operator (=, !=, >, <, >=, <=) */
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=';

  /** Value to compare */
  value: string | number | boolean;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  /** Data items */
  data: T[];

  /** Total count of items */
  total: number;

  /** Current page */
  page: number;

  /** Items per page */
  per_page: number;

  /** Whether there's a next page */
  has_next: boolean;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a value is a valid StoreCategory
 */
export function isStoreCategory(value: any): value is StoreCategory {
  const categories: StoreCategory[] = [
    'financial',
    'documents',
    'personal',
    'business',
    'grants',
    'podcast',
    'journey',
    'media',
    'transcriptions'
  ];
  return typeof value === 'string' && categories.includes(value as StoreCategory);
}

/**
 * Check if a value is a valid ModuleType
 */
export function isModuleType(value: any): value is ModuleType {
  const modules: ModuleType[] = [
    'grants',
    'podcast',
    'journey',
    'finance',
    'atlas',
    'chat'
  ];
  return typeof value === 'string' && modules.includes(value as ModuleType);
}

/**
 * Check if a value is a valid IndexingStatus
 */
export function isIndexingStatus(value: any): value is IndexingStatus {
  const statuses: IndexingStatus[] = ['pending', 'processing', 'completed', 'failed'];
  return typeof value === 'string' && statuses.includes(value as IndexingStatus);
}

// ============================================================================
// Legacy Type Aliases (for backward compatibility)
// ============================================================================

/**
 * @deprecated Use StoreCategory instead
 */
export type FileSearchStoreCategory = StoreCategory;

/**
 * @deprecated Use FileSearchStore instead
 */
export type UserFileSearchStore = FileSearchStore;

/**
 * @deprecated Use UploadDocumentRequest instead
 */
export type UploadFileRequest = UploadDocumentRequest;

/**
 * @deprecated Use SearchDocumentsRequest instead
 */
export type FileSearchRequest = SearchDocumentsRequest;

/**
 * @deprecated Use FileSearchResult instead
 */
export type SearchResult = FileSearchResult;
