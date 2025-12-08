/**
 * CSV Parser Service
 * Detecta formato do CSV e extrai transações
 * Suporta: Nubank, Inter, Itaú
 */

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
      throw new Error('Formato de CSV não reconhecido. Suporte: Nubank, Inter, Itaú.');
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
        console.warn(`Linha ${i + 2} ignorada:`, error);
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
   * Detect CSV format based on header
   */
  private detectFormat(csvContent: string): CSVBankFormat | null {
    const lines = csvContent.split('\n');
    if (lines.length < 1) return null;

    const header = lines[0].toLowerCase();

    // Detect by header columns
    for (const format of KNOWN_FORMATS) {
      const dateCol = typeof format.columns.date === 'string'
        ? format.columns.date.toLowerCase()
        : format.columns.date;
      const descCol = typeof format.columns.description === 'string'
        ? format.columns.description.toLowerCase()
        : format.columns.description;

      if (typeof dateCol === 'string' && typeof descCol === 'string') {
        if (header.includes(dateCol) && header.includes(descCol)) {
          return format;
        }
      }
    }

    return null;
  }

  /**
   * Parse CSV lines respecting delimiter
   */
  private parseLines(content: string, delimiter: string): string[][] {
    const lines = content.split('\n').filter(line => line.trim() !== '');
    return lines.map(line => {
      // Simple CSV parsing (doesn't handle quoted commas yet)
      return line.split(delimiter).map(cell => cell.trim());
    });
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

    // Validate required columns
    if (indices.date === -1 || indices.description === -1 || indices.amount === -1) {
      throw new Error('Colunas obrigatórias não encontradas no CSV');
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
   * Parse date from string
   */
  private parseDate(dateStr: string, format: string): string | null {
    if (!dateStr) return null;

    try {
      if (format === 'YYYY-MM-DD') {
        // Already in correct format
        const [year, month, day] = dateStr.split('-');
        const date = new Date(Number(year), Number(month) - 1, Number(day));
        if (isNaN(date.getTime())) return null;
        return dateStr;
      } else if (format === 'DD/MM/YYYY') {
        // Convert DD/MM/YYYY to YYYY-MM-DD
        const [day, month, year] = dateStr.split('/');
        const date = new Date(Number(year), Number(month) - 1, Number(day));
        if (isNaN(date.getTime())) return null;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    } catch (error) {
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
