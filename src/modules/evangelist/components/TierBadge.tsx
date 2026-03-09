import { TIER_CONFIG, type EvangelistTier } from '../types';

interface TierBadgeProps {
  tier: EvangelistTier;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES: Record<NonNullable<TierBadgeProps['size']>, string> = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
};

const TIER_COLORS: Record<EvangelistTier, string> = {
  1: 'bg-green-100 text-green-800',
  2: 'bg-orange-100 text-orange-800',
  3: 'bg-yellow-100 text-yellow-800',
  4: 'bg-purple-100 text-purple-800 shadow-ceramic-emboss',
};

export function TierBadge({ tier, size = 'md' }: TierBadgeProps) {
  const config = TIER_CONFIG[tier];
  const sizeClass = SIZE_CLASSES[size];
  const colorClass = TIER_COLORS[tier];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClass} ${colorClass}`}
    >
      <span>{config.icon}</span>
      <span>{config.name}</span>
    </span>
  );
}
