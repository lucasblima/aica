/**
 * DocumentList Component
 * Issue #114 - Lista de documentos processados
 *
 * @module modules/grants/components/documents/DocumentList
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Presentation,
  FileSpreadsheet,
  Image,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import type { ProcessedDocument } from './DocumentUploader';

const FILE_TYPE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  'application/pdf': FileText,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': Presentation,
  'application/vnd.ms-powerpoint': Presentation,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': FileSpreadsheet,
  'application/msword': FileSpreadsheet,
  'image/jpeg': Image,
  'image/png': Image,
  'image/webp': Image,
};

const STATUS_CONFIG: Record<
  string,
  { icon: React.FC<{ className?: string }>; color: string; bgColor: string }
> = {
  pending: { icon: Clock, color: 'text-ceramic-warning', bgColor: 'bg-ceramic-warning/10' },
  processing: { icon: Loader2, color: 'text-ceramic-info', bgColor: 'bg-ceramic-info-bg' },
  completed: { icon: CheckCircle, color: 'text-ceramic-success', bgColor: 'bg-ceramic-success-bg' },
  failed: { icon: AlertCircle, color: 'text-ceramic-error', bgColor: 'bg-ceramic-error-bg' },
};

const DETECTED_TYPE_LABELS: Record<string, string> = {
  projeto_rouanet: 'Rouanet',
  projeto_proac: 'ProAC',
  estatuto_social: 'Estatuto',
  relatorio_execucao: 'Relatório',
  apresentacao_institucional: 'Apresentação',
  orcamento: 'Orçamento',
  contrato: 'Contrato',
  outro: 'Outro',
};

export interface DocumentListProps {
  documents: ProcessedDocument[];
  loading?: boolean;
  onDocumentClick?: (document: ProcessedDocument) => void;
  emptyMessage?: string;
  className?: string;
}

export function DocumentList({
  documents,
  loading = false,
  onDocumentClick,
  emptyMessage = 'Nenhum documento processado',
  className = '',
}: DocumentListProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Hoje, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (diffDays === 1) {
      return `Ontem`;
    }
    if (diffDays < 7) {
      return `${diffDays} dias atrás`;
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-ceramic-base rounded-lg border animate-pulse">
            <div className="w-10 h-10 bg-ceramic-cool rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-ceramic-cool rounded w-3/4" />
              <div className="h-3 bg-ceramic-cool rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <FolderOpen className="w-12 h-12 mx-auto mb-4 text-ceramic-text-secondary" />
        <p className="text-ceramic-text-secondary">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {documents.map((doc, index) => {
        const FileIcon = FILE_TYPE_ICONS[doc.mime_type] || FileText;
        const statusConfig = STATUS_CONFIG[doc.processing_status] || STATUS_CONFIG.pending;
        const StatusIcon = statusConfig.icon;

        return (
          <motion.div
            key={doc.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`
              flex items-center gap-4 p-4 bg-ceramic-base rounded-lg border
              hover:border-ceramic-border hover:shadow-sm transition-all
              ${onDocumentClick ? 'cursor-pointer' : ''}
            `}
            onClick={() => onDocumentClick?.(doc)}
          >
            {/* File Icon */}
            <div className={`p-2 rounded-lg ${statusConfig.bgColor}`}>
              <FileIcon className={`w-5 h-5 ${statusConfig.color}`} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-ceramic-text-primary truncate">{doc.original_name}</p>
              <div className="flex items-center gap-2 mt-1">
                <StatusIcon
                  className={`w-3 h-3 ${statusConfig.color} ${
                    doc.processing_status === 'processing' ? 'animate-spin' : ''
                  }`}
                />
                {doc.detected_type && (
                  <>
                    <span className="text-xs px-1.5 py-0.5 bg-ceramic-info-bg text-ceramic-info rounded">
                      {DETECTED_TYPE_LABELS[doc.detected_type] || doc.detected_type}
                    </span>
                    <span className="text-xs text-ceramic-text-secondary">•</span>
                  </>
                )}
                <span className="text-xs text-ceramic-text-secondary">{formatFileSize(doc.size_bytes)}</span>
              </div>
            </div>

            {/* Confidence */}
            {doc.confidence && doc.processing_status === 'completed' && (
              <div className="text-right">
                <p className="text-sm font-medium text-ceramic-text-primary">
                  {Math.round(doc.confidence * 100)}%
                </p>
                <p className="text-xs text-ceramic-text-secondary">confiança</p>
              </div>
            )}

            {/* Date */}
            <div className="text-right">
              <p className="text-xs text-ceramic-text-secondary">{formatDate(doc.created_at)}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export default DocumentList;
