/**
 * Statement Upload Component
 *
 * Drag-and-drop PDF upload with processing status display.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';

const log = createNamespacedLogger('StatementUpload');
import { pdfProcessingService } from '../services/pdfProcessingService';
import { statementService } from '../services/statementService';
import { addXP, awardAchievement } from '../../../services/gamificationService';
import type { UploadProgress, FinanceStatement } from '../types';

// =====================================================
// Creative Processing Messages
// =====================================================

const PROCESSING_MESSAGES = {
  uploading: [
    'Verificando arquivo...',
    'Calculando checksum...',
    'Preparando upload...',
  ],
  creating: [
    'Criando registro no banco...',
    'Preparando metadados...',
    'Iniciando processamento...',
  ],
  storage: [
    'Fazendo upload seguro...',
    'Salvando no Supabase Storage...',
    'Armazenando PDF...',
  ],
  extracting: [
    'Extraindo texto do PDF...',
    'Analisando estrutura do extrato...',
    'Aica está lendo suas transações...',
    'Processando páginas do documento...',
    'Identificando padrões financeiros...',
  ],
  ai_parsing: [
    'Gemini está interpretando os dados...',
    'IA categorizando transações...',
    'Identificando receitas e despesas...',
    'Calculando saldos...',
    'Extraindo informações bancárias...',
  ],
  saving: [
    'Salvando transações...',
    'Persistindo dados financeiros...',
    'Finalizando processamento...',
    'Quase pronto...',
  ],
};

// =====================================================
// Custom Hook: Message Rotation
// =====================================================

/**
 * Hook that cycles through messages for a given stage
 * Creates a more dynamic and engaging user experience during processing
 */
const useRotatingMessage = (stage: string | null, interval = 2500): string => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!stage) return;

    const messages = PROCESSING_MESSAGES[stage as keyof typeof PROCESSING_MESSAGES];
    if (!messages || messages.length <= 1) return;

    const timer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, interval);

    return () => clearInterval(timer);
  }, [stage, interval]);

  useEffect(() => {
    // Reset index when stage changes
    setMessageIndex(0);
  }, [stage]);

  if (!stage) return '';
  const messages = PROCESSING_MESSAGES[stage as keyof typeof PROCESSING_MESSAGES];
  return messages ? messages[messageIndex] : '';
};

// =====================================================
// Types
// =====================================================

interface StatementUploadProps {
  userId: string;
  onUploadComplete: (statement: FinanceStatement) => void;
  onError?: (error: string) => void;
}

interface FileWithMetadata {
  file: File;
  bankName: string;
  month: string;
  year: string;
  progress: UploadProgress | null;
  statementId?: string;
  analyzed: boolean;
  processingStage?: string; // Added for message rotation
}

// =====================================================
// Component
// =====================================================

export const StatementUpload: React.FC<StatementUploadProps> = ({
  userId,
  onUploadComplete,
  onError,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<FileWithMetadata[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoProcessTriggered, setAutoProcessTriggered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-process files when all metadata is complete
  useEffect(() => {
    // Only auto-process if:
    // 1. We have files
    // 2. Analysis is done
    // 3. Not already processing
    // 4. Haven't triggered auto-process yet
    // 5. All files have complete metadata
    if (
      files.length > 0 &&
      !isAnalyzing &&
      !isProcessing &&
      !autoProcessTriggered &&
      files.every(f => f.bankName && f.month && f.year && !f.progress)
    ) {
      setAutoProcessTriggered(true);
      // Small delay for better UX (user can see metadata was extracted)
      setTimeout(() => {
        processAllFiles();
      }, 500);
    }
  }, [files, isAnalyzing, isProcessing, autoProcessTriggered]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    await handleFilesSelect(droppedFiles);
  }, [userId]);

  const handleFileInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (selectedFiles && selectedFiles.length > 0) {
        await handleFilesSelect(Array.from(selectedFiles));
      }
    },
    [userId]
  );

  const handleFilesSelect = async (selectedFiles: File[]) => {
    const validFiles: FileWithMetadata[] = [];

    for (const file of selectedFiles) {
      // Validate file type
      if (file.type !== 'application/pdf') {
        onError?.(`${file.name}: Apenas arquivos PDF são aceitos.`);
        continue;
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        onError?.(`${file.name}: Arquivo muito grande. Limite: 10MB`);
        continue;
      }

      validFiles.push({
        file,
        bankName: '',
        month: '',
        year: '',
        progress: null,
        analyzed: false,
      });
    }

    setFiles((prev) => [...prev, ...validFiles]);

    // Auto-analyze metadata for each file
    if (validFiles.length > 0) {
      await analyzeFilesMetadata(validFiles);
    }
  };

  const analyzeFilesMetadata = async (newFiles: FileWithMetadata[]) => {
    setIsAnalyzing(true);

    for (let i = 0; i < newFiles.length; i++) {
      const fileWithMeta = newFiles[i];

      try {
        // Extract and parse PDF with AI
        const parsed = await pdfProcessingService.processPDFFile(fileWithMeta.file, userId);

        // Extract month and year from periodStart (format: YYYY-MM-DD)
        // Parse manually to avoid timezone issues
        const [yearStr, monthStr] = parsed.periodStart.split('-');
        const month = monthStr;  // Already in format "01" to "12"
        const year = yearStr;

        // Update metadata in state
        setFiles((prev) =>
          prev.map((f) =>
            f.file === fileWithMeta.file
              ? {
                  ...f,
                  bankName: parsed.bankName || '',
                  month,
                  year,
                  analyzed: true,
                }
              : f
          )
        );
      } catch (error) {
        log.error(`Error analyzing ${fileWithMeta.file.name}:`, error);
        // Leave as not analyzed so user can fill manually
        setFiles((prev) =>
          prev.map((f) =>
            f.file === fileWithMeta.file
              ? { ...f, analyzed: false }
              : f
          )
        );
      }
    }

    setIsAnalyzing(false);
  };

  const updateFileProgress = (index: number, progress: UploadProgress | null, processingStage?: string) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, progress, processingStage } : f))
    );
  };

  const updateFileMetadata = (index: number, field: 'bankName' | 'month' | 'year', value: string) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, [field]: value } : f))
    );
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const processAllFiles = async () => {
    // Validate all files have metadata
    const missingMetadata = files.some(f => !f.bankName || !f.month || !f.year);
    if (missingMetadata) {
      onError?.('Preencha banco, mês e ano para todos os arquivos antes de processar.');
      return;
    }

    setIsProcessing(true);

    // Process each file sequentially
    for (let i = 0; i < files.length; i++) {
      const fileWithMeta = files[i];

      try {
        // Step 1: Calculate hash
        updateFileProgress(i, { stage: 'uploading', progress: 10, message: 'Verificando...' }, 'uploading');
        const fileHash = await pdfProcessingService.calculateFileHash(fileWithMeta.file);

        // Check duplicates
        const isDuplicate = await statementService.checkDuplicate(userId, fileHash);
        if (isDuplicate) {
          updateFileProgress(i, { stage: 'error', progress: 0, message: 'Já enviado' });
          continue;
        }

        // Step 2: Create statement
        updateFileProgress(i, { stage: 'uploading', progress: 20, message: 'Criando registro...' }, 'creating');
        const statement = await statementService.createStatement({
          user_id: userId,
          file_name: fileWithMeta.file.name,
          file_size_bytes: fileWithMeta.file.size,
          file_hash: fileHash,
          processing_status: 'processing',
        });

        // Step 3: Upload to storage
        updateFileProgress(i, { stage: 'uploading', progress: 30, message: 'Upload...' }, 'storage');
        try {
          const storagePath = await statementService.uploadPDF(userId, fileWithMeta.file);
          await statementService.updateStatement(statement.id, { storage_path: storagePath });
        } catch (uploadError) {
          log.warn('Storage upload failed:', uploadError);
        }

        // Step 4: Extract and parse PDF
        updateFileProgress(i, { stage: 'extracting', progress: 50, message: 'Extraindo texto...' }, 'extracting');

        // Step 5: AI Parsing
        updateFileProgress(i, { stage: 'extracting', progress: 70, message: 'IA analisando...' }, 'ai_parsing');
        const parsed = await pdfProcessingService.processPDFFile(fileWithMeta.file, userId);

        // Override with user metadata
        // Calculate last day of month (month is 1-indexed, but Date expects 0-indexed)
        const lastDay = new Date(
          parseInt(fileWithMeta.year),
          parseInt(fileWithMeta.month),  // Using next month's 0th day gives us last day of current month
          0
        ).getDate();
        const periodStart = `${fileWithMeta.year}-${fileWithMeta.month}-01`;
        const periodEnd = `${fileWithMeta.year}-${fileWithMeta.month}-${lastDay.toString().padStart(2, '0')}`;

        const enhancedParsed = {
          ...parsed,
          bankName: fileWithMeta.bankName,
          periodStart,
          periodEnd,
        };

        // Step 6: Save
        updateFileProgress(i, { stage: 'saving', progress: 90, message: 'Salvando...' }, 'saving');
        const markdown = pdfProcessingService.generateMarkdown(enhancedParsed);
        await statementService.saveParsedData(statement.id, userId, enhancedParsed, markdown);

        // Complete
        updateFileProgress(i, { stage: 'complete', progress: 100, message: 'Concluído!' });

        // Award XP
        await addXP(userId, 25);
        await awardAchievement(userId, 'first_finance_upload');

        // Notify completion
        const updatedStatement = await statementService.getStatement(statement.id);
        if (updatedStatement) {
          onUploadComplete(updatedStatement);
        }
      } catch (error) {
        log.error(`Error processing file ${i}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Erro';
        updateFileProgress(i, { stage: 'error', progress: 0, message: errorMessage });
      }
    }

    setIsProcessing(false);

    // Reset after delay
    setTimeout(() => {
      setFiles([]);
      setAutoProcessTriggered(false);
    }, 3000);
  };

  const clearAll = () => {
    setFiles([]);
    setAutoProcessTriggered(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getStatusIcon = () => {
    return <Loader2 className="w-4 h-4 text-ceramic-info animate-spin" />;
  };

  /**
   * FileProgressDisplay - Shows rotating messages during processing
   */
  const FileProgressDisplay: React.FC<{ fileWithMeta: FileWithMetadata }> = ({ fileWithMeta }) => {
    const rotatingMessage = useRotatingMessage(fileWithMeta.processingStage || null, 2500);

    if (!fileWithMeta.progress) return null;

    const displayMessage = rotatingMessage || fileWithMeta.progress.message;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <p className="text-xs font-medium text-ceramic-text-primary transition-all duration-300">
            {displayMessage}
          </p>
        </div>
        {fileWithMeta.progress.stage !== 'error' && fileWithMeta.progress.stage !== 'complete' && (
          <div className="ceramic-trough p-1 rounded-full">
            <div
              className="h-1.5 rounded-full bg-ceramic-warning transition-all duration-500"
              style={{ width: `${fileWithMeta.progress.progress}%` }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      {files.length === 0 && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            ceramic-inset p-8 rounded-2xl cursor-pointer transition-all duration-200
            flex flex-col items-center justify-center gap-4 min-h-[200px]
            ${isDragging ? 'bg-ceramic-info/10 border-ceramic-warning/30' : 'hover:bg-ceramic-highlight'}
          `}
        >
          <div className={`
            ceramic-concave w-16 h-16 flex items-center justify-center
            ${isDragging ? 'scale-110' : ''}
          `}>
            <Upload className={`w-8 h-8 ${isDragging ? 'text-ceramic-info' : 'text-ceramic-text-primary'}`} />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-ceramic-text-primary">
              {isDragging ? 'Solte os arquivos aqui' : 'Arraste seus extratos PDF aqui'}
            </p>
            <p className="text-xs text-ceramic-text-secondary mt-1">
              ou clique para selecionar • Múltiplos arquivos aceitos • Max. 10MB cada
            </p>
          </div>
        </div>
      )}

      {/* Files List */}
      {files.length > 0 && (
        <div className="ceramic-card p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-ceramic-text-secondary/10">
            <div>
              <h3 className="text-sm font-bold text-ceramic-text-primary">
                Extratos Selecionados
              </h3>
              <p className="text-xs text-ceramic-text-secondary mt-1">
                {files.length} {files.length === 1 ? 'arquivo' : 'arquivos'}
              </p>
            </div>
            <button
              onClick={clearAll}
              disabled={isProcessing || isAnalyzing}
              className="ceramic-inset px-3 py-1.5 hover:scale-105 transition-transform disabled:opacity-50"
            >
              <span className="text-xs font-bold text-ceramic-text-secondary">Limpar</span>
            </button>
          </div>

          {/* Files */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {files.map((fileWithMeta, index) => (
              <div key={index} className="ceramic-tray p-4 space-y-3">
                {/* File Header */}
                <div className="flex items-center gap-3">
                  <div className="ceramic-concave w-10 h-10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-ceramic-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ceramic-text-primary truncate">
                      {fileWithMeta.file.name}
                    </p>
                    <p className="text-xs text-ceramic-text-secondary">
                      {(fileWithMeta.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  {!fileWithMeta.progress && (
                    <button
                      onClick={() => removeFile(index)}
                      disabled={isProcessing || isAnalyzing}
                      className="ceramic-inset w-8 h-8 flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50"
                    >
                      <X className="w-4 h-4 text-ceramic-text-secondary" />
                    </button>
                  )}
                </div>

                {/* Metadata Form or Analyzing State */}
                {!fileWithMeta.progress && (
                  <>
                    {isAnalyzing && !fileWithMeta.analyzed ? (
                      <div className="flex items-center gap-2 py-3">
                        <Loader2 className="w-4 h-4 text-ceramic-info animate-spin" />
                        <p className="text-xs font-medium text-ceramic-text-secondary">
                          Analisando extrato com IA...
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {fileWithMeta.analyzed && (
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-4 h-4 text-ceramic-success" />
                            <p className="text-xs font-medium text-ceramic-success">
                              Metadados extraídos automaticamente
                            </p>
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={fileWithMeta.bankName}
                            onChange={(e) => updateFileMetadata(index, 'bankName', e.target.value)}
                            placeholder="Banco"
                            disabled={isProcessing || isAnalyzing}
                            className="ceramic-inset px-3 py-2 text-xs text-ceramic-text-primary placeholder:text-ceramic-text-secondary/40 focus:outline-none disabled:opacity-50"
                          />
                          <select
                            value={fileWithMeta.month}
                            onChange={(e) => updateFileMetadata(index, 'month', e.target.value)}
                            disabled={isProcessing || isAnalyzing}
                            className="ceramic-inset px-3 py-2 text-xs text-ceramic-text-primary focus:outline-none disabled:opacity-50"
                          >
                            <option value="">Mês</option>
                            <option value="01">Jan</option>
                            <option value="02">Fev</option>
                            <option value="03">Mar</option>
                            <option value="04">Abr</option>
                            <option value="05">Mai</option>
                            <option value="06">Jun</option>
                            <option value="07">Jul</option>
                            <option value="08">Ago</option>
                            <option value="09">Set</option>
                            <option value="10">Out</option>
                            <option value="11">Nov</option>
                            <option value="12">Dez</option>
                          </select>
                          <select
                            value={fileWithMeta.year}
                            onChange={(e) => updateFileMetadata(index, 'year', e.target.value)}
                            disabled={isProcessing || isAnalyzing}
                            className="ceramic-inset px-3 py-2 text-xs text-ceramic-text-primary focus:outline-none disabled:opacity-50"
                          >
                            <option value="">Ano</option>
                            {Array.from({ length: 4 }, (_, i) => {
                              const year = new Date().getFullYear() - i;
                              return <option key={year} value={String(year)}>{year}</option>;
                            })}
                          </select>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Progress - Now with rotating messages! */}
                {fileWithMeta.progress && <FileProgressDisplay fileWithMeta={fileWithMeta} />}
              </div>
            ))}
          </div>

          {/* Status Indicator - Only shows during analysis or manual processing */}
          {(isAnalyzing || isProcessing) && (
            <div className="ceramic-tray px-6 py-3 flex items-center justify-center gap-3">
              <Loader2 className="w-4 h-4 text-ceramic-info animate-spin" />
              <span className="text-sm font-bold text-ceramic-text-primary">
                {isAnalyzing
                  ? 'Analisando PDFs com IA...'
                  : 'Processamento automático iniciado...'}
              </span>
            </div>
          )}

          {/* Manual Process Button - Only shown if analysis failed or user edited metadata */}
          {!isAnalyzing && !isProcessing && !autoProcessTriggered && files.some(f => !f.bankName || !f.month || !f.year) && (
            <button
              onClick={processAllFiles}
              disabled={files.some(f => !f.bankName || !f.month || !f.year)}
              className="w-full ceramic-card px-6 py-3 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-sm font-bold text-ceramic-accent">
                Complete os metadados para processar
              </span>
            </button>
          )}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />
    </div>
  );
};

export default StatementUpload;
