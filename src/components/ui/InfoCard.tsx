import React from 'react'

interface InfoCardProps {
  variant?: 'compact' | 'default' | 'spacious'
  hoverable?: boolean
  fullWidth?: boolean
  onClick?: () => void
  children: React.ReactNode
  className?: string
}

const paddingMap = {
  compact: 'p-3',
  default: 'p-4',
  spacious: 'p-6',
}

export function InfoCard({
  variant = 'default',
  hoverable = false,
  fullWidth = false,
  onClick,
  children,
  className = '',
}: InfoCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        ceramic-card ${paddingMap[variant]}
        ${hoverable ? 'hover:scale-[1.02] transition-all duration-300 cursor-pointer' : ''}
        ${fullWidth ? 'w-full' : ''}
        ${onClick && !hoverable ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}
