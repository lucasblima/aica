/**
 * DocumentPreview Component
 * Issue #114 - Visualização de documento processado
 *
 * @module modules/grants/components/documents/DocumentPreview
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  ChevronDown,
  ChevronUp,
  Link2,
  Building2,
  FolderOpen,
  RefreshCw,
  Download,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import type { ProcessedDocument, LinkSuggestion } from './DocumentUploader';

const DETECTED_TYPE_LABELS: Record<string, string> = {
  projeto_rouanet: 'Projeto Rouanet',
  projeto_proac: 'Projeto ProAC',
  estatuto_social: 'Estatuto Social',
  relatorio_execucao: 'Relatório de Execução',
  apresentacao_institucional: 'Apresentação Institucional',
  orcamento: 'Orçamento',
  contrato: 'Contrato',
  outro: 'Outro',
};

const STATUS_CONFIG: Record<
  string,
  { icon: React.FC<{ className?: string }>; color: string; label: string }
> = {
  pending: { icon: Clock, color: 'text-ceramic-warning', label: 'Pendente' },
  processing: { icon: Loader2, color: 'text-ceramic-info', label: 'Processando' },
  completed: { icon: CheckCircle, color: 'text-ceramic-success', label: 'Concluído' },
  failed: { icon: AlertCircle, color: 'text-ceramic-error', label: 'Falhou' },
};

export interface DocumentPreviewProps {
  document: ProcessedDocument;
  linkSuggestions?: LinkSuggestion[];
  showExtractedFields?: boolean;
  showLinkSuggestions?: boolean;
  showRawText?: boolean;
  onLinkConfirm?: (suggestion: LinkSuggestion) => void;
  onLinkReject?: (suggestion: LinkSuggestion) => void;
  onReprocess?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  compact?: boolean;
  className?: string;
}

export function DocumentPreview({
  document,
  linkSuggestions = [],
  showExtractedFields = true,
  showLinkSuggestions = true,
  showRawText = false,
  onLinkConfirm,
  onLinkReject,
  onReprocess,
  onDownload,
  onDelete,
  compact = false,
  className = '',
}: DocumentPreviewProps) {
  const [expandedFields, setExpandedFields] = useState(!compact);
  const [expandedText, setExpandedText] = useState(false);

  const statusConfig = STATUS_CONFIG[document.processing_status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`border rounded-xl bg-ceramic-base overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b bg-ceramic-base">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-ceramic-base rounded-lg border">
              <FileText className="w-5 h-5 text-ceramic-text-secondary" />
            </div>
            <div>
              <p className="font-medium text-ceramic-text-primary truncate max-w-xs">{document.original_name}</p>
              <div className="flex items-center gap-2 mt-1">
                <StatusIcon
                  className={`w-4 h-4 ${statusConfig.color} ${
                    document.processing_status === 'processing' ? 'animate-spin' : ''
                  }`}
                />
                <span className={`text-xs ${statusConfig.color}`}>{statusConfig.label}</span>
                <span className="text-xs text-ceramic-text-secondary">•</span>
                <span className="text-xs text-ceramic-text-secondary">{formatFileSize(document.size_bytes)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {onReprocess && (
              <button
                onClick={onReprocess}
                className="p-2 text-ceramic-text-secondary hover:text-ceramic-text-secondary hover:bg-ceramic-base rounded-lg transition-colors"
                title="Reprocessar"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            {onDownload && (
              <button
                onClick={onDownload}
                className="p-2 text-ceramic-text-secondary hover:text-ceramic-text-secondary hover:bg-ceramic-base rounded-lg transition-colors"
                title="Baixar original"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 text-ceramic-text-secondary hover:text-ceramic-error hover:bg-ceramic-error-bg rounded-lg transition-colors"
                title="Excluir"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Detected Type Badge */}
        {document.detected_type && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm px-2 py-0.5 bg-ceramic-info-bg text-ceramic-info rounded-full">
              {DETECTED_TYPE_LABELS[document.detected_type] || document.detected_type}
            </span>
            {document.confidence && (
              <span className="text-xs text-ceramic-text-secondary">
                {Math.round(document.confidence * 100)}% confiança
              </span>
            )}
          </div>
        )}
      </div>

      {/* Extracted Fields */}
      {showExtractedFields && Object.keys(document.extracted_fields).length > 0 && (
        <div className="border-b">
          <button
            onClick={() => setExpandedFields(!expandedFields)}
            className="w-full p-4 flex items-center justify-between hover:bg-ceramic-base transition-colors"
          >
            <span className="text-sm font-medium text-ceramic-text-primary">Campos Extraídos</span>
            {expandedFields ? (
              <ChevronUp className="w-4 h-4 text-ceramic-text-secondary" />
            ) : (
              <ChevronDown className="w-4 h-4 text-ceramic-text-secondary" />
            )}
          </button>

          <AnimatePresence>
            {expandedFields && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4">
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(document.extracted_fields).map(([key, value]) => (
                      <div key={key} className="p-3 bg-ceramic-base rounded-lg">
                        <p className="text-xs text-ceramic-text-secondary mb-1">{key}</p>
                        <p className="text-sm text-ceramic-text-primary font-medium">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Link Suggestions */}
      {showLinkSuggestions && linkSuggestions.length > 0 && (
        <div className="p-4 border-b">
          <p className="text-sm font-medium text-ceramic-text-primary mb-3 flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Sugestões de Vinculação
          </p>
          <div className="space-y-2">
            {linkSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="flex items-center justify-between p-3 bg-ceramic-base rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {suggestion.entity_type === 'organization' ? (
                    <Building2 className="w-5 h-5 text-ceramic-text-secondary" />
                  ) : (
                    <FolderOpen className="w-5 h-5 text-ceramic-text-secondary" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-ceramic-text-primary">{suggestion.entity_name}</p>
                    <p className="text-xs text-ceramic-text-secondary">
                      {suggestion.entity_type === 'organization' ? 'Organização' : 'Projeto'} •{' '}
                      {Math.round(suggestion.confidence * 100)}% match
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {onLinkConfirm && (
                    <button
                      onClick={() => onLinkConfirm(suggestion)}
                      className="px-3 py-1 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                    >
                      Vincular
                    </button>
                  )}
                  {onLinkReject && (
                    <button
                      onClick={() => onLinkReject(suggestion)}
                      className="px-3 py-1 text-sm text-ceramic-text-secondary hover:bg-ceramic-cool rounded-lg transition-colors"
                    >
                      Ignorar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw Text Preview */}
      {showRawText && document.raw_text && (
        <div className="p-4">
          <button
            onClick={() => setExpandedText(!expandedText)}
            className="text-sm font-medium text-ceramic-text-primary mb-3 flex items-center gap-2"
          >
            Texto Extraído
            {expandedText ? (
              <ChevronUp className="w-4 h-4 text-ceramic-text-secondary" />
            ) : (
              <ChevronDown className="w-4 h-4 text-ceramic-text-secondary" />
            )}
          </button>

          <div
            className={`text-sm text-ceramic-text-secondary bg-ceramic-base rounded-lg p-4 ${
              expandedText ? '' : 'line-clamp-4'
            }`}
          >
            {document.raw_text}
          </div>

          {!expandedText && document.raw_text.length > 500 && (
            <button
              onClick={() => setExpandedText(true)}
              className="mt-2 text-sm text-amber-500 hover:text-amber-600"
            >
              Ver mais
            </button>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 bg-ceramic-base text-xs text-ceramic-text-secondary">
        Processado em {formatDate(document.created_at)}
      </div>
    </div>
  );
}

export default DocumentPreview;
