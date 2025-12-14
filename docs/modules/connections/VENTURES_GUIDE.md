# Ventures Archetype Guide

**Business Ventures & Startups**

## Overview

The **Ventures** archetype is your strategic cockpit for managing startups, business projects, and entrepreneurial ventures. Inspired by the precision and clarity of a Braun calculator, Ventures provides a data-driven dashboard for tracking financial metrics, milestones, and team equity.

### Purpose

- Track startup financial metrics (MRR, ARR, burn rate, runway)
- Monitor business milestones and objectives
- Manage stakeholder relationships and cap table
- Calculate unit economics (CAC, LTV)
- Visualize growth trends and health indicators

### Design Philosophy

Ventures follows the **cockpit metaphor** - like an airplane's instrument panel, it provides precise, at-a-glance information needed for strategic decision-making.

**Color Scheme:**
- Primary: Amber (#f59e0b, #d97706) for warmth and energy
- Success: Green (#10b981) for positive metrics
- Warning: Amber (#f59e0b) for alerts
- Critical: Red (#ef4444) for danger zones
- Neutral: Gray scale (#6b7280, #374151) for data

**Visual Elements:**
- Clean, minimalist cards with subtle shadows
- Large, readable numbers for metrics
- Gauges and charts for visual comprehension
- Status indicators (green/amber/red)
- Generous whitespace and breathing room

---

## Database Schema

### Tables

#### 1. ventures_entities
Business entities (companies, startups, projects).

```sql
id                    UUID PRIMARY KEY
space_id              UUID (connection space reference)

-- Legal information
legal_name            TEXT NOT NULL
trading_name          TEXT (DBA)
cnpj                  TEXT
entity_type           TEXT (startup, company, project, side_hustle)

-- Contact
email                 TEXT
phone                 TEXT
website               TEXT

-- Address
address_line1         TEXT
address_line2         TEXT
city, state           TEXT
postal_code           TEXT
country               TEXT (default 'Brazil')

-- Profile
founded_at            DATE
sector                TEXT (technology, healthcare, finance, etc.)
subsector             TEXT

-- Status
is_active             BOOLEAN (default TRUE)

created_at, updated_at TIMESTAMPTZ
```

#### 2. ventures_metrics
Financial and operational metrics over time.

```sql
id                    UUID PRIMARY KEY
entity_id             UUID (ventures entity reference)

-- Time period
period_type           TEXT (monthly, quarterly, yearly)
period_start          DATE NOT NULL
period_end            DATE NOT NULL

-- Revenue metrics
mrr                   NUMERIC (Monthly Recurring Revenue)
arr                   NUMERIC (Annual Recurring Revenue)
total_revenue         NUMERIC

-- Expense metrics
total_expenses        NUMERIC
payroll               NUMERIC
operational           NUMERIC
marketing             NUMERIC

-- Cash flow
burn_rate             NUMERIC
cash_balance          NUMERIC
runway_months         NUMERIC

-- Profitability
gross_margin_pct      NUMERIC
net_margin_pct        NUMERIC
ebitda                NUMERIC

-- Customer metrics
active_customers      INTEGER
new_customers         INTEGER
churned_customers     INTEGER
churn_rate_pct        NUMERIC

-- Unit economics
cac                   NUMERIC (Customer Acquisition Cost)
ltv                   NUMERIC (Lifetime Value)
ltv_cac_ratio         NUMERIC

-- Team
employee_count        INTEGER
contractor_count      INTEGER

-- Flags
is_current            BOOLEAN (latest period)
is_projected          BOOLEAN (forecast vs actual)

created_at, updated_at TIMESTAMPTZ
```

#### 3. ventures_milestones
Strategic objectives and progress tracking.

```sql
id                    UUID PRIMARY KEY
entity_id             UUID (ventures entity reference)

-- Milestone details
title                 TEXT NOT NULL
description           TEXT
category              TEXT (revenue, product, team, fundraising, customer, other)

-- Target
target_date           DATE
target_value          NUMERIC
target_metric         TEXT
target_unit           TEXT

-- Progress
current_value         NUMERIC
progress_pct          INTEGER (0-100)

-- Status
status                TEXT (pending, in_progress, achieved, missed, cancelled)
priority              TEXT (low, medium, high, critical)

-- Dependencies
depends_on_milestone_id UUID (other milestone reference)

created_at, updated_at TIMESTAMPTZ
```

**Milestone Categories:**
- revenue: Hit $10k MRR, reach $100k ARR
- product: Launch MVP, ship feature X
- team: Hire CTO, reach 10 employees
- fundraising: Close seed round, raise $500k
- customer: First 100 customers, 90% retention
- other: Regulatory approval, partnership signed

**Status:**
- pending: Not started
- in_progress: Working on it
- achieved: Successfully completed
- missed: Target date passed without completion
- cancelled: No longer pursuing

#### 4. ventures_stakeholders
Founders, investors, team members, advisors.

```sql
id                    UUID PRIMARY KEY
entity_id             UUID (ventures entity reference)
member_id             UUID (connection_members reference)

-- Stakeholder type
stakeholder_type      TEXT (founder, co-founder, investor, advisor, employee, contractor, board)

-- Role
role_title            TEXT

-- Equity
equity_pct            NUMERIC
shares_count          BIGINT
share_class           TEXT (common, preferred, options)

-- Vesting
vesting_start_date    DATE
vesting_cliff_months  INTEGER
vesting_period_months INTEGER
vesting_schedule      TEXT

-- Investment
investment_amount     NUMERIC
investment_date       DATE
investment_round      TEXT (pre-seed, seed, series_a, etc.)
investment_instrument TEXT (equity, SAFE, convertible_note)

-- Employment
employment_type       TEXT (full_time, part_time, contractor)
start_date            DATE
end_date              DATE
salary                NUMERIC

-- Profile
bio                   TEXT
linkedin_url          TEXT

-- Status
is_active             BOOLEAN (default TRUE)

created_at, updated_at TIMESTAMPTZ
```

---

## Components

### VenturesDashboard
**Path:** `src/modules/connections/ventures/components/VenturesDashboard.tsx`

Main cockpit view with consolidated business metrics.

**Features:**
- Health gauges (runway, burn rate, cash balance)
- Key metrics cards (MRR, ARR, customers, churn)
- Unit economics display (CAC, LTV, ratio)
- MRR growth chart
- Active milestones
- Team overview
- Empty states for missing data

**Props:**
```tsx
{
  entity: VenturesEntity;
  currentMetrics?: VenturesMetrics;
  metricsHistory?: VenturesMetrics[];
  milestones?: VenturesMilestone[];
  stakeholders?: VenturesStakeholder[];
  onMetricClick?: (metricName: string) => void;
  onMilestoneClick?: (milestone: VenturesMilestone) => void;
  onStakeholderClick?: (stakeholder: VenturesStakeholder) => void;
}
```

### HealthGauge
**Path:** `src/modules/connections/ventures/components/HealthGauge.tsx`

Visual health indicator for business status.

**Status Levels:**
- Healthy (Green): Runway >= 12 months
- Warning (Amber): Runway >= 6 months and < 12 months
- Critical (Red): Runway < 6 months

**Props:**
```tsx
{
  runwayMonths?: number;
  burnRate?: number;
  cashBalance?: number;
  className?: string;
}
```

### MetricsCard
**Path:** `src/modules/connections/ventures/components/MetricsCard.tsx`

Individual KPI card with trend indicator.

**Features:**
- Formatted value display (currency, percentage, number)
- Previous period comparison
- Trend arrows (up/down/neutral)
- Click handler for drill-down
- Support for abbreviations (K, M, B)

**Props:**
```tsx
{
  label: string;
  value?: number;
  previousValue?: number;
  format?: 'currency' | 'percentage' | 'number' | 'abbreviated';
  currency?: string;
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
  onClick?: () => void;
}
```

### MilestoneTimeline
**Path:** `src/modules/connections/ventures/components/MilestoneTimeline.tsx`

Visual timeline of business milestones.

**Features:**
- Chronological display
- Status badges (pending, in_progress, achieved, missed)
- Priority indicators
- Progress bars
- Category icons
- Click handlers

**Props:**
```tsx
{
  milestones: VenturesMilestone[];
  onMilestoneClick?: (milestone: VenturesMilestone) => void;
}
```

### StakeholderGrid
**Path:** `src/modules/connections/ventures/components/StakeholderGrid.tsx`

Grid view of stakeholders grouped by type.

**Features:**
- Grouping by stakeholder_type
- Equity percentage display
- Investment amounts
- Vesting status
- LinkedIn links
- Click handlers for detail view

**Props:**
```tsx
{
  stakeholders: VenturesStakeholder[];
  onStakeholderClick?: (stakeholder: VenturesStakeholder) => void;
}
```

### EquityTable
**Path:** `src/modules/connections/ventures/components/EquityTable.tsx`

Cap table with equity allocation and vesting tracking.

**Features:**
- Total equity allocated vs available
- Equity breakdown by stakeholder
- Share counts and classes
- Vesting progress bars
- Over-allocation warnings (>100%)
- Sortable columns

**Props:**
```tsx
{
  stakeholders: VenturesStakeholder[];
  totalShares?: number;
}
```

### MRRChart
**Path:** `src/modules/connections/ventures/components/MRRChart.tsx`

Line chart showing MRR evolution over time.

**Features:**
- Last 12 months view
- Growth rate calculation
- Summary statistics (average, highest, lowest)
- Optional ARR overlay
- Responsive SVG rendering

**Props:**
```tsx
{
  metricsHistory: VenturesMetrics[];
  showARR?: boolean;
}
```

---

## Views

### VenturesHome
**Path:** `src/modules/connections/ventures/views/VenturesHome.tsx`

Main entry point for Ventures archetype.

**Route:** `/connections/ventures/:spaceId`

**Features:**
- Loading states
- Error handling
- Empty state (no entity created yet)
- Breadcrumb navigation
- Dashboard integration

### EntityDetail
**Path:** `src/modules/connections/ventures/views/EntityDetail.tsx`

Detailed view and editing of business entity.

**Route:** `/connections/ventures/:spaceId/entity/:entityId`

**Features:**
- View/edit mode toggle
- Form validation
- Sectioned layout (Legal, Contact, Address, Profile)
- Save/cancel controls
- Delete confirmation

### MetricsHistory
**Path:** `src/modules/connections/ventures/views/MetricsHistory.tsx`

Full metrics history and analytics.

**Route:** `/connections/ventures/:spaceId/metrics`

**Features:**
- Period selector (monthly/quarterly/yearly)
- Current metrics summary
- MRR chart with ARR overlay
- Detailed metrics table
- Growth rate calculations
- Export functionality
- Empty states

### TeamView
**Path:** `src/modules/connections/ventures/views/TeamView.tsx`

Team management and cap table.

**Route:** `/connections/ventures/:spaceId/team`

**Features:**
- View mode toggle (grid/equity table)
- Summary statistics
- Stakeholder grid or equity table
- Add stakeholder button
- Click navigation to details
- Vesting tracking

---

## Services & Hooks

### Services
Located in `src/modules/connections/ventures/services/`

**entityService.ts**
- `getEntitiesBySpace(spaceId)` - Get all entities in space
- `getEntityById(entityId)` - Get single entity
- `createEntity(payload)` - Create new entity
- `updateEntity(entityId, payload)` - Update entity
- `deleteEntity(entityId)` - Delete entity

**metricsService.ts**
- `getMetricsByEntity(entityId)` - Get all metrics
- `getCurrentMetrics(entityId)` - Get latest period
- `createMetrics(payload)` - Add new period metrics
- `updateMetrics(metricsId, payload)` - Update metrics
- `deleteMetrics(metricsId)` - Delete metrics
- `calculateGrowthRate(current, previous)` - Calculate % change

**milestoneService.ts**
- `getMilestonesByEntity(entityId)` - Get all milestones
- `createMilestone(payload)` - Create milestone
- `updateMilestone(milestoneId, payload)` - Update milestone
- `deleteMilestone(milestoneId)` - Delete milestone
- `updateProgress(milestoneId, currentValue)` - Update progress
- `achieveMilestone(milestoneId)` - Mark as achieved

**stakeholderService.ts**
- `getStakeholdersByEntity(entityId)` - Get all stakeholders
- `createStakeholder(payload)` - Add stakeholder
- `updateStakeholder(stakeholderId, payload)` - Update stakeholder
- `deleteStakeholder(stakeholderId)` - Remove stakeholder
- `calculateTotalEquity(entityId)` - Sum equity percentages
- `getVestingStatus(stakeholder)` - Calculate vested amount

### Hooks
Located in `src/modules/connections/ventures/hooks/`

**useEntity.ts**
```tsx
const {
  entities,
  loading,
  error,
  createEntity,
  updateEntity,
  deleteEntity
} = useEntity(spaceId);
```

**useMetrics.ts**
```tsx
const {
  metricsHistory,
  currentMetrics,
  loading,
  error,
  createMetrics,
  updateMetrics,
  deleteMetrics
} = useMetrics(entityId);
```

**useMilestones.ts**
```tsx
const {
  milestones,
  activeMilestones,
  loading,
  error,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  achieveMilestone
} = useMilestones(entityId);
```

**useStakeholders.ts**
```tsx
const {
  stakeholders,
  totalEquity,
  loading,
  error,
  createStakeholder,
  updateStakeholder,
  deleteStakeholder
} = useStakeholders(entityId);
```

---

## Setup Instructions

### 1. Run Database Migration

```bash
# Apply the Ventures migration
supabase migration up 20251214200000_connection_ventures

# Verify tables were created
supabase db tables list | grep ventures
```

### 2. Create Your First Venture

```tsx
import { supabase } from '@/lib/supabase';

// Create connection space for your startup
const { data: space } = await supabase
  .from('connection_spaces')
  .insert({
    user_id: currentUserId,
    archetype: 'ventures',
    name: 'TechStart Brasil',
    subtitle: 'SaaS Startup',
    icon: '💼',
    color_theme: 'amber-energy'
  })
  .select()
  .single();

// Create the business entity
const { data: entity } = await supabase
  .from('ventures_entities')
  .insert({
    space_id: space.id,
    legal_name: 'TechStart Brasil LTDA',
    trading_name: 'TechStart',
    entity_type: 'startup',
    founded_at: '2024-01-15',
    sector: 'Technology',
    subsector: 'SaaS'
  })
  .select()
  .single();
```

### 3. Add Initial Metrics

```tsx
import { metricsService } from '@/modules/connections/ventures';

await metricsService.createMetrics({
  entity_id: entity.id,
  period_type: 'monthly',
  period_start: '2025-01-01',
  period_end: '2025-01-31',
  mrr: 5000,
  total_revenue: 5500,
  total_expenses: 12000,
  payroll: 8000,
  operational: 3000,
  marketing: 1000,
  burn_rate: 6500,
  cash_balance: 80000,
  runway_months: 12,
  active_customers: 15,
  new_customers: 5,
  churned_customers: 1,
  is_current: true
});
```

### 4. Add Stakeholders

```tsx
import { stakeholderService } from '@/modules/connections/ventures';

// Add founder
await stakeholderService.createStakeholder({
  entity_id: entity.id,
  member_id: currentMemberId,
  stakeholder_type: 'founder',
  role_title: 'CEO',
  equity_pct: 60,
  shares_count: 6000000,
  share_class: 'common',
  employment_type: 'full_time',
  start_date: '2024-01-15'
});

// Add investor
await stakeholderService.createStakeholder({
  entity_id: entity.id,
  stakeholder_type: 'investor',
  role_title: 'Angel Investor',
  equity_pct: 15,
  shares_count: 1500000,
  share_class: 'preferred',
  investment_amount: 100000,
  investment_date: '2024-03-01',
  investment_round: 'pre-seed',
  investment_instrument: 'equity'
});
```

---

## Example Workflows

### Workflow 1: Monthly Metrics Update

**Goal:** Track monthly business performance and calculate health indicators.

**Steps:**

1. **Gather Financial Data**
   ```tsx
   // Collect from accounting system
   const monthlyData = {
     mrr: 12500,
     total_revenue: 13200,
     total_expenses: 18000,
     payroll: 12000,
     operational: 4000,
     marketing: 2000
   };
   ```

2. **Calculate Derived Metrics**
   ```tsx
   const burnRate = monthlyData.total_expenses - monthlyData.mrr;
   const cashBalance = 95000; // From bank account
   const runwayMonths = Math.floor(cashBalance / burnRate);
   ```

3. **Add Customer Metrics**
   ```tsx
   const customerData = {
     active_customers: 28,
     new_customers: 8,
     churned_customers: 2
   };

   const churnRate = (customerData.churned_customers /
     (customerData.active_customers + customerData.churned_customers)) * 100;
   ```

4. **Create Metrics Record**
   ```tsx
   await metricsService.createMetrics({
     entity_id: entityId,
     period_type: 'monthly',
     period_start: '2025-02-01',
     period_end: '2025-02-28',
     ...monthlyData,
     burn_rate: burnRate,
     cash_balance: cashBalance,
     runway_months: runwayMonths,
     ...customerData,
     churn_rate_pct: churnRate,
     is_current: true
   });
   ```

5. **Review Health Status**
   ```tsx
   // Health gauge will show:
   // - Green if runway >= 12 months
   // - Amber if runway >= 6 and < 12 months
   // - Red if runway < 6 months
   ```

### Workflow 2: Fundraising Round

**Goal:** Track fundraising milestone and investor equity.

**Steps:**

1. **Create Fundraising Milestone**
   ```tsx
   const milestone = await milestoneService.createMilestone({
     entity_id: entityId,
     title: 'Close Seed Round',
     description: 'Raise R$ 500,000 seed funding',
     category: 'fundraising',
     target_date: '2025-06-30',
     target_value: 500000,
     target_metric: 'amount_raised',
     target_unit: 'BRL',
     status: 'in_progress',
     priority: 'critical'
   });
   ```

2. **Track Progress**
   ```tsx
   // As commitments come in
   await milestoneService.updateProgress(
     milestone.id,
     250000 // Current raised amount
   );
   // Progress automatically calculated as 50%
   ```

3. **Add New Investor**
   ```tsx
   await stakeholderService.createStakeholder({
     entity_id: entityId,
     stakeholder_type: 'investor',
     role_title: 'Lead Investor',
     equity_pct: 20,
     investment_amount: 300000,
     investment_date: '2025-05-15',
     investment_round: 'seed',
     investment_instrument: 'equity',
     share_class: 'preferred'
   });
   ```

4. **Complete Milestone**
   ```tsx
   await milestoneService.achieveMilestone(milestone.id);
   ```

5. **Update Metrics**
   ```tsx
   // Add cash to balance
   const newCashBalance = currentMetrics.cash_balance + 500000;
   const newRunway = Math.floor(
     newCashBalance / currentMetrics.burn_rate
   );

   await metricsService.updateMetrics(currentMetrics.id, {
     cash_balance: newCashBalance,
     runway_months: newRunway
   });
   ```

### Workflow 3: Product Launch Milestone

**Goal:** Track product development and launch metrics.

**Steps:**

1. **Create MVP Milestone**
   ```tsx
   const mvpMilestone = await milestoneService.createMilestone({
     entity_id: entityId,
     title: 'Launch MVP',
     description: 'Ship minimum viable product to first customers',
     category: 'product',
     target_date: '2025-03-31',
     status: 'in_progress',
     priority: 'high'
   });
   ```

2. **Create Customer Acquisition Milestone**
   ```tsx
   const customerMilestone = await milestoneService.createMilestone({
     entity_id: entityId,
     title: 'First 100 Customers',
     description: 'Reach 100 paying customers',
     category: 'customer',
     target_date: '2025-06-30',
     target_value: 100,
     target_metric: 'active_customers',
     target_unit: 'customers',
     status: 'pending',
     priority: 'high',
     depends_on_milestone_id: mvpMilestone.id
   });
   ```

3. **Achieve MVP Launch**
   ```tsx
   await milestoneService.achieveMilestone(mvpMilestone.id);

   // Update dependent milestone
   await milestoneService.updateMilestone(customerMilestone.id, {
     status: 'in_progress'
   });
   ```

4. **Track Customer Growth**
   ```tsx
   // Update monthly to track progress
   const currentCustomers = 45;
   await milestoneService.updateProgress(
     customerMilestone.id,
     currentCustomers
   );
   // Progress = 45%
   ```

### Workflow 4: Team Expansion

**Goal:** Hire first employee and manage equity/vesting.

**Steps:**

1. **Create Hiring Milestone**
   ```tsx
   await milestoneService.createMilestone({
     entity_id: entityId,
     title: 'Hire CTO',
     description: 'Bring on technical co-founder',
     category: 'team',
     target_date: '2025-04-30',
     status: 'in_progress',
     priority: 'critical'
   });
   ```

2. **Add as Stakeholder**
   ```tsx
   const cto = await stakeholderService.createStakeholder({
     entity_id: entityId,
     stakeholder_type: 'co-founder',
     role_title: 'CTO',
     equity_pct: 25,
     shares_count: 2500000,
     share_class: 'common',
     vesting_start_date: '2025-04-01',
     vesting_cliff_months: 12,
     vesting_period_months: 48,
     vesting_schedule: 'monthly',
     employment_type: 'full_time',
     start_date: '2025-04-01',
     salary: 12000
   });
   ```

3. **Update Metrics**
   ```tsx
   // Increase headcount
   await metricsService.updateMetrics(currentMetrics.id, {
     employee_count: 2,
     payroll: currentMetrics.payroll + 12000
   });
   ```

4. **Review Cap Table**
   ```tsx
   // Check equity allocation
   const { totalEquity } = useStakeholders(entityId);

   if (totalEquity > 100) {
     console.warn('Over-allocated! Need to adjust equity.');
   }
   ```

---

## Best Practices

### Metrics Tracking

1. **Consistency is Key**
   - Update metrics on the same day each month
   - Use actual data, not estimates (mark projections with is_projected)
   - Keep historical data (don't delete old metrics)

2. **Calculate Unit Economics**
   - CAC = Marketing spend / New customers
   - LTV = ARPU × Average customer lifetime (months)
   - Target LTV:CAC ratio >= 3:1

3. **Monitor Runway**
   - Runway = Cash balance / Monthly burn rate
   - Update cash_balance monthly
   - Set milestones before running out (6 months, 3 months)

### Milestone Management

1. **SMART Goals**
   - Specific: "Reach $10k MRR" not "Grow revenue"
   - Measurable: Use target_value and current_value
   - Achievable: Set realistic targets
   - Relevant: Align with business strategy
   - Time-bound: Set target_date

2. **Dependencies**
   - Use depends_on_milestone_id for sequential goals
   - Don't start dependent milestones until prerequisite achieved

3. **Regular Updates**
   - Update progress weekly or bi-weekly
   - Mark missed milestones (don't delete them)
   - Analyze why milestones were missed

### Team & Equity

1. **Vesting Schedules**
   - Standard: 4-year vesting with 1-year cliff
   - Monthly vesting after cliff
   - Document vesting_schedule clearly

2. **Cap Table Hygiene**
   - Keep totalEquity <= 100%
   - Use share_class to differentiate (common, preferred, options)
   - Update when new investors join
   - Track option pool separately

3. **Stakeholder Updates**
   - Keep LinkedIn profiles updated
   - Mark is_active = false when someone leaves
   - Set end_date for former employees

---

## Integration Points

### Connection Transactions
Link business expenses to transactions:

```tsx
// Create transaction for monthly payroll
await transactionService.createTransaction({
  space_id: spaceId,
  description: 'Folha de pagamento - Janeiro',
  amount: currentMetrics.payroll,
  type: 'expense',
  category: 'payroll',
  transaction_date: new Date()
});
```

### Connection Events
Sync milestones with calendar:

```tsx
// Create calendar event for milestone deadline
await eventService.createEvent({
  space_id: spaceId,
  title: `Deadline: ${milestone.title}`,
  description: milestone.description,
  starts_at: milestone.target_date,
  event_type: 'deadline'
});
```

### Connection Documents
Store pitch decks and financials:

```tsx
// Upload pitch deck
await documentService.uploadDocument({
  space_id: spaceId,
  file_name: 'Pitch Deck Q1 2025.pdf',
  category: 'presentation',
  tags: ['fundraising', 'seed-round']
});
```

---

## Troubleshooting

### Issue: Runway calculation shows 0 or infinity

**Solution:**
```tsx
// Ensure burn_rate is positive
const burnRate = Math.max(total_expenses - mrr, 0);

// Prevent division by zero
const runwayMonths = burnRate > 0
  ? Math.floor(cash_balance / burnRate)
  : 999; // Or null if no burn
```

### Issue: MRR chart not showing data

**Solution:**
- Check that metrics have is_current = true
- Verify period_start and period_end are valid dates
- Ensure at least 2 data points for chart
- Check metricsHistory is sorted by period_start

### Issue: Equity adds up to more than 100%

**Solution:**
- Review all stakeholders with equity_pct > 0
- Use EquityTable component to visualize over-allocation
- Adjust percentages or use absolute shares_count instead
- Consider creating option pool as separate entry

---

## Additional Resources

- **Database Schema:** `supabase/migrations/20251214200000_connection_ventures.sql`
- **Type Definitions:** `src/modules/connections/ventures/types.ts`
- **Implementation Summary:** `docs/VENTURES_IMPLEMENTATION_SUMMARY.md`
- **Base Connection Schema:** `docs/CONNECTION_ARCHETYPES_README.md`

---

**Last Updated:** December 14, 2025
**Version:** 1.0.0
**Status:** Production Ready
