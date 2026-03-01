import { useState } from 'react';
import { grantsDemo } from '../../data/demoData';

export function GrantsDemo() {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const { title, deadline, matchScore, breakdown, value, duration } = grantsDemo;

  // Compute days remaining
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diffMs = deadlineDate.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  // SVG circle dimensions
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (matchScore / 100) * circumference;

  return (
    <div className="space-y-4">
      {/* Edital card */}
      <div
        className="bg-white/60 rounded-xl p-4 border border-ceramic-border cursor-pointer transition-all hover:shadow-md"
        onMouseEnter={() => setShowBreakdown(true)}
        onMouseLeave={() => setShowBreakdown(false)}
      >
        <div className="flex items-start gap-4">
          {/* Match score circle */}
          <div className="relative shrink-0">
            <svg width="96" height="96" className="-rotate-90">
              <circle
                cx="48"
                cy="48"
                r={radius}
                stroke="#e5e7eb"
                strokeWidth="6"
                fill="none"
              />
              <circle
                cx="48"
                cy="48"
                r={radius}
                stroke="#f59e0b"
                strokeWidth="6"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <span className="text-xl font-bold text-amber-600">
                  {matchScore}%
                </span>
                <p className="text-[8px] text-ceramic-text-secondary">match</p>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-ceramic-text-primary leading-tight">
              {title}
            </h4>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-ceramic-text-secondary">
              <span>{value}</span>
              <span>{duration}</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span
                className={`text-xs font-medium ${
                  daysRemaining <= 14
                    ? 'text-ceramic-error'
                    : 'text-ceramic-text-secondary'
                }`}
              >
                {daysRemaining} dias restantes
              </span>
            </div>
          </div>
        </div>

        {/* Breakdown on hover */}
        {showBreakdown && (
          <div className="mt-3 pt-3 border-t border-ceramic-border space-y-2">
            {breakdown.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="text-[11px] text-ceramic-text-secondary w-32 shrink-0 truncate">
                  {item.label}
                </span>
                <div className="flex-1 h-2 bg-ceramic-cool rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${item.score}%` }}
                  />
                </div>
                <span className="text-[11px] font-medium text-ceramic-text-primary w-8 text-right">
                  {item.score}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[10px] text-ceramic-text-secondary text-center">
        Passe o mouse sobre o card para ver o detalhamento
      </p>
    </div>
  );
}
