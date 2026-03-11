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

// Configure PDF.js worker - Vite handles as static asset (same origin, correct MIME, version-matched)
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl

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

interface TextStats {
  lineCount: number
  estimatedTransactions: number
  dateCount: number
  currencyCount: number
  dateRange: string | null
}

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

    // Step 2: Quick local analysis before AI — gather stats for rich progress
    const textStats = this.analyzeExtractedText(extraction.rawText)

    onProgress?.({
      stage: 'detecting_bank',
      message: 'Analisando estrutura do extrato...',
      detail: `${extraction.pageCount} página(s) · ${textStats.lineCount} linhas · ${Math.round(extraction.rawText.length / 1024)} KB`,
      progress: 33,
    })

    const bankHint = this.detectBankFromText(extraction.rawText)

    onProgress?.({
      stage: 'detecting_bank',
      message: bankHint ? `Banco identificado: ${bankHint}` : 'Formato de banco não reconhecido',
      detail: `~${textStats.estimatedTransactions} transações estimadas · ${textStats.dateRange || 'período a confirmar'}`,
      progress: 40,
    })

    if (textStats.currencyCount > 0) {
      onProgress?.({
        stage: 'detecting_bank',
        message: 'Dados financeiros detectados',
        detail: `${textStats.currencyCount} valores monetários · ${textStats.dateCount} datas encontradas`,
        progress: 45,
      })
    }

    // Step 3: Parse with Gemini via Edge Function
    onProgress?.({
      stage: 'ai_parsing',
      message: 'Enviando para Gemini...',
      detail: `${textStats.lineCount} linhas para análise de IA`,
      progress: 50,
    })

    const parsed = await this.parseStatementWithGeminiFallback(extraction.rawText, onProgress, textStats)

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
   * Pre-process raw PDF text to reduce noise before sending to Gemini.
   * Strips blank lines, page markers, repeated headers, and trims whitespace.
   */
  private preprocessText(rawText: string): string {
    const lines = rawText.split('\n')
    const cleaned: string[] = []
    let lastLine = ''

    for (const rawLine of lines) {
      const line = rawLine.trim()
      // Skip empty lines (collapse multiple blanks)
      if (!line) continue
      // Skip page markers (e.g., "Página 1 de 5", "Page 1/5")
      if (/^p[aá]gina\s+\d+/i.test(line)) continue
      if (/^page\s+\d+/i.test(line)) continue
      // Skip standalone page numbers
      if (/^\d{1,3}$/.test(line)) continue
      // Skip repeated consecutive lines (headers/footers on each page)
      if (line === lastLine) continue
      // Skip common PDF artifacts
      if (/^={3,}$|^-{3,}$|^\*{3,}$/.test(line)) continue

      cleaned.push(line)
      lastLine = line
    }

    const result = cleaned.join('\n')
    log.debug(`[PDFProcessingService] Text preprocessed: ${rawText.length} → ${result.length} chars (${Math.round((1 - result.length / rawText.length) * 100)}% reduction)`)
    return result
  }

  /**
   * Check if an error is a retryable network/timeout issue
   */
  private isRetryableError(error: unknown): boolean {
    const msg = error instanceof Error ? error.message.toLowerCase() : ''
    return msg.includes('failed to send') ||
           msg.includes('fetch') ||
           msg.includes('timeout') ||
           msg.includes('504') ||
           msg.includes('502') ||
           msg.includes('network') ||
           msg.includes('econnreset')
  }

  /**
   * Parse statement using Gemini via Edge Function with retry logic.
   * Retries up to MAX_RETRIES times on transient failures (timeout, network).
   */
  async parseStatementWithGeminiFallback(
    rawText: string,
    onProgress?: OnProgressCallback,
    textStats?: TextStats
  ): Promise<ParsedStatement> {
    const MAX_RETRIES = 3
    const BACKOFF_BASE_MS = 3000 // 3s, 6s, 12s

    // Pre-process text to reduce noise and improve Gemini accuracy
    const cleanedText = this.preprocessText(rawText)

    const stats = textStats || { lineCount: 0, estimatedTransactions: 0, dateCount: 0, currencyCount: 0, dateRange: null }

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const isRetry = attempt > 1
        log.debug(`[PDFProcessingService] AI parsing attempt ${attempt}/${MAX_RETRIES}...`)

        // Build context-aware progress messages
        const retryLabel = isRetry ? ` (tentativa ${attempt}/${MAX_RETRIES})` : ''
        const AI_STEPS: Array<{ message: string; detail: string }> = [
          { message: `Gemini lendo o extrato...${retryLabel}`, detail: `Processando ${stats.lineCount} linhas de dados` },
          { message: `Identificando ~${stats.estimatedTransactions} transações...`, detail: `${stats.dateCount} datas · ${stats.currencyCount} valores encontrados` },
          { message: 'Classificando receitas e despesas...', detail: stats.dateRange ? `Período: ${stats.dateRange}` : 'Analisando período do extrato' },
          { message: 'Extraindo descrições e valores...', detail: 'Interpretando formato bancário' },
          { message: 'Categorizando transações...', detail: 'Alimentação, transporte, moradia, lazer...' },
          { message: 'Validando dados extraídos...', detail: 'Conferindo consistência de saldos' },
          { message: 'Estruturando resultado final...', detail: 'Montando JSON com transações' },
        ]
        let simulatedProgress = isRetry ? 45 : 50
        let stepIdx = 0
        let tickCount = 0
        const startTime = Date.now()
        const progressTimer = setInterval(() => {
          if (simulatedProgress < 82) {
            simulatedProgress += 0.5
            tickCount++
            if (tickCount % 10 === 0 && stepIdx < AI_STEPS.length - 1) {
              stepIdx++
            }
            const elapsed = Math.floor((Date.now() - startTime) / 1000)
            const step = AI_STEPS[stepIdx]
            onProgress?.({
              stage: 'ai_parsing',
              message: step.message,
              detail: `${step.detail} · ${elapsed}s`,
              progress: simulatedProgress,
            })
          }
        }, 1000)

        let parsed
        try {
          parsed = await EdgeFunctionService.parseStatement({ rawText: cleanedText })
        } finally {
          clearInterval(progressTimer)
        }

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

        // Normalize data — validate type field since Gemini may return unexpected values
        const normalizedTransactions = (parsed.transactions || []).map((t: ParsedGeminiTransaction) => {
          const amount = Number(t.amount) || 0
          let type: 'income' | 'expense' = t.type
          if (type !== 'income' && type !== 'expense') {
            type = amount >= 0 ? 'income' : 'expense'
            log.warn(`[PDFProcessingService] Invalid type "${t.type}" for "${t.description}", inferred: ${type}`)
          }
          return {
            date: t.date,
            description: t.description,
            amount,
            type,
            balance: t.balance != null ? Number(t.balance) : 0,
            suggestedCategory: t.category || 'other'
          }
        })

        // 2nd pass: re-categorize poorly classified transactions via dedicated categorizer
        const poorlyClassified = normalizedTransactions.filter(
          t => t.suggestedCategory === 'transfer' || t.suggestedCategory === 'other'
        )

        if (poorlyClassified.length > 0) {
          log.info(`[PDFProcessingService] 2nd pass: re-categorizing ${poorlyClassified.length} transfer/other transactions`)
          onProgress?.({
            stage: 'categorizing',
            message: 'Refinando categorias com IA...',
            detail: `${poorlyClassified.length} transações PIX sendo re-classificadas`,
            progress: 90,
          })

          try {
            const catResult = await EdgeFunctionService.callGeminiEdgeFunction('categorize_transactions', {
              transactions: poorlyClassified.map(t => ({
                description: t.description,
                amount: t.amount,
                type: t.type,
              })),
            })

            const categories = (catResult as any)?.categories
            if (Array.isArray(categories) && categories.length === poorlyClassified.length) {
              // Build a map of description+amount → new category for lookup
              let improved = 0
              for (let j = 0; j < poorlyClassified.length; j++) {
                const newCat = categories[j]
                if (newCat && newCat !== poorlyClassified[j].suggestedCategory) {
                  poorlyClassified[j].suggestedCategory = newCat
                  improved++
                }
              }
              log.info(`[PDFProcessingService] 2nd pass improved ${improved} of ${poorlyClassified.length} categories`)
            }
          } catch (catError) {
            log.warn('[PDFProcessingService] 2nd pass categorization failed (non-critical):', catError)
          }
        }

        return {
          bankName: parsed.bankName || 'Banco Desconhecido',
          accountType: parsed.accountType || 'checking',
          periodStart: parsed.periodStart || new Date().toISOString().split('T')[0],
          periodEnd: parsed.periodEnd || new Date().toISOString().split('T')[0],
          openingBalance: Number(parsed.openingBalance) || 0,
          closingBalance: Number(parsed.closingBalance) || 0,
          currency: parsed.currency || 'BRL',
          transactions: normalizedTransactions,
          piiSanitized: false
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'

        // Auth errors should not be retried
        if (errorMessage.includes('Authentication') || errorMessage.includes('log in')) {
          log.error('[PDFProcessingService] Auth error — no retry:', errorMessage)
          onProgress?.({ stage: 'error', message: 'Sessão expirada. Faça login novamente.', detail: errorMessage, progress: 0 })
          throw error instanceof Error ? error : new Error(errorMessage)
        }

        // Check if retryable
        if (this.isRetryableError(error) && attempt < MAX_RETRIES) {
          const waitMs = BACKOFF_BASE_MS * Math.pow(2, attempt - 1)
          log.warn(`[PDFProcessingService] Attempt ${attempt} failed (${errorMessage}). Retrying in ${waitMs / 1000}s...`)
          onProgress?.({
            stage: 'ai_parsing',
            message: `Conexão instável — tentando novamente (${attempt}/${MAX_RETRIES})...`,
            detail: `Aguardando ${waitMs / 1000}s antes de reconectar`,
            progress: 42,
          })
          await new Promise(resolve => setTimeout(resolve, waitMs))
          continue
        }

        // Final failure — no more retries
        log.error(`[PDFProcessingService] All ${attempt} attempt(s) failed:`, error)
        onProgress?.({
          stage: 'error',
          message: attempt >= MAX_RETRIES
            ? `Falha após ${MAX_RETRIES} tentativas — servidor IA indisponível`
            : 'Falha ao processar extrato com IA',
          detail: errorMessage,
          progress: 0,
        })
        throw new Error(`Falha ao processar extrato com IA: ${errorMessage}`)
      }
    }

    // Should never reach here, but TypeScript needs it
    throw new Error('Falha inesperada no processamento')
  }

  /**
   * Quick local analysis of extracted text — gather stats for rich progress messages
   */
  private analyzeExtractedText(text: string): TextStats {
    const lines = text.split('\n').filter(l => l.trim().length > 0)

    // Count date patterns (DD/MM/YYYY, DD/MM/YY, YYYY-MM-DD)
    const dateMatches = text.match(/\d{2}\/\d{2}\/\d{2,4}|\d{4}-\d{2}-\d{2}/g) || []

    // Count currency patterns (R$ X.XXX,XX or -X.XXX,XX or numbers with comma decimals)
    const currencyMatches = text.match(/R\$\s?[\d.,]+|-?\d+[.,]\d{2}\b/g) || []

    // Estimate transactions: lines that start with a date pattern
    const transactionLines = lines.filter(l => /^\s*\d{2}\/\d{2}/.test(l))

    // Try to extract date range from dates found
    let dateRange: string | null = null
    if (dateMatches.length >= 2) {
      const parseDMY = (d: string) => {
        const parts = d.split('/')
        if (parts.length === 3) {
          const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2]
          return new Date(`${year}-${parts[1]}-${parts[0]}`)
        }
        return new Date(d)
      }
      const dates = dateMatches
        .map(parseDMY)
        .filter(d => !isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime())
      if (dates.length >= 2) {
        const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
        dateRange = `${fmt(dates[0])} a ${fmt(dates[dates.length - 1])}`
      }
    }

    return {
      lineCount: lines.length,
      estimatedTransactions: transactionLines.length || Math.max(Math.floor(currencyMatches.length / 2), 1),
      dateCount: dateMatches.length,
      currencyCount: currencyMatches.length,
      dateRange,
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
