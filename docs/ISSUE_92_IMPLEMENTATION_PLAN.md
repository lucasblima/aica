# Issue #92 Implementation Plan - Rich WhatsApp Contact UI

**Status**: Phase 1 In Review (PR #149)
**Last Updated**: 2026-01-21
**Owner**: Lucas Boscacci Lima + Claude Sonnet 4.5

---

## 📋 Complete Task List

### 🔴 PRIORITY 1: Critical (Do First)

#### PR #149 Review & Completion
- [ ] **Add unit tests for ContactCardGrid.tsx** 🟡 (GitHub Actions review comment)
  - Test loading state renders 6 skeleton cards
  - Test empty state shows correct message for search/filters
  - Test contact grid renders correctly with contacts
  - Test `onContactClick` callback is called with correct contact
  - **Files**: `src/components/features/ContactCardGrid.test.tsx` (NEW)
  - **Estimated**: 1-2 hours

- [ ] **Add E2E test for contact card visibility** (Original Phase 1 plan)
  - Test cards are visible after WhatsApp sync completes
  - Test cards remain visible after page refresh
  - Test cards remain visible after navigation away and back
  - Test click events work on all cards
  - **Files**: `tests/e2e/contacts-visibility.spec.ts` (NEW)
  - **Estimated**: 1-2 hours
  - **Skill**: `testing-qa-playwright`

- [ ] **Export ContactCardGrid in barrel index** (Code hygiene)
  - Already done in `src/components/features/index.ts` ✅
  - Verify export is working
  - **Estimated**: 5 minutes

- [ ] **Merge PR #149** (After tests pass)
  - Review all tests pass
  - Check for merge conflicts
  - Squash and merge to main
  - **Estimated**: 15 minutes

---

#### Database Fixes (Blocking Production Issues)
- [ ] **Apply Supabase migration: fix_users_table_missing_columns.sql**
  - Fixes 406 error on `public.users` table
  - Adds missing columns: name, active, onboarding_completed, etc.
  - Creates auto-sync trigger from auth.users
  - **Files**: `supabase/migrations/20260121000004_fix_users_table_missing_columns.sql`
  - **Method**: Apply via Supabase SQL Editor (recommended) or `supabase db push`
  - **Estimated**: 10 minutes
  - **Documentation**: `docs/APPLY_CRITICAL_FIXES.md`
  - **Skill**: `backend-architect-supabase`

- [ ] **Apply Supabase migration: grant_whatsapp_rpc_permissions.sql**
  - Fixes 400 error on generate-pairing-code Edge Function
  - Grants EXECUTE permissions on 6 WhatsApp RPC functions
  - **Files**: `supabase/migrations/20260121000005_grant_whatsapp_rpc_permissions.sql`
  - **Method**: Apply via Supabase SQL Editor (recommended) or `supabase db push`
  - **Estimated**: 5 minutes
  - **Skill**: `backend-architect-supabase`

- [ ] **Update getUserProfile() to use RPC function** (Code fix)
  - Prevents 406 errors by using `ensure_user_profile_exists()` RPC
  - **Files**: `src/services/supabaseService.ts` (lines 113-127)
  - **Status**: Already modified by backend-architect agent ✅
  - Need to commit this change
  - **Estimated**: 5 minutes

---

### 🟡 PRIORITY 2: Phase 2 - Real-Time Synchronization

- [ ] **Create useContactNetworkSubscription hook** (Real-time data sync)
  - Subscribe to INSERT/UPDATE/DELETE on contact_network table
  - Handle connection state (connecting, connected, error)
  - Implement reconnection logic with exponential backoff
  - Add local state updates on real-time events
  - **Files**: `src/hooks/useContactNetworkSubscription.ts` (NEW)
  - **Pattern**: Follow `src/hooks/useWhatsAppSessionSubscription.ts`
  - **Estimated**: 2-3 hours
  - **Skill**: `backend-architect-supabase`

- [ ] **Create SyncStatusIndicator component** (Visual feedback)
  - Show sync states: idle, syncing, synced, error
  - Auto-hide after 3 seconds when synced
  - Show error message with retry button
  - Use ceramic design system styles
  - **Files**: `src/components/ui/SyncStatusIndicator.tsx` (NEW)
  - **Estimated**: 1 hour
  - **Skill**: `ux-design-guardian`

- [ ] **Integrate real-time sync into ContactsView** (Hook usage)
  - Replace manual loadContacts() calls with subscription hook
  - Add SyncStatusIndicator to page header
  - Handle optimistic UI updates
  - Add toast notifications for sync events
  - **Files**: `src/pages/ContactsView.tsx` (MODIFY)
  - **Estimated**: 1-2 hours

- [ ] **Add E2E tests for real-time sync** (Quality assurance)
  - Test contacts appear immediately after webhook sync
  - Test contacts update when edited in database
  - Test connection recovery after network interruption
  - **Files**: `tests/e2e/contacts-realtime-sync.spec.ts` (NEW)
  - **Estimated**: 2 hours
  - **Skill**: `testing-qa-playwright`

- [ ] **Create Phase 2 PR** (Delivery)
  - Title: "feat(contacts): Phase 2 - Real-time contact synchronization (Issue #92)"
  - Include all Phase 2 files
  - Update ISSUE_92_IMPLEMENTATION_PLAN.md status
  - **Estimated**: 30 minutes

---

### 🟢 PRIORITY 3: Phase 3 - Rich WhatsApp Contact UI

#### WhatsAppContactCard Component
- [ ] **Create WhatsAppContactCard component** (Rich UI foundation)
  - Profile picture with fallback to initials avatar
  - Name with truncation
  - Relationship type badge
  - Relationship score with color-coded emoji
  - Last message timestamp (relative: "há 2 dias")
  - Quick action buttons row
  - **Files**: `src/components/features/WhatsAppContactCard.tsx` (NEW)
  - **Estimated**: 3-4 hours
  - **Skill**: `ux-design-guardian`

- [ ] **Implement relationship score visual system** (Gamification)
  - ❤️ 80-100: Red heart, "Forte conexão"
  - 💛 50-79: Yellow heart, "Boa conexão"
  - 🤍 0-49: White heart, "Conexão fraca"
  - Show score number next to emoji
  - Tooltip with breakdown
  - **Files**: `src/lib/relationshipScoreFormatter.ts` (NEW)
  - **Estimated**: 1 hour
  - **Skill**: `gamification-engine`

- [ ] **Add profile picture handling** (Media assets)
  - Fetch from contact.whatsapp_profile_pic_url
  - Fallback to contact.avatar_url
  - Final fallback to ceramic avatar with initials
  - Handle image load errors gracefully
  - Circular crop with ceramic-inset style
  - **Files**: `src/components/ui/ContactAvatar.tsx` (NEW)
  - **Estimated**: 1-2 hours

- [ ] **Implement relative time formatting** (Timestamps)
  - "Agora" (< 1 min)
  - "Há X minutos" (< 1 hour)
  - "Há X horas" (< 24 hours)
  - "Há X dias" (< 7 days)
  - "DD/MM/YYYY" (> 7 days)
  - **Files**: `src/lib/formatters.ts` (NEW or EXTEND)
  - **Estimated**: 30 minutes

- [ ] **Create quick action buttons** (Interactions)
  - 💬 Chat: Opens WhatsApp Web link
  - 📞 Call: Opens WhatsApp call link (if supported)
  - ⭐ Favorite: Toggles favorite status in database
  - Ceramic pill button style with hover effects
  - **Files**: WhatsAppContactCard.tsx (inline) or `src/components/ui/QuickActionButton.tsx`
  - **Estimated**: 1 hour

#### WhatsAppContactList Component
- [ ] **Create WhatsAppContactList with virtualization** (Performance)
  - Use react-window for virtualized scrolling
  - Support 500+ contacts without lag
  - Maintain scroll position on updates
  - Dynamic row height for variable content
  - **Files**: `src/components/features/WhatsAppContactList.tsx` (NEW)
  - **Estimated**: 3-4 hours
  - **Skill**: `component-patterns`

- [ ] **Implement debounced search** (UX optimization)
  - 300ms debounce delay
  - Search across: name, email, phone, notes
  - Show loading indicator during search
  - Clear button to reset search
  - **Files**: `src/hooks/useDebouncedSearch.ts` (NEW)
  - **Estimated**: 1 hour

- [ ] **Add multi-filter support** (Data filtering)
  - Source: All, Google, WhatsApp
  - Category: All, Family, Friends, Work, Clients, etc.
  - Favorites toggle
  - Recents (contacted in last 7 days)
  - Combine multiple filters (AND logic)
  - **Files**: WhatsAppContactList.tsx or `src/hooks/useContactFilters.ts`
  - **Estimated**: 2 hours

- [ ] **Add sort options** (Data organization)
  - Name (A-Z, Z-A)
  - Last contact (recent first, oldest first)
  - Relationship score (high to low, low to high)
  - Date added (newest, oldest)
  - **Files**: WhatsAppContactList.tsx (inline)
  - **Estimated**: 1 hour

- [ ] **Create empty states for each filter** (UX polish)
  - "Nenhum contato encontrado" (search)
  - "Nenhum favorito ainda" (favorites filter)
  - "Nenhum contato recente" (recents filter)
  - "Nenhum contato WhatsApp" (WhatsApp source filter)
  - Context-appropriate messaging and CTAs
  - **Files**: WhatsAppContactList.tsx or `src/components/ui/EmptyState.tsx`
  - **Estimated**: 1 hour

#### WhatsAppContactDetail Modal
- [ ] **Create WhatsAppContactDetail modal** (Deep dive)
  - Full contact information display
  - Interaction history timeline
  - Sentiment analysis graph over time
  - Tags and notes editor
  - Actions: Edit, Archive, Block, Delete
  - **Files**: `src/components/features/WhatsAppContactDetail.tsx` (NEW)
  - **Estimated**: 4-5 hours
  - **Skill**: `ux-design-guardian`

- [ ] **Implement interaction history timeline** (Data visualization)
  - Show all messages, calls, meetings
  - Group by date
  - Show message preview
  - Click to expand full message
  - **Files**: WhatsAppContactDetail.tsx (inline) or separate component
  - **Estimated**: 2-3 hours

- [ ] **Add sentiment analysis graph** (AI insights)
  - Line chart showing sentiment over time
  - Positive/neutral/negative zones
  - Key moments highlighted
  - Date range selector
  - **Files**: `src/components/features/SentimentAnalysisGraph.tsx` (NEW)
  - **Estimated**: 2-3 hours

#### Phase 3 Integration
- [ ] **Replace ContactCardGrid with WhatsAppContactList** (Integration)
  - Update ContactsView to use WhatsAppContactList
  - Migrate all filters and search logic
  - Ensure backward compatibility
  - **Files**: `src/pages/ContactsView.tsx` (MODIFY)
  - **Estimated**: 1 hour

- [ ] **Add E2E tests for Phase 3 features** (Quality assurance)
  - Test contact card displays all information correctly
  - Test quick actions (chat, call, favorite)
  - Test detail modal opens and displays data
  - Test search and filters work correctly
  - Test virtualization with 500+ contacts
  - **Files**: `tests/e2e/contacts-rich-ui.spec.ts` (NEW)
  - **Estimated**: 3-4 hours
  - **Skill**: `testing-qa-playwright`

- [ ] **Create Phase 3 PR** (Delivery)
  - Title: "feat(contacts): Phase 3 - Rich WhatsApp contact UI (Issue #92)"
  - Include all Phase 3 files
  - Screenshots of new UI in PR description
  - **Estimated**: 1 hour

---

### 🔵 PRIORITY 4: Phase 4 - Performance & Polish

- [ ] **Optimize ContactCard with React.memo** (Performance)
  - Prevent unnecessary re-renders
  - Define custom comparison function
  - Measure performance improvement
  - **Files**: `src/components/features/ContactCard.tsx` (MODIFY)
  - **Estimated**: 30 minutes

- [ ] **Optimize ContactsView with useMemo** (Performance)
  - Memoize filtered contacts calculation
  - Memoize category counts calculation
  - Memoize sort comparator functions
  - **Files**: `src/pages/ContactsView.tsx` (MODIFY)
  - **Estimated**: 1 hour

- [ ] **Add loading skeletons everywhere** (Perceived performance)
  - ContactCardGrid already has skeletons ✅
  - Add skeleton for detail modal
  - Add skeleton for search results
  - Add skeleton for sentiment graph
  - **Files**: `src/components/ui/ContactCardSkeleton.tsx` (NEW)
  - **Estimated**: 1 hour

- [ ] **Implement progressive loading for images** (Network optimization)
  - Lazy load profile pictures
  - Show placeholder while loading
  - Cache loaded images
  - Handle slow connections gracefully
  - **Files**: `src/hooks/useProgressiveImage.ts` (NEW)
  - **Estimated**: 1-2 hours

- [ ] **Add comprehensive error boundaries** (Error handling)
  - Wrap ContactsView in error boundary
  - Wrap ContactCardGrid in error boundary
  - Show friendly error messages
  - Include "Try again" buttons
  - Log errors to monitoring service
  - **Files**: `src/components/ui/ErrorBoundary.tsx` (EXTEND)
  - **Estimated**: 1 hour

- [ ] **Performance testing with 1000+ contacts** (Validation)
  - Load test data with 1000+ contacts
  - Measure render time
  - Measure scroll performance
  - Measure search performance
  - Document results
  - **Files**: `tests/performance/contacts-load.spec.ts` (NEW)
  - **Estimated**: 2 hours

- [ ] **Update architecture documentation** (Knowledge sharing)
  - Document ContactCardGrid pattern
  - Explain animation conflict solution
  - Document real-time subscription pattern
  - Document virtualization implementation
  - Add diagrams where helpful
  - **Files**: `docs/ARCHITECTURE_REFACTORING_ISSUE_39.md` (MODIFY)
  - **Estimated**: 1-2 hours
  - **Skill**: `master-architect-planner`

- [ ] **Create Phase 4 PR** (Delivery)
  - Title: "perf(contacts): Phase 4 - Performance optimization (Issue #92)"
  - Include performance benchmarks in PR description
  - **Estimated**: 30 minutes

---

## 📊 Summary Statistics

### Task Breakdown by Phase
- **Priority 1 (Critical)**: 7 tasks, ~5-7 hours
- **Priority 2 (Phase 2)**: 5 tasks, ~7-10 hours
- **Priority 3 (Phase 3)**: 16 tasks, ~25-35 hours
- **Priority 4 (Phase 4)**: 8 tasks, ~9-13 hours

**Total**: 36 tasks, ~46-65 hours of implementation work

### Skills Required
- `testing-qa-playwright` (E2E tests)
- `backend-architect-supabase` (Database, real-time subscriptions)
- `ux-design-guardian` (Rich UI components, design consistency)
- `gamification-engine` (Relationship scores)
- `component-patterns` (React patterns, virtualization)
- `master-architect-planner` (Documentation, architecture)

---

## 🎯 Success Criteria

### Phase 1 ✅
- [x] Contact cards render stably without disappearing
- [x] No animation conflicts
- [x] Code is well-documented
- [ ] Unit tests pass (IN PROGRESS)
- [ ] E2E tests pass (IN PROGRESS)

### Phase 2 (Target)
- [ ] Contacts update in real-time without refresh
- [ ] Sync status is visible to user
- [ ] Connection recovery works automatically
- [ ] E2E tests validate real-time behavior

### Phase 3 (Target)
- [ ] Rich contact cards show profile pictures
- [ ] Relationship scores are color-coded and intuitive
- [ ] Quick actions work (chat, call, favorite)
- [ ] Detail modal shows full interaction history
- [ ] UI handles 500+ contacts smoothly
- [ ] Search and filters are responsive

### Phase 4 (Target)
- [ ] App renders 1000+ contacts without lag
- [ ] Images load progressively
- [ ] Error boundaries catch and display errors gracefully
- [ ] Performance benchmarks meet targets
- [ ] Architecture is fully documented

---

## 📝 Notes

### Design Decisions
1. **No parent-level animations**: Prevents conflicts with ContactCard's motion.button
2. **Barrel exports**: Maintain backward compatibility while improving organization
3. **Real-time subscriptions**: Keep UI in sync without polling
4. **Virtualization**: Essential for 500+ contacts performance
5. **Progressive enhancement**: Start simple (Phase 1), add features incrementally

### Dependencies
- `react-window` (virtualization)
- `date-fns` (time formatting) - or use native Intl.RelativeTimeFormat
- Existing: `framer-motion`, `lucide-react`, `@supabase/ssr`

### Risks & Mitigation
- **Risk**: Real-time subscriptions cause infinite loops
  - **Mitigation**: Follow useWhatsAppSessionSubscription pattern
- **Risk**: Virtualization breaks scroll position
  - **Mitigation**: Use react-window's scrollToItem method
- **Risk**: Image loading slows down render
  - **Mitigation**: Lazy load images, use progressive loading

---

**Last Updated**: 2026-01-21 by Claude Sonnet 4.5
