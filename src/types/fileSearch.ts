export type FileSearchStoreCategory = 'financial' | 'documents' | 'personal' | 'business';

export interface UserFileSearchStore {
    id: string;
    user_id: string;
    store_name: string;      // Gemini: fileSearchStores/xxx
    store_category: FileSearchStoreCategory;
    display_name: string | null;
    created_at: string;
    updated_at: string;
}

export type IndexingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface IndexedDocument {
    id: string;
    user_id: string;
    store_id: string;
    gemini_file_name: string;
    original_filename: string;
    mime_type: string | null;
    file_size_bytes: number | null;
    custom_metadata: Record<string, any>;
    indexing_status: IndexingStatus;
    indexed_at: string | null;
    created_at: string;
}

export interface FileSearchQuery {
    id: string;
    user_id: string;
    store_names: string[];
    query_text: string;
    metadata_filter: string | null;
    response_tokens: number | null;
    citations: any | null; // Complex Gemini citation object
    created_at: string;
}

// Helper types for API requests
export interface UploadFileRequest {
    file: File;
    category: FileSearchStoreCategory;
    metadata?: Record<string, any>;
}

export interface FileSearchRequest {
    query: string;
    categories: FileSearchStoreCategory[];
    filters?: Record<string, any>;
}

export interface SearchResult {
    answer: string;
    citations: Citation[];
    model: string;
}

export interface Citation {
    title?: string;
    source: string;
    content: string;
    page?: number;
    uri?: string;
}
