import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface BentoCardDenseProps {
  title: string;
  description: string;
  icon: LucideIcon;
  gradient?: string;
  delay?: number;
  className?: string;
}

/**
 * BentoCardDense - High-Density Bento Card
 *
 * Features giant background icon for texture and visual weight.
 * Apple-level density with content anchored top-left.
 */
export function BentoCardDense({
  title,
  description,
  icon: Icon,
  gradient = 'from-ceramic-100 to-ceramic-200',
  delay = 0,
  className = '',
}: BentoCardDenseProps) {
  return (
    <motion.div
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-6 md:p-8 h-64 ${className}`}
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={{ scale: 1.02, y: -4 }}
    >
      {/* Giant Background Icon - The Density */}
      <Icon
        className="absolute -bottom-8 -right-8 w-40 h-40 text-ceramic-text-primary opacity-[0.08]"
        strokeWidth={1}
        aria-hidden="true"
      />

      {/* Content - Anchored top-left */}
      <div className="relative z-10 flex flex-col h-full">
        <h3 className="text-2xl md:text-3xl font-black text-ceramic-text-primary tracking-tight mb-2">
          {title}
        </h3>
        <p className="text-sm md:text-base text-ceramic-text-secondary max-w-xs">
          {description}
        </p>
      </div>
    </motion.div>
  );
}
