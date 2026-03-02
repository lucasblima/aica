# Pricing Simulator Dashboard — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an interactive admin-only pricing simulator at `/admin/simulator` that lets the founder adjust 20+ business variables and instantly see P&L projections, unit economics, and scenario comparisons over 24 months.

**Architecture:** Single-page React app with sidebar variable panel + 3 tabbed views. All computation is client-side via a `useSimulation` hook. Real usage data from Supabase populates baseline defaults. No new API endpoints or Edge Functions needed.

**Tech Stack:** React 18 + TypeScript, custom SVG charts (project pattern — no Recharts), Supabase client for baseline data, Ceramic Design System tokens, framer-motion for transitions.

---

## Task 1: Simulation Engine Types & Defaults

**Files:**
- Create: `src/modules/billing/components/simulator/types.ts`
- Create: `src/modules/billing/components/simulator/simulatorDefaults.ts`

**Step 1: Create type definitions**

```typescript
// src/modules/billing/components/simulator/types.ts

export interface PricingVars {
  priceProBRL: number;
  priceTeamsBRL: number;
  creditsFree: number;
  creditsPro: number;
  creditsTeams: number;
}

export interface CostVars {
  supabaseUSD: number;
  cloudRunUSD: number;
  geminiFlashInputPer1M: number;
  geminiFlashOutputPer1M: number;
  geminiProInputPer1M: number;
  geminiProOutputPer1M: number;
  exchangeRate: number; // BRL per USD
}

export interface GrowthVars {
  initialUsers: number;
  monthlyGrowthRate: number; // 0.10 = 10%
  seasonality: number[]; // 12 multipliers, index 0 = January
}

export interface ConversionVars {
  freeToProRate: number;
  freeToTeamsRate: number;
  proChurnRate: number;
  teamsChurnRate: number;
}

export interface UsageVars {
  avgCreditUtilization: number; // 0.50 = 50%
  flashVsProMix: number; // 0.85 = 85% Flash
  avgTokensPerInteraction: number;
}

export interface AcquisitionVars {
  cacBRL: number;
  organicPct: number; // 0.70 = 70% organic
}

export interface SimulationInput {
  pricing: PricingVars;
  costs: CostVars;
  growth: GrowthVars;
  conversion: ConversionVars;
  usage: UsageVars;
  acquisition: AcquisitionVars;
}

export interface MonthlyRow {
  month: number;
  totalUsers: number;
  freeUsers: number;
  proUsers: number;
  teamsUsers: number;
  mrrBRL: number;
  fixedCostBRL: number;
  aiCostBRL: number;
  grossMarginBRL: number;
  marginPct: number;
}

export interface UnitEconomics {
  ltvPro: number;
  ltvTeams: number;
  cacPaybackMonths: number;
  ltvCacRatio: number;
  mrr: number;
  arr: number;
  arpu: number;
  ndr: number;
  costPerCreditReal: number;
  costPerCreditCharged: number;
  freeSubsidyRatio: number;
}

export interface Scenario {
  name: string;
  priceProBRL: number;
  creditsProMonthly: number;
  priceTeamsBRL: number;
  creditsTeamsMonthly: number;
  mrrMonth12: number;
  mrrMonth24: number;
  breakEvenMonth: number | null;
  marginMonth24: number;
  ltvCacRatio: number;
  mrrTimeline: number[]; // 24 values
}

export interface SimulationOutput {
  monthly: MonthlyRow[];
  unitEconomics: UnitEconomics;
  breakEvenMonth: number | null;
}
```

**Step 2: Create defaults from COST_AUDIT data**

```typescript
// src/modules/billing/components/simulator/simulatorDefaults.ts
import type { SimulationInput } from './types';

export const DEFAULT_SIMULATION: SimulationInput = {
  pricing: {
    priceProBRL: 39.90,
    priceTeamsBRL: 149.00,
    creditsFree: 500,
    creditsPro: 5000,
    creditsTeams: 20000,
  },
  costs: {
    supabaseUSD: 20,
    cloudRunUSD: 5,
    geminiFlashInputPer1M: 0.10,
    geminiFlashOutputPer1M: 0.40,
    geminiProInputPer1M: 1.25,
    geminiProOutputPer1M: 5.00,
    exchangeRate: 5.50,
  },
  growth: {
    initialUsers: 10,
    monthlyGrowthRate: 0.10,
    // Jan=1.0, Feb=0.9, ..., Dec=0.7 (holiday slowdown)
    seasonality: [1.0, 0.9, 1.0, 1.0, 1.1, 1.0, 0.8, 1.0, 1.0, 1.1, 1.0, 0.7],
  },
  conversion: {
    freeToProRate: 0.03,   // 3% of free users convert to Pro per month
    freeToTeamsRate: 0.01, // 1% to Teams
    proChurnRate: 0.05,    // 5% monthly
    teamsChurnRate: 0.03,  // 3% monthly
  },
  usage: {
    avgCreditUtilization: 0.50,
    flashVsProMix: 0.85,
    avgTokensPerInteraction: 1200,
  },
  acquisition: {
    cacBRL: 50,
    organicPct: 0.70,
  },
};

// Supabase tier step-ups: { userThreshold: monthlyUSD }
export const INFRA_STEP_UPS: Record<number, number> = {
  1000: 599, // Supabase Pro -> Team
  5000: 999, // Supabase Team -> Enterprise (estimated)
};
```

**Step 3: Commit**

```bash
git add src/modules/billing/components/simulator/types.ts src/modules/billing/components/simulator/simulatorDefaults.ts
git commit -m "feat(simulator): add simulation types and defaults from COST_AUDIT"
```

---

## Task 2: Simulation Calculation Hook

**Files:**
- Create: `src/modules/billing/components/simulator/useSimulation.ts`

**Step 1: Write the simulation engine**

```typescript
// src/modules/billing/components/simulator/useSimulation.ts
import { useMemo } from 'react';
import type { SimulationInput, SimulationOutput, MonthlyRow, UnitEconomics } from './types';
import { INFRA_STEP_UPS } from './simulatorDefaults';

function calculateMonthly(input: SimulationInput): MonthlyRow[] {
  const { pricing, costs, growth, conversion, usage } = input;
  const rows: MonthlyRow[] = [];

  let free = Math.round(growth.initialUsers * 0.80);
  let pro = Math.round(growth.initialUsers * 0.15);
  let teams = Math.round(growth.initialUsers * 0.05);

  for (let m = 1; m <= 24; m++) {
    const seasonIdx = (m - 1) % 12;
    const seasonMul = growth.seasonality[seasonIdx] ?? 1.0;
    const total = free + pro + teams;

    // Growth
    const newUsers = Math.round(total * growth.monthlyGrowthRate * seasonMul);
    const newFree = Math.round(newUsers * 0.80);

    // Conversions from free
    const convPro = Math.round(free * conversion.freeToProRate);
    const convTeams = Math.round(free * conversion.freeToTeamsRate);

    // Churn
    const churnPro = Math.round(pro * conversion.proChurnRate);
    const churnTeams = Math.round(teams * conversion.teamsChurnRate);

    // Update cohorts
    free = Math.max(0, free + newFree + Math.round(newUsers * 0.20 * 0) - convPro - convTeams);
    // Actually: new users split 80/15/5
    free = Math.max(0, free + Math.round(newUsers * 0.80) - convPro - convTeams);
    pro = Math.max(0, pro + Math.round(newUsers * 0.15) + convPro - churnPro);
    teams = Math.max(0, teams + Math.round(newUsers * 0.05) + convTeams - churnTeams);

    const totalEnd = free + pro + teams;

    // Revenue
    const mrr = pro * pricing.priceProBRL + teams * pricing.priceTeamsBRL;

    // Fixed costs
    let supabaseCost = costs.supabaseUSD;
    for (const [threshold, cost] of Object.entries(INFRA_STEP_UPS)) {
      if (totalEnd >= Number(threshold)) supabaseCost = cost;
    }
    const fixedUSD = supabaseCost + costs.cloudRunUSD + (totalEnd > 500 ? Math.ceil(totalEnd / 500) * 5 : 0);
    const fixedBRL = fixedUSD * costs.exchangeRate;

    // AI variable costs
    const totalCreditsConsumed =
      free * pricing.creditsFree * usage.avgCreditUtilization +
      pro * pricing.creditsPro * usage.avgCreditUtilization +
      teams * pricing.creditsTeams * usage.avgCreditUtilization;

    // 1 credit ≈ $0.0002 USD real cost (from COST_AUDIT formula)
    const aiCostUSD = totalCreditsConsumed * 0.0002 / 3; // divide by 3x margin to get real cost
    const aiCostBRL = aiCostUSD * costs.exchangeRate;

    const grossMargin = mrr - fixedBRL - aiCostBRL;
    const marginPct = mrr > 0 ? (grossMargin / mrr) * 100 : 0;

    rows.push({
      month: m,
      totalUsers: totalEnd,
      freeUsers: free,
      proUsers: pro,
      teamsUsers: teams,
      mrrBRL: Math.round(mrr * 100) / 100,
      fixedCostBRL: Math.round(fixedBRL * 100) / 100,
      aiCostBRL: Math.round(aiCostBRL * 100) / 100,
      grossMarginBRL: Math.round(grossMargin * 100) / 100,
      marginPct: Math.round(marginPct * 10) / 10,
    });
  }

  return rows;
}

function calculateUnitEconomics(input: SimulationInput, monthly: MonthlyRow[]): UnitEconomics {
  const { pricing, conversion, acquisition } = input;
  const lastMonth = monthly[monthly.length - 1];

  const ltvPro = conversion.proChurnRate > 0 ? pricing.priceProBRL / conversion.proChurnRate : 0;
  const ltvTeams = conversion.teamsChurnRate > 0 ? pricing.priceTeamsBRL / conversion.teamsChurnRate : 0;

  const payingUsers = lastMonth.proUsers + lastMonth.teamsUsers;
  const blendedLtv = payingUsers > 0
    ? (lastMonth.proUsers * ltvPro + lastMonth.teamsUsers * ltvTeams) / payingUsers
    : 0;

  const cacPayback = acquisition.cacBRL > 0 && pricing.priceProBRL > 0
    ? acquisition.cacBRL / pricing.priceProBRL
    : 0;

  const ltvCacRatio = acquisition.cacBRL > 0 ? blendedLtv / acquisition.cacBRL : 0;
  const mrr = lastMonth.mrrBRL;
  const arpu = payingUsers > 0 ? mrr / payingUsers : 0;

  return {
    ltvPro: Math.round(ltvPro),
    ltvTeams: Math.round(ltvTeams),
    cacPaybackMonths: Math.round(cacPayback * 10) / 10,
    ltvCacRatio: Math.round(ltvCacRatio * 10) / 10,
    mrr: Math.round(mrr),
    arr: Math.round(mrr * 12),
    arpu: Math.round(arpu * 100) / 100,
    ndr: 100, // TODO: calculate from expansion/contraction when upgrade paths exist
    costPerCreditReal: 0.0002 / 3,
    costPerCreditCharged: 0.0002,
    freeSubsidyRatio: pricing.priceProBRL > 0
      ? Math.round(pricing.priceProBRL / (pricing.creditsFree * 0.0002 / 3 * input.costs.exchangeRate))
      : 0,
  };
}

export function useSimulation(input: SimulationInput): SimulationOutput {
  return useMemo(() => {
    const monthly = calculateMonthly(input);
    const unitEconomics = calculateUnitEconomics(input, monthly);
    const breakEvenMonth = monthly.find(r => r.grossMarginBRL > 0)?.month ?? null;
    return { monthly, unitEconomics, breakEvenMonth };
  }, [input]);
}
```

**Step 2: Commit**

```bash
git add src/modules/billing/components/simulator/useSimulation.ts
git commit -m "feat(simulator): add simulation calculation engine hook"
```

---

## Task 3: Variable Panel Component

**Files:**
- Create: `src/modules/billing/components/simulator/VariablePanel.tsx`

**Step 1: Build the sidebar with grouped inputs**

The panel uses collapsible sections with sliders and number inputs. Follow Ceramic Design System tokens (`ceramic-base`, `ceramic-border`, `ceramic-text-primary`).

Key patterns:
- Each group is a collapsible `<details>` with Ceramic styling
- Number inputs use `type="number"` with `step` for precision
- Sliders use `<input type="range">` with debounced updates
- Changes call `onUpdate(partial)` which merges into parent state

```typescript
// src/modules/billing/components/simulator/VariablePanel.tsx
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
        <NumInput label="Free→Pro" value={Math.round(input.conversion.freeToProRate * 100)} onChange={v => updateConversion({ freeToProRate: v / 100 })} suffix="%" />
        <NumInput label="Free→Teams" value={Math.round(input.conversion.freeToTeamsRate * 100)} onChange={v => updateConversion({ freeToTeamsRate: v / 100 })} suffix="%" />
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
```

**Step 2: Commit**

```bash
git add src/modules/billing/components/simulator/VariablePanel.tsx
git commit -m "feat(simulator): add variable panel sidebar component"
```

---

## Task 4: SVG Chart Components

**Files:**
- Create: `src/modules/billing/components/simulator/charts/AreaChart.tsx`
- Create: `src/modules/billing/components/simulator/charts/BarChart.tsx`
- Create: `src/modules/billing/components/simulator/charts/LineChart.tsx`

**Step 1: Create reusable SVG area chart**

Follow the pattern from `src/components/aiCost/CostTrendChart.tsx` — raw SVG with area fills and gradients.

```typescript
// src/modules/billing/components/simulator/charts/AreaChart.tsx
interface AreaSeries {
  key: string;
  values: number[];
  color: string;
  label: string;
}

interface AreaChartProps {
  series: AreaSeries[];
  labels: string[];    // X-axis labels (months)
  height?: number;
  formatValue?: (v: number) => string;
  highlightIndex?: number | null; // break-even month
}

export function AreaChart({ series, labels, height = 240, formatValue, highlightIndex }: AreaChartProps) {
  // SVG implementation: stacked areas, X labels, hover tooltip
  // Use ceramic colors: ceramic-success for revenue, ceramic-cool for cost, amber for AI cost
  // ...
}
```

**Step 2: Create bar chart for LTV vs CAC**

```typescript
// src/modules/billing/components/simulator/charts/BarChart.tsx
interface BarGroup {
  label: string;
  bars: { key: string; value: number; color: string }[];
}

interface BarChartProps {
  groups: BarGroup[];
  height?: number;
  referenceLine?: { value: number; label: string };
  formatValue?: (v: number) => string;
}

export function BarChart({ groups, height = 200, referenceLine, formatValue }: BarChartProps) {
  // Grouped vertical bars with optional reference line (3x LTV/CAC)
  // ...
}
```

**Step 3: Create line chart for scenario comparison**

```typescript
// src/modules/billing/components/simulator/charts/LineChart.tsx
interface LineSeries {
  key: string;
  values: number[];
  color: string;
  label: string;
}

interface LineChartProps {
  series: LineSeries[];
  labels: string[];
  height?: number;
  formatValue?: (v: number) => string;
}

export function LineChart({ series, labels, height = 240, formatValue }: LineChartProps) {
  // Multi-line SVG with legend, X labels, hover tooltip
  // ...
}
```

**Step 4: Commit**

```bash
git add src/modules/billing/components/simulator/charts/
git commit -m "feat(simulator): add SVG chart components (area, bar, line)"
```

---

## Task 5: P&L Tab Component

**Files:**
- Create: `src/modules/billing/components/simulator/PLTab.tsx`

**Step 1: Build table + area chart**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/modules/billing/components/simulator/PLTab.tsx
git commit -m "feat(simulator): add P&L tab with table and area chart"
```

---

## Task 6: Unit Economics Tab Component

**Files:**
- Create: `src/modules/billing/components/simulator/UnitEconomicsTab.tsx`

**Step 1: Build metric cards + bar chart**

Uses `UsageStatsCard` pattern from existing billing module for the 4 metric cards. Bar chart for LTV vs CAC comparison.

```typescript
// src/modules/billing/components/simulator/UnitEconomicsTab.tsx
import type { UnitEconomics } from './types';
import { BarChart } from './charts/BarChart';
import { DollarSign, Clock, Target, TrendingUp } from 'lucide-react';

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
```

**Step 2: Commit**

```bash
git add src/modules/billing/components/simulator/UnitEconomicsTab.tsx
git commit -m "feat(simulator): add unit economics tab with metric cards and bar chart"
```

---

## Task 7: Pricing Scenarios Tab Component

**Files:**
- Create: `src/modules/billing/components/simulator/PricingScenariosTab.tsx`

**Step 1: Build 3-column scenario comparison**

Each column allows editing pricing + credits independently. The simulation runs per scenario using shared growth/cost/conversion variables.

```typescript
// src/modules/billing/components/simulator/PricingScenariosTab.tsx
import { useState } from 'react';
import type { SimulationInput, Scenario } from './types';
import { useSimulation } from './useSimulation';
import { LineChart } from './charts/LineChart';

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

function ScenarioColumn({ config, onUpdate, color, result }: {
  config: ScenarioConfig;
  onUpdate: (patch: Partial<ScenarioConfig>) => void;
  color: string;
  result: { mrrM12: number; mrrM24: number; breakEven: number | null; margin24: number; ltvCac: number };
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
        />
      </div>

      <div className="space-y-2 text-sm mb-4">
        <label className="flex justify-between">
          <span className="text-ceramic-text-secondary">Pro (R$)</span>
          <input type="number" value={config.priceProBRL} onChange={e => onUpdate({ priceProBRL: Number(e.target.value) })} step={5} className="w-20 text-right bg-ceramic-cool border border-ceramic-border rounded px-2 py-0.5 text-sm" />
        </label>
        <label className="flex justify-between">
          <span className="text-ceramic-text-secondary">Pro creditos</span>
          <input type="number" value={config.creditsPro} onChange={e => onUpdate({ creditsPro: Number(e.target.value) })} step={500} className="w-20 text-right bg-ceramic-cool border border-ceramic-border rounded px-2 py-0.5 text-sm" />
        </label>
        <label className="flex justify-between">
          <span className="text-ceramic-text-secondary">Teams (R$)</span>
          <input type="number" value={config.priceTeamsBRL} onChange={e => onUpdate({ priceTeamsBRL: Number(e.target.value) })} step={10} className="w-20 text-right bg-ceramic-cool border border-ceramic-border rounded px-2 py-0.5 text-sm" />
        </label>
        <label className="flex justify-between">
          <span className="text-ceramic-text-secondary">Teams creditos</span>
          <input type="number" value={config.creditsTeams} onChange={e => onUpdate({ creditsTeams: Number(e.target.value) })} step={1000} className="w-20 text-right bg-ceramic-cool border border-ceramic-border rounded px-2 py-0.5 text-sm" />
        </label>
      </div>

      <div className="border-t border-ceramic-border pt-3 space-y-1.5 text-sm">
        <div className="flex justify-between"><span className="text-ceramic-text-secondary">MRR M12</span><span className="font-medium">{formatBRL(result.mrrM12)}</span></div>
        <div className="flex justify-between"><span className="text-ceramic-text-secondary">MRR M24</span><span className="font-medium">{formatBRL(result.mrrM24)}</span></div>
        <div className="flex justify-between"><span className="text-ceramic-text-secondary">Break-even</span><span className="font-medium">{result.breakEven ? `Mes ${result.breakEven}` : 'N/A'}</span></div>
        <div className="flex justify-between"><span className="text-ceramic-text-secondary">Margem M24</span><span className="font-medium">{result.margin24.toFixed(1)}%</span></div>
        <div className="flex justify-between"><span className="text-ceramic-text-secondary">LTV/CAC</span><span className="font-medium">{result.ltvCac.toFixed(1)}x</span></div>
      </div>
    </div>
  );
}

export function PricingScenariosTab({ baseInput }: PricingScenariosTabProps) {
  // 3 scenarios, A = current values
  const [scenarios, setScenarios] = useState<ScenarioConfig[]>([
    { name: 'Atual', priceProBRL: baseInput.pricing.priceProBRL, creditsPro: baseInput.pricing.creditsPro, priceTeamsBRL: baseInput.pricing.priceTeamsBRL, creditsTeams: baseInput.pricing.creditsTeams },
    { name: 'Cenario B', priceProBRL: 29.90, creditsPro: 3000, priceTeamsBRL: 99, creditsTeams: 12000 },
    { name: 'Cenario C', priceProBRL: 59.90, creditsPro: 8000, priceTeamsBRL: 199, creditsTeams: 30000 },
  ]);

  // Run simulation for each scenario
  const results = scenarios.map(s => {
    const input: SimulationInput = {
      ...baseInput,
      pricing: { ...baseInput.pricing, priceProBRL: s.priceProBRL, creditsPro: s.creditsPro, priceTeamsBRL: s.priceTeamsBRL, creditsTeams: s.creditsTeams },
    };
    return useSimulation(input);
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
        <h3 className="text-sm font-medium text-ceramic-text-primary mb-4">MRR — Comparacao 24 meses</h3>
        <LineChart
          series={lineData}
          labels={Array.from({ length: 24 }, (_, i) => `M${i + 1}`)}
          formatValue={v => `R$ ${v.toLocaleString('pt-BR')}`}
        />
      </div>
    </div>
  );
}
```

> **Note:** The `useSimulation` calls inside `map` violate React's rules of hooks. During implementation, refactor to call `useSimulation` 3 times at the top level or extract calculation into a pure function `runSimulation(input)` that doesn't use hooks.

**Step 2: Commit**

```bash
git add src/modules/billing/components/simulator/PricingScenariosTab.tsx
git commit -m "feat(simulator): add pricing scenarios tab with 3-column comparison"
```

---

## Task 8: Main Page + Route Registration

**Files:**
- Create: `src/modules/billing/pages/PricingSimulatorPage.tsx`
- Modify: `src/modules/billing/index.ts` — add barrel export
- Modify: `src/router/AppRouter.tsx` — add admin route

**Step 1: Create main page**

```typescript
// src/modules/billing/pages/PricingSimulatorPage.tsx
import { useState, useCallback } from 'react';
import { PageShell } from '@/components/ui/PageShell';
import { VariablePanel } from '../components/simulator/VariablePanel';
import { PLTab } from '../components/simulator/PLTab';
import { UnitEconomicsTab } from '../components/simulator/UnitEconomicsTab';
import { PricingScenariosTab } from '../components/simulator/PricingScenariosTab';
import { useSimulation } from '../components/simulator/useSimulation';
import { DEFAULT_SIMULATION } from '../components/simulator/simulatorDefaults';
import type { SimulationInput } from '../components/simulator/types';

const TABS = ['P&L Mensal', 'Unit Economics', 'Cenarios'] as const;

export function PricingSimulatorPage() {
  const [input, setInput] = useState<SimulationInput>(DEFAULT_SIMULATION);
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('P&L Mensal');

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

  return (
    <div className="flex min-h-screen bg-ceramic-cool">
      <VariablePanel input={input} onUpdate={handleUpdate} />

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-ceramic-text-primary mb-1">Simulador de Pricing</h1>
          <p className="text-sm text-ceramic-text-secondary mb-6">
            Ajuste as variaveis na barra lateral e veja o impacto em tempo real.
          </p>

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
```

**Step 2: Add barrel export**

In `src/modules/billing/index.ts`, add:
```typescript
export { PricingSimulatorPage } from './pages/PricingSimulatorPage';
```

**Step 3: Add route in AppRouter.tsx**

Add lazy import:
```typescript
const PricingSimulatorPage = lazy(() => import('../modules/billing').then(m => ({ default: m.PricingSimulatorPage })));
```

Add route (near other billing routes):
```tsx
<Route path="/admin/simulator" element={<AdminGuard><PricingSimulatorPage /></AdminGuard>} />
```

**Step 4: Commit**

```bash
git add src/modules/billing/pages/PricingSimulatorPage.tsx src/modules/billing/index.ts src/router/AppRouter.tsx
git commit -m "feat(simulator): add main page with route and tab navigation"
```

---

## Task 9: Baseline Data from Supabase

**Files:**
- Create: `src/modules/billing/components/simulator/useBaselineData.ts`
- Modify: `src/modules/billing/pages/PricingSimulatorPage.tsx` — merge baseline into defaults

**Step 1: Create hook to fetch real usage data**

```typescript
// src/modules/billing/components/simulator/useBaselineData.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabaseClient';
import type { SimulationInput } from './types';
import { DEFAULT_SIMULATION } from './simulatorDefaults';

export function useBaselineData(): { input: SimulationInput; isLoading: boolean } {
  const [input, setInput] = useState(DEFAULT_SIMULATION);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBaseline() {
      try {
        // Get current subscriber counts
        const { data: subs } = await supabase
          .from('user_subscriptions')
          .select('plan_id')
          .eq('status', 'active');

        // Get current plan prices
        const { data: plans } = await supabase
          .from('pricing_plans')
          .select('id, name, monthly_price_brl, monthly_credits');

        if (subs && plans) {
          const proPlan = plans.find(p => p.name === 'Pro');
          const teamsPlan = plans.find(p => p.name === 'Teams');
          const freePlan = plans.find(p => p.name === 'Free');

          setInput(prev => ({
            ...prev,
            pricing: {
              priceProBRL: proPlan?.monthly_price_brl ?? prev.pricing.priceProBRL,
              priceTeamsBRL: teamsPlan?.monthly_price_brl ?? prev.pricing.priceTeamsBRL,
              creditsFree: freePlan?.monthly_credits ?? prev.pricing.creditsFree,
              creditsPro: proPlan?.monthly_credits ?? prev.pricing.creditsPro,
              creditsTeams: teamsPlan?.monthly_credits ?? prev.pricing.creditsTeams,
            },
            growth: {
              ...prev.growth,
              initialUsers: subs.length || prev.growth.initialUsers,
            },
          }));
        }
      } catch (err) {
        console.warn('[simulator] Failed to fetch baseline, using defaults:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchBaseline();
  }, []);

  return { input, isLoading };
}
```

**Step 2: Wire into main page**

In `PricingSimulatorPage.tsx`, replace `useState(DEFAULT_SIMULATION)` with:
```typescript
const { input: baselineInput, isLoading } = useBaselineData();
const [input, setInput] = useState<SimulationInput>(DEFAULT_SIMULATION);

// Merge baseline when loaded
useEffect(() => {
  if (!isLoading) setInput(baselineInput);
}, [isLoading, baselineInput]);
```

**Step 3: Commit**

```bash
git add src/modules/billing/components/simulator/useBaselineData.ts src/modules/billing/pages/PricingSimulatorPage.tsx
git commit -m "feat(simulator): add baseline data hook from Supabase"
```

---

## Task 10: Build Verification & Manual Test

**Step 1: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 new errors (pre-existing ones from AgendaView/momentValidation are ok).

**Step 2: Run build**

```bash
npm run build
```

Expected: Build succeeds.

**Step 3: Manual test**

```bash
npm run dev
```

Navigate to `/admin/simulator`. Verify:
- Variable panel renders with all 6 sections
- P&L tab shows 24-month table + chart
- Unit Economics tab shows 4 metric cards + bar chart
- Scenarios tab shows 3 columns + line chart
- Changing a variable updates all tabs instantly
- Non-admin users get redirected

**Step 4: Commit final state**

```bash
git add -A
git commit -m "feat(simulator): complete pricing simulator dashboard"
```

---

## Summary

| Task | Component | Files |
|------|-----------|-------|
| 1 | Types + Defaults | `types.ts`, `simulatorDefaults.ts` |
| 2 | Simulation Hook | `useSimulation.ts` |
| 3 | Variable Panel | `VariablePanel.tsx` |
| 4 | SVG Charts | `charts/AreaChart.tsx`, `charts/BarChart.tsx`, `charts/LineChart.tsx` |
| 5 | P&L Tab | `PLTab.tsx` |
| 6 | Unit Economics Tab | `UnitEconomicsTab.tsx` |
| 7 | Pricing Scenarios Tab | `PricingScenariosTab.tsx` |
| 8 | Main Page + Route | `PricingSimulatorPage.tsx`, `index.ts`, `AppRouter.tsx` |
| 9 | Baseline Data | `useBaselineData.ts` |
| 10 | Build Verification | Manual test |

All files live under `src/modules/billing/components/simulator/` except the page (`pages/`) and route (`router/`).
