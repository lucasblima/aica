// src/modules/billing/components/simulator/PLTab.tsx
import type { MonthlyRow } from './types';
import { AreaChart } from './charts/AreaChart';
import { Tooltip } from './Tooltip';

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
        title="Receita vs Custos — 24 meses"
        titleTooltip="Grafico de area mostrando a evolucao mensal da receita (MRR) comparada aos custos fixos e de IA. A linha tracejada verde marca o mes de break-even."
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-ceramic-text-secondary border-b border-ceramic-border">
              <th className="text-left py-2 px-2">
                <Tooltip text="Numero do mes na simulacao (M1 = primeiro mes)" position="bottom">
                  <span className="cursor-help">Mes</span>
                </Tooltip>
              </th>
              <th className="text-right px-2">
                <Tooltip text="Total de usuarios ativos naquele mes (Free + Pro + Teams)" position="bottom">
                  <span className="cursor-help">Usuarios</span>
                </Tooltip>
              </th>
              <th className="text-right px-2">
                <Tooltip text="Usuarios no plano gratuito. Nao geram receita mas consomem creditos de IA." position="bottom">
                  <span className="cursor-help">Free</span>
                </Tooltip>
              </th>
              <th className="text-right px-2">
                <Tooltip text="Usuarios pagantes do plano Pro. Principal fonte de receita individual." position="bottom">
                  <span className="cursor-help">Pro</span>
                </Tooltip>
              </th>
              <th className="text-right px-2">
                <Tooltip text="Usuarios pagantes do plano Teams. Maior ticket medio por usuario." position="bottom">
                  <span className="cursor-help">Teams</span>
                </Tooltip>
              </th>
              <th className="text-right px-2">
                <Tooltip text="Monthly Recurring Revenue — receita recorrente mensal. Soma de todas as assinaturas ativas." position="bottom">
                  <span className="cursor-help">MRR</span>
                </Tooltip>
              </th>
              <th className="text-right px-2">
                <Tooltip text="Custos fixos mensais de infraestrutura (Supabase + Cloud Run), convertidos para BRL." position="bottom">
                  <span className="cursor-help">Custo Fixo</span>
                </Tooltip>
              </th>
              <th className="text-right px-2">
                <Tooltip text="Custo variavel de IA (Gemini) proporcional ao uso dos usuarios. Cresce com a base." position="bottom">
                  <span className="cursor-help">Custo AI</span>
                </Tooltip>
              </th>
              <th className="text-right px-2">
                <Tooltip text="Margem bruta = MRR - Custo Fixo - Custo AI. Positivo = lucro operacional." position="bottom">
                  <span className="cursor-help">Margem</span>
                </Tooltip>
              </th>
              <th className="text-right px-2">
                <Tooltip text="Margem bruta em percentual do MRR. Acima de 70% e saudavel para SaaS." position="bottom">
                  <span className="cursor-help">%</span>
                </Tooltip>
              </th>
            </tr>
          </thead>
          <tbody>
            {monthly.map(row => (
              <tr
                key={row.month}
                className={`border-b border-ceramic-border/50 ${
                  row.month === breakEvenMonth ? 'bg-ceramic-success/10' : ''
                }`}
                title={row.month === breakEvenMonth ? 'Mes de break-even! A partir daqui a receita cobre todos os custos.' : undefined}
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
