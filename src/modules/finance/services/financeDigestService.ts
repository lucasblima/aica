/**
 * Finance Digest Service
 *
 * Calls the finance-monthly-digest Edge Function and provides
 * a simple caching layer so the same month isn't re-fetched.
 */

import { supabase } from '@/services/supabaseClient'
import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('FinanceDigestService')

// =============================================================================
// Types
// =============================================================================

export interface MonthlyDigest {
  highlights: string[]
  savings_opportunities: string[]
  risk_alerts: string[]
  month_grade: 'A' | 'B' | 'C' | 'D' | 'F'
  grade_explanation: string
  next_month_tip: string
}

export interface DigestStats {
  totalIncome: number
  totalExpenses: number
  balance: number
  transactionCount: number
  categoryBreakdown: Record<string, number>
  percentChangeFromPrevious: number | null
}

export interface DigestResponse {
  success: boolean
  digest: MonthlyDigest | null
  stats?: DigestStats
  month: number
  year: number
  monthName: string
  message?: string
  error?: string
}

// =============================================================================
// Cache
// =============================================================================

const digestCache = new Map<string, DigestResponse>()

function cacheKey(month: number, year: number): string {
  return `${year}-${month}`
}

// =============================================================================
// Service
// =============================================================================

export async function getMonthlyDigest(
  month?: number,
  year?: number
): Promise<DigestResponse> {
  // Check cache first
  const key = cacheKey(month || 0, year || 0)
  const cached = digestCache.get(key)
  if (cached) {
    log.debug('Returning cached digest for', key)
    return cached
  }

  try {
    const { data, error } = await supabase.functions.invoke('finance-monthly-digest', {
      body: {
        action: 'generate_digest',
        month,
        year,
      },
    })

    if (error) {
      // Try to extract detailed error from response context
      let detail = error.message || 'Erro ao gerar resumo'
      try {
        if (error.context && typeof error.context.json === 'function') {
          const body = await error.context.json()
          detail = body?.error || detail
          log.error('Edge Function error detail:', body)
        }
      } catch (parseErr) { log.warn('Failed to parse Edge Function error context:', parseErr) }
      log.error('Edge Function invocation error:', detail)
      return {
        success: false,
        digest: null,
        month: month || 0,
        year: year || 0,
        monthName: '',
        error: detail,
      }
    }

    // Validate response shape before using
    if (!data?.digest && !data?.error) {
      log.error('[DigestService] Invalid response shape from Edge Function:', data)
      return {
        success: false,
        digest: null,
        month: month || 0,
        year: year || 0,
        monthName: '',
        error: 'Resposta invalida do serviço de digest',
      }
    }

    const response = data as DigestResponse

    // Cache successful results
    if (response.success) {
      const realKey = cacheKey(response.month, response.year)
      digestCache.set(realKey, response)
    }

    return response
  } catch (err) {
    log.error('Unexpected error fetching digest:', err)
    return {
      success: false,
      digest: null,
      month: month || 0,
      year: year || 0,
      monthName: '',
      error: 'Erro inesperado ao gerar resumo financeiro',
    }
  }
}

export function clearDigestCache(): void {
  digestCache.clear()
}
