/**
 * MedicalDocumentUpload — drag-and-drop document upload with type selector
 *
 * Supports PDF, images (JPEG, PNG, WebP, HEIC), and DOCX.
 * Max file size: 20MB. Uses Ceramic Design System.
 */

import React, { useState, useCallback, useRef } from 'react';
import type { MedicalDocumentType, UploadDocumentInput } from '../../types/parq';
import {
  DOCUMENT_TYPE_LABELS,
  ACCEPTED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from './ParQQuestionConstants';
import {
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface MedicalDocumentUploadProps {
  athleteId: string;
  parqResponseId?: string;
  onUpload: (input: Omit<UploadDocumentInput, 'athlete_id'>) => Promise<any>;
  isUploading?: boolean;
}

export function MedicalDocumentUpload({
  athleteId,
  parqResponseId,
  onUpload,
  isUploading = false,
}: MedicalDocumentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<MedicalDocumentType>('atestado_medico');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      return 'Tipo de arquivo não suportado. Use PDF, JPEG, PNG, WebP, HEIC ou DOCX.';
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `Arquivo muito grande. Máximo: ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`;
    }
    return null;
  }, []);

  const handleFileSelect = useCallback(
    (file: File) => {
      const error = validateFile(file);
      if (error) {
        setValidationError(error);
        setSelectedFile(null);
        return;
      }
      setValidationError(null);
      setSelectedFile(file);
      setUploadSuccess(false);
      // Auto-fill title from filename
      if (!title) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setTitle(nameWithoutExt);
      }
    },
    [validateFile, title]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleSubmit = async () => {
    if (!selectedFile || !title.trim()) return;

    const result = await onUpload({
      file: selectedFile,
      document_type: documentType,
      title: title.trim(),
      description: description.trim() || undefined,
      parq_response_id: parqResponseId,
    });

    if (result) {
      setUploadSuccess(true);
      setSelectedFile(null);
      setTitle('');
      setDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
          transition-all duration-200
          ${dragOver
            ? 'border-ceramic-accent bg-ceramic-accent/5 scale-[1.01]'
            : 'border-ceramic-border hover:border-ceramic-text-secondary hover:bg-ceramic-cool/50'
          }
          ${selectedFile ? 'border-ceramic-success/50 bg-ceramic-success/5' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_MIME_TYPES.join(',')}
          onChange={handleInputChange}
          className="hidden"
        />

        {selectedFile ? (
          <div className="flex items-center gap-3">
            <div className="ceramic-inset p-2">
              <FileText className="w-6 h-6 text-ceramic-success" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-bold text-ceramic-text-primary truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-ceramic-text-secondary">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
                setUploadSuccess(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="p-1 hover:bg-ceramic-cool rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-ceramic-text-secondary" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="w-8 h-8 text-ceramic-text-secondary mx-auto" />
            <p className="text-sm font-medium text-ceramic-text-primary">
              Arraste o documento aqui ou clique para selecionar
            </p>
            <p className="text-xs text-ceramic-text-secondary">
              PDF, JPEG, PNG, WebP, HEIC, DOCX · Máximo 20MB
            </p>
          </div>
        )}
      </div>

      {/* Validation error */}
      {validationError && (
        <div className="flex items-center gap-2 text-ceramic-error text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Upload success */}
      {uploadSuccess && (
        <div className="flex items-center gap-2 text-ceramic-success text-xs">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>Documento enviado com sucesso!</span>
        </div>
      )}

      {/* Form fields (only show when file is selected) */}
      {selectedFile && (
        <div className="space-y-3">
          {/* Document type */}
          <div>
            <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-1">
              Tipo de Documento
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as MedicalDocumentType)}
              className="w-full ceramic-inset px-3 py-2 rounded-lg text-sm text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
            >
              {(Object.entries(DOCUMENT_TYPE_LABELS) as [MedicalDocumentType, string][]).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-1">
              Título
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Atestado cardiológico 2026"
              className="w-full ceramic-inset px-3 py-2 rounded-lg text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
            />
          </div>

          {/* Description (optional) */}
          <div>
            <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-1">
              Descrição <span className="font-normal">(opcional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Observações sobre o documento..."
              rows={2}
              className="w-full ceramic-inset px-3 py-2 rounded-lg text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50 resize-none"
            />
          </div>

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={isUploading || !title.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-ceramic-accent hover:bg-ceramic-accent/90 disabled:bg-ceramic-text-secondary/20 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Enviar Documento</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
