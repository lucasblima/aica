/**
 * CSV Parser Service
 * Detecta formato do CSV e extrai transações
 * Suporta: Nubank, Inter, Itaú
 */

import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('CSVParserService');

// =====================================================
// Types
// =====================================================

export interface ParsedTransaction {
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category?: string;
  balance?: number;
}

export interface CSVParseResult {
  bankName: string;
  accountType: 'checking' | 'savings' | 'credit_card' | 'investment' | 'other';
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  closingBalance: number;
  currency: string;
  transactions: ParsedTransaction[];
  sourceFormat: string; // ex: "nubank_csv_v2"
  rawDataSnapshot: string[][]; // Array das linhas originais
}

export interface CSVBankFormat {
  bankName: string;
  delimiter: string; // ',' ou ';'
  dateFormat: string; // 'YYYY-MM-DD' ou 'DD/MM/YYYY'
  decimalSeparator: string; // '.' ou ','
  columns: {
    date: string | number;
    description: string | number;
    amount: string | number;
    balance?: string | number;
    category?: string | number;
  };
  amountSign: 'auto' | 'separate'; // 'auto' = negativo no valor, 'separate' = coluna type
}

// =====================================================
// Known Bank Formats
// =====================================================

const KNOWN_FORMATS: CSVBankFormat[] = [
  {
    bankName: 'Nubank',
    delimiter: ',',
    dateFormat: 'DD/MM/YYYY',
    decimalSeparator: '.',
    columns: { date: 'Data', description: 'Descrição', amount: 'Valor' },
    amountSign: 'auto'
  },
  {
    bankName: 'Nubank',
    delimiter: ',',
    dateFormat: 'YYYY-MM-DD',
    decimalSeparator: '.',
    columns: { date: 'date', description: 'title', amount: 'amount', category: 'category' },
    amountSign: 'auto'
  },
  {
    bankName: 'Banco Inter',
    delimiter: ';',
    dateFormat: 'DD/MM/YYYY',
    decimalSeparator: ',',
    columns: { date: 'Data', description: 'Descrição', amount: 'Valor', balance: 'Saldo' },
    amountSign: 'auto'
  },
  {
    bankName: 'Itaú',
    delimiter: ';',
    dateFormat: 'DD/MM/YYYY',
    decimalSeparator: ',',
    columns: { date: 'data', description: 'lancamento', amount: 'valor', balance: 'saldo' },
    amountSign: 'auto'
  }
];

// =====================================================
// CSV Parser Service Class
// =====================================================

export class CSVParserService {
  /**
   * Parse CSV file to extract transactions
   */
  async parseCSV(file: File): Promise<CSVParseResult> {
    // Read file content
    const content = await this.readFileContent(file);

    // Detect format
    const format = this.detectFormat(content);
    if (!format) {
      const firstLine = content.split('\n')[0]?.trim() || '(vazio)';
      const previewCols = firstLine.length > 120 ? firstLine.substring(0, 120) + '...' : firstLine;
      throw new Error(
        `Formato de CSV não reconhecido. Cabeçalho encontrado: [${previewCols}]. ` +
        `O CSV deve conter colunas de data, descrição e valor. ` +
        `Formatos conhecidos: Nubank (date,title,amount), Banco Inter (Data;Descrição;Valor;Saldo), Itaú (data;lancamento;valor;saldo).`
      );
    }

    // Parse lines
    const lines = this.parseLines(content, format.delimiter);
    if (lines.length < 2) {
      throw new Error('CSV vazio ou inválido (menos de 2 linhas).');
    }

    // Extract header and data rows
    const header = lines[0];
    const dataRows = lines.slice(1);

    // Get column indices
    const colIndices = this.getColumnIndices(header, format);

    // Parse transactions
    const transactions: ParsedTransaction[] = [];
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];

      // Skip empty rows
      if (this.isEmptyRow(row)) continue;

      try {
        const transaction = this.parseTransaction(row, colIndices, format, i + 2);
        transactions.push(transaction);
      } catch (error) {
        log.warn(`Linha ${i + 2} ignorada:`, error);
        // Continue processing other rows
      }
    }

    if (transactions.length === 0) {
      throw new Error('Nenhuma transação válida encontrada no CSV.');
    }

    // Calculate period and balances
    const dates = transactions.map(t => new Date(t.date));
    const periodStart = new Date(Math.min(...dates.map(d => d.getTime())));
    const periodEnd = new Date(Math.max(...dates.map(d => d.getTime())));

    // Calculate opening and closing balances
    const { openingBalance, closingBalance } = this.calculateBalances(transactions);

    return {
      bankName: format.bankName,
      accountType: 'checking', // Default, could be improved
      periodStart: periodStart.toISOString().split('T')[0],
      periodEnd: periodEnd.toISOString().split('T')[0],
      openingBalance,
      closingBalance,
      currency: 'BRL',
      transactions,
      sourceFormat: `${format.bankName.toLowerCase().replace(' ', '_')}_csv`,
      rawDataSnapshot: lines
    };
  }

  /**
   * Read file content as text
   */
  private async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(new Error('Erro ao ler arquivo'));
      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * Detect CSV format based on header.
   * Falls back to a generic format if no known bank is matched.
   */
  private detectFormat(csvContent: string): CSVBankFormat | null {
    const lines = csvContent.split('\n');
    if (lines.length < 1) return null;

    const headerRaw = lines[0];
    const header = headerRaw.toLowerCase();

    // Detect by header columns — try known bank formats first
    for (const format of KNOWN_FORMATS) {
      // Verify delimiter match: if format expects ';' but header has more ',' than ';', skip
      const semicolonCount = (headerRaw.match(/;/g) || []).length;
      const commaCount = (headerRaw.match(/,/g) || []).length;
      const actualDelimiter = semicolonCount > commaCount ? ';' : ',';

      if (actualDelimiter !== format.delimiter) continue;

      const dateCol = typeof format.columns.date === 'string'
        ? format.columns.date.toLowerCase()
        : format.columns.date;
      const descCol = typeof format.columns.description === 'string'
        ? format.columns.description.toLowerCase()
        : format.columns.description;

      if (typeof dateCol === 'string' && typeof descCol === 'string') {
        // Parse header columns for accurate matching
        const headerCols = headerRaw.split(format.delimiter).map(c => c.trim().replace(/^["']|["']$/g, '').toLowerCase());
        if (headerCols.includes(dateCol) && headerCols.includes(descCol)) {
          return format;
        }
      }
    }

    // Fallback: try to build a generic format from the header
    const genericFormat = this.buildGenericFormat(headerRaw);
    if (genericFormat) {
      log.info('[detectFormat] No known bank matched — using generic format:', {
        columns: genericFormat.columns,
        delimiter: genericFormat.delimiter,
      });
      return genericFormat;
    }

    return null;
  }

  /**
   * Attempt to build a generic CSV format by detecting common column names
   * for date, description, and amount.
   */
  private buildGenericFormat(headerLine: string): CSVBankFormat | null {
    // Detect delimiter: semicolon vs comma
    const semicolonCount = (headerLine.match(/;/g) || []).length;
    const commaCount = (headerLine.match(/,/g) || []).length;
    const delimiter = semicolonCount > commaCount ? ';' : ',';

    const columns = headerLine.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
    const columnsLower = columns.map(c => c.toLowerCase());

    // Common date column names (Portuguese and English)
    const dateAliases = ['data', 'date', 'dt', 'data_transacao', 'data transacao', 'data_lancamento', 'data lancamento', 'dt_transacao'];
    const descAliases = ['descricao', 'descrição', 'description', 'titulo', 'título', 'title', 'lancamento', 'lançamento', 'historico', 'histórico', 'memo', 'detalhes'];
    const amountAliases = ['valor', 'amount', 'value', 'quantia', 'montante', 'vlr'];
    const balanceAliases = ['saldo', 'balance', 'saldo_final', 'saldo final'];
    const categoryAliases = ['categoria', 'category', 'tipo', 'type'];

    const findColumn = (aliases: string[]): string | undefined => {
      for (const alias of aliases) {
        const idx = columnsLower.findIndex(c => c === alias || c.includes(alias));
        if (idx !== -1) return columns[idx];
      }
      return undefined;
    };

    const dateCol = findColumn(dateAliases);
    const descCol = findColumn(descAliases);
    const amountCol = findColumn(amountAliases);
    const balanceCol = findColumn(balanceAliases);
    const categoryCol = findColumn(categoryAliases);

    // Must have at least date, description, and amount
    if (!dateCol || !descCol || !amountCol) {
      return null;
    }

    // Detect date format and decimal separator from first data line
    const lines = headerLine.split('\n');
    // We only have the header here; date/decimal detection uses safe defaults
    // that handle both formats
    const useBrazilianFormat = delimiter === ';';

    return {
      bankName: 'Genérico',
      delimiter,
      dateFormat: useBrazilianFormat ? 'DD/MM/YYYY' : 'YYYY-MM-DD',
      decimalSeparator: useBrazilianFormat ? ',' : '.',
      columns: {
        date: dateCol,
        description: descCol,
        amount: amountCol,
        ...(balanceCol ? { balance: balanceCol } : {}),
        ...(categoryCol ? { category: categoryCol } : {}),
      },
      amountSign: 'auto',
    };
  }

  /**
   * Parse CSV lines respecting delimiter and quoted fields
   */
  private parseLines(content: string, delimiter: string): string[][] {
    const lines = content.split('\n').filter(line => line.trim() !== '');
    return lines.map(line => this.parseCsvLine(line, delimiter));
  }

  /**
   * Parse a single CSV line respecting quotes and escaped delimiters
   */
  private parseCsvLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote ("") inside quoted field
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  /**
   * Get column indices from header
   */
  private getColumnIndices(
    header: string[],
    format: CSVBankFormat
  ): Record<string, number> {
    const indices: Record<string, number> = {};

    const findIndex = (col: string | number): number => {
      if (typeof col === 'number') return col;
      const colLower = col.toLowerCase();
      return header.findIndex(h => h.toLowerCase() === colLower);
    };

    indices.date = findIndex(format.columns.date);
    indices.description = findIndex(format.columns.description);
    indices.amount = findIndex(format.columns.amount);

    if (format.columns.balance) {
      indices.balance = findIndex(format.columns.balance);
    }
    if (format.columns.category) {
      indices.category = findIndex(format.columns.category);
    }

    // Validate required columns with specific error messages
    const missingColumns: string[] = [];
    if (indices.date === -1) missingColumns.push(`data (esperado: "${format.columns.date}")`);
    if (indices.description === -1) missingColumns.push(`descrição (esperado: "${format.columns.description}")`);
    if (indices.amount === -1) missingColumns.push(`valor (esperado: "${format.columns.amount}")`);

    if (missingColumns.length > 0) {
      const headerPreview = header.slice(0, 8).join(', ');
      throw new Error(
        `Colunas obrigatórias não encontradas no CSV: ${missingColumns.join(', ')}. ` +
        `Colunas encontradas: [${headerPreview}${header.length > 8 ? '...' : ''}]. ` +
        `Formatos suportados: Nubank (date,title,amount), Banco Inter (Data;Descrição;Valor;Saldo), Itaú (data;lancamento;valor;saldo), ou CSV genérico com colunas de data, descrição e valor.`
      );
    }

    return indices;
  }

  /**
   * Check if row is empty
   */
  private isEmptyRow(row: string[]): boolean {
    return row.every(cell => cell.trim() === '');
  }

  /**
   * Parse single transaction from row
   */
  private parseTransaction(
    row: string[],
    colIndices: Record<string, number>,
    format: CSVBankFormat,
    lineNumber: number
  ): ParsedTransaction {
    // Extract raw values
    const rawDate = row[colIndices.date];
    const rawDescription = row[colIndices.description];
    const rawAmount = row[colIndices.amount];
    const rawCategory = colIndices.category !== undefined ? row[colIndices.category] : undefined;
    const rawBalance = colIndices.balance !== undefined ? row[colIndices.balance] : undefined;

    // Parse date
    const date = this.parseDate(rawDate, format.dateFormat);
    if (!date) {
      throw new Error(`Data inválida na linha ${lineNumber}: "${rawDate}"`);
    }

    // Parse amount
    const amount = this.parseAmount(rawAmount, format.decimalSeparator);
    if (amount === null) {
      throw new Error(`Valor inválido na linha ${lineNumber}: "${rawAmount}"`);
    }

    // Determine type (income or expense)
    const type: 'income' | 'expense' = amount >= 0 ? 'income' : 'expense';

    // Parse balance if available
    const balance = rawBalance ? this.parseAmount(rawBalance, format.decimalSeparator) : undefined;

    return {
      date,
      description: rawDescription || 'Sem descrição',
      amount: Math.abs(amount),
      type,
      category: rawCategory || undefined,
      balance: balance ?? undefined
    };
  }

  /**
   * Parse date from string.
   * Tries the expected format first, then falls back to auto-detection.
   */
  private parseDate(dateStr: string, format: string): string | null {
    if (!dateStr) return null;

    const cleaned = dateStr.trim().replace(/^["']|["']$/g, '');

    try {
      // Try expected format first
      const result = this.parseDateWithFormat(cleaned, format);
      if (result) return result;

      // Fallback: try the other format
      const altFormat = format === 'YYYY-MM-DD' ? 'DD/MM/YYYY' : 'YYYY-MM-DD';
      return this.parseDateWithFormat(cleaned, altFormat);
    } catch (error) {
      return null;
    }
  }

  private parseDateWithFormat(dateStr: string, format: string): string | null {
    try {
      if (format === 'YYYY-MM-DD' && dateStr.includes('-')) {
        const [year, month, day] = dateStr.split('-');
        const date = new Date(Number(year), Number(month) - 1, Number(day));
        if (isNaN(date.getTime())) return null;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } else if (format === 'DD/MM/YYYY' && dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/');
        const date = new Date(Number(year), Number(month) - 1, Number(day));
        if (isNaN(date.getTime())) return null;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    } catch {
      return null;
    }
    return null;
  }

  /**
   * Parse amount from string
   */
  private parseAmount(amountStr: string, decimalSeparator: string): number | null {
    if (!amountStr || amountStr.trim() === '') return null;

    try {
      // Remove currency symbols and whitespace
      let cleaned = amountStr
        .replace(/[R$\s]/g, '')
        .trim();

      // Handle decimal separator
      if (decimalSeparator === ',') {
        // Brazilian format: 1.234,56 -> remove dots, replace comma with dot
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        // US format: 1,234.56 -> remove commas
        cleaned = cleaned.replace(/,/g, '');
      }

      const amount = parseFloat(cleaned);
      if (isNaN(amount)) return null;

      return amount;
    } catch (error) {
      return null;
    }
  }

  /**
   * Calculate opening and closing balances from transactions
   */
  private calculateBalances(transactions: ParsedTransaction[]): {
    openingBalance: number;
    closingBalance: number;
  } {
    // Sort by date
    const sorted = [...transactions].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // If we have balance information in transactions, use it
    const firstWithBalance = sorted.find(t => t.balance !== undefined);
    const lastWithBalance = [...sorted].reverse().find(t => t.balance !== undefined);

    if (firstWithBalance?.balance !== undefined && lastWithBalance?.balance !== undefined) {
      return {
        openingBalance: firstWithBalance.balance,
        closingBalance: lastWithBalance.balance
      };
    }

    // Otherwise, calculate from transactions
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Assume opening balance is 0 if not provided
    const openingBalance = 0;
    const closingBalance = openingBalance + totalIncome - totalExpense;

    return { openingBalance, closingBalance };
  }
}

// Export singleton instance
export const csvParserService = new CSVParserService();
