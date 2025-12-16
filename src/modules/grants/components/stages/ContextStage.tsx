/**
 * ContextStage - Stage 1: PDF Upload and Context Documents
 *
 * Separação clara entre:
 * 1. CONTEXTO DO EDITAL (Compartilhado) - Documentos do edital, disponíveis para todos os projetos
 * 2. CONTEXTO DO PROJETO (Específico) - Documentos específicos deste projeto
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  BookOpen,
  Briefcase,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { StageDependencyHint } from '../shared/StageDependencyHint';
import { uploadProjectDocument, listProjectDocuments, deleteProjectDocument } from '../../services/projectDocumentService';
import { uploadOpportunityDocument, listOpportunityDocuments, deleteOpportunityDocument } from '../../services/opportunityDocumentService';
import type { ProjectDocument, OpportunityDocument } from '../../types';

// ============================================
// CONSTANTS
// ============================================

const SUPPORTED_DOCS = [
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

interface DocFile {
  id: string;
  file?: File;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'processing' | 'done' | 'error';
  error?: string;
  dbId?: string; // ID from database after successful upload
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

  // Edital documents state (opportunity level - shared)
  const [editalDocs, setEditalDocs] = useState<DocFile[]>([]);
  const [isEditalDocsExpanded, setIsEditalDocsExpanded] = useState(true);
  const [isEditalDocsDragging, setIsEditalDocsDragging] = useState(false);
  const editalDocsInputRef = useRef<HTMLInputElement>(null);
  const [loadingEditalDocs, setLoadingEditalDocs] = useState(false);

  // Project documents state (project level - specific)
  const [projectDocs, setProjectDocs] = useState<DocFile[]>([]);
  const [isProjectDocsExpanded, setIsProjectDocsExpanded] = useState(true);
  const [isProjectDocsDragging, setIsProjectDocsDragging] = useState(false);
  const projectDocsInputRef = useRef<HTMLInputElement>(null);
  const [loadingProjectDocs, setLoadingProjectDocs] = useState(false);

  // ============================================
  // LOAD EXISTING DOCUMENTS ON MOUNT
  // ============================================

  useEffect(() => {
    const loadDocuments = async () => {
      // Load edital documents
      if (opportunityId) {
        setLoadingEditalDocs(true);
        try {
          const docs = await listOpportunityDocuments(opportunityId);
          setEditalDocs(docs.map(doc => ({
            id: doc.id,
            name: doc.file_name,
            size: doc.file_size_bytes || 0,
            type: doc.document_type,
            status: 'done' as const,
            dbId: doc.id,
          })));
        } catch (error) {
          console.error('[ContextStage] Error loading edital documents:', error);
        } finally {
          setLoadingEditalDocs(false);
        }
      }

      // Load project documents
      if (projectId) {
        setLoadingProjectDocs(true);
        try {
          const docs = await listProjectDocuments(projectId);
          setProjectDocs(docs.map(doc => ({
            id: doc.id,
            name: doc.file_name,
            size: doc.file_size_bytes || 0,
            type: doc.document_type,
            status: 'done' as const,
            dbId: doc.id,
          })));
        } catch (error) {
          console.error('[ContextStage] Error loading project documents:', error);
        } finally {
          setLoadingProjectDocs(false);
        }
      }
    };

    loadDocuments();
  }, [opportunityId, projectId]);

  // ============================================
  // EDITAL PDF HANDLERS (Main PDF)
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

  // ============================================
  // EDITAL DOCUMENTS HANDLERS (Opportunity Level)
  // ============================================

  const handleEditalDocsDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsEditalDocsDragging(true);
  }, []);

  const handleEditalDocsDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsEditalDocsDragging(false);
  }, []);

  const handleEditalDocsDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsEditalDocsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleEditalDocsSelected(files);
  }, [opportunityId]);

  const handleEditalDocsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      handleEditalDocsSelected(files);
    }
  };

  const handleEditalDocsSelected = async (files: File[]) => {
    const validFiles = filterValidFiles(files);
    if (validFiles.length === 0) {
      alert('Nenhum arquivo suportado foi selecionado. Formatos aceitos: PDF, Word, Excel, TXT, CSV');
      return;
    }

    const newDocs: DocFile[] = validFiles.map(file => ({
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading',
    }));

    setEditalDocs(prev => [...prev, ...newDocs]);

    for (const doc of newDocs) {
      try {
        setEditalDocs(prev =>
          prev.map(d => d.id === doc.id ? { ...d, status: 'processing' } : d)
        );

        const uploaded = await uploadOpportunityDocument(opportunityId, doc.file!);

        setEditalDocs(prev =>
          prev.map(d => d.id === doc.id ? { ...d, status: 'done', dbId: uploaded.id } : d)
        );
      } catch (error) {
        console.error(`[ContextStage] Error uploading edital doc ${doc.name}:`, error);
        setEditalDocs(prev =>
          prev.map(d =>
            d.id === doc.id
              ? { ...d, status: 'error', error: error instanceof Error ? error.message : 'Erro ao fazer upload' }
              : d
          )
        );
      }
    }
  };

  const handleRemoveEditalDoc = async (doc: DocFile) => {
    if (doc.dbId) {
      try {
        await deleteOpportunityDocument(doc.dbId);
      } catch (error) {
        console.error('[ContextStage] Error deleting edital doc:', error);
        alert('Erro ao remover documento');
        return;
      }
    }
    setEditalDocs(prev => prev.filter(d => d.id !== doc.id));
  };

  // ============================================
  // PROJECT DOCUMENTS HANDLERS (Project Level)
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
  }, [projectId]);

  const handleProjectDocsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      handleProjectDocsSelected(files);
    }
  };

  const handleProjectDocsSelected = async (files: File[]) => {
    const validFiles = filterValidFiles(files);
    if (validFiles.length === 0) {
      alert('Nenhum arquivo suportado foi selecionado. Formatos aceitos: PDF, Word, Excel, TXT, CSV');
      return;
    }

    const newDocs: DocFile[] = validFiles.map(file => ({
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading',
    }));

    setProjectDocs(prev => [...prev, ...newDocs]);

    for (const doc of newDocs) {
      try {
        setProjectDocs(prev =>
          prev.map(d => d.id === doc.id ? { ...d, status: 'processing' } : d)
        );

        const uploaded = await uploadProjectDocument(projectId, doc.file!);

        setProjectDocs(prev =>
          prev.map(d => d.id === doc.id ? { ...d, status: 'done', dbId: uploaded.id } : d)
        );
      } catch (error) {
        console.error(`[ContextStage] Error uploading project doc ${doc.name}:`, error);
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

  const handleRemoveProjectDoc = async (doc: DocFile) => {
    if (doc.dbId) {
      try {
        await deleteProjectDocument(doc.dbId);
      } catch (error) {
        console.error('[ContextStage] Error deleting project doc:', error);
        alert('Erro ao remover documento');
        return;
      }
    }
    setProjectDocs(prev => prev.filter(d => d.id !== doc.id));
  };

  // ============================================
  // HELPERS
  // ============================================

  const filterValidFiles = (files: File[]): File[] => {
    const supportedMimes = SUPPORTED_DOCS.map(d => d.mime);
    return files.filter(file => {
      const isSupported = supportedMimes.includes(file.type) ||
        SUPPORTED_DOCS.some(doc => file.name.toLowerCase().endsWith(doc.ext));
      if (!isSupported) {
        console.warn(`File ${file.name} is not supported`);
      }
      return isSupported;
    });
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.toLowerCase().split('.').pop();
    if (ext === 'xls' || ext === 'xlsx' || ext === 'csv') return FileSpreadsheet;
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

  // ============================================
  // DOCUMENT LIST COMPONENT
  // ============================================

  const DocumentList: React.FC<{
    docs: DocFile[];
    onRemove: (doc: DocFile) => void;
    loading?: boolean;
  }> = ({ docs, onRemove, loading }) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="w-5 h-5 text-[#948D82] animate-spin" />
          <span className="ml-2 text-sm text-[#948D82]">Carregando documentos...</span>
        </div>
      );
    }

    if (docs.length === 0) return null;

    return (
      <div className="space-y-2 mt-4">
        <AnimatePresence>
          {docs.map(doc => {
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
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-green-600">Concluido</span>
                    </div>
                  )}
                  {doc.status === 'error' && (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span className="text-xs text-red-600" title={doc.error}>
                        Erro
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => onRemove(doc)}
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
    );
  };

  return (
    <div className="space-y-6">
      {/* ============================================
          SEÇÃO 1: CONTEXTO DO EDITAL (COMPARTILHADO)
          ============================================ */}
      <div className="ceramic-card p-6 sm:p-8 border-l-4 border-[#D97706]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#D97706]/10 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-[#D97706]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#5C554B]">
              Contexto do Edital
            </h2>
            <p className="text-xs text-[#948D82]">
              Documentos compartilhados entre todos os projetos deste edital
            </p>
          </div>
        </div>

        {/* Upload Zone - Edital PDF (Principal) */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-[#5C554B] mb-2">
            PDF do Edital (Principal)
          </h3>
          <p className="text-xs text-[#948D82] mb-4">
            Faca upload do PDF do edital. Nossa IA extraira automaticamente as perguntas,
            documentos necessarios e cronograma.
          </p>

          {/* Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              ceramic-tray p-8 sm:p-10 rounded-2xl border-2 border-dashed transition-all
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

        {/* Edital Additional Documents - COLLAPSIBLE */}
        <div className="ceramic-tray p-4 rounded-xl">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setIsEditalDocsExpanded(!isEditalDocsExpanded)}
          >
            <div className="flex items-center gap-3">
              <FolderOpen className="w-5 h-5 text-[#D97706]" />
              <div>
                <h3 className="text-sm font-bold text-[#5C554B]">
                  Documentos Adicionais do Edital
                </h3>
                <p className="text-xs text-[#948D82]">
                  Regulamentos, anexos, tabelas de criterios (compartilhados)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {editalDocs.length > 0 && (
                <span className="ceramic-concave px-3 py-1 text-xs font-bold text-[#D97706]">
                  {editalDocs.length} {editalDocs.length === 1 ? 'arquivo' : 'arquivos'}
                </span>
              )}
              {isEditalDocsExpanded ? (
                <ChevronUp className="w-5 h-5 text-[#948D82]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#948D82]" />
              )}
            </div>
          </div>

          <AnimatePresence>
            {isEditalDocsExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-4">
                  {/* Dropzone for edital documents */}
                  <div
                    onDragOver={handleEditalDocsDragOver}
                    onDragLeave={handleEditalDocsDragLeave}
                    onDrop={handleEditalDocsDrop}
                    className={`
                      ceramic-tray p-6 rounded-xl border-2 border-dashed transition-all
                      flex flex-col items-center justify-center text-center
                      ${isEditalDocsDragging
                        ? 'border-[#D97706] bg-[#D97706]/5'
                        : 'border-[#948D82]/30 hover:border-[#948D82]/50'
                      }
                    `}
                  >
                    <Plus className="w-8 h-8 text-[#948D82] mb-2" />
                    <p className="text-sm font-bold text-[#5C554B] mb-1">
                      Adicionar documentos do edital
                    </p>
                    <p className="text-xs text-[#948D82] mb-3">
                      PDF, Word, Excel, TXT, CSV
                    </p>
                    <input
                      ref={editalDocsInputRef}
                      type="file"
                      multiple
                      accept={SUPPORTED_DOCS.map(d => d.ext).join(',')}
                      onChange={handleEditalDocsInputChange}
                      className="hidden"
                    />
                    <button
                      onClick={() => editalDocsInputRef.current?.click()}
                      className="ceramic-concave px-4 py-2 text-xs font-bold text-[#5C554B] hover:scale-95 transition-transform"
                    >
                      Selecionar Arquivos
                    </button>
                  </div>

                  {/* File list */}
                  <DocumentList
                    docs={editalDocs}
                    onRemove={handleRemoveEditalDoc}
                    loading={loadingEditalDocs}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ============================================
          SEÇÃO 2: CONTEXTO DO PROJETO (ESPECÍFICO)
          ============================================ */}
      <div className="ceramic-card p-6 sm:p-8 border-l-4 border-[#10B981]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#10B981]/10 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-[#10B981]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#5C554B]">
              Contexto do Projeto
            </h2>
            <p className="text-xs text-[#948D82]">
              Documentos especificos deste projeto de inscricao
            </p>
          </div>
        </div>

        {/* Project Documents Section - COLLAPSIBLE */}
        <div className="ceramic-tray p-4 rounded-xl">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setIsProjectDocsExpanded(!isProjectDocsExpanded)}
          >
            <div className="flex items-center gap-3">
              <FolderOpen className="w-5 h-5 text-[#10B981]" />
              <div>
                <h3 className="text-sm font-bold text-[#5C554B]">
                  Documentos do Projeto
                </h3>
                <p className="text-xs text-[#948D82]">
                  Cronogramas, planilhas, descricoes tecnicas
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {projectDocs.length > 0 && (
                <span className="ceramic-concave px-3 py-1 text-xs font-bold text-[#10B981]">
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
                <div className="mt-4">
                  {/* Dropzone for project documents */}
                  <div
                    onDragOver={handleProjectDocsDragOver}
                    onDragLeave={handleProjectDocsDragLeave}
                    onDrop={handleProjectDocsDrop}
                    className={`
                      ceramic-tray p-6 rounded-xl border-2 border-dashed transition-all
                      flex flex-col items-center justify-center text-center
                      ${isProjectDocsDragging
                        ? 'border-[#10B981] bg-[#10B981]/5'
                        : 'border-[#948D82]/30 hover:border-[#948D82]/50'
                      }
                    `}
                  >
                    <Plus className="w-8 h-8 text-[#948D82] mb-2" />
                    <p className="text-sm font-bold text-[#5C554B] mb-1">
                      Adicionar documentos do projeto
                    </p>
                    <p className="text-xs text-[#948D82] mb-3">
                      PDF, Word, Excel, TXT, CSV
                    </p>
                    <input
                      ref={projectDocsInputRef}
                      type="file"
                      multiple
                      accept={SUPPORTED_DOCS.map(d => d.ext).join(',')}
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
                  <DocumentList
                    docs={projectDocs}
                    onRemove={handleRemoveProjectDoc}
                    loading={loadingProjectDocs}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Extracted Text Preview */}
      {hasContent && !showPreview && (
        <div className="ceramic-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#5C554B]">
              Conteudo Extraido do Edital
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
