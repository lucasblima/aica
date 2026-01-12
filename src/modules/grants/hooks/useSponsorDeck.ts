/**
 * Copyright (c) 2024 - Present. Aica Engineering. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * useSponsorDeck - React Hook for Sponsor Deck Generation
 * Issue #98 - Gerador de Deck de Patrocinio
 *
 * Manages the state and API calls for generating PowerPoint presentations
 * for cultural project sponsorship.
 *
 * @module modules/grants/hooks/useSponsorDeck
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/services/supabaseClient';
import type { DeckOptions, GenerateDeckResponse } from '../types/sponsorDeck';

// Edge Function endpoint - uses same Supabase URL as main client
const SUPABASE_FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Hook options
 */
export interface UseSponsorDeckOptions {
  /** ID of the project to generate deck for */
  projectId: string;
}

/**
 * Hook return type
 */
export interface UseSponsorDeckReturn {
  /** Generate the deck with specified template and options */
  generateDeck: (templateId: string, options: DeckOptions) => Promise<void>;
  /** Whether deck is currently being generated */
  isGenerating: boolean;
  /** Generation progress (0-100) */
  progress: number;
  /** Current generation step description */
  progressStep: string;
  /** Download URL for the generated deck (blob URL) */
  downloadUrl: string | null;
  /** Generated filename */
  filename: string | null;
  /** Error message if generation failed */
  error: string | null;
  /** Reset state to initial values */
  reset: () => void;
  /** Download the generated deck */
  download: () => void;
  /** Token usage from last generation */
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  } | null;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Convert base64 string to Blob
 */
function base64ToBlob(base64: string, contentType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
}

/**
 * Trigger file download
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * React hook for managing sponsor deck generation
 *
 * @example
 * ```tsx
 * const { generateDeck, isGenerating, progress, downloadUrl, error, reset, download } = useSponsorDeck({
 *   projectId: 'project-123'
 * });
 *
 * // Generate a deck
 * await generateDeck('professional', {
 *   includeFinancials: true,
 *   language: 'pt-BR'
 * });
 *
 * // Download the result
 * if (downloadUrl) {
 *   download();
 * }
 * ```
 */
export function useSponsorDeck({ projectId }: UseSponsorDeckOptions): UseSponsorDeckReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStep, setProgressStep] = useState('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usageMetadata, setUsageMetadata] = useState<UseSponsorDeckReturn['usageMetadata']>(null);

  // Store blob reference for download
  const blobRef = useRef<Blob | null>(null);

  /**
   * Reset all state to initial values
   */
  const reset = useCallback(() => {
    // Revoke existing blob URL if any
    if (downloadUrl) {
      window.URL.revokeObjectURL(downloadUrl);
    }

    setIsGenerating(false);
    setProgress(0);
    setProgressStep('');
    setDownloadUrl(null);
    setFilename(null);
    setError(null);
    setUsageMetadata(null);
    blobRef.current = null;
  }, [downloadUrl]);

  /**
   * Download the generated deck
   */
  const download = useCallback(() => {
    if (blobRef.current && filename) {
      downloadBlob(blobRef.current, filename);
    }
  }, [filename]);

  /**
   * Generate the sponsor deck
   */
  const generateDeck = useCallback(
    async (templateId: string, options: DeckOptions): Promise<void> => {
      // Reset previous state
      reset();
      setIsGenerating(true);

      try {
        // Step 1: Validate input
        setProgress(10);
        setProgressStep('Validando dados do projeto...');

        if (!projectId) {
          throw new Error('ID do projeto e obrigatorio');
        }

        // Step 2: Get session for authorization
        setProgress(20);
        setProgressStep('Verificando autorizacao...');

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          throw new Error('Voce precisa estar logado para gerar o deck');
        }

        // Step 3: Call edge function
        setProgress(30);
        setProgressStep('Gerando conteudo com IA...');

        const response = await fetch(
          `${SUPABASE_FUNCTIONS_URL}/generate-sponsor-deck`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              projectId,
              templateId,
              options,
            }),
          }
        );

        // Step 4: Process response
        setProgress(70);
        setProgressStep('Processando apresentacao...');

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Erro ao gerar deck: ${response.status}`);
        }

        const result: GenerateDeckResponse = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Falha ao gerar a apresentacao');
        }

        if (!result.pptxBase64) {
          throw new Error('Nenhum arquivo gerado');
        }

        // Step 5: Create blob and URL
        setProgress(90);
        setProgressStep('Preparando download...');

        const blob = base64ToBlob(
          result.pptxBase64,
          'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        );

        blobRef.current = blob;
        const url = window.URL.createObjectURL(blob);

        // Step 6: Complete
        setProgress(100);
        setProgressStep('Pronto!');
        setDownloadUrl(url);
        setFilename(result.filename || 'deck-patrocinio.pptx');

        if (result.usageMetadata) {
          setUsageMetadata(result.usageMetadata);
        }
      } catch (err) {
        console.error('[useSponsorDeck] Generation failed:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido ao gerar deck');
        setProgress(0);
        setProgressStep('');
      } finally {
        setIsGenerating(false);
      }
    },
    [projectId, reset]
  );

  return {
    generateDeck,
    isGenerating,
    progress,
    progressStep,
    downloadUrl,
    filename,
    error,
    reset,
    download,
    usageMetadata,
  };
}

export default useSponsorDeck;
