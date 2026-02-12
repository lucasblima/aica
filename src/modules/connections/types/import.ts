/**
 * WhatsApp File Import Types
 *
 * Types for the file-based WhatsApp conversation import feature.
 * Related: Issue #211 - Universal Input Funnel
 */

export type ImportProcessingStatus =
  | 'pending'
  | 'parsing'
  | 'extracting_intents'
  | 'indexing_rag'
  | 'completed'
  | 'failed';

export interface WhatsAppFileImport {
  id: string;
  user_id: string;
  original_filename: string;
  file_size_bytes: number;
  storage_path: string | null;
  file_hash: string;
  export_format: 'android' | 'ios' | 'unknown' | null;
  processing_status: ImportProcessingStatus;
  processing_error: string | null;
  total_messages_parsed: number;
  messages_imported: number;
  messages_deduplicated: number;
  contacts_resolved: number;
  date_range_start: string | null;
  date_range_end: string | null;
  participants: string[];
  is_group_export: boolean;
  file_search_store_id: string | null;
  file_search_document_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImportResult {
  success: boolean;
  importId: string;
  totalParsed: number;
  imported: number;
  deduplicated: number;
  contacts: number;
  format: string;
  participants: string[];
  dateRange: { start: string; end: string };
}

/** Status labels for UI display */
export const IMPORT_STATUS_LABELS: Record<ImportProcessingStatus, string> = {
  pending: 'Aguardando...',
  parsing: 'Extraindo mensagens...',
  extracting_intents: 'Analisando com IA...',
  indexing_rag: 'Indexando para busca...',
  completed: 'Concluido',
  failed: 'Erro no processamento',
};

/** Progress percentages for each status stage */
export const IMPORT_STATUS_PROGRESS: Record<ImportProcessingStatus, number> = {
  pending: 5,
  parsing: 20,
  extracting_intents: 50,
  indexing_rag: 85,
  completed: 100,
  failed: 0,
};
