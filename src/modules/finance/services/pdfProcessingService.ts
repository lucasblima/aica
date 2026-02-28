/**
 * PDF Processing Service
 *
 * Client-side PDF text extraction (PDF.js) + AI parsing (Gemini via Edge Function).
 * No Python server dependency — all processing is browser + Edge Function.
 */

import * as pdfjsLib from 'pdfjs-dist'
import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('PDFProcessing')
import * as EdgeFunctionService from '@/services/edgeFunctionService'
import type {
  PDFExtractionResult,
  ParsedStatement,
  ParsedTransaction,
  AccountType,
} from '../types'

interface ParsedGeminiTransaction {
    date: string;
    description: string;
    amount: number | string;
    type: 'income' | 'expense';
    balance?: number | string;
    category?: string;
}

// Configure PDF.js worker - use local worker for reliability
pdfjsLib.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL || '/'}pdf.worker.min.mjs`

// =====================================================
// Progress Callback Types
// =====================================================

export type PDFProcessingStage =
  | 'extracting_text'
  | 'detecting_bank'
  | 'ai_parsing'
  | 'categorizing'
  | 'complete'
  | 'error'

export interface PDFProgressUpdate {
  stage: PDFProcessingStage
  message: string
  detail?: string
  progress: number // 0-100
}

export type OnProgressCallback = (update: PDFProgressUpdate) => void

// =====================================================
// PDF Processing Service
// =====================================================

export class PDFProcessingService {
  /**
   * Extract text from PDF using PDF.js (client-side)
   * This ensures the raw PDF never leaves the browser until ready for backend processing
   */
  async extractTextFromPDF(
    file: File,
    onProgress?: OnProgressCallback
  ): Promise<PDFExtractionResult> {
    try {
      onProgress?.({
        stage: 'extracting_text',
        message: 'Extraindo texto do PDF...',
        detail: file.name,
        progress: 10,
      })

      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

      let fullText = ''
      const pageCount = pdf.numPages

      for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items
          .map((item: { str?: string }) => item.str || '')
          .join(' ')
        fullText += pageText + '\n\n'

        onProgress?.({
          stage: 'extracting_text',
          message: `Lendo página ${i} de ${pageCount}...`,
          detail: `${Math.round((fullText.length / 1024))} KB de texto extraído`,
          progress: 10 + Math.round((i / pageCount) * 20),
        })
      }

      return {
        rawText: fullText.trim(),
        pageCount,
        extractedAt: new Date().toISOString(),
      }
    } catch (error) {
      log.error('[PDFProcessingService] PDF extraction failed:', error)
      onProgress?.({
        stage: 'error',
        message: 'Falha ao extrair texto do PDF',
        progress: 0,
      })
      throw new Error('Falha ao extrair texto do PDF. Verifique se o arquivo não está corrompido.')
    }
  }

  /**
   * Process PDF file: extract text with PDF.js → parse with Gemini Edge Function
   *
   * @param file - PDF file to process
   * @param _userId - User ID (kept for API compatibility)
   * @param onProgress - Optional callback for progressive UI updates
   */
  async processPDFFile(
    file: File,
    _userId: string,
    onProgress?: OnProgressCallback
  ): Promise<ParsedStatement> {
    // Step 1: Extract text from PDF client-side
    const extraction = await this.extractTextFromPDF(file, onProgress)

    if (!extraction.rawText || extraction.rawText.length < 50) {
      onProgress?.({
        stage: 'error',
        message: 'PDF parece estar vazio ou protegido',
        progress: 0,
      })
      throw new Error('PDF não contém texto suficiente. Verifique se não é um PDF de imagem (escaneado).')
    }

    // Step 2: Detect bank from text (quick local heuristic)
    onProgress?.({
      stage: 'detecting_bank',
      message: 'Identificando banco e formato...',
      detail: `${extraction.pageCount} página(s), ${Math.round(extraction.rawText.length / 1024)} KB`,
      progress: 35,
    })

    const bankHint = this.detectBankFromText(extraction.rawText)
    if (bankHint) {
      onProgress?.({
        stage: 'detecting_bank',
        message: `Banco detectado: ${bankHint}`,
        detail: 'Enviando para análise com IA...',
        progress: 40,
      })
    }

    // Step 3: Parse with Gemini via Edge Function
    onProgress?.({
      stage: 'ai_parsing',
      message: 'IA analisando transações...',
      detail: 'Gemini está interpretando o extrato',
      progress: 50,
    })

    const parsed = await this.parseStatementWithGeminiFallback(extraction.rawText, onProgress)

    // Step 4: Done
    onProgress?.({
      stage: 'complete',
      message: 'Extrato processado!',
      detail: `${parsed.transactions.length} transações encontradas`,
      progress: 100,
    })

    return parsed
  }

  /**
   * Parse statement using Gemini via Edge Function (secure backend call)
   */
  async parseStatementWithGeminiFallback(
    rawText: string,
    onProgress?: OnProgressCallback
  ): Promise<ParsedStatement> {
    try {
      log.debug('[PDFProcessingService] Calling Edge Function for AI parsing...')

      const parsed = await EdgeFunctionService.parseStatement({ rawText })

      if (!parsed || typeof parsed !== 'object') {
        log.error('[PDFProcessingService] Edge Function returned invalid data:', parsed)
        throw new Error('Não foi possível extrair dados válidos da resposta')
      }

      onProgress?.({
        stage: 'categorizing',
        message: 'Categorizando transações...',
        detail: `${(parsed.transactions || []).length} transações identificadas`,
        progress: 85,
      })

      // Normalize data
      return {
        bankName: parsed.bankName || 'Banco Desconhecido',
        accountType: parsed.accountType || 'checking',
        periodStart: parsed.periodStart || new Date().toISOString().split('T')[0],
        periodEnd: parsed.periodEnd || new Date().toISOString().split('T')[0],
        openingBalance: Number(parsed.openingBalance) || 0,
        closingBalance: Number(parsed.closingBalance) || 0,
        currency: parsed.currency || 'BRL',
        transactions: (parsed.transactions || []).map((t: ParsedGeminiTransaction) => ({
          date: t.date,
          description: t.description,
          amount: Number(t.amount) || 0,
          type: t.type,
          balance: t.balance != null ? Number(t.balance) : 0,
          suggestedCategory: t.category || 'other'
        })),
        piiSanitized: false
      }
    } catch (error) {
      log.error('[PDFProcessingService] Gemini parsing failed:', error)
      onProgress?.({
        stage: 'error',
        message: 'Falha ao processar extrato com IA',
        detail: error instanceof Error ? error.message : 'Erro desconhecido',
        progress: 0,
      })
      throw new Error('Falha ao processar extrato com IA. Tente novamente.')
    }
  }

  /**
   * Quick local heuristic to detect bank from PDF text
   */
  private detectBankFromText(text: string): string | null {
    const lower = text.toLowerCase()
    const bankPatterns: [RegExp, string][] = [
      [/nubank|nu pagamentos/i, 'Nubank'],
      [/banco inter|inter s\.?a/i, 'Banco Inter'],
      [/itaú|itau unibanco/i, 'Itaú'],
      [/bradesco/i, 'Bradesco'],
      [/santander/i, 'Santander'],
      [/banco do brasil|bb s\.?a/i, 'Banco do Brasil'],
      [/caixa econ[oô]mica|cef/i, 'Caixa'],
      [/c6 bank|c6 s\.?a/i, 'C6 Bank'],
      [/btg pactual/i, 'BTG Pactual'],
      [/xp investimentos|xp s\.?a/i, 'XP'],
      [/neon/i, 'Neon'],
      [/next/i, 'Next'],
      [/picpay/i, 'PicPay'],
      [/mercado pago/i, 'Mercado Pago'],
    ]

    for (const [pattern, name] of bankPatterns) {
      if (pattern.test(lower)) return name
    }
    return null
  }

  /**
   * Infer account type from transaction patterns
   */
  private inferAccountType(transactions: any[]): AccountType {
    const descriptions = transactions
      .map(t => (t.description || '').toLowerCase())
      .join(' ')

    if (descriptions.includes('cartão') || descriptions.includes('fatura')) {
      return 'credit_card'
    }
    if (descriptions.includes('poupança') || descriptions.includes('rendimento')) {
      return 'savings'
    }
    if (descriptions.includes('investimento') || descriptions.includes('aplicação')) {
      return 'investment'
    }

    return 'checking'
  }

  /**
   * Generate markdown summary from parsed statement
   */
  generateMarkdown(data: ParsedStatement): string {
    const totalIncome = data.transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    const totalExpenses = data.transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    const lines = [
      `# Extrato Bancário - ${data.bankName}`,
      '',
      `**Período:** ${data.periodStart} a ${data.periodEnd}`,
      `**Tipo de Conta:** ${this.getAccountTypeLabel(data.accountType)}`,
      `**Moeda:** ${data.currency}`,
      data.piiSanitized ? '**PII Sanitizado:** Sim (conforme LGPD)' : '',
      '',
      '## Resumo',
      '',
      '| Métrica | Valor |',
      '|---------|-------|',
      `| Saldo Inicial | R$ ${data.openingBalance.toFixed(2)} |`,
      `| Saldo Final | R$ ${data.closingBalance.toFixed(2)} |`,
      `| Total Entradas | R$ ${totalIncome.toFixed(2)} |`,
      `| Total Saídas | R$ ${totalExpenses.toFixed(2)} |`,
      `| Total de Transações | ${data.transactions.length} |`,
      '',
      '## Transações',
      '',
      '| Data | Descrição | Valor | Tipo | Categoria |',
      '|------|-----------|-------|------|-----------|',
      ...data.transactions.map(
        (t) =>
          `| ${t.date} | ${t.description.substring(0, 40)} | R$ ${t.amount.toFixed(2)} | ${t.type === 'income' ? 'Entrada' : 'Saída'} | ${t.suggestedCategory || '-'} |`
      ),
    ]

    return lines.filter(Boolean).join('\n')
  }

  /**
   * Calculate SHA-256 hash for file deduplication
   */
  async calculateFileHash(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Get human-readable account type label
   */
  private getAccountTypeLabel(type: AccountType): string {
    const labels: Record<AccountType, string> = {
      checking: 'Conta Corrente',
      savings: 'Poupança',
      credit_card: 'Cartão de Crédito',
      investment: 'Investimento',
      other: 'Outro',
    }
    return labels[type] || 'Outro'
  }
}

// Export singleton instance
export const pdfProcessingService = new PDFProcessingService()
