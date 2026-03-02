import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Heart,
  Users,
  Wallet,
  GraduationCap,
  Mic,
  Dumbbell,
} from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import type { Domain, ScoringModel } from '../data/landingData';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Heart,
  Users,
  Wallet,
  GraduationCap,
  Mic,
  Dumbbell,
};

interface DomainCardProps {
  domain: Domain;
  scoringModel?: ScoringModel;
  isExpanded: boolean;
  onToggle: () => void;
  delay: number;
}

/**
 * DomainCard -- Expandable card for a single AICA domain.
 *
 * Shows domain icon, label, model reference, animated score bar,
 * and an expandable panel with scoring model details.
 */
export function DomainCard({
  domain,
  scoringModel,
  isExpanded,
  onToggle,
  delay,
}: DomainCardProps) {
  const { ref, isInView } = useScrollReveal();
  const IconComp = ICON_MAP[domain.icon];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5, delay: delay / 1000, ease: 'easeOut' }}
      whileHover={{ y: -2 }}
      onClick={onToggle}
      className="bg-ceramic-base rounded-2xl p-6 shadow-ceramic-emboss cursor-pointer transition-shadow hover:shadow-ceramic-elevated"
    >
      {/* Icon */}
      <div className="w-12 h-12 rounded-full bg-ceramic-accent/10 flex items-center justify-center">
        {IconComp && <IconComp className="w-6 h-6 text-ceramic-accent" />}
      </div>

      {/* Domain label */}
      <h3 className="font-bold text-ceramic-text-primary text-lg mt-3">
        {domain.label}
      </h3>

      {/* Model reference */}
      <p className="text-sm text-ceramic-text-secondary mt-1">
        {domain.reference}
      </p>

      {/* Animated score bar */}
      <div className="w-full h-2 bg-ceramic-border rounded-full mt-4 overflow-hidden">
        <motion.div
          className="h-full bg-ceramic-accent rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: isInView ? `${domain.demoScore * 100}%` : '0%' }}
          transition={{ duration: 0.8, type: 'spring', bounce: 0.2, delay: delay / 1000 + 0.3 }}
        />
      </div>

      {/* PT-BR validation badge */}
      {domain.validatedPtBr && (
        <span className="inline-block mt-2 text-xs bg-ceramic-success/10 text-ceramic-success px-2 py-0.5 rounded-full">
          Validado em PT-BR
        </span>
      )}

      {/* Expanded panel */}
      <AnimatePresence>
        {isExpanded && scoringModel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pt-4 mt-4 border-t border-ceramic-border">
              <p className="text-sm text-ceramic-text-secondary">
                {scoringModel.summary}
              </p>

              <div className="font-mono text-xs bg-ceramic-cool p-2 rounded mt-2">
                {scoringModel.formula}
              </div>

              <p className="text-xs text-ceramic-text-secondary mt-1">
                Escala: {scoringModel.scale}
              </p>

              {scoringModel.contested && (
                <div className="mt-2 text-xs text-ceramic-warning bg-ceramic-warning-bg px-3 py-1.5 rounded">
                  Modelo contestado — teoria subjacente falhou replicacao
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
