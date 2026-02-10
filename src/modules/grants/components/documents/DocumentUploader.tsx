/**
 * DocumentUploader Component
 * Issue #114 - Upload e extração de conteúdo de documentos
 *
 * @module modules/grants/components/documents/DocumentUploader
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('Documentuploader');
import {
  Upload,
  FileText,
  Image,
  FileSpreadsheet,
  Presentation,
  CheckCircle,
  XCircle,
  Loader2,
  X,
  Link2,
  Building2,
  FolderOpen,
} from 'lucide-react';

// Types
export type FileType = 'pdf' | 'pptx' | 'docx' | 'image';
export type UploadStatus = 'idle' | 'dragging' | 'uploading' | 'processing' | 'success' | 'error';

export interface LinkSuggestion {
  id: string;
  entity_type: 'organization' | 'project' | 'opportunity';
  entity_id: string;
  entity_name: string;
  match_reason: 'cnpj' | 'name_similarity' | 'pronac' | 'context';
  confidence: number;
}

export interface ProcessedDocument {
  id: string;
  storage_path: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  raw_text: string | null;
  detected_type: string | null;
  confidence: number | null;
  extracted_fields: Record<string, unknown>;
  processing_status: string;
  created_at: string;
}

export interface DocumentUploaderProps {
  organizationId?: string;
  projectId?: string;
  onUploadComplete?: (document: ProcessedDocument) => void;
  onUploadError?: (error: Error) => void;
  acceptedTypes?: FileType[];
  maxSizeMB?: number;
  className?: string;
}

// File type mappings
const FILE_TYPE_MAP: Record<string, FileType> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.ms-powerpoint': 'pptx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'docx',
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
};

const FILE_TYPE_ICONS: Record<FileType, React.FC<{ className?: string }>> = {
  pdf: FileText,
  pptx: Presentation,
  docx: FileSpreadsheet,
  image: Image,
};

const FILE_TYPE_LABELS: Record<FileType, string> = {
  pdf: 'PDF',
  pptx: 'PowerPoint',
  docx: 'Word',
  image: 'Imagem',
};

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

export function DocumentUploader({
  organizationId,
  projectId,
  onUploadComplete,
  onUploadError,
  acceptedTypes = ['pdf', 'pptx', 'docx', 'image'],
  maxSizeMB = 10,
  className = '',
}: DocumentUploaderProps) {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    document: ProcessedDocument;
    linkSuggestions: LinkSuggestion[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getAcceptedMimeTypes = useCallback(() => {
    const mimeTypes: string[] = [];
    if (acceptedTypes.includes('pdf')) mimeTypes.push('application/pdf');
    if (acceptedTypes.includes('pptx')) {
      mimeTypes.push('application/vnd.openxmlformats-officedocument.presentationml.presentation');
      mimeTypes.push('application/vnd.ms-powerpoint');
    }
    if (acceptedTypes.includes('docx')) {
      mimeTypes.push('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      mimeTypes.push('application/msword');
    }
    if (acceptedTypes.includes('image')) {
      mimeTypes.push('image/jpeg', 'image/png', 'image/webp');
    }
    return mimeTypes.join(',');
  }, [acceptedTypes]);

  const validateFile = useCallback(
    (file: File): string | null => {
      const fileType = FILE_TYPE_MAP[file.type];
      if (!fileType || !acceptedTypes.includes(fileType)) {
        return `Tipo de arquivo não suportado. Aceitos: ${acceptedTypes.map((t) => FILE_TYPE_LABELS[t]).join(', ')}`;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        return `Arquivo muito grande. Máximo: ${maxSizeMB}MB`;
      }
      return null;
    },
    [acceptedTypes, maxSizeMB]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setStatus('dragging');
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setStatus('idle');
  }, []);

  const processFile = useCallback(
    async (selectedFile: File) => {
      const validationError = validateFile(selectedFile);
      if (validationError) {
        setError(validationError);
        setStatus('error');
        return;
      }

      setFile(selectedFile);
      setError(null);
      setStatus('uploading');
      setProgress(0);

      try {
        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setProgress((prev) => Math.min(prev + 10, 90));
        }, 200);

        // TODO: Implement actual upload to Supabase Storage
        // const storagePath = await uploadToStorage(selectedFile);

        clearInterval(progressInterval);
        setProgress(100);
        setStatus('processing');

        // TODO: Call Edge Function process-document
        // const result = await processDocument({ storage_path: storagePath, ... });

        // Mock result for now
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const mockResult = {
          document: {
            id: crypto.randomUUID(),
            storage_path: `documents/${selectedFile.name}`,
            original_name: selectedFile.name,
            mime_type: selectedFile.type,
            size_bytes: selectedFile.size,
            raw_text: 'Conteúdo extraído do documento...',
            detected_type: 'projeto_rouanet',
            confidence: 0.89,
            extracted_fields: {
              pronac: '123456',
              valor_aprovado: 'R$ 500.000,00',
              proponente: 'ONG Exemplo',
            },
            processing_status: 'completed',
            created_at: new Date().toISOString(),
          },
          linkSuggestions: [
            {
              id: '1',
              entity_type: 'organization' as const,
              entity_id: 'org-1',
              entity_name: 'ONG Exemplo',
              match_reason: 'name_similarity' as const,
              confidence: 0.85,
            },
          ],
        };

        setResult(mockResult);
        setStatus('success');
        onUploadComplete?.(mockResult.document);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao processar documento');
        setStatus('error');
        onUploadError?.(err instanceof Error ? err : new Error('Erro desconhecido'));
      }
    },
    [validateFile, onUploadComplete, onUploadError]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setStatus('idle');

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        processFile(droppedFile);
      }
    },
    [processFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        processFile(selectedFile);
      }
    },
    [processFile]
  );

  const handleReset = useCallback(() => {
    setFile(null);
    setStatus('idle');
    setProgress(0);
    setResult(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, []);

  const handleLinkConfirm = useCallback((suggestion: LinkSuggestion) => {
    // TODO: Implement link confirmation
    log.debug('Confirming link:', suggestion);
  }, []);

  const handleLinkReject = useCallback((suggestion: LinkSuggestion) => {
    // TODO: Implement link rejection
    setResult((prev) =>
      prev
        ? {
            ...prev,
            linkSuggestions: prev.linkSuggestions.filter((s) => s.id !== suggestion.id),
          }
        : null
    );
  }, []);

  const fileType = file ? FILE_TYPE_MAP[file.type] : null;
  const FileIcon = fileType ? FILE_TYPE_ICONS[fileType] : FileText;

  return (
    <div className={`w-full ${className}`}>
      <AnimatePresence mode="wait">
        {status === 'idle' || status === 'dragging' ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`
              relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
              transition-all duration-200
              ${
                status === 'dragging'
                  ? 'border-amber-500 bg-ceramic-info-bg'
                  : 'border-ceramic-border hover:border-ceramic-border hover:bg-ceramic-cool'
              }
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept={getAcceptedMimeTypes()}
              onChange={handleFileSelect}
              className="hidden"
            />

            <Upload
              className={`w-12 h-12 mx-auto mb-4 ${
                status === 'dragging' ? 'text-ceramic-info' : 'text-ceramic-text-secondary'
              }`}
            />

            <p className="text-lg font-medium text-ceramic-text-primary mb-2">
              {status === 'dragging' ? 'Solte o arquivo aqui' : 'Arraste um arquivo ou clique para selecionar'}
            </p>

            <p className="text-sm text-ceramic-text-secondary">
              {acceptedTypes.map((t) => FILE_TYPE_LABELS[t]).join(', ')} - Máx. {maxSizeMB}MB
            </p>
          </motion.div>
        ) : status === 'uploading' || status === 'processing' ? (
          <motion.div
            key="progress"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="border rounded-xl p-6 bg-ceramic-base"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-ceramic-info-bg rounded-lg">
                <FileIcon className="w-6 h-6 text-ceramic-info" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-ceramic-text-primary truncate">{file?.name}</p>
                <p className="text-sm text-ceramic-text-secondary">
                  {status === 'uploading' ? 'Enviando...' : 'Processando com IA...'}
                </p>
              </div>
              <Loader2 className="w-5 h-5 text-ceramic-info animate-spin" />
            </div>

            <div className="w-full bg-ceramic-base rounded-full h-2">
              <motion.div
                className="bg-amber-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {status === 'processing' && (
              <p className="mt-3 text-sm text-ceramic-text-secondary text-center">
                Extraindo conteúdo e classificando documento...
              </p>
            )}
          </motion.div>
        ) : status === 'success' && result ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="border rounded-xl p-6 bg-ceramic-base"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-ceramic-success-bg rounded-lg">
                  <CheckCircle className="w-6 h-6 text-ceramic-success" />
                </div>
                <div>
                  <p className="font-medium text-ceramic-text-primary">{result.document.original_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm px-2 py-0.5 bg-ceramic-info-bg text-ceramic-info rounded-full">
                      {DETECTED_TYPE_LABELS[result.document.detected_type || 'outro']}
                    </span>
                    <span className="text-sm text-ceramic-text-secondary">
                      {Math.round((result.document.confidence || 0) * 100)}% confiança
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="p-1 text-ceramic-text-secondary hover:text-ceramic-text-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Extracted Fields */}
            {Object.keys(result.document.extracted_fields).length > 0 && (
              <div className="mb-4 p-4 bg-ceramic-cool rounded-lg">
                <p className="text-sm font-medium text-ceramic-text-primary mb-2">Campos Extraídos</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(result.document.extracted_fields).map(([key, value]) => (
                    <div key={key} className="text-sm">
                      <span className="text-ceramic-text-secondary">{key}: </span>
                      <span className="text-ceramic-text-primary">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Link Suggestions */}
            {result.linkSuggestions.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-ceramic-text-primary mb-3 flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  Sugestões de Vinculação
                </p>
                <div className="space-y-2">
                  {result.linkSuggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className="flex items-center justify-between p-3 bg-ceramic-cool rounded-lg"
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
                        <button
                          onClick={() => handleLinkConfirm(suggestion)}
                          className="px-3 py-1 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                        >
                          Vincular
                        </button>
                        <button
                          onClick={() => handleLinkReject(suggestion)}
                          className="px-3 py-1 text-sm text-ceramic-text-secondary hover:bg-ceramic-cool rounded-lg transition-colors"
                        >
                          Ignorar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm text-ceramic-info hover:bg-ceramic-info-bg rounded-lg transition-colors"
              >
                Enviar outro documento
              </button>
            </div>
          </motion.div>
        ) : status === 'error' ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="border border-ceramic-border rounded-xl p-6 bg-ceramic-error-bg"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-ceramic-error-bg rounded-lg">
                <XCircle className="w-6 h-6 text-ceramic-error" />
              </div>
              <div>
                <p className="font-medium text-ceramic-error">Erro ao processar</p>
                <p className="text-sm text-ceramic-error">{error}</p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="w-full px-4 py-2 text-sm bg-ceramic-error-bg text-ceramic-error rounded-lg hover:bg-ceramic-error/10 transition-colors"
            >
              Tentar novamente
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default DocumentUploader;
