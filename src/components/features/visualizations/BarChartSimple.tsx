import React, { useState, useMemo } from 'react';

interface BarValue {
  key: string;
  value: number;
  color: string;
}

export interface BarGroup {
  label: string;
  values: BarValue[];
}

interface BarChartSimpleProps {
  data: BarGroup[];
  maxHeight?: number;
  formatValue?: (value: number) => string;
  onBarHover?: (info: { label: string; key: string; value: number }) => void;
  className?: string;
  legend?: { key: string; label: string; color: string }[];
}

export const BarChartSimple: React.FC<BarChartSimpleProps> = ({
  data, maxHeight = 128, formatValue = (v) => v.toLocaleString('pt-BR'),
  onBarHover, className = '', legend,
}) => {
  const [hovered, setHovered] = useState<{ label: string; key: string; value: number } | null>(null);
  const maxValue = useMemo(() => {
    let max = 0;
    data.forEach(g => g.values.forEach(v => { if (v.value > max) max = v.value; }));
    return max || 1;
  }, [data]);

  return (
    <div className={className}>
      <div className="flex items-end justify-center gap-6 md:gap-10 relative" style={{ height: maxHeight + 32 }}>
        {data.map((group, gi) => (
          <div key={group.label} className="flex flex-col items-center gap-1">
            <div className="flex items-end gap-1">
              {group.values.map((bar, bi) => (
                <div key={bar.key} data-testid={`bar-${gi}-${bi}`} className={`w-8 md:w-10 rounded-t-md transition-all ${bar.color}`} style={{ height: (bar.value / maxValue) * maxHeight }}
                  onMouseEnter={() => { const info = { label: group.label, key: bar.key, value: bar.value }; setHovered(info); onBarHover?.(info); }}
                  onMouseLeave={() => setHovered(null)}
                />
              ))}
            </div>
            <span className="text-[10px] text-ceramic-text-secondary font-medium">{group.label}</span>
          </div>
        ))}
      </div>
      {hovered && <div className="text-center mt-2 text-xs font-medium text-ceramic-text-primary">{hovered.label}: {formatValue(hovered.value)}</div>}
      {legend && (
        <div className="flex justify-center gap-4 mt-3">
          {legend.map(l => (
            <div key={l.key} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-sm ${l.color}`} />
              <span className="text-[10px] text-ceramic-text-secondary">{l.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
