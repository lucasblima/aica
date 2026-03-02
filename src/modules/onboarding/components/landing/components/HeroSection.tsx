import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LifeScoreRadar } from './LifeScoreRadar';
import { DOMAINS } from '../data/landingData';

interface HeroSectionProps {
  onOpenLogin?: () => void;
}

/**
 * HeroSection -- Fullscreen split-layout hero.
 *
 * Left: headline, subtitle, CTA button.
 * Right: animated Life Score radar chart.
 * Mobile: stacks column-reverse (radar on top, text below).
 */
export function HeroSection({ onOpenLogin }: HeroSectionProps) {
  const [radarVisible, setRadarVisible] = useState(false);

  // Trigger radar animation after a short delay to let the page paint first
  useEffect(() => {
    const timer = setTimeout(() => setRadarVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Map the DOMAINS readonly array to a mutable shape for LifeScoreRadar
  const radarDomains = DOMAINS.map((d) => ({
    id: d.id,
    label: d.label,
    demoScore: d.demoScore,
  }));

  return (
    <section className="min-h-screen bg-ceramic-base flex items-center justify-center px-4 sm:px-6 pt-20 pb-12">
      <div className="w-full max-w-7xl mx-auto flex flex-col-reverse lg:flex-row items-center gap-12 lg:gap-16">
        {/* ── Left: Text content ── */}
        <motion.div
          className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-ceramic-text-primary leading-tight">
            Meca, entenda e transforme cada area da sua vida
          </h1>

          <p className="text-lg md:text-xl text-ceramic-text-secondary max-w-lg mt-6">
            O AICA integra 18+ modelos cientificos validados em um sistema que conecta
            produtividade, bem-estar, financas, relacionamentos e mais — para que voce
            veja o todo, nao pedacos.
          </p>

          <button
            onClick={onOpenLogin}
            className="bg-ceramic-accent hover:bg-ceramic-accent-dark text-white rounded-xl px-8 py-4 text-lg font-semibold mt-8 transition-colors"
          >
            Comecar gratuitamente
          </button>

          <p className="text-sm text-ceramic-text-secondary mt-3">
            Sem cartao. 500 creditos gratis.
          </p>
        </motion.div>

        {/* ── Right: Life Score Radar ── */}
        <motion.div
          className="flex-1 flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
        >
          <LifeScoreRadar domains={radarDomains} isVisible={radarVisible} />
        </motion.div>
      </div>
    </section>
  );
}
