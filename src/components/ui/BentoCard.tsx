import React from 'react';
import { motion } from 'framer-motion';

type BentoSize = 'large-square' | 'wide-rectangle';

interface BentoCardProps {
  /** Card size variant */
  size: BentoSize;
  /** Card title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Visual content (icon, image, or custom component) */
  visual: React.ReactNode;
  /** Grid area name for CSS Grid placement */
  gridArea?: string;
  /** Additional className */
  className?: string;
  /** Animation delay for stagger effect */
  delay?: number;
}

/**
 * BentoCard Component
 *
 * Individual card for the Bento Grid layout.
 * Follows the Digital Ceramic aesthetic with:
 * - bg-white/50 translucent background
 * - rounded-[40px] border radius
 * - Subtle elevation shadow
 * - Hover scale effect
 *
 * Size variants:
 * - large-square: Takes 2x2 grid cells (for Privacy card)
 * - wide-rectangle: Takes 2x1 grid cells (for Design and Knowledge cards)
 */
export function BentoCard({
  size,
  title,
  subtitle,
  visual,
  gridArea,
  className = '',
  delay = 0,
}: BentoCardProps) {
  const sizeStyles: Record<BentoSize, string> = {
    'large-square': 'aspect-square md:aspect-auto',
    'wide-rectangle': 'aspect-video md:aspect-auto',
  };

  return (
    <motion.div
      className={`
        relative overflow-hidden
        bg-white/50 backdrop-blur-sm
        rounded-[32px] md:rounded-[40px]
        p-6 md:p-8
        shadow-bento hover:shadow-bento-hover
        transition-shadow duration-300
        ${sizeStyles[size]}
        ${className}
      `}
      style={{ gridArea }}
      initial={{ opacity: 0, y: 30, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={{ scale: 1.02, y: -4 }}
    >
      {/* Visual Container */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        {visual}
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 h-full flex flex-col justify-end">
        <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-ceramic-text-primary mb-1">
          {title}
        </h3>
        {subtitle && (
          <p className="text-sm md:text-base text-ceramic-text-secondary">
            {subtitle}
          </p>
        )}
      </div>

      {/* Subtle gradient overlay for text readability */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(240, 239, 233, 0.9) 0%, rgba(240, 239, 233, 0.3) 40%, transparent 70%)'
        }}
      />
    </motion.div>
  );
}

export default BentoCard;
