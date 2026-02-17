/**
 * VideoUploadPanel - Drag & drop video upload with progress tracking
 *
 * Accepts mp4, webm, mov files up to 500MB.
 * Shows progress bar during upload and thumbnail/info after.
 */

import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Upload,
  Film,
  X,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

interface VideoUploadPanelProps {
  onFileSelected: (file: File) => void;
  uploadProgress: number;
  uploadedFile?: { name: string; size: number; url?: string };
}

const ACCEPTED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_SIZE_BYTES = 500 * 1024 * 1024; // 500MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function VideoUploadPanel({
  onFileSelected,
  uploadProgress,
  uploadedFile,
}: VideoUploadPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSelect = useCallback((file: File) => {
    setError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(`Formato nao suportado: ${file.type}. Use MP4, WebM ou MOV.`);
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError(`Arquivo muito grande (${formatFileSize(file.size)}). Maximo: 500 MB.`);
      return;
    }
    onFileSelected(file);
  }, [onFileSelected]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndSelect(file);
  }, [validateAndSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSelect(file);
  }, [validateAndSelect]);

  const isUploading = uploadProgress > 0 && uploadProgress < 100;

  // Upload complete state
  if (uploadedFile) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-ceramic-success/30 bg-ceramic-success/5 p-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-ceramic-success mx-auto mb-4" />
            <h3 className="text-lg font-bold text-ceramic-text-primary mb-1">
              Upload concluido
            </h3>
            <div className="flex items-center justify-center gap-3 mt-4 p-3 rounded-lg bg-ceramic-cool">
              <Film className="w-8 h-8 text-blue-500 flex-shrink-0" />
              <div className="text-left min-w-0">
                <p className="text-sm font-medium text-ceramic-text-primary truncate">
                  {uploadedFile.name}
                </p>
                <p className="text-xs text-ceramic-text-secondary">
                  {formatFileSize(uploadedFile.size)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="w-full max-w-md">
        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-ceramic-border hover:border-blue-400 hover:bg-ceramic-cool'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            onChange={handleFileInput}
            className="hidden"
          />

          <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-blue-500' : 'text-ceramic-text-secondary/40'}`} />
          <p className="text-sm font-medium text-ceramic-text-primary mb-1">
            {isDragging ? 'Solte o video aqui' : 'Arraste e solte seu video aqui'}
          </p>
          <p className="text-xs text-ceramic-text-secondary">
            ou clique para selecionar
          </p>
          <p className="text-xs text-ceramic-text-secondary/60 mt-3">
            MP4, WebM, MOV | Max 500 MB
          </p>

          {/* Upload Progress */}
          {isUploading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-x-6 bottom-4"
            >
              <div className="h-2 rounded-full bg-ceramic-border overflow-hidden">
                <motion.div
                  className="h-full bg-blue-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-xs text-ceramic-text-secondary text-center mt-1">
                {uploadProgress}%
              </p>
            </motion.div>
          )}
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-ceramic-error/10 border border-ceramic-error/30"
          >
            <AlertTriangle className="w-4 h-4 text-ceramic-error flex-shrink-0 mt-0.5" />
            <p className="text-xs text-ceramic-error flex-1">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-ceramic-error/60 hover:text-ceramic-error"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
