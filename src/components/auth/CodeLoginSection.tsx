import { useState, useEffect, useCallback, useRef } from 'react'
import { Smartphone } from 'lucide-react'
import { supabase } from '@/services/supabaseClient'

interface CodeLoginSectionProps {
  onError?: (error: string) => void
}

export function CodeLoginSection({ onError }: CodeLoginSectionProps) {
  const [code, setCode] = useState<string | null>(null)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [loading, setLoading] = useState(false)
  const [claimed, setClaimed] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const createCode = useCallback(async () => {
    setLoading(true)
    setClaimed(false)
    try {
      const { data: result, error } = await supabase.functions.invoke('web-auth-code', {
        body: { action: 'create' },
      })

      if (error || !result?.success || !result?.code) {
        onError?.(result?.error || 'Erro ao gerar codigo.')
        return
      }

      setCode(result.code)
      setSessionToken(result.session_token)
      setExpiresAt(new Date(result.expires_at))
    } catch {
      onError?.('Erro de conexao.')
    } finally {
      setLoading(false)
    }
  }, [onError])

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return
    const tick = () => {
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining <= 0) {
        setCode(null)
        setSessionToken(null)
        if (timerRef.current) clearInterval(timerRef.current)
      }
    }
    tick()
    timerRef.current = setInterval(tick, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [expiresAt])

  // Poll for code status
  useEffect(() => {
    if (!sessionToken || claimed) return

    const poll = async () => {
      try {
        const { data: result } = await supabase.functions.invoke('web-auth-code', {
          body: { action: 'poll', session_token: sessionToken },
        })

        if (result?.status === 'claimed' && result?.redirect_url) {
          setClaimed(true)
          if (pollRef.current) clearInterval(pollRef.current)
          // Redirect to magic link
          window.location.href = result.redirect_url
        } else if (result?.status === 'expired') {
          setCode(null)
          setSessionToken(null)
          if (pollRef.current) clearInterval(pollRef.current)
        }
      } catch {
        // Silent retry on next poll
      }
    }

    poll() // Immediate first check
    pollRef.current = setInterval(poll, 2000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [sessionToken, claimed])

  // No code yet — show "generate" button
  if (!code) {
    return (
      <button
        type="button"
        onClick={createCode}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-ceramic-cool hover:bg-ceramic-border text-ceramic-text-primary font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        <Smartphone className="w-4 h-4" />
        {loading ? 'Gerando...' : 'Entrar via Telegram (outro dispositivo)'}
      </button>
    )
  }

  // Code displayed — waiting for claim
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  return (
    <div className="bg-ceramic-cool rounded-xl p-5 text-center space-y-3">
      {claimed ? (
        <>
          <div className="text-3xl">🎉</div>
          <p className="text-sm font-bold text-ceramic-success">Codigo aceito! Entrando...</p>
        </>
      ) : (
        <>
          <p className="text-xs text-ceramic-text-secondary">
            Digite este codigo no bot do Telegram:
          </p>
          <p className="text-4xl font-mono font-black tracking-[0.3em] text-ceramic-text-primary">
            {code}
          </p>
          <p className="text-xs text-ceramic-text-secondary">
            No Telegram, envie: <code className="bg-ceramic-base px-1.5 py-0.5 rounded">/codigo {code}</code>
          </p>
          <p className="text-xs text-ceramic-text-secondary">
            Expira em {minutes}:{seconds.toString().padStart(2, '0')}
          </p>
          <button
            type="button"
            onClick={createCode}
            disabled={loading || timeLeft > 240}
            className="text-xs text-amber-600 hover:text-amber-700 underline disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {timeLeft > 240 ? `Novo codigo em ${timeLeft - 240}s` : 'Gerar novo codigo'}
          </button>
        </>
      )}
    </div>
  )
}
