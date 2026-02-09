import React from 'react'

interface MasonryGridProps {
  columns?: 1 | 2 | 3
  gap?: 3 | 4 | 6
  children: React.ReactNode
  className?: string
}

const colsMap = {
  1: 'columns-1',
  2: 'columns-1 md:columns-2',
  3: 'columns-1 md:columns-2 lg:columns-3',
}

const gapMap = {
  3: 'gap-3',
  4: 'gap-4',
  6: 'gap-6',
}

export function MasonryGrid({ columns = 2, gap = 4, children, className = '' }: MasonryGridProps) {
  return (
    <div className={`${colsMap[columns]} ${gapMap[gap]} ${className}`}>
      {React.Children.map(children, (child) => {
        if (!child) return null
        return (
          <div className="break-inside-avoid mb-3">
            {child}
          </div>
        )
      })}
    </div>
  )
}
