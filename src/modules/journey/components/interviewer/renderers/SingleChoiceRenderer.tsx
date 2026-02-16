import type { InterviewQuestion, SingleChoiceConfig } from '../../../types/interviewer'

interface SingleChoiceRendererProps {
  question: InterviewQuestion
  value: string | null
  onChange: (value: string) => void
}

export function SingleChoiceRenderer({ question, value, onChange }: SingleChoiceRendererProps) {
  const config = question.config as SingleChoiceConfig
  const rawOptions = config?.options || []

  // Normalize: handle both plain strings and {value, label} objects from seed data
  const options = rawOptions.map((opt: unknown) =>
    typeof opt === 'string' ? { value: opt, label: opt } : (opt as { value: string; label: string })
  )

  return (
    <div className="space-y-2">
      {options.map(option => {
        const isSelected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 ${
              isSelected
                ? 'ring-2 ring-amber-500 bg-amber-50/50 text-ceramic-text-primary'
                : 'border border-ceramic-border hover:bg-ceramic-cool/20 text-ceramic-text-secondary'
            }`}
          >
            <span className="text-sm font-medium">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
