import type { InterviewQuestion, DateConfig } from '../../../types/interviewer'

interface DateRendererProps {
  question: InterviewQuestion
  value: string | null
  onChange: (value: string) => void
}

export function DateRenderer({ question, value, onChange }: DateRendererProps) {
  const config = question.config as DateConfig
  const minDate = config?.min_date
  const maxDate = config?.max_date

  const formattedDate = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <div className="space-y-3">
      <input
        type="date"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        min={minDate}
        max={maxDate}
        className="w-full px-4 py-3 rounded-xl border border-ceramic-border bg-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-ceramic-text-primary transition-all"
      />
      {formattedDate && (
        <p className="text-sm text-ceramic-text-secondary">
          {formattedDate}
        </p>
      )}
    </div>
  )
}
