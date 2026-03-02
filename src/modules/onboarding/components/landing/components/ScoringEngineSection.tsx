import { useState } from 'react';
import { motion } from 'framer-motion';
import { DOMAINS, SCORING_MODELS } from '../data/landingData';
import type { ScoringModel } from '../data/landingData';
import { DomainCard } from './DomainCard';
import { SpiralDetectionVisual } from './SpiralDetectionVisual';
import { useScrollReveal } from '../hooks/useScrollReveal';

/** Map domain id to the primary scoring model id for that domain. */
const DOMAIN_TO_MODEL: Record<string, string> = {
  atlas: 'cognitive_load',
  journey: 'perma_profiler',
  connections: 'dunbar_layers',
  finance: 'finhealth_score',
  grants: 'researcher_strength',
  studio: 'guest_scoring',
  flux: 'ctl_atl_tsb',
};

/**
 * ScoringEngineSection -- 7 Domains + Scoring Explainer.
 *
 * Displays a grid of 7 expandable DomainCards (one per AICA module)
 * with scientific scoring model details, plus a SpiralDetectionVisual
 * showing cross-domain negative spiral detection.
 */
export function ScoringEngineSection() {
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const { ref: titleRef, isInView: titleInView } = useScrollReveal();

  function handleToggle(domainId: string) {
    setExpandedDomain((prev) => (prev === domainId ? null : domainId));
  }

  function getScoringModel(domainId: string): ScoringModel | undefined {
    const modelId = DOMAIN_TO_MODEL[domainId];
    if (!modelId) return undefined;
    return SCORING_MODELS.find((m) => m.id === modelId) as ScoringModel | undefined;
  }

  return (
    <section className="py-16 sm:py-24 px-6 bg-ceramic-base">
      {/* Title block */}
      <motion.div
        ref={titleRef}
        initial={{ opacity: 0, y: 20 }}
        animate={titleInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <h2 className="text-3xl md:text-4xl font-black text-center text-ceramic-text-primary">
          7 dominios. 18+ modelos cientificos. Um Life Score.
        </h2>
        <p className="text-lg text-ceramic-text-secondary text-center mt-4 max-w-2xl mx-auto">
          Cada pontuacao tem uma metodologia transparente. Voce sempre sabe como
          e calculado.
        </p>
      </motion.div>

      {/* Domain cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mt-12">
        {DOMAINS.map((domain, index) => (
          <DomainCard
            key={domain.id}
            domain={domain}
            scoringModel={getScoringModel(domain.id)}
            isExpanded={expandedDomain === domain.id}
            onToggle={() => handleToggle(domain.id)}
            delay={index * 100}
          />
        ))}
      </div>

      {/* Spiral detection visual */}
      <SpiralDetectionVisual />
    </section>
  );
}
