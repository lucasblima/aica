/**
 * EditalDocumentSection - Gerenciamento do PDF do edital
 *
 * Este componente permite:
 * - Upload de PDF do edital
 * - Visualização do PDF atual
 * - Download do PDF
 * - Exclusão do PDF
 * - Busca semântica no conteúdo do PDF (File Search)
 */

import React, { useState, useRef, useEffect } from 'react';
import { FileText, Upload, Loader2, X, Download, Eye, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/services/supabaseClient';
import { EditalSearchBar, QuickSearchExamples } from './EditalSearchBar';
import { useGrantsFileSearch } from '../hooks/useGrantsFileSearch';
import type { FileSearchResult } from '../../../types/fileSearch';

interface EditalDocumentSectionProps {
  opportunityId: string;
  opportunityTitle: string;
  editalPdfPath?: string;
  editalTextContent?: string;
  onUpload: (file: File) => Promise<void>;
  onDelete: () => Promise<void>;
  defaultCollapsed?: boolean; // NEW: Start collapsed by default to save space
}

export function EditalDocumentSection({
  opportunityId,
  opportunityTitle,
  editalPdfPath,
  editalTextContent,
  onUpload,
  onDelete,
  defaultCollapsed = true // Default to collapsed for space optimization
}: EditalDocumentSectionProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showTextPreview, setShowTextPreview] = useState(false);
  const [showEditalSection, setShowEditalSection] = useState(!defaultCollapsed);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File Search integration
  const [searchResults, setSearchResults] = useState<FileSearchResult[]>([]);
  const {
    searchInEdital,
    hasIndexedDocuments,
    isSearching,
    clearSearchResults,
  } = useGrantsFileSearch({ projectId: opportunityId, autoLoad: true });

  /**
   * Handle PDF upload
   */
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Apenas arquivos PDF são aceitos para o edital.');
      return;
    }

    // Validate file size (max 20MB)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      alert('O arquivo deve ter no máximo 20MB.');
      return;
    }

    try {
      setIsUploading(true);
      await onUpload(file);

      // Clear input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading edital PDF:', error);
      alert('Erro ao fazer upload do PDF. Tente novamente.');
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Handle PDF deletion
   */
  const handleDelete = async () => {
    const confirmed = confirm(
      'Tem certeza que deseja remover o PDF do edital?\n\n' +
      'O PDF é usado como contexto para a IA gerar respostas mais precisas.'
    );

    if (!confirmed) return;

    try {
      setIsDeleting(true);
      await onDelete();
    } catch (error) {
      console.error('Error deleting edital PDF:', error);
      alert('Erro ao deletar o PDF. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Handle semantic search in edital
   */
  const handleSearch = async (query: string) => {
    try {
      const results = await searchInEdital(query, 5);
      setSearchResults(results);
      return results;
    } catch (error) {
      console.error('[EditalDocumentSection] Search error:', error);
      throw error;
    }
  };

  /**
   * Handle clear search
   */
  const handleClearSearch = () => {
    setSearchResults([]);
    clearSearchResults();
  };

  /**
   * Get PDF download URL
   */
  const getPdfUrl = () => {
    if (!editalPdfPath) return null;

    // Construct Supabase Storage URL
    const { data } = supabase.storage
      .from('editais')
      .getPublicUrl(editalPdfPath);

    return data?.publicUrl || null;
  };

  const pdfUrl = getPdfUrl();
  const hasPdf = !!editalPdfPath;

  return (
    <div className="ceramic-card mb-4">
      {/* Collapsible Header */}
      <button
        onClick={() => setShowEditalSection(!showEditalSection)}
        className="w-full p-4 flex items-center justify-between hover:bg-black/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-500" />
          <div className="text-left">
            <h3 className="text-sm font-bold text-ceramic-text-primary">
              PDF do Edital
            </h3>
            {editalTextContent && editalPdfPath && (
              <p className="text-xs text-green-600">
                ✓ Processado ({Math.round(editalTextContent.length / 1000)}k chars)
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick actions when collapsed */}
          {!showEditalSection && hasPdf && pdfUrl && (
            <>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="ceramic-concave p-2 hover:scale-95 transition-all"
                title="Visualizar PDF"
              >
                <Eye className="w-4 h-4 text-ceramic-text-secondary" />
              </a>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="ceramic-concave p-2 hover:scale-95 transition-all"
                title="Baixar PDF"
              >
                <Download className="w-4 h-4 text-ceramic-text-secondary" />
              </a>
            </>
          )}

          {/* Chevron */}
          {showEditalSection ? (
            <ChevronUp className="w-5 h-5 text-ceramic-text-tertiary" />
          ) : (
            <ChevronDown className="w-5 h-5 text-ceramic-text-tertiary" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {showEditalSection && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 space-y-3">
              {/* Upload Button (only show if no PDF) */}
              {!hasPdf && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    disabled={isUploading}
                    className="hidden"
                    id={`edital-pdf-upload-${opportunityId}`}
                  />
                  <label htmlFor={`edital-pdf-upload-${opportunityId}`}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="ceramic-concave px-3 py-2 text-xs font-bold text-ceramic-text-primary hover:scale-95 active:scale-90 disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center gap-2 w-full justify-center"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Upload className="w-3 h-3" />
                          Enviar PDF
                        </>
                      )}
                    </button>
                  </label>
                </>
              )}

              {/* No PDF State */}
              {!hasPdf && (
        <div className="ceramic-tray rounded-lg p-4 flex flex-col items-center justify-center gap-2 min-h-[100px]">
          <div className="flex items-center gap-2 text-ceramic-text-tertiary">
            <AlertCircle className="w-4 h-4" />
            <p className="text-sm">Nenhum PDF enviado</p>
          </div>
          <p className="text-xs text-ceramic-text-tertiary text-center max-w-md">
            O PDF do edital será usado como contexto pela IA ao gerar respostas para todos os projetos deste edital.
          </p>
        </div>
      )}

      {/* PDF Uploaded State */}
      {hasPdf && (
        <div className="space-y-3">
          {/* PDF Info Card */}
          <div className="ceramic-tray rounded-lg p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="ceramic-concave rounded-lg p-2 shrink-0">
                  <FileText className="w-4 h-4 text-purple-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ceramic-text-primary truncate">
                    {editalPdfPath?.split('/').pop() || 'edital.pdf'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-ceramic-text-tertiary">
                      PDF do Edital
                    </span>
                    {editalTextContent && (
                      <span className="text-xs text-green-600 dark:text-green-400">
                        • Conteúdo extraído ({editalTextContent.length.toLocaleString()} caracteres)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Download Button */}
                {pdfUrl && (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ceramic-concave p-2 hover:scale-95 active:scale-90 transition-all"
                    title="Baixar PDF"
                  >
                    <Download className="w-4 h-4 text-ceramic-text-secondary" />
                  </a>
                )}

                {/* View Button */}
                {pdfUrl && (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ceramic-concave p-2 hover:scale-95 active:scale-90 transition-all"
                    title="Visualizar PDF"
                  >
                    <Eye className="w-4 h-4 text-ceramic-text-secondary" />
                  </a>
                )}

                {/* Delete Button */}
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="ceramic-concave p-2 hover:scale-95 active:scale-90 disabled:opacity-50 disabled:hover:scale-100 transition-all"
                  title="Remover PDF"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                  ) : (
                    <X className="w-4 h-4 text-red-500" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Text Preview Toggle */}
          {editalTextContent && (
            <div className="space-y-2">
              <button
                onClick={() => setShowTextPreview(!showTextPreview)}
                className="text-xs text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors flex items-center gap-1"
              >
                <FileText className="w-3 h-3" />
                {showTextPreview ? 'Ocultar' : 'Mostrar'} prévia do texto extraído
              </button>

              <AnimatePresence>
                {showTextPreview && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="ceramic-tray rounded-lg p-3 max-h-[200px] overflow-y-auto">
                      <pre className="text-xs text-ceramic-text-tertiary whitespace-pre-wrap font-mono">
                        {editalTextContent.substring(0, 1000)}
                        {editalTextContent.length > 1000 && '\n\n... (texto completo será usado pela IA)'}
                      </pre>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* File Search Integration */}
      {hasPdf && hasIndexedDocuments() && (
        <div className="mt-4 pt-4 border-t border-ceramic-text-secondary/10">
          <div className="space-y-4">
            {/* Search Bar */}
            <EditalSearchBar
              onSearch={handleSearch}
              results={searchResults}
              isSearching={isSearching}
              hasDocuments={hasIndexedDocuments()}
              placeholder="Pergunte algo sobre o edital... Ex: Quais são os critérios de avaliação?"
              onClear={handleClearSearch}
            />

            {/* Quick Search Examples */}
            {searchResults.length === 0 && !isSearching && (
              <QuickSearchExamples
                onSelectExample={(example) => handleSearch(example)}
                examples={[
                  'Quais são os critérios de avaliação?',
                  'Qual é o prazo de submissão?',
                  'Quais documentos são obrigatórios?',
                  'Como elaborar o orçamento do projeto?',
                  'Quem pode se candidatar a este edital?',
                ]}
              />
            )}
          </div>
        </div>
      )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
