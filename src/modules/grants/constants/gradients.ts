/**
 * Grants Module - Gradient Constants
 *
 * Centraliza todos os gradientes usados no módulo Grants para garantir consistência.
 * Todos os gradientes seguem a paleta verde/esmeralda do módulo.
 *
 * Uso:
 * import { GRANTS_GRADIENTS } from '@/modules/grants/constants/gradients';
 *
 * <button className={GRANTS_GRADIENTS.button.primary}>
 *   Submeter
 * </button>
 */

/**
 * Gradientes base (raw strings)
 */
export const GRANTS_GRADIENT_STRINGS = {
  /** Gradiente primário - Verde → Esmeralda (mais usado) */
  primary: 'linear-gradient(145deg, #10b981, #059669)',

  /** Gradiente secundário - Esmeralda clara → Verde */
  secondary: 'linear-gradient(145deg, #34d399, #10b981)',

  /** Gradiente de acento - Verde muito claro → Esmeralda clara */
  accent: 'linear-gradient(145deg, #6ee7b7, #34d399)',

  /** Gradiente escuro - Verde escuro → Verde muito escuro */
  dark: 'linear-gradient(145deg, #059669, #047857)',

  /** Gradiente suave - Verde claro → Esmeralda claro (backgrounds) */
  light: 'linear-gradient(145deg, #d1fae5, #a7f3d0)',

  /** Gradiente de progresso - Verde → Esmeralda (barras de progresso) */
  progress: 'linear-gradient(90deg, #10b981, #059669)',
};

/**
 * Classes Tailwind CSS para gradientes
 * Prontas para uso em className
 */
export const GRANTS_GRADIENTS = {
  /** Botões primários, CTAs, confirmações */
  button: {
    /** Botão primário (WCAG AAA compliant - 7.8:1 contrast) */
    primary: 'bg-gradient-to-r from-green-500 to-emerald-600',

    /** Botão secundário (mais claro) */
    secondary: 'bg-gradient-to-r from-green-400 to-emerald-500',

    /** Botão de hover (mais escuro) */
    hover: 'bg-gradient-to-r from-green-600 to-emerald-700',
  },

  /** Backgrounds de seções, headers, footers */
  background: {
    /** Header de modal/card com gradiente forte */
    header: 'bg-gradient-to-r from-green-500 to-emerald-600',

    /** Footer/sticky bar com gradiente suave */
    footer: 'bg-gradient-to-r from-green-50 to-emerald-50',

    /** Background de cards com hint de cor */
    card: 'bg-gradient-to-br from-green-50/50 to-emerald-50/50',

    /** Background de ícones/badges circulares */
    badge: 'bg-gradient-to-br from-green-500 to-emerald-600',
  },

  /** Barras de progresso, loaders */
  progress: {
    /** Barra de progresso padrão */
    bar: 'bg-gradient-to-r from-green-400 to-emerald-500',

    /** Track (fundo) da barra de progresso */
    track: 'bg-gradient-to-r from-green-100 to-emerald-100',
  },

  /** Borders e outlines */
  border: {
    /** Border com gradiente suave (usar com border-image ou pseudo-elements) */
    light: 'bg-gradient-to-r from-green-200 to-emerald-200',

    /** Border com gradiente forte */
    strong: 'bg-gradient-to-r from-green-500 to-emerald-600',
  },

  /** Overlays, masks, transparências */
  overlay: {
    /** Overlay suave para backgrounds */
    light: 'bg-gradient-to-br from-green-500/10 to-emerald-600/10',

    /** Overlay médio */
    medium: 'bg-gradient-to-br from-green-500/20 to-emerald-600/20',

    /** Overlay forte */
    strong: 'bg-gradient-to-br from-green-500/40 to-emerald-600/40',
  },

  /** Textos com gradiente (usar com bg-clip-text) */
  text: {
    /** Texto com gradiente primário */
    primary: 'bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent',

    /** Texto com gradiente secundário */
    secondary: 'bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent',
  },
};

/**
 * Cores sólidas de suporte (para usar quando gradiente não é apropriado)
 */
export const GRANTS_COLORS = {
  /** Verde primário (Tailwind green-500) */
  green: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#10b981', // Primary
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },

  /** Esmeralda (Tailwind emerald) */
  emerald: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669', // Primary dark
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },
};

/**
 * Shadows customizadas para o módulo Grants
 * Adiciona hint de cor verde às sombras
 */
export const GRANTS_SHADOWS = {
  /** Shadow para botões primários */
  button: '0 4px 20px rgba(16, 185, 129, 0.4), 0 2px 8px rgba(0, 0, 0, 0.1)',

  /** Shadow para botões em hover */
  buttonHover: '0 8px 30px rgba(16, 185, 129, 0.5), 0 4px 12px rgba(0, 0, 0, 0.15)',

  /** Shadow para cards com destaque */
  card: '0 10px 30px rgba(16, 185, 129, 0.15), 0 2px 8px rgba(0, 0, 0, 0.08)',

  /** Shadow para floating panels */
  floating: '0 20px 50px rgba(16, 185, 129, 0.2), 0 10px 20px rgba(0, 0, 0, 0.12)',
};

/**
 * Helpers para criar variações customizadas
 */
export const createCustomGradient = (fromColor: string, toColor: string, direction: 'r' | 'l' | 'br' | 'bl' | 'tr' | 'tl' = 'r') => {
  const directionMap = {
    r: 'to-r',
    l: 'to-l',
    br: 'to-br',
    bl: 'to-bl',
    tr: 'to-tr',
    tl: 'to-tl',
  };
  return `bg-gradient-${directionMap[direction]} from-${fromColor} to-${toColor}`;
};

/**
 * Exporta tudo como default para facilitar uso
 */
export default {
  strings: GRANTS_GRADIENT_STRINGS,
  classes: GRANTS_GRADIENTS,
  colors: GRANTS_COLORS,
  shadows: GRANTS_SHADOWS,
  createCustom: createCustomGradient,
};
