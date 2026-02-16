import type { InterviewQuestion, ScaleConfig } from '../../../types/interviewer'

interface ScaleRendererProps {
  question: InterviewQuestion
  value: number | null
  onChange: (value: number) => void
}

export function ScaleRenderer({ question, value, onChange }: ScaleRendererProps) {
  const config = question.config as ScaleConfig
  const min = config?.min ?? 1
  const max = config?.max ?? 10
  const step = config?.step ?? 1
  const minLabel = config?.min_label || String(min)
  const maxLabel = config?.max_label || String(max)

  const currentValue = value ?? Math.floor((min + max) / 2)

  return (
    <div className="space-y-4">
      {/* Large centered value */}
      <div className="text-center">
        <span className="text-4xl font-bold text-amber-600">{currentValue}</span>
      </div>

      {/* Range input */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={currentValue}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 bg-ceramic-cool/30 rounded-full appearance-none cursor-pointer accent-amber-500"
      />

      {/* Labels */}
      <div className="flex justify-between text-xs text-ceramic-text-secondary">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  )
}
