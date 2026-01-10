import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';

/**
 * CTASection - "Criar Conta Grátis"
 *
 * Design Philosophy: Honest, direct call-to-action
 * Features: Clear value proposition without fake urgency
 */

interface CTASectionProps {
  onGetStarted: () => void;
}

export function CTASection({ onGetStarted }: CTASectionProps) {
  return (
    <section
      data-testid="landing-cta"
      className="relative bg-ceramic-base py-20 md:py-32 px-6 overflow-hidden"
    >
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-ceramic-accent/10 via-transparent to-ceramic-accent/10" />

      {/* Floating elements */}
      <div className="absolute top-10 left-10 w-64 h-64 bg-ceramic-accent/5 rounded-full blur-3xl" />
      <div className="absolute bottom-10 right-10 w-64 h-64 bg-ceramic-accent/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="ceramic-card p-10 md:p-16 rounded-3xl text-center"
        >
          {/* Main Headline */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-4xl md:text-5xl lg:text-6xl font-black text-ceramic-text-primary tracking-tight leading-tight mb-6"
          >
            Transforme sua vida.<br />
            Comece hoje.
          </motion.h2>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-xl text-ceramic-text-secondary mb-10 max-w-2xl mx-auto font-light"
          >
            Comece sua jornada de autoconhecimento estruturado hoje
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8"
          >
            <motion.button
              onClick={onGetStarted}
              className="
                group
                px-12 py-6 rounded-full
                bg-gradient-to-r from-ceramic-accent to-ceramic-accent/90
                text-white
                font-bold text-lg
                shadow-[8px_8px_16px_rgba(163,158,145,0.25)]
                hover:shadow-[12px_12px_24px_rgba(163,158,145,0.30)]
                transition-all duration-300
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ceramic-accent
                flex items-center gap-2
              "
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Sparkles className="w-5 h-5" />
              Criar Conta Grátis
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </motion.div>

          {/* Trust Signals */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="space-y-2"
          >
            <p className="text-sm text-ceramic-text-secondary">
              ✓ Sem cartão de crédito • ✓ Cancele a qualquer momento • ✓ Dados 100% privados
            </p>
            <p className="text-xs text-ceramic-text-secondary/70">
              Conforme LGPD/GDPR
            </p>
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
}
