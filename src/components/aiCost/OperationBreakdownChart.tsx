import React, { useMemo } from 'react';
import type { OperationCostBreakdown } from '../../types/aiCost';
import { getOperationLabel, getOperationColor, formatCredits, formatPercentage } from '../../types/aiCost';

interface OperationBreakdownChartProps {
  data: OperationCostBreakdown[];
}

export const OperationBreakdownChart: React.FC<OperationBreakdownChartProps> = ({ data }) => {
  const segments = useMemo(() => {
    let startAngle = 0;
    return data.slice(0, 6).map((item) => {
      const angle = (item.percentage / 100) * 360;
      const segment = {
        ...item,
        startAngle,
        endAngle: startAngle + angle,
        color: getOperationColor(item.operation_type),
        label: getOperationLabel(item.operation_type)
      };
      startAngle += angle;
      return segment;
    });
  }, [data]);

  const createArcPath = (startAngle: number, endAngle: number, innerR: number, outerR: number) => {
    const start = polarToCartesian(50, 50, outerR, endAngle);
    const end = polarToCartesian(50, 50, outerR, startAngle);
    const innerStart = polarToCartesian(50, 50, innerR, endAngle);
    const innerEnd = polarToCartesian(50, 50, innerR, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

    return `M ${start.x} ${start.y} A ${outerR} ${outerR} 0 ${largeArcFlag} 0 ${end.x} ${end.y} L ${innerEnd.x} ${innerEnd.y} A ${innerR} ${innerR} 0 ${largeArcFlag} 1 ${innerStart.x} ${innerStart.y} Z`;
  };

  const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const totalCredits = data.reduce((sum, d) => sum + d.total_credits, 0);

  if (data.length === 0) {
    return (
      <div className="ceramic-card p-6">
        <h3 className="text-lg font-semibold text-ceramic-text-primary mb-4">Por Tipo de Operação</h3>
        <div className="ceramic-inset p-8 rounded-xl text-center">
          <p className="text-sm text-ceramic-text-secondary">Nenhum dado disponível</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ceramic-card p-6">
      <h3 className="text-lg font-semibold text-ceramic-text-primary mb-4">Por Tipo de Operação</h3>
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="relative w-48 h-48">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {segments.map((seg, i) => (
              <path
                key={i}
                d={createArcPath(seg.startAngle, seg.endAngle, 25, 40)}
                fill={seg.color}
                className="transition-all duration-300 hover:opacity-80"
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-xs text-ceramic-text-secondary">Total</p>
            <p className="text-lg font-bold text-ceramic-text-primary">{formatCredits(totalCredits)}</p>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          {segments.map((seg, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }} />
                <span className="text-sm text-ceramic-text-primary">{seg.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-ceramic-text-secondary">
                  {formatCredits(seg.total_credits)} ({formatPercentage(seg.percentage)})
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
