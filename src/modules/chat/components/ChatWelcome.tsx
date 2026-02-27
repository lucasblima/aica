/**
 * ChatWelcome — Welcome screen shown when no messages exist
 *
 * Greeting + quick action grid (2x2).
 * Same actions as AicaChatFAB + "Ver minhas tarefas".
 */

import { PenLine, MessageCircle, Brain, CheckSquare } from 'lucide-react'

interface ChatWelcomeProps {
  onSendMessage: (text: string) => void
}

const quickActions = [
  {
    icon: PenLine,
    label: 'Registrar momento',
    message: 'Quero registrar um momento agora',
  },
  {
    icon: MessageCircle,
    label: 'Pergunta do dia',
    message: 'Me faca a pergunta do dia',
  },
  {
    icon: Brain,
    label: 'Meus padroes',
    message: 'Quais sao meus padroes comportamentais recentes?',
  },
  {
    icon: CheckSquare,
    label: 'Ver minhas tarefas',
    message: 'Quais sao minhas tarefas pendentes?',
  },
] as const

export function ChatWelcome({ onSendMessage }: ChatWelcomeProps) {
  return (
    <div className="chat-welcome">
      <div className="chat-welcome__orb" />
      <div className="chat-welcome__text">
        <h2 className="chat-welcome__greeting">Ola! Eu sou a Aica</h2>
        <p className="chat-welcome__subtitle">Sua assistente pessoal integrada</p>
      </div>
      <div className="chat-welcome__actions">
        {quickActions.map((action) => (
          <button
            key={action.message}
            className="chat-welcome__action"
            onClick={() => onSendMessage(action.message)}
          >
            <action.icon size={16} />
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
