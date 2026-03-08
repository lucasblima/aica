// =====================================================
// Finance Module — Shared Constants
// =====================================================

/**
 * Human-readable labels for transaction categories (pt-BR).
 */
export const CATEGORY_LABELS: Record<string, string> = {
  housing: 'Moradia',
  food: 'Alimentação',
  transport: 'Transporte',
  health: 'Saúde',
  education: 'Educação',
  entertainment: 'Entretenimento',
  shopping: 'Compras',
  salary: 'Salário',
  freelance: 'Freelance',
  investment: 'Investimento',
  transfer: 'Transferência',
  bills: 'Contas',
  subscription: 'Assinatura',
  travel: 'Viagem',
  personal_care: 'Cuidados Pessoais',
  pets: 'Pets',
  gifts: 'Presentes',
  other: 'Outros',
};

/**
 * Tailwind color classes for category badges.
 *
 * Ceramic semantic tokens are used where a direct mapping exists:
 *   - housing     → ceramic-info
 *   - health      → ceramic-error
 *   - salary      → ceramic-success
 *   - transfer    → ceramic-cool / ceramic-text-secondary
 *   - other       → ceramic-cool / ceramic-text-primary
 *   - food, gifts → ceramic-warning
 *
 * Categories without a ceramic equivalent (purple, indigo, pink, teal,
 * cyan, rose, violet, sky, fuchsia, lime) keep their Tailwind palette
 * colors — these are chart data-series colors, a preserved exception
 * in the Ceramic Design System.
 *
 * Amber (shopping) stays as the accent family.
 */
export const CATEGORY_COLORS: Record<string, string> = {
  housing: 'bg-ceramic-info/15 text-ceramic-info',
  food: 'bg-ceramic-warning/15 text-ceramic-warning',
  transport: 'bg-purple-100 text-purple-700',
  health: 'bg-ceramic-error/15 text-ceramic-error',
  education: 'bg-indigo-100 text-indigo-700',
  entertainment: 'bg-pink-100 text-pink-700',
  shopping: 'bg-amber-100 text-amber-700',
  salary: 'bg-ceramic-success/15 text-ceramic-success',
  freelance: 'bg-teal-100 text-teal-700',
  investment: 'bg-cyan-100 text-cyan-700',
  transfer: 'bg-ceramic-cool text-ceramic-text-secondary',
  bills: 'bg-rose-100 text-rose-700',
  subscription: 'bg-violet-100 text-violet-700',
  travel: 'bg-sky-100 text-sky-700',
  personal_care: 'bg-fuchsia-100 text-fuchsia-700',
  pets: 'bg-lime-100 text-lime-700',
  gifts: 'bg-ceramic-warning/15 text-ceramic-warning',
  other: 'bg-ceramic-cool text-ceramic-text-primary',
};

/**
 * Format a number as Brazilian Real (R$).
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};
