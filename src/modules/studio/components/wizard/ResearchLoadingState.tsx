import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Brain, Sparkles } from 'lucide-react';

interface ResearchLoadingStateProps {
  guestName: string;
}

const PHASES = [
  {
    icon: Search,
    text: 'Buscando informações na web...',
  },
  {
    icon: Brain,
    text: 'Analisando dados do convidado...',
  },
  {
    icon: Sparkles,
    text: 'Gerando sugestoes...',
  },
] as const;

export const ResearchLoadingState: React.FC<ResearchLoadingStateProps> = ({ guestName }) => {
  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPhaseIndex((prev) => (prev < PHASES.length - 1 ? prev + 1 : prev));
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const phase = PHASES[phaseIndex];
  const Icon = phase.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-8">
      <AnimatePresence mode="wait">
        <motion.div
          key={phaseIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center space-y-4"
        >
          <motion.div
            animate={{ rotate: phaseIndex === 0 ? 360 : 0 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg"
          >
            <Icon className="w-8 h-8 text-white" />
          </motion.div>

          <p className="text-lg font-medium text-ceramic-text-primary text-center">
            {phase.text}
          </p>

          <p className="text-sm text-ceramic-text-secondary text-center">
            Pesquisando sobre <span className="font-semibold text-amber-600">{guestName}</span>
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Phase progress dots */}
      <div className="flex items-center gap-3">
        {PHASES.map((_, i) => (
          <motion.div
            key={i}
            className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
              i <= phaseIndex ? 'bg-amber-500' : 'bg-ceramic-border'
            }`}
            animate={i === phaseIndex ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          />
        ))}
      </div>
    </div>
  );
};
