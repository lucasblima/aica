import React from 'react';
import { motion } from 'framer-motion';

/**
 * SocialProof - Logos de universidades e empresas
 *
 * Design Philosophy: Subtle, elegant display of social proof
 * Features: Grayscale logos with hover effects, responsive grid
 */

interface Institution {
  name: string;
}

const institutions: Institution[] = [
  { name: 'Evolution Hub' },
  { name: 'Estúdio Pedra do Sal' },
  { name: 'Uai, Ana!' },
];

export function SocialProof() {
  return (
    <section className="bg-ceramic-base py-16 md:py-24 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="text-lg font-bold text-ceramic-text-secondary uppercase tracking-wider">
            Confiado por
          </p>
        </motion.div>

        {/* Logos Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-8 items-center justify-items-center max-w-4xl mx-auto"
        >
          {institutions.map((institution, index) => (
            <motion.div
              key={institution.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.1 }}
              className="group"
            >
              {/* Logo Placeholder - Replace with actual logos */}
              <div className="
                w-32 h-20
                ceramic-inset
                flex items-center justify-center
                rounded-lg
                transition-all duration-300
                group-hover:shadow-[4px_4px_8px_rgba(163,158,145,0.15),-4px_-4px_8px_rgba(255,255,255,0.85)]
              ">
                <span className="
                  text-ceramic-text-secondary
                  font-bold
                  text-sm
                  tracking-tight
                  group-hover:text-ceramic-text-primary
                  transition-colors duration-300
                ">
                  {institution.name}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
