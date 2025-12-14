# JourneyMasterCard - Quick Start

## 5-Minute Setup

### Step 1: Import (30 seconds)

```typescript
import { JourneyMasterCard } from '@/modules/journey'
```

### Step 2: Add to Component (30 seconds)

```typescript
function Dashboard() {
  return (
    <JourneyMasterCard />
  )
}
```

### Step 3: Done! (4 minutes)

The component automatically:
- Fetches user data via useConsciousnessPoints()
- Displays CP, level, progress, and stats
- Handles loading and error states
- Supports notifications

---

## Common Use Cases

### Use Case 1: Dashboard Widget

```typescript
// pages/Dashboard.tsx
import { JourneyMasterCard } from '@/modules/journey'

export function Dashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      <JourneyMasterCard />
      <OtherWidget />
    </div>
  )
}
```

### Use Case 2: Expandable Card

```typescript
// components/JourneyWidget.tsx
import { useNavigate } from 'react-router-dom'
import { JourneyMasterCard } from '@/modules/journey'

export function JourneyWidget() {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate('/minha-jornada')}
      className="cursor-pointer"
    >
      <JourneyMasterCard />
      <p className="text-center mt-2 text-sm text-blue-600">
        Clique para expandir
      </p>
    </div>
  )
}
```

### Use Case 3: With Notifications

```typescript
// components/JourneyWithNotifications.tsx
import { useState } from 'react'
import { JourneyMasterCard } from '@/modules/journey'

export function JourneyWithNotifications() {
  const [hasNotification, setHasNotification] = useState(false)

  const handleNotificationClick = () => {
    console.log('Notification clicked')
    // Handle action here
    setHasNotification(false)
  }

  return (
    <JourneyMasterCard
      showNotification={hasNotification}
      onNotificationClick={handleNotificationClick}
    />
  )
}
```

### Use Case 4: Styled Variant

```typescript
// components/StyledJourneyCard.tsx
import { JourneyMasterCard } from '@/modules/journey'

export function StyledJourneyCard() {
  return (
    <JourneyMasterCard
      className="shadow-2xl border-2 border-blue-200"
    />
  )
}
```

---

## Testing the Component

### Test 1: Visual Inspection
1. Run your dev server
2. Navigate to the page with JourneyMasterCard
3. Verify:
   - Level badge displays correctly
   - Progress bar shows smooth animation
   - Stats are visible at bottom
   - Colors match your CP level

### Test 2: Loading State
1. Open DevTools Network tab
2. Throttle to "Slow 3G"
3. Reload page
4. Verify spinner shows while loading

### Test 3: Notification
```typescript
<JourneyMasterCard
  showNotification={true}
  onNotificationClick={() => alert('Clicked!')}
/>
```
Verify amber dot pulses and responds to click.

### Test 4: Responsive
1. Open on mobile device or use DevTools device mode
2. Verify layout adapts properly
3. Check all text is readable
4. Ensure touch targets are adequate

---

## Troubleshooting

### Issue: "Cannot find module"
**Solution:** Ensure import path is correct
```typescript
// ✓ Correct
import { JourneyMasterCard } from '@/modules/journey'

// ✗ Wrong
import { JourneyMasterCard } from '@/journey'
import JourneyMasterCard from '@/modules/journey/views/JourneyMasterCard'
```

### Issue: Shows "Carregando dados..."
**Solution:** Check authentication
```typescript
// In your component
const { user } = useAuth()
console.log('User:', user) // Should be defined

// If user is undefined, component waits for auth
```

### Issue: Notification doesn't animate
**Solution:** Check CSS
1. Open DevTools
2. Go to Element Inspector
3. Click the notification dot
4. Check if `.notification-pulse` class is applied
5. Check if `@keyframes pulse-amber` exists in CSS

### Issue: Colors are wrong
**Solution:** Check level value
```typescript
// In your component, add debugging
const { stats } = useConsciousnessPoints()
console.log('Current level:', stats?.level) // Should be 1-5
```

---

## API Reference (Quick)

### Props

```typescript
interface JourneyMasterCardProps {
  userId?: string              // User ID (optional, uses auth)
  showNotification?: boolean   // Show notification dot (default: false)
  onNotificationClick?: () => void  // Click handler
  className?: string           // Extra CSS classes
}
```

### Data (from useConsciousnessPoints hook)

```typescript
// What the component displays internally:
stats: {
  level: 1-5                      // Current level
  level_name: string              // Observador, Consciente, etc.
  total_points: number            // Total CP
  current_streak: number          // Days in streak
  longest_streak: number          // Best streak ever
  total_moments: number           // Moments recorded
  total_questions_answered: number // Questions answered
  total_summaries_reflected: number // Reflections written
}

progress: {
  progress_percentage: 0-100      // Progress to next level
  points_to_next: number          // CP needed
  next_level: 1-5 | null          // Next level or null if max
}
```

---

## Styling Customization

### Add Border
```typescript
<JourneyMasterCard className="border-2 border-blue-500" />
```

### Add Shadow
```typescript
<JourneyMasterCard className="shadow-2xl" />
```

### Set Width
```typescript
<div className="max-w-sm">
  <JourneyMasterCard />
</div>
```

### Custom Container
```typescript
<div className="p-6 bg-white rounded-xl">
  <JourneyMasterCard className="shadow-none" />
</div>
```

---

## Performance Tips

1. **Use once per page**: Component is self-contained, no need duplicates
2. **Don't over-render**: Place in stable part of component tree
3. **Optional refresh**: If needed, use the refresh function from hook
```typescript
const { refresh } = useConsciousnessPoints()
await refresh() // Refetch data manually
```

---

## Next Steps

1. **Add to a page**: Start using JourneyMasterCard in your dashboard
2. **Test thoroughly**: Try all states (loading, empty, normal)
3. **Gather feedback**: See how users interact with it
4. **Optimize if needed**: Profile and optimize for your use case
5. **Consider deprecation**: Plan to remove old components

---

## Real-World Example

```typescript
// pages/Home.tsx
import { JourneyMasterCard } from '@/modules/journey'
import { TaskList } from '@/components/TaskList'
import { Header } from '@/components/Header'
import { useState } from 'react'

export function Home() {
  const [showJourneyNotif, setShowJourneyNotif] = useState(false)

  return (
    <div className="min-h-screen bg-ceramic-base">
      <Header title="Dashboard" />

      <main className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Journey Card */}
          <div className="lg:col-span-1">
            <JourneyMasterCard
              showNotification={showJourneyNotif}
              onNotificationClick={() => {
                setShowJourneyNotif(false)
                // Handle notification action
              }}
            />
          </div>

          {/* Right: Tasks */}
          <div className="lg:col-span-2">
            <TaskList />
          </div>
        </div>
      </main>
    </div>
  )
}
```

---

## Key Features at a Glance

✓ Zero configuration needed
✓ Automatic data fetching
✓ Responsive design
✓ Smooth animations
✓ Loading states included
✓ Error handling built-in
✓ Notification support
✓ Ceramic Design System
✓ TypeScript support
✓ Accessibility ready

---

## Get Help

- **General questions**: See `JourneyMasterCard.README.md`
- **Integration help**: See `INTEGRATION_GUIDE.md`
- **Feature overview**: See `COMPONENT_SUMMARY.md`
- **Code examples**: See `JourneyMasterCard.examples.tsx`
- **Validation**: See `VALIDATION_CHECKLIST.md`

---

## Success Checklist

- [ ] Imported JourneyMasterCard
- [ ] Added to component
- [ ] No TypeScript errors
- [ ] Component renders
- [ ] Data displays correctly
- [ ] Animations work smoothly
- [ ] Mobile view looks good
- [ ] Tested with notifications (if using)
- [ ] Added to your dashboard
- [ ] Ready for production!

---

**That's it! You're ready to go.** The JourneyMasterCard is production-ready and requires minimal setup.
