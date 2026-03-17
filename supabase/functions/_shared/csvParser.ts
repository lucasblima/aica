/**
 * Deno-compatible CSV parser for bank statements.
 * Ported from src/modules/finance/services/csvParserService.ts.
 * Works with raw string content (no browser File/FileReader APIs).
 */

export interface ParsedCSVTransaction {
  date: string;          // YYYY-MM-DD
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category?: string;
}

export interface CSVParseResult {
  bankName: string;
  periodStart: string;
  periodEnd: string;
  transactions: ParsedCSVTransaction[];
}

type BankFormat = 'nubank' | 'inter' | 'itau' | 'generic';

/**
 * Detect bank format from CSV header row
 */
function detectBankFormat(headerRow: string): BankFormat {
  const lower = headerRow.toLowerCase();

  // Nubank: "Data,Valor,Descrição" or "date,amount,description"
  if (lower.includes('data') && lower.includes('valor') && lower.includes('descri')) return 'nubank';
  if (lower.includes('date') && lower.includes('amount') && lower.includes('description')) return 'nubank';

  // Inter: "Data Lançamento,Histórico,Valor,Saldo"
  if (lower.includes('histórico') || lower.includes('historico')) return 'inter';
  if (lower.includes('lançamento') || lower.includes('lancamento')) return 'inter';

  // Itaú: "data,lançamento,ag./origem,valor"
  if (lower.includes('ag./origem') || lower.includes('ag.origem')) return 'itau';

  return 'generic';
}

/**
 * Parse CSV date to YYYY-MM-DD format
 */
function parseDate(dateStr: string): string {
  const trimmed = dateStr.trim().replace(/"/g, '');

  // DD/MM/YYYY
  const brMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;

  // YYYY-MM-DD (already correct)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  return trimmed;
}

/**
 * Parse a CSV amount value, handling Brazilian number format
 */
function parseAmount(value: string): number {
  const cleaned = value.trim().replace(/"/g, '').replace(/\s/g, '');
  // Brazilian format: 1.234,56 → 1234.56
  if (cleaned.includes(',') && cleaned.includes('.')) {
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
  }
  // Just comma as decimal: 1234,56 → 1234.56
  if (cleaned.includes(',')) {
    return parseFloat(cleaned.replace(',', '.'));
  }
  return parseFloat(cleaned);
}

/**
 * Split CSV line respecting quoted fields
 */
function splitCSVLine(line: string, separator = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === separator && !inQuotes) {
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
 * Parse CSV content string into structured transactions.
 * Main entry point for Edge Functions.
 */
export function parseCSVContent(content: string): CSVParseResult {
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) {
    throw new Error('CSV vazio ou sem transações');
  }

  const headerRow = lines[0];
  const separator = headerRow.includes(';') ? ';' : ',';
  const format = detectBankFormat(headerRow);

  const headers = splitCSVLine(headerRow, separator).map(h => h.toLowerCase().replace(/"/g, ''));

  // Find column indices based on format
  let dateIdx = -1, descIdx = -1, amountIdx = -1;

  switch (format) {
    case 'nubank':
      dateIdx = headers.findIndex(h => h.includes('data') || h === 'date');
      amountIdx = headers.findIndex(h => h.includes('valor') || h === 'amount');
      descIdx = headers.findIndex(h => h.includes('descri') || h === 'description');
      break;
    case 'inter':
      dateIdx = headers.findIndex(h => h.includes('data'));
      descIdx = headers.findIndex(h => h.includes('histórico') || h.includes('historico'));
      amountIdx = headers.findIndex(h => h.includes('valor'));
      break;
    case 'itau':
      dateIdx = headers.findIndex(h => h.includes('data'));
      descIdx = headers.findIndex(h => h.includes('lançamento') || h.includes('lancamento'));
      amountIdx = headers.findIndex(h => h.includes('valor'));
      break;
    default:
      dateIdx = 0;
      amountIdx = headers.length - 1;
      descIdx = headers.length > 2 ? 1 : 0;
  }

  if (dateIdx === -1 || amountIdx === -1) {
    throw new Error(`Formato CSV não reconhecido: ${headerRow}`);
  }
  if (descIdx === -1) descIdx = dateIdx === 0 ? 1 : 0;

  const transactions: ParsedCSVTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i], separator);
    if (cols.length <= Math.max(dateIdx, descIdx, amountIdx)) continue;

    const dateStr = parseDate(cols[dateIdx]);
    const description = cols[descIdx].replace(/"/g, '').trim();
    const amount = parseAmount(cols[amountIdx]);

    if (!dateStr || isNaN(amount) || !description) continue;

    transactions.push({
      date: dateStr,
      description,
      amount,
      type: amount >= 0 ? 'income' : 'expense',
    });
  }

  if (transactions.length === 0) {
    throw new Error('Nenhuma transação válida encontrada no CSV');
  }

  // Determine period from transactions
  const dates = transactions.map(t => t.date).sort();

  const bankNameMap: Record<BankFormat, string> = {
    nubank: 'Nubank',
    inter: 'Banco Inter',
    itau: 'Itaú',
    generic: 'Banco',
  };

  return {
    bankName: bankNameMap[format],
    periodStart: dates[0],
    periodEnd: dates[dates.length - 1],
    transactions,
  };
}
