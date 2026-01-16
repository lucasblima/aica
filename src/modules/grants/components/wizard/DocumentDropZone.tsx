/**
 * DocumentDropZone Component
 * Issue #100 - Wizard gamificado para cadastro completo de organizacoes
 *
 * Drag-and-drop zone for uploading organization documents.
 * Processes documents to auto-fill wizard fields.
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
} from 'lucide-react';
import {
  validateFile,
  type UploadProgress,
  type OrganizationFields,
} from '../../services/organizationDocumentService';

// =============================================================================
// TYPES
// =============================================================================

interface DocumentDropZoneProps {
  onFieldsExtracted: (fields: OrganizationFields, confidence: Record<string, number>) => void;
  onUploadStart?: () => void;
  onUploadComplete?: () => void;
  onError?: (error: string) => void;
  isProcessing?: boolean;
  disabled?: boolean;
  compact?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function DocumentDropZone({
  onFieldsExtracted,
  onUploadStart,
  onUploadComplete,
  onError,
  isProcessing: externalProcessing = false,
  disabled = false,
  compact = false,
}: DocumentDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isProcessing = externalProcessing || progress?.stage === 'uploading' || progress?.stage === 'processing';

  // Handle file selection
  const handleFile = useCallback(async (file: File) => {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      onError?.(validation.error || 'Arquivo invalido');
      return;
    }

    setSelectedFile(file);
    onUploadStart?.();

    // Dynamic import to avoid SSR issues
    const { uploadAndProcessOrganizationDocument } = await import(
      '../../services/organizationDocumentService'
    );

    try {
      const result = await uploadAndProcessOrganizationDocument(
        file,
        'auto',
        setProgress
      );

      if (result.success) {
        onFieldsExtracted(result.fields, result.fieldConfidence);
        onUploadComplete?.();
      } else {
        onError?.(result.error || 'Erro ao processar documento');
        setProgress({
          stage: 'error',
          progress: 0,
          message: result.error || 'Erro desconhecido',
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      onError?.(message);
      setProgress({
        stage: 'error',
        progress: 0,
        message,
      });
    }
  }, [onFieldsExtracted, onUploadStart, onUploadComplete, onError]);

  // Drag handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isProcessing) {
      setIsDragging(true);
    }
  }, [disabled, isProcessing]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || isProcessing) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [disabled, isProcessing, handleFile]);

  // Click to select
  const handleClick = useCallback(() => {
    if (!disabled && !isProcessing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled, isProcessing]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    // Reset input
    e.target.value = '';
  }, [handleFile]);

  // Clear selection
  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setProgress(null);
  }, []);

  // Get file icon
  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf') {
      return <FileText className="w-5 h-5" />;
    }
    return <ImageIcon className="w-5 h-5" />;
  };

  // Compact version
  if (compact) {
    return (
      <div
        className={`
          relative p-3 rounded-xl border-2 border-dashed transition-all cursor-pointer
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
          ${disabled || isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="flex items-center gap-3">
          {isProcessing ? (
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          ) : progress?.stage === 'completed' ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : progress?.stage === 'error' ? (
            <AlertCircle className="w-5 h-5 text-red-500" />
          ) : (
            <Upload className="w-5 h-5 text-gray-400" />
          )}

          <div className="flex-1 min-w-0">
            {selectedFile ? (
              <p className="text-sm text-gray-600 truncate">{selectedFile.name}</p>
            ) : (
              <p className="text-sm text-gray-500">
                Arraste um documento ou clique para selecionar
              </p>
            )}
          </div>

          {selectedFile && !isProcessing && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {progress && (
          <div className="mt-2">
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className={`h-full ${
                  progress.stage === 'error' ? 'bg-red-500' :
                  progress.stage === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${progress.progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full version
  return (
    <motion.div
      className={`
        relative p-6 rounded-2xl border-2 border-dashed transition-all
        ${isDragging ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-gray-200 hover:border-gray-300 bg-gray-50'}
        ${disabled || isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      whileHover={!disabled && !isProcessing ? { scale: 1.01 } : undefined}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        onChange={handleFileInputChange}
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {/* Idle state */}
        {!selectedFile && !progress && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center text-center"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-blue-500" />
            </div>

            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              Preencha automaticamente
            </h3>

            <p className="text-sm text-gray-500 mb-4">
              Arraste seu <strong>Cartao CNPJ</strong> ou outro documento da organizacao
            </p>

            <div className="flex items-center gap-2 text-xs text-gray-400">
              <FileText className="w-4 h-4" />
              <span>PDF, PNG, JPG ate 20MB</span>
            </div>
          </motion.div>
        )}

        {/* Processing state */}
        {progress && progress.stage !== 'completed' && progress.stage !== 'error' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center text-center"
          >
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>

            {selectedFile && (
              <div className="flex items-center gap-2 mb-2 px-4 py-2 bg-white rounded-lg shadow-sm">
                {getFileIcon(selectedFile)}
                <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
                  {selectedFile.name}
                </span>
              </div>
            )}

            <p className="text-sm text-gray-600 mb-4">{progress.message}</p>

            <div className="w-full max-w-xs h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress.progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}

        {/* Success state */}
        {progress?.stage === 'completed' && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center text-center"
          >
            <motion.div
              className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </motion.div>

            <h3 className="text-lg font-semibold text-green-600 mb-1">
              Campos extraidos!
            </h3>

            <p className="text-sm text-gray-500 mb-4">
              Os campos foram preenchidos automaticamente
            </p>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="text-sm text-blue-500 hover:underline"
            >
              Enviar outro documento
            </button>
          </motion.div>
        )}

        {/* Error state */}
        {progress?.stage === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center text-center"
          >
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>

            <h3 className="text-lg font-semibold text-red-600 mb-1">
              Erro ao processar
            </h3>

            <p className="text-sm text-gray-500 mb-4">{progress.message}</p>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"
            >
              Tentar novamente
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default DocumentDropZone;
