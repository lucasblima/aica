/**
 * CreditBalanceWidget Component
 *
 * Displays the user's monthly credit balance with:
 * - Remaining credits (monthly budget + extra)
 * - Usage progress bar
 * - Daily claim button (if available)
 * - Monthly stats
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Coins, Plus, TrendingUp, Loader2, Check, Gift, Ticket } from 'lucide-react'
import { useUserCredits } from '@/hooks/useUserCredits'
import { useCouponRedemption } from '@/hooks/useCouponRedemption'

interface CreditBalanceWidgetProps {
  /** Compact mode for inline display */
  compact?: boolean
  /** Show lifetime stats */
  showStats?: boolean
  /** Custom class name */
  className?: string
}

export function CreditBalanceWidget({
  compact = false,
  showStats = true,
  className = ''
}: CreditBalanceWidgetProps) {
  const {
    balance,
    monthlyBudget,
    monthUsed,
    lifetimeEarned,
    isLoading,
    canClaimDaily,
    claimDaily
  } = useUserCredits()

  const [isClaiming, setIsClaiming] = useState(false)
  const [claimSuccess, setClaimSuccess] = useState(false)
  const [claimMessage, setClaimMessage] = useState<string | null>(null)
  const [showCouponInput, setShowCouponInput] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const { isRedeeming, result: couponResult, error: couponError, redeem, reset: resetCoupon } = useCouponRedemption()

  const handleClaimDaily = async () => {
    setIsClaiming(true)
    setClaimMessage(null)

    try {
      const result = await claimDaily()
      if (result.success) {
        setClaimSuccess(true)
        setClaimMessage(`+${result.creditsEarned} creditos!`)
        setTimeout(() => {
          setClaimSuccess(false)
          setClaimMessage(null)
        }, 3000)
      } else {
        setClaimMessage(result.message)
        setTimeout(() => setClaimMessage(null), 3000)
      }
    } finally {
      setIsClaiming(false)
    }
  }

  const handleRedeemCoupon = async () => {
    const res = await redeem(couponCode)
    if (res.success) {
      setCouponCode('')
      setTimeout(() => {
        setShowCouponInput(false)
        resetCoupon()
      }, 3000)
    }
  }

  if (isLoading) {
    return (
      <div className={`animate-pulse ${compact ? 'h-8' : 'h-16'} bg-ceramic-text-secondary/10 rounded-xl ${className}`} />
    )
  }

  // Usage percentage for progress bar
  const usagePercent = monthlyBudget > 0 ? Math.min(100, (monthUsed / monthlyBudget) * 100) : 0

  // Compact mode - just show balance inline
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Coins className="w-4 h-4 text-amber-500" />
        <span className="font-bold text-amber-600">{balance}</span>
        {canClaimDaily && (
          <button
            onClick={handleClaimDaily}
            disabled={isClaiming}
            className="p-1 rounded-full bg-amber-100 hover:bg-amber-200 transition-colors"
            title="Resgatar creditos diarios"
          >
            {isClaiming ? (
              <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
            ) : (
              <Plus className="w-3 h-3 text-amber-600" />
            )}
          </button>
        )}
      </div>
    )
  }

  // Full widget
  return (
    <div className={`ceramic-card p-4 ${className}`}>
      <div className="flex items-center justify-between">
        {/* Balance Display */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl">
            <Coins className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <motion.div
              key={balance}
              initial={{ scale: 1.2, color: '#22c55e' }}
              animate={{ scale: 1, color: '#d97706' }}
              className="text-2xl font-black text-amber-600"
            >
              {balance}
            </motion.div>
            <div className="text-xs text-ceramic-text-secondary font-medium">
              Creditos restantes
            </div>
          </div>
        </div>

        {/* Daily Claim Button */}
        <AnimatePresence mode="wait">
          {canClaimDaily ? (
            <motion.button
              key="claim-button"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={handleClaimDaily}
              disabled={isClaiming}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-bold hover:from-amber-600 hover:to-amber-700 transition-all disabled:opacity-50 shadow-lg shadow-amber-500/20"
            >
              {isClaiming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : claimSuccess ? (
                <Check className="w-4 h-4" />
              ) : (
                <Gift className="w-4 h-4" />
              )}
              <span>{claimSuccess ? 'Resgatado!' : 'Resgatar +5'}</span>
            </motion.button>
          ) : (
            <motion.div
              key="claimed-badge"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 px-3 py-1.5 bg-ceramic-success/10 text-ceramic-success rounded-full text-xs font-bold"
            >
              <Check className="w-3 h-3" />
              Resgatado hoje
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Monthly Usage Progress */}
      <div className="mt-3">
        <div className="flex justify-between text-xs text-ceramic-text-secondary mb-1">
          <span>{monthUsed} usados</span>
          <span>{monthlyBudget}/mes</span>
        </div>
        <div className="h-2 bg-ceramic-text-secondary/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${usagePercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              usagePercent > 90 ? 'bg-ceramic-error' :
              usagePercent > 70 ? 'bg-amber-500' :
              'bg-ceramic-success'
            }`}
          />
        </div>
      </div>

      {/* Claim Message */}
      <AnimatePresence>
        {claimMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className={`mt-3 p-2 rounded-lg text-sm font-medium text-center ${
              claimSuccess
                ? 'bg-ceramic-success/10 text-ceramic-success'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {claimMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coupon Input */}
      <div className="mt-3">
        {!showCouponInput ? (
          <button
            onClick={() => { setShowCouponInput(true); resetCoupon() }}
            className="flex items-center gap-1 text-amber-600 hover:text-amber-700 text-xs font-medium transition-colors"
          >
            <Ticket className="w-3 h-3" />
            Tenho um cupom
          </button>
        ) : (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleRedeemCoupon()}
                  placeholder="CODIGO"
                  disabled={isRedeeming}
                  className="flex-1 border border-ceramic-border rounded-lg px-3 py-1.5 text-sm uppercase bg-white text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:opacity-50"
                />
                <button
                  onClick={handleRedeemCoupon}
                  disabled={isRedeeming || !couponCode.trim()}
                  className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-3 py-1.5 text-sm font-bold transition-colors disabled:opacity-50"
                >
                  {isRedeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Resgatar'}
                </button>
                <button
                  onClick={() => { setShowCouponInput(false); setCouponCode(''); resetCoupon() }}
                  className="text-ceramic-text-secondary hover:text-ceramic-text-primary text-xs px-1"
                >
                  &times;
                </button>
              </div>
              {couponResult && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-2 text-xs font-medium text-ceramic-success"
                >
                  +{couponResult.credits_earned} creditos!
                </motion.p>
              )}
              {couponError && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-2 text-xs font-medium text-ceramic-error"
                >
                  {couponError}
                </motion.p>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Stats */}
      {showStats && (
        <div className="mt-4 pt-3 border-t border-ceramic-text-secondary/10">
          <div className="flex items-center gap-1 text-xs text-ceramic-text-secondary">
            <TrendingUp className="w-3 h-3" />
            <span>{lifetimeEarned} creditos bonus ganhos no total</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default CreditBalanceWidget
