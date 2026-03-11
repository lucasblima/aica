import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/services/supabaseClient'
import { Logo } from '@/components/ui'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async () => {
    setError('')

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setSaving(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSaving(false)

    if (updateError) {
      setError('Erro ao redefinir senha. Tente novamente.')
      return
    }

    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-ceramic-base flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-ceramic-50 rounded-xl p-8 shadow-ceramic-emboss text-center">
          <div className="flex justify-center mb-4">
            <Logo variant="default" width={64} className="rounded-2xl" />
          </div>
          <h2 className="text-xl font-bold text-ceramic-text-primary mb-2">
            Senha redefinida!
          </h2>
          <p className="text-ceramic-text-secondary mb-6">
            Sua nova senha está ativa. Você já pode acessar a AICA.
          </p>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg px-4 py-3 transition-colors"
          >
            Ir para o painel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ceramic-base flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-ceramic-50 rounded-xl p-8 shadow-ceramic-emboss">
        <div className="flex justify-center mb-4">
          <Logo variant="default" width={64} className="rounded-2xl" />
        </div>
        <h2 className="text-xl font-bold text-ceramic-text-primary mb-2 text-center">
          Redefinir senha
        </h2>
        <p className="text-ceramic-text-secondary mb-6 text-sm text-center">
          Escolha uma nova senha para sua conta AICA.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ceramic-text-primary mb-1">
              Nova senha
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

          {error && (
            <p className="text-sm text-ceramic-error">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-3 transition-colors"
          >
            {saving ? 'Salvando...' : 'Salvar nova senha'}
          </button>

          <button
            onClick={() => navigate('/landing', { replace: true })}
            className="w-full text-ceramic-text-secondary text-sm hover:underline"
          >
            Voltar ao login
          </button>
        </div>
      </div>
    </div>
  )
}
