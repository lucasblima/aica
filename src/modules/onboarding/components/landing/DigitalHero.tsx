import React from 'react';
import { motion } from 'framer-motion';
import { CeramicPillButton } from '@/components/ui/CeramicPillButton';
import { MockupPlaceholder } from './MockupPlaceholder';

interface DigitalHeroProps {
  /** Handler for the main CTA button */
  onGetStarted: () => void;
}

/**
 * DigitalHero Section
 *
 * The "Reveal" - Apple-inspired hero section where the product is the hero.
 * Follows the Digital Ceramic aesthetic with:
 * - Massive, bold typography
 * - High-fidelity mockup taking 60% viewport
 * - Single "Ceramic Pill" CTA button
 * - Levitation shadow effect
 *
 * Design spec:
 * - Headline: "Conheca a si mesmo." (text-6xl md:text-8xl, font-black, tracking-tighter)
 * - Subheadline: "O sistema operacional para sua vida." (text-xl, #948D82)
 * - CTA: Ceramic Pill with amber hover
 */
export function DigitalHero({ onGetStarted }: DigitalHeroProps) {
  return (
    <section className="min-h-screen bg-ceramic-base flex flex-col items-center justify-center px-6 py-16 md:py-24 relative overflow-hidden">
      {/* Subtle background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center top, rgba(217, 119, 6, 0.03) 0%, transparent 60%)'
        }}
      />

      {/* Content Container */}
      <div className="max-w-[1400px] w-full mx-auto flex flex-col items-center text-center relative z-10">
        {/* Headline */}
        <motion.h1
          className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-black text-ceramic-text-primary tracking-tighter leading-[0.95] mb-4 md:mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            ease: [0.25, 0.46, 0.45, 0.94]
          }}
        >
          Conheca a si mesmo.
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          className="text-lg sm:text-xl md:text-2xl text-ceramic-text-secondary font-normal max-w-xl mb-8 md:mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            delay: 0.15,
            ease: [0.25, 0.46, 0.45, 0.94]
          }}
        >
          O sistema operacional para sua vida.
        </motion.p>

        {/* Hero Mockup - 60% viewport height */}
        <motion.div
          className="w-full flex justify-center mb-10 md:mb-16"
          style={{ minHeight: '50vh' }}
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.8,
            delay: 0.25,
            ease: [0.25, 0.46, 0.45, 0.94]
          }}
        >
          <div className="animate-float">
            <MockupPlaceholder />
          </div>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: 0.5,
            ease: [0.25, 0.46, 0.45, 0.94]
          }}
        >
          <CeramicPillButton
            onClick={onGetStarted}
            showArrow
            ariaLabel="Comecar a usar Aica agora"
          >
            Comecar Agora
          </CeramicPillButton>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
      >
        <motion.div
          className="w-6 h-10 rounded-full border-2 border-ceramic-text-secondary/30 flex justify-center pt-2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="w-1.5 h-3 bg-ceramic-text-secondary/40 rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
}

export default DigitalHero;
