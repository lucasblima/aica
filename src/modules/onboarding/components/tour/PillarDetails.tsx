/**
 * Pillar Details Modal
 * Expanded view with more detailed information about a pillar
 *
 * Features:
 * - Modal overlay with backdrop
 * - Detailed content about the pillar
 * - Links to documentation
 * - CTA to start using the pillar
 * - Close button and ESC key handling
 * - Smooth animations
 * - WCAG AAA compliant
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Play } from 'lucide-react';
import type { Pillar } from '../../../../data/pillarData';

interface PillarDetailsProps {
  pillar: Pillar | null;
  isOpen: boolean;
  onClose: () => void;
  onStart: (pillar: Pillar) => void;
}

export const PillarDetails: React.FC<PillarDetailsProps> = ({
  pillar,
  isOpen,
  onClose,
  onStart,
}) => {
  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: 20,
      transition: {
        duration: 0.2,
      },
    },
  };

  if (!pillar) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`pillar-title-${pillar.id}`}
          >
            <div
              className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden bg-white max-h-[90vh] overflow-y-auto"
              role="document"
            >
              {/* Header */}
              <div
                className="relative px-6 md:px-8 py-6 md:py-8"
                style={{
                  background: `linear-gradient(135deg, ${pillar.gradientStart} 0%, ${pillar.gradientEnd} 100%)`,
                }}
              >
                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  aria-label="Close modal"
                  title="Fechar (ESC)"
                >
                  <X size={24} className="text-white" />
                </button>

                {/* Icon */}
                <div className="mb-4 text-white">{pillar.icon}</div>

                {/* Title */}
                <h2
                  id={`pillar-title-${pillar.id}`}
                  className="text-4xl font-bold text-white mb-2"
                >
                  {pillar.name}
                </h2>
                <p className="text-white text-opacity-90 text-lg">
                  {pillar.description}
                </p>
              </div>

              {/* Content */}
              <div className="px-6 md:px-8 py-8 space-y-8">
                {/* Benefits Section */}
                <section>
                  <h3 className="text-2xl font-bold text-[#5C554B] mb-6">
                    Benefícios Principais
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pillar.benefits.map((benefit, index) => (
                      <motion.div
                        key={`detail-benefit-${index}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-3 p-4 rounded-lg bg-gray-50"
                      >
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                          <svg
                            className="w-4 h-4 text-blue-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <span className="font-medium text-[#5C554B]">
                          {benefit}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </section>

                {/* Example Section */}
                <section>
                  <h3 className="text-2xl font-bold text-[#5C554B] mb-4">
                    Caso de Uso
                  </h3>
                  <div className="p-6 rounded-xl bg-blue-50 border-2 border-blue-100">
                    <p className="font-bold text-[#5C554B] mb-2 text-lg">
                      {pillar.example}
                    </p>
                    <p className="text-gray-700">{pillar.exampleDescription}</p>
                  </div>
                </section>

                {/* Features Section */}
                <section>
                  <h3 className="text-2xl font-bold text-[#5C554B] mb-4">
                    Recursos Disponíveis
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Explore toda a funcionalidade completa do {pillar.name} com
                    nossa documentação interativa e tutoriais passo a passo.
                  </p>
                  <a
                    href={pillar.documentationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold group"
                  >
                    Guia Completo
                    <ExternalLink
                      size={18}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </a>
                </section>

                {/* CTA Section */}
                <section className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button
                    onClick={() => {
                      onStart(pillar);
                      onClose();
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                    aria-label={`Start using ${pillar.name}`}
                  >
                    <Play size={18} />
                    Começar Agora
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 border-2 border-gray-300 hover:bg-gray-50 text-[#5C554B] font-bold py-3 px-6 rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                  >
                    Voltar
                  </button>
                </section>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
