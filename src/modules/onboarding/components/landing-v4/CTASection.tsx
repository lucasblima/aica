import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Clock } from 'lucide-react';

/**
 * CTASection - "Criar Conta Grátis" com waitlist urgência
 *
 * Design Philosophy: Create FOMO and urgency without being pushy
 * Features: Countdown timer, social proof, clear value proposition
 */

interface CTASectionProps {
  onGetStarted: () => void;
}

export function CTASection({ onGetStarted }: CTASectionProps) {
  // Simulate limited spots countdown
  const [spotsLeft, setSpotsLeft] = useState(47);

  useEffect(() => {
    // Randomly decrease spots every 30-60 seconds to create urgency
    const interval = setInterval(() => {
      setSpotsLeft(prev => Math.max(10, prev - Math.floor(Math.random() * 3)));
    }, 45000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative bg-ceramic-base py-20 md:py-32 px-6 overflow-hidden">
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
          {/* Urgency Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 ceramic-inset rounded-full mb-6"
          >
            <Clock className="w-4 h-4 text-ceramic-accent" />
            <span className="text-sm font-bold text-ceramic-text-secondary">
              Apenas <span className="text-ceramic-accent">{spotsLeft}</span> vagas disponíveis hoje
            </span>
          </motion.div>

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
            Junte-se a milhares de pessoas que já estão transformando
            autoconhecimento em resultados concretos
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

          {/* Social Proof */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mt-10 pt-8 border-t border-ceramic-text-secondary/10"
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full ceramic-inset flex items-center justify-center text-xs font-bold text-ceramic-text-secondary border-2 border-ceramic-base"
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <span className="text-sm text-ceramic-text-secondary">
                +1.247 pessoas se cadastraram esta semana
              </span>
            </div>
            <div className="flex items-center justify-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.8 + i * 0.1 }}
                  className="text-2xl text-ceramic-accent"
                >
                  ★
                </motion.span>
              ))}
              <span className="ml-2 text-sm text-ceramic-text-secondary">
                4.9/5 baseado em 342 avaliações
              </span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
