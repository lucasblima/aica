/**
 * ProfileDrawer Component
 * Digital Ceramic V2 - Dashboard Redesign
 *
 * Drawer for user profile management with Data Sovereignty section
 * Desktop: 500px slide-in from right
 * Mobile: Full-height slide-in from bottom
 *
 * Features:
 * - Apple-inspired smooth transitions
 * - Swipe to dismiss on mobile
 * - Two tabs: Profile and Metrics
 * - Danger Zone for account deletion
 */

import React, { useState } from 'react'
import { motion, AnimatePresence, PanInfo, useMotionValue } from 'framer-motion'
import { X, User, Mail, Calendar, Shield, AlertTriangle, TrendingUp, Crown, Zap, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { DangerZone } from './DangerZone'
import { EfficiencyFlowCard } from '../EfficiencyFlowCard'
import { useUserPlan } from '@/hooks/useUserPlan'
import { supabase } from '@/services/supabaseClient'
import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('ProfileDrawer')

function PlanSection() {
  const navigate = useNavigate()
  const { plan, isLoading } = useUserPlan()
  const isFree = plan.id === 'free'
  const [portalLoading, setPortalLoading] = useState(false)

  const formatCredits = (credits: number): string => {
    if (credits >= 1000) return `${(credits / 1000).toFixed(credits % 1000 === 0 ? 0 : 1)}k`
    return String(credits)
  }

  const handleManagePlan = async () => {
    if (isFree) {
      navigate('/pricing')
      return
    }

    setPortalLoading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session?.access_token) {
        navigate('/pricing')
        return
      }

      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: { return_url: window.location.origin + '/pricing' },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      })

      if (error || data?.error) {
        log.error('Portal session error:', error || data?.error)
        navigate('/pricing')
        return
      }

      if (data?.portal_url) {
        window.location.href = data.portal_url
      }
    } catch (err) {
      log.error('Failed to open portal:', err)
      navigate('/pricing')
    } finally {
      setPortalLoading(false)
    }
  }

  return (
    <div className="ceramic-stats-tray space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-500" />
          <h4 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
            Seu Plano
          </h4>
        </div>
        <span className="text-xs font-bold text-ceramic-text-primary bg-ceramic-text-secondary/10 px-2 py-0.5 rounded-full">
          {isLoading ? '...' : plan.name}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-ceramic-text-secondary">
        <Zap className="w-3 h-3" />
        <span>{isLoading ? '...' : `${formatCredits(plan.monthly_credits)} creditos/mes`}</span>
      </div>
      <button
        onClick={handleManagePlan}
        disabled={portalLoading}
        className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm px-4 py-2 transition-colors disabled:opacity-50"
      >
        {portalLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Crown className="w-4 h-4" />
        )}
        {portalLoading ? 'Abrindo...' : isFree ? 'Fazer upgrade' : 'Gerenciar plano'}
      </button>
    </div>
  )
}

interface ProfileDrawerProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  userEmail: string
  userName?: string
  avatarUrl?: string
  createdAt?: string
  onDeleteAccount: () => Promise<void>
}

export function ProfileDrawer({
  isOpen,
  onClose,
  userId,
  userEmail,
  userName,
  avatarUrl,
  createdAt,
  onDeleteAccount,
}: ProfileDrawerProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'metrics'>('profile')

  // Swipe to dismiss (mobile)
  const y = useMotionValue(0)

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true)
      await onDeleteAccount()
    } catch (error) {
      log.error('Error deleting account:', error)
      setIsDeleting(false)
    }
  }

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Close drawer if dragged down >150px on mobile
    if (info.offset.y > 150) {
      onClose()
    }
  }

  // Get initials for avatar fallback
  const initials = userName
    ? userName.slice(0, 2).toUpperCase()
    : userEmail.slice(0, 2).toUpperCase()

  // Format creation date
  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString('pt-BR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Data nao disponivel'

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer - Desktop: slide from right, Mobile: slide from bottom */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            style={{ y }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[500px] bg-ceramic-base shadow-2xl flex flex-col
                       sm:rounded-l-2xl overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-drawer-title"
            data-testid="profile-drawer"
          >
            {/* Mobile drag handle */}
            <div className="sm:hidden flex justify-center py-2 bg-ceramic-base border-b border-ceramic-text-secondary/10">
              <div className="w-12 h-1 rounded-full bg-ceramic-text-secondary/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-ceramic-text-secondary/10 bg-white/20">
              <h2 id="profile-drawer-title" className="text-2xl font-black text-ceramic-text-primary">
                Minha Conta
              </h2>
              <motion.button
                onClick={onClose}
                className="p-2 hover:bg-white/30 rounded-lg transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Fechar drawer"
              >
                <X className="w-5 h-5 text-ceramic-text-secondary" />
              </motion.button>
            </div>

            {/* Tab Selector */}
            <div className="flex border-b border-ceramic-text-secondary/10">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex-1 py-3 text-sm font-bold transition-colors ${
                  activeTab === 'profile'
                    ? 'text-ceramic-text-primary border-b-2 border-amber-500'
                    : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'
                }`}
              >
                Perfil
              </button>
              <button
                onClick={() => setActiveTab('metrics')}
                className={`flex-1 py-3 text-sm font-bold transition-colors ${
                  activeTab === 'metrics'
                    ? 'text-ceramic-text-primary border-b-2 border-amber-500'
                    : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'
                }`}
              >
                Metricas
              </button>
            </div>

            {/* Content (scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeTab === 'profile' ? (
                <>
                  {/* User Info Section */}
                  <div className="flex items-center gap-4">
                    <div className="ceramic-avatar-recessed">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={userName || userEmail}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-xl">
                          {initials}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-ceramic-text-primary text-lg">
                        {userName || 'Usuario'}
                      </h3>
                      <p className="text-sm text-ceramic-text-secondary">{userEmail}</p>
                    </div>
                  </div>

                  {/* Account Info */}
                  <div className="ceramic-stats-tray space-y-4">
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-ceramic-text-secondary" />
                      <div>
                        <p className="text-xs text-ceramic-text-secondary">Email</p>
                        <p className="text-sm font-medium text-ceramic-text-primary">{userEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-ceramic-text-secondary" />
                      <div>
                        <p className="text-xs text-ceramic-text-secondary">Membro desde</p>
                        <p className="text-sm font-medium text-ceramic-text-primary">{formattedDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Shield className="w-4 h-4 text-ceramic-text-secondary" />
                      <div>
                        <p className="text-xs text-ceramic-text-secondary">ID da Conta</p>
                        <p className="text-sm font-mono text-ceramic-text-primary truncate max-w-[200px]">
                          {userId.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Plan Section */}
                  <PlanSection />

                  {/* Data Sovereignty Section */}
                  <div className="pt-4">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-4 h-4 text-ceramic-text-secondary" />
                      <h4 className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                        Soberania de Dados
                      </h4>
                    </div>
                    <p className="text-xs text-ceramic-text-secondary mb-4">
                      Voce tem controle total sobre seus dados. A exclusao da conta remove permanentemente
                      todas as suas informacoes de nossos servidores.
                    </p>

                    <DangerZone
                      userEmail={userEmail}
                      onDeleteAccount={handleDeleteAccount}
                      isDeleting={isDeleting}
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Metrics Tab */}
                  <div className="space-y-6">
                    {/* Efficiency Metrics */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="w-4 h-4 text-ceramic-text-secondary" />
                        <h4 className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                          Metricas de Eficiencia
                        </h4>
                      </div>
                      <EfficiencyFlowCard userId={userId} days={30} />
                    </div>

                    {/* Placeholder for future metrics */}
                    <div className="ceramic-inset p-4 text-center">
                      <p className="text-sm text-ceramic-text-secondary">
                        Mais metricas em breve...
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default ProfileDrawer
