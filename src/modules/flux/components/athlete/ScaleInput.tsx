/**
 * ScaleInput — reusable 6-circle scale selector (0-5)
 *
 * Used in the structured feedback questionnaire.
 * Ceramic design: unselected = ceramic-cool border, selected = amber fill.
 */

interface ScaleInputProps {
  value: number | undefined;
  onChange: (value: number) => void;
  lowAnchor: string;
  highAnchor: string;
  disabled?: boolean;
}

export function ScaleInput({ value, onChange, lowAnchor, highAnchor, disabled }: ScaleInputProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        {[0, 1, 2, 3, 4, 5].map((n) => {
          const isSelected = value === n;
          return (
            <button
              key={n}
              type="button"
              disabled={disabled}
              onClick={() => onChange(n)}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${isSelected
                  ? 'bg-amber-500 text-white shadow-sm scale-110'
                  : 'bg-ceramic-cool border border-ceramic-border text-ceramic-text-secondary hover:border-amber-300'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              aria-label={`${n}`}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between px-1">
        <span className="text-[10px] text-ceramic-text-secondary">{lowAnchor}</span>
        <span className="text-[10px] text-ceramic-text-secondary">{highAnchor}</span>
      </div>
    </div>
  );
}

export type { ScaleInputProps };
