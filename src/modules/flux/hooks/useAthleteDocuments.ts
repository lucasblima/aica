import { useState, useEffect, useCallback } from 'react';
import type { AthleteDocument, UploadDocumentInput } from '../types/parq';
import { AthleteDocumentService } from '../services/athleteDocumentService';

// ============================================
// TYPES
// ============================================

interface UseAthleteDocumentsOptions {
  athleteId: string;
}

interface UseAthleteDocumentsReturn {
  documents: AthleteDocument[];
  isLoading: boolean;
  error: string | null;
  isUploading: boolean;
  uploadDocument: (input: Omit<UploadDocumentInput, 'athlete_id'>) => Promise<AthleteDocument | null>;
  getDocumentUrl: (doc: AthleteDocument) => Promise<string | null>;
  reviewDocument: (docId: string, status: 'approved' | 'rejected', notes?: string) => Promise<boolean>;
  deleteDocument: (docId: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

// ============================================
// HOOK
// ============================================

export function useAthleteDocuments({ athleteId }: UseAthleteDocumentsOptions): UseAthleteDocumentsReturn {
  const [documents, setDocuments] = useState<AthleteDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // ============================================
  // FETCH DOCUMENTS
  // ============================================

  const fetchDocuments = useCallback(async () => {
    if (!athleteId) return;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchErr } = await AthleteDocumentService.getDocumentsByAthlete(athleteId);
      if (fetchErr) throw fetchErr;
      setDocuments(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar documentos.';
      setError(message);
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // ============================================
  // UPLOAD
  // ============================================

  const uploadDocument = useCallback(
    async (input: Omit<UploadDocumentInput, 'athlete_id'>): Promise<AthleteDocument | null> => {
      if (!athleteId) return null;

      setIsUploading(true);
      setError(null);

      try {
        const fullInput: UploadDocumentInput = {
          ...input,
          athlete_id: athleteId,
        };

        const { data: newDoc, error: uploadErr } = await AthleteDocumentService.uploadDocument(fullInput);
        if (uploadErr) throw uploadErr;
        // Refetch to get the full document list in consistent order
        await fetchDocuments();
        return newDoc;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao enviar documento.';
        setError(message);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [athleteId, fetchDocuments]
  );

  // ============================================
  // GET SIGNED URL
  // ============================================

  const getDocumentUrl = useCallback(
    async (doc: AthleteDocument): Promise<string | null> => {
      try {
        const { url, error: urlErr } = await AthleteDocumentService.getDocumentUrl(doc);
        if (urlErr) throw urlErr;
        return url;
      } catch (err) {
        console.warn('[useAthleteDocuments] Failed to get document URL:', err);
        return null;
      }
    },
    []
  );

  // ============================================
  // REVIEW (approve / reject)
  // ============================================

  const reviewDocument = useCallback(
    async (docId: string, status: 'approved' | 'rejected', notes?: string): Promise<boolean> => {
      setError(null);

      try {
        const { error: reviewErr } = await AthleteDocumentService.reviewDocument(docId, status, notes);
        if (reviewErr) throw reviewErr;
        // Refetch to reflect the updated review status
        await fetchDocuments();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao revisar documento.';
        setError(message);
        return false;
      }
    },
    [fetchDocuments]
  );

  // ============================================
  // DELETE (optimistic)
  // ============================================

  const deleteDocument = useCallback(
    async (docId: string): Promise<boolean> => {
      setError(null);

      // Optimistic removal
      const previousDocuments = documents;
      setDocuments(prev => prev.filter(d => d.id !== docId));

      try {
        const { error: delErr } = await AthleteDocumentService.deleteDocument(docId);
        if (delErr) throw delErr;
        return true;
      } catch (err) {
        // Rollback on failure
        setDocuments(previousDocuments);
        const message = err instanceof Error ? err.message : 'Erro ao excluir documento.';
        setError(message);
        return false;
      }
    },
    [documents]
  );

  // ============================================
  // REFETCH (public)
  // ============================================

  const refetch = useCallback(async () => {
    await fetchDocuments();
  }, [fetchDocuments]);

  // ============================================
  // RETURN
  // ============================================

  return {
    documents,
    isLoading,
    error,
    isUploading,
    uploadDocument,
    getDocumentUrl,
    reviewDocument,
    deleteDocument,
    refetch,
  };
}
