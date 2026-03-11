import { motion, AnimatePresence } from 'framer-motion';
import { PlusIcon } from '@heroicons/react/24/solid';
import { springElevation } from '../lib/animations/ceramic-motion';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('FloatingActionButtonAdvanced');

interface FloatingActionButtonAdvancedProps {
  isActive: boolean;
  onClick: () => void;
  label?: string;
  /** Badge de contagem (aparece como badge no botão) */
  count?: number;
  /** Ícone customizado */
  icon?: React.ComponentType<{ className?: string }>;
  /** Posição do FAB */
  position?: 'bottom-right' | 'bottom-center' | 'bottom-left';
  /** Variante de cor */
  variant?: 'amber' | 'green' | 'blue' | 'purple';
}

const POSITION_CLASSES = {
  'bottom-right': 'bottom-6 right-6',
  'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
  'bottom-left': 'bottom-6 left-6',
} as const;

const VARIANT_CLASSES = {
  amber: {
    active: 'bg-amber-500 shadow-amber-500/40',
    shadow: '0 10px 40px rgba(217, 119, 6, 0.4)',
  },
  green: {
    active: 'bg-green-500 shadow-green-500/40',
    shadow: '0 10px 40px rgba(34, 197, 94, 0.4)',
  },
  blue: {
    active: 'bg-blue-500 shadow-blue-500/40',
    shadow: '0 10px 40px rgba(59, 130, 246, 0.4)',
  },
  purple: {
    active: 'bg-purple-500 shadow-purple-500/40',
    shadow: '0 10px 40px rgba(168, 85, 247, 0.4)',
  },
} as const;

/**
 * Versão avançada do FloatingActionButton com features extras:
 * - Badge de contagem
 * - Ícone customizado
 * - Posicionamento configurável
 * - Variantes de cor
 *
 * @example
 * ```tsx
 * <FloatingActionButtonAdvanced
 *   isActive={hasSelection}
 *   onClick={handleCreate}
 *   count={selectedIds.length}
 *   position="bottom-center"
 *   variant="green"
 * />
 * ```
 */
export function FloatingActionButtonAdvanced({
  isActive,
  onClick,
  label = 'Criar',
  count,
  icon: Icon = PlusIcon,
  position = 'bottom-right',
  variant = 'amber',
}: FloatingActionButtonAdvancedProps) {
  const variantStyle = VARIANT_CLASSES[variant];
  const positionClass = POSITION_CLASSES[position];

  return (
    <motion.button
      onClick={onClick}
      className={`
        fixed ${positionClass}
        flex items-center gap-2
        px-5 py-3 rounded-full
        font-semibold text-sm
        transition-all duration-300
        relative
        ${isActive
          ? `${variantStyle.active} text-white shadow-lg`
          : 'bg-ceramic-cool text-ceramic-text-secondary opacity-50'}
      `}
      animate={{
        scale: isActive ? 1 : 0.9,
        boxShadow: isActive
          ? variantStyle.shadow
          : '0 4px 12px rgba(0,0,0,0.1)'
      }}
      transition={springElevation}
      whileHover={isActive ? { scale: 1.05 } : {}}
      whileTap={isActive ? { scale: 0.95 } : {}}
      disabled={!isActive}
    >
      <Icon className="h-5 w-5" />
      {label}

      {/* Badge de contagem */}
      <AnimatePresence>
        {count !== undefined && count > 0 && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={springElevation}
            className="
              absolute -top-2 -right-2
              bg-ceramic-base text-ceramic-text-primary
              rounded-full
              min-w-[24px] h-6
              flex items-center justify-center
              text-xs font-bold
              px-2
              shadow-md
            "
          >
            {count}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

/**
 * Exemplo de uso com todas as features
 */
export function FloatingActionButtonAdvancedExample() {
  const { hasSelection, selectedIds, toggle, clearSelection } = useCardSelection({ multiple: true });

  return (
    <>
      {/* Com contagem */}
      <FloatingActionButtonAdvanced
        isActive={hasSelection}
        onClick={() => log.debug('Criar')}
        count={selectedIds.length}
        label="Criar"
      />

      {/* Posição central, variante verde */}
      <FloatingActionButtonAdvanced
        isActive={hasSelection}
        onClick={() => log.debug('Confirmar')}
        position="bottom-center"
        variant="green"
        label="Confirmar"
      />

      {/* Ícone customizado, variante azul */}
      <FloatingActionButtonAdvanced
        isActive={hasSelection}
        onClick={() => log.debug('Salvar')}
        icon={SaveIcon}
        variant="blue"
        label="Salvar"
      />
    </>
  );
}

// Import necessário para o exemplo
import { useCardSelection } from '../hooks/useCardSelection';
import { CheckIcon as SaveIcon } from '@heroicons/react/24/solid';
