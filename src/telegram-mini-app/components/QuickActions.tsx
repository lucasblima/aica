// src/telegram-mini-app/components/QuickActions.tsx
import WebApp from '@twa-dev/sdk'

const BOT_USERNAME = 'AicaLifeBot' // TODO: move to env var if needed

const ACTIONS = [
  { icon: '📝', label: 'Tarefa', command: '/tarefa' },
  { icon: '💰', label: 'Gasto', command: '/gasto' },
  { icon: '😊', label: 'Humor', command: '/humor' },
  { icon: '📅', label: 'Evento', command: '/evento' },
] as const

/**
 * Quick action buttons that open the bot chat with pre-filled commands.
 */
export function QuickActions() {
  const handleAction = (command: string) => {
    // Opens Telegram chat with the bot, pre-filling the command
    WebApp.openTelegramLink(`https://t.me/${BOT_USERNAME}?text=${encodeURIComponent(command)}`)
  }

  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: 'var(--tg-secondary-bg-color)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">⚡</span>
        <h3
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: 'var(--tg-hint-color)' }}
        >
          Acoes rapidas
        </h3>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {ACTIONS.map((action) => (
          <button
            key={action.command}
            onClick={() => handleAction(action.command)}
            className="flex flex-col items-center gap-1 py-3 rounded-lg transition-transform active:scale-95"
            style={{ backgroundColor: 'var(--tg-bg-color)' }}
          >
            <span className="text-xl">{action.icon}</span>
            <span className="text-xs font-medium">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
