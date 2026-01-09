# Journey Timeline - Implementation Checklist

Use this checklist to track implementation progress.

---

## Phase 1: Data Layer & Types (Est. 2-3 hours)

### Create Type Definitions
- [ ] Create file: `src/modules/journey/types/unifiedEvent.ts`
  - [ ] `UnifiedTimelineEvent` interface
  - [ ] `EventSource` type (union of 7 sources)
  - [ ] `EventType` type (union of 14+ event types)
  - [ ] `TimelineDay` interface
  - [ ] `TimelineFilter` interface
  - [ ] `TimelineStats` interface
  - [ ] `TimelineResponse` interface
  - [ ] Helper functions: `getEventIcon()`, `getEventColor()`, `groupEventsByDay()`
  - [ ] Type guards: `isWhatsAppEvent()`, `isMomentEvent()`, etc.

### Create Service Layer
- [ ] Create file: `src/modules/journey/services/unifiedTimelineService.ts`
  - [ ] `getUnifiedTimeline(userId, options)` - Main fetch function
    - [ ] Parallel fetch from 7 tables with Promise.all()
    - [ ] Handle filters (date range, sources)
    - [ ] Sort by eventTime DESC
    - [ ] Implement pagination
    - [ ] Return `TimelineResponse` type
  - [ ] `fetchWhatsAppMessages(userId, filter)` helper
    - [ ] Query whatsapp_messages table
    - [ ] Map to UnifiedTimelineEvent
    - [ ] Include sentiment, intent, topics
  - [ ] `fetchMoments(userId, filter)` helper
    - [ ] Query moments table
    - [ ] Map to UnifiedTimelineEvent
    - [ ] Include emotion, sentiment, tags
  - [ ] `fetchWorkItems(userId, filter)` helper
    - [ ] Query work_items table
    - [ ] Map completed/created events
    - [ ] Include priority, status
  - [ ] `fetchApprovals(userId, filter)` helper
    - [ ] Query grant_responses table
    - [ ] Map approved/rejected events
    - [ ] Include status, notes
  - [ ] `fetchActivities(userId, filter)` helper
    - [ ] Query whatsapp_user_activity table
    - [ ] Map activity types
    - [ ] Include metadata
  - [ ] `getTimelineStats(userId)` function
  - [ ] Count functions for each source
  - [ ] Error handling for all queries

### Create React Hook
- [ ] Create file: `src/modules/journey/hooks/useUnifiedTimeline.ts`
  - [ ] `useUnifiedTimeline(options)` hook
    - [ ] State: `events`, `days`, `isLoading`, `error`, `hasMore`
    - [ ] State: `filter`, `offset`
    - [ ] `fetchTimeline(offset)` - Calls service
    - [ ] `loadMore()` - Pagination
    - [ ] `refresh()` - Reset and refetch
    - [ ] `updateFilter(newFilter)` - Change filters
    - [ ] `toggleSourceFilter(source)` - Toggle individual sources
    - [ ] `setDateRange(days)` - Change date range
    - [ ] Auto-fetch on mount
    - [ ] Refetch when filter changes
    - [ ] Return all functions and state

### Testing - Phase 1
- [ ] Test `unifiedTimelineService.ts` with sample data
  - [ ] Verify WhatsApp queries work
  - [ ] Verify moments queries work
  - [ ] Verify task queries work
  - [ ] Verify approval queries work
  - [ ] Verify activity queries work
  - [ ] Verify sorting (newest first)
  - [ ] Verify pagination
  - [ ] Verify filters
- [ ] Test `useUnifiedTimeline` hook
  - [ ] Verify events load
  - [ ] Verify pagination works
  - [ ] Verify filtering works
  - [ ] Verify refresh works
  - [ ] Verify source toggle works
  - [ ] Verify date range works
- [ ] Check console for errors/warnings
- [ ] Check TypeScript compilation

---

## Phase 2: UI Components (Est. 3-4 hours)

### Create Timeline Display Component
- [ ] Create file: `src/modules/journey/components/timeline/UnifiedTimelineView.tsx`
  - [ ] Component accepts `userId` prop
  - [ ] Imports and uses `useUnifiedTimeline()` hook
  - [ ] Renders loading state
  - [ ] Renders empty state
  - [ ] Renders `TimelineFilter` component
  - [ ] Renders timeline days grouped by date
  - [ ] Shows day header with event count
  - [ ] Maps events to `TimelineEventCard` components
  - [ ] Renders "Load More" button
  - [ ] Uses framer-motion for animations
  - [ ] Uses ceramic design system classes
  - [ ] Responsive layout

### Create Event Card Component
- [ ] Create file: `src/modules/journey/components/timeline/TimelineEventCard.tsx`
  - [ ] Component accepts `UnifiedTimelineEvent` prop
  - [ ] Displays event icon
  - [ ] Displays event title
  - [ ] Displays event time (formatted)
  - [ ] Displays event content preview
  - [ ] Shows sentiment/emotion badges
  - [ ] Shows tags if present
  - [ ] Expandable for full content
  - [ ] Has hover effects (ceramic design)
  - [ ] Shows source indicator
  - [ ] Styled with ceramic system
  - [ ] Responsive text sizing
  - [ ] Truncation for long content

### Create Filter Component
- [ ] Create file: `src/modules/journey/components/timeline/TimelineFilter.tsx`
  - [ ] Component accepts filter state props
  - [ ] Renders source toggles
    - [ ] 💬 WhatsApp toggle
    - [ ] 📝 Moments toggle
    - [ ] ✓ Tasks toggle
    - [ ] ✅ Approvals toggle
    - [ ] 📊 Activities toggle
    - [ ] ❓ Questions toggle
    - [ ] 📈 Summaries toggle
  - [ ] Renders date range selector
    - [ ] Last 7 days option
    - [ ] Last 30 days option
    - [ ] Last 90 days option
    - [ ] All time option
  - [ ] Calls `onSourceToggle()` callback
  - [ ] Calls `onDateRangeChange()` callback
  - [ ] Shows active filters visually
  - [ ] Styled with ceramic tray
  - [ ] Responsive layout

### Testing - Phase 2
- [ ] Visual inspection of components
  - [ ] UnifiedTimelineView displays correctly
  - [ ] TimelineEventCard shows all event types
  - [ ] TimelineFilter shows all options
  - [ ] Responsive on mobile (test with resize)
  - [ ] Dark/light mode compatibility
- [ ] Interaction testing
  - [ ] Clicking source toggle updates display
  - [ ] Clicking date range updates display
  - [ ] Clicking "Load More" loads more events
  - [ ] Expanding event card shows full content
  - [ ] No layout shifts or jank
- [ ] Animation testing
  - [ ] Fade in animations smooth
  - [ ] No animation glitches
  - [ ] Animations don't stutter
- [ ] Check console for errors/warnings

---

## Phase 3: Integration (Est. 1-2 hours)

### Integrate into JourneyFullScreen
- [ ] Modify: `src/modules/journey/views/JourneyFullScreen.tsx`
  - [ ] Import `useUnifiedTimeline` hook
  - [ ] Remove/comment out `useMoments` hook
  - [ ] Import `UnifiedTimelineView` component
  - [ ] Replace LifeDecadesStrip with UnifiedTimelineView
    - [ ] Line 292-295: Replace LifeDecadesStrip section
  - [ ] Remove LifeDecadesStrip import
  - [ ] Keep existing tab structure
  - [ ] Rename "Timeline Viva" tab to "Atividades" (optional)
  - [ ] Update tab descriptions if needed
  - [ ] Test that all three tabs work

### Update Module Exports
- [ ] Update: `src/modules/journey/index.ts`
  - [ ] Add exports for new types (if needed)
  - [ ] Add exports for new services (if needed)
  - [ ] Add exports for new hooks (if needed)
  - [ ] Add exports for new components (if needed)

### Update Barrel Exports
- [ ] Check: `src/components/index.ts`
  - [ ] May need to update if component is re-exported

### Testing - Phase 3
- [ ] Full integration testing
  - [ ] App starts without errors
  - [ ] Journey page loads
  - [ ] Timeline Viva (Atividades) tab shows events
  - [ ] All 7 event sources display
  - [ ] Filtering works
  - [ ] Pagination works
  - [ ] Other tabs still work (Insights, Search)
- [ ] Navigation testing
  - [ ] Can switch between tabs
  - [ ] Tab state persists (no re-render on filter change)
  - [ ] "Load More" doesn't reset view
- [ ] TypeScript compilation
  - [ ] No TS errors
  - [ ] No type safety issues
- [ ] Console check
  - [ ] No errors
  - [ ] No warnings
  - [ ] No deprecation notices

---

## Phase 4: Testing & Validation (Est. 1-2 hours)

### Functional Testing
- [ ] Event display
  - [ ] [x] All event types display correctly
  - [ ] [x] Event times are accurate
  - [ ] [x] Event content shows (truncated and full)
  - [ ] [x] Sentiment colors correct
  - [ ] [x] Emotion emojis display
  - [ ] [x] Tags show correctly
- [ ] Filtering
  - [ ] [x] Source filtering works for all 7 sources
  - [ ] [x] Date range filtering works
  - [ ] [x] Multiple filters work together
  - [ ] [x] Clearing filters resets view
- [ ] Pagination
  - [ ] [x] Initial load shows 50 events
  - [ ] [x] "Load More" button appears when has more
  - [ ] [x] "Load More" loads next batch
  - [ ] [x] No duplicate events on load more
  - [ ] [x] Scroll position maintained
- [ ] Performance
  - [ ] [x] Initial load < 1 second
  - [ ] [x] Filter change < 500ms
  - [ ] [x] Load more < 500ms
  - [ ] [x] No memory leaks
  - [ ] [x] No unnecessary re-renders

### UI/UX Testing
- [ ] Visual alignment
  - [ ] [x] Consistent with ceramic design system
  - [ ] [x] Proper spacing and alignment
  - [ ] [x] Icons display correctly
  - [ ] [x] Colors readable (contrast)
- [ ] Responsive design
  - [ ] [x] Desktop (1920px)
  - [ ] [x] Tablet (768px)
  - [ ] [x] Mobile (375px)
  - [ ] [x] No horizontal scroll
  - [ ] [x] Touch targets adequate (mobile)
- [ ] Accessibility
  - [ ] [x] Keyboard navigation works
  - [ ] [x] Screen reader friendly
  - [ ] [x] Color not only indicator
  - [ ] [x] ARIA labels present
- [ ] Animation quality
  - [ ] [x] Smooth transitions
  - [ ] [x] No jank or stuttering
  - [ ] [x] Animations respect prefers-reduced-motion

### Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome
- [ ] Mobile Safari

### Regression Testing
- [ ] Other journey features still work
  - [ ] [x] Moment capture works
  - [ ] [x] Daily questions work
  - [ ] [x] Weekly summaries work
  - [ ] [x] CP score displays
  - [ ] [x] Insights tab works
  - [ ] [x] Search tab works
- [ ] Other modules not affected
  - [ ] [x] Atlas module unchanged
  - [ ] [x] Grants module unchanged
  - [ ] [x] Connections module unchanged
  - [ ] [x] Other modules unchanged

### Documentation
- [ ] [ ] Update CLAUDE.md with new timeline architecture (optional)
- [ ] [ ] Add JSDoc comments to new functions
- [ ] [ ] Add component prop documentation
- [ ] [ ] Add usage examples in comments

---

## Phase 5: Optimization (Est. 0-1 hour, if needed)

### Performance Optimization
- [ ] If initial load > 1 second:
  - [ ] Implement query limit reduction
  - [ ] Add loading skeleton
  - [ ] Implement virtual scrolling
- [ ] If filter change > 500ms:
  - [ ] Implement debouncing
  - [ ] Cache filtered results
  - [ ] Optimize sorting logic
- [ ] If memory usage high:
  - [ ] Limit events in state
  - [ ] Implement event cleanup
  - [ ] Add garbage collection

### Database Optimization (Optional)
- [ ] Create unified_timeline_events view (if performance needed)
  - [ ] Create migration file
  - [ ] Add indexes
  - [ ] Test query performance
  - [ ] Update service to use view

### Caching Strategy (Optional)
- [ ] Implement timeline cache
  - [ ] Cache 1 hour of events
  - [ ] Invalidate on new events
  - [ ] Manual refresh button
  - [ ] Background sync

---

## Phase 6: Cleanup (Est. 0-1 hour)

### Remove Old Code
- [ ] Decide: Keep or remove LifeDecadesStrip.tsx
  - [ ] Option 1: Delete file
  - [ ] Option 2: Archive in `/archived` folder
  - [ ] Option 3: Keep for fallback (not recommended)
- [ ] Remove LifeDecadesStrip imports from other files
- [ ] Remove LifeDecadesStrip from barrel exports

### Code Quality
- [ ] Run ESLint on new files
  - [ ] Fix any warnings
  - [ ] Follow project conventions
- [ ] Run TypeScript check
  - [ ] Fix any errors
  - [ ] Ensure all types correct
- [ ] Code review (self)
  - [ ] Check for console.log() statements
  - [ ] Check for TODO/FIXME comments (intentional only)
  - [ ] Check for dead code
  - [ ] Check for unused imports
- [ ] Update git commit message

### Documentation
- [ ] [ ] Update README.md if needed
- [ ] [ ] Update CLAUDE.md timeline documentation
- [ ] [ ] Comment significant code sections
- [ ] [ ] Add examples in code

---

## Final Verification Checklist

Before considering done:

### Functionality
- [ ] ✅ Timeline displays all 7 event sources
- [ ] ✅ Events from WhatsApp show
- [ ] ✅ Events from moments show
- [ ] ✅ Events from tasks show
- [ ] ✅ Events from approvals show
- [ ] ✅ Events from activities show
- [ ] ✅ Events sorted chronologically (newest first)
- [ ] ✅ Events grouped by day
- [ ] ✅ Filtering works (by source and date)
- [ ] ✅ Pagination works (load 50 at a time)
- [ ] ✅ Search covers all events (extended)
- [ ] ✅ No navigation issues (all tabs work)

### Quality
- [ ] ✅ No console errors
- [ ] ✅ No console warnings
- [ ] ✅ TypeScript passes
- [ ] ✅ No type errors
- [ ] ✅ Accessible (keyboard + screen reader)
- [ ] ✅ Responsive (desktop, tablet, mobile)
- [ ] ✅ Performance acceptable (< 1s load)
- [ ] ✅ Animations smooth
- [ ] ✅ UI consistent with ceramic design

### Testing
- [ ] ✅ Tested on Chrome
- [ ] ✅ Tested on Firefox
- [ ] ✅ Tested on Safari
- [ ] ✅ Tested on mobile
- [ ] ✅ No regression in other features
- [ ] ✅ Database queries perform well

### Documentation
- [ ] ✅ Code is commented
- [ ] ✅ Components have prop docs
- [ ] ✅ README updated
- [ ] ✅ CLAUDE.md updated

---

## Deployment Checklist

Before pushing to production:

- [ ] All tests passing
- [ ] Code reviewed
- [ ] Changelog updated
- [ ] Documentation updated
- [ ] Git commit message clear
- [ ] Git branch clean
- [ ] Ready for GitHub trigger deploy

```bash
# Before pushing:
npm run build          # Verify build succeeds
npm run typecheck      # Verify types
npm run lint           # Verify code style
npm run test           # Run unit tests (if any)
npm run test:e2e       # Run E2E tests (if applicable)

# Then push:
git add -A
git commit -m "feat(journey): Implement unified timeline with multi-source events"
git push origin feature/journey-unified-timeline
```

---

## Estimated Timeline

| Phase | Tasks | Est. Time | Actual |
|-------|-------|-----------|--------|
| 1 | Data layer & types | 2-3h | __ |
| 2 | UI components | 3-4h | __ |
| 3 | Integration | 1-2h | __ |
| 4 | Testing & validation | 1-2h | __ |
| 5 | Optimization | 0-1h | __ |
| 6 | Cleanup | 0-1h | __ |
| **TOTAL** | | **7-13h** | __ |

**Note:** Times are estimates. Actual may vary based on complexity discovered during implementation.

---

## Success Criteria Met?

By end of implementation, these should all be true:

- [ ] ✅ **Users see real activities** on timeline (not just life decades)
- [ ] ✅ **Timeline shows all 7 sources** (WhatsApp, moments, tasks, approvals, activities, questions, summaries)
- [ ] ✅ **Users can filter** by source and date range
- [ ] ✅ **Navigation works** (all tabs functional, no broken links)
- [ ] ✅ **No regressions** in existing features
- [ ] ✅ **Performance acceptable** (< 1 second load time)
- [ ] ✅ **No console errors** or warnings
- [ ] ✅ **Code quality** meets project standards
- [ ] ✅ **Tested** on multiple devices and browsers

---

**Good luck with implementation! 🚀**

