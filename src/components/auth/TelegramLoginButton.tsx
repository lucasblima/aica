import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/services/supabaseClient'

const TELEGRAM_BOT_NAME = import.meta.env.VITE_TELEGRAM_BOT_NAME || 'AicaLifeBot'

interface TelegramLoginData {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

interface TelegramLoginButtonProps {
  onError?: (error: string) => void
}

export function TelegramLoginButton({ onError }: TelegramLoginButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)

  const handleTelegramAuth = useCallback(async (data: TelegramLoginData) => {
    setLoading(true)
    try {
      const { data: result, error } = await supabase.functions.invoke('validate-telegram-login', {
        body: data,
      })

      if (error || !result?.success || !result?.redirect_url) {
        onError?.(result?.error || 'Erro ao validar login do Telegram.')
        return
      }

      // Redirect to the magic link URL — Supabase will create the session
      window.location.href = result.redirect_url
    } catch (err) {
      onError?.('Erro de conexao. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [onError])

  useEffect(() => {
    const callbackName = `__tg_auth_${Date.now()}`
    ;(window as unknown as Record<string, unknown>)[callbackName] = (user: TelegramLoginData) => {
      handleTelegramAuth(user)
    }

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?23'
    script.async = true
    script.setAttribute('data-telegram-login', TELEGRAM_BOT_NAME)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-onauth', `${callbackName}(user)`)
    script.setAttribute('data-request-access', 'write')
    script.setAttribute('data-userpic', 'true')
    script.setAttribute('data-radius', '8')
    script.setAttribute('data-lang', 'pt-br')

    const container = containerRef.current
    if (container) {
      container.innerHTML = ''
      container.appendChild(script)
    }

    return () => {
      delete (window as unknown as Record<string, unknown>)[callbackName]
      if (container) container.innerHTML = ''
    }
  }, [handleTelegramAuth])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-3 text-sm text-ceramic-text-secondary">
        Conectando com Telegram...
      </div>
    )
  }

  return <div ref={containerRef} className="flex justify-center" />
}
