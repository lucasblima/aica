/**
 * ChatPage — Full-page chat experience at /chat route.
 *
 * Dispatches aica-chat-open event on mount to auto-open AicaChatFAB
 * in fullscreen mode. Wrapped in error boundary.
 */

import { Component, useEffect, type ReactNode } from 'react'
import { AicaChatFAB } from '@/components/features/AicaChatFAB'

class ChatErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error('[ChatPage] Error boundary caught:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-ceramic-cool p-8">
          <div className="bg-ceramic-base rounded-xl p-6 shadow-ceramic-emboss max-w-md text-center">
            <h2 className="text-ceramic-text-primary font-medium text-lg mb-2">Chat indisponivel</h2>
            <p className="text-ceramic-text-secondary text-sm mb-4">
              Ocorreu um erro ao carregar o chat. Tente recarregar a pagina.
            </p>
            <button
              onClick={() => {
                localStorage.removeItem('aica_chat_v2')
                this.setState({ hasError: false })
              }}
              className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-4 py-2 text-sm font-medium"
            >
              Recarregar chat
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function ChatPage() {
  // Auto-open chat in fullscreen mode when /chat route loads
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('aica-chat-open', {
        detail: { fullscreen: true },
      }))
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <ChatErrorBoundary>
      <AicaChatFAB hideButton />
    </ChatErrorBoundary>
  )
}
