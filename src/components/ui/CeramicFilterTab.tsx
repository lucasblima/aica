import React from 'react'

interface CeramicFilterTabProps {
  icon?: React.ReactNode
  label: string
  count?: number
  isActive: boolean
  onClick: () => void
  size?: 'sm' | 'md'
  className?: string
}

const sizeMap = {
  sm: { container: 'px-3 py-2', label: 'text-[10px]', count: 'text-[10px] px-1 py-0.5' },
  md: { container: 'px-4 py-2.5', label: 'text-xs', count: 'text-xs px-1.5 py-0.5' },
}

export function CeramicFilterTab({
  icon,
  label,
  count,
  isActive,
  onClick,
  size = 'md',
  className = '',
}: CeramicFilterTabProps) {
  const s = sizeMap[size]

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 ${s.container} rounded-full font-bold uppercase tracking-wider transition-all duration-200
        ${isActive
          ? 'ceramic-card bg-ceramic-base shadow-md text-amber-700'
          : 'ceramic-inset hover:bg-white/50 text-[#948D82]'
        }
        ${s.label}
        ${className}
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{label}</span>
      {count !== undefined && (
        <span className={`${s.count} rounded bg-[#E0DDD5]/50 text-[#948D82] font-medium`}>
          {count}
        </span>
      )}
    </button>
  )
}
