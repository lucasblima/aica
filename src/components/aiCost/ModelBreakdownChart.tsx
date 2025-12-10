import React from 'react';
import type { ModelCostBreakdown } from '../../types/aiCost';
import { getModelLabel, formatUSD, formatPercentage } from '../../types/aiCost';

interface ModelBreakdownChartProps {
  data: ModelCostBreakdown[];
}

const MODEL_COLORS: Record<string, string> = {
  'gemini-2.0-flash': '#3b82f6',
  'gemini-1.5-pro': '#8b5cf6',
  'gemini-1.5-flash': '#6366f1',
  'veo-2': '#ec4899',
  'imagen-3': '#a855f7',
  'whisper-large-v3': '#10b981',
  'text-embedding-004': '#06b6d4'
};

export const ModelBreakdownChart: React.FC<ModelBreakdownChartProps> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className="ceramic-card p-6">
        <h3 className="text-lg font-semibold text-ceramic-text-primary mb-4">Por Modelo de IA</h3>
        <div className="ceramic-inset p-8 rounded-xl text-center">
          <p className="text-sm text-ceramic-text-secondary">Nenhum dado disponível</p>
        </div>
      </div>
    );
  }

  const maxCost = Math.max(...data.map((d) => d.total_cost_usd), 1);
  const totalCost = data.reduce((sum, d) => sum + d.total_cost_usd, 0);

  return (
    <div className="ceramic-card p-6">
      <h3 className="text-lg font-semibold text-ceramic-text-primary mb-4">Por Modelo de IA</h3>
      <div className="space-y-3">
        {data.slice(0, 6).map((model, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ceramic-text-primary">{getModelLabel(model.ai_model)}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-ceramic-text-secondary">{formatPercentage(model.percentage)}</span>
                <span className="text-sm font-bold text-ceramic-text-primary w-20 text-right">{formatUSD(model.total_cost_usd)}</span>
              </div>
            </div>
            <div className="ceramic-trough p-1 rounded-full">
              <div
                className="h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${(model.total_cost_usd / maxCost) * 100}%`,
                  backgroundColor: MODEL_COLORS[model.ai_model] || '#6b7280'
                }}
              />
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <div className="ceramic-inset p-6 rounded-xl text-center">
            <p className="text-sm text-ceramic-text-secondary">Nenhum modelo usado ainda</p>
          </div>
        )}
      </div>
    </div>
  );
};
