import { useEffect } from 'react'
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/solid'
import type { InterviewQuestion, RankedListConfig } from '../../../types/interviewer'

interface RankedListRendererProps {
  question: InterviewQuestion
  value: string[]
  onChange: (value: string[]) => void
}

export function RankedListRenderer({ question, value, onChange }: RankedListRendererProps) {
  const config = question.config as RankedListConfig
  const rawItems = config?.items || []

  // Normalize: handle both plain strings and {value, label} objects
  const items = rawItems.map((item: unknown) =>
    typeof item === 'string' ? { value: item, label: item } : (item as { value: string; label: string })
  )

  // Initialize value from config items if empty (first render)
  useEffect(() => {
    if (value.length === 0 && items.length > 0) {
      onChange(items.map(i => i.value))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const getLabel = (val: string) => {
    const item = items.find(i => i.value === val)
    return item?.label || val
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const next = [...value]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    onChange(next)
  }

  const moveDown = (index: number) => {
    if (index === value.length - 1) return
    const next = [...value]
    ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-ceramic-text-secondary mb-1">
        Ordene por prioridade (mais importante primeiro)
      </p>
      {value.map((val, index) => (
        <div
          key={val}
          className="flex items-center gap-3 px-4 py-3 rounded-xl border border-ceramic-border bg-white transition-all"
        >
          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-500 text-white text-sm font-bold flex items-center justify-center">
            {index + 1}
          </span>
          <span className="flex-1 text-sm font-medium text-ceramic-text-primary">
            {getLabel(val)}
          </span>
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => moveUp(index)}
              disabled={index === 0}
              className="p-0.5 rounded hover:bg-ceramic-cool/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              aria-label="Mover para cima"
            >
              <ChevronUpIcon className="w-4 h-4 text-ceramic-text-secondary" />
            </button>
            <button
              type="button"
              onClick={() => moveDown(index)}
              disabled={index === value.length - 1}
              className="p-0.5 rounded hover:bg-ceramic-cool/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              aria-label="Mover para baixo"
            >
              <ChevronDownIcon className="w-4 h-4 text-ceramic-text-secondary" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
