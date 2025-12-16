/**
 * IdentityPassport Component
 * Digital Ceramic V2 - Dashboard Redesign
 *
 * Hero card displaying user identity with avatar, level badge, and CP progress
 * Layer 2 (Elevated) - The "physical card" on the ceramic table
 */

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Settings, ChevronRight } from 'lucide-react'
import { useConsciousnessPoints } from '@/modules/journey/hooks/useConsciousnessPoints'
import { useAuth } from '@/hooks/useAuth'
import { LEVEL_COLORS, CP_LEVELS } from '@/modules/journey/types/consciousnessPoints'

interface IdentityPassportProps {
  userId: string
  avatarUrl?: string
  onOpenProfile: () => void
  className?: string
}

export function IdentityPassport({
  userId,
  avatarUrl,
  onOpenProfile,
  className = '',
}: IdentityPassportProps) {
  const { user } = useAuth()
  const { stats, progress, isLoading } = useConsciousnessPoints()

  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    if (!progress) return 0
    return progress.progress_percentage || 0
  }, [progress])

  // Get color for current level
  const levelColor = useMemo(() => {
    if (!stats) return LEVEL_COLORS[1]
    return LEVEL_COLORS[stats.level]
  }, [stats])

  // Get user display name
  const displayName = useMemo(() => {
    if (!user) return 'Usuario'
    return user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario'
  }, [user])

  // Get avatar initials
  const initials = useMemo(() => {
    return displayName.slice(0, 2).toUpperCase()
  }, [displayName])

  if (isLoading) {
    return (
      <div className={`ceramic-passport ${className}`}>
        <div className="flex items-center gap-6 animate-pulse">
          <div className="w-16 h-16 bg-ceramic-text-secondary/10 rounded-full" />
          <div className="flex-1">
            <div className="h-6 bg-ceramic-text-secondary/10 rounded w-32 mb-2" />
            <div className="h-3 bg-ceramic-text-secondary/10 rounded w-full" />
          </div>
          <div className="w-24 h-10 bg-ceramic-text-secondary/10 rounded-full" />
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className={`ceramic-passport ${className}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      data-testid="identity-passport"
    >
      {/* Mobile: Stack vertical, Desktop: Horizontal */}
      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
        {/* Avatar Recessed */}
        <motion.div
          className="ceramic-avatar-recessed flex-shrink-0"
          whileHover={{ scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-14 h-14 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: levelColor }}
            >
              {initials}
            </div>
          )}
        </motion.div>

        {/* Level Badge */}
        <motion.div
          className="ceramic-badge-gold flex items-center gap-2 flex-shrink-0"
          whileHover={{ scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <span className="text-lg font-black">{stats?.level || 1}</span>
          <span className="text-sm font-medium">{stats?.level_name || 'Observador'}</span>
        </motion.div>

        {/* Progress Bar */}
        <div className="flex-1 min-w-0 w-full sm:w-auto">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-ceramic-text-secondary truncate">
              {displayName}
            </span>
            <span className="text-xs font-bold text-ceramic-text-primary">
              {progressPercentage.toFixed(0)}%
            </span>
          </div>
          <div
            className="ceramic-progress-groove"
            role="progressbar"
            aria-valuenow={progressPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progresso para o próximo nível"
            data-testid="cp-progress-bar"
          >
            <motion.div
              className="ceramic-progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-ceramic-text-secondary">
              {stats?.total_points?.toLocaleString() || 0} CP
            </span>
            <span className="text-xs text-ceramic-text-secondary">
              {progress?.points_to_next || 0} para proximo nivel
            </span>
          </div>
        </div>

        {/* Profile Button */}
        <motion.button
          onClick={onOpenProfile}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 hover:bg-white/80 transition-colors text-ceramic-text-primary font-medium text-sm min-h-[44px]"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          aria-label="Abrir configurações da conta"
          data-testid="profile-button"
        >
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">Minha Conta</span>
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  )
}

export default IdentityPassport
