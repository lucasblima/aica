import { motion } from 'framer-motion';
import { Check, CreditCard, Shield } from 'lucide-react';
import { PRICING_TIERS } from '../data/landingData';
import { useScrollReveal } from '../hooks/useScrollReveal';

const BASE_CREDITS = 500;

export function PricingSection() {
  const { ref, isInView } = useScrollReveal();

  return (
    <section className="py-24 px-6 bg-ceramic-base">
      <div ref={ref}>
        <h2 className="text-3xl md:text-4xl font-black text-center text-ceramic-text-primary">
          Planos que crescem com você
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-12">
          {PRICING_TIERS.map((tier, index) => {
            const multiplier = tier.credits / BASE_CREDITS;

            return (
              <motion.div
                key={tier.name}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.4, delay: index * 0.2 }}
                whileHover={{ y: -4 }}
                className={`bg-ceramic-base rounded-2xl p-8 relative ${
                  tier.highlighted
                    ? 'shadow-ceramic-elevated border-2 border-ceramic-accent shadow-[0_0_30px_rgba(217,119,6,0.15)]'
                    : 'shadow-ceramic-emboss'
                }`}
              >
                {tier.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-ceramic-accent text-white px-4 py-1 rounded-full text-sm font-medium">
                    Popular
                  </span>
                )}

                <p className="text-xl font-bold text-ceramic-text-primary">{tier.name}</p>

                <div className="mt-4">
                  {tier.price === 0 ? (
                    <span className="text-4xl font-black text-ceramic-text-primary">Grátis</span>
                  ) : (
                    <>
                      <span className="text-4xl font-black text-ceramic-text-primary">
                        R$ {tier.price}
                      </span>
                      <span className="text-sm text-ceramic-text-secondary">/mês</span>
                    </>
                  )}
                </div>

                <p className="text-sm text-ceramic-text-secondary mt-2">
                  {tier.credits.toLocaleString('pt-BR')} créditos/mês
                  {tier.highlighted && multiplier > 1 && (
                    <span className="ml-1 font-medium">({multiplier}x)</span>
                  )}
                </p>

                <hr className="border-ceramic-border my-6" />

                <ul className="space-y-3">
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 text-sm text-ceramic-text-primary"
                    >
                      <Check className="w-4 h-4 text-ceramic-success flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  className={
                    tier.highlighted
                      ? 'bg-ceramic-accent hover:bg-ceramic-accent-dark text-white rounded-xl px-6 py-3 w-full font-semibold mt-8 transition-colors'
                      : 'border-2 border-ceramic-accent text-ceramic-accent hover:bg-ceramic-accent hover:text-white rounded-xl px-6 py-3 w-full font-semibold mt-8 transition-colors'
                  }
                >
                  {tier.cta}
                </button>
              </motion.div>
            );
          })}
        </div>

        <p className="text-sm text-ceramic-text-secondary text-center mt-8">
          1 crédito = 1 análise rápida. Créditos maiores para relatórios e deep analysis.
        </p>

        <div className="flex items-center justify-center gap-4 mt-4">
          <span className="flex items-center gap-1 text-xs text-ceramic-text-secondary">
            <CreditCard className="w-3 h-3" />
            PIX
          </span>
          <span className="text-xs text-ceramic-text-secondary">Cartão</span>
          <span className="flex items-center gap-1 text-xs text-ceramic-text-secondary">
            <Shield className="w-3 h-3" />
            Pagamento seguro
          </span>
        </div>
      </div>
    </section>
  );
}
