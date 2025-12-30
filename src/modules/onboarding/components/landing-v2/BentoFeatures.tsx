import React from 'react';
import { motion } from 'framer-motion';
import { BentoCard } from './BentoCard';
import { PrivacyMockup, CeramicDesignMockup, SelfKnowledgeMockup } from './mockups';

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
            visual={<PrivacyMockup />}
            className="min-h-[300px] md:min-h-[420px]"
          />

          {/* Design Card - Wide Rectangle Top Right */}
          <BentoCard
            size="wide-rectangle"
            title="Design Ceramico"
            subtitle="Beleza que voce sente"
            gridArea="design"
            delay={0.1}
            visual={<CeramicDesignMockup />}
            className="min-h-[180px] md:min-h-[200px]"
          />

          {/* Knowledge Card - Wide Rectangle Bottom Right */}
          <BentoCard
            size="wide-rectangle"
            title="Autoconhecimento"
            subtitle="Entenda seus padroes"
            gridArea="knowledge"
            delay={0.2}
            visual={<SelfKnowledgeMockup />}
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


export default BentoFeatures;
