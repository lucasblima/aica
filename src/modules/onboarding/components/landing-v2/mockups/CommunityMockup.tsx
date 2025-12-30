import React from 'react';
import { motion } from 'framer-motion';
import { Award } from 'lucide-react';

interface CommunityMockupProps {
  className?: string;
}

/**
 * CommunityMockup Component
 *
 * Represents community connections and shared growth.
 * Features:
 * - Central avatar (larger)
 * - 4 surrounding avatars (smaller) connected by SVG lines
 * - Achievement badge (trophy)
 * - Green color scheme
 *
 * Aspect Ratio: 4:3 (BentoCard)
 */
export function CommunityMockup({ className = '' }: CommunityMockupProps) {
  // Avatar colors for diversity
  const avatarColors = [
    'linear-gradient(135deg, #10B981 0%, #059669 100%)', // Green
    'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', // Blue
    'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', // Amber
    'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)', // Pink
  ];

  return (
    <motion.div
      className={`relative w-full h-full flex items-center justify-center ${className}`}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)',
        }}
      />

      {/* SVG Connection Lines */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 200 200"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Lines from center to surrounding avatars */}
        <motion.line
          x1="100"
          y1="100"
          x2="50"
          y2="50"
          stroke="#10B981"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 0.4 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
        <motion.line
          x1="100"
          y1="100"
          x2="150"
          y2="50"
          stroke="#10B981"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 0.4 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
        />
        <motion.line
          x1="100"
          y1="100"
          x2="50"
          y2="150"
          stroke="#10B981"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 0.4 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
        />
        <motion.line
          x1="100"
          y1="100"
          x2="150"
          y2="150"
          stroke="#10B981"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 0.4 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5 }}
        />
      </svg>

      {/* Central Avatar - Larger */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        initial={{ scale: 0, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1, duration: 0.5, type: 'spring', stiffness: 200 }}
      >
        <div
          className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-white font-bold text-lg md:text-xl"
          style={{
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            boxShadow: `
              4px 4px 12px rgba(163, 158, 145, 0.25),
              -2px -2px 8px rgba(255, 255, 255, 0.9)
            `,
          }}
        >
          VC
        </div>
      </motion.div>

      {/* Surrounding Avatars - Top Left */}
      <motion.div
        className="absolute top-[15%] left-[15%]"
        initial={{ scale: 0, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2, duration: 0.4, type: 'spring' }}
        animate={{
          y: [0, -4, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div
          className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm"
          style={{
            background: avatarColors[0],
            boxShadow: `2px 2px 6px rgba(163, 158, 145, 0.2)`,
          }}
        >
          A1
        </div>
      </motion.div>

      {/* Top Right */}
      <motion.div
        className="absolute top-[15%] right-[15%]"
        initial={{ scale: 0, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3, duration: 0.4, type: 'spring' }}
        animate={{
          y: [0, 4, 0],
        }}
        transition={{
          duration: 2.2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div
          className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm"
          style={{
            background: avatarColors[1],
            boxShadow: `2px 2px 6px rgba(163, 158, 145, 0.2)`,
          }}
        >
          A2
        </div>
      </motion.div>

      {/* Bottom Left */}
      <motion.div
        className="absolute bottom-[15%] left-[15%]"
        initial={{ scale: 0, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4, duration: 0.4, type: 'spring' }}
        animate={{
          y: [0, 4, 0],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div
          className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm"
          style={{
            background: avatarColors[2],
            boxShadow: `2px 2px 6px rgba(163, 158, 145, 0.2)`,
          }}
        >
          A3
        </div>
      </motion.div>

      {/* Bottom Right */}
      <motion.div
        className="absolute bottom-[15%] right-[15%]"
        initial={{ scale: 0, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5, duration: 0.4, type: 'spring' }}
        animate={{
          y: [0, -4, 0],
        }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div
          className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm"
          style={{
            background: avatarColors[3],
            boxShadow: `2px 2px 6px rgba(163, 158, 145, 0.2)`,
          }}
        >
          A4
        </div>
      </motion.div>

      {/* Achievement Badge - Bottom */}
      <motion.div
        className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2"
        initial={{ y: 20, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.6, duration: 0.5 }}
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div
          className="bg-white/80 backdrop-blur-sm rounded-full px-3 md:px-4 py-1.5 md:py-2 flex items-center gap-2"
          style={{
            boxShadow: `
              3px 3px 8px rgba(163, 158, 145, 0.2),
              -2px -2px 6px rgba(255, 255, 255, 0.95)
            `,
          }}
        >
          <Award className="w-4 h-4 text-amber-600" fill="#F59E0B" />
          <span className="text-xs md:text-sm font-semibold text-ceramic-text-primary whitespace-nowrap">
            Conquista compartilhada
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default CommunityMockup;
