/**
 * OFX/QFX Parser Service
 * Parses OFX file format commonly used by Brazilian banks.
 * OFX structure: <OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST><STMTTRN>
 */

import { createNamespacedLogger } from '@/lib/logger';
import type { CSVParseResult, ParsedTransaction } from './csvParserService';

const log = createNamespacedLogger('OFXParserService');

/**
 * Parse an OFX/QFX file string and return a CSVParseResult-compatible object.
 */
export function parseOFX(content: string, fileName: string): CSVParseResult {
  try {
    const transactions = extractTransactions(content);
    const bankName = extractTag(content, 'ORG') || detectBankFromContent(content);
    const accountType = detectAccountType(content);
    const currency = extractTag(content, 'CURDEF') || 'BRL';

    // Extract date range from DTSTART/DTEND or from transactions
    const dtStart = extractTag(content, 'DTSTART');
    const dtEnd = extractTag(content, 'DTEND');
    const periodStart = dtStart ? parseOFXDate(dtStart) : (transactions[0]?.date || '');
    const periodEnd = dtEnd ? parseOFXDate(dtEnd) : (transactions[transactions.length - 1]?.date || '');

    // Extract balance info
    const balAmt = extractTag(content, 'BALAMT');
    const closingBalance = balAmt ? parseFloat(balAmt) : 0;

    // Compute opening balance: closing - net of transactions
    const netAmount = transactions.reduce((sum, t) => {
      return sum + (t.type === 'income' ? t.amount : -t.amount);
    }, 0);
    const openingBalance = closingBalance - netAmount;

    log.info(`Parsed ${transactions.length} transactions from OFX (${bankName})`);

    return {
      bankName: bankName || 'unknown',
      accountType,
      periodStart,
      periodEnd,
      openingBalance,
      closingBalance,
      currency,
      transactions,
      sourceFormat: `ofx_${(bankName || 'generic').toLowerCase().replace(/\s/g, '_')}`,
      rawDataSnapshot: [], // OFX is not row-based like CSV
    };
  } catch (error) {
    log.error('OFX parse error:', error);
    throw new Error(`Failed to parse OFX file "${fileName}": ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extract all <STMTTRN> blocks and parse each one.
 */
function extractTransactions(content: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  let skippedCount = 0;

  // Match all STMTTRN blocks
  const stmtTrnRegex = /<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>|<\/BANKTRANLIST>))/gi;
  let match: RegExpExecArray | null;

  while ((match = stmtTrnRegex.exec(content)) !== null) {
    const block = match[1];

    const dtPosted = extractTag(block, 'DTPOSTED');
    const trnAmt = extractTag(block, 'TRNAMT');
    const name = extractTag(block, 'NAME') || extractTag(block, 'MEMO') || '';
    const memo = extractTag(block, 'MEMO') || '';

    if (!dtPosted || !trnAmt) {
      skippedCount++;
      log.warn(`[OFX] Skipped transaction: missing ${!dtPosted ? 'date' : 'amount'}`);
      continue;
    }

    const amount = parseFloat(trnAmt);
    const description = name || memo;

    transactions.push({
      date: parseOFXDate(dtPosted),
      description: description.trim(),
      amount: Math.abs(amount),
      type: amount >= 0 ? 'income' : 'expense',
    });
  }

  if (skippedCount > 0) {
    log.warn(`[OFX] Total skipped: ${skippedCount} transactions with missing data`);
  }

  // Sort by date ascending
  transactions.sort((a, b) => a.date.localeCompare(b.date));

  return transactions;
}

/**
 * Extract a single OFX tag value from content.
 * OFX tags look like: <TAGNAME>value or <TAGNAME>value\n
 */
function extractTag(content: string, tagName: string): string | null {
  // SGML-style (no closing tag)
  const sgmlRegex = new RegExp(`<${tagName}>([^<\\r\\n]+)`, 'i');
  const sgmlMatch = content.match(sgmlRegex);
  if (sgmlMatch) return sgmlMatch[1].trim();

  // XML-style (with closing tag)
  const xmlRegex = new RegExp(`<${tagName}>([^<]*)</${tagName}>`, 'i');
  const xmlMatch = content.match(xmlRegex);
  if (xmlMatch) return xmlMatch[1].trim();

  return null;
}

/**
 * Parse OFX date format (YYYYMMDD or YYYYMMDDHHMMSS) to YYYY-MM-DD.
 */
function parseOFXDate(dateStr: string): string {
  // Remove timezone offset if present (e.g., [-3:BRT])
  const cleaned = dateStr.replace(/\[.*\]/, '').trim();
  if (cleaned.length >= 8) {
    const year = cleaned.substring(0, 4);
    const month = cleaned.substring(4, 6);
    const day = cleaned.substring(6, 8);
    return `${year}-${month}-${day}`;
  }
  return dateStr;
}

/**
 * Detect bank name from OFX content heuristics.
 */
function detectBankFromContent(content: string): string {
  const upper = content.toUpperCase();
  if (upper.includes('NUBANK') || upper.includes('NU PAGAMENTOS')) return 'Nubank';
  if (upper.includes('INTER') || upper.includes('BANCO INTER')) return 'Inter';
  if (upper.includes('ITAU') || upper.includes('ITAÚ')) return 'Itau';
  if (upper.includes('BRADESCO')) return 'Bradesco';
  if (upper.includes('CAIXA')) return 'Caixa';
  if (upper.includes('SANTANDER')) return 'Santander';
  if (upper.includes('BANCO DO BRASIL') || upper.includes('BB S.A')) return 'Banco do Brasil';
  return 'unknown';
}

/**
 * Detect account type from OFX ACCTTYPE tag.
 */
function detectAccountType(content: string): CSVParseResult['accountType'] {
  const acctType = extractTag(content, 'ACCTTYPE');
  if (!acctType) return 'checking';

  const upper = acctType.toUpperCase();
  if (upper === 'CHECKING') return 'checking';
  if (upper === 'SAVINGS') return 'savings';
  if (upper === 'CREDITLINE' || upper === 'CREDITCARD') return 'credit_card';
  return 'checking';
}

/**
 * Check if a file is likely OFX format.
 */
export function isOFXFile(fileName: string, content?: string): boolean {
  const ext = fileName.toLowerCase();
  if (ext.endsWith('.ofx') || ext.endsWith('.qfx')) return true;
  if (content && (content.includes('<OFX>') || content.includes('<ofx>'))) return true;
  return false;
}
