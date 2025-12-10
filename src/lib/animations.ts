/**
 * Animations Library - Framer Motion Presets
 *
 * Biblioteca de animações reutilizáveis para Aica Life OS.
 * Todas as animações seguem princípios de design:
 * - Duração 200-300ms para interações rápidas
 * - Spring physics para movimentos naturais
 * - Ease curves suaves
 * - Animações acessíveis (respeitam prefers-reduced-motion)
 *
 * Uso:
 * import { animations, staggerVariants } from '@/lib/animations';
 *
 * <motion.div {...animations.fadeInUp}>
 *   Content
 * </motion.div>
 */

import type { Transition, Variant } from 'framer-motion';

/**
 * Tipo base para animações com initial, animate, exit, transition
 */
export interface AnimationPreset {
  initial: Variant;
  animate: Variant;
  exit: Variant;
  transition?: Transition;
}

/**
 * Tipo para animações contínuas (sem initial/exit)
 */
export interface ContinuousAnimation {
  animate: Variant | Variant[];
  transition: Transition;
}

// =============================================================================
// ENTRADA/SAÍDA (Fade, Slide, Scale)
// =============================================================================

/**
 * Fade In Up - Elemento entra de baixo com fade
 * Uso comum: Cards, modais, notificações
 */
export const fadeInUp: AnimationPreset = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3, ease: 'easeOut' }
};

/**
 * Fade In Down - Elemento entra de cima com fade
 * Uso comum: Dropdowns, tooltips, menus
 */
export const fadeInDown: AnimationPreset = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
  transition: { duration: 0.3, ease: 'easeOut' }
};

/**
 * Scale In - Elemento cresce do centro
 * Uso comum: Ícones, badges, alerts
 */
export const scaleIn: AnimationPreset = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.9, opacity: 0 },
  transition: { type: 'spring', stiffness: 300, damping: 25 }
};

/**
 * Slide In Right - Elemento entra da direita
 * Uso comum: Sidebars, painéis laterais, drawer menus
 */
export const slideInRight: AnimationPreset = {
  initial: { x: '100%', opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: '100%', opacity: 0 },
  transition: { type: 'spring', stiffness: 200, damping: 20 }
};

/**
 * Slide In Left - Elemento entra da esquerda
 * Uso comum: Sidebars, painéis laterais
 */
export const slideInLeft: AnimationPreset = {
  initial: { x: '-100%', opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: '-100%', opacity: 0 },
  transition: { type: 'spring', stiffness: 200, damping: 20 }
};

// =============================================================================
// COLLAPSE/EXPAND
// =============================================================================

/**
 * Collapse - Colapso vertical suave
 * Uso comum: Accordions, seções colapsáveis (ex: Edital Context, PDF Section)
 *
 * IMPORTANTE: Usar com AnimatePresence
 * Exemplo:
 * <AnimatePresence>
 *   {isOpen && (
 *     <motion.div {...animations.collapse}>
 *       Content
 *     </motion.div>
 *   )}
 * </AnimatePresence>
 */
export const collapse: AnimationPreset = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1 },
  exit: { height: 0, opacity: 0 },
  transition: { duration: 0.2, ease: 'easeInOut' }
};

/**
 * Expand Horizontal - Expansão horizontal
 * Uso comum: Chips que expandem, tags que mostram info extra
 */
export const expandHorizontal: AnimationPreset = {
  initial: { width: 0, opacity: 0 },
  animate: { width: 'auto', opacity: 1 },
  exit: { width: 0, opacity: 0 },
  transition: { duration: 0.2, ease: 'easeInOut' }
};

// =============================================================================
// FEEDBACK VISUAL (Success, Error, Loading)
// =============================================================================

/**
 * Checkmark Pop - Checkmark que "salta" ao aparecer
 * Uso comum: Confirmações, tarefas concluídas, aprovações
 *
 * Exemplo:
 * <motion.div {...animations.checkmarkPop}>
 *   <CheckCircle2 className="w-12 h-12 text-green-600" />
 * </motion.div>
 */
export const checkmarkPop: AnimationPreset = {
  initial: { scale: 0, rotate: -180 },
  animate: { scale: 1, rotate: 0 },
  exit: { scale: 0, rotate: 180 },
  transition: { type: 'spring', stiffness: 200, damping: 15 }
};

/**
 * Error Shake - Tremor de erro
 * Uso comum: Campos com validação incorreta, erros de submissão
 *
 * Exemplo:
 * <motion.div animate={animations.shake.animate} transition={animations.shake.transition}>
 *   <input className="border-red-500" />
 * </motion.div>
 */
export const shake: ContinuousAnimation = {
  animate: { x: [0, -10, 10, -10, 10, 0] },
  transition: { duration: 0.4 }
};

/**
 * Pulse - Pulsação suave
 * Uso comum: Loading indicators, elementos que aguardam atenção
 *
 * IMPORTANTE: Usar animate (não initial/exit) para loop infinito
 *
 * Exemplo:
 * <motion.div
 *   animate={animations.pulse.animate}
 *   transition={animations.pulse.transition}
 * >
 *   <Loader2 className="w-6 h-6" />
 * </motion.div>
 */
export const pulse: ContinuousAnimation = {
  animate: [
    { scale: 1, opacity: 1 },
    { scale: 1.05, opacity: 0.8 },
    { scale: 1, opacity: 1 }
  ],
  transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
};

/**
 * Spin - Rotação contínua
 * Uso comum: Loading spinners
 *
 * Exemplo:
 * <motion.div
 *   animate={animations.spin.animate}
 *   transition={animations.spin.transition}
 * >
 *   <Loader2 className="w-6 h-6" />
 * </motion.div>
 */
export const spin: ContinuousAnimation = {
  animate: { rotate: 360 },
  transition: { duration: 1, repeat: Infinity, ease: 'linear' }
};

// =============================================================================
// CONFETTI & CELEBRATIONS
// =============================================================================

/**
 * Confetti Particle - Partícula de confete que explode
 * Uso comum: Celebrações, confirmações de sucesso (ex: ProposalGeneratorView success state)
 *
 * Uso: Criar múltiplas partículas com posições aleatórias
 *
 * Exemplo:
 * {[...Array(20)].map((_, i) => (
 *   <motion.div
 *     key={i}
 *     className="absolute w-2 h-2 rounded-full"
 *     style={{ background: colors[i % colors.length] }}
 *     {...animations.confettiParticle}
 *     animate={{
 *       ...animations.confettiParticle.animate,
 *       x: (Math.random() - 0.5) * 400,
 *       y: (Math.random() - 0.5) * 400,
 *       rotate: Math.random() * 720
 *     }}
 *   />
 * ))}
 */
export const confettiParticle: AnimationPreset = {
  initial: { opacity: 1, scale: 1, x: 0, y: 0 },
  animate: {
    opacity: [1, 1, 0],
    scale: [1, 1.5, 0],
    x: 0, // Override com valor aleatório
    y: 0, // Override com valor aleatório
    rotate: 0 // Override com valor aleatório
  },
  exit: { opacity: 0 },
  transition: { duration: 1.5, ease: 'easeOut' }
};

// =============================================================================
// STAGGER (Listas e Grids)
// =============================================================================

/**
 * Stagger Container + Item - Animação em cascata para listas
 * Uso comum: Cards de projetos, listas de editais, grids
 *
 * Exemplo:
 * <motion.div variants={staggerVariants.container} initial="initial" animate="animate">
 *   {items.map(item => (
 *     <motion.div key={item.id} variants={staggerVariants.item}>
 *       {item.content}
 *     </motion.div>
 *   ))}
 * </motion.div>
 */
export const staggerVariants = {
  container: {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.05 // Delay de 50ms entre cada filho
      }
    }
  },
  item: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 }
  }
};

/**
 * Stagger Grid - Variante para grids (stagger mais lento)
 */
export const staggerGridVariants = {
  container: {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.1 // Delay de 100ms entre cada filho
      }
    }
  },
  item: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 }
  }
};

// =============================================================================
// HOVER & CLICK (Interações)
// =============================================================================

/**
 * Button Hover - Hover suave para botões
 * Uso comum: Botões ceramic-convex, ceramic-concave
 *
 * Exemplo:
 * <motion.button whileHover={buttonHover} whileTap={buttonTap}>
 *   Clique aqui
 * </motion.button>
 */
export const buttonHover = { scale: 1.02 };

/**
 * Button Tap - Feedback ao clicar
 */
export const buttonTap = { scale: 0.95 };

/**
 * Card Hover - Hover para cards (elevação + leve scale)
 * Uso comum: Cards de projetos, editais, oportunidades
 *
 * Exemplo:
 * <motion.div
 *   className="ceramic-card"
 *   whileHover={cardHover}
 * >
 *   Content
 * </motion.div>
 */
export const cardHover = {
  scale: 1.02,
  boxShadow: '0 12px 24px rgba(163, 177, 198, 0.3)'
};

// =============================================================================
// EXPORTAÇÃO AGRUPADA
// =============================================================================

/**
 * Objeto principal com todas as animações
 * Uso: import { animations } from '@/lib/animations'
 */
export const animations = {
  // Entrada/Saída
  fadeInUp,
  fadeInDown,
  scaleIn,
  slideInRight,
  slideInLeft,

  // Collapse/Expand
  collapse,
  expandHorizontal,

  // Feedback Visual
  checkmarkPop,
  shake,
  pulse,
  spin,

  // Confetti
  confettiParticle,

  // Hover/Click
  buttonHover,
  buttonTap,
  cardHover
};

/**
 * Configurações de transição comuns
 */
export const transitions = {
  fast: { duration: 0.15, ease: 'easeOut' },
  normal: { duration: 0.3, ease: 'easeOut' },
  slow: { duration: 0.5, ease: 'easeInOut' },
  spring: { type: 'spring' as const, stiffness: 300, damping: 25 },
  springGentle: { type: 'spring' as const, stiffness: 200, damping: 20 },
  springBouncy: { type: 'spring' as const, stiffness: 400, damping: 15 }
};

// =============================================================================
// UTILIDADES
// =============================================================================

/**
 * Cria uma animação de entrada com delay customizado
 *
 * Exemplo:
 * <motion.div {...delayedFadeIn(0.2)}>
 *   Aparece com 200ms de delay
 * </motion.div>
 */
export const delayedFadeIn = (delay: number): AnimationPreset => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3, delay, ease: 'easeOut' }
});

/**
 * Cria uma animação de confete com parâmetros customizados
 *
 * Exemplo:
 * {[...Array(20)].map((_, i) => (
 *   <motion.div
 *     key={i}
 *     {...createConfettiAnimation({
 *       x: (Math.random() - 0.5) * 400,
 *       y: (Math.random() - 0.5) * 400,
 *       rotate: Math.random() * 720
 *     })}
 *   />
 * ))}
 */
export const createConfettiAnimation = ({
  x,
  y,
  rotate,
  duration = 1.5
}: {
  x: number;
  y: number;
  rotate: number;
  duration?: number;
}): AnimationPreset => ({
  initial: { opacity: 1, scale: 1, x: 0, y: 0, rotate: 0 },
  animate: {
    opacity: [1, 1, 0],
    scale: [1, 1.5, 0],
    x,
    y,
    rotate
  },
  exit: { opacity: 0 },
  transition: { duration, ease: 'easeOut' }
});

/**
 * Hook para respeitar preferências de acessibilidade
 * Uso: const shouldAnimate = usePrefersReducedMotion();
 *
 * IMPORTANTE: Se o usuário ativar "prefers-reduced-motion",
 * todas as animações devem ser desabilitadas ou simplificadas.
 */
export const usePrefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};
