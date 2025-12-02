# Efficiency Score System Documentation

## Overview

The Efficiency Score System is a comprehensive analytics and visualization module that tracks user productivity across multiple dimensions. It provides real-time efficiency metrics, trend analysis, and module-specific performance insights integrated into the Life Dashboard.

## Architecture

### Components

#### 1. **EfficiencyScoreCard** (`src/components/EfficiencyScoreCard.tsx`)
- **Purpose**: Displays daily efficiency metrics in an expandable card format
- **Features**:
  - Overall efficiency score (0-100%)
  - Sub-scores: Productivity, Focus, Consistency
  - Weekly vs monthly comparison
  - Streak tracking (🔥 icon)
  - Module performance breakdown
  - Trend indicators (improving/stable/declining)
- **Integration**: Placed at the top of the Life Dashboard (Minha Vida view)
- **Responsive**: Compact mode for mobile, expandable for detailed view

#### 2. **EfficiencyTrendChart** (`src/components/EfficiencyTrendChart.tsx`)
- **Purpose**: Visualizes efficiency trends over time with interactive analytics
- **Features**:
  - Line and bar chart visualization (7/14/30 day views)
  - Productivity level distribution
  - Weekly goal tracking
  - Average, max, and min score metrics
  - Color-coded productivity levels
- **Data Source**: `daily_reports` table
- **Chart Library**: Recharts

#### 3. **efficiencyService** (`src/services/efficiencyService.ts`)
- **Purpose**: Core business logic for calculating efficiency metrics
- **Key Functions**:

```typescript
// Calculate daily efficiency score
calculateDailyEfficiency(userId, date): Promise<EfficiencyScore>

// Get module-level performance
calculateModuleEfficiency(userId, date): Promise<ModuleEfficiency[]>

// Fetch trend data
getEfficiencyTrends(userId, days): Promise<EfficiencyTrend[]>

// Comprehensive metrics
getEfficiencyMetrics(userId, date): Promise<EfficiencyMetrics>
```

## Metrics Calculation

### Overall Efficiency Score Formula

```
Overall Score = (Completion Rate × 0.4) + (Focus Score × 0.3) + (Consistency Score × 0.3)
```

**Components:**

1. **Completion Rate** (40% weight)
   - Completed Tasks / Total Tasks for the day
   - Range: 0-100%

2. **Focus Score** (30% weight)
   - Based on task completion depth and average task duration
   - Formula: `(Completion Bonus × 0.6) + (Focus Bonus × 0.4)`
   - Ideal task duration: 30-120 minutes

3. **Consistency Score** (30% weight)
   - Weighted average of:
     - Completion Rate (50%)
     - Streak Days (30%) - max 20 days = 100%
     - Energy Level (20%) - normalized from 1-5 scale

### Productivity Levels

| Level | Score Range | Emoji | Color | Meaning |
|-------|-------------|-------|-------|---------|
| Excellent | 90-100 | 🌟 | #10b981 (Green) | Peak performance |
| Good | 75-89 | 👍 | #3b82f6 (Blue) | Above target |
| Fair | 60-74 | 😐 | #f59e0b (Amber) | Meeting minimum |
| Poor | 40-59 | ⚠️ | #ef4444 (Red) | Below target |
| Critical | 0-39 | ❌ | #dc2626 (Dark Red) | Needs attention |

### Trend Calculation

Compares recent 3-day average to baseline:
- **Improving**: Recent score > Baseline + 10%
- **Declining**: Recent score < Baseline - 10%
- **Stable**: Otherwise

## Data Dependencies

### Required Tables

1. **work_items**
   - `id`, `user_id`, `title`
   - `completed_at` (NULL if incomplete)
   - `estimated_duration` (minutes)
   - `created_at`, `updated_at`
   - `module_id`, `association_id`

2. **daily_reports**
   - `user_id`, `date`
   - `productivity_score` (0-100)
   - `mood`, `energy_level` (1-5)
   - `tasks_completed`, `stress_level`

3. **life_areas**
   - `id`, `name`
   - `association_id`, `user_id`

4. **user_streaks** (optional)
   - `user_id`, `current_streak`

## Integration Points

### Life Dashboard (Minha Vida View)

The efficiency visualization is automatically displayed:

```tsx
{userId && <EfficiencyScoreCard userId={userId} />}
{userId && <EfficiencyTrendChart userId={userId} days={30} />}
```

### Notification Trigger

Can trigger notifications when:
- User achieves "Excellent" productivity level
- Streak is broken
- Weekly goal is missed

### Gamification Integration

Efficiency metrics feed into:
- XP calculations
- Achievement unlocks
- Streak tracking

## API Functions

### EfficiencyService

#### `calculateDailyEfficiency(userId, date)`
```typescript
Returns: EfficiencyScore {
  overall: number,      // 0-100
  productivity: number, // 0-100
  focus: number,        // 0-100
  consistency: number,  // 0-100
  trend: 'improving' | 'stable' | 'declining'
}
```

#### `calculateModuleEfficiency(userId, date)`
```typescript
Returns: ModuleEfficiency[] {
  moduleId: string,
  moduleName: string,
  score: number,           // 0-100
  tasksCompleted: number,
  tasksTotal: number,
  completionRate: number,  // 0-100
  averageTimePerTask: number // minutes
}
```

#### `getEfficiencyTrends(userId, days)`
```typescript
Returns: EfficiencyTrend[] {
  date: string (ISO),
  score: number,           // 0-100
  tasksCompleted: number,
  productivityLevel: string // 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
}
```

## Performance Considerations

### Query Optimization

1. **Daily Calculations**: Run once per day (e.g., 23:55 UTC) via n8n
2. **Trend Queries**: Limited to 30-day windows
3. **Module Aggregation**: Done in-memory after fetch
4. **Caching**: Component-level caching with useEffect dependencies

### Database Indexes

Recommended indexes for optimal performance:

```sql
-- work_items queries
CREATE INDEX idx_work_items_user_date ON work_items(user_id, created_at);
CREATE INDEX idx_work_items_completed ON work_items(user_id, completed_at);

-- daily_reports queries
CREATE INDEX idx_daily_reports_user_date ON daily_reports(user_id, date);

-- life_areas queries
CREATE INDEX idx_life_areas_user ON life_areas(user_id);
```

## Styling

### CSS Classes

**EfficiencyScoreCard:**
- `.efficiency-score-card` - Main container
- `.efficiency-header` - Header section with score badge
- `.efficiency-expanded` - Expandable content area
- `.subscores-grid` - 3-column grid for sub-scores
- `.weekly-comparison` - Week vs month comparison
- `.module-item` - Module performance item

**EfficiencyTrendChart:**
- `.efficiency-trend-chart` - Main container
- `.chart-header` - Header with range selector
- `.chart-container` - Recharts container
- `.distribution-section` - Productivity distribution bars
- `.weekly-goals` - Goal tracking section

### Responsive Breakpoints

- **Desktop**: 1024px+ - Full layout with all details
- **Tablet**: 768px-1023px - Adjusted grid layout
- **Mobile**: 480px-767px - Single column, collapsible sections
- **Small Mobile**: <480px - Minimal spacing, simplified charts

## Error Handling

### Graceful Degradation

1. **Missing daily_reports**: Returns 0 scores
2. **No work_items**: Shows "no data available"
3. **API Failures**: Loads last cached state
4. **Database Errors**: Logs to console, displays fallback UI

### Example Error Handling

```typescript
try {
  const metrics = await getEfficiencyMetrics(userId, date);
  setMetrics(metrics);
} catch (error) {
  console.error('Error loading efficiency metrics:', error);
  // Component shows loading state or fallback UI
}
```

## Future Enhancements

### Planned Features

1. **Predictive Analytics**
   - ML-based efficiency forecasting
   - Anomaly detection for unusual patterns

2. **Goal Setting**
   - User-defined efficiency targets
   - Weekly/monthly goals with notifications

3. **Comparison Features**
   - Week-over-week analysis
   - Month-over-month trends
   - Benchmark against personal best

4. **Export Capabilities**
   - PDF reports
   - CSV data exports
   - Share progress summaries

5. **Real-time Insights**
   - Daily insights via notifications
   - Micro-feedback during task completion
   - Energy level recommendations

6. **Mobile Optimization**
   - Simplified mobile charts
   - Swipe gestures for range selection
   - Quick action cards

## Testing

### Unit Tests

```typescript
// Example test
describe('calculateDailyEfficiency', () => {
  it('should return score between 0-100', async () => {
    const score = await calculateDailyEfficiency(userId, date);
    expect(score.overall).toBeGreaterThanOrEqual(0);
    expect(score.overall).toBeLessThanOrEqual(100);
  });
});
```

### Mock Data

```typescript
const mockMetrics: EfficiencyMetrics = {
  date: '2025-12-02',
  score: {
    overall: 85,
    productivity: 90,
    focus: 80,
    consistency: 85,
    trend: 'improving'
  },
  moduleScores: [...],
  weeklyAverage: 82,
  monthlyAverage: 78,
  streakDays: 15,
  consistencyDays: 20
};
```

## Troubleshooting

### Common Issues

1. **Scores showing 0%**
   - Check `daily_reports` table has data
   - Verify user_id matches session
   - Review database RLS policies

2. **Charts not rendering**
   - Ensure Recharts is installed
   - Check browser console for errors
   - Verify trend data is not empty

3. **Module scores missing**
   - Check `life_areas` table existence
   - Verify association_id relationships
   - Ensure work_items have module_id

### Debug Mode

Enable console logging in efficiencyService:

```typescript
// Add to functions:
console.log('📊 Efficiency Metrics:', metrics);
console.log('📈 Trends:', trends);
```

## References

- **Gamification Service**: Integrates with XP and achievement systems
- **Daily Report Service**: Provides productivity_score data
- **Supabase Service**: Handles all database queries
- **Notification Service**: Sends efficiency-based alerts

---

**Last Updated**: December 2, 2025
**Status**: Production Ready
**Version**: 1.0.0
