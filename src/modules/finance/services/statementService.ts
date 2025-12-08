/**
 * Statement Service
 *
 * CRUD operations for finance statements and Supabase Storage management.
 */

import { supabase } from '../../../services/supabaseClient';
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
      console.error('[statementService] Create error:', error);
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
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[statementService] Get statements error:', error);
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
      console.error('[statementService] Get statement error:', error);
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
      console.error('[statementService] Update error:', error);
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
        console.warn('[statementService] Storage delete warning:', storageError);
      }
    }

    // Delete statement (transactions cascade automatically via FK)
    const { error } = await supabase
      .from('finance_statements')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[statementService] Delete error:', error);
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
      console.error('[statementService] Upload error:', error);
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
      console.error('[statementService] Get URL error:', error);
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
    // Validate that transactions were found
    if (!parsed.transactions || parsed.transactions.length === 0) {
      console.error('[statementService] No transactions found in ParsedStatement:', {
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

    // Update statement with parsed metadata
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
      processing_status: 'completed',
      processing_completed_at: new Date().toISOString(),
    });

    // Save transactions
    await this.saveTransactions(statementId, userId, parsed.transactions);
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
    transactions: ParsedTransaction[]
  ): Promise<void> {
    // Generate hash_id for each transaction
    const transactionRecords: Partial<FinanceTransaction>[] = await Promise.all(
      transactions.map(async (t) => ({
        user_id: userId,
        statement_id: statementId,
        hash_id: await this.generateTransactionHash(userId, t.date, t.description, Math.abs(t.amount)),
        description: t.description,
        original_description: t.description,
        amount: Math.abs(t.amount),
        type: t.type,
        category: t.suggestedCategory || 'other',
        transaction_date: t.date,
        is_recurring: false,
        ai_categorized: true,
        ai_confidence: 0.8,
        balance_after: t.balance,
      }))
    );

    // Use upsert to handle duplicate transactions gracefully
    // When a transaction with the same hash_id exists, ignore it (keep the first occurrence)
    const { error } = await supabase
      .from('finance_transactions')
      .upsert(transactionRecords, {
        onConflict: 'hash_id',
        ignoreDuplicates: true, // Keep existing transaction, don't update
      });

    if (error) {
      console.error('[statementService] Save transactions error:', error);
      throw new Error('Erro ao salvar transacoes');
    }

    console.log(`[statementService] Saved/updated ${transactionRecords.length} transactions for statement ${statementId}`);
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
      console.warn('[statementService] checkDuplicate error:', error);
    }

    return !!data;
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
      console.error('[statementService] Get transactions error:', error);
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
};

export default statementService;
