# Onboarding Redesign - Implementation Tracking

**Status**: Ready for Implementation
**Date Created**: Dezembro 11, 2025
**Target Start Date**: Dezembro 12, 2025
**Estimated Duration**: 6-8 weeks

---

## 1. Overview: Implementation Roadmap

```
PHASE 1 (Weeks 1-2): Setup & Database
├─ Create/migrate tables
├─ Setup RLS policies
├─ Create API endpoints skeleton
└─ Setup test environment

PHASE 2 (Weeks 2-3): Components & UI
├─ Landing page components
├─ Trail selection UI
├─ Step 2 multiple choice components
├─ Audio recorder implementation
└─ Component integration

PHASE 3 (Weeks 3-4): Logic & Workflows
├─ Recommendation engine
├─ State management (zustand/context)
├─ Data validation & error handling
├─ Analytics instrumentation
└─ Integration tests

PHASE 4 (Weeks 4-5): Polish & Testing
├─ E2E tests (cypress/playwright)
├─ Performance optimization
├─ Accessibility testing (WCAG AAA)
├─ Mobile responsiveness fixes
└─ Bug fixes from testing

PHASE 5 (Weeks 5-6): Beta Launch
├─ Seed beta users
├─ Deploy to staging
├─ Monitoring & logging setup
├─ Feedback collection
└─ Iterate based on feedback

PHASE 6 (Weeks 6-8): Refinement & GA
├─ Data analysis
├─ A/B testing insights
├─ Final optimizations
├─ Full rollout
└─ Documentation & handoff
```

---

## 2. Phase 1: Database & Setup

### Task 1.1: Create/Extend Database Tables

**Files to create/modify**:
- [ ] `/supabase/migrations/20250212_onboarding_schema.sql`

**Actions**:
```sql
- [ ] Create onboarding_context_captures table
- [ ] Create moment_entries table (consolidate moments + journey_moments)
- [ ] Create user_module_recommendations table
- [ ] Add new columns to users table
- [ ] Create indexes for performance
- [ ] Create RLS policies for all new tables
- [ ] Create triggers for updated_at columns
- [ ] Test migration locally
- [ ] Test RLS policies with test users
```

**Acceptance Criteria**:
- All tables created and accessible via Supabase
- RLS policies prevent unauthorized access
- Indexes improve query performance by 50%+
- Migration is reversible

---

### Task 1.2: Create API Endpoint Skeletons

**Files to create**:
- [ ] `/src/services/onboardingService.ts`
- [ ] `/src/services/recommendationService.ts`

**Actions**:
```typescript
- [ ] POST /api/onboarding/capture-context
  - Input validation
  - Database insert
  - Return trail_score + modules

- [ ] POST /api/onboarding/finalize-onboarding
  - Call recommendation engine
  - Persist recommendations
  - Return response with modules

- [ ] GET /api/recommendations/for-user/:userId
  - Fetch user's recommendations
  - Return prioritized modules

- [ ] POST /api/recommendations/feedback
  - Record user feedback (accepted/rejected)
  - Adjust future recommendations
```

**Acceptance Criteria**:
- All endpoints functional with mock data
- Input validation working
- Error handling in place
- API documentation updated

---

### Task 1.3: Setup Testing Environment

**Files**:
- [ ] `/tests/setup/onboarding.setup.ts`
- [ ] `/tests/fixtures/onboarding-data.json`

**Actions**:
- [ ] Setup test database with seed data
- [ ] Create test user fixtures
- [ ] Setup API mocking (MSW)
- [ ] Create helper functions for tests
- [ ] Document testing approach

---

## 3. Phase 2: UI Components

### Task 2.1: Landing Page Components

**Files to create**:
- [ ] `/src/components/onboarding/LandingPage/Header.tsx`
- [ ] `/src/components/onboarding/LandingPage/HeroSection.tsx`
- [ ] `/src/components/onboarding/LandingPage/ValueProposition.tsx`
- [ ] `/src/components/onboarding/LandingPage/HowItWorks.tsx`
- [ ] `/src/components/onboarding/LandingPage/TrustIndicators.tsx`
- [ ] `/src/components/onboarding/LandingPage/FinalCTA.tsx`
- [ ] `/src/components/onboarding/LandingPage/Footer.tsx`
- [ ] `/src/components/onboarding/LandingPage/index.tsx`

**Acceptance Criteria**:
- All sections render correctly
- Responsive on mobile/tablet/desktop
- Color contrast ratio > 7:1 (WCAG AAA)
- All CTAs clickable and linked
- Navigation sticky on scroll

---

### Task 2.2: Trail Selection Component

**Files to create**:
- [ ] `/src/components/onboarding/TrailSelection/TrailGrid.tsx`
- [ ] `/src/components/onboarding/TrailSelection/TrailCard.tsx`
- [ ] `/src/components/onboarding/TrailSelection/index.tsx`

**Acceptance Criteria**:
- Grid layout responsive
- Trail cards selectable (single or multi)
- Visual feedback on selection
- Description and icons displayed
- Mobile touch targets > 48px

---

### Task 2.3: Step 2 Components (Multiple Choice)

**Files to create**:
- [ ] `/src/components/onboarding/Step2/MomentTypeSelector.tsx`
- [ ] `/src/components/onboarding/Step2/EmotionPicker.tsx`
- [ ] `/src/components/onboarding/Step2/LifeAreaSelector.tsx`
- [ ] `/src/components/onboarding/Step2/ValueIndicator.tsx`
- [ ] `/src/components/onboarding/Step2/ReflectionInput.tsx`
- [ ] `/src/components/onboarding/Step2/AudioRecorder.tsx`
- [ ] `/src/components/onboarding/Step2/MomentReview.tsx`
- [ ] `/src/components/onboarding/Step2/index.tsx`

**Acceptance Criteria**:
- All components render independently
- Interactions work smoothly
- Audio recording functional
- Form validation working
- State management integrated

---

### Task 2.4: Component Library Update

**Files**:
- [ ] Update `/src/components/ui/` with new primitives if needed

**Actions**:
- [ ] Add/update Button variants
- [ ] Add/update Card component
- [ ] Add/update Input/Textarea
- [ ] Add custom Badge component for tags
- [ ] Add custom ChipGroup for multi-select

---

## 4. Phase 3: Logic & Workflows

### Task 3.1: Recommendation Engine

**Files to create**:
- [ ] `/src/services/recommendation/engine.ts`
- [ ] `/src/services/recommendation/signals.ts`
- [ ] `/src/services/recommendation/scoring.ts`
- [ ] `/src/services/recommendation/mappings.ts`

**Acceptance Criteria**:
- Engine generates recommendations for test users
- Scoring logic matches specification
- Ranking produces sensible results
- Performance acceptable (< 500ms per user)

---

### Task 3.2: State Management

**Files to create**:
- [ ] `/src/stores/onboardingStore.ts` (Zustand or Context)

**Responsibilities**:
- Track current step (1-7)
- Manage form state
- Track completed trails
- Store trail responses
- Manage moment capture state

**Acceptance Criteria**:
- State persists across navigation
- Can reset/clear state
- State accessible to all components
- TypeScript types defined

---

### Task 3.3: Data Validation & Error Handling

**Files**:
- [ ] `/src/utils/onboarding/validation.ts`
- [ ] `/src/utils/onboarding/errorHandler.ts`

**Actions**:
- [ ] Validate trail responses
- [ ] Validate moment data
- [ ] Validate audio files
- [ ] Handle API errors gracefully
- [ ] Provide helpful error messages

---

### Task 3.4: Analytics Instrumentation

**Files**:
- [ ] `/src/utils/analytics/onboardingAnalytics.ts`

**Track**:
- [ ] Trail selection (which trails selected)
- [ ] Step progression (time per step)
- [ ] Completion rates
- [ ] Dropout points
- [ ] Module recommendation acceptance

---

## 5. Phase 4: Testing & Polish

### Task 4.1: E2E Tests

**Files to create**:
- [ ] `/tests/e2e/onboarding.spec.ts`
- [ ] `/tests/e2e/step2.spec.ts`
- [ ] `/tests/e2e/recommendations.spec.ts`

**Test Scenarios**:
- [ ] Complete full onboarding flow
- [ ] Select multiple trails
- [ ] Complete Step 2 with all options
- [ ] Test audio recording (mock)
- [ ] Verify recommendations generated
- [ ] Test error scenarios

**Acceptance Criteria**:
- All happy paths pass
- All error paths handled
- Cross-browser compatibility
- Mobile device testing

---

### Task 4.2: Component Tests

**Files**:
- [ ] `/tests/components/onboarding/` (*.test.tsx files)

**Coverage**:
- [ ] Landing page sections
- [ ] Trail selection logic
- [ ] Step 2 components individually
- [ ] Audio recorder functionality
- [ ] Form validation

**Acceptance Criteria**:
- Coverage > 80%
- All interactions tested
- Accessibility tests included

---

### Task 4.3: Integration Tests

**Files**:
- [ ] `/tests/integration/onboarding.test.ts`

**Test**:
- [ ] Trail → API → Database flow
- [ ] Moment capture → Persistence
- [ ] Recommendation generation
- [ ] User stats update

---

### Task 4.4: Accessibility Audit

**Actions**:
- [ ] Run axe-core on all pages
- [ ] Test keyboard navigation
- [ ] Test screen reader (NVDA/JAWS)
- [ ] Check color contrast ratios
- [ ] Verify focus indicators
- [ ] Test form labels & ARIA

**Acceptance Criteria**:
- Zero critical/serious violations
- WCAG AAA compliance
- Keyboard fully operable
- Screen reader friendly

---

### Task 4.5: Performance Optimization

**Actions**:
- [ ] Lazy load components
- [ ] Optimize images
- [ ] Code split by route
- [ ] Profile and optimize
- [ ] Reduce bundle size

**Acceptance Criteria**:
- Lighthouse score > 90
- LCP < 2.5s
- FID < 100ms
- CLS < 0.1

---

## 6. Phase 5: Beta Launch

### Task 5.1: Staging Deployment

**Actions**:
- [ ] Deploy to staging environment
- [ ] Setup monitoring & logging
- [ ] Configure error tracking (Sentry)
- [ ] Test all endpoints
- [ ] Verify database migrations

---

### Task 5.2: Seed Beta Users

**Actions**:
- [ ] Create test user accounts
- [ ] Document beta testing process
- [ ] Setup feedback collection
- [ ] Create beta user guide
- [ ] Send invitations

---

### Task 5.3: Monitoring & Feedback

**Setup**:
- [ ] Error tracking (Sentry/Rollbar)
- [ ] Analytics tracking
- [ ] User feedback form
- [ ] Slack notifications for errors
- [ ] Dashboard for metrics

---

## 7. Phase 6: Refinement & GA

### Task 6.1: Data Analysis

**Analyze**:
- [ ] Completion rates by step
- [ ] Dropout points
- [ ] Module recommendation acceptance
- [ ] User satisfaction (if surveyed)
- [ ] Performance metrics

---

### Task 6.2: A/B Testing (Optional)

**Consider Testing**:
- [ ] Trail order (which trails first?)
- [ ] Step 2 question order
- [ ] CTA button text
- [ ] Value proposition messaging

---

### Task 6.3: Final Polish

**Actions**:
- [ ] Fix critical bugs
- [ ] Optimize high-traffic flows
- [ ] Improve error messages based on data
- [ ] Add any missing UI polish
- [ ] Document edge cases

---

### Task 6.4: Full Rollout

**Actions**:
- [ ] Enable for all users
- [ ] Monitor closely
- [ ] Quick rollback plan
- [ ] Announce to users
- [ ] Update documentation

---

## 8. Dependent Work

**Must be done first**:
- [ ] Supabase project setup with proper RLS
- [ ] Authentication flow working
- [ ] Base API structure in place
- [ ] Testing infrastructure setup

**Can be done in parallel**:
- [ ] Marketing materials for onboarding
- [ ] Help documentation
- [ ] Tutorial videos
- [ ] Admin dashboards for monitoring

---

## 9. Risk Management

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Audio recording fails on iOS | Medium | High | Test early, have fallback, progressive enhancement |
| Sentiment API rate limits | Low | High | Cache results, queue requests, fallback to heuristics |
| Large file uploads slow | Medium | Medium | Client-side compression, chunked upload, progress UI |
| RLS policies too restrictive | Medium | High | Test thoroughly, gradual rollout, monitoring |

### UX Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Low completion rate on trails | High | High | Simplify questions, add progress indicators, test with users |
| Confusing Step 2 flow | Medium | High | User testing, iterate fast, clear copy |
| Unclear recommendations | Medium | Medium | Show reasoning, allow feedback, A/B test messaging |

---

## 10. Success Metrics

**Primary**:
- Onboarding completion rate > 70%
- Time to complete onboarding < 5 minutes
- Module recommendations accepted > 60%

**Secondary**:
- Moment entries created within 24h > 40%
- Weekly reflection participation > 30%
- User satisfaction (NPS) > 40

---

## 11. Documentation Checklist

- [ ] API documentation updated
- [ ] Component storybook updated
- [ ] Database schema documented
- [ ] Troubleshooting guide
- [ ] Developer guide for extending
- [ ] User help articles
- [ ] Video tutorials

---

## 12. Sign-Off & Handoff

**Product**:
- [ ] Verify requirements met
- [ ] Approve design/UX
- [ ] Sign off on feature

**Engineering**:
- [ ] Code reviewed
- [ ] Tests passing
- [ ] Performance acceptable
- [ ] Monitoring in place

**QA**:
- [ ] All scenarios tested
- [ ] Edge cases handled
- [ ] Accessibility verified

---

**Last Updated**: Dezembro 11, 2025
**Next Review**: Após Phase 1 completa (Semana 2)
