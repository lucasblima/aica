/**
 * PDF Processing Service
 *
 * Refatorado para usar Edge Functions para AI parsing
 * - Secure backend AI calls via Supabase Edge Functions
 * - Client-side PDF extraction using PDF.js
 * - Falls back to Python server for complex processing
 */

import * as pdfjsLib from 'pdfjs-dist'
import { createNamespacedLogger } from '@/lib/logger'
import { PDF_EXTRACTOR_URL } from '@/config/api'

const log = createNamespacedLogger('PDFProcessing')
import { supabase } from '@/services/supabaseClient'
import * as EdgeFunctionService from '@/services/edgeFunctionService'
import type {
  PDFExtractionResult,
  ParsedStatement,
  ParsedTransaction,
  AccountType,
} from '../types'

// Configure PDF.js worker - use local worker for reliability
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

// =====================================================
// PDF Processing Service
// =====================================================

export class PDFProcessingService {
  /**
   * Extract text from PDF using PDF.js (client-side)
   * This ensures the raw PDF never leaves the browser until ready for backend processing
   */
  async extractTextFromPDF(file: File): Promise<PDFExtractionResult> {
    try {
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
      }

      return {
        rawText: fullText.trim(),
        pageCount,
        extractedAt: new Date().toISOString(),
      }
    } catch (error) {
      log.error('[PDFProcessingService] PDF extraction failed:', error)
      throw new Error('Falha ao extrair texto do PDF. Verifique se o arquivo não está corrompido.')
    }
  }

  /**
   * Process PDF file through Python backend using /extract endpoint
   *
   * This method:
   * 1. Sends PDF as FormData to Python server /extract endpoint
   * 2. Returns extracted text and structured data
   *
   * Benefits:
   * - Uses correct Python server endpoint (/extract)
   * - No timeout limits (can process large PDFs)
   * - Handles file upload correctly
   */
  async processPDFFile(file: File, userId: string): Promise<ParsedStatement> {
    try {
      // Check if Python server is available
      const healthCheck = await fetch(`${PDF_EXTRACTOR_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      }).catch(() => null)

      if (!healthCheck || !healthCheck.ok) {
        // Fallback to client-side processing
        log.warn('[PDFProcessingService] Python server not available, using client-side fallback')
        const extraction = await this.extractTextFromPDF(file)
        return await this.parseStatementWithGeminiFallback(extraction.rawText)
      }

      // Send PDF to Python server /extract endpoint
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${PDF_EXTRACTOR_URL}/extract`, {
        method: 'POST',
        headers: {
          'X-User-Id': userId
        },
        body: formData
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(`Falha no servidor: ${error.error || response.statusText}`)
      }

      const data = await response.json()

      // Parse the extracted text with Gemini fallback
      // Python server returns markdown or raw_text, not "text"
      const textToParse = data.text || data.markdown || data.raw_text

      if (textToParse) {
        log.debug('[PDFProcessingService] Parsing extracted text with Gemini fallback...')
        return await this.parseStatementWithGeminiFallback(textToParse)
      }

      throw new Error('Servidor não retornou texto extraído (text, markdown, ou raw_text)')

    } catch (error) {
      log.error('[PDFProcessingService] PDF processing failed:', error)
      // Fallback to client-side if server fails
      const extraction = await this.extractTextFromPDF(file)
      return await this.parseStatementWithGeminiFallback(extraction.rawText)
    }
  }

  /**
   * Parse statement using extracted text (legacy method)
   *
   * @deprecated Use processPDFFile instead for better security
   * This method is kept for backwards compatibility and always uses Gemini fallback
   */
  async parseStatementWithAI(rawText: string): Promise<ParsedStatement> {
    log.warn(
      '[PDFProcessingService] parseStatementWithAI is deprecated. Use processPDFFile instead.'
    )

    // Always use Gemini fallback for this deprecated method
    // The new processPDFFile method handles Python server integration properly
    return await this.parseStatementWithGeminiFallback(rawText)
  }

  /**
   * Parse statement using Gemini via Edge Function (secure backend call)
   *
   * @param rawText - Extracted text from PDF
   * @returns Parsed statement data
   */
  async parseStatementWithGeminiFallback(rawText: string): Promise<ParsedStatement> {
    try {
      log.debug('[PDFProcessingService] Calling Edge Function for AI parsing...')

      const parsed = await EdgeFunctionService.parseStatement({ rawText })

      if (!parsed || typeof parsed !== 'object') {
        log.error('[PDFProcessingService] Edge Function returned invalid data:', parsed)
        throw new Error('Não foi possível extrair dados válidos da resposta')
      }

      // Normalize data
      return {
        bankName: parsed.bankName || 'Banco Desconhecido',
        accountType: parsed.accountType || 'checking',
        periodStart: parsed.periodStart || new Date().toISOString().split('T')[0],
        periodEnd: parsed.periodEnd || new Date().toISOString().split('T')[0],
        openingBalance: Number(parsed.openingBalance) || 0,
        closingBalance: Number(parsed.closingBalance) || 0,
        currency: parsed.currency || 'BRL',
        transactions: (parsed.transactions || []).map((t: any) => ({
          date: t.date,
          description: t.description,
          amount: Number(t.amount),
          type: t.type,
          balance: 0, // Will be calculated
          suggestedCategory: t.category || 'other'
        })),
        piiSanitized: false // Direct Gemini parsing doesn't sanitize PII
      }
    } catch (error) {
      log.error('[PDFProcessingService] Gemini fallback parsing failed:', error)
      throw new Error('Falha ao processar extrato com IA. Tente novamente.')
    }
  }

  /**
   * Convert Python server response to ParsedStatement format
   */
  private convertToParsedStatement(
    transactions: any[],
    piiStats?: any
  ): ParsedStatement {
    if (!Array.isArray(transactions) || transactions.length === 0) {
      throw new Error('Nenhuma transação encontrada no PDF')
    }

    // Extract metadata from transactions
    const dates = transactions
      .map(t => new Date(t.date))
      .filter(d => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime())

    const periodStart = dates[0]?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
    const periodEnd = dates[dates.length - 1]?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]

    // Determine account type from transaction patterns
    const accountType = this.inferAccountType(transactions)

    // Calculate balances
    let runningBalance = 0
    const normalizedTransactions: ParsedTransaction[] = transactions.map(t => {
      const amount = Number(t.amount) || 0
      const type = t.type === 'credit' ? 'income' : 'expense'

      // Update running balance
      runningBalance += type === 'income' ? Math.abs(amount) : -Math.abs(amount)

      return {
        date: t.date || periodStart,
        description: t.description || 'Sem descrição',
        amount: type === 'income' ? Math.abs(amount) : -Math.abs(amount),
        type,
        balance: t.balance !== undefined ? Number(t.balance) : runningBalance,
        suggestedCategory: t.category || 'other'
      }
    })

    const openingBalance = normalizedTransactions[0]?.balance || 0
    const closingBalance = normalizedTransactions[normalizedTransactions.length - 1]?.balance || runningBalance

    return {
      bankName: 'Banco Desconhecido', // Python server doesn't extract bank name yet
      accountType,
      periodStart,
      periodEnd,
      openingBalance,
      closingBalance,
      currency: 'BRL',
      transactions: normalizedTransactions,
      piiSanitized: piiStats ? true : undefined,
      piiStats: piiStats || undefined
    }
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

    return 'checking' // Default to checking account
  }

  /**
   * Convert File to base64 string
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result as string
        // Remove data URL prefix if present
        const base64Data = base64.includes(',') ? base64.split(',')[1] : base64
        resolve(base64Data)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
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
      data.piiSanitized ? '**PII Sanitizado:** ✅ Sim (conforme LGPD)' : '',
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
