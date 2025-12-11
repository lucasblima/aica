/**
 * Trail Card Component
 * Visual representation of a contextual trail with selection state
 *
 * Features:
 * - Icon and color display
 * - Selection indicator
 * - Responsive hover effects
 * - WCAG compliant
 *
 * @version 1.0.0
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { ContextualTrail } from '../../../../types/onboardingTypes';

interface TrailCardProps {
  trail: ContextualTrail;
  isSelected: boolean;
  onToggle: () => void;
}

const TrailCard: React.FC<TrailCardProps> = ({ trail, isSelected, onToggle }) => {
  return (
    <motion.button
      onClick={onToggle}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative w-full p-6 rounded-xl transition-all duration-200 text-left border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
        isSelected
          ? 'border-current bg-opacity-10 ring-2 ring-offset-2'
          : 'border-transparent hover:border-[#E8E6E0] bg-white'
      }`}
      style={{
        backgroundColor: isSelected ? `${trail.color}20` : '#FFFFFF',
        borderColor: isSelected ? trail.color : 'transparent',
        ringColor: isSelected ? trail.color : undefined,
      }}
      aria-pressed={isSelected}
      aria-label={`Selecionar ${trail.name}`}
    >
      {/* Content */}
      <div className="flex items-start gap-4">
        {/* Icon Placeholder */}
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 text-2xl"
          style={{ backgroundColor: `${trail.color}30` }}
        >
          {/* Icon name would be rendered here */}
          <span>{trail.icon === 'Brain' ? '🧠' : trail.icon === 'Activity' ? '💪' : trail.icon === 'Wallet' ? '💰' : trail.icon === 'Users' ? '👥' : '⚡'}</span>
        </div>

        {/* Text */}
        <div className="flex-1">
          <h3 className="text-lg font-bold text-[#2B1B17] mb-1">
            {trail.name}
          </h3>
          <p className="text-sm text-[#5C554B] leading-relaxed">
            {trail.description}
          </p>
        </div>

        {/* Selection Indicator */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: trail.color }}
          >
            <Check size={16} className="text-white" />
          </motion.div>
        )}
      </div>

      {/* Shadow on hover */}
      {!isSelected && (
        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 shadow-md transition-opacity" />
      )}
    </motion.button>
  );
};

export default TrailCard;
