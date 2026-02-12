/**
 * useWhatsAppImport Hook
 *
 * Manages WhatsApp chat export file upload, processing, and history.
 * Handles: file upload to Storage → Edge Function invocation → status polling.
 *
 * Related: Issue #211 - Universal Input Funnel
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type { WhatsAppFileImport, ImportProcessingStatus } from '../types/import';

const log = createNamespacedLogger('useWhatsAppImport');

export interface UseWhatsAppImportReturn {
  /** Upload a WhatsApp export file (.txt or .zip) */
  uploadExport: (file: File) => Promise<string | null>;
  /** Current import being processed */
  importStatus: WhatsAppFileImport | null;
  /** Is the file currently uploading to storage? */
  isUploading: boolean;
  /** Is the import being processed by the Edge Function? */
  isProcessing: boolean;
  /** Error message, if any */
  error: string | null;
  /** History of past imports */
  imports: WhatsAppFileImport[];
  /** Load import history */
  loadHistory: () => Promise<void>;
  /** Clear current error */
  clearError: () => void;
}

/** Compute SHA-256 hash of a file for deduplication */
async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function useWhatsAppImport(): UseWhatsAppImportReturn {
  const [importStatus, setImportStatus] = useState<WhatsAppFileImport | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imports, setImports] = useState<WhatsAppFileImport[]>([]);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  /** Load import history */
  const loadHistory = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: rpcError } = await supabase.rpc('get_whatsapp_import_history', {
        p_user_id: user.id,
        p_limit: 20,
      });

      if (rpcError) {
        log.warn('Failed to load import history:', rpcError.message);
        return;
      }

      setImports((data || []) as WhatsAppFileImport[]);
    } catch (err) {
      log.error('Error loading import history:', err);
    }
  }, []);

  /** Start polling an import's status */
  const startPolling = useCallback((importId: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    setIsProcessing(true);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('whatsapp_file_imports')
          .select('*')
          .eq('id', importId)
          .single();

        if (fetchError) {
          log.warn('Poll error:', fetchError.message);
          return;
        }

        if (data) {
          setImportStatus(data as WhatsAppFileImport);

          const status = data.processing_status as ImportProcessingStatus;
          if (status === 'completed' || status === 'failed') {
            // Stop polling
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            setIsProcessing(false);

            if (status === 'failed' && data.processing_error) {
              setError(data.processing_error);
            }

            // Refresh history
            await loadHistory();
          }
        }
      } catch (err) {
        log.error('Poll error:', err);
      }
    }, 3000);
  }, [loadHistory]);

  /** Upload export file and trigger processing */
  const uploadExport = useCallback(async (file: File): Promise<string | null> => {
    setError(null);
    setIsUploading(true);
    setImportStatus(null);

    try {
      // Validate file
      const validExtensions = ['.txt', '.zip'];
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
      if (!validExtensions.includes(ext)) {
        throw new Error('Formato invalido. Aceita apenas .txt ou .zip');
      }

      if (file.size > 100 * 1024 * 1024) {
        throw new Error('Arquivo muito grande. Maximo: 100MB');
      }

      // Auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nao autenticado');

      // Hash file for dedup
      const fileHash = await hashFile(file);

      // Check for duplicate import
      const { data: existing } = await supabase
        .from('whatsapp_file_imports')
        .select('id, processing_status')
        .eq('user_id', user.id)
        .eq('file_hash', fileHash)
        .limit(1)
        .single();

      if (existing && existing.processing_status === 'completed') {
        throw new Error('Este arquivo ja foi importado anteriormente');
      }

      // Upload to Supabase Storage
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${user.id}/${timestamp}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('whatsapp-exports')
        .upload(storagePath, file, {
          contentType: file.type || 'text/plain',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Erro no upload: ${uploadError.message}`);
      }

      // Create import record
      const { data: importRecord, error: createError } = await supabase
        .from('whatsapp_file_imports')
        .insert({
          user_id: user.id,
          original_filename: file.name,
          file_size_bytes: file.size,
          storage_path: storagePath,
          file_hash: fileHash,
          processing_status: 'pending',
        })
        .select()
        .single();

      if (createError || !importRecord) {
        throw new Error(`Erro ao criar registro: ${createError?.message || 'Unknown'}`);
      }

      setImportStatus(importRecord as WhatsAppFileImport);
      setIsUploading(false);

      // Invoke Edge Function
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const { error: fnError } = await supabase.functions.invoke('ingest-whatsapp-export', {
        body: {
          storagePath,
          filename: file.name,
          importId: importRecord.id,
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (fnError) {
        log.warn('Edge function invocation error (will retry via polling):', fnError.message);
      }

      // Start polling for status updates
      startPolling(importRecord.id);

      return importRecord.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      log.error('Upload failed:', message);
      setError(message);
      setIsUploading(false);
      setIsProcessing(false);
      return null;
    }
  }, [startPolling]);

  return {
    uploadExport,
    importStatus,
    isUploading,
    isProcessing,
    error,
    imports,
    loadHistory,
    clearError,
  };
}
