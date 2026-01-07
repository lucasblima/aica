import React from 'react';
import { motion } from 'framer-motion';
import { useScrollReveal } from './hooks/useScrollReveal';

interface ScrollStorySectionProps {
  /** Section title (e.g., "Fale.") */
  title: string;
  /** Section description */
  description: string;
  /** Visual content (image or placeholder component) */
  visual: React.ReactNode;
  /** Index for alternating layout (even = text left, odd = text right) */
  index: number;
  /** Additional className */
  className?: string;
}

/**
 * ScrollStorySection Component
 *
 * Individual section for the zig-zag scroll narrative.
 * Uses Intersection Observer for scroll-triggered fade-in animations.
 *
 * Layout alternates based on index:
 * - Even index: Text Left / Image Right
 * - Odd index: Image Left / Text Right
 *
 * Design spec:
 * - Large, bold title (text-3xl md:text-5xl)
 * - Descriptive text below
 * - Image with ceramic shadow
 * - Fade-in animation on scroll
 */
export function ScrollStorySection({
  title,
  description,
  visual,
  index,
  className = '',
}: ScrollStorySectionProps) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({
    threshold: 0.2,
    rootMargin: '-50px',
  });

  const isReversed = index % 2 === 1;

  return (
    <section
      ref={ref}
      className={`py-16 md:py-24 px-6 md:px-8 ${className}`}
    >
      <div className="max-w-[1200px] mx-auto">
        <div
          className={`
            flex flex-col gap-8 md:gap-12
            ${isReversed ? 'md:flex-row-reverse' : 'md:flex-row'}
            items-center
          `}
        >
          {/* Text Content */}
          <motion.div
            className="flex-1 text-center md:text-left"
            initial={{ opacity: 0, x: isReversed ? 30 : -30 }}
            animate={isVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: isReversed ? 30 : -30 }}
            transition={{
              duration: 0.6,
              ease: [0.25, 0.46, 0.45, 0.94]
            }}
          >
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-ceramic-text-primary tracking-tight mb-4">
              {title}
            </h3>
            <p className="text-lg md:text-xl text-ceramic-text-secondary leading-relaxed max-w-md mx-auto md:mx-0">
              {description}
            </p>
          </motion.div>

          {/* Visual Content */}
          <motion.div
            className="flex-1 flex justify-center"
            initial={{ opacity: 0, x: isReversed ? -30 : 30, scale: 0.95 }}
            animate={isVisible ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: isReversed ? -30 : 30, scale: 0.95 }}
            transition={{
              duration: 0.6,
              delay: 0.15,
              ease: [0.25, 0.46, 0.45, 0.94]
            }}
          >
            <div
              className="rounded-2xl md:rounded-3xl overflow-hidden"
              style={{
                boxShadow: `
                  8px 8px 20px rgba(163, 158, 145, 0.20),
                  -8px -8px 20px rgba(255, 255, 255, 0.90)
                `
              }}
            >
              {visual}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default ScrollStorySection;
