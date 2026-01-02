import React from 'react';
import { motion } from 'framer-motion';

/**
 * HeroSection - "Conheça a si mesmo"
 *
 * Design Philosophy: Bold typography, clean layout, minimal distraction
 * Focus: Self-knowledge as the primary value proposition
 */

interface HeroSectionProps {
  onGetStarted: () => void;
}

export function HeroSection({ onGetStarted }: HeroSectionProps) {
  return (
    <section className="relative min-h-[90vh] bg-ceramic-base flex items-center justify-center px-6 py-20 overflow-hidden">
      {/* Background Pattern - Subtle ceramic texture */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-96 h-96 bg-ceramic-accent rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-ceramic-accent rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        {/* Logo/Brand */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-black text-ceramic-text-primary tracking-tight mb-2">
            AICA Life OS
          </h1>
          <p className="text-sm text-ceramic-text-secondary font-medium">
            Sistema operacional para sua vida
          </p>
        </motion.div>

        {/* Main Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-5xl md:text-7xl lg:text-8xl font-black text-ceramic-text-primary tracking-tight leading-[1.1] mb-8"
        >
          Conheça a<br />si mesmo
        </motion.h2>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-xl md:text-2xl text-ceramic-text-secondary max-w-3xl mx-auto mb-12 leading-relaxed font-light"
        >
          Transforme autoconhecimento em ação concreta. Registro estruturado,
          reflexões diárias e gamificação inteligente para evoluir continuamente.
        </motion.p>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <motion.button
            onClick={onGetStarted}
            className="
              px-12 py-5 rounded-full
              bg-ceramic-base text-ceramic-text-primary
              font-bold text-lg
              shadow-[8px_8px_16px_rgba(163,158,145,0.25),-8px_-8px_16px_rgba(255,255,255,0.95)]
              hover:shadow-[12px_12px_24px_rgba(163,158,145,0.30),-12px_-12px_24px_rgba(255,255,255,1)]
              hover:text-ceramic-accent
              transition-all duration-300
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ceramic-accent
            "
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Começar Agora
          </motion.button>

          <motion.button
            className="
              px-8 py-4 rounded-full
              text-ceramic-text-secondary
              font-semibold text-base
              hover:text-ceramic-text-primary
              transition-colors duration-200
            "
            whileHover={{ scale: 1.05 }}
          >
            Ver demonstração →
          </motion.button>
        </motion.div>

        {/* Trust Signal */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="text-sm text-ceramic-text-secondary mt-8"
        >
          Gratuito para começar. Sem cartão de crédito.
        </motion.p>
      </div>
    </section>
  );
}
