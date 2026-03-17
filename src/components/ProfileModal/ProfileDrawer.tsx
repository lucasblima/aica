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
import { X, Mail, Calendar, Shield, AlertTriangle, TrendingUp, Crown, Zap, ExternalLink, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { DangerZone } from './DangerZone'
import { EfficiencyFlowCard } from '../EfficiencyFlowCard'
import { useUserPlan } from '@/hooks/useUserPlan'
import { useGoogleScopes } from '@/hooks/useGoogleScopes'
import { PAYMENTS_ENABLED } from '@/modules/billing/components/PlanCard'

function PlanSection() {
  const navigate = useNavigate()
  const { plan, isLoading } = useUserPlan()
  const isFree = plan.id === 'free'

  const formatCredits = (credits: number): string => {
    if (credits >= 1000) return `${(credits / 1000).toFixed(credits % 1000 === 0 ? 0 : 1)}k`
    return String(credits)
  }

  const handleManagePlan = () => {
    if (isFree || !PAYMENTS_ENABLED) {
      navigate('/pricing')
    } else {
      // Paid user → go to manage subscription page (replaces Stripe Portal)
      navigate('/manage-subscription')
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
        <span>{isLoading ? '...' : `${formatCredits(plan.monthly_credits)} créditos/mes`}</span>
      </div>
      <button
        onClick={handleManagePlan}
        className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm px-4 py-2 transition-colors"
      >
        <Crown className="w-4 h-4" />
        {isFree ? (PAYMENTS_ENABLED ? 'Fazer upgrade' : 'Ver planos') : (PAYMENTS_ENABLED ? 'Gerenciar plano' : 'Ver planos')}
      </button>
    </div>
  )
}

function ScopeStatusRow({ label, connected, color, onDisconnect, isDisconnecting }: {
  label: string
  connected: boolean
  color: string
  onDisconnect?: () => void
  isDisconnecting?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2.5">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: connected ? color : '#9CA3AF' }}
        />
        <span className="text-sm text-ceramic-text-primary">{label}</span>
      </div>
      {connected && onDisconnect && (
        <button
          onClick={onDisconnect}
          disabled={isDisconnecting}
          className="text-xs text-ceramic-text-secondary hover:text-ceramic-error transition-colors disabled:opacity-50"
        >
          {isDisconnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Desconectar'}
        </button>
      )}
      {!connected && (
        <span className="text-xs text-ceramic-text-secondary/60">Não conectado</span>
      )}
    </div>
  )
}

function GoogleIntegrationsSection({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const { hasCalendar, hasGmail, hasDrive, isLoading, disconnectAll } = useGoogleScopes()
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  const anyConnected = hasCalendar || hasGmail || hasDrive

  const handleDisconnectAll = async () => {
    setIsDisconnecting(true)
    try {
      await disconnectAll()
    } finally {
      setIsDisconnecting(false)
    }
  }

  const handleOpenGoogleHub = () => {
    onClose()
    navigate('/google-hub')
  }

  return (
    <div className="ceramic-stats-tray space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <h4 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
            Google
          </h4>
        </div>
        <button
          onClick={handleOpenGoogleHub}
          className="text-xs text-ceramic-info hover:underline flex items-center gap-1"
        >
          Gerenciar <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-ceramic-text-secondary" />
        </div>
      ) : (
        <div className="divide-y divide-ceramic-border/40">
          <ScopeStatusRow label="Calendar" connected={hasCalendar} color="#EA4335" />
          <ScopeStatusRow label="Gmail" connected={hasGmail} color="#4285F4" />
          <ScopeStatusRow label="Drive" connected={hasDrive} color="#0F9D58" />
        </div>
      )}

      {anyConnected && (
        <button
          onClick={handleDisconnectAll}
          disabled={isDisconnecting}
          className="w-full text-xs text-ceramic-text-secondary hover:text-ceramic-error py-1.5 transition-colors disabled:opacity-50"
        >
          {isDisconnecting ? 'Desconectando...' : 'Desconectar tudo'}
        </button>
      )}
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
      console.error('[ProfileDrawer] Error deleting account:', error)
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
    : 'Data não disponível'

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
                Métricas
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

                  {/* Google Integrations Section */}
                  <GoogleIntegrationsSection onClose={onClose} />

                  {/* Data Sovereignty Section */}
                  <div className="pt-4">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-4 h-4 text-ceramic-text-secondary" />
                      <h4 className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                        Soberania de Dados
                      </h4>
                    </div>
                    <p className="text-xs text-ceramic-text-secondary mb-4">
                      Você tem controle total sobre seus dados. A exclusao da conta remove permanentemente
                      todas as suas informações de nossos servidores.
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
                          Métricas de Eficiência
                        </h4>
                      </div>
                      <EfficiencyFlowCard userId={userId} days={30} />
                    </div>

                    {/* Placeholder for future metrics */}
                    <div className="ceramic-inset p-4 text-center">
                      <p className="text-sm text-ceramic-text-secondary">
                        Mais métricas em breve...
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
