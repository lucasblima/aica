// src/modules/billing/components/simulator/PricingScenariosTab.tsx
import { useState } from 'react';
import type { SimulationInput } from './types';
import { runSimulation } from './useSimulation';
import { LineChart } from './charts/LineChart';
import { Tooltip, InfoTip } from './Tooltip';

interface PricingScenariosTabProps {
  baseInput: SimulationInput;
}

interface ScenarioConfig {
  name: string;
  priceProBRL: number;
  creditsPro: number;
  priceTeamsBRL: number;
  creditsTeams: number;
}

const SCENARIO_COLORS = ['#22c55e', '#3b82f6', '#f59e0b'];

function ScenarioColumn({ config, onUpdate, color, result, onPromote, isFirst }: {
  config: ScenarioConfig;
  onUpdate: (patch: Partial<ScenarioConfig>) => void;
  color: string;
  result: { mrrM12: number; mrrM24: number; breakEven: number | null; margin24: number; ltvCac: number };
  onPromote?: () => void;
  isFirst: boolean;
}) {
  const formatBRL = (v: number) => `R$ ${v.toLocaleString('pt-BR')}`;

  return (
    <div className="flex-1 bg-ceramic-base rounded-xl p-4 shadow-ceramic-emboss">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        <input
          value={config.name}
          onChange={e => onUpdate({ name: e.target.value })}
          className="text-sm font-semibold bg-transparent border-b border-ceramic-border text-ceramic-text-primary w-full"
          title="Clique para renomear este cenario"
        />
        {!isFirst && onPromote && (
          <button
            onClick={onPromote}
            title="Promover este cenario para a posição Atual (primeiro cenario)"
            className="shrink-0 text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors"
          >
            ★ Atual
          </button>
        )}
      </div>

      <div className="space-y-2 text-sm mb-4">
        <label className="flex justify-between">
          <Tooltip text="Preço mensal do plano Pro neste cenario" position="bottom">
            <span className="text-ceramic-text-secondary cursor-help">Pro (R$)</span>
          </Tooltip>
          <input type="number" value={config.priceProBRL} onChange={e => onUpdate({ priceProBRL: Number(e.target.value) })} step={5} className="w-20 text-right bg-ceramic-cool border border-ceramic-border rounded px-2 py-0.5 text-sm" />
        </label>
        <label className="flex justify-between">
          <Tooltip text="Créditos de IA inclusos no plano Pro neste cenario" position="bottom">
            <span className="text-ceramic-text-secondary cursor-help">Pro créditos</span>
          </Tooltip>
          <input type="number" value={config.creditsPro} onChange={e => onUpdate({ creditsPro: Number(e.target.value) })} step={500} className="w-20 text-right bg-ceramic-cool border border-ceramic-border rounded px-2 py-0.5 text-sm" />
        </label>
        <label className="flex justify-between">
          <Tooltip text="Preço mensal do plano Teams neste cenario" position="bottom">
            <span className="text-ceramic-text-secondary cursor-help">Teams (R$)</span>
          </Tooltip>
          <input type="number" value={config.priceTeamsBRL} onChange={e => onUpdate({ priceTeamsBRL: Number(e.target.value) })} step={10} className="w-20 text-right bg-ceramic-cool border border-ceramic-border rounded px-2 py-0.5 text-sm" />
        </label>
        <label className="flex justify-between">
          <Tooltip text="Créditos de IA inclusos no plano Teams neste cenario" position="bottom">
            <span className="text-ceramic-text-secondary cursor-help">Teams créditos</span>
          </Tooltip>
          <input type="number" value={config.creditsTeams} onChange={e => onUpdate({ creditsTeams: Number(e.target.value) })} step={1000} className="w-20 text-right bg-ceramic-cool border border-ceramic-border rounded px-2 py-0.5 text-sm" />
        </label>
      </div>

      <div className="border-t border-ceramic-border pt-3 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <Tooltip text="Receita recorrente mensal projetada para o mes 12" position="bottom">
            <span className="text-ceramic-text-secondary cursor-help">MRR M12</span>
          </Tooltip>
          <span className="font-medium">{formatBRL(result.mrrM12)}</span>
        </div>
        <div className="flex justify-between">
          <Tooltip text="Receita recorrente mensal projetada para o mes 24" position="bottom">
            <span className="text-ceramic-text-secondary cursor-help">MRR M24</span>
          </Tooltip>
          <span className="font-medium">{formatBRL(result.mrrM24)}</span>
        </div>
        <div className="flex justify-between">
          <Tooltip text="Mes em que a receita supera os custos pela primeira vez — ponto de equilibrio" position="bottom">
            <span className="text-ceramic-text-secondary cursor-help">Break-even</span>
          </Tooltip>
          <span className="font-medium">{result.breakEven ? `Mes ${result.breakEven}` : 'N/A'}</span>
        </div>
        <div className="flex justify-between">
          <Tooltip text="Margem bruta percentual no mes 24. Acima de 70% e saudavel para SaaS." position="bottom">
            <span className="text-ceramic-text-secondary cursor-help">Margem M24</span>
          </Tooltip>
          <span className="font-medium">{result.margin24.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <Tooltip text="Razao LTV/CAC neste cenario. Acima de 3x indica negocio sustentavel." position="bottom">
            <span className="text-ceramic-text-secondary cursor-help">LTV/CAC</span>
          </Tooltip>
          <span className="font-medium">{result.ltvCac.toFixed(1)}x</span>
        </div>
      </div>
    </div>
  );
}

export function PricingScenariosTab({ baseInput }: PricingScenariosTabProps) {
  const [scenarios, setScenarios] = useState<ScenarioConfig[]>([
    { name: 'Atual', priceProBRL: baseInput.pricing.priceProBRL, creditsPro: baseInput.pricing.creditsPro, priceTeamsBRL: baseInput.pricing.priceTeamsBRL, creditsTeams: baseInput.pricing.creditsTeams },
    { name: 'Cenario B', priceProBRL: 29.90, creditsPro: 3000, priceTeamsBRL: 99, creditsTeams: 12000 },
    { name: 'Cenario C', priceProBRL: 59.90, creditsPro: 8000, priceTeamsBRL: 199, creditsTeams: 30000 },
  ]);

  const promoteToAtual = (index: number) => {
    const promoted = scenarios[index];
    const oldAtual = scenarios[0];
    const otherIdx = index === 1 ? 2 : 1;
    const other = scenarios[otherIdx];
    setScenarios([
      { ...promoted, name: 'Atual' },
      { ...oldAtual, name: oldAtual.name === 'Atual' ? 'Cenario B' : oldAtual.name },
      { ...other },
    ]);
  };

  // Use runSimulation (pure function, NOT hook) to avoid rules-of-hooks violation
  const results = scenarios.map(s => {
    const input: SimulationInput = {
      ...baseInput,
      pricing: { ...baseInput.pricing, priceProBRL: s.priceProBRL, creditsPro: s.creditsPro, priceTeamsBRL: s.priceTeamsBRL, creditsTeams: s.creditsTeams },
    };
    return runSimulation(input);
  });

  const lineData = scenarios.map((s, i) => ({
    key: s.name,
    values: results[i].monthly.map(r => r.mrrBRL),
    color: SCENARIO_COLORS[i],
    label: s.name,
  }));

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        {scenarios.map((s, i) => (
          <ScenarioColumn
            key={i}
            config={s}
            color={SCENARIO_COLORS[i]}
            isFirst={i === 0}
            onPromote={i > 0 ? () => promoteToAtual(i) : undefined}
            onUpdate={patch => {
              const updated = [...scenarios];
              updated[i] = { ...updated[i], ...patch };
              setScenarios(updated);
            }}
            result={{
              mrrM12: results[i].monthly[11]?.mrrBRL ?? 0,
              mrrM24: results[i].monthly[23]?.mrrBRL ?? 0,
              breakEven: results[i].breakEvenMonth,
              margin24: results[i].monthly[23]?.marginPct ?? 0,
              ltvCac: results[i].unitEconomics.ltvCacRatio,
            }}
          />
        ))}
      </div>

      <div className="bg-ceramic-base rounded-xl p-4 shadow-ceramic-emboss">
        <h3 className="text-sm font-medium text-ceramic-text-primary mb-4 flex items-center">
          MRR — Comparacao 24 meses
          <InfoTip text="Grafico comparando a evolucao do MRR ao longo de 24 meses para cada cenario. Permite visualizar qual estrategia de pricing gera mais receita no longo prazo." />
        </h3>
        <LineChart
          series={lineData}
          labels={Array.from({ length: 24 }, (_, i) => `M${i + 1}`)}
          formatValue={v => `R$ ${v.toLocaleString('pt-BR')}`}
        />
      </div>
    </div>
  );
}
