import { useState } from 'react';
import { ChevronDown, DollarSign, Users, TrendingUp, Percent, CreditCard, Megaphone } from 'lucide-react';
import type { SimulationInput } from './types';
import { InfoTip } from './Tooltip';

interface VariablePanelProps {
  input: SimulationInput;
  onUpdate: (patch: Partial<SimulationInput>) => void;
}

// Helper: labeled number input with optional tooltip
function NumInput({ label, value, onChange, min = 0, max, step = 1, suffix, tooltip }: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; suffix?: string; tooltip?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-sm">
      <span className="text-ceramic-text-secondary truncate flex items-center">
        {label}
        {tooltip && <InfoTip text={tooltip} position="bottom" />}
      </span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={e => onChange(Number(e.target.value))}
          className="w-20 text-right bg-ceramic-cool border border-ceramic-border rounded px-2 py-1 text-sm text-ceramic-text-primary"
        />
        {suffix && <span className="text-xs text-ceramic-text-secondary">{suffix}</span>}
      </div>
    </label>
  );
}

// Collapsible section with optional tooltip on the header
function Section({ title, icon: Icon, children, defaultOpen = true, tooltip }: {
  title: string; icon: React.ElementType; children: React.ReactNode; defaultOpen?: boolean; tooltip?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-ceramic-border pb-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left py-2 text-sm font-medium text-ceramic-text-primary"
      >
        <Icon className="w-4 h-4 text-amber-500" />
        {title}
        {tooltip && <InfoTip text={tooltip} position="bottom" />}
        <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="space-y-2 pl-6">{children}</div>}
    </div>
  );
}

export function VariablePanel({ input, onUpdate }: VariablePanelProps) {
  const updatePricing = (patch: Partial<SimulationInput['pricing']>) =>
    onUpdate({ pricing: { ...input.pricing, ...patch } });
  const updateCosts = (patch: Partial<SimulationInput['costs']>) =>
    onUpdate({ costs: { ...input.costs, ...patch } });
  const updateGrowth = (patch: Partial<SimulationInput['growth']>) =>
    onUpdate({ growth: { ...input.growth, ...patch } });
  const updateConversion = (patch: Partial<SimulationInput['conversion']>) =>
    onUpdate({ conversion: { ...input.conversion, ...patch } });
  const updateUsage = (patch: Partial<SimulationInput['usage']>) =>
    onUpdate({ usage: { ...input.usage, ...patch } });
  const updateAcquisition = (patch: Partial<SimulationInput['acquisition']>) =>
    onUpdate({ acquisition: { ...input.acquisition, ...patch } });

  return (
    <aside className="w-72 bg-ceramic-base border-r border-ceramic-border overflow-y-auto p-4 space-y-1">
      <h2 className="text-base font-semibold text-ceramic-text-primary mb-3 flex items-center">
        Variaveis
        <InfoTip text="Ajuste os valores abaixo para simular diferentes cenarios de negocio. As mudancas refletem em tempo real nos graficos e tabelas." />
      </h2>

      <Section
        title="Pricing"
        icon={CreditCard}
        tooltip="Defina os preços e limites de créditos de cada plano. Impacta diretamente a receita (MRR) e o valor percebido pelo cliente."
      >
        <NumInput label="Pro (R$)" value={input.pricing.priceProBRL} onChange={v => updatePricing({ priceProBRL: v })} step={5} suffix="R$"
          tooltip="Preço mensal do plano Pro. Aumentar pode elevar receita mas reduzir conversão." />
        <NumInput label="Teams (R$)" value={input.pricing.priceTeamsBRL} onChange={v => updatePricing({ priceTeamsBRL: v })} step={10} suffix="R$"
          tooltip="Preço mensal do plano Teams (empresas). Geralmente 3-5x o Pro com mais créditos e recursos." />
        <NumInput label="Créditos Free" value={input.pricing.creditsFree} onChange={v => updatePricing({ creditsFree: v })} step={100}
          tooltip="Créditos de IA inclusos no plano gratuito por mes. Mais créditos atraem usuarios, mas aumentam custo de AI." />
        <NumInput label="Créditos Pro" value={input.pricing.creditsPro} onChange={v => updatePricing({ creditsPro: v })} step={500}
          tooltip="Créditos de IA inclusos no plano Pro por mes. Deve ser suficiente para uso ativo sem gerar custo excessivo." />
        <NumInput label="Créditos Teams" value={input.pricing.creditsTeams} onChange={v => updatePricing({ creditsTeams: v })} step={1000}
          tooltip="Créditos de IA inclusos no plano Teams por mes. Times consomem mais — equilibre volume com margem." />
      </Section>

      <Section
        title="Custos"
        icon={DollarSign}
        defaultOpen={false}
        tooltip="Custos fixos de infraestrutura e custos variaveis de IA por uso. Valores em dolar sao convertidos pelo cambio abaixo."
      >
        <NumInput label="Supabase" value={input.costs.supabaseUSD} onChange={v => updateCosts({ supabaseUSD: v })} suffix="$/m"
          tooltip="Custo mensal do Supabase (banco de dados, auth, storage). Custo fixo independente do número de usuarios." />
        <NumInput label="Cloud Run" value={input.costs.cloudRunUSD} onChange={v => updateCosts({ cloudRunUSD: v })} suffix="$/m"
          tooltip="Custo mensal do Google Cloud Run (hosting da aplicação). Escala com trafego, mas tem baseline fixo." />
        <NumInput label="Flash In" value={input.costs.geminiFlashInputPer1M} onChange={v => updateCosts({ geminiFlashInputPer1M: v })} step={0.01} suffix="$/1M"
          tooltip="Custo por 1 milhao de tokens de entrada no Gemini Flash. Modelo rapido e barato para tarefas simples." />
        <NumInput label="Flash Out" value={input.costs.geminiFlashOutputPer1M} onChange={v => updateCosts({ geminiFlashOutputPer1M: v })} step={0.01} suffix="$/1M"
          tooltip="Custo por 1 milhao de tokens de saida no Gemini Flash. Saida e mais cara que entrada." />
        <NumInput label="Pro In" value={input.costs.geminiProInputPer1M} onChange={v => updateCosts({ geminiProInputPer1M: v })} step={0.1} suffix="$/1M"
          tooltip="Custo por 1 milhao de tokens de entrada no Gemini Pro. Modelo avancado para analises complexas — mais caro." />
        <NumInput label="Pro Out" value={input.costs.geminiProOutputPer1M} onChange={v => updateCosts({ geminiProOutputPer1M: v })} step={0.1} suffix="$/1M"
          tooltip="Custo por 1 milhao de tokens de saida no Gemini Pro. O custo mais alto por token da plataforma." />
        <NumInput label="Cambio" value={input.costs.exchangeRate} onChange={v => updateCosts({ exchangeRate: v })} step={0.1} suffix="R$/$"
          tooltip="Taxa de cambio USD para BRL. Todos os custos em dolar sao convertidos por este valor para calcular a margem em reais." />
      </Section>

      <Section
        title="Crescimento"
        icon={TrendingUp}
        defaultOpen={false}
        tooltip="Projecao de crescimento da base de usuarios ao longo de 24 meses. Define a escala do negocio no simulador."
      >
        <NumInput label="Usuarios iniciais" value={input.growth.initialUsers} onChange={v => updateGrowth({ initialUsers: v })}
          tooltip="Número de usuarios ativos no mes 1 da simulação. Base a partir da qual o crescimento e calculado." />
        <NumInput label="Crescimento mensal" value={Math.round(input.growth.monthlyGrowthRate * 100)} onChange={v => updateGrowth({ monthlyGrowthRate: v / 100 })} suffix="%"
          tooltip="Taxa de crescimento composto mensal (%). 10% significa que a base cresce 10% a cada mes sobre o total anterior." />
      </Section>

      <Section
        title="Conversão"
        icon={Percent}
        defaultOpen={false}
        tooltip="Taxas de conversão entre planos e churn (cancelamento). Determinam quanto da base gera receita e quanto se perde por mes."
      >
        <NumInput label="Free->Pro" value={Math.round(input.conversion.freeToProRate * 100)} onChange={v => updateConversion({ freeToProRate: v / 100 })} suffix="%"
          tooltip="Percentual de usuarios Free que convertem para Pro por mes. Benchmark SaaS: 2-5%." />
        <NumInput label="Free->Teams" value={Math.round(input.conversion.freeToTeamsRate * 100)} onChange={v => updateConversion({ freeToTeamsRate: v / 100 })} suffix="%"
          tooltip="Percentual de usuarios Free que convertem para Teams por mes. Geralmente menor que Free->Pro." />
        <NumInput label="Churn Pro" value={Math.round(input.conversion.proChurnRate * 100)} onChange={v => updateConversion({ proChurnRate: v / 100 })} suffix="%/m"
          tooltip="Taxa mensal de cancelamento do plano Pro. Benchmark SaaS: 3-7%/mes. Menor e melhor." />
        <NumInput label="Churn Teams" value={Math.round(input.conversion.teamsChurnRate * 100)} onChange={v => updateConversion({ teamsChurnRate: v / 100 })} suffix="%/m"
          tooltip="Taxa mensal de cancelamento do plano Teams. Teams tende a ter churn menor por ser mais 'sticky'." />
      </Section>

      <Section
        title="Uso"
        icon={Users}
        defaultOpen={false}
        tooltip="Padrões de consumo de IA pelos usuarios. Afetam diretamente o custo variavel de Gemini por usuario."
      >
        <NumInput label="Utilizacao créditos" value={Math.round(input.usage.avgCreditUtilization * 100)} onChange={v => updateUsage({ avgCreditUtilization: v / 100 })} suffix="%"
          tooltip="Percentual medio dos créditos inclusos que os usuarios realmente consomem. 50% = metade dos créditos sao usados." />
        <NumInput label="Mix Flash" value={Math.round(input.usage.flashVsProMix * 100)} onChange={v => updateUsage({ flashVsProMix: v / 100 })} suffix="%"
          tooltip="Percentual das chamadas de IA que usam o modelo Flash (barato) vs Pro (caro). 85% Flash = maioria das chamadas e barata." />
        <NumInput label="Tokens/interação" value={input.usage.avgTokensPerInteraction} onChange={v => updateUsage({ avgTokensPerInteraction: v })} step={100}
          tooltip="Media de tokens consumidos por cada interação com IA. Mais tokens = respostas mais longas = custo maior por chamada." />
      </Section>

      <Section
        title="Aquisição"
        icon={Megaphone}
        defaultOpen={false}
        tooltip="Custo e canal de aquisição de novos usuarios. Impacta o payback e a sustentabilidade do crescimento."
      >
        <NumInput label="CAC" value={input.acquisition.cacBRL} onChange={v => updateAcquisition({ cacBRL: v })} step={5} suffix="R$"
          tooltip="Custo de Aquisição de Cliente (CAC) em reais. Quanto custa em marketing/vendas para trazer 1 novo usuario pagante." />
        <NumInput label="Organico" value={Math.round(input.acquisition.organicPct * 100)} onChange={v => updateAcquisition({ organicPct: v / 100 })} suffix="%"
          tooltip="Percentual de usuarios que chegam organicamente (sem custo de marketing). 70% organico = CAC efetivo e 30% do valor total." />
      </Section>
    </aside>
  );
}
