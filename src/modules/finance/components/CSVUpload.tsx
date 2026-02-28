/**
 * CSV Upload Component
 * Upload de extratos bancários em formato CSV
 * Suporta: Nubank, Inter, Itaú
 */

import React, { useState, useRef } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import { Upload, X, CheckCircle, AlertCircle, FileText, Loader2 } from 'lucide-react';

const log = createNamespacedLogger('CSVUpload');
import { statementService } from '../services/statementService';

interface CSVUploadProps {
  userId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const CSVUpload: React.FC<CSVUploadProps> = ({ userId, onSuccess, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ transactionCount: number; bank: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.name.endsWith('.csv')) {
        setError('Por favor, selecione um arquivo CSV (.csv)');
        return;
      }

      // Validate file size (10MB max)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('Arquivo muito grande. Tamanho máximo: 10MB');
        return;
      }

      setFile(selectedFile);
      setError(null);
      setSuccess(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploading(true);
      setError(null);

      const result = await statementService.processCSVStatement(userId, file);

      setSuccess(true);
      setUploadResult({
        transactionCount: result.transactionCount,
        bank: result.statement.bank_name || 'Desconhecido'
      });

      // Wait 2 seconds to show success message, then close and refresh
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      log.error('Upload error:', err);
      setError(err.message || 'Erro ao processar CSV. Verifique o formato do arquivo.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile);
      setError(null);
      setSuccess(false);
    } else {
      setError('Por favor, arraste um arquivo CSV (.csv)');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-ceramic-base rounded-2xl shadow-ceramic-elevated max-w-lg w-full p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-ceramic-text-primary">Upload de CSV</h2>
            <p className="text-sm text-ceramic-text-secondary mt-1">
              Importe extratos do Nubank, Inter ou Itaú
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
            disabled={uploading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Success State */}
        {success && uploadResult && (
          <div className="mb-6 p-6 bg-ceramic-success/10 rounded-xl border border-ceramic-success/20">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="w-6 h-6 text-ceramic-success" />
              <h3 className="font-bold text-ceramic-success">Upload concluído!</h3>
            </div>
            <p className="text-sm text-ceramic-success">
              <strong>{uploadResult.transactionCount}</strong> transações importadas do{' '}
              <strong>{uploadResult.bank}</strong>
            </p>
            <p className="text-xs text-ceramic-success mt-2">Redirecionando...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-ceramic-error/10 rounded-xl border border-ceramic-error/20">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-ceramic-error flex-shrink-0" />
              <p className="text-sm text-ceramic-error">{error}</p>
            </div>
          </div>
        )}

        {/* Upload Area */}
        {!success && (
          <>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                file
                  ? 'border-ceramic-success bg-ceramic-success/10'
                  : 'border-ceramic-border hover:border-ceramic-border bg-ceramic-base'
              }`}
            >
              {file ? (
                <div className="space-y-4">
                  <div className="inline-block p-4 bg-ceramic-warning/10 rounded-full">
                    <FileText className="w-8 h-8 text-ceramic-warning" />
                  </div>
                  <div>
                    <p className="font-medium text-ceramic-text-primary">{file.name}</p>
                    <p className="text-sm text-ceramic-text-secondary mt-1">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    className="text-sm text-ceramic-text-secondary hover:text-ceramic-text-primary underline"
                    disabled={uploading}
                  >
                    Remover arquivo
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="inline-block p-4 bg-ceramic-cool rounded-full">
                    <Upload className="w-8 h-8 text-ceramic-text-secondary" />
                  </div>
                  <div>
                    <p className="text-ceramic-text-primary font-medium mb-1">
                      Arraste um arquivo CSV aqui
                    </p>
                    <p className="text-sm text-ceramic-text-secondary">ou</p>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2 bg-ceramic-warning text-white rounded-lg hover:bg-ceramic-warning/80 transition-colors font-medium"
                  >
                    Escolher arquivo
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            {/* Format Info */}
            <div className="mt-6 p-4 bg-ceramic-cool rounded-xl border border-ceramic-border">
              <h4 className="text-sm font-medium text-ceramic-text-primary mb-2">
                📋 Formatos Suportados
              </h4>
              <ul className="text-xs text-ceramic-text-secondary space-y-1">
                <li>• Nubank (date, title, amount)</li>
                <li>• Banco Inter (Data;Descrição;Valor;Saldo)</li>
                <li>• Itaú (data;lancamento;valor;saldo)</li>
              </ul>
              <p className="text-xs text-ceramic-text-secondary mt-3">
                💡 O formato é detectado automaticamente
              </p>
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-ceramic-border text-ceramic-text-primary rounded-lg hover:bg-ceramic-base transition-colors font-medium"
                disabled={uploading}
              >
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="flex-1 px-6 py-3 bg-ceramic-warning text-white rounded-lg hover:bg-ceramic-warning/80 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Fazer Upload
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
