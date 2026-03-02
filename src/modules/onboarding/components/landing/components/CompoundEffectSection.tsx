import { motion } from 'framer-motion';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { COMPOUND_EXAMPLES, DOMAINS } from '../data/landingData';
import { ModuleNetwork } from './ModuleNetwork';

/** Map domain id to its short label for the example cards. */
const DOMAIN_LABEL: Record<string, string> = Object.fromEntries(
  DOMAINS.map((d) => [d.id, d.label])
);

/**
 * CompoundEffectSection — Network Diagram showing cross-module intelligence.
 *
 * Displays an animated SVG network of 7 interconnected modules plus
 * 3 example cards illustrating the compound effect of cross-module data.
 */
export function CompoundEffectSection() {
  const { ref: sectionRef, isInView } = useScrollReveal();

  return (
    <section className="py-16 sm:py-24 px-6 bg-ceramic-base">
      {/* Title block */}
      <motion.div
        ref={sectionRef}
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <h2 className="text-3xl md:text-4xl font-black text-center text-ceramic-text-primary">
          Quanto mais voce usa, mais inteligente o sistema fica
        </h2>
        <p className="text-lg text-ceramic-text-secondary text-center mt-4 max-w-2xl mx-auto">
          Dados que entram em um modulo enriquecem todos os outros. E o efeito
          composto.
        </p>
      </motion.div>

      {/* Network diagram */}
      <div className="mt-12">
        <ModuleNetwork isVisible={isInView} />
      </div>

      {/* Compound effect example cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-12">
        {COMPOUND_EXAMPLES.map((example, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{
              duration: 0.5,
              delay: 0.4 + i * 0.15,
              ease: 'easeOut',
            }}
            className="bg-[#F5E6D3]/30 rounded-xl p-6 border border-ceramic-border"
          >
            {/* Module indicator dots */}
            <div className="flex items-center gap-2 mb-3">
              {example.modules.map((moduleId) => (
                <span
                  key={moduleId}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-ceramic-accent/10 text-ceramic-accent text-[10px] font-bold"
                  title={DOMAIN_LABEL[moduleId] ?? moduleId}
                >
                  {(moduleId[0] ?? '').toUpperCase()}
                </span>
              ))}
            </div>

            {/* Example text */}
            <p className="text-sm text-ceramic-text-primary leading-relaxed">
              {example.text}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
