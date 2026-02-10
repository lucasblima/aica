/**
 * ContextStage - Stage 1: PDF Upload and Processing
 * Handles edital PDF upload and text extraction
 */

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud,
  FileText,
  Check,
  Loader2,
  Trash2,
  Eye,
  AlertCircle,
  FolderOpen,
  FileSpreadsheet,
  Plus,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { StageDependencyHint } from '../shared/StageDependencyHint';
import { uploadProjectDocument } from '../../services/projectDocumentService';
import { uploadOpportunityDocument } from '../../services/opportunityDocumentService';

import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('Contextstage');

// ============================================
// CONSTANTS
// ============================================

const SUPPORTED_PROJECT_DOCS = [
  { ext: '.pdf', mime: 'application/pdf', label: 'PDF' },
  { ext: '.doc', mime: 'application/msword', label: 'Word (DOC)' },
  { ext: '.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'Word (DOCX)' },
  { ext: '.xls', mime: 'application/vnd.ms-excel', label: 'Excel (XLS)' },
  { ext: '.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', label: 'Excel (XLSX)' },
  { ext: '.txt', mime: 'text/plain', label: 'Texto' },
  { ext: '.csv', mime: 'text/csv', label: 'CSV' },
];

// ============================================
// TYPES
// ============================================

interface ProjectDocFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'processing' | 'done' | 'error';
  error?: string;
}

// ============================================
// COMPONENT
// ============================================

export const ContextStage: React.FC = () => {
  const { state, dispatch } = useWorkspace();
  const { pdfUpload, projectId, opportunityId } = state;
  const [isDragging, setIsDragging] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Opportunity documents state (edital-level documents)
  const [opportunityDocs, setOpportunityDocs] = useState<ProjectDocFile[]>([]);
  const [isOpportunityDocsExpanded, setIsOpportunityDocsExpanded] = useState(true);
  const [isOpportunityDocsDragging, setIsOpportunityDocsDragging] = useState(false);
  const opportunityDocsInputRef = useRef<HTMLInputElement>(null);

  // Project documents state
  const [projectDocs, setProjectDocs] = useState<ProjectDocFile[]>([]);
  const [isProjectDocsExpanded, setIsProjectDocsExpanded] = useState(true);
  const [isProjectDocsDragging, setIsProjectDocsDragging] = useState(false);
  const projectDocsInputRef = useRef<HTMLInputElement>(null);

  // ============================================
  // EDITAL PDF HANDLERS
  // ============================================

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
      // Use server-side processing via Edge Function (Google File Search as single source)
      const { processEdital } = await import('@/services/edgeFunctionService');

      dispatch({ type: 'UPDATE_PDF', payload: { processingStatus: 'extracting' } });

      const result = await processEdital(file);

      dispatch({
        type: 'UPDATE_PDF',
        payload: {
          path: result.gemini_file_name,  // Use gemini file reference
          textContent: result.analyzed_data.raw_text_preview || '',
          processingStatus: 'done',
          error: null,
        },
      });
    } catch (error) {
      log.error('PDF upload error:', error);
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
      // Note: Google File Search files expire automatically after 48 hours
      // No need to explicitly delete them - just reset local state
      dispatch({ type: 'RESET_PDF' });
    } catch (error) {
      log.error('Delete error:', error);
      alert('Erro ao remover PDF');
    }
  };

  // ============================================
  // OPPORTUNITY DOCUMENTS HANDLERS (Edital-level)
  // ============================================

  const handleOpportunityDocsDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsOpportunityDocsDragging(true);
  }, []);

  const handleOpportunityDocsDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsOpportunityDocsDragging(false);
  }, []);

  const handleOpportunityDocsDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsOpportunityDocsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleOpportunityDocsSelected(files);
  }, []);

  const handleOpportunityDocsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      handleOpportunityDocsSelected(files);
    }
  };

  const handleOpportunityDocsSelected = async (files: File[]) => {
    // Filter supported files
    const supportedMimes = SUPPORTED_PROJECT_DOCS.map(d => d.mime);
    const validFiles = files.filter(file => {
      const isSupported = supportedMimes.includes(file.type) ||
        SUPPORTED_PROJECT_DOCS.some(doc => file.name.toLowerCase().endsWith(doc.ext));
      if (!isSupported) {
        log.warn(`File ${file.name} is not supported`);
      }
      return isSupported;
    });

    if (validFiles.length === 0) {
      alert('Nenhum arquivo suportado foi selecionado. Formatos aceitos: PDF, Word, Excel, TXT, CSV');
      return;
    }

    // Create initial file objects
    const newDocs: ProjectDocFile[] = validFiles.map(file => ({
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading',
    }));

    setOpportunityDocs(prev => [...prev, ...newDocs]);

    // Upload each file to opportunity (edital)
    for (const doc of newDocs) {
      try {
        setOpportunityDocs(prev =>
          prev.map(d => d.id === doc.id ? { ...d, status: 'processing' } : d)
        );

        await uploadOpportunityDocument(opportunityId, doc.file);

        setOpportunityDocs(prev =>
          prev.map(d => d.id === doc.id ? { ...d, status: 'done' } : d)
        );
      } catch (error) {
        log.error(`[ContextStage] Error uploading ${doc.name}:`, error);
        setOpportunityDocs(prev =>
          prev.map(d =>
            d.id === doc.id
              ? { ...d, status: 'error', error: error instanceof Error ? error.message : 'Erro ao fazer upload' }
              : d
          )
        );
      }
    }
  };

  const handleRemoveOpportunityDoc = (docId: string) => {
    setOpportunityDocs(prev => prev.filter(d => d.id !== docId));
  };

  // ============================================
  // PROJECT DOCUMENTS HANDLERS
  // ============================================

  const handleProjectDocsDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsProjectDocsDragging(true);
  }, []);

  const handleProjectDocsDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsProjectDocsDragging(false);
  }, []);

  const handleProjectDocsDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsProjectDocsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleProjectDocsSelected(files);
  }, []);

  const handleProjectDocsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      handleProjectDocsSelected(files);
    }
  };

  const handleProjectDocsSelected = async (files: File[]) => {
    // Filter supported files
    const supportedMimes = SUPPORTED_PROJECT_DOCS.map(d => d.mime);
    const validFiles = files.filter(file => {
      const isSupported = supportedMimes.includes(file.type) ||
        SUPPORTED_PROJECT_DOCS.some(doc => file.name.toLowerCase().endsWith(doc.ext));
      if (!isSupported) {
        log.warn(`File ${file.name} is not supported`);
      }
      return isSupported;
    });

    if (validFiles.length === 0) {
      alert('Nenhum arquivo suportado foi selecionado. Formatos aceitos: PDF, Word, Excel, TXT');
      return;
    }

    // Create initial file objects
    const newDocs: ProjectDocFile[] = validFiles.map(file => ({
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading',
    }));

    setProjectDocs(prev => [...prev, ...newDocs]);

    // Upload each file
    for (const doc of newDocs) {
      try {
        setProjectDocs(prev =>
          prev.map(d => d.id === doc.id ? { ...d, status: 'processing' } : d)
        );

        await uploadProjectDocument(projectId, doc.file);

        setProjectDocs(prev =>
          prev.map(d => d.id === doc.id ? { ...d, status: 'done' } : d)
        );
      } catch (error) {
        log.error(`[ContextStage] Error uploading ${doc.name}:`, error);
        setProjectDocs(prev =>
          prev.map(d =>
            d.id === doc.id
              ? { ...d, status: 'error', error: error instanceof Error ? error.message : 'Erro ao fazer upload' }
              : d
          )
        );
      }
    }
  };

  const handleRemoveProjectDoc = (docId: string) => {
    setProjectDocs(prev => prev.filter(d => d.id !== docId));
  };

  // ============================================
  // HELPERS
  // ============================================

  const getFileIcon = (fileName: string) => {
    const ext = fileName.toLowerCase().split('.').pop();
    if (ext === 'xls' || ext === 'xlsx') return FileSpreadsheet;
    return FileText;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const isUploading = pdfUpload.processingStatus === 'uploading';
  const isExtracting = pdfUpload.processingStatus === 'extracting';
  const isProcessing = isUploading || isExtracting;
  const hasContent = pdfUpload.textContent && pdfUpload.textContent.length > 0;
  const hasError = pdfUpload.processingStatus === 'error';

  return (
    <div className="space-y-6">
      {/* Upload Zone - Edital PDF */}
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
                ? 'border-ceramic-success bg-ceramic-success-bg'
                : hasError
                  ? 'border-ceramic-error bg-ceramic-error-bg'
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
              <div className="w-16 h-16 bg-ceramic-success-bg rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-ceramic-success" />
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
                  className="ceramic-concave px-4 py-2 text-xs font-bold text-ceramic-error hover:scale-95 transition-transform flex items-center gap-2"
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
              <div className="w-16 h-16 bg-ceramic-error-bg rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-ceramic-error" />
              </div>
              <p className="text-sm font-bold text-ceramic-error">
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

      {/* Opportunity Documents Section - COLLAPSIBLE (Edital-level) */}
      <div className="ceramic-card p-6 sm:p-8 border-2 border-ceramic-border">
        {/* Header with collapse toggle */}
        <div
          className="flex items-center justify-between cursor-pointer mb-4"
          onClick={() => setIsOpportunityDocsExpanded(!isOpportunityDocsExpanded)}
        >
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-ceramic-info" />
            <div>
              <h3 className="text-lg font-bold text-[#5C554B] flex items-center gap-2">
                Documentos Adicionais do Edital
                <span className="ceramic-concave px-2 py-0.5 text-[10px] font-bold text-ceramic-info">
                  COMPARTILHADO
                </span>
              </h3>
              <p className="text-xs text-[#948D82]">
                Regulamentos, anexos, tabelas de critérios (compartilhados entre todos os projetos)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {opportunityDocs.length > 0 && (
              <span className="ceramic-concave px-3 py-1 text-xs font-bold text-ceramic-info">
                {opportunityDocs.length} {opportunityDocs.length === 1 ? 'arquivo' : 'arquivos'}
              </span>
            )}
            {isOpportunityDocsExpanded ? (
              <ChevronUp className="w-5 h-5 text-[#948D82]" />
            ) : (
              <ChevronDown className="w-5 h-5 text-[#948D82]" />
            )}
          </div>
        </div>

        <AnimatePresence>
          {isOpportunityDocsExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-4">
                {/* Dropzone for opportunity documents */}
                <div
                  onDragOver={handleOpportunityDocsDragOver}
                  onDragLeave={handleOpportunityDocsDragLeave}
                  onDrop={handleOpportunityDocsDrop}
                  className={`
                    ceramic-tray p-6 rounded-xl border-2 border-dashed transition-all
                    flex flex-col items-center justify-center text-center
                    ${isOpportunityDocsDragging
                      ? 'border-ceramic-info bg-ceramic-info-bg'
                      : 'border-ceramic-info/30 hover:border-ceramic-info/50'
                    }
                  `}
                >
                  <Plus className="w-8 h-8 text-ceramic-info mb-2" />
                  <p className="text-sm font-bold text-[#5C554B] mb-1">
                    Adicionar documentos do edital
                  </p>
                  <p className="text-xs text-[#948D82] mb-3">
                    PDF, Word, Excel, TXT, CSV
                  </p>
                  <input
                    ref={opportunityDocsInputRef}
                    type="file"
                    multiple
                    accept={SUPPORTED_PROJECT_DOCS.map(d => d.ext).join(',')}
                    onChange={handleOpportunityDocsInputChange}
                    className="hidden"
                  />
                  <button
                    onClick={() => opportunityDocsInputRef.current?.click()}
                    className="ceramic-concave px-4 py-2 text-xs font-bold text-ceramic-info hover:scale-95 transition-transform"
                  >
                    Selecionar Arquivos
                  </button>
                </div>

                {/* File list */}
                {opportunityDocs.length > 0 && (
                  <div className="space-y-2">
                    <AnimatePresence>
                      {opportunityDocs.map(doc => {
                        const FileIcon = getFileIcon(doc.name);
                        return (
                          <motion.div
                            key={doc.id}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="ceramic-tray p-4 rounded-lg flex items-center justify-between gap-4 border border-ceramic-info/20"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <FileIcon className="w-5 h-5 text-ceramic-info flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-[#5C554B] truncate">
                                  {doc.name}
                                </p>
                                <p className="text-xs text-[#948D82]">
                                  {formatFileSize(doc.size)}
                                </p>
                              </div>
                            </div>

                            {/* Status indicator */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {doc.status === 'uploading' && (
                                <div className="flex items-center gap-2">
                                  <Loader2 className="w-4 h-4 text-[#948D82] animate-spin" />
                                  <span className="text-xs text-[#948D82]">Enviando...</span>
                                </div>
                              )}
                              {doc.status === 'processing' && (
                                <div className="flex items-center gap-2">
                                  <Loader2 className="w-4 h-4 text-ceramic-info animate-spin" />
                                  <span className="text-xs text-ceramic-info">Processando...</span>
                                </div>
                              )}
                              {doc.status === 'done' && (
                                <div className="flex items-center gap-2">
                                  <Check className="w-4 h-4 text-ceramic-success" />
                                  <span className="text-xs text-ceramic-success">Concluido</span>
                                </div>
                              )}
                              {doc.status === 'error' && (
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4 text-ceramic-error" />
                                  <span className="text-xs text-ceramic-error" title={doc.error}>
                                    Erro
                                  </span>
                                </div>
                              )}

                              {/* Remove button */}
                              <button
                                onClick={() => handleRemoveOpportunityDoc(doc.id)}
                                className="ceramic-concave p-2 hover:scale-95 transition-transform"
                                title="Remover arquivo"
                              >
                                <X className="w-4 h-4 text-[#948D82]" />
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Project Documents Section - COLLAPSIBLE */}
      <div className="ceramic-card p-6 sm:p-8">
        {/* Header with collapse toggle */}
        <div
          className="flex items-center justify-between cursor-pointer mb-4"
          onClick={() => setIsProjectDocsExpanded(!isProjectDocsExpanded)}
        >
          <div className="flex items-center gap-3">
            <FolderOpen className="w-5 h-5 text-[#D97706]" />
            <div>
              <h3 className="text-lg font-bold text-[#5C554B]">
                Documentos do Projeto
              </h3>
              <p className="text-xs text-[#948D82]">
                Cronogramas, planilhas, documentos de apoio
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {projectDocs.length > 0 && (
              <span className="ceramic-concave px-3 py-1 text-xs font-bold text-[#D97706]">
                {projectDocs.length} {projectDocs.length === 1 ? 'arquivo' : 'arquivos'}
              </span>
            )}
            {isProjectDocsExpanded ? (
              <ChevronUp className="w-5 h-5 text-[#948D82]" />
            ) : (
              <ChevronDown className="w-5 h-5 text-[#948D82]" />
            )}
          </div>
        </div>

        <AnimatePresence>
          {isProjectDocsExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-4">
                {/* Dropzone for project documents */}
                <div
                  onDragOver={handleProjectDocsDragOver}
                  onDragLeave={handleProjectDocsDragLeave}
                  onDrop={handleProjectDocsDrop}
                  className={`
                    ceramic-tray p-6 rounded-xl border-2 border-dashed transition-all
                    flex flex-col items-center justify-center text-center
                    ${isProjectDocsDragging
                      ? 'border-[#D97706] bg-[#D97706]/5'
                      : 'border-[#948D82]/30 hover:border-[#948D82]/50'
                    }
                  `}
                >
                  <Plus className="w-8 h-8 text-[#948D82] mb-2" />
                  <p className="text-sm font-bold text-[#5C554B] mb-1">
                    Adicionar documentos
                  </p>
                  <p className="text-xs text-[#948D82] mb-3">
                    PDF, Word, Excel, TXT
                  </p>
                  <input
                    ref={projectDocsInputRef}
                    type="file"
                    multiple
                    accept={SUPPORTED_PROJECT_DOCS.map(d => d.ext).join(',')}
                    onChange={handleProjectDocsInputChange}
                    className="hidden"
                  />
                  <button
                    onClick={() => projectDocsInputRef.current?.click()}
                    className="ceramic-concave px-4 py-2 text-xs font-bold text-[#5C554B] hover:scale-95 transition-transform"
                  >
                    Selecionar Arquivos
                  </button>
                </div>

                {/* File list */}
                {projectDocs.length > 0 && (
                  <div className="space-y-2">
                    <AnimatePresence>
                      {projectDocs.map(doc => {
                        const FileIcon = getFileIcon(doc.name);
                        return (
                          <motion.div
                            key={doc.id}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="ceramic-tray p-4 rounded-lg flex items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <FileIcon className="w-5 h-5 text-[#D97706] flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-[#5C554B] truncate">
                                  {doc.name}
                                </p>
                                <p className="text-xs text-[#948D82]">
                                  {formatFileSize(doc.size)}
                                </p>
                              </div>
                            </div>

                            {/* Status indicator */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {doc.status === 'uploading' && (
                                <div className="flex items-center gap-2">
                                  <Loader2 className="w-4 h-4 text-[#948D82] animate-spin" />
                                  <span className="text-xs text-[#948D82]">Enviando...</span>
                                </div>
                              )}
                              {doc.status === 'processing' && (
                                <div className="flex items-center gap-2">
                                  <Loader2 className="w-4 h-4 text-[#D97706] animate-spin" />
                                  <span className="text-xs text-[#D97706]">Processando...</span>
                                </div>
                              )}
                              {doc.status === 'done' && (
                                <div className="flex items-center gap-2">
                                  <Check className="w-4 h-4 text-ceramic-success" />
                                  <span className="text-xs text-ceramic-success">Concluido</span>
                                </div>
                              )}
                              {doc.status === 'error' && (
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4 text-ceramic-error" />
                                  <span className="text-xs text-ceramic-error" title={doc.error}>
                                    Erro
                                  </span>
                                </div>
                              )}

                              {/* Remove button */}
                              <button
                                onClick={() => handleRemoveProjectDoc(doc.id)}
                                className="ceramic-concave p-2 hover:scale-95 transition-transform"
                                title="Remover arquivo"
                              >
                                <X className="w-4 h-4 text-[#948D82]" />
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
