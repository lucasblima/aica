import { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/services/supabaseClient'

interface LogEntry {
  timestamp: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
}

export default function DiagnosticsPage() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Check authentication status on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session)
      if (!session) {
        log('⚠️ Você não está autenticado - algumas funcionalidades limitadas', 'warning')
        log('💡 Use "Verificar Cookies" e "Limpar Cookies Auth" para resolver problemas de login', 'info')
      }
    })
  }, [])

  const log = (message: string, type: LogEntry['type'] = 'info') => {
    const entry: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      message,
      type,
    }
    setLogs((prev) => [...prev, entry])
  }

  const clearLogs = () => {
    setLogs([])
    log('Logs limpos', 'info')
  }

  const checkSession = async () => {
    log('🔍 Verificando sessão...', 'info')
    log('─'.repeat(60), 'info')

    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error) {
        log(`❌ Erro ao obter sessão: ${error.message}`, 'error')
        return null
      }

      if (!session) {
        log('❌ Nenhuma sessão ativa!', 'error')
        return null
      }

      log('✅ Sessão ativa', 'success')
      log(`   User ID: ${session.user.id}`, 'info')
      log(`   Email: ${session.user.email}`, 'info')
      log(`   Token (primeiros 50 chars): ${session.access_token.substring(0, 50)}...`, 'info')
      log(`   Token expira em: ${new Date(session.expires_at! * 1000).toLocaleString()}`, 'info')

      return session
    } catch (error) {
      log(`❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'error')
      return null
    }
  }

  const checkCookies = () => {
    log('🔍 Verificando cookies...', 'info')
    log('─'.repeat(60), 'info')

    const cookies = document.cookie.split(';').map((c) => c.trim())
    log(`Total de cookies: ${cookies.length}`, 'info')

    const supabaseCookies = cookies.filter(
      (c) => c.startsWith('sb-') || c.includes('supabase')
    )

    if (supabaseCookies.length === 0) {
      log('⚠️  Nenhum cookie do Supabase encontrado', 'warning')
    } else {
      log(`✅ Cookies do Supabase encontrados: ${supabaseCookies.length}`, 'success')
      supabaseCookies.forEach((cookie) => {
        const [name] = cookie.split('=')

        // Check for old project cookies
        if (name.includes('gppebtrshbvuzatmebhr')) {
          log(`   ❌ COOKIE ANTIGO DETECTADO: ${name}`, 'error')
          log(`      → Este cookie do projeto antigo pode causar problemas!`, 'warning')
        } else if (name.includes('uzywajqzbdbrfammshdg')) {
          log(`   ✅ Cookie atual: ${name}`, 'success')
        } else if (name.includes('your-project')) {
          log(`   ❌ COOKIE PLACEHOLDER DETECTADO: ${name}`, 'error')
          log(`      → Este é um placeholder de template!`, 'warning')
        } else {
          log(`   📋 Cookie: ${name}`, 'info')
        }
      })
    }

    log('─'.repeat(60), 'info')
  }

  const clearAllSupabaseCookies = () => {
    log('🧹 Limpando todos os cookies do Supabase...', 'info')
    log('─'.repeat(60), 'info')

    let deletedCount = 0

    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.trim().split('=')[0]

      if (name.includes('sb-') || name.includes('supabase')) {
        // Delete with various path/domain combinations to be thorough
        const deleteStrings = [
          `${name}=; Max-Age=0; Path=/`,
          `${name}=; Max-Age=0; Path=/; Domain=${window.location.hostname}`,
          `${name}=; Max-Age=0; Path=/; Domain=.${window.location.hostname}`,
        ]

        deleteStrings.forEach((str) => {
          document.cookie = str
        })

        log(`   🗑️ Deletado: ${name}`, 'success')
        deletedCount++
      }
    })

    if (deletedCount === 0) {
      log('ℹ️ Nenhum cookie do Supabase encontrado para deletar', 'info')
    } else {
      log(`✅ ${deletedCount} cookies deletados com sucesso`, 'success')
      log('⚠️ Recomendado: Faça logout e login novamente', 'warning')
    }

    log('─'.repeat(60), 'info')
  }

  const testEdgeFunction = async () => {
    setIsLoading(true)
    log('🚀 Iniciando teste da Edge Function...', 'info')
    log('─'.repeat(60), 'info')

    try {
      // 1. Verificar sessão
      const session = await checkSession()

      if (!session) {
        log('❌ Teste abortado: sem sessão ativa', 'error')
        setIsLoading(false)
        return
      }

      log('', 'info')
      log('📡 Chamando Edge Function sync-whatsapp-contacts...', 'info')

      // 2. Chamar Edge Function
      const startTime = Date.now()

      const response = await fetch(
        'https://uzywajqzbdbrfammshdg.supabase.co/functions/v1/sync-whatsapp-contacts',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({}),
        }
      )

      const duration = Date.now() - startTime

      log(`📊 Status: ${response.status} ${response.statusText}`, response.ok ? 'success' : 'error')
      log(`⏱️  Tempo de resposta: ${duration}ms`, 'info')

      const responseText = await response.text()

      if (response.status === 200) {
        log('✅ SUCESSO! Edge Function funcionou!', 'success')

        try {
          const result = JSON.parse(responseText)
          log(`📋 Contatos sincronizados: ${result.contactsSynced || 0}`, 'success')
          log(`📋 Contatos ignorados: ${result.contactsSkipped || 0}`, 'info')
          log(`⏱️  Duração (servidor): ${result.durationMs || 0}ms`, 'info')

          if (result.errors && result.errors.length > 0) {
            log(`⚠️  Erros encontrados: ${result.errors.length}`, 'warning')
            result.errors.forEach((err: string) => {
              log(`   - ${err}`, 'warning')
            })
          }
        } catch (e) {
          log(`📋 Response (texto): ${responseText}`, 'info')
        }
      } else if (response.status === 401) {
        log('❌ 401 UNAUTHORIZED', 'error')
        log('🔧 Possíveis causas:', 'warning')
        log('   1. Token expirado → Faça logout/login novamente', 'warning')
        log('   2. Token inválido → Limpe cookies e faça login', 'warning')
        log('   3. Edge Function não configurada para aceitar este token', 'warning')
        log(`📋 Response: ${responseText}`, 'error')

        // Check for old cookies
        log('', 'info')
        log('🔍 Verificando cookies antigos...', 'info')
        checkCookies()
      } else if (response.status === 404) {
        log('❌ 404 NOT FOUND', 'error')
        log('🔧 Edge Function não encontrada ou não deployada', 'warning')
        log('   Verifique: https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/functions', 'info')
        log(`📋 Response: ${responseText}`, 'error')
      } else if (response.status === 500) {
        log('❌ 500 SERVER ERROR', 'error')
        log('🔧 Erro na Edge Function - veja logs no Supabase:', 'warning')
        log(
          '   https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/functions/sync-whatsapp-contacts/logs',
          'info'
        )
        log(`📋 Response: ${responseText}`, 'error')
      } else {
        log(`⚠️  Status inesperado: ${response.status}`, 'warning')
        log(`📋 Response: ${responseText}`, 'info')
      }
    } catch (error) {
      log(
        `❌ Erro ao chamar Edge Function: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        'error'
      )

      if (error instanceof Error) {
        if (error.message.includes('CORS')) {
          log('🔧 Erro de CORS - Edge Function pode não estar deployada', 'warning')
        } else if (error.message.includes('fetch') || error.message.includes('network')) {
          log('🔧 Erro de rede - verifique conexão e URL', 'warning')
        }
      }
    } finally {
      log('─'.repeat(60), 'info')
      log('✅ Teste finalizado!', 'success')
      setIsLoading(false)
    }
  }

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-700'
      case 'error':
        return 'text-red-700'
      case 'warning':
        return 'text-orange-700'
      default:
        return 'text-ceramic-text-primary'
    }
  }

  return (
    <div className="min-h-screen bg-ceramic-base text-ceramic-text-primary p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center gap-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors group"
          >
            <div className="w-8 h-8 ceramic-inset flex items-center justify-center group-hover:scale-110 transition-transform">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">Voltar</span>
          </button>
          <h1 className="text-3xl font-bold text-ceramic-text-primary mb-2">🔧 Diagnósticos e Testes</h1>
          <p className="text-ceramic-text-secondary">Ferramentas de diagnóstico para WhatsApp Sync</p>
          <p className="text-sm text-ceramic-text-secondary mt-1">
            Usuário: <span className="text-ceramic-accent">lucasboscacci@gmail.com</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={checkSession}
            disabled={isLoading || !isAuthenticated}
            className="px-4 py-3 ceramic-card hover:ceramic-card-hover disabled:opacity-50 disabled:cursor-not-allowed text-ceramic-text-primary rounded-xl font-semibold transition-all"
            title={!isAuthenticated ? 'Requer autenticação' : ''}
          >
            👤 Verificar Sessão
          </button>
          <button
            onClick={checkCookies}
            disabled={isLoading}
            className="px-4 py-3 ceramic-card hover:ceramic-card-hover disabled:opacity-50 disabled:cursor-not-allowed text-ceramic-text-primary rounded-xl font-semibold transition-all"
          >
            🍪 Verificar Cookies
          </button>
          <button
            onClick={clearAllSupabaseCookies}
            disabled={isLoading}
            className="px-4 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all"
          >
            🧹 Limpar Cookies Auth
          </button>
          <button
            onClick={testEdgeFunction}
            disabled={isLoading || !isAuthenticated}
            className="px-4 py-3 ceramic-card hover:ceramic-card-hover disabled:opacity-50 disabled:cursor-not-allowed text-ceramic-text-primary rounded-xl font-semibold transition-all"
            title={!isAuthenticated ? 'Requer autenticação' : ''}
          >
            {isLoading ? '⏳ Testando...' : '🚀 Testar Edge Function'}
          </button>
          <button
            onClick={clearLogs}
            disabled={isLoading}
            className="px-4 py-3 ceramic-card hover:ceramic-card-hover disabled:opacity-50 disabled:cursor-not-allowed text-ceramic-text-primary rounded-xl font-semibold transition-all"
          >
            🗑️ Limpar Logs
          </button>
        </div>

        {/* Logs Container */}
        <div className="ceramic-tray p-4 h-[600px] overflow-y-auto font-mono text-sm bg-[#E8E6DB]">
          {logs.length === 0 ? (
            <div className="text-ceramic-text-secondary text-center py-8">
              📋 Logs aparecerão aqui... Clique em um botão acima para começar.
            </div>
          ) : (
            logs.map((entry, index) => (
              <div key={index} className={`${getLogColor(entry.type)} mb-1`}>
                [{entry.timestamp}] {entry.message}
              </div>
            ))
          )}
        </div>

        {/* Info Panel */}
        <div className="mt-6 ceramic-card rounded-lg p-4">
          <h3 className="text-lg font-semibold text-ceramic-text-primary mb-3">ℹ️ Informações</h3>
          <div className="space-y-2 text-sm text-ceramic-text-secondary">
            <p>
              <strong className="text-ceramic-text-primary">Edge Function URL:</strong>{' '}
              <code className="text-ceramic-accent text-xs">
                https://uzywajqzbdbrfammshdg.supabase.co/functions/v1/sync-whatsapp-contacts
              </code>
            </p>
            <p>
              <strong className="text-ceramic-text-primary">Projeto Atual:</strong>{' '}
              <code className="text-green-600 text-xs">uzywajqzbdbrfammshdg</code>
            </p>
            <p>
              <strong className="text-ceramic-text-primary">Projeto Antigo (não usar):</strong>{' '}
              <code className="text-red-600 text-xs">gppebtrshbvuzatmebhr</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
