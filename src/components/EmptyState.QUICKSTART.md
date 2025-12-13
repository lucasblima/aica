# EmptyState Component - Quick Start Guide

> 🚀 Get started with the EmptyState component in 60 seconds

## 1. Basic Import

```tsx
import EmptyState from './components/EmptyState';
```

## 2. Choose Your State Type

| Type | When to Use | Example |
|------|-------------|---------|
| `new_user` | First time user, onboarding | Registration flow |
| `no_data_today` | Active user, no data today | Daily dashboard |
| `insufficient_data` | Need more data points | Analytics charts |
| `no_data_period` | Empty date range | Filtered results |

## 3. Basic Usage

```tsx
// Simplest usage
<EmptyState type="new_user" />

// With action
<EmptyState
  type="no_data_today"
  onPrimaryAction={() => console.log('Clicked!')}
/>

// With both actions
<EmptyState
  type="no_data_period"
  onPrimaryAction={() => console.log('Primary')}
  onSecondaryAction={() => console.log('Secondary')}
/>
```

## 4. Common Patterns

### Pattern 1: Data Loading

```tsx
function MyComponent() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  if (loading) return <Skeleton />;
  if (!data.length) return <EmptyState type="no_data_today" />;
  return <DataDisplay data={data} />;
}
```

### Pattern 2: With Actions

```tsx
<EmptyState
  type="insufficient_data"
  onPrimaryAction={() => navigate('/create')}
/>
```

### Pattern 3: Custom Messages

```tsx
<EmptyState
  type="no_data_period"
  customTitle="No Results Found"
  customMessage="Try adjusting your filters"
  onPrimaryAction={() => resetFilters()}
/>
```

### Pattern 4: Period Selection

```tsx
<EmptyState
  type="no_data_period"
  selectedDays={30}  // Auto-updates message
  onPrimaryAction={() => openPeriodSelector()}
/>
```

## 5. State Type Quick Reference

### `new_user`
```tsx
<EmptyState
  type="new_user"
  onPrimaryAction={() => navigate('/register-moment')}
  onSecondaryAction={() => navigate('/learn-more')}
/>
```
**Shows**: "Comece sua Jornada de Consciência"
**Primary CTA**: "Registrar Primeiro Momento"
**Secondary CTA**: "Conhecer o Sistema"

### `no_data_today`
```tsx
<EmptyState
  type="no_data_today"
  onPrimaryAction={() => openCreateModal()}
  onSecondaryAction={() => navigate('/history')}
/>
```
**Shows**: "Nenhum Momento Registrado Ainda"
**Primary CTA**: "Registrar Momento"
**Secondary CTA**: "Ver Histórico"

### `insufficient_data`
```tsx
<EmptyState
  type="insufficient_data"
  onPrimaryAction={() => openCreateModal()}
/>
```
**Shows**: "Dados Insuficientes"
**Primary CTA**: "Registrar Momento"
**Secondary CTA**: None

### `no_data_period`
```tsx
<EmptyState
  type="no_data_period"
  selectedDays={30}
  onPrimaryAction={() => changePeriod()}
  onSecondaryAction={() => createNew()}
/>
```
**Shows**: "Sem Dados no Período"
**Primary CTA**: "Mudar Período"
**Secondary CTA**: "Registrar Momento"

## 6. Props Cheatsheet

```typescript
type EmptyStateProps = {
  // Required
  type: 'new_user' | 'no_data_today' | 'insufficient_data' | 'no_data_period';

  // Optional
  onPrimaryAction?: () => void;      // Primary button callback
  onSecondaryAction?: () => void;    // Secondary button callback
  selectedDays?: number;             // For no_data_period type
  customTitle?: string;              // Override title
  customMessage?: string;            // Override message
}
```

## 7. Examples for Copy/Paste

### Dashboard Empty State
```tsx
const Dashboard = () => {
  const [moments, setMoments] = useState([]);

  if (!moments.length) {
    return (
      <EmptyState
        type="no_data_today"
        onPrimaryAction={() => setShowModal(true)}
      />
    );
  }

  return <MomentsView moments={moments} />;
};
```

### Chart Empty State
```tsx
const EfficiencyChart = ({ data }) => {
  if (data.length < 2) {
    return (
      <EmptyState
        type="insufficient_data"
        onPrimaryAction={() => navigate('/moments/create')}
      />
    );
  }

  return <Chart data={data} />;
};
```

### Filtered Results Empty State
```tsx
const FilteredView = ({ results, days }) => {
  if (!results.length) {
    return (
      <EmptyState
        type="no_data_period"
        selectedDays={days}
        onPrimaryAction={() => resetFilters()}
      />
    );
  }

  return <ResultsList results={results} />;
};
```

### Onboarding Empty State
```tsx
const OnboardingDashboard = ({ isNewUser }) => {
  if (isNewUser) {
    return (
      <EmptyState
        type="new_user"
        onPrimaryAction={() => navigate('/onboarding')}
        onSecondaryAction={() => navigate('/tour')}
      />
    );
  }

  return <Dashboard />;
};
```

## 8. Styling Tips

The component uses its own CSS file and doesn't require additional styling. However, you can wrap it:

```tsx
// Add container constraints
<div className="max-w-4xl mx-auto">
  <EmptyState type="no_data_today" />
</div>

// Add spacing
<div className="my-8">
  <EmptyState type="insufficient_data" />
</div>
```

## 9. Accessibility

The component is accessible by default. No additional work needed!

- ✅ Keyboard navigation works
- ✅ Screen readers supported
- ✅ Focus indicators visible
- ✅ ARIA roles included
- ✅ Color contrast meets WCAG AA

## 10. Common Mistakes to Avoid

### ❌ Don't: Forget to handle actions
```tsx
// Missing action handler
<EmptyState type="new_user" />
```

### ✅ Do: Provide action handlers
```tsx
<EmptyState
  type="new_user"
  onPrimaryAction={handleRegister}
/>
```

### ❌ Don't: Use wrong state type
```tsx
// New user but showing "no_data_today"
<EmptyState type="no_data_today" />
```

### ✅ Do: Choose appropriate state
```tsx
// Determine state based on user context
<EmptyState type={isNewUser ? 'new_user' : 'no_data_today'} />
```

### ❌ Don't: Override messages unnecessarily
```tsx
// Using custom messages for standard cases
<EmptyState
  type="new_user"
  customTitle="Start Now"
  customMessage="Click to begin"
/>
```

### ✅ Do: Use defaults when possible
```tsx
// Let the component use optimized defaults
<EmptyState type="new_user" onPrimaryAction={handleStart} />
```

## 11. Troubleshooting

### Component not showing?
- Check if parent container has height
- Verify component is imported correctly
- Check console for errors

### Animations not working?
- Check if Framer Motion is installed
- User may have reduced motion enabled (this is good!)
- Check browser console for warnings

### Buttons not clickable?
- Verify callbacks are provided
- Check z-index conflicts
- Ensure no overlay blocking clicks

### Styling looks wrong?
- Ensure CSS file is imported
- Check for conflicting global styles
- Verify parent container isn't constraining size

## 12. Need More Help?

1. 📖 Read full docs: `EmptyState.README.md`
2. 🏗️ See architecture: `EmptyState.ARCHITECTURE.md`
3. 💡 Check examples: `EmptyState.example.tsx`
4. 🔍 View source: `EmptyState.tsx`

## 13. Quick Decision Tree

```
Do you have data?
  No → Is this a new user?
    Yes → type="new_user"
    No → Is this today's view?
      Yes → type="no_data_today"
      No → Less than 2 data points?
        Yes → type="insufficient_data"
        No → type="no_data_period"
  Yes → Don't use EmptyState, show data!
```

## 14. Testing Your Implementation

```tsx
// Quick test checklist
const TestEmptyState = () => {
  const [type, setType] = useState('new_user');

  return (
    <div>
      {/* Test selector */}
      <select onChange={(e) => setType(e.target.value)}>
        <option value="new_user">New User</option>
        <option value="no_data_today">No Data Today</option>
        <option value="insufficient_data">Insufficient Data</option>
        <option value="no_data_period">No Data Period</option>
      </select>

      {/* Component under test */}
      <EmptyState
        type={type}
        onPrimaryAction={() => alert('Primary clicked!')}
        onSecondaryAction={() => alert('Secondary clicked!')}
      />
    </div>
  );
};
```

---

**Ready to use!** Start with the basic patterns above and customize as needed.

For complete documentation, see `EmptyState.README.md`
