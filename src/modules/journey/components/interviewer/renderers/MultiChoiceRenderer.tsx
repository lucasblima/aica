import { CheckIcon } from '@heroicons/react/24/solid'
import type { InterviewQuestion, MultiChoiceConfig } from '../../../types/interviewer'

interface MultiChoiceRendererProps {
  question: InterviewQuestion
  value: string[]
  onChange: (value: string[]) => void
}

export function MultiChoiceRenderer({ question, value, onChange }: MultiChoiceRendererProps) {
  const config = question.config as MultiChoiceConfig
  const rawOptions = config?.options || []
  const maxSelections = config?.max_selections

  // Normalize: handle both plain strings and {value, label} objects from seed data
  const options = rawOptions.map((opt: unknown) =>
    typeof opt === 'string' ? { value: opt, label: opt } : (opt as { value: string; label: string })
  )

  const toggleOption = (optionValue: string) => {
    const isSelected = value.includes(optionValue)
    if (isSelected) {
      onChange(value.filter(v => v !== optionValue))
    } else {
      if (maxSelections && value.length >= maxSelections) return
      onChange([...value, optionValue])
    }
  }

  const isMaxReached = maxSelections ? value.length >= maxSelections : false

  return (
    <div className="space-y-2">
      {maxSelections && (
        <p className="text-xs text-ceramic-text-secondary mb-1">
          {value.length}/{maxSelections} selecionados
        </p>
      )}
      {options.map(option => {
        const isSelected = value.includes(option.value)
        const isDisabled = !isSelected && isMaxReached
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => toggleOption(option.value)}
            disabled={isDisabled}
            className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 ${
              isSelected
                ? 'ring-2 ring-amber-500 bg-amber-50/50 text-ceramic-text-primary'
                : isDisabled
                  ? 'border border-ceramic-border text-ceramic-text-secondary/50 cursor-not-allowed'
                  : 'border border-ceramic-border hover:bg-ceramic-cool/20 text-ceramic-text-secondary'
            }`}
          >
            <div className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-all ${
              isSelected ? 'bg-amber-500' : 'border border-ceramic-border'
            }`}>
              {isSelected && <CheckIcon className="w-3.5 h-3.5 text-white" />}
            </div>
            <span className="text-sm font-medium">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
