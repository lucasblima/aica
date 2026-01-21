/**
 * useProcessContact Hook
 *
 * Handles the "Process with Aica" functionality for contacts.
 * Provides:
 * - Cost estimation before processing
 * - Processing execution
 * - Loading and error states
 *
 * @example
 * const { estimate, fetchEstimate, processContact, isProcessing } = useProcessContact()
 *
 * // Get estimate first
 * const est = await fetchEstimate(contactId)
 *
 * // If user confirms, process
 * const result = await processContact(contactId)
 */

import { useState } from 'react'
import { supabase } from '@/services/supabaseClient'
import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('useProcessContact')

export interface ProcessingEstimate {
  creditCost: number
  messageCount: number
  userBalance: number
  canAfford: boolean
  estimatedDuration: string
  contactName: string
  hasExistingAnalysis: boolean
  lastAnalyzedAt: string | null
}

export interface AnalysisResult {
  success: boolean
  analysisId?: string
  healthScore?: number
  sentiment?: {
    overall: 'positive' | 'neutral' | 'negative'
    score: number
    breakdown: { positive: number; neutral: number; negative: number }
  }
  topics?: Array<{ name: string; frequency: number; sentiment: string }>
  actionItems?: Array<{ text: string; priority: string; dueHint?: string }>
  insights?: {
    communicationStyle: string
    recommendations: string[]
  }
  creditsSpent?: number
  newBalance?: number
  error?: string
}

interface UseProcessContactReturn {
  /** Current estimate data */
  estimate: ProcessingEstimate | null
  /** Whether estimating is in progress */
  isEstimating: boolean
  /** Whether processing is in progress */
  isProcessing: boolean
  /** Current error message */
  error: string | null
  /** Last processing result */
  result: AnalysisResult | null
  /** Fetch cost estimate for a contact */
  fetchEstimate: (contactId: string) => Promise<ProcessingEstimate | null>
  /** Process contact with Aica AI */
  processContact: (contactId: string) => Promise<AnalysisResult>
  /** Clear current estimate */
  clearEstimate: () => void
  /** Clear error */
  clearError: () => void
}

export function useProcessContact(): UseProcessContactReturn {
  const [estimate, setEstimate] = useState<ProcessingEstimate | null>(null)
  const [isEstimating, setIsEstimating] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)

  /**
   * Fetch cost estimate before processing
   */
  const fetchEstimate = async (contactId: string): Promise<ProcessingEstimate | null> => {
    try {
      setIsEstimating(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const { data, error: fnError } = await supabase.functions.invoke('estimate-processing-cost', {
        body: { contactId },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })

      if (fnError) throw fnError

      if (data.error) {
        throw new Error(data.error)
      }

      const estimateData: ProcessingEstimate = {
        creditCost: data.creditCost,
        messageCount: data.messageCount,
        userBalance: data.userBalance,
        canAfford: data.canAfford,
        estimatedDuration: data.estimatedDuration,
        contactName: data.contactName,
        hasExistingAnalysis: data.hasExistingAnalysis,
        lastAnalyzedAt: data.lastAnalyzedAt
      }

      setEstimate(estimateData)
      return estimateData
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to estimate cost'
      setError(message)
      log.error('Estimate error:', { error: message })
      return null
    } finally {
      setIsEstimating(false)
    }
  }

  /**
   * Process contact with Aica AI
   */
  const processContact = async (contactId: string): Promise<AnalysisResult> => {
    try {
      setIsProcessing(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const { data, error: fnError } = await supabase.functions.invoke('process-contact-analysis', {
        body: { contactId },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })

      if (fnError) throw fnError

      if (!data.success) {
        const errorResult: AnalysisResult = {
          success: false,
          error: data.error || 'Processing failed'
        }
        setResult(errorResult)
        setError(data.error)
        return errorResult
      }

      const analysisResult: AnalysisResult = {
        success: true,
        analysisId: data.analysisId,
        healthScore: data.healthScore,
        sentiment: data.sentiment,
        topics: data.topics,
        actionItems: data.actionItems,
        insights: data.insights,
        creditsSpent: data.creditsSpent,
        newBalance: data.newBalance
      }

      setResult(analysisResult)
      setEstimate(null) // Clear estimate after processing

      return analysisResult
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Processing failed'
      setError(message)
      log.error('Process error:', { error: message })

      const errorResult: AnalysisResult = {
        success: false,
        error: message
      }
      setResult(errorResult)
      return errorResult
    } finally {
      setIsProcessing(false)
    }
  }

  /**
   * Clear current estimate
   */
  const clearEstimate = () => {
    setEstimate(null)
  }

  /**
   * Clear error
   */
  const clearError = () => {
    setError(null)
  }

  return {
    estimate,
    isEstimating,
    isProcessing,
    error,
    result,
    fetchEstimate,
    processContact,
    clearEstimate,
    clearError
  }
}

export default useProcessContact
