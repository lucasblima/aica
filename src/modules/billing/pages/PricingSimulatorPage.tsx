import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { VariablePanel } from '../components/simulator/VariablePanel';
import { PLTab } from '../components/simulator/PLTab';
import { UnitEconomicsTab } from '../components/simulator/UnitEconomicsTab';
import { PricingScenariosTab } from '../components/simulator/PricingScenariosTab';
import { useSimulation } from '../components/simulator/useSimulation';
import { useBaselineData } from '../components/simulator/useBaselineData';
import { useExchangeRate } from '../components/simulator/useExchangeRate';
import { ExchangeRateCard } from '../components/simulator/ExchangeRateCard';
import { DEFAULT_SIMULATION } from '../components/simulator/simulatorDefaults';
import type { SimulationInput } from '../components/simulator/types';
import { Tooltip } from '../components/simulator/Tooltip';

const TABS = ['P&L Mensal', 'Unit Economics', 'Cenarios'] as const;

const TAB_TOOLTIPS: Record<typeof TABS[number], string> = {
  'P&L Mensal': 'Demonstrativo de Resultados — veja receita, custos e margem mes a mes por 24 meses.',
  'Unit Economics': 'Metricas por usuario — LTV, CAC, payback e indicadores de saude do negocio SaaS.',
  'Cenarios': 'Compare ate 3 estrategias de pricing lado a lado e veja qual gera mais receita.',
};

export function PricingSimulatorPage() {
  const navigate = useNavigate();
  const { input: baselineInput, isLoading } = useBaselineData();
  const [input, setInput] = useState<SimulationInput>(DEFAULT_SIMULATION);
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('P&L Mensal');
  const exchangeRate = useExchangeRate();

  // Merge baseline when loaded
  useEffect(() => {
    if (!isLoading) setInput(baselineInput);
  }, [isLoading, baselineInput]);

  // Auto-apply live exchange rate on first load
  useEffect(() => {
    if (exchangeRate.data && !isLoading) {
      setInput(prev => ({
        ...prev,
        costs: {
          ...prev.costs,
          exchangeRate: parseFloat(exchangeRate.data!.usdBrl.toFixed(2)),
        },
      }));
    }
  }, [exchangeRate.data, isLoading]);

  const handleUpdate = useCallback((patch: Partial<SimulationInput>) => {
    setInput(prev => ({
      ...prev,
      ...patch,
      pricing: { ...prev.pricing, ...patch.pricing },
      costs: { ...prev.costs, ...patch.costs },
      growth: { ...prev.growth, ...patch.growth },
      conversion: { ...prev.conversion, ...patch.conversion },
      usage: { ...prev.usage, ...patch.usage },
      acquisition: { ...prev.acquisition, ...patch.acquisition },
    }));
  }, []);

  const simulation = useSimulation(input);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-ceramic-cool">
        <div className="text-ceramic-text-secondary">Carregando dados reais...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-ceramic-cool">
      <VariablePanel input={input} onUpdate={handleUpdate} />

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <span title="Voltar para o painel principal AICA">
              <Logo width={36} onClick={() => navigate('/vida')} className="rounded-lg" />
            </span>
            <button
              onClick={() => navigate('/admin')}
              className="w-9 h-9 ceramic-card-flat flex items-center justify-center rounded-full"
              aria-label="Voltar"
              title="Voltar para o painel Admin"
            >
              <ArrowLeft className="w-4 h-4 text-ceramic-text-secondary" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-ceramic-text-primary leading-tight" title="Ferramenta de simulacao financeira para testar diferentes estrategias de pricing do AICA">Simulador de Pricing</h1>
              <p className="text-sm text-ceramic-text-secondary">
                Ajuste as variaveis na barra lateral e veja o impacto em tempo real.
              </p>
            </div>
          </div>

          {/* Exchange rate card */}
          <div className="mb-6">
            <ExchangeRateCard
              data={exchangeRate.data}
              isLoading={exchangeRate.isLoading}
              error={exchangeRate.error}
              currentSimRate={input.costs.exchangeRate}
              onApplyRate={(rate) =>
                setInput(prev => ({
                  ...prev,
                  costs: { ...prev.costs, exchangeRate: rate },
                }))
              }
            />
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 mb-6 bg-ceramic-base rounded-lg p-1">
            {TABS.map(tab => (
              <Tooltip key={tab} text={TAB_TOOLTIPS[tab]} position="bottom">
                <button
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 px-4 text-sm rounded-md transition-colors ${
                    activeTab === tab
                      ? 'bg-amber-500 text-white font-medium'
                      : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'
                  }`}
                >
                  {tab}
                </button>
              </Tooltip>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'P&L Mensal' && (
            <PLTab monthly={simulation.monthly} breakEvenMonth={simulation.breakEvenMonth} />
          )}
          {activeTab === 'Unit Economics' && (
            <UnitEconomicsTab economics={simulation.unitEconomics} cacBRL={input.acquisition.cacBRL} />
          )}
          {activeTab === 'Cenarios' && (
            <PricingScenariosTab baseInput={input} />
          )}
        </div>
      </main>
    </div>
  );
}
