import React from 'react';
import { motion } from 'framer-motion';

interface FeatureStripProps {
  title: string;
  description: string;
  visual: React.ReactNode;
  reverse?: boolean;
  index: number;
}

/**
 * FeatureStrip - 50/50 Feature Showcase
 *
 * Alternating layout strips for "Fale, Reflita, Evolua" narrative.
 * Ceramic surface/pedestal highlights UI elements.
 */
export function FeatureStrip({
  title,
  description,
  visual,
  reverse = false,
  index
}: FeatureStripProps) {
  return (
    <section className="bg-ceramic-base py-16 md:py-24 px-6 md:px-8">
      <div className="max-w-[1400px] mx-auto">
        <div className={`grid md:grid-cols-2 gap-8 md:gap-12 items-center ${reverse ? 'md:flex-row-reverse' : ''}`}>
          {/* Text Content */}
          <motion.div
            className={reverse ? 'md:order-2' : 'md:order-1'}
            initial={{ opacity: 0, x: reverse ? 40 : -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2 className="text-4xl md:text-5xl font-black text-ceramic-text-primary tracking-tighter mb-4">
              {title}
            </h2>
            <p className="text-lg md:text-xl text-ceramic-text-secondary leading-relaxed">
              {description}
            </p>
          </motion.div>

          {/* Visual Element - Ceramic Pedestal */}
          <motion.div
            className={reverse ? 'md:order-1' : 'md:order-2'}
            initial={{ opacity: 0, x: reverse ? -40 : 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="ceramic-card p-8 md:p-12 rounded-3xl">
              {visual}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
