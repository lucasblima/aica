import { AudioRecorder } from '../../capture/AudioRecorder'

interface LongTextRendererProps {
  value: string
  onChange: (value: string) => void
  onAudioComplete?: (blob: Blob) => void
  placeholder?: string
  maxLength?: number
}

export function LongTextRenderer({
  value,
  onChange,
  onAudioComplete,
  placeholder = 'Conte com detalhes...',
  maxLength = 2000,
}: LongTextRendererProps) {
  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={6}
        className="w-full px-4 py-3 rounded-xl border border-ceramic-border bg-ceramic-base focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none resize-none text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 transition-all"
      />
      <div className="flex items-center justify-between">
        <AudioRecorder
          onRecordingComplete={blob => onAudioComplete?.(blob)}
        />
        <span className="text-xs text-ceramic-text-secondary">
          {value.length}/{maxLength}
        </span>
      </div>
    </div>
  )
}
