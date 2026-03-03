// src/modules/billing/components/simulator/charts/AreaChart.tsx
import { useState } from 'react';
import { InfoTip } from '../Tooltip';

interface AreaSeries {
  key: string;
  values: number[];
  color: string;
  label: string;
}

interface AreaChartProps {
  series: AreaSeries[];
  labels: string[];
  height?: number;
  formatValue?: (v: number) => string;
  highlightIndex?: number | null;
  title?: string;
  titleTooltip?: string;
}

export function AreaChart({ series, labels, height = 240, formatValue = String, highlightIndex, title, titleTooltip }: AreaChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const padding = { top: 20, right: 20, bottom: 30, left: 60 };
  const width = 800;
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  // Find max across all series for Y scale (NOT stacked — overlay)
  const allValues = series.flatMap(s => s.values);
  const maxVal = Math.max(...allValues, 1);

  const xStep = innerW / Math.max(labels.length - 1, 1);
  const yScale = (v: number) => innerH - (v / maxVal) * innerH;

  // Build SVG path for each series
  const buildPath = (values: number[]) => {
    const points = values.map((v, i) => `${i * xStep},${yScale(v)}`);
    return `M${points.join(' L')}`;
  };

  const buildArea = (values: number[]) => {
    const line = buildPath(values);
    return `${line} L${(values.length - 1) * xStep},${innerH} L0,${innerH} Z`;
  };

  // Y-axis ticks
  const yTicks = Array.from({ length: 5 }, (_, i) => Math.round((maxVal / 4) * i));

  return (
    <div className="bg-ceramic-base rounded-xl p-4 shadow-ceramic-emboss">
      {title && (
        <h3 className="text-sm font-medium text-ceramic-text-primary mb-3 flex items-center">
          {title}
          {titleTooltip && <InfoTip text={titleTooltip} />}
        </h3>
      )}
      <div className="flex gap-4 mb-3 text-xs">
        {series.map(s => (
          <div key={s.key} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="text-ceramic-text-secondary">{s.label}</span>
          </div>
        ))}
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
        <g transform={`translate(${padding.left},${padding.top})`}>
          {/* Y-axis grid + labels */}
          {yTicks.map(tick => (
            <g key={tick}>
              <line x1={0} x2={innerW} y1={yScale(tick)} y2={yScale(tick)} stroke="#e2e8f0" strokeDasharray="4" />
              <text x={-8} y={yScale(tick) + 4} textAnchor="end" className="text-[10px] fill-ceramic-text-secondary">{formatValue(tick)}</text>
            </g>
          ))}

          {/* Areas */}
          {series.map(s => (
            <g key={s.key}>
              <defs>
                <linearGradient id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <path d={buildArea(s.values)} fill={`url(#grad-${s.key})`} />
              <path d={buildPath(s.values)} fill="none" stroke={s.color} strokeWidth={2} />
            </g>
          ))}

          {/* Break-even highlight */}
          {highlightIndex != null && (
            <line
              x1={highlightIndex * xStep} x2={highlightIndex * xStep}
              y1={0} y2={innerH}
              stroke="#22c55e" strokeWidth={2} strokeDasharray="6"
            />
          )}

          {/* X-axis labels (every 3rd) */}
          {labels.map((label, i) => (
            i % 3 === 0 && (
              <text key={i} x={i * xStep} y={innerH + 18} textAnchor="middle" className="text-[10px] fill-ceramic-text-secondary">{label}</text>
            )
          ))}

          {/* Hover detection zones */}
          {labels.map((_, i) => (
            <rect
              key={i}
              x={i * xStep - xStep / 2}
              y={0}
              width={xStep}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            />
          ))}

          {/* Tooltip — flips left when near right edge to stay within viewport */}
          {hoverIdx !== null && (() => {
            const tooltipW = 130;
            const xPos = hoverIdx * xStep;
            const flipLeft = xPos + tooltipW + 15 > innerW;
            return (
              <g transform={`translate(${xPos}, 0)`}>
                <line y1={0} y2={innerH} stroke="#94a3b8" strokeDasharray="2" />
                <foreignObject x={flipLeft ? -tooltipW - 10 : 10} y={0} width={tooltipW} height={series.length * 20 + 20}>
                  <div className="bg-ceramic-base/95 backdrop-blur border border-ceramic-border rounded p-1.5 text-[10px] shadow-lg">
                    <div className="font-medium text-ceramic-text-primary mb-0.5">{labels[hoverIdx]}</div>
                    {series.map(s => (
                      <div key={s.key} className="flex justify-between gap-2">
                        <span style={{ color: s.color }}>{s.label}</span>
                        <span className="text-ceramic-text-primary">{formatValue(s.values[hoverIdx])}</span>
                      </div>
                    ))}
                  </div>
                </foreignObject>
              </g>
            );
          })()}
        </g>
      </svg>
    </div>
  );
}
