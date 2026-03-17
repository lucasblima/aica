/**
 * usePresentationPdf Hook
 * Task 8 — Wire module-specific items (Batch 4)
 *
 * Manages the state and API call for generating presentation PDFs
 * via the generate-presentation-pdf Edge Function.
 * Returns the signed PDF URL on success.
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('usePresentationPdf');

export interface UsePresentationPdfOptions {
  /** Deck ID to generate PDF for */
  deckId: string;
}

export interface UsePresentationPdfReturn {
  /** Trigger PDF generation */
  generatePdf: (template?: string) => Promise<string | null>;
  /** Whether PDF is currently being generated */
  isGenerating: boolean;
  /** Signed URL for the generated PDF */
  pdfUrl: string | null;
  /** Error message if generation failed */
  error: string | null;
  /** Reset state */
  reset: () => void;
}

export function usePresentationPdf({ deckId }: UsePresentationPdfOptions): UsePresentationPdfReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsGenerating(false);
    setPdfUrl(null);
    setError(null);
  }, []);

  const generatePdf = useCallback(async (_template?: string): Promise<string | null> => {
    reset();
    setIsGenerating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Você precisa estar logado para gerar o PDF');
      }

      const { data, error: fnError } = await supabase.functions.invoke(
        'generate-presentation-pdf',
        {
          body: {
            deck_id: deckId,
            user_id: user.id,
          },
        }
      );

      if (fnError) {
        throw new Error(fnError.message || 'Erro ao chamar função de geração de PDF');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Falha ao gerar o PDF');
      }

      const url = data.pdf_url as string | null;
      setPdfUrl(url);
      log.info('PDF generated successfully', { deckId, totalSlides: data.total_slides });

      return url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido ao gerar PDF';
      log.error('generatePdf failed:', err);
      setError(msg);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [deckId, reset]);

  return {
    generatePdf,
    isGenerating,
    pdfUrl,
    error,
    reset,
  };
}

export default usePresentationPdf;
