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
import { DEFAULT_SIMULATION } from '../components/simulator/simulatorDefaults';
import type { SimulationInput } from '../components/simulator/types';

const TABS = ['P&L Mensal', 'Unit Economics', 'Cenarios'] as const;

export function PricingSimulatorPage() {
  const navigate = useNavigate();
  const { input: baselineInput, isLoading } = useBaselineData();
  const [input, setInput] = useState<SimulationInput>(DEFAULT_SIMULATION);
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('P&L Mensal');

  // Merge baseline when loaded
  useEffect(() => {
    if (!isLoading) setInput(baselineInput);
  }, [isLoading, baselineInput]);

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
            <Logo width={36} onClick={() => navigate('/vida')} className="rounded-lg" />
            <button
              onClick={() => navigate('/admin')}
              className="w-9 h-9 ceramic-card-flat flex items-center justify-center rounded-full"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-4 h-4 text-ceramic-text-secondary" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-ceramic-text-primary leading-tight">Simulador de Pricing</h1>
              <p className="text-sm text-ceramic-text-secondary">
                Ajuste as variaveis na barra lateral e veja o impacto em tempo real.
              </p>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 mb-6 bg-ceramic-base rounded-lg p-1">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 px-4 text-sm rounded-md transition-colors ${
                  activeTab === tab
                    ? 'bg-amber-500 text-white font-medium'
                    : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'
                }`}
              >
                {tab}
              </button>
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
