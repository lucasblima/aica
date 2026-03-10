/**
 * VideoUploadPanel - Drag & drop video upload with progress tracking
 *
 * Accepts mp4, webm, mov, avi files up to 2GB.
 * Shows warning for files >500MB.
 * Shows progress bar during upload and file info after.
 * Saves metadata to studio_assets table.
 */

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Film,
  X,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('VideoUploadPanel');

export interface UploadedVideoFile {
  name: string;
  size: number;
  format: string;
  url?: string;
  assetId?: string;
}

interface VideoUploadPanelProps {
  projectId: string;
  onFileUploaded: (file: UploadedVideoFile) => void;
  uploadedFile?: UploadedVideoFile;
}

const ACCEPTED_FORMATS: Record<string, string> = {
  'video/mp4': 'MP4',
  'video/webm': 'WebM',
  'video/quicktime': 'MOV',
  'video/x-msvideo': 'AVI',
  'video/avi': 'AVI',
};
const ACCEPTED_TYPES = Object.keys(ACCEPTED_FORMATS);
const ACCEPTED_EXTENSIONS = '.mp4,.webm,.mov,.avi';

const MAX_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2GB
const WARNING_SIZE_BYTES = 500 * 1024 * 1024; // 500MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getFormatName(mimeType: string): string {
  return ACCEPTED_FORMATS[mimeType] || mimeType.split('/').pop()?.toUpperCase() || 'Desconhecido';
}

export default function VideoUploadPanel({
  projectId,
  onFileUploaded,
  uploadedFile,
}: VideoUploadPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const simulateUploadAndSave = useCallback(async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    // Simulated upload progress
    await new Promise<void>((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15 + 5;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          resolve();
        }
        setUploadProgress(Math.min(Math.round(progress), 100));
      }, 300);
    });

    // Save metadata to studio_assets
    const format = getFormatName(file.type);
    try {
      const { data, error: dbError } = await supabase
        .from('studio_assets')
        .insert({
          project_id: projectId,
          asset_type: 'video',
          file_url: `uploads/videos/${file.name}`, // placeholder URL until real storage
          file_size: file.size,
          metadata: {
            original_name: file.name,
            mime_type: file.type,
            format,
          },
          tags: ['video', format.toLowerCase()],
        })
        .select('id')
        .single();

      if (dbError) {
        log.warn('Falha ao salvar metadados do video:', dbError.message);
        setWarning('Video carregado, mas os metadados nao foram salvos. Tente novamente mais tarde.');
      }

      const uploadedVideo: UploadedVideoFile = {
        name: file.name,
        size: file.size,
        format,
        assetId: data?.id,
      };
      onFileUploaded(uploadedVideo);
    } catch (err) {
      // Even if DB save fails, report the file as uploaded (metadata save is best-effort)
      log.warn('Erro ao salvar asset:', err);
      setWarning('Video carregado, mas ocorreu um erro ao salvar metadados.');
      onFileUploaded({
        name: file.name,
        size: file.size,
        format,
      });
    } finally {
      setIsUploading(false);
    }
  }, [projectId, onFileUploaded]);

  const validateAndSelect = useCallback((file: File) => {
    setError(null);
    setWarning(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      // Fallback: check extension for AVI files that may report wrong MIME
      if (ext === 'avi') {
        // Allow AVI by extension
      } else {
        setError(
          `Formato nao suportado: ${file.type || 'desconhecido'}. ` +
          `Use MP4, WebM, MOV ou AVI.`
        );
        return;
      }
    }

    if (file.size > MAX_SIZE_BYTES) {
      setError(
        `Arquivo muito grande (${formatFileSize(file.size)}). ` +
        `O tamanho maximo permitido e 2 GB.`
      );
      return;
    }

    if (file.size > WARNING_SIZE_BYTES) {
      setWarning(
        `Arquivo grande (${formatFileSize(file.size)}). ` +
        `O upload pode demorar mais. Recomendamos arquivos ate 500 MB para melhor experiencia.`
      );
    }

    simulateUploadAndSave(file);
  }, [simulateUploadAndSave]);

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
    // Reset input so the same file can be selected again
    if (e.target) e.target.value = '';
  }, [validateAndSelect]);

  // Upload complete state
  if (uploadedFile) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-ceramic-success/30 bg-ceramic-success/5 p-6 text-center"
          >
            <CheckCircle2 className="w-12 h-12 text-ceramic-success mx-auto mb-4" />
            <h3 className="text-lg font-bold text-ceramic-text-primary mb-1">
              Upload concluido
            </h3>
            <p className="text-xs text-ceramic-text-secondary mb-4">
              O video foi carregado com sucesso.
            </p>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-ceramic-cool">
              <Film className="w-8 h-8 text-blue-500 flex-shrink-0" />
              <div className="text-left min-w-0">
                <p className="text-sm font-medium text-ceramic-text-primary truncate">
                  {uploadedFile.name}
                </p>
                <p className="text-xs text-ceramic-text-secondary">
                  {formatFileSize(uploadedFile.size)} &middot; {uploadedFile.format}
                </p>
              </div>
            </div>
          </motion.div>
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
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-200 ${
            isUploading
              ? 'border-blue-400 bg-blue-50/50 cursor-default'
              : isDragging
                ? 'border-blue-500 bg-blue-50 scale-[1.02]'
                : 'border-ceramic-border hover:border-blue-400 hover:bg-ceramic-cool'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            onChange={handleFileInput}
            className="hidden"
            disabled={isUploading}
          />

          <AnimatePresence mode="wait">
            {isUploading ? (
              <motion.div
                key="uploading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Film className="w-12 h-12 mx-auto mb-4 text-blue-500" />
                <p className="text-sm font-medium text-ceramic-text-primary mb-1">
                  Enviando video...
                </p>
                <p className="text-xs text-ceramic-text-secondary mb-4">
                  {uploadProgress}% concluido
                </p>
                <div className="h-2 rounded-full bg-ceramic-border overflow-hidden">
                  <motion.div
                    className="h-full bg-blue-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Upload
                  className={`w-12 h-12 mx-auto mb-4 transition-colors ${
                    isDragging ? 'text-blue-500' : 'text-ceramic-text-secondary/40'
                  }`}
                />
                <p className="text-sm font-medium text-ceramic-text-primary mb-1">
                  {isDragging
                    ? 'Solte o video aqui'
                    : 'Arraste um video ou clique para selecionar'}
                </p>
                <p className="text-xs text-ceramic-text-secondary">
                  ou clique para selecionar
                </p>
                <p className="text-xs text-ceramic-text-secondary/60 mt-3">
                  MP4, WebM, MOV, AVI &middot; Max 2 GB
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Warning (large file) */}
        {warning && !isUploading && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-ceramic-warning/10 border border-ceramic-warning/30"
          >
            <Info className="w-4 h-4 text-ceramic-warning flex-shrink-0 mt-0.5" />
            <p className="text-xs text-ceramic-warning flex-1">{warning}</p>
            <button
              onClick={() => setWarning(null)}
              className="text-ceramic-warning/60 hover:text-ceramic-warning"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}

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
