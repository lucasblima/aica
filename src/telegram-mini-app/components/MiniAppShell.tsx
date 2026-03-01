// src/telegram-mini-app/components/MiniAppShell.tsx
import type { ReactNode } from 'react'

interface MiniAppShellProps {
  children: ReactNode
}

/**
 * Root layout wrapper for the Mini App.
 * Uses Telegram theme CSS variables with Ceramic fallbacks.
 */
export function MiniAppShell({ children }: MiniAppShellProps) {
  return (
    <div
      className="min-h-screen w-full overflow-y-auto no-scrollbar"
      style={{
        backgroundColor: 'var(--tg-bg-color)',
        color: 'var(--tg-text-color)',
        fontFamily: "'Nunito', sans-serif",
      }}
    >
      <div className="max-w-lg mx-auto px-4 py-6 pb-24 space-y-4">
        {children}
      </div>
    </div>
  )
}
