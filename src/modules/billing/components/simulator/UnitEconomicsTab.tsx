import type { UnitEconomics } from './types';
import { BarChart } from './charts/BarChart';
import { DollarSign, Clock, Target } from 'lucide-react';

interface UnitEconomicsTabProps {
  economics: UnitEconomics;
  cacBRL: number;
}

function MetricCard({ label, value, subtitle, icon: Icon, color }: {
  label: string; value: string; subtitle: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-ceramic-base rounded-xl p-4 shadow-ceramic-emboss">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-ceramic-text-secondary">{label}</span>
      </div>
      <div className="text-xl font-semibold text-ceramic-text-primary">{value}</div>
      <div className="text-xs text-ceramic-text-secondary mt-1">{subtitle}</div>
    </div>
  );
}

export function UnitEconomicsTab({ economics, cacBRL }: UnitEconomicsTabProps) {
  const formatBRL = (v: number) => `R$ ${v.toLocaleString('pt-BR')}`;

  const barGroups = [
    {
      label: 'Pro',
      bars: [
        { key: 'ltv', value: economics.ltvPro, color: '#22c55e' },
        { key: 'cac', value: cacBRL, color: '#ef4444' },
      ],
    },
    {
      label: 'Teams',
      bars: [
        { key: 'ltv', value: economics.ltvTeams, color: '#22c55e' },
        { key: 'cac', value: cacBRL, color: '#ef4444' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="LTV Pro" value={formatBRL(economics.ltvPro)} subtitle={`${Math.round(economics.ltvPro / cacBRL)}x CAC`} icon={DollarSign} color="text-ceramic-success" />
        <MetricCard label="LTV Teams" value={formatBRL(economics.ltvTeams)} subtitle={`${Math.round(economics.ltvTeams / cacBRL)}x CAC`} icon={DollarSign} color="text-ceramic-info" />
        <MetricCard label="CAC Payback" value={`${economics.cacPaybackMonths} meses`} subtitle={`CAC: ${formatBRL(cacBRL)}`} icon={Clock} color="text-amber-500" />
        <MetricCard label="LTV/CAC Ratio" value={`${economics.ltvCacRatio}x`} subtitle={economics.ltvCacRatio >= 3 ? 'Saudavel (>3x)' : 'Abaixo do ideal (<3x)'} icon={Target} color={economics.ltvCacRatio >= 3 ? 'text-ceramic-success' : 'text-ceramic-warning'} />
      </div>

      {/* LTV vs CAC Bar Chart */}
      <div className="bg-ceramic-base rounded-xl p-4 shadow-ceramic-emboss">
        <h3 className="text-sm font-medium text-ceramic-text-primary mb-4">LTV vs CAC por Plano</h3>
        <BarChart
          groups={barGroups}
          referenceLine={{ value: cacBRL * 3, label: '3x CAC' }}
          formatValue={formatBRL}
        />
      </div>

      {/* Additional Metrics List */}
      <div className="bg-ceramic-base rounded-xl p-4 shadow-ceramic-emboss">
        <h3 className="text-sm font-medium text-ceramic-text-primary mb-3">Metricas SaaS</h3>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <span className="text-ceramic-text-secondary">MRR</span>
          <span className="text-right font-medium">{formatBRL(economics.mrr)}</span>
          <span className="text-ceramic-text-secondary">ARR</span>
          <span className="text-right font-medium">{formatBRL(economics.arr)}</span>
          <span className="text-ceramic-text-secondary">ARPU</span>
          <span className="text-right font-medium">{formatBRL(economics.arpu)}</span>
          <span className="text-ceramic-text-secondary">Free users / 1 Pro subsidia</span>
          <span className="text-right font-medium">{economics.freeSubsidyRatio} usuarios</span>
        </div>
      </div>
    </div>
  );
}
