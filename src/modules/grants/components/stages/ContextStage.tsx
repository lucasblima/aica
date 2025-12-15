/**
 * ContextStage - Stage 1: PDF Upload and Processing
 * Handles edital PDF upload and text extraction
 */

import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  UploadCloud,
  FileText,
  Check,
  Loader2,
  Trash2,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { StageDependencyHint } from '../shared/StageDependencyHint';

export const ContextStage: React.FC = () => {
  const { state, dispatch, actions } = useWorkspace();
  const { pdfUpload } = state;
  const [isDragging, setIsDragging] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      handleFileSelected(file);
    }
  }, []);

  const handleFileSelected = async (file: File) => {
    dispatch({ type: 'UPDATE_PDF', payload: { file, processingStatus: 'uploading' } });

    try {
      // Import the PDF service dynamically
      const { processEditalPDF } = await import('../../services/pdfService');

      dispatch({ type: 'UPDATE_PDF', payload: { processingStatus: 'extracting' } });

      const result = await processEditalPDF(file);

      dispatch({
        type: 'UPDATE_PDF',
        payload: {
          path: result.path,
          textContent: result.text,
          processingStatus: 'done',
          error: null,
        },
      });
    } catch (error) {
      console.error('[ContextStage] PDF upload error:', error);
      dispatch({
        type: 'UPDATE_PDF',
        payload: {
          processingStatus: 'error',
          error: error instanceof Error ? error.message : 'Erro ao processar PDF',
        },
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelected(file);
    }
  };

  const handleDelete = async () => {
    const confirmed = confirm('Remover o PDF do edital?');
    if (!confirmed) return;

    try {
      // Import the PDF service dynamically
      const { deleteEditalPDF } = await import('../../services/pdfService');

      if (pdfUpload.path) {
        await deleteEditalPDF(pdfUpload.path);
      }

      dispatch({ type: 'RESET_PDF' });
    } catch (error) {
      console.error('[ContextStage] Delete error:', error);
      alert('Erro ao remover PDF');
    }
  };

  const isUploading = pdfUpload.processingStatus === 'uploading';
  const isExtracting = pdfUpload.processingStatus === 'extracting';
  const isProcessing = isUploading || isExtracting;
  const hasContent = pdfUpload.textContent && pdfUpload.textContent.length > 0;
  const hasError = pdfUpload.processingStatus === 'error';

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div className="ceramic-card p-6 sm:p-8">
        <h3 className="text-lg font-bold text-[#5C554B] mb-2">
          Upload do Edital (PDF)
        </h3>
        <p className="text-sm text-[#948D82] mb-6">
          Faca upload do PDF do edital. Nossa IA extraira automaticamente as perguntas,
          documentos necessarios e cronograma.
        </p>

        {/* Dropzone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            ceramic-tray p-8 sm:p-12 rounded-2xl border-2 border-dashed transition-all
            flex flex-col items-center justify-center text-center
            ${isDragging
              ? 'border-[#D97706] bg-[#D97706]/5'
              : hasContent
                ? 'border-green-400 bg-green-50'
                : hasError
                  ? 'border-red-400 bg-red-50'
                  : 'border-[#948D82]/30 hover:border-[#948D82]/50'
            }
          `}
        >
          {/* Processing State */}
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center"
            >
              <Loader2 className="w-12 h-12 text-[#D97706] animate-spin mb-4" />
              <p className="text-sm font-bold text-[#5C554B]">
                {isUploading ? 'Enviando PDF...' : 'Extraindo texto...'}
              </p>
              <p className="text-xs text-[#948D82] mt-1">
                Isso pode levar alguns segundos
              </p>
            </motion.div>
          )}

          {/* Success State */}
          {!isProcessing && hasContent && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-sm font-bold text-[#5C554B]">
                PDF processado com sucesso!
              </p>
              <p className="text-xs text-[#948D82] mt-1">
                {Math.round((pdfUpload.textContent?.length || 0) / 1000)}k caracteres extraidos
              </p>
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={() => setShowPreview(true)}
                  className="ceramic-concave px-4 py-2 text-xs font-bold text-[#5C554B] hover:scale-95 transition-transform flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Visualizar
                </button>
                <button
                  onClick={handleDelete}
                  className="ceramic-concave px-4 py-2 text-xs font-bold text-red-600 hover:scale-95 transition-transform flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Remover
                </button>
              </div>
            </motion.div>
          )}

          {/* Error State */}
          {!isProcessing && hasError && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center"
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-sm font-bold text-red-600">
                Erro ao processar PDF
              </p>
              <p className="text-xs text-[#948D82] mt-1">
                {pdfUpload.error}
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="ceramic-concave px-6 py-2 mt-4 font-bold text-[#5C554B] hover:scale-95 transition-transform"
              >
                Tentar Novamente
              </button>
            </motion.div>
          )}

          {/* Empty State */}
          {!isProcessing && !hasContent && !hasError && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center"
            >
              <div className="w-16 h-16 bg-[#F0EFE9] rounded-full flex items-center justify-center mb-4">
                <UploadCloud className="w-8 h-8 text-[#5C554B]" />
              </div>
              <p className="text-sm font-bold text-[#5C554B]">
                Arraste o PDF aqui
              </p>
              <p className="text-xs text-[#948D82] mt-1 mb-4">
                ou clique para selecionar
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleInputChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="ceramic-card bg-[#5C554B] text-white px-6 py-3 rounded-full font-bold hover:shadow-lg hover:scale-[0.98] transition-all"
              >
                Selecionar Arquivo
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Extracted Text Preview (collapsed) */}
      {hasContent && !showPreview && (
        <div className="ceramic-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#5C554B]">
              Conteudo Extraido
            </h3>
            <button
              onClick={() => setShowPreview(true)}
              className="text-xs font-bold text-[#D97706] hover:underline"
            >
              Ver completo
            </button>
          </div>
          <div className="ceramic-tray p-4 max-h-40 overflow-hidden relative">
            <pre className="text-xs text-[#948D82] whitespace-pre-wrap font-mono">
              {pdfUpload.textContent?.substring(0, 500)}...
            </pre>
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#F0EFE9] to-transparent" />
          </div>
        </div>
      )}

      {/* Full Preview Modal */}
      {showPreview && pdfUpload.textContent && (
        <div className="ceramic-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#5C554B]">
              Conteudo Completo
            </h3>
            <button
              onClick={() => setShowPreview(false)}
              className="text-xs font-bold text-[#948D82] hover:text-[#5C554B]"
            >
              Minimizar
            </button>
          </div>
          <div className="ceramic-tray p-4 max-h-96 overflow-y-auto">
            <pre className="text-xs text-[#948D82] whitespace-pre-wrap font-mono">
              {pdfUpload.textContent}
            </pre>
          </div>
        </div>
      )}

      {/* Helper hint */}
      {!hasContent && !isProcessing && (
        <StageDependencyHint
          message="Faca upload do PDF do edital para extrair automaticamente as perguntas e cronograma. Voce pode pular esta etapa e adicionar manualmente."
          variant="tip"
        />
      )}
    </div>
  );
};

export default ContextStage;
