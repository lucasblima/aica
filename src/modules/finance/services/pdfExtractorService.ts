import { supabase } from '../../../services/supabaseClient';

const PDF_EXTRACTOR_URL = import.meta.env.VITE_PDF_EXTRACTOR_URL || 'http://localhost:8000';

// =====================================================
// Types
// =====================================================

export interface PdfExtractionResult {
    id: string | null;
    markdown: string;
    filename: string;
    pages: number;
    tables_count: number;
    file_hash: string;
    tables: TableData[];
    extracted_at: string;
    saved_to_db: boolean;
}

export interface TableData {
    page: number;
    index: number;
    markdown: string;
    data: string[][];
}

export interface ExtractedStatementListItem {
    id: string;
    file_name: string;
    file_hash: string;
    pages_count: number;
    tables_count: number;
    processing_status: string;
    created_at: string;
}

export interface ExtractedStatement {
    id: string;
    user_id: string;
    file_name: string;
    file_size_bytes: number;
    file_hash: string;
    markdown_content: string;
    raw_text: string | null;
    tables_json: TableData[];
    pages_count: number;
    tables_count: number;
    pdf_metadata: Record<string, string>;
    processing_status: 'pending' | 'processing' | 'completed' | 'failed';
    processing_error: string | null;
    processed_at: string | null;
    statement_period_start: string | null;
    statement_period_end: string | null;
    bank_name: string | null;
    account_number: string | null;
    created_at: string;
    updated_at: string;
}

export interface DuplicateError {
    message: string;
    existing_id: string;
    existing_file: string;
    created_at: string;
}

// =====================================================
// PDF Extractor Service
// Comunicação com microserviço Python para extração
// =====================================================

class PdfExtractorService {
    private async getUserId(): Promise<string> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');
        return user.id;
    }

    private async getHeaders(): Promise<HeadersInit> {
        const userId = await this.getUserId();
        return {
            'X-User-Id': userId
        };
    }

    /**
     * Extrai PDF e salva no banco
     */
    async extractAndSave(file: File): Promise<PdfExtractionResult> {
        const headers = await this.getHeaders();
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${PDF_EXTRACTOR_URL}/extract?save_to_db=true`, {
            method: 'POST',
            headers,
            body: formData
        });

        if (response.status === 409) {
            const error = await response.json() as { detail: DuplicateError };
            throw new Error(`Arquivo duplicado: ${error.detail.message}`);
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
            throw new Error(error.detail || 'Falha ao processar PDF');
        }

        return response.json();
    }

    /**
     * Extrai PDF sem salvar (preview)
     */
    async extractPreview(file: File): Promise<PdfExtractionResult> {
        const headers = await this.getHeaders();
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${PDF_EXTRACTOR_URL}/extract?save_to_db=false`, {
            method: 'POST',
            headers,
            body: formData
        });

        if (!response.ok) {
            throw new Error('Falha ao processar PDF');
        }

        return response.json();
    }

    /**
     * Lista extratos processados via microserviço
     */
    async listExtracted(limit = 20, offset = 0): Promise<{ data: ExtractedStatementListItem[], total: number | null }> {
        const headers = await this.getHeaders();

        const response = await fetch(
            `${PDF_EXTRACTOR_URL}/statements?limit=${limit}&offset=${offset}`,
            { headers }
        );

        if (!response.ok) {
            throw new Error('Falha ao carregar extratos');
        }

        return response.json();
    }

    /**
     * Busca extrato por ID via microserviço
     */
    async getExtractedById(id: string): Promise<ExtractedStatement> {
        const headers = await this.getHeaders();

        const response = await fetch(`${PDF_EXTRACTOR_URL}/statements/${id}`, {
            headers
        });

        if (!response.ok) {
            throw new Error('Extrato não encontrado');
        }

        return response.json();
    }

    /**
     * Remove extrato via microserviço
     */
    async deleteExtracted(id: string): Promise<void> {
        const headers = await this.getHeaders();

        const response = await fetch(`${PDF_EXTRACTOR_URL}/statements/${id}`, {
            method: 'DELETE',
            headers
        });

        if (!response.ok) {
            throw new Error('Falha ao remover extrato');
        }
    }

    /**
     * Verifica se o microserviço está online
     */
    async healthCheck(): Promise<{ status: string; service: string; supabase_configured: boolean } | null> {
        try {
            const response = await fetch(`${PDF_EXTRACTOR_URL}/health`);
            if (response.ok) {
                return response.json();
            }
            return null;
        } catch {
            return null;
        }
    }

    /**
     * Verifica se o serviço está disponível (boolean simples)
     */
    async isAvailable(): Promise<boolean> {
        const health = await this.healthCheck();
        return health?.status === 'healthy';
    }
}

export const pdfExtractorService = new PdfExtractorService();
