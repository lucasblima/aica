/**
 * Drive File Picker for Finance
 *
 * Modal component for browsing Google Drive and importing
 * financial statements (CSV, PDF, Google Sheets).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import {
  X,
  Search,
  FileText,
  FileSpreadsheet,
  File,
  Folder,
  Clock,
  Loader2,
  Download,
  AlertCircle,
  HardDrive,
  ChevronRight,
} from 'lucide-react';
import {
  searchFiles,
  getRecentFiles,
  getFileContent,
  type DriveFile,
} from '@/services/driveService';

const log = createNamespacedLogger('DriveFilePicker');

// =====================================================
// Types
// =====================================================

interface DriveFilePickerProps {
  onImport: (file: DriveFile, content: string) => Promise<void>;
  onClose: () => void;
}

type TabId = 'recent' | 'search';

// Supported MIME types for Finance import
const FINANCE_MIME_TYPES = new Set([
  'text/csv',
  'application/pdf',
  'application/vnd.google-apps.spreadsheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/x-ofx',
  'application/ofx',
]);

const IMPORTABLE_TYPES = new Set([
  'text/csv',
  'application/vnd.google-apps.spreadsheet',
  'text/plain',
]);

// =====================================================
// Helpers
// =====================================================

function getFileIcon(mimeType: string) {
  if (mimeType === 'application/vnd.google-apps.spreadsheet' || mimeType.includes('spreadsheet') || mimeType === 'text/csv') {
    return <FileSpreadsheet className="w-5 h-5 text-ceramic-success" />;
  }
  if (mimeType === 'application/pdf') {
    return <FileText className="w-5 h-5 text-ceramic-error" />;
  }
  if (mimeType === 'application/vnd.google-apps.folder') {
    return <Folder className="w-5 h-5 text-ceramic-warning" />;
  }
  return <File className="w-5 h-5 text-ceramic-text-secondary" />;
}

function isImportableFile(file: DriveFile): boolean {
  return IMPORTABLE_TYPES.has(file.mimeType);
}

function isFinanceFile(file: DriveFile): boolean {
  return FINANCE_MIME_TYPES.has(file.mimeType);
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getFileTypeLabel(mimeType: string): string {
  if (mimeType === 'text/csv') return 'CSV';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType === 'application/vnd.google-apps.spreadsheet') return 'Google Sheets';
  if (mimeType === 'text/plain') return 'Texto';
  if (mimeType.includes('ofx')) return 'OFX';
  return 'Arquivo';
}

// =====================================================
// Component
// =====================================================

export const DriveFilePicker: React.FC<DriveFilePickerProps> = ({
  onImport,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('recent');
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Load recent files on mount
  useEffect(() => {
    loadRecentFiles();
  }, []);

  const loadRecentFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const recentFiles = await getRecentFiles(30);
      // Filter to show only finance-relevant files
      const financeFiles = recentFiles.filter(isFinanceFile);
      setFiles(financeFiles.length > 0 ? financeFiles : recentFiles.slice(0, 20));
    } catch (err) {
      log.error('Error loading recent files:', err);
      setError('Erro ao carregar arquivos do Drive. Verifique se sua conta Google está conectada.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      loadRecentFiles();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const results = await searchFiles(query);
      setFiles(results);
    } catch (err) {
      log.error('Error searching files:', err);
      setError('Erro ao pesquisar no Drive.');
    } finally {
      setLoading(false);
    }
  }, [loadRecentFiles]);

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => handleSearch(value), 500);
    setSearchTimeout(timeout);
  };

  const handleFileImport = async (file: DriveFile) => {
    if (!isImportableFile(file)) {
      setError(`Formato ${getFileTypeLabel(file.mimeType)} ainda não suportado para importação direta. Use PDF ou CSV.`);
      return;
    }

    setImporting(file.id);
    setError(null);
    try {
      const content = await getFileContent(file.id);
      if (!content) {
        setError('Não foi possível ler o conteúdo do arquivo.');
        return;
      }

      await onImport(file, content.content);
    } catch (err) {
      log.error('Error importing file:', err);
      setError(err instanceof Error ? err.message : 'Erro ao importar arquivo.');
    } finally {
      setImporting(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-ceramic-base rounded-2xl shadow-ceramic-elevated max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-ceramic-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-ceramic-accent" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-ceramic-text-primary">
                  Importar do Google Drive
                </h2>
                <p className="text-xs text-ceramic-text-secondary">
                  Selecione um extrato para importar
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="ceramic-inset w-8 h-8 flex items-center justify-center hover:scale-110 transition-transform"
            >
              <X className="w-4 h-4 text-ceramic-text-secondary" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ceramic-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="Pesquisar no Drive (ex: extrato, nubank, fatura)..."
              className="w-full ceramic-inset pl-10 pr-4 py-2.5 text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => { setActiveTab('recent'); setSearchQuery(''); loadRecentFiles(); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'recent' && !searchQuery
                  ? 'bg-ceramic-accent/10 text-ceramic-accent'
                  : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Recentes
            </button>
            <div className="flex items-center gap-1 text-[10px] text-ceramic-text-secondary">
              <span className="ceramic-inset px-2 py-0.5 rounded">CSV</span>
              <span className="ceramic-inset px-2 py-0.5 rounded">Sheets</span>
              <span className="ceramic-inset px-2 py-0.5 rounded text-ceramic-text-secondary/50 opacity-50 cursor-not-allowed">PDF em breve</span>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex-shrink-0 mx-6 mt-4 p-3 bg-ceramic-error/10 rounded-xl border border-ceramic-error/20 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-ceramic-error flex-shrink-0 mt-0.5" />
            <p className="text-xs text-ceramic-error">{error}</p>
          </div>
        )}

        {/* File List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-ceramic-accent animate-spin" />
              <p className="text-sm text-ceramic-text-secondary">
                Carregando arquivos do Drive...
              </p>
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="ceramic-inset w-16 h-16 flex items-center justify-center opacity-50">
                <HardDrive className="w-8 h-8 text-ceramic-text-secondary" />
              </div>
              <p className="text-sm text-ceramic-text-secondary">
                {searchQuery
                  ? 'Nenhum arquivo encontrado para esta pesquisa.'
                  : 'Nenhum arquivo financeiro encontrado no Drive.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => {
                const importable = isImportableFile(file);
                const isImporting = importing === file.id;

                return (
                  <button
                    key={file.id}
                    onClick={() => importable && handleFileImport(file)}
                    disabled={!importable || !!importing}
                    className={`
                      w-full ceramic-tray p-4 flex items-center gap-4 transition-all duration-200
                      ${importable
                        ? 'hover:scale-[1.01] hover:bg-ceramic-accent/5 cursor-pointer'
                        : 'opacity-50 cursor-not-allowed'}
                      ${isImporting ? 'bg-ceramic-accent/10' : ''}
                    `}
                  >
                    {/* Icon */}
                    <div className="ceramic-concave w-10 h-10 flex items-center justify-center flex-shrink-0">
                      {isImporting ? (
                        <Loader2 className="w-5 h-5 text-ceramic-accent animate-spin" />
                      ) : (
                        getFileIcon(file.mimeType)
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-bold text-ceramic-text-primary truncate">
                        {file.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          importable
                            ? 'bg-ceramic-success/10 text-ceramic-success'
                            : 'bg-ceramic-cool text-ceramic-text-secondary'
                        }`}>
                          {getFileTypeLabel(file.mimeType)}
                        </span>
                        {file.sizeBytes && (
                          <span className="text-[10px] text-ceramic-text-secondary">
                            {formatFileSize(file.sizeBytes)}
                          </span>
                        )}
                        <span className="text-[10px] text-ceramic-text-secondary">
                          {formatDate(file.modifiedTime)}
                        </span>
                      </div>
                    </div>

                    {/* Action */}
                    {importable && !isImporting && (
                      <div className="flex items-center gap-1 text-ceramic-accent">
                        <Download className="w-4 h-4" />
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    )}
                    {isImporting && (
                      <span className="text-[10px] font-bold text-ceramic-accent">
                        Importando...
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-ceramic-border">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-ceramic-text-secondary">
              Formatos suportados: CSV, Google Sheets (exporta como CSV)
            </p>
            <button
              onClick={onClose}
              className="ceramic-card px-4 py-2 hover:scale-105 transition-transform"
            >
              <span className="text-xs font-bold text-ceramic-text-primary">Fechar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
