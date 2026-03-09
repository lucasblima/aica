import { TIER_CONFIG, type EvangelistTier } from '../types';

interface TierProgressProps {
  currentCount: number;
  currentTier: EvangelistTier;
}

const TIER_FILL_COLORS: Record<EvangelistTier, string> = {
  1: 'bg-green-500',
  2: 'bg-orange-500',
  3: 'bg-yellow-500',
  4: 'bg-purple-500',
};

export function TierProgress({ currentCount, currentTier }: TierProgressProps) {
  const isMaxTier = currentTier === 4;
  const nextTier = isMaxTier ? null : ((currentTier + 1) as EvangelistTier);
  const nextConfig = nextTier ? TIER_CONFIG[nextTier] : null;
  const nextTarget = nextConfig ? nextConfig.min_referrals : 0;
  const percentage = isMaxTier ? 100 : Math.min((currentCount / nextTarget) * 100, 100);
  const fillColor = TIER_FILL_COLORS[currentTier];

  return (
    <div className="w-full">
      {isMaxTier ? (
        <p className="text-sm font-medium ceramic-text-primary text-center">
          {TIER_CONFIG[4].icon} Nivel maximo alcancado!
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm ceramic-text-secondary">
              {currentCount} de {nextTarget} para{' '}
              <span className="font-medium ceramic-text-primary">
                {nextConfig!.icon} {nextConfig!.name}
              </span>
            </span>
            <span className="text-xs ceramic-text-secondary">
              {Math.round(percentage)}%
            </span>
          </div>

          <div className="w-full h-2.5 rounded-full bg-ceramic-base overflow-hidden">
            <div
              className={`h-full rounded-full ${fillColor} transition-all duration-500 ease-out`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}
