/**
 * TrustLevelBadge — Visual indicator of the user's trust level
 *
 * Shows an icon + label + optional progress bar representing
 * the user's current trust level in the agent autonomy system.
 */

import { Shield, Zap, Sparkles } from 'lucide-react'
import type { TrustLevel } from '@/lib/agents/trustLevel'

const TRUST_CONFIG: Record<
  TrustLevel,
  {
    icon: typeof Shield
    label: string
    color: string
    bgColor: string
    barColor: string
  }
> = {
  suggest_confirm: {
    icon: Shield,
    label: 'Assistido',
    color: 'text-ceramic-info',
    bgColor: 'bg-ceramic-info/10',
    barColor: 'bg-ceramic-info',
  },
  execute_validate: {
    icon: Zap,
    label: 'Autonomo',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    barColor: 'bg-amber-500',
  },
  jarvis: {
    icon: Sparkles,
    label: 'Jarvis',
    color: 'text-ceramic-success',
    bgColor: 'bg-ceramic-success/10',
    barColor: 'bg-ceramic-success',
  },
}

interface TrustLevelBadgeProps {
  level: TrustLevel
  progress?: number
  compact?: boolean
}

export function TrustLevelBadge({ level, progress, compact }: TrustLevelBadgeProps) {
  const config = TRUST_CONFIG[level]
  const Icon = config.icon

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${config.bgColor}`}>
      <Icon size={compact ? 12 : 14} className={config.color} />
      {!compact && (
        <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
      )}
      {progress !== undefined && progress < 1 && !compact && (
        <div className="w-12 h-1 bg-ceramic-border rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${config.barColor}`}
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}
