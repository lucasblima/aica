/**
 * ProcessWithAicaButton Component
 *
 * Trigger button for AI-powered contact analysis.
 * Opens the ProcessingEstimateModal before processing.
 */

import React, { useState } from 'react'
import { Sparkles, Loader2, RefreshCw } from 'lucide-react'
import { useProcessContact } from '@/hooks/useProcessContact'
import { ProcessingEstimateModal } from './ProcessingEstimateModal'
import { AnalysisResultsPanel } from './AnalysisResultsPanel'

interface ProcessWithAicaButtonProps {
  /** Contact ID to process */
  contactId: string
  /** Contact name for display */
  contactName: string
  /** Whether contact has existing analysis */
  hasExistingAnalysis?: boolean
  /** Callback when processing completes */
  onProcessComplete?: (analysisId: string, healthScore: number) => void
  /** Button size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Custom class name */
  className?: string
}

export function ProcessWithAicaButton({
  contactId,
  contactName,
  hasExistingAnalysis = false,
  onProcessComplete,
  size = 'md',
  className = ''
}: ProcessWithAicaButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const {
    estimate,
    isEstimating,
    isProcessing,
    result,
    fetchEstimate,
    processContact,
    clearEstimate
  } = useProcessContact()

  const handleClick = async () => {
    const est = await fetchEstimate(contactId)
    if (est) {
      setShowModal(true)
    }
  }

  const handleConfirm = async () => {
    setShowModal(false)
    const analysisResult = await processContact(contactId)

    if (analysisResult.success && analysisResult.analysisId) {
      setShowResults(true)
      if (onProcessComplete) {
        onProcessComplete(analysisResult.analysisId, analysisResult.healthScore || 0)
      }
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    clearEstimate()
  }

  const handleCloseResults = () => {
    setShowResults(false)
  }

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2'
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isEstimating || isProcessing}
        className={`
          flex items-center ${sizeClasses[size]}
          bg-ceramic-accent
          text-white rounded-xl font-bold
          hover:bg-ceramic-accent-dark
          active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all shadow-lg shadow-ceramic-accent/20
          ${className}
        `}
      >
        {isEstimating || isProcessing ? (
          <Loader2 className={`${iconSizes[size]} animate-spin`} />
        ) : hasExistingAnalysis ? (
          <RefreshCw className={iconSizes[size]} />
        ) : (
          <Sparkles className={iconSizes[size]} />
        )}
        <span>
          {isProcessing
            ? 'Processando...'
            : isEstimating
            ? 'Calculando...'
            : hasExistingAnalysis
            ? 'Re-analisar'
            : 'Processar com Aica'}
        </span>
      </button>

      {/* Estimate Modal */}
      <ProcessingEstimateModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onConfirm={handleConfirm}
        estimate={estimate}
        contactName={contactName}
        isProcessing={isProcessing}
      />

      {/* Results Panel */}
      {showResults && result?.success && (
        <AnalysisResultsPanel
          isOpen={showResults}
          onClose={handleCloseResults}
          contactName={contactName}
          healthScore={result.healthScore || 0}
          sentiment={result.sentiment}
          topics={result.topics || []}
          actionItems={result.actionItems || []}
          insights={result.insights}
        />
      )}
    </>
  )
}

export default ProcessWithAicaButton
