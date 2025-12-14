/**
 * RecommendationCard Component
 * Displays module recommendations in a simple, accessible card format
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Star, TrendingUp } from 'lucide-react';
import { cardElevationVariants } from '../../../lib/animations/ceramic-motion';

interface RecommendationCardProps {
  title: string;
  description?: string;
  icon?: string;
  score?: number;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({
  title,
  description,
  icon,
  score,
}) => {
  return (
    <motion.div
      className="ceramic-card p-6 flex flex-col gap-4 cursor-pointer"
      variants={cardElevationVariants}
      initial="rest"
      whileHover="hover"
      whileTap="pressed"
    >
      {/* Header with Icon */}
      <div className="flex items-start gap-3">
        {icon && (
          <div className="text-2xl flex-shrink-0">
            {icon}
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-bold text-lg text-ceramic-text-primary">
            {title}
          </h3>
        </div>
      </div>

      {/* Description */}
      {description && (
        <p className="text-sm text-ceramic-text-secondary">
          {description}
        </p>
      )}

      {/* Score/Stars */}
      {score && (
        <div className="flex items-center gap-2 pt-2">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= Math.round((score || 0) / 20)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-ceramic-text-secondary/30'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-ceramic-text-secondary ml-2">
            {score}%
          </span>
        </div>
      )}

      {/* Action Button */}
      <button className="mt-2 w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity text-sm">
        Habilitar Módulo
      </button>
    </motion.div>
  );
};

export default RecommendationCard;
