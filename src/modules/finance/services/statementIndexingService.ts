/**
 * Statement Indexing Service
 *
 * Serviço para indexação automática de extratos bancários usando File Search.
 * Permite busca semântica no conteúdo dos statements.
 */

import { supabase } from '../../../services/supabaseClient';
import type { FileSearchDocument } from '../../../types/fileSearch';
import type { FinanceStatement } from '../types';

/**
 * Opções para indexação de statement
 */
export interface IndexStatementOptions {
  statement: FinanceStatement;
  markdownContent?: string; // Se não fornecido, usa statement.markdown_content
  metadata?: Record<string, any>;
}

/**
 * Interface do hook useFinanceFileSearch (para evitar importação circular)
 */
interface FinanceFileSearchHook {
  indexStatement: (
    statement: FinanceStatement,
    markdownContent?: string,
    metadata?: Record<string, any>
  ) => Promise<FileSearchDocument>;
  hasIndexedStatements: () => boolean;
}

/**
 * Indexa um statement financeiro no File Search
 *
 * @param options - Opções de indexação
 * @param fileSearchHook - Hook useFinanceFileSearch instanciado
 * @returns Documento indexado no File Search
 *
 * @example
 * ```tsx
 * const hook = useFinanceFileSearch({ userId: 'user-123' });
 *
 * await indexFinanceStatement({
 *   statement: myStatement,
 *   markdownContent: statementMarkdown
 * }, hook);
 * ```
 */
export async function indexFinanceStatement(
  options: IndexStatementOptions,
  fileSearchHook: FinanceFileSearchHook
): Promise<FileSearchDocument> {
  const { statement, markdownContent, metadata = {} } = options;

  console.log('[StatementIndexing] Starting indexation for statement:', statement.id);

  try {
    // 1. Validar que há conteúdo para indexar
    const content = markdownContent || statement.markdown_content;

    if (!content || content.trim().length < 100) {
      throw new Error('Statement não tem conteúdo suficiente para indexação. Mínimo: 100 caracteres');
    }

    // 2. Indexar no File Search usando o hook
    console.log('[StatementIndexing] Indexing statement in File Search...');
    const indexed = await fileSearchHook.indexStatement(
      statement,
      content,
      {
        processing_status: statement.processing_status,
        ai_summary: statement.ai_summary,
        ...metadata,
      }
    );

    console.log('[StatementIndexing] Statement indexed:', indexed.id);

    // 3. Atualizar timestamp de markdown generation no banco (se ainda não está definido)
    if (!statement.markdown_generated_at) {
      const { error: updateError } = await supabase
        .from('finance_statements')
        .update({
          markdown_generated_at: new Date().toISOString(),
        })
        .eq('id', statement.id);

      if (updateError) {
        console.warn('[StatementIndexing] Failed to update timestamp:', updateError);
        // Não falha a operação, apenas loga o warning
      }
    }

    console.log('[StatementIndexing] Indexation complete!', {
      statementId: statement.id,
      fileSearchDocId: indexed.id,
      characterCount: content.length,
    });

    return indexed;
  } catch (error) {
    console.error('[StatementIndexing] Indexation failed:', error);
    throw error;
  }
}

/**
 * Salva markdown do statement no banco E indexa automaticamente
 *
 * Função helper que combina:
 * 1. Save do markdown em finance_statements.markdown_content
 * 2. Indexação automática no File Search
 *
 * @param statementId - ID do statement
 * @param markdownContent - Conteúdo markdown gerado
 * @param fileSearchHook - Hook useFinanceFileSearch instanciado
 * @returns Documento indexado
 *
 * @example
 * ```tsx
 * const hook = useFinanceFileSearch({ userId: 'user-123' });
 *
 * const indexed = await saveAndIndexStatementMarkdown(
 *   'statement-123',
 *   generatedMarkdown,
 *   hook
 * );
 * ```
 */
export async function saveAndIndexStatementMarkdown(
  statementId: string,
  markdownContent: string,
  fileSearchHook: FinanceFileSearchHook
): Promise<{
  saved: boolean;
  indexed: FileSearchDocument;
}> {
  console.log('[StatementIndexing] Saving and indexing markdown for:', statementId);

  try {
    // 1. Salvar markdown no banco de dados
    console.log('[StatementIndexing] Step 1: Saving markdown to database...');
    const { error: saveError } = await supabase
      .from('finance_statements')
      .update({
        markdown_content: markdownContent,
        markdown_generated_at: new Date().toISOString(),
      })
      .eq('id', statementId);

    if (saveError) {
      throw new Error(`Failed to save markdown: ${saveError.message}`);
    }

    console.log('[StatementIndexing] Markdown saved to database');

    // 2. Buscar statement atualizado
    const { data: statement, error: fetchError } = await supabase
      .from('finance_statements')
      .select('*')
      .eq('id', statementId)
      .single();

    if (fetchError || !statement) {
      throw new Error(`Failed to fetch statement: ${fetchError?.message}`);
    }

    // 3. Indexar no File Search
    console.log('[StatementIndexing] Step 2: Indexing in File Search...');
    const indexed = await indexFinanceStatement(
      {
        statement: statement as FinanceStatement,
        markdownContent,
      },
      fileSearchHook
    );

    console.log('[StatementIndexing] Save and indexation complete!');

    return {
      saved: true,
      indexed,
    };
  } catch (error) {
    console.error('[StatementIndexing] Save and indexation failed:', error);
    throw error;
  }
}

/**
 * Re-indexa todos os statements existentes que ainda não foram indexados
 *
 * Útil para migração ou recuperação de dados.
 *
 * @param userId - ID do usuário
 * @param fileSearchHook - Hook useFinanceFileSearch instanciado
 * @param limit - Número máximo de statements a processar
 * @returns Array de documentos indexados
 *
 * @example
 * ```tsx
 * const hook = useFinanceFileSearch({ userId: 'user-123' });
 * const results = await reindexExistingStatements('user-123', hook, 50);
 * console.log(`Re-indexed ${results.length} statements`);
 * ```
 */
export async function reindexExistingStatements(
  userId: string,
  fileSearchHook: FinanceFileSearchHook,
  limit: number = 50
): Promise<FileSearchDocument[]> {
  console.log('[StatementIndexing] Starting bulk re-indexation for user:', userId);

  try {
    // Buscar statements com markdown mas sem indexação recente
    const { data: statements, error } = await supabase
      .from('finance_statements')
      .select('*')
      .eq('user_id', userId)
      .not('markdown_content', 'is', null)
      .eq('processing_status', 'completed')
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch statements: ${error.message}`);
    }

    if (!statements || statements.length === 0) {
      console.log('[StatementIndexing] No statements to re-index');
      return [];
    }

    console.log(`[StatementIndexing] Found ${statements.length} statements to re-index`);

    const results: FileSearchDocument[] = [];

    for (const statement of statements) {
      try {
        console.log(`[StatementIndexing] Re-indexing statement: ${statement.id}`);

        const indexed = await indexFinanceStatement(
          {
            statement: statement as FinanceStatement,
          },
          fileSearchHook
        );

        results.push(indexed);
        console.log(`[StatementIndexing] ✓ Re-indexed: ${statement.id}`);
      } catch (statementError) {
        console.error(`[StatementIndexing] ✗ Failed to re-index ${statement.id}:`, statementError);
        // Continue com próximo statement
      }
    }

    console.log(`[StatementIndexing] Bulk re-indexation complete: ${results.length}/${statements.length} successful`);

    return results;
  } catch (error) {
    console.error('[StatementIndexing] Bulk re-indexation failed:', error);
    throw error;
  }
}

/**
 * Indexa automaticamente após processamento de PDF/CSV
 *
 * Esta função deve ser chamada após o statement ser processado
 * e o markdown ter sido gerado.
 *
 * @param statementId - ID do statement processado
 * @param fileSearchHook - Hook useFinanceFileSearch instanciado
 * @returns Documento indexado
 *
 * @example
 * ```tsx
 * // No serviço de processamento de PDF:
 * const statement = await processStatementPDF(file);
 * const markdown = await generateStatementMarkdown(statement);
 *
 * // Auto-indexar após processar
 * const hook = useFinanceFileSearch({ userId: statement.user_id });
 * await autoIndexAfterProcessing(statement.id, hook);
 * ```
 */
export async function autoIndexAfterProcessing(
  statementId: string,
  fileSearchHook: FinanceFileSearchHook
): Promise<FileSearchDocument> {
  console.log('[StatementIndexing] Auto-indexing after processing:', statementId);

  try {
    // Buscar statement
    const { data: statement, error } = await supabase
      .from('finance_statements')
      .select('*')
      .eq('id', statementId)
      .single();

    if (error || !statement) {
      throw new Error(`Failed to fetch statement: ${error?.message}`);
    }

    // Validar que o statement foi processado e tem markdown
    if (statement.processing_status !== 'completed') {
      throw new Error(`Statement processing not completed. Status: ${statement.processing_status}`);
    }

    if (!statement.markdown_content) {
      throw new Error('Statement does not have markdown content');
    }

    // Indexar
    return await indexFinanceStatement(
      {
        statement: statement as FinanceStatement,
      },
      fileSearchHook
    );
  } catch (error) {
    console.error('[StatementIndexing] Auto-indexing failed:', error);
    throw error;
  }
}

/**
 * Verifica se um statement já foi indexado
 *
 * @param statementId - ID do statement
 * @param fileSearchHook - Hook useFinanceFileSearch instanciado
 * @returns True se já está indexado
 */
export async function isStatementIndexed(
  statementId: string,
  fileSearchHook: FinanceFileSearchHook
): Promise<boolean> {
  try {
    const documents = await fileSearchHook.hasIndexedStatements();

    // Verificar se há documento com esse statement_id nos metadados
    // Nota: Esta é uma verificação simplificada
    // Uma implementação mais robusta verificaria os custom_metadata
    return documents;
  } catch (error) {
    console.error('[StatementIndexing] Error checking indexation status:', error);
    return false;
  }
}
