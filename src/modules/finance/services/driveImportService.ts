/**
 * Drive Import Service for Finance
 *
 * Orchestrates importing financial files from Google Drive:
 * - Google Sheets → exported as CSV → csvParserService
 * - CSV files → csvParserService
 * - PDF files → pdfProcessingService (future)
 */

import { createNamespacedLogger } from '@/lib/logger';
import type { DriveFile } from '@/services/driveService';
import { statementService } from './statementService';
import type { FinanceStatement } from '../types';

const log = createNamespacedLogger('DriveImportService');

// =====================================================
// Types
// =====================================================

export interface DriveImportResult {
  success: boolean;
  statement?: FinanceStatement;
  transactionCount?: number;
  error?: string;
}

// =====================================================
// Service
// =====================================================

/**
 * Import a file from Google Drive into Finance.
 * The content should already be fetched via driveService.getFileContent().
 */
export async function importFromDrive(
  userId: string,
  file: DriveFile,
  content: string
): Promise<DriveImportResult> {
  const TAG = '[DriveImport]';

  try {
    log.info(TAG, `Importing ${file.name} (${file.mimeType})`);

    // Route based on MIME type
    if (
      file.mimeType === 'text/csv' ||
      file.mimeType === 'application/vnd.google-apps.spreadsheet' ||
      file.mimeType === 'text/plain'
    ) {
      return await importCSVContent(userId, file, content);
    }

    return {
      success: false,
      error: `Formato não suportado: ${file.mimeType}. Use CSV ou Google Sheets.`,
    };
  } catch (err) {
    log.error(TAG, 'Import error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao importar arquivo.',
    };
  }
}

/**
 * Import CSV content (from CSV file or Google Sheets export).
 */
async function importCSVContent(
  userId: string,
  file: DriveFile,
  csvContent: string
): Promise<DriveImportResult> {
  // statementService handles parsing + persistence in one step
  const csvFile = new File([csvContent], file.name || 'drive-import.csv', { type: 'text/csv' });
  const result = await statementService.processCSVStatement(userId, csvFile);

  if (!result.transactionCount || result.transactionCount === 0) {
    return {
      success: false,
      error: 'Nenhuma transação encontrada no arquivo. Verifique se o formato é suportado (Nubank, Inter, Itaú).',
    };
  }

  return {
    success: true,
    statement: result.statement,
    transactionCount: result.transactionCount,
  };
}
