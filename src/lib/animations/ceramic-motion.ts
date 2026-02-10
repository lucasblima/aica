import { Transition, Variants } from 'framer-motion';

// ============================================
// SPRING CONFIGURATIONS
// ============================================

/** Spring para elevação de cards - peso tátil perceptível */
export const springElevation: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
  mass: 1.0,
};

/** Spring para deslizamento de tabs - inércia suave */
export const springSlide: Transition = {
  type: 'spring',
  stiffness: 280,
  damping: 32,
  mass: 1.2,
};

/** Spring para hover - resposta rápida */
export const springHover: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 30,
  mass: 0.8,
};

/** Spring para press - feedback imediato */
export const springPress: Transition = {
  type: 'spring',
  stiffness: 450,
  damping: 30,
  mass: 0.6,
};

// ============================================
// CARD VARIANTS
// ============================================

/** Variantes para cards com elevação */
export const cardElevationVariants: Variants = {
  rest: {
    scale: 1,
    y: 0,
    boxShadow: '3px 3px 6px rgba(163, 158, 145, 0.25), -3px -3px 6px rgba(255, 255, 255, 0.95)',
  },
  hover: {
    scale: 1.02,
    y: -2,
    boxShadow: '5px 5px 10px rgba(163, 158, 145, 0.25), -5px -5px 10px rgba(255, 255, 255, 0.95)',
    transition: springHover,
  },
  pressed: {
    scale: 0.98,
    y: 1,
    boxShadow: 'inset 3px 3px 6px rgba(163, 158, 145, 0.25), inset -3px -3px 6px rgba(255, 255, 255, 0.95)',
    transition: springPress,
  },
  selected: {
    scale: 1,
    y: -4,
    boxShadow: '6px 6px 14px rgba(163, 158, 145, 0.25), -6px -6px 14px rgba(255, 255, 255, 0.95)',
    transition: springElevation,
  },
};

/** Variantes para cards inset (afundados) */
export const cardInsetVariants: Variants = {
  rest: {
    scale: 1,
    boxShadow: 'inset 3px 3px 6px rgba(163, 158, 145, 0.25), inset -3px -3px 6px rgba(255, 255, 255, 0.95)',
  },
  hover: {
    scale: 1.01,
    boxShadow: 'inset 2px 2px 5px rgba(163, 158, 145, 0.25), inset -2px -2px 5px rgba(255, 255, 255, 0.95)',
    transition: springHover,
  },
  selected: {
    scale: 1,
    boxShadow: '5px 5px 10px rgba(163, 158, 145, 0.25), -5px -5px 10px rgba(255, 255, 255, 0.95)',
    transition: springElevation,
  },
};

// ============================================
// TAB SELECTOR VARIANTS
// ============================================

/** Variantes para o indicador de tab ativo */
export const tabIndicatorVariants: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

/** Configuração de layout para AnimatePresence */
export const tabLayoutTransition: Transition = {
  type: 'spring',
  stiffness: 320,
  damping: 30,
  mass: 1.3,
};

// ============================================
// NOTIFICATION PULSE
// ============================================

/** Variantes para pulsação de notificação */
export const pulseVariants: Variants = {
  initial: { scale: 1, opacity: 1 },
  pulse: {
    scale: [1, 1.1, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/** Keyframes para pulsação âmbar (CSS-in-JS) */
export const pulseAmberKeyframes = {
  '0%, 100%': { boxShadow: '0 0 0 0 rgba(217, 119, 6, 0.4)' },
  '50%': { boxShadow: '0 0 0 8px rgba(217, 119, 6, 0)' },
};

// ============================================
// TEMPERATURE TRANSITIONS
// ============================================

/** Transição de temperatura de cor (frio -> quente) */
export const temperatureTransition: Transition = {
  duration: 0.3,
  ease: 'easeInOut',
};

/** Cores de temperatura (frio -> quente) */
export const temperatureColors = {
  cool: '#E8EBE9',        // Tom frio para repouso/inativo
  coolHover: '#DDE0DE',   // Hover no estado frio
  warm: '#F5E6D3',        // Tom quente para seleção/ativo
  warmHover: '#EFD9C0',   // Hover no estado quente
  warmActive: '#E8CEB0',  // Estado ativo intensificado
} as const;

// ============================================
// STAGGER ANIMATIONS
// ============================================

/** Container com stagger para lista de cards */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.08,
    },
  },
};

/** Item individual no stagger */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springElevation,
  },
};

// ============================================
// PAGE TRANSITIONS
// ============================================

/** Variantes para transicao entre paginas/views */
export const pageTransitionVariants: Variants = {
  initial: {
    opacity: 0,
    y: 12,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.25,
      ease: [0.4, 0, 1, 1],
    },
  },
};
