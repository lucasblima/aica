/**
 * WhatsAppExportUpload Component
 *
 * Drag-and-drop file upload for WhatsApp chat exports (.txt/.zip).
 * Shows processing progress with rotating messages and final stats.
 *
 * Inspired by: StatementUpload.tsx (Finance module)
 * Related: Issue #211 - Universal Input Funnel
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  MessageSquare,
  Users,
  Clock,
  BarChart3,
} from 'lucide-react';
import { useWhatsAppImport } from '../../hooks/useWhatsAppImport';
import {
  IMPORT_STATUS_LABELS,
  IMPORT_STATUS_PROGRESS,
  type ImportProcessingStatus,
  type WhatsAppFileImport,
} from '../../types/import';

// =====================================================
// Processing Messages (rotating UX)
// =====================================================

const PROCESSING_MESSAGES: Record<string, string[]> = {
  pending: ['Preparando processamento...', 'Validando arquivo...'],
  parsing: [
    'Extraindo mensagens...',
    'Detectando formato (Android/iOS)...',
    'Processando conversas...',
    'Identificando participantes...',
  ],
  extracting_intents: [
    'Analisando com IA...',
    'Extraindo temas das conversas...',
    'Classificando sentimentos...',
    'Identificando topicos...',
    'Processando intencoes...',
  ],
  indexing_rag: [
    'Indexando para busca inteligente...',
    'Criando base de conhecimento...',
    'Quase pronto...',
  ],
};

const useRotatingMessage = (stage: string | null, interval = 2500): string => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!stage) return;
    const messages = PROCESSING_MESSAGES[stage];
    if (!messages || messages.length <= 1) return;

    setMessageIndex(0);
    const timer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, interval);

    return () => clearInterval(timer);
  }, [stage, interval]);

  if (!stage) return '';
  const messages = PROCESSING_MESSAGES[stage];
  if (!messages) return '';
  return messages[messageIndex % messages.length];
};

// =====================================================
// Import History Item
// =====================================================

interface ImportHistoryItemProps {
  item: WhatsAppFileImport;
}

const ImportHistoryItem: React.FC<ImportHistoryItemProps> = ({ item }) => {
  const isCompleted = item.processing_status === 'completed';
  const isFailed = item.processing_status === 'failed';

  return (
    <div className="ceramic-inset p-4 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-ceramic-text-secondary" />
          <span className="text-sm font-medium text-ceramic-text-primary truncate max-w-[200px]">
            {item.original_filename}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isCompleted && <CheckCircle className="w-4 h-4 text-ceramic-success" />}
          {isFailed && <AlertCircle className="w-4 h-4 text-ceramic-error" />}
          {!isCompleted && !isFailed && (
            <Loader2 className="w-4 h-4 animate-spin text-ceramic-accent" />
          )}
        </div>
      </div>

      {isCompleted && (
        <div className="flex items-center gap-4 text-xs text-ceramic-text-secondary">
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            {item.messages_imported} msgs
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {item.contacts_resolved} contatos
          </span>
          {item.messages_deduplicated > 0 && (
            <span className="text-ceramic-warning">
              {item.messages_deduplicated} duplicados
            </span>
          )}
        </div>
      )}

      {isFailed && item.processing_error && (
        <p className="text-xs text-ceramic-error mt-1">{item.processing_error}</p>
      )}

      <div className="text-xs text-ceramic-text-secondary mt-1">
        {new Date(item.created_at).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>
    </div>
  );
};

// =====================================================
// Main Component
// =====================================================

interface WhatsAppExportUploadProps {
  className?: string;
}

export const WhatsAppExportUpload: React.FC<WhatsAppExportUploadProps> = ({ className = '' }) => {
  const {
    uploadExport,
    importStatus,
    isUploading,
    isProcessing,
    error,
    imports,
    loadHistory,
    clearError,
  } = useWhatsAppImport();

  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const rotatingMessage = useRotatingMessage(
    importStatus?.processing_status || null
  );

  const progress = importStatus
    ? IMPORT_STATUS_PROGRESS[importStatus.processing_status as ImportProcessingStatus] || 0
    : 0;

  const handleFile = useCallback(
    (file: File) => {
      clearError();
      uploadExport(file);
    },
    [uploadExport, clearError]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [handleFile]
  );

  const isBusy = isUploading || isProcessing;
  const isCompleted = importStatus?.processing_status === 'completed';
  const isFailed = importStatus?.processing_status === 'failed';

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Upload Zone */}
      <div className="ceramic-card p-6 rounded-3xl">
        <div className="flex items-center gap-3 mb-4">
          <Upload className="w-5 h-5 text-ceramic-accent" />
          <h3 className="text-lg font-bold text-ceramic-text-primary">
            Importar Conversa
          </h3>
        </div>

        <p className="text-sm text-ceramic-text-secondary mb-4">
          Exporte uma conversa do WhatsApp e importe aqui. O AICA analisa automaticamente
          as mensagens sem armazenar o texto original.
        </p>

        {/* Instructions */}
        <div className="ceramic-inset p-4 rounded-xl mb-4 space-y-2">
          <p className="text-xs font-bold text-ceramic-text-primary">Como exportar:</p>
          <ol className="text-xs text-ceramic-text-secondary space-y-1 list-decimal list-inside">
            <li>Abra a conversa no WhatsApp</li>
            <li>Toque nos 3 pontos (Android) ou nome do contato (iOS)</li>
            <li>Selecione "Exportar conversa" → "Sem midia"</li>
            <li>Salve o arquivo .txt ou .zip</li>
          </ol>
        </div>

        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !isBusy && fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer
            ${isDragOver
              ? 'border-ceramic-accent bg-ceramic-accent/5 scale-[1.02]'
              : 'border-ceramic-text-secondary/10 hover:border-ceramic-accent/50 hover:bg-ceramic-cool'
            }
            ${isBusy ? 'pointer-events-none opacity-60' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.zip"
            onChange={handleInputChange}
            className="hidden"
          />

          <AnimatePresence mode="wait">
            {!isBusy && !isCompleted && !isFailed && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Upload className="w-10 h-10 text-ceramic-text-secondary mx-auto mb-3" />
                <p className="text-sm font-medium text-ceramic-text-primary mb-1">
                  Arraste seu arquivo de exportacao
                </p>
                <p className="text-xs text-ceramic-text-secondary">
                  ou clique para selecionar (.txt ou .zip)
                </p>
              </motion.div>
            )}

            {isUploading && (
              <motion.div
                key="uploading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Loader2 className="w-10 h-10 animate-spin text-ceramic-accent mx-auto mb-3" />
                <p className="text-sm font-medium text-ceramic-text-primary">
                  Enviando arquivo...
                </p>
              </motion.div>
            )}

            {isProcessing && importStatus && (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full"
              >
                <Loader2 className="w-10 h-10 animate-spin text-ceramic-accent mx-auto mb-3" />
                <p className="text-sm font-medium text-ceramic-text-primary mb-3">
                  {rotatingMessage || IMPORT_STATUS_LABELS[importStatus.processing_status as ImportProcessingStatus]}
                </p>

                {/* Progress bar */}
                <div className="w-full max-w-xs mx-auto">
                  <div className="flex items-center justify-between text-xs text-ceramic-text-secondary mb-1">
                    <span>
                      {importStatus.messages_imported > 0
                        ? `${importStatus.messages_imported} mensagens`
                        : importStatus.total_messages_parsed > 0
                          ? `${importStatus.total_messages_parsed} encontradas`
                          : 'Processando...'
                      }
                    </span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-ceramic-inset rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-ceramic-accent rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {isCompleted && importStatus && (
              <motion.div
                key="completed"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                <CheckCircle className="w-10 h-10 text-ceramic-success mx-auto mb-3" />
                <p className="text-sm font-bold text-ceramic-success mb-3">
                  Importacao concluida!
                </p>
                <div className="flex items-center justify-center gap-4 text-xs text-ceramic-text-secondary">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {importStatus.messages_imported} importadas
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {importStatus.contacts_resolved} contatos
                  </span>
                  {importStatus.messages_deduplicated > 0 && (
                    <span className="flex items-center gap-1">
                      <BarChart3 className="w-3 h-3" />
                      {importStatus.messages_deduplicated} duplicados ignorados
                    </span>
                  )}
                </div>
                {importStatus.participants.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-center mt-3">
                    {importStatus.participants.slice(0, 5).map((p, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-ceramic-inset rounded text-xs text-ceramic-text-secondary"
                      >
                        {p}
                      </span>
                    ))}
                    {importStatus.participants.length > 5 && (
                      <span className="px-2 py-0.5 text-xs text-ceramic-text-secondary">
                        +{importStatus.participants.length - 5}
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {isFailed && (
              <motion.div
                key="failed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <AlertCircle className="w-10 h-10 text-ceramic-error mx-auto mb-3" />
                <p className="text-sm font-bold text-ceramic-error mb-1">
                  Erro no processamento
                </p>
                <p className="text-xs text-ceramic-text-secondary">
                  {importStatus?.processing_error || 'Tente novamente'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error Banner */}
        {error && !isFailed && (
          <div className="mt-4 p-3 bg-ceramic-error/10 border border-ceramic-error/20 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-ceramic-error mt-0.5 shrink-0" />
            <p className="text-sm text-ceramic-error flex-1">{error}</p>
            <button onClick={clearError} className="shrink-0">
              <X className="w-4 h-4 text-ceramic-error" />
            </button>
          </div>
        )}

        {/* Privacy Notice */}
        <div className="mt-4 p-3 bg-ceramic-info/10 border border-ceramic-info/20 rounded-xl">
          <p className="text-xs text-ceramic-info">
            Suas mensagens originais nao sao armazenadas. O AICA extrai apenas resumos
            anonimizados e vetores semanticos para analise.
          </p>
        </div>
      </div>

      {/* Import History */}
      {imports.length > 0 && (
        <div className="ceramic-card p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-5 h-5 text-ceramic-accent" />
            <h3 className="text-lg font-bold text-ceramic-text-primary">
              Historico de Importacoes
            </h3>
            <span className="text-xs text-ceramic-text-secondary">({imports.length})</span>
          </div>

          <div className="space-y-3">
            {imports.map((item) => (
              <ImportHistoryItem key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppExportUpload;
