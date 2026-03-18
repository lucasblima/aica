/**
 * ProfileModal Component
 * Digital Ceramic V2 - Dashboard Redesign
 *
 * Modal for user profile management with Data Sovereignty section
 * Includes "Danger Zone" for account deletion with double confirmation
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, User, Mail, Calendar, Shield, AlertTriangle, TrendingUp } from 'lucide-react'
import { DangerZone } from './DangerZone'
import { EfficiencyFlowCard } from '../EfficiencyFlowCard'
import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('ProfileModal')

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  userEmail: string
  userName?: string
  avatarUrl?: string
  createdAt?: string
  onDeleteAccount: () => Promise<void>
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 25 },
  },
  exit: { opacity: 0, scale: 0.95, y: 20 },
}

export function ProfileModal({
  isOpen,
  onClose,
  userId,
  userEmail,
  userName,
  avatarUrl,
  createdAt,
  onDeleteAccount,
}: ProfileModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'metrics'>('profile')

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true)
      await onDeleteAccount()
    } catch (error) {
      log.error('Error deleting account:', error)
      setIsDeleting(false)
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
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-md ceramic-card p-0 overflow-hidden max-h-[90vh] overflow-y-auto"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-modal-title"
            data-testid="profile-modal"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-ceramic-text-secondary/10">
              <h2 id="profile-modal-title" className="text-lg font-bold text-ceramic-text-primary">
                Minha Conta
              </h2>
              <motion.button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-ceramic-text-secondary/10 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Fechar modal"
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

            {/* Content */}
            <div className="p-6 space-y-6">
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
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ProfileModal
