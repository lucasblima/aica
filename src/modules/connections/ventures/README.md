# Ventures Archetype - Cockpit da Ambição Profissional

O **Ventures** é o motor de criação do sistema Aica - um cockpit estratégico para gestão de negócios e empreendimentos. Design com precisão, números em destaque, cor âmbar cirúrgica.

## Filosofia

Ventures não é sobre microgerenciamento, mas sim sobre **saúde e estratégia do empreendimento**. Foco em métricas que importam: runway, burn rate, unit economics, milestones estratégicos.

## Arquitetura

```
src/modules/connections/ventures/
├── types.ts                    # TypeScript interfaces e types
├── services/
│   ├── entityService.ts        # CRUD para entidades
│   ├── metricsService.ts       # CRUD para métricas
│   ├── milestoneService.ts     # CRUD para milestones
│   ├── stakeholderService.ts   # CRUD para stakeholders
│   └── index.ts
├── hooks/
│   ├── useEntity.ts            # Hook para entidades
│   ├── useMetrics.ts           # Hook para métricas
│   ├── useMilestones.ts        # Hook para milestones
│   ├── useStakeholders.ts      # Hook para stakeholders
│   └── index.ts
├── components/
│   ├── VenturesDashboard.tsx   # Cockpit principal
│   ├── HealthGauge.tsx         # Indicador de saúde visual
│   ├── MetricsCard.tsx         # Card de KPI
│   ├── MilestoneTimeline.tsx   # Timeline de milestones
│   ├── StakeholderGrid.tsx     # Grid de stakeholders
│   ├── EquityTable.tsx         # Cap table
│   ├── MRRChart.tsx            # Gráfico de receita
│   └── index.ts
├── views/
│   ├── VenturesHome.tsx        # Entry point
│   ├── EntityDetail.tsx        # Detalhes da entidade
│   ├── MetricsHistory.tsx      # Histórico de métricas
│   ├── TeamView.tsx            # Visão da equipe
│   └── index.ts
├── index.ts                    # Export principal
└── README.md                   # Este arquivo
```

## Database Schema

### ventures_entities
Entidades de negócio (empresas, startups, projetos).

**Campos principais:**
- `legal_name`, `trading_name`, `cnpj`
- `entity_type`: MEI, EIRELI, LTDA, SA, SLU, STARTUP, NONPROFIT
- `sector`, `subsector`, `founded_at`
- Informações de contato e endereço

### ventures_metrics
Métricas financeiras e operacionais.

**Campos principais:**
- **Revenue:** `mrr`, `arr`, `total_revenue`
- **Expenses:** `total_expenses`, `payroll`, `operational`, `marketing`
- **Health:** `burn_rate`, `cash_balance`, `runway_months`
- **Profitability:** `gross_margin_pct`, `net_margin_pct`, `ebitda`
- **Customers:** `active_customers`, `new_customers`, `churned_customers`, `churn_rate_pct`
- **Unit Economics:** `cac`, `ltv`, `ltv_cac_ratio`
- **Team:** `employee_count`, `contractor_count`

### ventures_milestones
Objetivos estratégicos e milestones.

**Campos principais:**
- `title`, `description`, `category`
- `target_date`, `target_value`, `target_metric`
- `current_value`, `progress_pct`
- `status`: pending, in_progress, achieved, missed, cancelled
- `priority`: low, medium, high, critical

### ventures_stakeholders
Fundadores, investidores, advisors, equipe.

**Campos principais:**
- `stakeholder_type`: founder, co-founder, investor, advisor, employee, contractor, board
- **Equity:** `equity_pct`, `shares_count`, `share_class`
- **Vesting:** `vesting_start_date`, `vesting_cliff_months`, `vesting_period_months`
- **Investment:** `investment_amount`, `investment_date`, `investment_round`, `investment_instrument`
- **Employment:** `employment_type`, `start_date`, `end_date`, `salary`

## Components

### VenturesDashboard
Cockpit principal com visão consolidada:
- **Health Gauges:** Runway, burn rate, cash balance
- **Key Metrics:** MRR, ARR, clientes ativos, churn
- **Unit Economics:** CAC, LTV, LTV/CAC ratio
- **MRR Chart:** Evolução de receita (12 meses)
- **Milestones:** Progresso de objetivos
- **Team Overview:** Stakeholders ativos

### HealthGauge
Indicador visual de saúde do negócio:
- **Healthy** (verde): Runway >= 12 meses
- **Warning** (âmbar): Runway >= 6 meses
- **Critical** (vermelho): Runway < 6 meses
- Exibe runway, burn rate, cash balance

### MetricsCard
Card individual de KPI:
- Valor atual em destaque
- Comparação com período anterior
- Trend indicator (up/down/neutral)
- Suporta formats: currency, percentage, number, abbreviated

### MRRChart
Gráfico de linha para MRR:
- Últimos 12 meses
- Comparação com período anterior
- Growth rate calculation
- Summary stats (média, maior, menor)

### StakeholderGrid
Grid de stakeholders:
- Agrupamento por tipo (founder, investor, employee, etc.)
- Equity percentage
- Investment amount
- Vesting status
- Links para LinkedIn

### EquityTable
Cap table view:
- Lista de stakeholders com equity
- Vesting progress bars
- Total allocated vs. available
- Warning se over-allocated (>100%)

### MilestoneTimeline
Timeline de milestones:
- Status indicators
- Progress bars
- Target dates
- Dependencies

## Hooks

### useEntity(spaceId)
```tsx
const { entities, loading, error, createEntity, updateEntity, deleteEntity } = useEntity(spaceId);
```

### useMetrics(entityId)
```tsx
const { metrics, currentMetrics, loading, error, createMetrics, updateMetrics } = useMetrics(entityId);
```

### useMilestones(entityId)
```tsx
const { milestones, loading, error, createMilestone, updateMilestone, deleteMilestone } = useMilestones(entityId);
```

### useStakeholders(entityId)
```tsx
const { stakeholders, loading, error, createStakeholder, updateStakeholder, deleteStakeholder } = useStakeholders(entityId);
```

## Usage Examples

### Criar uma nova entidade
```tsx
import { entityService } from '@/modules/connections/ventures';

const entity = await entityService.createEntity({
  space_id: 'uuid',
  legal_name: 'Tech Startup LTDA',
  trading_name: 'TechStart',
  entity_type: 'STARTUP',
  sector: 'Tecnologia',
});
```

### Adicionar métricas mensais
```tsx
import { metricsService } from '@/modules/connections/ventures';

const metrics = await metricsService.createMetrics({
  entity_id: 'uuid',
  period_type: 'monthly',
  period_start: '2025-01-01',
  period_end: '2025-01-31',
  mrr: 50000,
  burn_rate: 30000,
  cash_balance: 500000,
  runway_months: 16,
  active_customers: 120,
  is_current: true,
});
```

### Criar milestone
```tsx
import { milestoneService } from '@/modules/connections/ventures';

const milestone = await milestoneService.createMilestone({
  entity_id: 'uuid',
  title: 'Atingir 100k MRR',
  category: 'financeiro',
  target_date: '2025-06-30',
  target_value: 100000,
  target_metric: 'MRR',
  target_unit: 'BRL',
  current_value: 50000,
  progress_pct: 50,
  status: 'in_progress',
  priority: 'high',
});
```

### Adicionar stakeholder
```tsx
import { stakeholderService } from '@/modules/connections/ventures';

const stakeholder = await stakeholderService.createStakeholder({
  entity_id: 'uuid',
  stakeholder_type: 'founder',
  role_title: 'CEO',
  equity_pct: 40,
  vesting_period_months: 48,
  vesting_cliff_months: 12,
});
```

## Design Specs

### Cores
- **Accent:** Âmbar (#f59e0b, amber-600)
- **Success:** Verde (#10b981, green-600)
- **Warning:** Âmbar (#f59e0b, amber-600)
- **Critical:** Vermelho (#ef4444, red-600)
- **Neutral:** Grays (#6b7280, neutral-600)

### Typography
- **Headers:** Font bold, numbers em destaque
- **Metrics:** 2xl ou maior para valores principais
- **Labels:** Uppercase tracking-wide para labels

### Layout
- **Cards:** Elevados com border subtle
- **Spacing:** Generoso, respiração entre seções
- **Grid:** Responsive (1/2/3/4 cols dependendo do viewport)

## Metáfora Visual

O Ventures é um **cockpit de avião**:
- Gauges de saúde como instrumentos de voo
- Números precisos e legíveis
- Status indicators claros (verde/âmbar/vermelho)
- Dashboard data-driven, não decoration

## Status do Desenvolvimento

✅ Migration SQL completa
✅ Types TypeScript completos
✅ Services layer completo
✅ Hooks completos
✅ Components principais criados
✅ Views principais criadas

### Próximos Passos

1. Integração com rotas do React Router
2. Formulários para criação/edição
3. Validações e error handling
4. Testes unitários
5. Storybook para components
6. Performance optimization (memoization, lazy loading)

## Integração

Para usar o Ventures em sua aplicação:

```tsx
import { VenturesHome } from '@/modules/connections/ventures';

// No seu router
<Route path="/connections/ventures/:spaceId" element={<VenturesHome />} />
```

## Documentação Adicional

- [Connection Archetypes Overview](../README.md)
- [Database Schema](../../../../supabase/migrations/20251214200000_connection_ventures.sql)
- [Type Definitions](./types.ts)
