// src/modules/billing/components/simulator/PLTab.tsx
import type { MonthlyRow } from './types';
import { AreaChart } from './charts/AreaChart';

interface PLTabProps {
  monthly: MonthlyRow[];
  breakEvenMonth: number | null;
}

export function PLTab({ monthly, breakEvenMonth }: PLTabProps) {
  const formatBRL = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;

  const chartSeries = [
    { key: 'revenue', values: monthly.map(r => r.mrrBRL), color: '#22c55e', label: 'Receita' },
    { key: 'fixed', values: monthly.map(r => r.fixedCostBRL), color: '#94a3b8', label: 'Custo Fixo' },
    { key: 'ai', values: monthly.map(r => r.aiCostBRL), color: '#f59e0b', label: 'Custo AI' },
  ];
  const labels = monthly.map(r => `M${r.month}`);

  return (
    <div className="space-y-6">
      <AreaChart
        series={chartSeries}
        labels={labels}
        highlightIndex={breakEvenMonth ? breakEvenMonth - 1 : null}
        formatValue={formatBRL}
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-ceramic-text-secondary border-b border-ceramic-border">
              <th className="text-left py-2 px-2">Mes</th>
              <th className="text-right px-2">Usuarios</th>
              <th className="text-right px-2">Free</th>
              <th className="text-right px-2">Pro</th>
              <th className="text-right px-2">Teams</th>
              <th className="text-right px-2">MRR</th>
              <th className="text-right px-2">Custo Fixo</th>
              <th className="text-right px-2">Custo AI</th>
              <th className="text-right px-2">Margem</th>
              <th className="text-right px-2">%</th>
            </tr>
          </thead>
          <tbody>
            {monthly.map(row => (
              <tr
                key={row.month}
                className={`border-b border-ceramic-border/50 ${
                  row.month === breakEvenMonth ? 'bg-ceramic-success/10' : ''
                }`}
              >
                <td className="py-1.5 px-2 font-medium">M{row.month}</td>
                <td className="text-right px-2">{row.totalUsers}</td>
                <td className="text-right px-2 text-ceramic-text-secondary">{row.freeUsers}</td>
                <td className="text-right px-2">{row.proUsers}</td>
                <td className="text-right px-2">{row.teamsUsers}</td>
                <td className="text-right px-2 text-ceramic-success">{formatBRL(row.mrrBRL)}</td>
                <td className="text-right px-2 text-ceramic-text-secondary">{formatBRL(row.fixedCostBRL)}</td>
                <td className="text-right px-2 text-amber-500">{formatBRL(row.aiCostBRL)}</td>
                <td className={`text-right px-2 font-medium ${row.grossMarginBRL >= 0 ? 'text-ceramic-success' : 'text-ceramic-error'}`}>
                  {formatBRL(row.grossMarginBRL)}
                </td>
                <td className="text-right px-2">{row.marginPct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
