// src/telegram-mini-app/App.tsx
import { useTelegramAuth } from './hooks/useTelegramAuth'
import { MiniAppShell } from './components/MiniAppShell'
import { LinkPrompt } from './components/LinkPrompt'
import { DailySummary } from './components/DailySummary'
import { QuickActions } from './components/QuickActions'

export function App() {
  const { isLoading, isLinked, user, telegramUser, supabase, error } = useTelegramAuth()

  return (
    <MiniAppShell>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[70vh]">
          <div
            className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--tg-button-color)', borderTopColor: 'transparent' }}
          />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6">
          <p className="text-sm" style={{ color: 'var(--tg-destructive-text-color)' }}>
            {error}
          </p>
        </div>
      ) : isLinked && user && supabase ? (
        <>
          <DailySummary user={user} supabase={supabase} />
          <QuickActions />
        </>
      ) : (
        <LinkPrompt telegramFirstName={telegramUser?.first_name} />
      )}
    </MiniAppShell>
  )
}
