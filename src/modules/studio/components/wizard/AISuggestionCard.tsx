import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface AISuggestionCardProps {
  text: string;
  isSelected: boolean;
  onSelect: () => void;
  isCustom?: boolean;
  customValue?: string;
  onCustomChange?: (value: string) => void;
}

export const AISuggestionCard: React.FC<AISuggestionCardProps> = ({
  text,
  isSelected,
  onSelect,
  isCustom,
  customValue,
  onCustomChange,
}) => {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative w-full text-left p-4 rounded-2xl border-2 transition-colors duration-200 ${
        isSelected
          ? 'border-amber-500 bg-amber-50'
          : 'border-ceramic-border bg-ceramic-base hover:border-amber-300 hover:bg-ceramic-cool'
      }`}
    >
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center"
        >
          <Check className="w-4 h-4 text-white" />
        </motion.div>
      )}

      {isCustom ? (
        <div className="space-y-2">
          <span className="text-sm font-medium text-ceramic-text-secondary">{text}</span>
          {isSelected && onCustomChange && (
            <motion.input
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              type="text"
              value={customValue || ''}
              onChange={(e) => onCustomChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Digite aqui..."
              autoFocus
              className="w-full px-3 py-2 rounded-xl bg-ceramic-base text-ceramic-text-primary placeholder-ceramic-text-secondary border border-ceramic-border focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-sm"
            />
          )}
        </div>
      ) : (
        <span className="text-sm font-medium text-ceramic-text-primary pr-8">{text}</span>
      )}
    </motion.button>
  );
};
