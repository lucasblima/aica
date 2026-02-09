import React from 'react'

interface StatGridProps {
  columns?: 2 | 3 | 4
  gap?: 2 | 3 | 4
  children: React.ReactNode
  className?: string
}

const colsMap = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
}

const gapMap = {
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
}

export function StatGrid({ columns = 2, gap = 3, children, className = '' }: StatGridProps) {
  return (
    <div className={`grid grid-cols-1 ${colsMap[columns]} ${gapMap[gap]} ${className}`}>
      {children}
    </div>
  )
}
