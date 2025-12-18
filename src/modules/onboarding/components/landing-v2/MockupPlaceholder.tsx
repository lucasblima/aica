import React from 'react';
import { motion } from 'framer-motion';
import { Smartphone, User, TrendingUp, Star } from 'lucide-react';

interface MockupPlaceholderProps {
  /** Additional className */
  className?: string;
}

/**
 * MockupPlaceholder
 *
 * Placeholder component for the hero mockup image.
 * Displays a stylized representation of the Aica dashboard
 * until the final high-fidelity asset is provided.
 *
 * Design spec:
 * - 60% viewport height
 * - Levitation shadow (shadow-2xl + ambient glow)
 * - Shows Identity Passport with level/XP preview
 */
export function MockupPlaceholder({ className = '' }: MockupPlaceholderProps) {
  return (
    <motion.div
      className={`relative ${className}`}
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.8,
        delay: 0.3,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
    >
      {/* Phone Frame with Levitation Shadow */}
      <div
        className="relative bg-ceramic-text-primary rounded-[3rem] p-3"
        style={{
          boxShadow: `
            0 25px 50px -12px rgba(0, 0, 0, 0.20),
            0 0 60px rgba(217, 119, 6, 0.12),
            0 0 100px rgba(217, 119, 6, 0.05)
          `
        }}
      >
        {/* Screen */}
        <div className="bg-ceramic-base rounded-[2.5rem] overflow-hidden w-[280px] sm:w-[320px]">
          {/* Notch */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-24 h-6 bg-ceramic-text-primary rounded-full" />
          </div>

          {/* App Content Preview */}
          <div className="px-5 pb-8 space-y-4">
            {/* Identity Passport Preview */}
            <motion.div
              className="ceramic-passport relative overflow-hidden"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              {/* Top gradient bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ceramic-accent via-amber-400 to-amber-300 opacity-60" />

              <div className="flex items-center gap-4 pt-2">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-ceramic-accent to-amber-600 flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>

                {/* Level Badge */}
                <div className="ceramic-badge-gold flex items-center gap-2">
                  <span className="text-base font-black">5</span>
                  <span className="text-xs font-medium">Explorador</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="ceramic-progress-groove h-2">
                  <motion.div
                    className="ceramic-progress-fill h-full"
                    initial={{ width: 0 }}
                    animate={{ width: '68%' }}
                    transition={{ delay: 0.8, duration: 0.6 }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-ceramic-text-secondary">1,240 CP</span>
                  <span className="text-xs text-ceramic-text-secondary">560 para nivel 6</span>
                </div>
              </div>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
              className="grid grid-cols-3 gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <div className="ceramic-inset rounded-xl p-2 text-center">
                <TrendingUp className="w-4 h-4 mx-auto text-ceramic-accent mb-1" />
                <p className="text-xs text-ceramic-text-secondary">7 dias</p>
              </div>
              <div className="ceramic-inset rounded-xl p-2 text-center">
                <Star className="w-4 h-4 mx-auto text-amber-500 mb-1" />
                <p className="text-xs text-ceramic-text-secondary">12 XP</p>
              </div>
              <div className="ceramic-inset rounded-xl p-2 text-center">
                <Smartphone className="w-4 h-4 mx-auto text-ceramic-text-secondary mb-1" />
                <p className="text-xs text-ceramic-text-secondary">Ativo</p>
              </div>
            </motion.div>

            {/* Module Cards Preview */}
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <div className="ceramic-card rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <span className="text-sm">💰</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-ceramic-text-primary">Financas</p>
                  <p className="text-[10px] text-ceramic-text-secondary">3 tarefas</p>
                </div>
              </div>
              <div className="ceramic-card rounded-xl p-3 flex items-center gap-3 opacity-70">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                  <span className="text-sm">🫀</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-ceramic-text-primary">Saude</p>
                  <p className="text-[10px] text-ceramic-text-secondary">Em dia</p>
                </div>
              </div>
            </motion.div>

            {/* Bottom Nav Hint */}
            <div className="flex justify-center pt-2">
              <div className="w-28 h-1 bg-ceramic-text-secondary/30 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Ambient Glow */}
      <div
        className="absolute -inset-10 -z-10 rounded-full opacity-30 blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(217, 119, 6, 0.15) 0%, transparent 70%)'
        }}
      />
    </motion.div>
  );
}

export default MockupPlaceholder;
