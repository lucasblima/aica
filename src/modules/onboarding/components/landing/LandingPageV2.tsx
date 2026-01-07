import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DigitalHero } from './DigitalHero';
import { BentoFeatures } from './BentoFeatures';
import { ScrollStory } from './ScrollStory';
import { MinimalFooter } from './MinimalFooter';
import { AuthSheet } from '../../../../components/AuthSheet';

/**
 * LandingPageV2 - Digital Ceramic Redesign
 *
 * Operation "Digital Desire" - Apple-inspired landing page following
 * the "Digital Ceramic" aesthetic. The product is the hero.
 *
 * Structure:
 * 1. DigitalHero - The Reveal (massive mockup, bold typography)
 * 2. BentoFeatures - CSS Grid bento box layout
 * 3. ScrollStory - Zig-zag narrative with scroll animations
 * 4. MinimalFooter - Grounded, minimalist footer
 *
 * Features:
 * - Fully responsive (mobile-first)
 * - WCAG AA accessible
 * - Smooth scroll-triggered animations
 * - iOS-style auth sheet integration
 */
export function LandingPageV2() {
  const [showLogin, setShowLogin] = useState(false);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Handle CTA clicks - open auth sheet
  const handleGetStarted = () => {
    setShowLogin(true);
  };

  return (
    <div className="min-h-screen bg-ceramic-base font-sans text-ceramic-text-primary">
      {/* SEO Meta Tags (would be handled by Helmet in production) */}
      <meta name="description" content="Aica - O sistema operacional para sua vida. Conheca a si mesmo atraves de registro estruturado, reflexoes diarias e gamificacao personalizada." />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="theme-color" content="#F0EFE9" />

      {/* Main Content */}
      <main>
        {/* Phase 1: The Hero - "The Reveal" */}
        <DigitalHero onGetStarted={handleGetStarted} />

        {/* Phase 2: Bento Grid Features */}
        <BentoFeatures />

        {/* Phase 3: Scroll Story - "How it Works" reimagined */}
        <ScrollStory />

        {/* Final CTA Section */}
        <FinalCTA onGetStarted={handleGetStarted} />
      </main>

      {/* Phase 4: Minimal Footer */}
      <MinimalFooter onGetStarted={handleGetStarted} />

      {/* Skip to main content link (accessibility) */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-ceramic-accent focus:text-white focus:rounded"
      >
        Pular para conteudo principal
      </a>

      {/* Auth Sheet - iOS-style bottom sheet */}
      <AuthSheet
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
      />
    </div>
  );
}

/**
 * Final CTA Section
 * Simple, compelling call-to-action before the footer
 */
function FinalCTA({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section className="bg-ceramic-base py-20 md:py-32 px-6 md:px-8">
      <motion.div
        className="max-w-[800px] mx-auto text-center"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-ceramic-text-primary tracking-tight mb-6">
          Comece sua jornada hoje
        </h2>
        <p className="text-lg md:text-xl text-ceramic-text-secondary mb-10 max-w-xl mx-auto">
          Junte-se a quem ja esta transformando autoconhecimento em acao concreta.
        </p>

        <motion.button
          onClick={onGetStarted}
          className="
            inline-flex items-center justify-center gap-2
            px-10 py-5 rounded-full
            bg-ceramic-base text-ceramic-text-primary
            font-semibold text-lg
            shadow-[6px_6px_12px_rgba(163,158,145,0.20),-6px_-6px_12px_rgba(255,255,255,0.90)]
            hover:shadow-[8px_8px_16px_rgba(163,158,145,0.25),-8px_-8px_16px_rgba(255,255,255,0.95)]
            hover:text-ceramic-accent
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ceramic-accent
          "
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          Criar Conta Gratis
          <motion.span
            initial={{ x: 0 }}
            whileHover={{ x: 4 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            →
          </motion.span>
        </motion.button>

        <p className="text-sm text-ceramic-text-secondary mt-6">
          Sem cartao de credito. Comece em segundos.
        </p>
      </motion.div>
    </section>
  );
}

export default LandingPageV2;
