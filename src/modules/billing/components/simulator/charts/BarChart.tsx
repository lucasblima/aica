// src/modules/billing/components/simulator/charts/BarChart.tsx

interface BarGroup {
  label: string;
  bars: { key: string; value: number; color: string }[];
}

interface BarChartProps {
  groups: BarGroup[];
  height?: number;
  referenceLine?: { value: number; label: string };
  formatValue?: (v: number) => string;
}

export function BarChart({ groups, height = 200, referenceLine, formatValue = String }: BarChartProps) {
  const padding = { top: 20, right: 20, bottom: 30, left: 60 };
  const width = 400;
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const allValues = groups.flatMap(g => g.bars.map(b => b.value));
  if (referenceLine) allValues.push(referenceLine.value);
  const maxVal = Math.max(...allValues, 1);

  const groupWidth = innerW / groups.length;
  const barWidth = Math.min(40, (groupWidth - 20) / Math.max(groups[0]?.bars.length ?? 1, 1));
  const yScale = (v: number) => innerH - (v / maxVal) * innerH;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: height }}>
      <g transform={`translate(${padding.left},${padding.top})`}>
        {/* Y grid */}
        {Array.from({ length: 5 }, (_, i) => Math.round((maxVal / 4) * i)).map(tick => (
          <g key={tick}>
            <line x1={0} x2={innerW} y1={yScale(tick)} y2={yScale(tick)} stroke="#e2e8f0" strokeDasharray="4" />
            <text x={-8} y={yScale(tick) + 4} textAnchor="end" className="text-[10px] fill-ceramic-text-secondary">{formatValue(tick)}</text>
          </g>
        ))}

        {/* Bars */}
        {groups.map((group, gi) => {
          const groupX = gi * groupWidth + groupWidth / 2;
          return (
            <g key={group.label}>
              {group.bars.map((bar, bi) => {
                const x = groupX - (group.bars.length * barWidth) / 2 + bi * barWidth;
                const barH = (bar.value / maxVal) * innerH;
                return (
                  <g key={bar.key}>
                    <rect x={x} y={innerH - barH} width={barWidth - 2} height={barH} fill={bar.color} rx={3} />
                    <text x={x + barWidth / 2 - 1} y={innerH - barH - 4} textAnchor="middle" className="text-[9px] fill-ceramic-text-primary">{formatValue(bar.value)}</text>
                  </g>
                );
              })}
              <text x={groupX} y={innerH + 18} textAnchor="middle" className="text-[11px] fill-ceramic-text-secondary">{group.label}</text>
            </g>
          );
        })}

        {/* Reference line */}
        {referenceLine && (
          <g>
            <line x1={0} x2={innerW} y1={yScale(referenceLine.value)} y2={yScale(referenceLine.value)} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="6" />
            <text x={innerW + 4} y={yScale(referenceLine.value) + 4} className="text-[10px] fill-amber-500">{referenceLine.label}</text>
          </g>
        )}
      </g>
    </svg>
  );
}
