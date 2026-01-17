/**
 * PDFUploadZone - Componente de upload de PDF com drag & drop
 */

import React, { useState, useCallback } from 'react';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PDFUploadZoneProps {
  onFileSelected: (file: File) => void;
  isProcessing?: boolean;
  error?: string | null;
  success?: boolean;
}

export const PDFUploadZone: React.FC<PDFUploadZoneProps> = ({
  onFileSelected,
  isProcessing = false,
  error = null,
  success = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

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

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        setSelectedFileName(file.name);
        onFileSelected(file);
      } else {
        alert('Por favor, selecione um arquivo PDF');
      }
    }
  }, [onFileSelected]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setSelectedFileName(file.name);
      onFileSelected(file);
    }
  }, [onFileSelected]);

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-testid="pdf-upload-zone"
        className={`
          relative ceramic-tray rounded-xl p-12 border-2 border-dashed transition-all duration-300
          ${isDragging ? 'border-ceramic-accent bg-ceramic-accent/5' : 'border-ceramic-text-secondary/20'}
          ${isProcessing ? 'opacity-60 pointer-events-none' : 'cursor-pointer hover:border-ceramic-accent/50'}
        `}
      >
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileInput}
          disabled={isProcessing}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="flex flex-col items-center gap-4 text-center pointer-events-none">
          {/* Icon */}
          <AnimatePresence mode="wait">
            {isProcessing ? (
              <motion.div
                key="processing"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                className="ceramic-concave w-20 h-20 flex items-center justify-center"
                data-testid="processing-indicator"
              >
                <Loader2 className="w-10 h-10 text-ceramic-accent animate-spin" />
              </motion.div>
            ) : success ? (
              <motion.div
                key="success"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ceramic-concave w-20 h-20 flex items-center justify-center bg-green-50"
              >
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ceramic-concave w-20 h-20 flex items-center justify-center bg-red-50"
              >
                <AlertCircle className="w-10 h-10 text-red-600" />
              </motion.div>
            ) : selectedFileName ? (
              <motion.div
                key="file-selected"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ceramic-concave w-20 h-20 flex items-center justify-center"
              >
                <FileText className="w-10 h-10 text-ceramic-accent" />
              </motion.div>
            ) : (
              <motion.div
                key="upload"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ceramic-concave w-20 h-20 flex items-center justify-center"
              >
                <Upload className="w-10 h-10 text-ceramic-text-secondary" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Text */}
          <div>
            {isProcessing ? (
              <>
                <h3 className="text-lg font-bold text-ceramic-text-primary mb-2">
                  Processando PDF...
                </h3>
                <p className="text-sm text-ceramic-text-secondary">
                  Extraindo texto e analisando com IA. Isso pode levar alguns segundos.
                </p>
              </>
            ) : success ? (
              <>
                <h3 className="text-lg font-bold text-green-600 mb-2">
                  ✓ Edital analisado com sucesso!
                </h3>
                <p className="text-sm text-ceramic-text-secondary">
                  Revise as informações extraídas abaixo
                </p>
              </>
            ) : error ? (
              <>
                <h3 className="text-lg font-bold text-red-600 mb-2">
                  Erro ao processar PDF
                </h3>
                <p className="text-sm text-red-600">
                  {error}
                </p>
              </>
            ) : selectedFileName ? (
              <>
                <h3 className="text-lg font-bold text-ceramic-text-primary mb-2">
                  {selectedFileName}
                </h3>
                <p className="text-sm text-ceramic-text-secondary">
                  Arquivo selecionado. Clique em "Analisar" para continuar.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold text-ceramic-text-primary mb-2">
                  Arraste o PDF do edital aqui
                </h3>
                <p className="text-sm text-ceramic-text-secondary">
                  ou clique para selecionar o arquivo
                </p>
              </>
            )}
          </div>

          {/* Format hint */}
          {!isProcessing && !success && !error && (
            <div className="flex items-center gap-2 text-xs text-ceramic-text-secondary">
              <FileText className="w-4 h-4" />
              <span>Apenas arquivos PDF • Máximo 10MB</span>
            </div>
          )}
        </div>
      </div>

      {/* Selected file info */}
      {selectedFileName && !isProcessing && !success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="ceramic-card p-4 rounded-xl flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="ceramic-inset p-2">
              <FileText className="w-5 h-5 text-ceramic-accent" />
            </div>
            <div>
              <p className="text-sm font-bold text-ceramic-text-primary">
                {selectedFileName}
              </p>
              <p className="text-xs text-ceramic-text-secondary">
                Pronto para análise
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedFileName(null);
              // Reset file input
              const input = document.querySelector('input[type="file"]') as HTMLInputElement;
              if (input) input.value = '';
            }}
            className="text-xs text-ceramic-text-secondary hover:text-red-500 transition-colors"
          >
            Remover
          </button>
        </motion.div>
      )}
    </div>
  );
};
