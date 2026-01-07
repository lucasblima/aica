import React from 'react';
import { motion } from 'framer-motion';
import { CeramicPillButton } from '../../../../components/ui/CeramicPillButton';

interface CTASectionProps {
  onGetStarted: () => void;
}

/**
 * CTASection - Final Call-to-Action
 *
 * Large-scale typography with compelling messaging.
 * Positioned before footer to capture conversion intent.
 */
export function CTASection({ onGetStarted }: CTASectionProps) {
  return (
    <section className="bg-ceramic-base py-20 md:py-32 px-6 md:px-8">
      <motion.div
        className="max-w-[900px] mx-auto text-center"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-4xl md:text-6xl font-black text-ceramic-text-primary tracking-tighter mb-6">
          Comece sua jornada hoje
        </h2>
        <p className="text-lg md:text-xl text-ceramic-text-secondary mb-10 max-w-2xl mx-auto">
          Junte-se a quem já está transformando autoconhecimento em ação concreta.
        </p>

        <CeramicPillButton
          onClick={onGetStarted}
          showArrow
          ariaLabel="Criar conta grátis"
        >
          Criar Conta Grátis
        </CeramicPillButton>

        <p className="text-sm text-ceramic-text-secondary mt-6">
          Sem cartão de crédito. Comece em segundos.
        </p>
      </motion.div>
    </section>
  );
}
