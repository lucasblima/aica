import { motion } from 'framer-motion';
import { PlusIcon } from '@heroicons/react/24/solid';
import { springElevation } from '@/lib/animations/ceramic-motion';

interface FloatingActionButtonProps {
  isActive: boolean;
  onClick: () => void;
  label?: string;
}

/**
 * Floating Action Button (FAB) que "acende" quando há seleção ativa
 *
 * @example
 * ```tsx
 * const { hasSelection } = useCardSelection();
 *
 * return (
 *   <FloatingActionButton
 *     isActive={hasSelection}
 *     onClick={handleCreate}
 *     label="Criar"
 *   />
 * );
 * ```
 */
export function FloatingActionButton({
  isActive,
  onClick,
  label = 'Criar'
}: FloatingActionButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`
        fixed bottom-6 right-6
        flex items-center gap-2
        px-5 py-3 rounded-full
        font-semibold text-sm
        transition-all duration-300
        ${isActive
          ? 'bg-ceramic-warm-active text-ceramic-accent ceramic-elevated'
          : 'bg-ceramic-cool text-ceramic-text-secondary/50 ceramic-inset-shallow opacity-60'}
      `}
      animate={{
        scale: isActive ? 1 : 0.9,
        boxShadow: isActive
          ? '8px 8px 16px rgba(163, 158, 145, 0.35), -8px -8px 16px rgba(255, 255, 255, 1.0)'
          : 'inset 3px 3px 6px rgba(163, 158, 145, 0.35), inset -3px -3px 6px rgba(255, 255, 255, 1.0)'
      }}
      transition={springElevation}
      whileHover={isActive ? { scale: 1.05 } : {}}
      whileTap={isActive ? { scale: 0.95 } : {}}
      disabled={!isActive}
    >
      <PlusIcon className="h-5 w-5" />
      {label}
    </motion.button>
  );
}
