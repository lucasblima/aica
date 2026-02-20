import type { Quadrant } from '@/types';

export const QUADRANT_COLORS: Record<Quadrant, { border: string; bg: string; text: string }> = {
  'urgent-important': {
    border: 'border-l-amber-600',
    bg: 'bg-amber-600/10',
    text: 'text-amber-700',
  },
  'important': {
    border: 'border-l-sky-500',
    bg: 'bg-sky-500/10',
    text: 'text-sky-700',
  },
  'urgent': {
    border: 'border-l-yellow-400',
    bg: 'bg-yellow-400/10',
    text: 'text-yellow-700',
  },
  'low': {
    border: 'border-l-stone-400',
    bg: 'bg-stone-400/10',
    text: 'text-stone-600',
  },
};

export function getQuadrantFromFlags(is_urgent: boolean, is_important: boolean): Quadrant {
  if (is_urgent && is_important) return 'urgent-important';
  if (!is_urgent && is_important) return 'important';
  if (is_urgent && !is_important) return 'urgent';
  return 'low';
}
