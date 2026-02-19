/**
 * UploadedDocumentsManager Component
 * Displays all uploaded PDFs as cards with CRUD operations
 * Helps avoid duplicate uploads and manage file search documents
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  File,
  Calendar,
  HardDrive
} from 'lucide-react';
import {
  listGrantsDocuments,
  deleteFileSearchDocument,
  deleteMultipleDocuments,
  type FileSearchDocument
} from '../services/fileSearchDocumentService';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('UploadedDocumentsManager');

interface UploadedDocumentsManagerProps {
  /** Callback when a document is selected */
  onSelectDocument?: (document: FileSearchDocument) => void;
  /** Whether to show in collapsed mode initially */
  defaultCollapsed?: boolean;
  /** Maximum height before scrolling */
  maxHeight?: string;
}

export const UploadedDocumentsManager: React.FC<UploadedDocumentsManagerProps> = ({
  onSelectDocument,
  defaultCollapsed = true,
  maxHeight = '400px'
}) => {
  const [documents, setDocuments] = useState<FileSearchDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // List only grants documents (filtered by module_type='grants')
      const docs = await listGrantsDocuments();
      log.debug(`Loaded ${docs.length} documents`);
      setDocuments(docs);
    } catch (err) {
      log.error('Error loading documents:', err);
      setError('Erro ao carregar documentos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Tem certeza que deseja deletar este documento?')) return;

    try {
      setIsDeleting(true);
      await deleteFileSearchDocument(documentId);
      setDocuments(prev => prev.filter(d => d.id !== documentId));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(documentId);
        return next;
      });
    } catch (err) {
      log.error('Error deleting document:', err);
      alert('Erro ao deletar documento');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Deletar ${selectedIds.size} documento(s) selecionado(s)?`)) return;

    try {
      setIsDeleting(true);
      await deleteMultipleDocuments(Array.from(selectedIds));
      setDocuments(prev => prev.filter(d => !selectedIds.has(d.id)));
      setSelectedIds(new Set());
    } catch (err) {
      log.error('Error deleting selected documents:', err);
      alert('Erro ao deletar documentos');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelect = (documentId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(documentId)) {
        next.delete(documentId);
      } else {
        next.add(documentId);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === documents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(documents.map(d => d.id)));
    }
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-ceramic-success" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-ceramic-error" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-ceramic-info animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-ceramic-warning" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Indexado';
      case 'failed':
        return 'Falhou';
      case 'processing':
        return 'Processando';
      default:
        return 'Pendente';
    }
  };

  // Stats
  const stats = {
    total: documents.length,
    completed: documents.filter(d => d.indexing_status === 'completed').length,
    failed: documents.filter(d => d.indexing_status === 'failed').length,
    pending: documents.filter(d => d.indexing_status === 'pending' || d.indexing_status === 'processing').length
  };

  return (
    <div className="ceramic-card overflow-hidden">
      {/* Header */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-ceramic-hover transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-ceramic-info" />
          </div>
          <div>
            <h3 className="font-bold text-ceramic-text-primary">
              Documentos Enviados
            </h3>
            <p className="text-xs text-ceramic-text-secondary">
              {stats.total} documento{stats.total !== 1 ? 's' : ''} •{' '}
              <span className="text-ceramic-success">{stats.completed} indexado{stats.completed !== 1 ? 's' : ''}</span>
              {stats.failed > 0 && (
                <span className="text-ceramic-error"> • {stats.failed} falha{stats.failed !== 1 ? 's' : ''}</span>
              )}
              {stats.pending > 0 && (
                <span className="text-ceramic-warning"> • {stats.pending} pendente{stats.pending !== 1 ? 's' : ''}</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              loadDocuments();
            }}
            className="ceramic-concave p-2 hover:scale-105 transition-transform"
            title="Atualizar lista"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 text-ceramic-text-secondary ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          {isCollapsed ? (
            <ChevronDown className="w-5 h-5 text-ceramic-text-secondary" />
          ) : (
            <ChevronUp className="w-5 h-5 text-ceramic-text-secondary" />
          )}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Actions Bar */}
            {documents.length > 0 && (
              <div className="px-4 py-2 border-t border-ceramic-border flex items-center justify-between bg-ceramic-hover/50">
                <label className="flex items-center gap-2 text-sm text-ceramic-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === documents.length && documents.length > 0}
                    onChange={selectAll}
                    className="rounded border-ceramic-border"
                  />
                  Selecionar todos
                </label>

                {selectedIds.size > 0 && (
                  <button
                    onClick={handleDeleteSelected}
                    disabled={isDeleting}
                    className="flex items-center gap-2 px-3 py-1.5 bg-ceramic-error/10 text-ceramic-error rounded-lg hover:bg-ceramic-error/20 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Deletar ({selectedIds.size})
                  </button>
                )}
              </div>
            )}

            {/* Documents List */}
            <div
              className="border-t border-ceramic-border overflow-y-auto"
              style={{ maxHeight }}
            >
              {isLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-ceramic-text-secondary mb-2" />
                  <p className="text-sm text-ceramic-text-secondary">Carregando documentos...</p>
                </div>
              ) : error ? (
                <div className="p-8 text-center">
                  <AlertTriangle className="w-8 h-8 mx-auto text-ceramic-error mb-2" />
                  <p className="text-sm text-ceramic-error">{error}</p>
                  <button
                    onClick={loadDocuments}
                    className="mt-2 text-sm text-ceramic-info hover:underline"
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : documents.length === 0 ? (
                <div className="p-8 text-center">
                  <File className="w-12 h-12 mx-auto text-ceramic-text-tertiary mb-3" />
                  <p className="text-sm text-ceramic-text-secondary">
                    Nenhum documento enviado ainda
                  </p>
                  <p className="text-xs text-ceramic-text-tertiary mt-1">
                    Faça upload de um PDF ao criar um novo edital
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-ceramic-border">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className={`p-4 hover:bg-ceramic-hover/50 transition-colors ${
                        selectedIds.has(doc.id) ? 'bg-ceramic-info-bg' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={selectedIds.has(doc.id)}
                          onChange={() => toggleSelect(doc.id)}
                          className="mt-1 rounded border-ceramic-border"
                        />

                        {/* Icon */}
                        <div className="ceramic-concave w-10 h-10 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-ceramic-error" />
                        </div>

                        {/* Info */}
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => onSelectDocument?.(doc)}
                        >
                          <p className="font-medium text-ceramic-text-primary truncate">
                            {doc.original_filename}
                          </p>

                          <div className="flex items-center gap-4 mt-1 text-xs text-ceramic-text-secondary flex-wrap">
                            {/* Status */}
                            <span className="flex items-center gap-1">
                              {getStatusIcon(doc.indexing_status)}
                              {getStatusLabel(doc.indexing_status)}
                            </span>

                            {/* Size */}
                            <span className="flex items-center gap-1">
                              <HardDrive className="w-3 h-3" />
                              {formatFileSize(doc.file_size_bytes)}
                            </span>

                            {/* Date */}
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(doc.created_at)}
                            </span>
                          </div>

                          {/* Gemini file name (for debugging) */}
                          <p className="text-[10px] text-ceramic-text-tertiary mt-1 font-mono truncate">
                            {doc.gemini_file_name}
                          </p>
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(doc.id);
                          }}
                          disabled={isDeleting}
                          className="ceramic-concave p-2 hover:scale-105 transition-transform flex-shrink-0 disabled:opacity-50"
                          title="Deletar documento"
                        >
                          <Trash2 className="w-4 h-4 text-ceramic-error" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UploadedDocumentsManager;
