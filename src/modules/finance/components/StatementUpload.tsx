/**
 * Statement Upload Component
 *
 * Drag-and-drop PDF upload with processing status display.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';

const log = createNamespacedLogger('StatementUpload');
import { pdfProcessingService, type PDFProgressUpdate } from '../services/pdfProcessingService';
import { statementService } from '../services/statementService';
import { csvParserService } from '../services/csvParserService';
import { addXP, awardAchievement } from '../../../services/gamificationService';
import type { CSVParseResult } from '../services/csvParserService';
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
  analysisProgress?: PDFProgressUpdate | null; // Progressive analysis feedback
  transactionCount?: number; // Extracted transaction count for display
  cachedParsed?: import('../types').ParsedStatement | null; // Cache AI parsing result to avoid duplicate calls
  cachedCSV?: CSVParseResult | null; // Cached CSV parse result
}

// =====================================================
// Helper Functions (module-scoped)
// =====================================================

const getStageColor = (stage: string): string => {
  switch (stage) {
    case 'complete':
    case 'completed':
    case 'success':
      return 'text-ceramic-success';
    case 'error':
    case 'failed':
      return 'text-ceramic-error';
    case 'categorizing':
    case 'processing':
      return 'text-ceramic-warning';
    default:
      return 'text-ceramic-info';
  }
};

const getStatusIcon = (stage?: string) => {
  const color = getStageColor(stage || '');
  if (stage === 'complete' || stage === 'completed' || stage === 'success') {
    return <CheckCircle className={`w-4 h-4 ${color}`} />;
  }
  if (stage === 'error' || stage === 'failed') {
    return <AlertCircle className={`w-4 h-4 ${color}`} />;
  }
  return <Loader2 className={`w-4 h-4 ${color} animate-spin`} />;
};

// =====================================================
// Sub-Components (module-scoped to avoid remount)
// =====================================================

interface AnalysisProgressDisplayProps {
  progress: PDFProgressUpdate;
}

/**
 * AnalysisProgressDisplay - Smooth progress during AI analysis with elapsed time
 */
const AnalysisProgressDisplay: React.FC<AnalysisProgressDisplayProps> = ({ progress }) => {
  const [smoothProgress, setSmoothProgress] = useState(0);

  useEffect(() => {
    const target = progress.progress || 0;
    if (target <= smoothProgress) return;
    const timer = setInterval(() => {
      setSmoothProgress(prev => {
        const next = prev + 0.3;
        if (next >= target) { clearInterval(timer); return target; }
        return next;
      });
    }, 50);
    return () => clearInterval(timer);
  }, [progress.progress]);

  return (
    <>
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 text-ceramic-accent animate-spin flex-shrink-0" />
        <p className="text-xs font-medium text-ceramic-text-primary transition-all duration-300">
          {progress.message}
        </p>
      </div>
      {progress.detail && (
        <p className="text-[10px] text-ceramic-text-secondary ml-6">
          {progress.detail}
        </p>
      )}
      <div className="ceramic-trough p-1 rounded-full">
        <div
          className="h-1.5 rounded-full bg-ceramic-accent transition-[width] duration-300 ease-out"
          style={{ width: `${smoothProgress}%` }}
        />
      </div>
    </>
  );
};

interface FileProgressDisplayProps {
  fileWithMeta: FileWithMetadata;
}

/**
 * FileProgressDisplay - Shows rotating messages, elapsed time, and step indicator
 */
const FileProgressDisplay: React.FC<FileProgressDisplayProps> = ({ fileWithMeta }) => {
  const rotatingMessage = useRotatingMessage(fileWithMeta.processingStage || null, 2500);
  const [elapsed, setElapsed] = useState(0);
  const [smoothProgress, setSmoothProgress] = useState(0);

  // Elapsed time counter
  useEffect(() => {
    if (!fileWithMeta.progress || fileWithMeta.progress.stage === 'complete' || fileWithMeta.progress.stage === 'error') {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [fileWithMeta.progress?.stage === 'complete', fileWithMeta.progress?.stage === 'error', !fileWithMeta.progress]);

  // Smooth progress interpolation — gradually fills between target stages
  useEffect(() => {
    const target = fileWithMeta.progress?.progress || 0;
    if (target <= smoothProgress) { setSmoothProgress(target); return; }
    const timer = setInterval(() => {
      setSmoothProgress(prev => {
        const next = prev + 0.5;
        if (next >= target) { clearInterval(timer); return target; }
        return next;
      });
    }, 50);
    return () => clearInterval(timer);
  }, [fileWithMeta.progress?.progress]);

  if (!fileWithMeta.progress) return null;

  const displayMessage = rotatingMessage || fileWithMeta.progress.message;
  const isActive = fileWithMeta.progress.stage !== 'error' && fileWithMeta.progress.stage !== 'complete';

  // Step mapping for user-friendly display
  const STEP_MAP: Record<string, { step: number; total: number; label: string }> = {
    uploading: { step: 1, total: 5, label: 'Verificação' },
    creating: { step: 2, total: 5, label: 'Registro' },
    storage: { step: 2, total: 5, label: 'Upload' },
    extracting: { step: 3, total: 5, label: 'Extração' },
    ai_parsing: { step: 4, total: 5, label: 'Análise IA' },
    saving: { step: 5, total: 5, label: 'Salvando' },
  };
  const stepInfo = STEP_MAP[fileWithMeta.processingStage || ''];

  const formatElapsed = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${s % 60}s`;

  return (
    <div className="space-y-2">
      {/* Step indicator + elapsed time */}
      {isActive && (
        <div className="flex items-center justify-between">
          {stepInfo && (
            <span className="text-[10px] font-bold text-ceramic-text-secondary uppercase tracking-wider">
              Passo {stepInfo.step}/{stepInfo.total} — {stepInfo.label}
            </span>
          )}
          <span className="text-[10px] text-ceramic-text-secondary tabular-nums">
            {formatElapsed(elapsed)}
          </span>
        </div>
      )}

      {/* Message + icon */}
      <div className="flex items-center gap-2">
        {getStatusIcon(fileWithMeta.progress?.stage)}
        <p className="text-xs font-medium text-ceramic-text-primary transition-all duration-300 flex-1">
          {displayMessage}
        </p>
        {fileWithMeta.progress.stage === 'complete' && (
          <span className="text-[10px] text-ceramic-success">{formatElapsed(elapsed)}</span>
        )}
      </div>

      {/* Smooth progress bar */}
      {isActive && (
        <div className="ceramic-trough p-1 rounded-full">
          <div
            className="h-1.5 rounded-full bg-ceramic-warning transition-[width] duration-300 ease-out"
            style={{ width: `${smoothProgress}%` }}
          />
        </div>
      )}
    </div>
  );
};

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
  const [successCount, setSuccessCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processAllFiles = useCallback(async () => {
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

        // CSV processing path — bypass PDF pipeline entirely
        const isCSV = fileWithMeta.file.name.endsWith('.csv') || fileWithMeta.file.type === 'text/csv';

        if (isCSV && fileWithMeta.cachedCSV) {
          const csvParsed = fileWithMeta.cachedCSV;
          const periodStart = `${fileWithMeta.year}-${fileWithMeta.month}-01`;
          const lastDay = new Date(parseInt(fileWithMeta.year!), parseInt(fileWithMeta.month!), 0).getDate();
          const periodEnd = `${fileWithMeta.year}-${fileWithMeta.month}-${String(lastDay).padStart(2, '0')}`;

          // Check period overlap — info only, continue with dedup
          const { hasOverlap, overlapping } = await statementService.checkPeriodOverlap(userId, periodStart, periodEnd);
          if (hasOverlap) {
            const names = overlapping.map(s => s.file_name).join(', ');
            log.info(`[Upload] Período sobreposto com: ${names} — continuando com dedup`);
            updateFileProgress(i, { stage: 'uploading', progress: 15, message: `Adicionando transações novas (${names} já existe)` }, 'uploading');
          }

          // Create statement record
          updateFileProgress(i, { stage: 'uploading', progress: 20, message: 'Criando registro...' }, 'creating');
          const statement = await statementService.createStatement({
            user_id: userId,
            file_name: fileWithMeta.file.name,
            file_size_bytes: fileWithMeta.file.size,
            file_hash: fileHash,
            processing_status: 'processing',
          });

          const enhancedParsed = {
            bankName: fileWithMeta.bankName,
            accountType: 'checking' as const,
            periodStart,
            periodEnd,
            openingBalance: 0,
            closingBalance: 0,
            currency: 'BRL',
            transactions: csvParsed.transactions,
          };

          updateFileProgress(i, { stage: 'saving', progress: 90, message: 'Salvando CSV...' }, 'saving');
          const markdown = `# Extrato CSV — ${fileWithMeta.bankName} ${fileWithMeta.month}/${fileWithMeta.year}\n\n${csvParsed.transactions.length} transações importadas`;
          await statementService.saveParsedData(statement.id, userId, enhancedParsed, markdown);

          // Show inserted vs skipped count
          const csvStmtTransactions = await statementService.getStatementTransactions(statement.id);
          const csvInsertedCount = csvStmtTransactions.length;
          const csvTotalParsed = enhancedParsed.transactions.length;
          const csvSkippedCount = csvTotalParsed - csvInsertedCount;
          const csvCompleteMsg = csvSkippedCount > 0
            ? `${csvInsertedCount} novas transações (${csvSkippedCount} já existiam)`
            : `${csvInsertedCount} transações importadas`;
          updateFileProgress(i, { stage: 'complete', progress: 100, message: csvCompleteMsg });
          await addXP(userId, 25);

          const updatedStatement = await statementService.getStatement(statement.id);
          if (updatedStatement) onUploadComplete(updatedStatement);
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

        // Step 4: Use cached parsed result or re-parse if not available
        let parsed;
        if (fileWithMeta.cachedParsed) {
          updateFileProgress(i, { stage: 'extracting', progress: 75, message: 'Usando análise anterior...' }, 'ai_parsing');
          parsed = fileWithMeta.cachedParsed;
        } else {
          updateFileProgress(i, { stage: 'extracting', progress: 40, message: 'Extraindo texto do PDF...' }, 'extracting');
          // Progress callback for AI parsing stage
          const onProgress = (update: PDFProgressUpdate) => {
            const aiProgress = 50 + (update.progress / 100) * 35; // Map 0-100 → 50-85
            updateFileProgress(i, { stage: 'extracting', progress: aiProgress, message: update.message }, 'ai_parsing');
          };
          parsed = await pdfProcessingService.processPDFFile(fileWithMeta.file, userId, onProgress);
        }

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

        // Show inserted vs skipped count
        const pdfStmtTransactions = await statementService.getStatementTransactions(statement.id);
        const pdfInsertedCount = pdfStmtTransactions.length;
        const pdfTotalParsed = enhancedParsed.transactions?.length || 0;
        const pdfSkippedCount = pdfTotalParsed - pdfInsertedCount;
        const pdfCompleteMsg = pdfSkippedCount > 0
          ? `${pdfInsertedCount} novas transações (${pdfSkippedCount} já existiam)`
          : `${pdfInsertedCount} transações importadas`;
        updateFileProgress(i, { stage: 'complete', progress: 100, message: pdfCompleteMsg });

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

    // Count successful imports
    const completed = files.filter((_, idx) => {
      const f = files[idx];
      return f.progress?.stage === 'complete';
    }).length;
    if (completed > 0) {
      setSuccessCount(completed);
    }

    // Reset after delay (longer so user can see success)
    setTimeout(() => {
      setFiles([]);
      setAutoProcessTriggered(false);
      setSuccessCount(0);
    }, 6000);
  }, [files, userId, onUploadComplete, onError]);

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
  }, [files, isAnalyzing, isProcessing, autoProcessTriggered, processAllFiles]);

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
      const isCSV = file.type === 'text/csv' || file.name.endsWith('.csv');
      const isPDF = file.type === 'application/pdf';
      if (!isPDF && !isCSV) {
        onError?.(`${file.name}: Apenas arquivos PDF ou CSV são aceitos.`);
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
        // CSV routing — detect and parse CSV before attempting PDF processing
        const isCSV = fileWithMeta.file.name.endsWith('.csv') || fileWithMeta.file.type === 'text/csv';

        if (isCSV) {
          try {
            const csvResult = await csvParserService.parseCSV(fileWithMeta.file);
            const now = new Date();
            const firstDate = csvResult.transactions[0]?.date;
            const [yearStr, monthStr] = firstDate ? firstDate.split('-') : [String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, '0')];

            setFiles((prev) =>
              prev.map((f) =>
                f.file === fileWithMeta.file
                  ? {
                      ...f,
                      bankName: csvResult.bankName || 'Nubank',
                      month: monthStr,
                      year: yearStr,
                      analyzed: true,
                      transactionCount: csvResult.transactions.length,
                      cachedCSV: csvResult,
                    }
                  : f
              )
            );
            continue;
          } catch (err) {
            log.error('CSV parse error:', err);
            onError?.(`${fileWithMeta.file.name}: Erro ao processar CSV`);
            continue;
          }
        }

        // Progressive callback — updates UI in real-time as stages complete
        const onProgress = (update: PDFProgressUpdate) => {
          setFiles((prev) =>
            prev.map((f) =>
              f.file === fileWithMeta.file
                ? { ...f, analysisProgress: update }
                : f
            )
          );
        };

        // Extract and parse PDF with AI (now with progressive feedback)
        const parsed = await pdfProcessingService.processPDFFile(fileWithMeta.file, userId, onProgress);

        // Extract month and year from periodStart (format: YYYY-MM-DD)
        const [yearStr, monthStr] = parsed.periodStart.split('-');
        const month = monthStr;
        const year = yearStr;

        // Update metadata in state and cache parsed result to avoid re-parsing
        setFiles((prev) =>
          prev.map((f) =>
            f.file === fileWithMeta.file
              ? {
                  ...f,
                  bankName: parsed.bankName || '',
                  month,
                  year,
                  analyzed: true,
                  analysisProgress: null,
                  transactionCount: parsed.transactions?.length || 0,
                  cachedParsed: parsed,
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
              ? { ...f, analyzed: false, analysisProgress: null }
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

  const clearAll = () => {
    setFiles([]);
    setAutoProcessTriggered(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
              {isDragging ? 'Solte os arquivos aqui' : 'Arraste seus extratos PDF ou CSV aqui'}
            </p>
            <p className="text-xs text-ceramic-text-secondary mt-1">
              PDF e CSV aceitos • Múltiplos arquivos aceitos • Max. 10MB cada
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
                      <div className="space-y-2 py-2">
                        {/* Progressive analysis feedback */}
                        {fileWithMeta.analysisProgress ? (
                          <AnalysisProgressDisplay progress={fileWithMeta.analysisProgress} />
                        ) : (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 text-ceramic-info animate-spin" />
                            <p className="text-xs font-medium text-ceramic-text-secondary">
                              Aguardando processamento...
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {fileWithMeta.analyzed && (
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-ceramic-success" />
                              <p className="text-xs font-medium text-ceramic-success">
                                Metadados extraídos automaticamente
                              </p>
                            </div>
                            {fileWithMeta.transactionCount != null && fileWithMeta.transactionCount > 0 && (
                              <span className="text-[10px] font-bold text-ceramic-accent bg-ceramic-accent/10 px-2 py-0.5 rounded-full">
                                {fileWithMeta.transactionCount} transações
                              </span>
                            )}
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

      {/* Success Banner */}
      {successCount > 0 && !isProcessing && (
        <div className="ceramic-card bg-ceramic-success/10 border border-ceramic-success/20 p-4 flex items-center gap-3 animate-in fade-in duration-300">
          <CheckCircle className="w-6 h-6 text-ceramic-success flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-ceramic-success">
              {successCount === 1
                ? 'Extrato importado com sucesso!'
                : `${successCount} extratos importados com sucesso!`}
            </p>
            <p className="text-xs text-ceramic-text-secondary mt-0.5">
              As transações já estão disponíveis no painel financeiro.
            </p>
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.csv,text/csv"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />
    </div>
  );
};

export default StatementUpload;
