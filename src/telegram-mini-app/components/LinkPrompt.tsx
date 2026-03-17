// src/telegram-mini-app/components/LinkPrompt.tsx
import WebApp from '@twa-dev/sdk'

interface LinkPromptProps {
  telegramFirstName?: string
}

/**
 * Shown to Telegram users who haven't linked their AICA account.
 * Provides CTA to open the web app and link.
 */
export function LinkPrompt({ telegramFirstName }: LinkPromptProps) {
  const handleLink = () => {
    WebApp.openLink('https://aica.guru/connections')
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6">
      {/* Logo */}
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 text-3xl"
        style={{ backgroundColor: 'var(--tg-secondary-bg-color)' }}
      >
        🌱
      </div>

      {/* Greeting */}
      <h1
        className="text-2xl font-bold mb-2"
        style={{ fontFamily: "'Fredoka', sans-serif" }}
      >
        {telegramFirstName ? `Olá, ${telegramFirstName}!` : 'Bem-vindo a AICA!'}
      </h1>

      {/* Description */}
      <p
        className="text-sm mb-8 max-w-xs leading-relaxed"
        style={{ color: 'var(--tg-hint-color)' }}
      >
        Para acessar seu dashboard e ver o resumo do seu dia, vincule sua conta AICA.
      </p>

      {/* CTA Button */}
      <button
        onClick={handleLink}
        className="px-8 py-3 rounded-xl text-base font-bold transition-transform active:scale-95"
        style={{
          backgroundColor: 'var(--tg-button-color)',
          color: 'var(--tg-button-text-color)',
        }}
      >
        Vincular Conta AICA
      </button>

      {/* Secondary info */}
      <p
        className="text-xs mt-6 max-w-xs"
        style={{ color: 'var(--tg-hint-color)' }}
      >
        Você também pode enviar <strong>/vincular</strong> no chat do bot para gerar um código de vinculacao.
      </p>
    </div>
  )
}
