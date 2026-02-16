import React from 'react';

interface UsageStatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
}

export function UsageStatsCard({ title, value, subtitle, icon }: UsageStatsCardProps) {
  return (
    <div className="bg-ceramic-50 rounded-xl p-5 shadow-ceramic-emboss">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary">
            {title}
          </p>
          <p className="mt-1.5 text-2xl font-black text-ceramic-text-primary">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-xs text-ceramic-text-secondary font-medium">
              {subtitle}
            </p>
          )}
        </div>
        {icon && (
          <div className="p-2.5 bg-amber-100 rounded-xl flex-shrink-0">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export default UsageStatsCard;
