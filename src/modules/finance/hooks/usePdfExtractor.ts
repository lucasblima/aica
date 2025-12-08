import { useState, useCallback } from 'react';
import {
    pdfExtractorService,
    PdfExtractionResult,
    ExtractedStatementListItem
} from '../services/pdfExtractorService';

// =====================================================
// usePdfExtractor Hook
// Hook para gerenciar extração de PDFs via microserviço
// =====================================================

export function usePdfExtractor() {
    const [statements, setStatements] = useState<ExtractedStatementListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<string | null>(null);
    const [serviceAvailable, setServiceAvailable] = useState<boolean | null>(null);

    /**
     * Verifica se o microserviço está disponível
     */
    const checkService = useCallback(async () => {
        const available = await pdfExtractorService.isAvailable();
        setServiceAvailable(available);
        return available;
    }, []);

    /**
     * Carrega lista de extratos processados
     */
    const loadStatements = useCallback(async (limit = 20, offset = 0) => {
        setLoading(true);
        setError(null);
        try {
            const result = await pdfExtractorService.listExtracted(limit, offset);
            setStatements(result.data);
            return result;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao carregar';
            setError(message);
            return { data: [], total: null };
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Faz upload e extração de PDF
     */
    const uploadAndExtract = useCallback(async (file: File): Promise<PdfExtractionResult | null> => {
        setUploading(true);
        setUploadProgress('Enviando PDF...');
        setError(null);

        try {
            setUploadProgress('Processando PDF...');
            const result = await pdfExtractorService.extractAndSave(file);

            if (result.saved_to_db) {
                setUploadProgress('Salvo com sucesso!');
                // Recarregar lista
                await loadStatements();
            } else {
                setUploadProgress('Extração concluída (não salvo)');
            }

            return result;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro no upload';
            setError(message);
            setUploadProgress(null);
            return null;
        } finally {
            setUploading(false);
            setTimeout(() => setUploadProgress(null), 2000);
        }
    }, [loadStatements]);

    /**
     * Preview do PDF sem salvar
     */
    const previewPdf = useCallback(async (file: File): Promise<PdfExtractionResult | null> => {
        setUploading(true);
        setUploadProgress('Processando preview...');
        setError(null);

        try {
            const result = await pdfExtractorService.extractPreview(file);
            setUploadProgress(null);
            return result;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro no preview';
            setError(message);
            return null;
        } finally {
            setUploading(false);
            setUploadProgress(null);
        }
    }, []);

    /**
     * Remove um extrato
     */
    const deleteStatement = useCallback(async (id: string) => {
        try {
            await pdfExtractorService.deleteExtracted(id);
            setStatements(prev => prev.filter(s => s.id !== id));
            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao remover';
            setError(message);
            return false;
        }
    }, []);

    /**
     * Busca detalhes de um extrato
     */
    const getStatement = useCallback(async (id: string) => {
        setLoading(true);
        setError(null);
        try {
            return await pdfExtractorService.getExtractedById(id);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao buscar';
            setError(message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Limpa mensagens de erro
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        // Estado
        statements,
        loading,
        error,
        uploading,
        uploadProgress,
        serviceAvailable,

        // Ações
        checkService,
        loadStatements,
        uploadAndExtract,
        previewPdf,
        deleteStatement,
        getStatement,
        clearError
    };
}

export default usePdfExtractor;
