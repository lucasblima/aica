import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Mic, User } from 'lucide-react';
import { BentoCard } from './BentoCard';

/**
 * BentoFeatures Section
 *
 * CSS Grid "Bento Box" layout replacing the linear 3-column feature section.
 * Follows the Digital Ceramic aesthetic with translucent cards.
 *
 * Layout:
 * - Card 1 (Large Square - Left): "Privacidade Absoluta" with Lock icon/blur effect
 * - Card 2 (Wide Rectangle - Top Right): "Design Ceramico" with Microphone detail
 * - Card 3 (Wide Rectangle - Bottom Right): "Autoconhecimento" with Passport floating
 *
 * Grid structure:
 * Desktop: 4 columns, 2 rows
 * Mobile: Single column stack
 */
export function BentoFeatures() {
  return (
    <section className="bg-ceramic-base py-16 md:py-24 px-6 md:px-8">
      <div className="max-w-[1200px] mx-auto">
        {/* Section Header */}
        <motion.div
          className="text-center mb-12 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-ceramic-text-primary tracking-tight mb-4">
            Projetado para voce
          </h2>
          <p className="text-lg text-ceramic-text-secondary max-w-xl mx-auto">
            Cada detalhe pensado para seu crescimento pessoal
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div
          className="grid gap-4 md:gap-6"
          style={{
            gridTemplateColumns: 'repeat(4, 1fr)',
            gridTemplateRows: 'repeat(2, minmax(200px, auto))',
            gridTemplateAreas: `
              "privacy privacy design design"
              "privacy privacy knowledge knowledge"
            `
          }}
        >
          {/* Privacy Card - Large Square */}
          <BentoCard
            size="large-square"
            title="Privacidade Absoluta"
            subtitle="Seus dados sao so seus"
            gridArea="privacy"
            delay={0}
            visual={<PrivacyVisual />}
            className="min-h-[300px] md:min-h-[420px]"
          />

          {/* Design Card - Wide Rectangle Top Right */}
          <BentoCard
            size="wide-rectangle"
            title="Design Ceramico"
            subtitle="Beleza que voce sente"
            gridArea="design"
            delay={0.1}
            visual={<DesignVisual />}
            className="min-h-[180px] md:min-h-[200px]"
          />

          {/* Knowledge Card - Wide Rectangle Bottom Right */}
          <BentoCard
            size="wide-rectangle"
            title="Autoconhecimento"
            subtitle="Entenda seus padroes"
            gridArea="knowledge"
            delay={0.2}
            visual={<KnowledgeVisual />}
            className="min-h-[180px] md:min-h-[200px]"
          />
        </div>

        {/* Mobile Stack Layout */}
        <style>{`
          @media (max-width: 768px) {
            .grid[style*="gridTemplateAreas"] {
              display: flex !important;
              flex-direction: column !important;
              gap: 1rem !important;
            }
          }
        `}</style>
      </div>
    </section>
  );
}

/**
 * Privacy Visual Component
 * Lock icon with frosted glass blur effect
 */
function PrivacyVisual() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Frosted glass circles */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="absolute w-48 h-48 md:w-64 md:h-64 rounded-full bg-white/30 backdrop-blur-xl"
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-32 h-32 md:w-48 md:h-48 rounded-full bg-white/50 backdrop-blur-lg"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.5, 0.7, 0.5]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        />
      </div>

      {/* Lock Icon */}
      <motion.div
        className="relative z-10 w-20 h-20 md:w-28 md:h-28 rounded-full bg-ceramic-base flex items-center justify-center shadow-ceramic-elevated"
        initial={{ scale: 0.8, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3, duration: 0.5, type: 'spring' }}
      >
        <Lock className="w-10 h-10 md:w-14 md:h-14 text-ceramic-accent" strokeWidth={1.5} />
      </motion.div>
    </div>
  );
}

/**
 * Design Visual Component
 * Microphone button with ceramic inset shadow detail
 */
function DesignVisual() {
  return (
    <div className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2">
      <motion.div
        className="relative"
        initial={{ x: 50, opacity: 0 }}
        whileInView={{ x: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        {/* Mic Button with ceramic style */}
        <div
          className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-ceramic-base flex items-center justify-center"
          style={{
            boxShadow: `
              inset 6px 6px 12px rgba(163, 158, 145, 0.30),
              inset -6px -6px 12px rgba(255, 255, 255, 1.0),
              0 4px 12px rgba(0, 0, 0, 0.08)
            `
          }}
        >
          <Mic className="w-8 h-8 md:w-12 md:h-12 text-ceramic-accent" strokeWidth={1.5} />
        </div>

        {/* Decorative rings */}
        <div className="absolute -inset-3 md:-inset-4 rounded-full border border-ceramic-text-secondary/10" />
        <div className="absolute -inset-6 md:-inset-8 rounded-full border border-ceramic-text-secondary/5" />
      </motion.div>
    </div>
  );
}

/**
 * Knowledge Visual Component
 * Identity Passport card floating effect
 */
function KnowledgeVisual() {
  return (
    <motion.div
      className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2"
      initial={{ x: 30, opacity: 0, rotateY: -10 }}
      whileInView={{ x: 0, opacity: 1, rotateY: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.3, duration: 0.6 }}
    >
      {/* Mini Passport Card */}
      <div
        className="w-40 md:w-56 bg-ceramic-base rounded-2xl p-3 md:p-4"
        style={{
          boxShadow: `
            8px 8px 20px rgba(163, 158, 145, 0.20),
            -4px -4px 12px rgba(255, 255, 255, 0.90)
          `,
          transform: 'perspective(500px) rotateY(-5deg)'
        }}
      >
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-ceramic-accent via-amber-400 to-amber-300 rounded-full mb-3 opacity-60" />

        {/* Avatar and level */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-ceramic-accent to-amber-600 flex items-center justify-center">
            <User className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="h-2 w-16 bg-ceramic-text-secondary/20 rounded-full" />
            <div className="h-1.5 w-10 bg-ceramic-text-secondary/10 rounded-full mt-1" />
          </div>
        </div>

        {/* Progress bar placeholder */}
        <div className="h-2 w-full bg-ceramic-text-secondary/10 rounded-full overflow-hidden">
          <div className="h-full w-3/5 bg-gradient-to-r from-ceramic-accent to-amber-400 rounded-full" />
        </div>
      </div>
    </motion.div>
  );
}

export default BentoFeatures;
