/**
 * TelegramLinkCard — Account Linking UI
 * Issue #574: Telegram Bot Integration — Phase 1
 *
 * Three states:
 * - Unlinked: "Vincular Telegram" button
 * - Pending: Shows 6-char code with copy + countdown
 * - Linked: Shows telegram username + unlink option
 */

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageCircle,
  Link,
  Unlink,
  Copy,
  CheckCircle2,
  Clock,
  Send,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { useTelegramLink } from '../../hooks/useTelegramLink'
import { cn } from '@/lib/utils'

// =============================================================================
// COUNTDOWN HOOK
// =============================================================================

function useCountdown(expiresAt: string | null): string {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    if (!expiresAt) {
      setRemaining('')
      return
    }

    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now()
      if (diff <= 0) {
        setRemaining('Expirado')
        return
      }
      const min = Math.floor(diff / 60000)
      const sec = Math.floor((diff % 60000) / 1000)
      setRemaining(`${min}:${sec.toString().padStart(2, '0')}`)
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  return remaining
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function TelegramLinkCard() {
  const {
    status,
    linkData,
    linkCode,
    isLoading,
    isGenerating,
    error,
    generateCode,
    unlinkTelegram,
  } = useTelegramLink()

  const [copied, setCopied] = useState(false)
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false)
  const countdown = useCountdown(linkData?.code_expires_at ?? null)

  const copyCode = useCallback(async () => {
    if (!linkCode) return
    try {
      await navigator.clipboard.writeText(linkCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select text
    }
  }, [linkCode])

  const handleUnlink = useCallback(async () => {
    await unlinkTelegram()
    setShowUnlinkConfirm(false)
  }, [unlinkTelegram])

  if (isLoading) {
    return (
      <div className="bg-ceramic-50 rounded-xl p-6 shadow-ceramic-emboss animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-ceramic-cool" />
          <div className="flex-1">
            <div className="h-4 w-32 bg-ceramic-cool rounded" />
            <div className="h-3 w-48 bg-ceramic-cool rounded mt-2" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-ceramic-50 rounded-xl p-6 shadow-ceramic-emboss"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center',
            status === 'linked'
              ? 'bg-blue-100 text-blue-600'
              : 'bg-ceramic-cool text-ceramic-text-secondary'
          )}>
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-ceramic-text-primary font-medium">Telegram</h3>
            <p className="text-sm text-ceramic-text-secondary">
              {status === 'linked'
                ? 'Conta vinculada'
                : status === 'pending'
                ? 'Aguardando vinculacao'
                : 'Nao vinculado'}
            </p>
          </div>
        </div>

        {/* Status badge */}
        <div className={cn(
          'px-2 py-1 rounded-full text-xs font-medium',
          status === 'linked' && 'bg-green-100 text-green-700',
          status === 'pending' && 'bg-amber-100 text-amber-700',
          status === 'unlinked' && 'bg-ceramic-cool text-ceramic-text-secondary',
        )}>
          {status === 'linked' ? 'Ativo' : status === 'pending' ? 'Pendente' : 'Inativo'}
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content by state */}
      <AnimatePresence mode="wait">
        {status === 'unlinked' && (
          <motion.div
            key="unlinked"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <p className="text-sm text-ceramic-text-secondary mb-4">
              Vincule sua conta Telegram para receber notificacoes e interagir
              com a AICA diretamente pelo mensageiro.
            </p>
            <button
              onClick={generateCode}
              disabled={isGenerating}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg',
                'bg-blue-500 hover:bg-blue-600 text-white font-medium',
                'transition-colors duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gerando codigo...
                </>
              ) : (
                <>
                  <Link className="w-4 h-4" />
                  Vincular Telegram
                </>
              )}
            </button>
          </motion.div>
        )}

        {status === 'pending' && linkCode && (
          <motion.div
            key="pending"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Code display */}
            <div className="bg-white rounded-lg p-4 border border-ceramic-border">
              <div className="text-center mb-2">
                <p className="text-sm text-ceramic-text-secondary mb-1">Seu codigo de vinculacao:</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl font-mono font-bold tracking-widest text-ceramic-text-primary">
                    {linkCode}
                  </span>
                  <button
                    onClick={copyCode}
                    className="p-2 rounded-lg hover:bg-ceramic-cool transition-colors"
                    title="Copiar codigo"
                  >
                    {copied ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <Copy className="w-5 h-5 text-ceramic-text-secondary" />
                    )}
                  </button>
                </div>
              </div>

              {/* Countdown */}
              <div className="flex items-center justify-center gap-1 text-xs text-ceramic-text-secondary">
                <Clock className="w-3 h-3" />
                {countdown === 'Expirado' ? (
                  <span className="text-red-500">Codigo expirado</span>
                ) : (
                  <span>Expira em {countdown}</span>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-ceramic-text-primary">Como vincular:</p>
              <ol className="text-sm text-ceramic-text-secondary space-y-1.5 list-decimal list-inside">
                <li>Abra o Telegram e procure por <strong>@AicaLifeBot</strong></li>
                <li>
                  Envie: <code className="bg-ceramic-cool px-1.5 py-0.5 rounded text-xs font-mono">
                    /vincular {linkCode}
                  </code>
                </li>
                <li>A vinculacao sera confirmada automaticamente aqui</li>
              </ol>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={generateCode}
                disabled={isGenerating}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-ceramic-border text-sm text-ceramic-text-secondary hover:bg-ceramic-cool transition-colors disabled:opacity-50"
              >
                <RefreshCw className={cn('w-4 h-4', isGenerating && 'animate-spin')} />
                Novo codigo
              </button>
              <a
                href="https://t.me/AicaLifeBot"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                <Send className="w-4 h-4" />
                Abrir Telegram
              </a>
            </div>
          </motion.div>
        )}

        {status === 'linked' && (
          <motion.div
            key="linked"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Linked info */}
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
                <div>
                  <p className="font-medium text-green-800">
                    @{linkData?.telegram_username || 'Telegram'}
                  </p>
                  <p className="text-sm text-green-600">
                    Vinculado em {linkData?.linked_at
                      ? new Date(linkData.linked_at).toLocaleDateString('pt-BR')
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm text-ceramic-text-secondary">
              Voce pode interagir com a AICA via @AicaLifeBot no Telegram.
              Notificacoes e comandos estao ativos.
            </p>

            {/* Unlink */}
            {!showUnlinkConfirm ? (
              <button
                onClick={() => setShowUnlinkConfirm(true)}
                className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 transition-colors"
              >
                <Unlink className="w-4 h-4" />
                Desvincular conta
              </button>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2"
              >
                <p className="text-sm text-red-600 flex-1">Tem certeza?</p>
                <button
                  onClick={handleUnlink}
                  className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Confirmar
                </button>
                <button
                  onClick={() => setShowUnlinkConfirm(false)}
                  className="px-3 py-1.5 text-sm border border-ceramic-border rounded-lg hover:bg-ceramic-cool transition-colors"
                >
                  Cancelar
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
