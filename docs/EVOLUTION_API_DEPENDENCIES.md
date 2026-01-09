# Evolution API Integration - Dependencies & Risk Analysis

**Project:** Aica Life OS - WhatsApp Contact Network Integration
**Date:** 2026-01-08
**Version:** 1.0

---

## Sprint Dependencies Graph

```
Sprint 1: Core Infrastructure (FOUNDATIONAL)
├── Task 1.1: Environment Setup (MUST BE FIRST)
│   ├── Task 1.2: API Client (depends on 1.1)
│   └── Task 1.3: Database Schema (depends on 1.1)
└── Task 1.4: Integration Tests (depends on 1.2 + 1.3)
    ↓
Sprint 2: Contact Synchronization (depends on Sprint 1)
├── Task 2.1: Sync Edge Function (depends on 1.2 + 1.3)
│   └── Task 2.2: Frontend Sync Service (depends on 2.1)
│       └── Task 2.3: UI Sync Button (depends on 2.2)
    ↓
Sprint 3: AI Analysis (depends on Sprint 2)
├── Task 3.1: Analysis Edge Function (depends on 2.1)
├── Task 3.2: Batch Analysis (depends on 3.1)
└── Task 3.3: Frontend Analysis Service (depends on 3.1 + 3.2)
    ↓
Sprint 4: Real-time & UI (depends on Sprint 3)
├── Task 4.1: Webhook Handler (depends on 3.1)
├── Task 4.2: Insights Card (depends on 3.3)
├── Task 4.3: Contact Detail Integration (depends on 4.2)
└── Task 4.4: Dashboard Widget (depends on 3.3)
```

---

## Critical Path Analysis

### Must-Complete-First Tasks (Blockers)

| Task | Blocks | Risk if Delayed | Mitigation |
|------|--------|-----------------|------------|
| **1.1: Environment Setup** | All other tasks | CRITICAL - Nothing works without credentials | Complete first day, verify immediately |
| **1.2: API Client** | 2.1, 3.1, 4.1 (all sync/analysis) | HIGH - No data fetching possible | Prioritize, test thoroughly |
| **1.3: Database Schema** | 2.1, 3.1 (all data storage) | HIGH - No data persistence | Apply migration early, verify |
| **2.1: Sync Edge Function** | 3.1, 3.2 (need contact data) | MEDIUM - Can't analyze without data | Complete before Sprint 3 |

### Parallel Execution Opportunities

**Sprint 1:**
- ✅ Tasks 1.2 (API Client) and 1.3 (Database) can run **in parallel** after 1.1
- ⚠️ Task 1.4 (Tests) must wait for both 1.2 and 1.3

**Sprint 2:**
- ⚠️ All tasks sequential (2.1 → 2.2 → 2.3)

**Sprint 3:**
- ✅ Task 3.1 (Single Analysis) and initial work on 3.3 (Frontend Service) can be parallel
- ⚠️ Task 3.2 (Batch Analysis) depends on 3.1

**Sprint 4:**
- ✅ Tasks 4.2 (Insights Card) and 4.4 (Dashboard Widget) can run **in parallel** after 3.3
- ⚠️ Task 4.1 (Webhooks) should complete before 4.2/4.4 for testing

---

## External Dependencies

### Third-Party Services

| Service | Purpose | Criticality | Failure Impact | Mitigation |
|---------|---------|-------------|----------------|------------|
| **Evolution API** | Fetch contacts & messages | CRITICAL | No WhatsApp data | Retry logic, exponential backoff, cache |
| **Google Gemini API** | Sentiment analysis | HIGH | No health scores | Graceful degradation, use last known scores |
| **Supabase** | Database + Edge Functions | CRITICAL | System unavailable | Local development, staging environment |
| **GitHub** | Code repository | MEDIUM | Deployment blocked | Local backups, multiple contributors |

### API Rate Limits

| Service | Limit | Sprint Impact | Mitigation |
|---------|-------|---------------|------------|
| Evolution API | Unknown (likely 100 req/min) | Sprint 2, 3 (sync/analysis) | Batch requests, 2s delays, retry with backoff |
| Gemini API | 15 RPM (free tier) | Sprint 3 (batch analysis) | Use Flash model, batch size = 5, delays |
| Supabase Edge Functions | 500 req/min | Low (user-triggered) | Queue long-running tasks |

---

## Risk Matrix

### High-Risk Items

| Risk | Probability | Impact | Mitigation | Owner |
|------|-------------|--------|------------|-------|
| **Evolution API rate limiting** | High (80%) | High - Sync fails | Exponential backoff, batch with delays | Sprint 1 |
| **Gemini quota exceeded** | Medium (50%) | Medium - No health scores | Cache results, use Flash model | Sprint 3 |
| **Phone number format mismatch** | Medium (50%) | High - Contacts not matched | Normalize to E.164 everywhere | Sprint 2 |
| **Large message history (1000+)** | Low (20%) | Medium - Slow analysis | Limit to 100 messages, paginate | Sprint 3 |
| **Webhook fails silently** | Medium (40%) | Medium - Stale data | Monitoring, dead letter queue | Sprint 4 |

### Medium-Risk Items

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Google Contacts conflict** | Medium (40%) | Low - Duplicate contacts | Merge logic, prioritize WhatsApp | Sprint 2 |
| **Edge Function timeout (10s)** | Low (30%) | Medium - Batch fails | Process in chunks, queue | Sprint 3 |
| **Migration conflicts** | Low (20%) | Low - Manual fix needed | Test locally first | Sprint 1 |
| **UI state management** | Low (20%) | Low - UX issues | Use React Query, loading states | Sprint 4 |

---

## Technical Debt

### Known Shortcuts (To Fix in Phase 2)

| Item | Sprint | Technical Debt | Fix Priority |
|------|--------|----------------|--------------|
| **Manual migration application** | 1 | Migration not in Supabase history | Low - Works, just manual |
| **No message pagination** | 3 | Fetch only last 100 messages | Medium - Needed for large histories |
| **No group support** | 2 | Groups ignored in sync | Low - MVP doesn't require |
| **No sentiment caching** | 3 | Re-analyze every time | Medium - Wastes Gemini quota |
| **Webhook signature validation** | 4 | Trusts all webhooks | High - Security risk |

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Evolution API                           │
│  (WhatsApp Messages & Contacts)                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ 1. Fetch Contacts (Sprint 2)
                            │ 2. Fetch Messages (Sprint 3)
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Supabase Edge Functions                       │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │ sync-whatsapp-   │  │ analyze-whatsapp-│  │ webhook-     │ │
│  │ contacts         │→→│ contact          │  │ evolution    │ │
│  └──────────────────┘  └────────┬─────────┘  └──────────────┘ │
│                                 │                               │
│                                 ↓ Send to AI                    │
└─────────────────────────────────┼─────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ↓                           ↓
          ┌──────────────────┐       ┌──────────────────┐
          │  Google Gemini   │       │    Supabase DB   │
          │  (Sentiment AI)  │       │  contact_network │
          └──────────────────┘       │  whatsapp_sync   │
                    │                │      _logs       │
                    │                └──────────────────┘
                    │ Analysis Results          ↓
                    └────────────→→→→→→→→→─────┘
                                        │
                                        ↓ Query Data
                            ┌──────────────────────┐
                            │  Frontend (React)    │
                            │  - Connections View  │
                            │  - Insights Card     │
                            │  - Dashboard Widgets │
                            └──────────────────────┘
```

---

## Testing Strategy

### Test Pyramid

```
                    ┌─────────────┐
                    │  E2E Tests  │  (Manual, Sprint 4)
                    │  - Full flow│
                    │  - Real API │
                    └─────────────┘
                        ↑
             ┌──────────────────────┐
             │  Integration Tests   │  (Sprint 1, 2, 3)
             │  - API + Database    │
             │  - Edge Functions    │
             └──────────────────────┘
                        ↑
         ┌──────────────────────────────────┐
         │       Unit Tests                 │  (All Sprints)
         │  - API client functions          │
         │  - Helper functions              │
         │  - Component rendering           │
         └──────────────────────────────────┘
```

### Test Coverage Targets

| Sprint | Unit | Integration | E2E | Target |
|--------|------|-------------|-----|--------|
| Sprint 1 | ✅ API client | ✅ Database schema | ⏳ N/A | 80%+ |
| Sprint 2 | ✅ Sync service | ✅ Edge Function | ⏳ Manual | 70%+ |
| Sprint 3 | ✅ Analysis logic | ✅ Gemini integration | ⏳ Manual | 70%+ |
| Sprint 4 | ✅ UI components | ⏳ Webhook handler | ✅ Full flow | 60%+ |

---

## Performance Targets

### Sprint 1
- API client: < 2s per request
- Database queries: < 10ms
- Tests: < 10s total

### Sprint 2
- Sync 100 contacts: < 30s
- Incremental sync: < 10s
- UI sync button: < 5s perceived time

### Sprint 3
- Single analysis: < 5s
- Batch 50 contacts: < 2 min
- Gemini API call: < 3s

### Sprint 4
- Webhook latency: < 2s (message → DB)
- Insights card load: < 1s
- Dashboard widgets: < 1s

---

## Rollback Strategy

### Sprint 1 Rollback
```bash
# Environment only - no code changes
npx supabase secrets unset EVOLUTION_API_KEY
# Impact: Low (feature not used yet)
```

### Sprint 2 Rollback
```bash
# Remove sync button from UI
git revert <sync-button-commit>

# Disable Edge Function
npx supabase functions delete sync-whatsapp-contacts

# Database: Keep columns (no harm)
# Impact: Medium (sync stops, but no data loss)
```

### Sprint 3 Rollback
```bash
# Disable analysis
npx supabase secrets set ENABLE_ANALYSIS=false

# Remove Edge Functions
npx supabase functions delete analyze-whatsapp-contact
npx supabase functions delete analyze-all-whatsapp-contacts

# Database: Keep health_score column (just not updated)
# Impact: Medium (health scores stop updating)
```

### Sprint 4 Rollback
```bash
# Disable webhook
curl -X POST "https://evolution-evolution-api.w9jo16.easypanel.host/webhook/set/Lucas_4569" \
  -H "apikey: 429683C4C977415CAAFCCE10F7D57E11" \
  -d '{"webhook": {"enabled": false}}'

# Remove UI components (git revert)
# Impact: Low (back to Sprint 3 state, manual refresh only)
```

---

## Team Coordination

### Who Does What

| Role | Sprint 1 | Sprint 2 | Sprint 3 | Sprint 4 |
|------|----------|----------|----------|----------|
| **Backend Dev** | API client, database | Edge Function | Analysis AI | Webhooks |
| **Frontend Dev** | Tests | Sync service, UI | UI components | Insights card, widgets |
| **QA** | Test validation | Sync testing | AI validation | E2E testing |
| **DevOps** | Secrets config | Monitoring | Performance | Production deploy |

### Single Developer (You)
Recommended order:
1. Day 1: Sprint 1 Tasks 1.1, 1.2, 1.3 (backend focus)
2. Day 2: Sprint 1 Task 1.4, start Sprint 2 Task 2.1
3. Day 3: Sprint 2 Tasks 2.1, 2.2
4. Day 4: Sprint 2 Task 2.3, validate Sprint 2
5. Day 5-6: Sprint 3 (backend + AI)
6. Day 7-8: Sprint 4 (webhooks + UI)
7. Day 9: Integration testing, bug fixes
8. Day 10: Documentation, deployment

---

## Success Metrics

### Sprint 1 Success
- [ ] API client fetches real contacts (count > 0)
- [ ] Database accepts WhatsApp data (no errors)
- [ ] All 9 tests passing

### Sprint 2 Success
- [ ] 100% of WhatsApp contacts synced
- [ ] < 5% duplicate rate
- [ ] Sync completes in < 30s

### Sprint 3 Success
- [ ] Health scores calculated for all contacts
- [ ] 95% of analyses succeed
- [ ] Scores correlate with user expectations

### Sprint 4 Success
- [ ] Real-time updates work (< 5s latency)
- [ ] UI responsive on mobile
- [ ] Zero production errors in first 48h

---

## Next Steps After Integration

### Phase 2 Features (Optional)
1. **Group Support:** Sync WhatsApp groups as "Team" spaces
2. **Message Search:** Full-text search in WhatsApp messages
3. **Sentiment Timeline:** Graph sentiment over time
4. **Automated Follow-ups:** Reminders for stale contacts
5. **CSV Export:** Export health scores and insights

### Integration Opportunities
1. **Journey Module:** Auto-create moments from conversations
2. **Studio Module:** Link podcast guests to WhatsApp
3. **Atlas Module:** Task creation via WhatsApp commands
4. **Gamification:** XP for maintaining connection health

---

**Document Owner:** Development Team
**Last Updated:** 2026-01-08
**Next Review:** After Sprint 2 completion
