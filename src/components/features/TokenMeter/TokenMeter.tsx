/**
 * TokenMeter Component
 * Issue #132: AICA Billing, Rate Limiting & Unified Chat System
 *
 * Visual meter showing token usage across tiers with countdown to reset.
 * Can be used standalone or within the AicaChat component.
 */

import React, { useEffect, useState } from 'react'
import { createNamespacedLogger } from '@/lib/logger'
import { Zap, Clock, TrendingUp, AlertTriangle } from 'lucide-react'

const log = createNamespacedLogger('TokenMeter')
import { cn } from '@/lib/utils'
import rateLimiterService, { RateLimitStatus, ModelTier } from '@/services/rateLimiterService'
import './TokenMeter.css'

// ============================================================================
// TYPES
// ============================================================================

interface TokenMeterProps {
  className?: string
  variant?: 'full' | 'compact' | 'mini'
  showCredits?: boolean
  showCountdown?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
  onLimitReached?: () => void
}

interface TierConfig {
  id: ModelTier
  icon: string
  label: string
  color: string
  gradient: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TIERS: TierConfig[] = [
  {
    id: 'premium',
    icon: '⭐',
    label: 'Premium',
    color: '#f59e0b',
    gradient: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
  },
  {
    id: 'standard',
    icon: '💡',
    label: 'Standard',
    color: '#3b82f6',
    gradient: 'linear-gradient(90deg, #3b82f6, #2563eb)',
  },
  {
    id: 'lite',
    icon: '✨',
    label: 'Lite',
    color: '#10b981',
    gradient: 'linear-gradient(90deg, #10b981, #059669)',
  },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(0)}k`
  }
  return tokens.toString()
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TokenMeter({
  className,
  variant = 'full',
  showCredits = true,
  showCountdown = true,
  autoRefresh = true,
  refreshInterval = 30000,
  onLimitReached,
}: TokenMeterProps) {
  const [status, setStatus] = useState<RateLimitStatus | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch rate limit status
  const fetchStatus = async () => {
    try {
      const data = await rateLimiterService.checkRateLimit()
      setStatus(data)

      // Check if limit reached
      if (!data.canSend && onLimitReached) {
        onLimitReached()
      }
    } catch (error) {
      log.error('[TokenMeter] Error fetching status:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()

    if (autoRefresh) {
      const interval = setInterval(fetchStatus, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  if (loading || !status) {
    return (
      <div className={cn('token-meter', `token-meter--${variant}`, 'token-meter--loading', className)}>
        <div className="token-meter__skeleton" />
      </div>
    )
  }

  const { usage, windowResetIn, creditBalance, canSend } = status

  // -------------------------------------------------------------------------
  // MINI VARIANT
  // -------------------------------------------------------------------------

  if (variant === 'mini') {
    const totalRemaining = usage.premium.remaining + usage.standard.remaining + usage.lite.remaining
    const totalLimit = usage.premium.limit + usage.standard.limit + usage.lite.limit
    const percentUsed = Math.min(100, ((totalLimit - totalRemaining) / totalLimit) * 100)

    return (
      <div className={cn('token-meter', 'token-meter--mini', className)}>
        <div className="token-meter__mini-bar">
          <div
            className="token-meter__mini-fill"
            style={{ width: `${percentUsed}%` }}
          />
        </div>
        {showCountdown && (
          <span className="token-meter__mini-time">
            <Clock size={10} />
            {formatTime(windowResetIn)}
          </span>
        )}
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // COMPACT VARIANT
  // -------------------------------------------------------------------------

  if (variant === 'compact') {
    return (
      <div className={cn('token-meter', 'token-meter--compact', className)}>
        <div className="token-meter__compact-tiers">
          {TIERS.map((tier) => {
            const tierUsage = usage[tier.id]
            const percentUsed = Math.min(100, (tierUsage.used / tierUsage.limit) * 100)

            return (
              <div key={tier.id} className="token-meter__compact-tier">
                <span className="token-meter__compact-icon">{tier.icon}</span>
                <div className="token-meter__compact-bar">
                  <div
                    className="token-meter__compact-fill"
                    style={{
                      width: `${percentUsed}%`,
                      background: tier.gradient,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="token-meter__compact-footer">
          {showCountdown && (
            <span className="token-meter__compact-time">
              <Clock size={12} />
              {formatTime(windowResetIn)}
            </span>
          )}
          {showCredits && creditBalance > 0 && (
            <span className="token-meter__compact-credits">
              <Zap size={12} />
              R$ {creditBalance.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // FULL VARIANT
  // -------------------------------------------------------------------------

  return (
    <div className={cn('token-meter', 'token-meter--full', className)}>
      {!canSend && (
        <div className="token-meter__warning">
          <AlertTriangle size={14} />
          <span>Limite atingido - mensagens ser\u00e3o enfileiradas</span>
        </div>
      )}

      <div className="token-meter__header">
        <h4 className="token-meter__title">
          <TrendingUp size={16} />
          Uso de Tokens
        </h4>
        {showCountdown && (
          <span className="token-meter__countdown">
            <Clock size={14} />
            Reset em {formatTime(windowResetIn)}
          </span>
        )}
      </div>

      <div className="token-meter__tiers">
        {TIERS.map((tier) => {
          const tierUsage = usage[tier.id]
          const percentUsed = Math.min(100, (tierUsage.used / tierUsage.limit) * 100)
          const isExhausted = tierUsage.remaining === 0

          return (
            <div
              key={tier.id}
              className={cn(
                'token-meter__tier',
                isExhausted && 'token-meter__tier--exhausted'
              )}
            >
              <div className="token-meter__tier-header">
                <span className="token-meter__tier-icon">{tier.icon}</span>
                <span className="token-meter__tier-label">{tier.label}</span>
                <span className="token-meter__tier-remaining">
                  {formatTokens(tierUsage.remaining)} restantes
                </span>
              </div>

              <div className="token-meter__tier-bar">
                <div
                  className="token-meter__tier-fill"
                  style={{
                    width: `${percentUsed}%`,
                    background: tier.gradient,
                  }}
                />
              </div>

              <div className="token-meter__tier-footer">
                <span>{formatTokens(tierUsage.used)}</span>
                <span>/</span>
                <span>{formatTokens(tierUsage.limit)}</span>
              </div>
            </div>
          )
        })}
      </div>

      {showCredits && (
        <div className="token-meter__credits">
          <div className="token-meter__credits-info">
            <Zap size={16} />
            <div>
              <span className="token-meter__credits-label">Cr\u00e9ditos dispon\u00edveis</span>
              <span className="token-meter__credits-value">R$ {creditBalance.toFixed(2)}</span>
            </div>
          </div>
          {creditBalance > 0 && (
            <span className="token-meter__credits-hint">
              Use cr\u00e9ditos para ignorar limites
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default TokenMeter
