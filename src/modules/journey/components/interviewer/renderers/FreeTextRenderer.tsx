interface FreeTextRendererProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxLength?: number
}

export function FreeTextRenderer({
  value,
  onChange,
  placeholder = 'Sua resposta...',
  maxLength = 500,
}: FreeTextRendererProps) {
  return (
    <div className="space-y-1">
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={4}
        className="w-full px-4 py-3 rounded-xl border border-ceramic-border bg-ceramic-base focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none resize-none text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 transition-all"
      />
      <div className="flex justify-end">
        <span className="text-xs text-ceramic-text-secondary">
          {value.length}/{maxLength}
        </span>
      </div>
    </div>
  )
}
