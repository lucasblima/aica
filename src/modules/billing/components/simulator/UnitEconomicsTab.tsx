import type { UnitEconomics } from './types';
import { BarChart } from './charts/BarChart';
import { DollarSign, Clock, Target } from 'lucide-react';
import { Tooltip, InfoTip } from './Tooltip';

interface UnitEconomicsTabProps {
  economics: UnitEconomics;
  cacBRL: number;
}

function MetricCard({ label, value, subtitle, icon: Icon, color, tooltip }: {
  label: string; value: string; subtitle: string; icon: React.ElementType; color: string; tooltip: string;
}) {
  return (
    <Tooltip text={tooltip}>
      <div className="bg-ceramic-base rounded-xl p-4 shadow-ceramic-emboss cursor-help w-full">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className="text-xs text-ceramic-text-secondary">{label}</span>
        </div>
        <div className="text-xl font-semibold text-ceramic-text-primary">{value}</div>
        <div className="text-xs text-ceramic-text-secondary mt-1">{subtitle}</div>
      </div>
    </Tooltip>
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
        <MetricCard
          label="LTV Pro"
          value={formatBRL(economics.ltvPro)}
          subtitle={`${Math.round(economics.ltvPro / cacBRL)}x CAC`}
          icon={DollarSign}
          color="text-ceramic-success"
          tooltip="Lifetime Value do usuario Pro — receita total esperada de um cliente Pro durante toda sua vida util. Quanto maior, mais valioso cada cliente."
        />
        <MetricCard
          label="LTV Teams"
          value={formatBRL(economics.ltvTeams)}
          subtitle={`${Math.round(economics.ltvTeams / cacBRL)}x CAC`}
          icon={DollarSign}
          color="text-ceramic-info"
          tooltip="Lifetime Value do usuario Teams — receita total esperada de um cliente Teams. Geralmente maior que Pro pelo ticket mais alto."
        />
        <MetricCard
          label="CAC Payback"
          value={`${economics.cacPaybackMonths} meses`}
          subtitle={`CAC: ${formatBRL(cacBRL)}`}
          icon={Clock}
          color="text-amber-500"
          tooltip="Meses para recuperar o investimento de aquisição de um cliente (CAC). Ideal: menos de 12 meses. Acima disso, o crescimento consome muito caixa."
        />
        <MetricCard
          label="LTV/CAC Ratio"
          value={`${economics.ltvCacRatio}x`}
          subtitle={economics.ltvCacRatio >= 3 ? 'Saudavel (>3x)' : 'Abaixo do ideal (<3x)'}
          icon={Target}
          color={economics.ltvCacRatio >= 3 ? 'text-ceramic-success' : 'text-ceramic-warning'}
          tooltip="Razao entre o valor do cliente (LTV) e o custo para adquiri-lo (CAC). Benchmark saudavel: acima de 3x. Abaixo de 3x indica que o custo de aquisição esta alto demais."
        />
      </div>

      {/* LTV vs CAC Bar Chart */}
      <div className="bg-ceramic-base rounded-xl p-4 shadow-ceramic-emboss">
        <h3 className="text-sm font-medium text-ceramic-text-primary mb-4 flex items-center">
          LTV vs CAC por Plano
          <InfoTip text="Comparacao visual entre o valor gerado por cada cliente (LTV, verde) e o custo para adquiri-lo (CAC, vermelho). A barra verde deve ser significativamente maior que a vermelha." />
        </h3>
        <BarChart
          groups={barGroups}
          referenceLine={{ value: cacBRL * 3, label: '3x CAC' }}
          formatValue={formatBRL}
        />
      </div>

      {/* Additional Metrics List */}
      <div className="bg-ceramic-base rounded-xl p-4 shadow-ceramic-emboss">
        <h3 className="text-sm font-medium text-ceramic-text-primary mb-3 flex items-center">
          Métricas SaaS
          <InfoTip text="Indicadores-chave de performance para negocio SaaS. Acompanhe estes numeros para avaliar a saúde financeira do produto." />
        </h3>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <Tooltip text="Monthly Recurring Revenue — receita recorrente mensal total de todos os planos pagos.">
            <span className="text-ceramic-text-secondary cursor-help">MRR</span>
          </Tooltip>
          <span className="text-right font-medium">{formatBRL(economics.mrr)}</span>

          <Tooltip text="Annual Recurring Revenue — projecao anual da receita recorrente (MRR x 12). Metrica principal para investidores.">
            <span className="text-ceramic-text-secondary cursor-help">ARR</span>
          </Tooltip>
          <span className="text-right font-medium">{formatBRL(economics.arr)}</span>

          <Tooltip text="Average Revenue Per User — receita media por usuario pagante. Indica o ticket medio do produto.">
            <span className="text-ceramic-text-secondary cursor-help">ARPU</span>
          </Tooltip>
          <span className="text-right font-medium">{formatBRL(economics.arpu)}</span>

          <Tooltip text="Quantos usuarios Free um único usuario Pro subsidia com sua assinatura. Menor = mais eficiente.">
            <span className="text-ceramic-text-secondary cursor-help">Free users / 1 Pro subsidia</span>
          </Tooltip>
          <span className="text-right font-medium">{economics.freeSubsidyRatio} usuarios</span>
        </div>
      </div>
    </div>
  );
}
