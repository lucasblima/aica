import { Transition, Variants } from 'framer-motion';

// ============================================
// SPRING CONFIGURATIONS
// ============================================

/** Spring para elevação de cards - peso tátil perceptível */
export const springElevation: Transition = {
  type: 'spring',
  stiffness: 350,
  damping: 28,
  mass: 1.1,
};

/** Spring para deslizamento de tabs - inércia suave */
export const springSlide: Transition = {
  type: 'spring',
  stiffness: 320,
  damping: 30,
  mass: 1.3,
};

/** Spring para hover - resposta rápida */
export const springHover: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 28,
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
    boxShadow: '3px 3px 6px rgba(163, 158, 145, 0.35), -3px -3px 6px rgba(255, 255, 255, 1.0)',
  },
  hover: {
    scale: 1.02,
    y: -2,
    boxShadow: '6px 6px 12px rgba(163, 158, 145, 0.35), -6px -6px 12px rgba(255, 255, 255, 1.0)',
    transition: springHover,
  },
  pressed: {
    scale: 0.98,
    y: 1,
    boxShadow: 'inset 3px 3px 6px rgba(163, 158, 145, 0.35), inset -3px -3px 6px rgba(255, 255, 255, 1.0)',
    transition: springPress,
  },
  selected: {
    scale: 1,
    y: -4,
    boxShadow: '8px 8px 16px rgba(163, 158, 145, 0.35), -8px -8px 16px rgba(255, 255, 255, 1.0)',
    transition: springElevation,
  },
};

/** Variantes para cards inset (afundados) */
export const cardInsetVariants: Variants = {
  rest: {
    scale: 1,
    boxShadow: 'inset 4px 4px 8px rgba(163, 158, 145, 0.35), inset -4px -4px 8px rgba(255, 255, 255, 1.0)',
  },
  hover: {
    scale: 1.01,
    boxShadow: 'inset 3px 3px 6px rgba(163, 158, 145, 0.35), inset -3px -3px 6px rgba(255, 255, 255, 1.0)',
    transition: springHover,
  },
  selected: {
    scale: 1,
    boxShadow: '6px 6px 12px rgba(163, 158, 145, 0.35), -6px -6px 12px rgba(255, 255, 255, 1.0)',
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
      staggerChildren: 0.08,
      delayChildren: 0.1,
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
