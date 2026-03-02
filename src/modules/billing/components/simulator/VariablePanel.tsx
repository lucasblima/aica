import { useState } from 'react';
import { ChevronDown, DollarSign, Users, TrendingUp, Percent, CreditCard, Megaphone } from 'lucide-react';
import type { SimulationInput } from './types';

interface VariablePanelProps {
  input: SimulationInput;
  onUpdate: (patch: Partial<SimulationInput>) => void;
}

// Helper: labeled number input
function NumInput({ label, value, onChange, min = 0, max, step = 1, suffix }: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; suffix?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-sm">
      <span className="text-ceramic-text-secondary truncate">{label}</span>
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

// Collapsible section
function Section({ title, icon: Icon, children, defaultOpen = true }: {
  title: string; icon: React.ElementType; children: React.ReactNode; defaultOpen?: boolean;
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
      <h2 className="text-base font-semibold text-ceramic-text-primary mb-3">Variaveis</h2>

      <Section title="Pricing" icon={CreditCard}>
        <NumInput label="Pro (R$)" value={input.pricing.priceProBRL} onChange={v => updatePricing({ priceProBRL: v })} step={5} suffix="R$" />
        <NumInput label="Teams (R$)" value={input.pricing.priceTeamsBRL} onChange={v => updatePricing({ priceTeamsBRL: v })} step={10} suffix="R$" />
        <NumInput label="Creditos Free" value={input.pricing.creditsFree} onChange={v => updatePricing({ creditsFree: v })} step={100} />
        <NumInput label="Creditos Pro" value={input.pricing.creditsPro} onChange={v => updatePricing({ creditsPro: v })} step={500} />
        <NumInput label="Creditos Teams" value={input.pricing.creditsTeams} onChange={v => updatePricing({ creditsTeams: v })} step={1000} />
      </Section>

      <Section title="Custos" icon={DollarSign} defaultOpen={false}>
        <NumInput label="Supabase" value={input.costs.supabaseUSD} onChange={v => updateCosts({ supabaseUSD: v })} suffix="$/m" />
        <NumInput label="Cloud Run" value={input.costs.cloudRunUSD} onChange={v => updateCosts({ cloudRunUSD: v })} suffix="$/m" />
        <NumInput label="Flash In" value={input.costs.geminiFlashInputPer1M} onChange={v => updateCosts({ geminiFlashInputPer1M: v })} step={0.01} suffix="$/1M" />
        <NumInput label="Flash Out" value={input.costs.geminiFlashOutputPer1M} onChange={v => updateCosts({ geminiFlashOutputPer1M: v })} step={0.01} suffix="$/1M" />
        <NumInput label="Pro In" value={input.costs.geminiProInputPer1M} onChange={v => updateCosts({ geminiProInputPer1M: v })} step={0.1} suffix="$/1M" />
        <NumInput label="Pro Out" value={input.costs.geminiProOutputPer1M} onChange={v => updateCosts({ geminiProOutputPer1M: v })} step={0.1} suffix="$/1M" />
        <NumInput label="Cambio" value={input.costs.exchangeRate} onChange={v => updateCosts({ exchangeRate: v })} step={0.1} suffix="R$/$" />
      </Section>

      <Section title="Crescimento" icon={TrendingUp} defaultOpen={false}>
        <NumInput label="Usuarios iniciais" value={input.growth.initialUsers} onChange={v => updateGrowth({ initialUsers: v })} />
        <NumInput label="Crescimento mensal" value={Math.round(input.growth.monthlyGrowthRate * 100)} onChange={v => updateGrowth({ monthlyGrowthRate: v / 100 })} suffix="%" />
      </Section>

      <Section title="Conversao" icon={Percent} defaultOpen={false}>
        <NumInput label="Free->Pro" value={Math.round(input.conversion.freeToProRate * 100)} onChange={v => updateConversion({ freeToProRate: v / 100 })} suffix="%" />
        <NumInput label="Free->Teams" value={Math.round(input.conversion.freeToTeamsRate * 100)} onChange={v => updateConversion({ freeToTeamsRate: v / 100 })} suffix="%" />
        <NumInput label="Churn Pro" value={Math.round(input.conversion.proChurnRate * 100)} onChange={v => updateConversion({ proChurnRate: v / 100 })} suffix="%/m" />
        <NumInput label="Churn Teams" value={Math.round(input.conversion.teamsChurnRate * 100)} onChange={v => updateConversion({ teamsChurnRate: v / 100 })} suffix="%/m" />
      </Section>

      <Section title="Uso" icon={Users} defaultOpen={false}>
        <NumInput label="Utilizacao creditos" value={Math.round(input.usage.avgCreditUtilization * 100)} onChange={v => updateUsage({ avgCreditUtilization: v / 100 })} suffix="%" />
        <NumInput label="Mix Flash" value={Math.round(input.usage.flashVsProMix * 100)} onChange={v => updateUsage({ flashVsProMix: v / 100 })} suffix="%" />
        <NumInput label="Tokens/interacao" value={input.usage.avgTokensPerInteraction} onChange={v => updateUsage({ avgTokensPerInteraction: v })} step={100} />
      </Section>

      <Section title="Aquisicao" icon={Megaphone} defaultOpen={false}>
        <NumInput label="CAC" value={input.acquisition.cacBRL} onChange={v => updateAcquisition({ cacBRL: v })} step={5} suffix="R$" />
        <NumInput label="Organico" value={Math.round(input.acquisition.organicPct * 100)} onChange={v => updateAcquisition({ organicPct: v / 100 })} suffix="%" />
      </Section>
    </aside>
  );
}
