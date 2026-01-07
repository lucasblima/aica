import React from 'react';
import { motion } from 'framer-motion';
import { PhoneMockup } from './PhoneMockup';
import { CeramicPillButton } from '@/components/ui/CeramicPillButton';
import { staggerContainer, staggerItem } from '../../../../lib/animations/ceramic-motion';

interface HeroMonolithProps {
  onGetStarted: () => void;
}

/**
 * HeroMonolith - The Massive Hero Section
 *
 * Apple-level scale with bleeding phone mockup and massive typography.
 * Key principle: Digital Ceramic demands attention through physical presence.
 */
export function HeroMonolith({ onGetStarted }: HeroMonolithProps) {
  return (
    <section className="relative min-h-screen bg-ceramic-base flex flex-col items-center justify-center px-6 py-16 md:py-24 overflow-hidden">
      {/* Subtle radial gradient background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center top, rgba(217, 119, 6, 0.04) 0%, transparent 70%)'
        }}
      />

      <motion.div
        className="max-w-[1600px] w-full mx-auto flex flex-col items-center text-center relative z-10"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Headline - MASSIVE */}
        <motion.h1
          variants={staggerItem}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black text-ceramic-text-primary tracking-tighter leading-[0.9] mb-3 md:mb-4"
        >
          Conheça a si mesmo
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          variants={staggerItem}
          className="text-lg sm:text-xl md:text-2xl text-ceramic-text-secondary font-normal max-w-2xl mb-10 md:mb-12"
        >
          O sistema operacional para sua vida. Privado, tangível, transformador.
        </motion.p>

        {/* Phone Mockup - BLEEDING OUT */}
        <motion.div
          variants={staggerItem}
          className="w-[85vw] md:w-[50vw] lg:w-[35vw] -mb-20 md:-mb-32 lg:-mb-40"
        >
          <PhoneMockup />
        </motion.div>

        {/* CTA - Positioned after phone bleed */}
        <motion.div
          variants={staggerItem}
          className="mt-24 md:mt-32 lg:mt-40"
        >
          <CeramicPillButton
            onClick={onGetStarted}
            showArrow
            ariaLabel="Começar a usar Aica agora"
          >
            Começar Agora
          </CeramicPillButton>
        </motion.div>
      </motion.div>
    </section>
  );
}
