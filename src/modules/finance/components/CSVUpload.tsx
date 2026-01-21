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
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Upload de CSV</h2>
            <p className="text-sm text-gray-600 mt-1">
              Importe extratos do Nubank, Inter ou Itaú
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={uploading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Success State */}
        {success && uploadResult && (
          <div className="mb-6 p-6 bg-green-50 rounded-xl border border-green-200">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <h3 className="font-bold text-green-900">Upload concluído!</h3>
            </div>
            <p className="text-sm text-green-700">
              <strong>{uploadResult.transactionCount}</strong> transações importadas do{' '}
              <strong>{uploadResult.bank}</strong>
            </p>
            <p className="text-xs text-green-600 mt-2">Redirecionando...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 rounded-xl border border-red-200">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
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
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400 bg-gray-50'
              }`}
            >
              {file ? (
                <div className="space-y-4">
                  <div className="inline-block p-4 bg-blue-100 rounded-full">
                    <FileText className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    className="text-sm text-gray-600 hover:text-gray-900 underline"
                    disabled={uploading}
                  >
                    Remover arquivo
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="inline-block p-4 bg-gray-100 rounded-full">
                    <Upload className="w-8 h-8 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-gray-900 font-medium mb-1">
                      Arraste um arquivo CSV aqui
                    </p>
                    <p className="text-sm text-gray-600">ou</p>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
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
            <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                📋 Formatos Suportados
              </h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Nubank (date, title, amount)</li>
                <li>• Banco Inter (Data;Descrição;Valor;Saldo)</li>
                <li>• Itaú (data;lancamento;valor;saldo)</li>
              </ul>
              <p className="text-xs text-gray-500 mt-3">
                💡 O formato é detectado automaticamente
              </p>
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                disabled={uploading}
              >
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
