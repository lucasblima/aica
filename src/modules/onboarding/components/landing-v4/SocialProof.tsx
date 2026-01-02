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
  type: 'university' | 'company';
}

const institutions: Institution[] = [
  { name: 'USP', type: 'university' },
  { name: 'Unicamp', type: 'university' },
  { name: 'FGV', type: 'university' },
  { name: 'Insper', type: 'university' },
  { name: 'Stanford', type: 'university' },
  { name: 'Google', type: 'company' },
  { name: 'Microsoft', type: 'company' },
  { name: 'Amazon', type: 'company' },
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
          <p className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
            Confiado por
          </p>
          <h3 className="text-2xl md:text-3xl font-black text-ceramic-text-primary">
            Profissionais de instituições líderes
          </h3>
        </motion.div>

        {/* Logos Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-8 items-center justify-items-center"
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

        {/* Testimonial Quote */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 max-w-3xl mx-auto text-center"
        >
          <blockquote className="ceramic-card p-8 rounded-2xl">
            <p className="text-lg md:text-xl text-ceramic-text-primary font-light italic mb-4">
              "Uma ferramenta essencial para quem busca autoconhecimento estruturado.
              Transformou completamente minha rotina de reflexão."
            </p>
            <footer className="text-sm text-ceramic-text-secondary font-medium">
              — Profissional USP
            </footer>
          </blockquote>
        </motion.div>
      </div>
    </section>
  );
}
