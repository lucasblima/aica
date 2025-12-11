/**
 * Pillar Card Component
 * Individual slide card displaying pillar information with visual styling
 *
 * Features:
 * - Gradient background matching pillar color
 * - Large icon display
 * - Headline and description
 * - Benefits list
 * - Example with description
 * - CTA button
 * - New badge
 * - Smooth animations
 * - Responsive design
 * - WCAG AAA compliant
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import type { Pillar } from '../../../../data/pillarData';

interface PillarCardProps {
  pillar: Pillar;
  isActive: boolean;
  onExplore: (pillar: Pillar) => void;
  onLearnMore: (pillar: Pillar) => void;
  index: number;
}

export const PillarCard: React.FC<PillarCardProps> = ({
  pillar,
  isActive,
  onExplore,
  onLearnMore,
  index,
}) => {
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: 'easeOut',
      },
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.3,
      },
    },
  };

  const iconVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.6,
        delay: 0.1,
        ease: 'easeOut',
      },
    },
  };

  const contentVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        delay: 0.2,
      },
    },
  };

  const listItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.4,
        delay: 0.3 + i * 0.1,
      },
    }),
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate={isActive ? 'visible' : 'hidden'}
      exit="exit"
      className="w-full"
    >
      {/* Card Container */}
      <div
        className="relative rounded-2xl overflow-hidden shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${pillar.gradientStart} 0%, ${pillar.gradientEnd} 100%)`,
        }}
      >
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black opacity-10" />

        {/* New Badge */}
        {pillar.isNew && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={isActive ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="absolute top-6 right-6 flex items-center gap-2 bg-white bg-opacity-95 px-3 py-1.5 rounded-full shadow-md"
          >
            <Sparkles size={16} className="text-amber-500" />
            <span className="text-sm font-semibold text-[#5C554B]">Novo</span>
          </motion.div>
        )}

        {/* Content */}
        <div className="relative p-8 md:p-12 space-y-8">
          {/* Icon Section */}
          <motion.div
            variants={iconVariants}
            className="flex justify-center pt-8"
          >
            <div className="text-white drop-shadow-lg">{pillar.icon}</div>
          </motion.div>

          {/* Text Content */}
          <motion.div variants={contentVariants} className="space-y-6">
            {/* Headline */}
            <div className="text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">
                {pillar.headline}
              </h2>
              <p className="text-lg md:text-xl text-white text-opacity-95">
                {pillar.description}
              </p>
            </div>

            {/* Benefits */}
            <motion.div className="space-y-3 max-w-lg mx-auto">
              {pillar.benefits.map((benefit, i) => (
                <motion.div
                  key={`benefit-${i}`}
                  variants={listItemVariants}
                  custom={i}
                  className="flex items-start gap-3"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white bg-opacity-30 flex items-center justify-center mt-1">
                    <svg
                      className="w-4 h-4 text-white"
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
                  <span className="text-white text-opacity-90 font-medium">
                    {benefit}
                  </span>
                </motion.div>
              ))}
            </motion.div>

            {/* Example Section */}
            <motion.div
              variants={contentVariants}
              className="bg-white bg-opacity-15 rounded-xl p-4 md:p-6 backdrop-blur-sm"
            >
              <p className="text-sm text-white text-opacity-75 font-semibold mb-2">
                EXEMPLO PRÁTICO
              </p>
              <p className="font-bold text-white mb-2">{pillar.example}</p>
              <p className="text-white text-opacity-80 text-sm">
                {pillar.exampleDescription}
              </p>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              variants={contentVariants}
              className="flex flex-col sm:flex-row gap-4 pt-4"
            >
              {/* Explore Button */}
              <button
                onClick={() => onExplore(pillar)}
                className="flex-1 bg-white hover:bg-gray-100 text-[#5C554B] font-bold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-300"
                aria-label={`Explore ${pillar.name}`}
              >
                {pillar.ctaLabel}
                <ArrowRight
                  size={18}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </button>

              {/* Learn More Button */}
              <button
                onClick={() => onLearnMore(pillar)}
                className="flex-1 border-2 border-white hover:bg-white hover:bg-opacity-10 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-300"
                aria-label={`Learn more about ${pillar.name}`}
              >
                Saber Mais
              </button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};
