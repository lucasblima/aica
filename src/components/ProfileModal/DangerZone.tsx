/**
 * DangerZone Component
 * Digital Ceramic V2 - Dashboard Redesign
 *
 * Secure account deletion with double confirmation
 * Requires user to type their email to confirm deletion
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Loader2 } from 'lucide-react'

interface DangerZoneProps {
  userEmail: string
  onDeleteAccount: () => Promise<void>
  isDeleting: boolean
}

export function DangerZone({ userEmail, onDeleteAccount, isDeleting }: DangerZoneProps) {
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmationInput, setConfirmationInput] = useState('')

  const isConfirmed = confirmationInput.toLowerCase() === userEmail.toLowerCase()

  const handleFirstClick = () => {
    setShowConfirmation(true)
  }

  const handleCancel = () => {
    setShowConfirmation(false)
    setConfirmationInput('')
  }

  const handleDelete = async () => {
    if (isConfirmed && !isDeleting) {
      await onDeleteAccount()
    }
  }

  return (
    <div className="danger-zone" data-testid="danger-zone" role="region" aria-label="Zona de perigo - ações irreversíveis">
      <h5 className="danger-zone-title">Zona de Perigo</h5>

      <AnimatePresence mode="wait">
        {!showConfirmation ? (
          <motion.div
            key="initial"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <p className="text-xs text-ceramic-text-secondary mb-3">
              Esta acao e irreversivel. Todos os seus dados serao permanentemente excluidos.
            </p>
            <button
              onClick={handleFirstClick}
              className="danger-zone-btn w-full flex items-center justify-center gap-2 min-h-[44px]"
              data-testid="delete-account-btn"
            >
              <Trash2 className="w-4 h-4" />
              Deletar Minha Conta
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="confirmation"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <p className="text-xs text-red-600 font-medium">
              Para confirmar, digite seu email abaixo:
            </p>
            <input
              type="email"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder={userEmail}
              className="w-full px-3 py-2 text-sm border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
              autoComplete="off"
              autoFocus
            />

            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="flex-1 px-3 py-2 text-sm font-medium text-ceramic-text-secondary hover:bg-ceramic-text-secondary/10 rounded-lg transition-colors"
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <motion.button
                onClick={handleDelete}
                disabled={!isConfirmed || isDeleting}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors ${
                  isConfirmed && !isDeleting
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-red-200 text-red-400 cursor-not-allowed'
                }`}
                whileHover={isConfirmed && !isDeleting ? { scale: 1.02 } : {}}
                whileTap={isConfirmed && !isDeleting ? { scale: 0.98 } : {}}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Confirmar Exclusao
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default DangerZone
