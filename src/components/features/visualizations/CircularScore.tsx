import React from 'react';

interface CircularScoreProps {
  score: number;
  maxScore?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
  trackColor?: string;
  progressColor?: string;
}

export const CircularScore: React.FC<CircularScoreProps> = ({
  score,
  maxScore = 100,
  size = 96,
  strokeWidth = 8,
  label,
  className = '',
  trackColor = '#e5e7eb',
  progressColor = '#f59e0b',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(Math.max(score / maxScore, 0), 1);
  const offset = circumference * (1 - percentage);

  return (
    <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-label={`${Math.round(percentage * 100)}% ${label || 'score'}`}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={progressColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-1000" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-ceramic-text-primary">{Math.round(percentage * 100)}%</span>
        </div>
      </div>
      {label && <span className="text-xs font-medium text-ceramic-text-secondary">{label}</span>}
    </div>
  );
};
