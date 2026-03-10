/**
 * Statement Service
 *
 * CRUD operations for finance statements and Supabase Storage management.
 */

import { supabase } from '../../../services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import { csvParserService } from './csvParserService';
import { ensureAccountExists } from './accountService';

const log = createNamespacedLogger('StatementService');
import type {
  FinanceStatement,
  FinanceTransaction,
  ParsedStatement,
  ParsedTransaction,
  ProcessingStatus,
} from '../types';

// =====================================================
// Constants
// =====================================================

const STORAGE_BUCKET = 'finance-statements';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// =====================================================
// PDF Validation
// =====================================================

/**
 * Validate PDF file by checking magic bytes signature.
 * Prevents MIME type spoofing — file.type is client-controlled and untrusted.
 */
async function validatePDFFile(file: File): Promise<boolean> {
  const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  const signature = String.fromCharCode(...header);
  return signature.startsWith('%PDF-');
}

// =====================================================
// Statement Service
// =====================================================

export const statementService = {
  /**
   * Create a new statement record
   */
  async createStatement(
    data: Partial<FinanceStatement>
  ): Promise<FinanceStatement> {
    const { data: statement, error } = await supabase
      .from('finance_statements')
      .insert([data])
      .select()
      .single();

    if (error) {
      log.error('[statementService] Create error:', error);
      throw new Error('Erro ao criar registro do extrato');
    }

    return statement as FinanceStatement;
  },

  /**
   * Get all statements for a user
   */
  async getStatements(userId: string): Promise<FinanceStatement[]> {
    const { data, error } = await supabase
      .from('finance_statements')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      log.error('[statementService] Get statements error:', error);
      throw new Error('Erro ao buscar extratos');
    }

    return (data || []) as FinanceStatement[];
  },

  /**
   * Get a single statement by ID
   */
  async getStatement(id: string): Promise<FinanceStatement | null> {
    const { data, error } = await supabase
      .from('finance_statements')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      log.error('[statementService] Get statement error:', error);
      throw new Error('Erro ao buscar extrato');
    }

    return data as FinanceStatement;
  },

  /**
   * Update a statement
   */
  async updateStatement(
    id: string,
    data: Partial<FinanceStatement>
  ): Promise<FinanceStatement> {
    const { data: statement, error } = await supabase
      .from('finance_statements')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      log.error('[statementService] Update error:', error);
      throw new Error('Erro ao atualizar extrato');
    }

    return statement as FinanceStatement;
  },

  /**
   * Delete a statement and its associated data
   */
  async deleteStatement(id: string): Promise<void> {
    // First, get the statement to find storage path
    const statement = await this.getStatement(id);

    if (statement?.storage_path) {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([statement.storage_path]);

      if (storageError) {
        log.warn('[statementService] Storage delete warning:', storageError);
      }
    }

    // Delete statement (transactions cascade automatically via FK)
    const { error } = await supabase
      .from('finance_statements')
      .delete()
      .eq('id', id);

    if (error) {
      log.error('[statementService] Delete error:', error);
      throw new Error('Erro ao deletar extrato');
    }
  },

  /**
   * Upload PDF to Supabase Storage
   */
  async uploadPDF(userId: string, file: File): Promise<string> {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('Arquivo muito grande. Limite: 10MB');
    }

    if (file.type !== 'application/pdf') {
      throw new Error('Tipo de arquivo invalido. Apenas PDF e aceito.');
    }

    // Validate PDF magic bytes to prevent MIME type spoofing
    const isValidPDF = await validatePDFFile(file);
    if (!isValidPDF) {
      throw new Error('Arquivo nao e um PDF valido');
    }

    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const storagePath = `${userId}/${fileName}`;

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (error) {
      log.error('[statementService] Upload error:', error);
      throw new Error('Erro ao fazer upload do PDF');
    }

    return storagePath;
  },

  /**
   * Get signed URL for PDF download
   */
  async getPDFUrl(storagePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, 3600); // 1 hour expiry

    if (error) {
      log.error('[statementService] Get URL error:', error);
      throw new Error('Erro ao obter URL do PDF');
    }

    return data.signedUrl;
  },

  /**
   * Update processing status
   */
  async updateProcessingStatus(
    id: string,
    status: ProcessingStatus,
    error?: string
  ): Promise<void> {
    const updateData: Partial<FinanceStatement> = {
      processing_status: status,
    };

    if (status === 'processing') {
      updateData.processing_started_at = new Date().toISOString();
    } else if (status === 'completed' || status === 'failed') {
      updateData.processing_completed_at = new Date().toISOString();
    }

    if (error) {
      updateData.processing_error = error;
    }

    await this.updateStatement(id, updateData);
  },

  /**
   * Save parsed statement data
   */
  async saveParsedData(
    statementId: string,
    userId: string,
    parsed: ParsedStatement,
    markdown: string
  ): Promise<void> {
    // Check period overlap (excludes current statement being processed)
    if (parsed.periodStart && parsed.periodEnd) {
      const { hasOverlap, overlapping } = await this.checkPeriodOverlap(
        userId, parsed.periodStart, parsed.periodEnd
      );
      // Filter out current statement from overlap check
      const otherOverlaps = overlapping.filter(s => s.id !== statementId);
      if (otherOverlaps.length > 0) {
        const names = otherOverlaps.map(s => `${s.bank_name} (${s.file_name})`).join(', ');
        // Mark current statement as failed
        await this.updateStatement(statementId, {
          processing_status: 'failed',
          processing_error: `Período sobreposto com: ${names}`,
          processing_completed_at: new Date().toISOString(),
        });
        throw new Error(
          `Já existe extrato para este período: ${names}. ` +
          `Delete o extrato existente antes de importar novamente.`
        );
      }
    }

    // Validate that transactions were found
    if (!parsed.transactions || parsed.transactions.length === 0) {
      log.error('[statementService] No transactions found in ParsedStatement:', {
        bankName: parsed.bankName,
        periodStart: parsed.periodStart,
        periodEnd: parsed.periodEnd,
      });

      // Mark as failed with descriptive error
      await this.updateStatement(statementId, {
        processing_status: 'failed',
        processing_error:
          'Nenhuma transação foi identificada no extrato. O PDF pode estar em formato não suportado ou a IA não conseguiu extrair os dados.',
        processing_completed_at: new Date().toISOString(),
      });

      throw new Error(
        'Nenhuma transação foi identificada no extrato. Verifique se o PDF está em formato válido.'
      );
    }

    // Auto-create account from bank info (PDF path)
    let accountId: string | undefined;
    try {
      accountId = await ensureAccountExists(userId, parsed.bankName, parsed.accountType || 'checking');
    } catch (accError) {
      log.warn('[PDF] Account auto-creation failed:', accError);
    }

    // Update statement with parsed metadata (keep status as 'processing' until transactions are saved)
    await this.updateStatement(statementId, {
      bank_name: parsed.bankName,
      account_type: parsed.accountType,
      statement_period_start: parsed.periodStart,
      statement_period_end: parsed.periodEnd,
      opening_balance: parsed.openingBalance,
      closing_balance: parsed.closingBalance,
      currency: parsed.currency,
      transaction_count: parsed.transactions.length,
      total_credits: parsed.transactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0),
      total_debits: parsed.transactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0),
      markdown_content: markdown,
      markdown_generated_at: new Date().toISOString(),
    });

    // Save transactions BEFORE marking as completed
    try {
      await this.saveTransactions(statementId, userId, parsed.transactions, accountId);
    } catch (txError) {
      // Mark statement as failed so it doesn't stay stuck in 'processing'
      await this.updateStatement(statementId, {
        processing_status: 'failed',
        processing_error: txError instanceof Error ? txError.message : 'Erro ao salvar transações',
        processing_completed_at: new Date().toISOString(),
      });
      throw txError;
    }

    // Only mark as completed AFTER transactions are successfully saved
    await this.updateStatement(statementId, {
      processing_status: 'completed',
      processing_completed_at: new Date().toISOString(),
    });
  },

  /**
   * Generate SHA-256 hash for transaction deduplication
   */
  async generateTransactionHash(
    userId: string,
    date: string,
    description: string,
    amount: number
  ): Promise<string> {
    const data = `${userId}|${date}|${description}|${amount.toFixed(2)}`;
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Save transactions from parsed statement
   */
  async saveTransactions(
    statementId: string,
    userId: string,
    transactions: ParsedTransaction[],
    accountId?: string
  ): Promise<void> {
    // Generate hash_id for each transaction
    const transactionRecords: Partial<FinanceTransaction>[] = await Promise.all(
      transactions.map(async (t) => ({
        user_id: userId,
        statement_id: statementId,
        account_id: accountId || null,
        hash_id: await this.generateTransactionHash(userId, t.date, t.description, Math.abs(t.amount)),
        description: t.description,
        amount: Math.abs(t.amount),
        type: t.type,
        category: t.suggestedCategory || 'other',
        ai_categorized: !!(t.suggestedCategory && t.suggestedCategory !== 'other'),
        transaction_date: t.date,
        is_recurring: false,
      }))
    );

    // Use upsert to handle duplicate transactions gracefully
    // When a transaction with the same hash_id exists, ignore it (keep the first occurrence)
    const { data: upsertResult, error } = await supabase
      .from('finance_transactions')
      .upsert(transactionRecords, {
        onConflict: 'hash_id',
        ignoreDuplicates: true, // Keep existing transaction, don't update
      })
      .select('id');

    if (error) {
      log.error('[statementService] Save transactions error:', error);
      throw new Error('Erro ao salvar transacoes');
    }

    const insertedCount = upsertResult?.length || 0;
    const skippedCount = transactionRecords.length - insertedCount;
    if (skippedCount > 0) {
      log.info(`[statementService] Transactions: ${insertedCount} inserted, ${skippedCount} duplicates skipped for statement ${statementId}`);
    }

    log.debug(`[statementService] Saved/updated ${transactionRecords.length} transactions for statement ${statementId}`);
  },

  /**
   * Check if statement already exists (by file hash)
   * Only considers completed statements as duplicates (allows retry on failures)
   */
  async checkDuplicate(userId: string, fileHash: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('finance_statements')
      .select('id, processing_status')
      .eq('user_id', userId)
      .eq('file_hash', fileHash)
      .eq('processing_status', 'completed') // Only block if successfully processed
      .maybeSingle(); // Returns null if no results (no 406 error)

    // If there's an error other than "not found", log it
    if (error && error.code !== 'PGRST116') {
      log.warn('[statementService] checkDuplicate error:', error);
    }

    return !!data;
  },

  /**
   * Check if a date range overlaps with existing completed statements.
   * Returns overlapping statements so the UI can warn the user.
   */
  async checkPeriodOverlap(
    userId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<{ hasOverlap: boolean; overlapping: { id: string; file_name: string; bank_name: string; period_start: string; period_end: string }[] }> {
    const { data, error } = await supabase
      .from('finance_statements')
      .select('id, file_name, bank_name, statement_period_start, statement_period_end')
      .eq('user_id', userId)
      .eq('processing_status', 'completed')
      .lte('statement_period_start', periodEnd)
      .gte('statement_period_end', periodStart);

    if (error) {
      log.warn('[statementService] checkPeriodOverlap error:', error);
      return { hasOverlap: false, overlapping: [] };
    }

    const overlapping = (data || []).map(s => ({
      id: s.id,
      file_name: s.file_name || '',
      bank_name: s.bank_name || '',
      period_start: s.statement_period_start,
      period_end: s.statement_period_end,
    }));

    return { hasOverlap: overlapping.length > 0, overlapping };
  },

  /**
   * Get transactions for a statement
   */
  async getStatementTransactions(statementId: string): Promise<FinanceTransaction[]> {
    const { data, error } = await supabase
      .from('finance_transactions')
      .select('*')
      .eq('statement_id', statementId)
      .order('transaction_date', { ascending: false });

    if (error) {
      log.error('[statementService] Get transactions error:', error);
      throw new Error('Erro ao buscar transacoes');
    }

    return (data || []) as FinanceTransaction[];
  },

  /**
   * Get statement summary statistics
   */
  async getStatementStats(userId: string): Promise<{
    totalStatements: number;
    totalTransactions: number;
    dateRange: { start: string; end: string } | null;
  }> {
    const { data: statements } = await supabase
      .from('finance_statements')
      .select('id, statement_period_start, statement_period_end')
      .eq('user_id', userId);

    const { count: transactionCount } = await supabase
      .from('finance_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    const dates = (statements || [])
      .flatMap((s) => [s.statement_period_start, s.statement_period_end])
      .filter(Boolean)
      .sort();

    return {
      totalStatements: statements?.length || 0,
      totalTransactions: transactionCount || 0,
      dateRange: dates.length > 0
        ? { start: dates[0], end: dates[dates.length - 1] }
        : null,
    };
  },

  /**
   * Process CSV statement with full validation
   */
  async processCSVStatement(
    userId: string,
    file: File
  ): Promise<{ statement: FinanceStatement; transactionCount: number }> {
    const startTime = Date.now();

    try {
      // 1. Parse CSV
      log.debug('[CSV] Parsing file:', file.name);
      const parsed = await csvParserService.parseCSV(file);
      log.debug('[CSV] Parsed:', {
        bank: parsed.bankName,
        transactions: parsed.transactions.length,
        period: `${parsed.periodStart} to ${parsed.periodEnd}`
      });

      // 2. Check for period overlap with existing statements
      const { hasOverlap, overlapping } = await this.checkPeriodOverlap(
        userId, parsed.periodStart, parsed.periodEnd
      );
      if (hasOverlap) {
        const names = overlapping.map(s => `${s.bank_name} (${s.file_name})`).join(', ');
        throw new Error(
          `Já existe extrato para este período: ${names}. ` +
          `Delete o extrato existente antes de importar novamente.`
        );
      }

      // 3. Calculate file hash for deduplication
      const fileHash = await this.calculateFileHash(file);

      // 4. Check if exact same file already exists
      const { data: existing } = await supabase
        .from('finance_statements')
        .select('id')
        .eq('user_id', userId)
        .eq('file_hash', fileHash)
        .maybeSingle();

      if (existing) {
        throw new Error('Este extrato já foi importado anteriormente.');
      }

      // 3b. AI categorize transactions that have no category
      const uncategorized = parsed.transactions.filter(t => !t.category || t.category === 'other');
      if (uncategorized.length > 0) {
        try {
          log.debug('[CSV] AI categorizing', uncategorized.length, 'transactions');
          const { data: catResult } = await supabase.functions.invoke('gemini-chat', {
            body: {
              action: 'categorize_transactions',
              payload: {
                transactions: uncategorized.map(t => ({
                  description: t.description,
                  amount: t.amount,
                  type: t.type,
                })),
              },
            },
          });

          const categories = catResult?.result?.categories || catResult?.categories;
          if (categories && Array.isArray(categories)) {
            let applied = 0;
            uncategorized.forEach((t, i) => {
              if (categories[i] && categories[i] !== 'other') {
                t.category = categories[i];
                applied++;
              }
            });
            log.debug('[CSV] AI categorized', applied, 'of', uncategorized.length, 'transactions');
          }
        } catch (catError) {
          log.warn('[CSV] AI categorization failed, using defaults:', catError);
        }
      }

      // 3c. Auto-create account from bank info
      let accountId: string | undefined;
      try {
        accountId = await ensureAccountExists(userId, parsed.bankName, parsed.accountType || 'checking');
      } catch (accError) {
        log.warn('[CSV] Account auto-creation failed:', accError);
      }

      // 4. Create statement record
      const statement = await this.createStatement({
        user_id: userId,
        file_name: file.name,
        file_size_bytes: file.size,
        file_hash: fileHash,
        source_type: 'csv',
        source_bank: this.mapBankName(parsed.bankName),
        file_format_version: parsed.sourceFormat,
        bank_name: parsed.bankName,
        account_type: parsed.accountType,
        statement_period_start: parsed.periodStart,
        statement_period_end: parsed.periodEnd,
        opening_balance: parsed.openingBalance,
        closing_balance: parsed.closingBalance,
        currency: parsed.currency,
        raw_data_snapshot: parsed.rawDataSnapshot,
        processing_status: 'processing',
        processing_started_at: new Date().toISOString(),
        mime_type: 'text/csv'
      });

      log.debug('[CSV] Statement created:', statement.id);

      // 5. Insert transactions
      const transactionsToInsert = await Promise.all(
        parsed.transactions.map(async (tx, index) => ({
          statement_id: statement.id,
          user_id: userId,
          account_id: accountId || null,
          hash_id: await this.generateTransactionHash(userId, tx.date, tx.description, Math.abs(tx.amount)),
          transaction_date: tx.date,
          description: tx.description,
          raw_description: tx.description,
          amount: tx.amount,
          type: tx.type,
          category: tx.category || 'other',
          ai_categorized: !!(tx.category && tx.category !== 'other'),
          is_recurring: false,
          source_line_number: index + 2,
        }))
      );

      const { error: txError } = await supabase
        .from('finance_transactions')
        .insert(transactionsToInsert);

      if (txError) {
        log.error('[CSV] Transaction insert error:', txError);
        // Mark statement as failed
        await this.updateStatement(statement.id, {
          processing_status: 'failed',
          processing_error: txError.message
        });
        throw new Error('Erro ao inserir transações');
      }

      log.debug('[CSV] Transactions inserted:', transactionsToInsert.length);

      // 6. Calculate totals
      const totalCredits = parsed.transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalDebits = parsed.transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      // 7. Update statement as completed (recalculate closing balance from verified totals)
      const updatedStatement = await this.updateStatement(statement.id, {
        processing_status: 'completed',
        processing_completed_at: new Date().toISOString(),
        total_credits: totalCredits,
        total_debits: totalDebits,
        transaction_count: parsed.transactions.length,
        closing_balance: totalCredits - totalDebits,
      });

      const duration = Date.now() - startTime;
      log.debug(`[CSV] Processing completed in ${duration}ms`);

      return {
        statement: updatedStatement,
        transactionCount: parsed.transactions.length
      };
    } catch (error) {
      log.error('[CSV] Processing error:', error);
      throw error;
    }
  },

  /**
   * Calculate file hash for deduplication
   */
  async calculateFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  },

  /**
   * Map bank name to source_bank enum
   */
  mapBankName(bankName: string): string {
    const mapping: Record<string, string> = {
      'Nubank': 'nubank',
      'Banco Inter': 'inter',
      'Itaú': 'itau',
      'Bradesco': 'bradesco',
      'Caixa': 'caixa',
      'Santander': 'santander',
      'Banco do Brasil': 'banco_brasil'
    };
    return mapping[bankName] || 'other';
  },
};

export default statementService;
