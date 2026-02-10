import React from 'react';

interface AIThinkingStateProps {
  message?: string;
  variant?: 'inline' | 'overlay';
}

export function AIThinkingState({
  message = 'AICA esta pensando...',
  variant = 'inline',
}: AIThinkingStateProps) {
  const dots = (
    <span className="inline-flex gap-1 ml-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-ceramic-accent animate-pulse"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );

  if (variant === 'overlay') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-ceramic-base/60 backdrop-blur-sm rounded-[20px] z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-ceramic-accent/30 border-t-ceramic-accent animate-spin" />
          <p className="text-ceramic-text-secondary text-sm font-medium">
            {message}{dots}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="w-5 h-5 rounded-full border-2 border-ceramic-accent/30 border-t-ceramic-accent animate-spin" />
      <p className="text-ceramic-text-secondary text-sm">
        {message}{dots}
      </p>
    </div>
  );
}
