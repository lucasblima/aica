/**
 * "Generate Audio" button with loading state and result display.
 */

import { useNotebookLmJob } from '@/hooks/useNotebookLmJob'
import { AudioPlayer } from './AudioPlayer'
import type { GenerateAudioParams } from '@/services/notebookLmService'

interface GenerateAudioButtonProps {
  params: GenerateAudioParams
  label?: string
  className?: string
}

export function GenerateAudioButton({
  params,
  label = 'Gerar Audio',
  className = '',
}: GenerateAudioButtonProps) {
  const { job, isLoading, error, generateAudio } = useNotebookLmJob()

  const handleClick = () => {
    generateAudio(params)
  }

  if (job?.status === 'completed' && job.result_url) {
    return (
      <div className={className}>
        <AudioPlayer url={job.result_url} title={params.title} />
        <button
          onClick={handleClick}
          className="mt-2 text-xs text-ceramic-text-secondary hover:text-amber-600 transition-colors"
        >
          Regenerar audio
        </button>
      </div>
    )
  }

  return (
    <div className={className}>
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {job?.status === 'processing' ? 'Gerando audio...' : 'Iniciando...'}
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6.253v11.494M18.364 5.636a9 9 0 010 12.728" />
            </svg>
            {label}
          </>
        )}
      </button>
      {error && (
        <p className="mt-1 text-xs text-ceramic-error">{error}</p>
      )}
    </div>
  )
}
