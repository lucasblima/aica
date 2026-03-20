import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/services/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { CeramicLoadingState } from '@/components'
import { connectGoogleCalendar } from '@/services/googleAuthService'

export default function WelcomePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, isLoading } = useAuth()
  const [step, setStep] = useState<'welcome' | 'password' | 'done'>('welcome')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [saving, setSaving] = useState(false)

  // Get user info from metadata
  const firstName = user?.user_metadata?.first_name || 'usuario'
  const source = user?.user_metadata?.source
  const isTelegramUser = source === 'telegram_bot'
  const urlSource = searchParams.get('source')

  // If user is already onboarded, or not a Telegram user, redirect to home
  useEffect(() => {
    if (!isLoading && user) {
      // Already onboarded? Go home
      if (user.user_metadata?.web_onboarded) {
        navigate('/', { replace: true })
        return
      }
      // Not a Telegram user AND no source=telegram in URL? Go home
      if (!isTelegramUser && urlSource !== 'telegram') {
        navigate('/', { replace: true })
      }
    }
  }, [isLoading, user, isTelegramUser, urlSource, navigate])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-ceramic-base">
        <CeramicLoadingState variant="page" />
      </div>
    )
  }

  // AuthGuard handles redirect, but guard here to prevent brief flash
  if (!user) return null

  const handleSetPassword = async () => {
    setPasswordError('')

    if (password.length < 6) {
      setPasswordError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setPasswordError('As senhas não coincidem.')
      return
    }

    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)

    if (error) {
      setPasswordError('Erro ao criar senha. Tente novamente.')
      return
    }

    await supabase.auth.updateUser({ data: { web_onboarded: true } })
    setStep('done')
  }

  const handleSkipPassword = async () => {
    await supabase.auth.updateUser({ data: { web_onboarded: true } })
    navigate('/', { replace: true })
  }

  const handleGoToDashboard = () => {
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-ceramic-base flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Welcome Step */}
        {step === 'welcome' && (
          <div className="bg-ceramic-50 rounded-xl p-8 shadow-ceramic-emboss text-center">
            <div className="text-5xl mb-4">👋</div>
            <h1 className="text-2xl font-bold text-ceramic-text-primary mb-2">
              Bem-vindo, {firstName}!
            </h1>
            <p className="text-ceramic-text-secondary mb-6">
              {urlSource === 'telegram'
                ? 'Voce veio do Telegram! Sua conta AICA esta pronta. Crie uma senha para acessar pelo navegador.'
                : 'Sua conta AICA esta pronta. Voce ja pode acessar todos os modulos pelo navegador.'}
            </p>

            <div className="space-y-3">
              <button
                onClick={() => setStep('password')}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg px-4 py-3 transition-colors"
              >
                Criar senha para acesso direto
              </button>
              <button
                onClick={handleSkipPassword}
                className="w-full bg-ceramic-cool hover:bg-ceramic-border text-ceramic-text-secondary font-medium rounded-lg px-4 py-3 transition-colors"
              >
                Pular — usar sempre link magico
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-ceramic-border">
              <p className="text-xs text-ceramic-text-secondary mb-2">
                Conecte seu Google Calendar para sincronizar eventos:
              </p>
              <button
                onClick={() => connectGoogleCalendar()}
                className="w-full bg-ceramic-cool hover:bg-ceramic-border text-ceramic-text-primary font-medium rounded-lg px-4 py-2.5 transition-colors text-sm flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M19.5 4H18V2h-2v2H8V2H6v2H4.5C3.12 4 2 5.12 2 6.5v13C2 20.88 3.12 22 4.5 22h15c1.38 0 2.5-1.12 2.5-2.5v-13C22 5.12 20.88 4 19.5 4zM20 19.5c0 .28-.22.5-.5.5h-15c-.28 0-.5-.22-.5-.5V9h16v10.5z"/></svg>
                Conectar Google Calendar
              </button>
            </div>
          </div>
        )}

        {/* Password Step */}
        {step === 'password' && (
          <div className="bg-ceramic-50 rounded-xl p-8 shadow-ceramic-emboss">
            <h2 className="text-xl font-bold text-ceramic-text-primary mb-2">
              Criar senha
            </h2>
            <p className="text-ceramic-text-secondary mb-6 text-sm">
              Com uma senha, você pode acessar a AICA diretamente pelo navegador sem precisar de link magico.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ceramic-text-primary mb-1">
                  Senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3 py-2 bg-ceramic-base border border-ceramic-border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-ceramic-text-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ceramic-text-primary mb-1">
                  Confirmar senha
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  className="w-full px-3 py-2 bg-ceramic-base border border-ceramic-border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-ceramic-text-primary"
                />
              </div>

              {passwordError && (
                <p className="text-sm text-ceramic-error">{passwordError}</p>
              )}

              <button
                onClick={handleSetPassword}
                disabled={saving}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-3 transition-colors"
              >
                {saving ? 'Salvando...' : 'Criar senha'}
              </button>
              <button
                onClick={handleSkipPassword}
                className="w-full text-ceramic-text-secondary text-sm hover:underline"
              >
                Pular por agora
              </button>
            </div>
          </div>
        )}

        {/* Done Step */}
        {step === 'done' && (
          <div className="bg-ceramic-50 rounded-xl p-8 shadow-ceramic-emboss text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-ceramic-text-primary mb-2">
              Senha criada!
            </h2>
            <p className="text-ceramic-text-secondary mb-6">
              Agora você pode acessar a AICA com email e senha, alem do Telegram.
            </p>
            <button
              onClick={() => connectGoogleCalendar()}
              className="w-full bg-ceramic-cool hover:bg-ceramic-border text-ceramic-text-primary font-medium rounded-lg px-4 py-2.5 transition-colors text-sm flex items-center justify-center gap-2 mb-3"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M19.5 4H18V2h-2v2H8V2H6v2H4.5C3.12 4 2 5.12 2 6.5v13C2 20.88 3.12 22 4.5 22h15c1.38 0 2.5-1.12 2.5-2.5v-13C22 5.12 20.88 4 19.5 4zM20 19.5c0 .28-.22.5-.5.5h-15c-.28 0-.5-.22-.5-.5V9h16v10.5z"/></svg>
              Conectar Google Calendar
            </button>
            <button
              onClick={handleGoToDashboard}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg px-4 py-3 transition-colors"
            >
              Ir para o painel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
