# Evolution API Integration - Complete Documentation

**Project:** Aica Life OS - WhatsApp Contact Network Integration
**Issue:** #23 (People Unified Network)
**Status:** Planning Complete → Ready for Implementation
**Version:** 1.0

---

## 📚 Documentation Index

This integration consists of **4 sprints over 3-4 weeks** to fully integrate WhatsApp contacts and messages into Aica Life OS via Evolution API.

### Core Documents

| Document | Purpose | Audience | When to Use |
|----------|---------|----------|-------------|
| **[EVOLUTION_API_SPRINT_PLAN.md](../EVOLUTION_API_SPRINT_PLAN.md)** | Master implementation plan with all 4 sprints | All team members | Planning & overview |
| **[SPRINT_1_TASKS.md](../../SPRINT_1_TASKS.md)** | Sprint 1 detailed execution guide | Developer executing Sprint 1 | Day-to-day implementation |
| **[EVOLUTION_API_CHECKLIST.md](../../EVOLUTION_API_CHECKLIST.md)** | Progress tracking checklist | PM / QA | Daily standup, progress tracking |
| **[EVOLUTION_API_DEPENDENCIES.md](EVOLUTION_API_DEPENDENCIES.md)** | Dependencies, risks, rollback plans | Tech lead, PM | Risk mitigation, planning |
| **[EVOLUTION_API_TROUBLESHOOTING.md](EVOLUTION_API_TROUBLESHOOTING.md)** | Common issues & solutions | Developer | When things break |

---

## 🎯 Quick Start

### For Developers Starting Sprint 1

1. **Read:** [SPRINT_1_TASKS.md](../../SPRINT_1_TASKS.md) (extremely detailed)
2. **Execute:** Follow Task 1.1 → 1.2 → 1.3 → 1.4
3. **Track:** Check off items in [EVOLUTION_API_CHECKLIST.md](../../EVOLUTION_API_CHECKLIST.md)
4. **Stuck?** Check [EVOLUTION_API_TROUBLESHOOTING.md](EVOLUTION_API_TROUBLESHOOTING.md)

### For Project Managers

1. **Overview:** [EVOLUTION_API_SPRINT_PLAN.md](../EVOLUTION_API_SPRINT_PLAN.md) (30 min read)
2. **Track:** [EVOLUTION_API_CHECKLIST.md](../../EVOLUTION_API_CHECKLIST.md) (daily)
3. **Risks:** [EVOLUTION_API_DEPENDENCIES.md](EVOLUTION_API_DEPENDENCIES.md) (risk matrix)

### For QA / Testing

1. **Test Plan:** Each sprint in [EVOLUTION_API_SPRINT_PLAN.md](../EVOLUTION_API_SPRINT_PLAN.md) has validation criteria
2. **Checklist:** [EVOLUTION_API_CHECKLIST.md](../../EVOLUTION_API_CHECKLIST.md) (acceptance criteria)
3. **Issues:** [EVOLUTION_API_TROUBLESHOOTING.md](EVOLUTION_API_TROUBLESHOOTING.md) (known issues)

---

## 🏗️ Architecture Overview

```
Evolution API (WhatsApp)
    ↓
Supabase Edge Functions (Sync, Analysis, Webhooks)
    ↓
PostgreSQL Database (contact_network, whatsapp_sync_logs)
    ↓
React Frontend (Connections Module, Dashboard Widgets)
```

### Key Components

| Component | Type | Purpose | Sprint |
|-----------|------|---------|--------|
| `evolution-client.ts` | Edge Function Shared | API client for Evolution | 1 |
| `contact_network` table | Database | Store WhatsApp contact data | 1 |
| `sync-whatsapp-contacts` | Edge Function | Sync contacts to database | 2 |
| `whatsappContactSyncService.ts` | Frontend Service | Trigger sync from UI | 2 |
| `analyze-whatsapp-contact` | Edge Function | AI-powered health scoring | 3 |
| `webhook-evolution` | Edge Function | Real-time message updates | 4 |
| `WhatsAppInsightsCard` | React Component | Display insights in UI | 4 |

---

## 📅 Sprint Timeline

### Sprint 1: Core Infrastructure (Days 1-4)
**Objective:** API client + database schema
**Deliverables:**
- Evolution API client extended (fetchContacts, fetchMessages)
- Database schema supports WhatsApp data
- Environment variables configured
- 9 tests passing

**Start:** [SPRINT_1_TASKS.md](../../SPRINT_1_TASKS.md)

---

### Sprint 2: Contact Synchronization (Days 5-9)
**Objective:** Sync WhatsApp → contact_network
**Deliverables:**
- `sync-whatsapp-contacts` Edge Function deployed
- Frontend sync service + UI button
- Contacts visible in Connections module
- Sync logs tracked

**Details:** [EVOLUTION_API_SPRINT_PLAN.md - Sprint 2](../EVOLUTION_API_SPRINT_PLAN.md#sprint-2-contact-synchronization-days-5-9)

---

### Sprint 3: AI Analysis & Health Scoring (Days 10-13)
**Objective:** Calculate health scores from message history
**Deliverables:**
- `analyze-whatsapp-contact` Edge Function deployed
- Batch analysis for all contacts
- Health scores displayed in UI
- AI-generated suggestions

**Details:** [EVOLUTION_API_SPRINT_PLAN.md - Sprint 3](../EVOLUTION_API_SPRINT_PLAN.md#sprint-3-ai-analysis--health-scoring-days-10-13)

---

### Sprint 4: Real-time Updates & UI (Days 14-17)
**Objective:** Webhooks + dashboard widgets
**Deliverables:**
- Webhook handler for real-time updates
- WhatsApp Insights Card component
- Health Score Distribution widget
- Mobile-responsive UI

**Details:** [EVOLUTION_API_SPRINT_PLAN.md - Sprint 4](../EVOLUTION_API_SPRINT_PLAN.md#sprint-4-real-time-updates--ui-days-14-17)

---

## 🎓 Key Concepts

### WhatsApp Contact Sync
WhatsApp contacts are **merged** with existing `contact_network` data:
- **Google Contacts** provide name, email, company
- **WhatsApp** provides phone, profile pic, last message
- **Merged contact** has both datasets, unified by phone number

### Health Score Calculation
0-100 score based on:
- **Sentiment** (-1 to 1): +/- 20 points
- **Recency** (days since last message): +/- 30 points
- **Frequency** (daily/weekly/monthly): +/- 10 points
- **Trend** (increasing/stable/decreasing): +/- 10 points

**Example:**
- Sentiment: 0.5 → +10 points
- Last message: 5 days ago → +30 points
- Frequency: weekly → +5 points
- Trend: stable → 0 points
- **Total:** 50 + 10 + 30 + 5 = 95/100 (Excellent)

### Incremental Sync
Only fetch **new or updated contacts** to avoid rate limits:
1. Query `whatsapp_synced_at` timestamp
2. Fetch contacts from Evolution API
3. Compare with existing contacts
4. Update changed contacts only
5. Update `whatsapp_synced_at` timestamp

---

## 🔐 Security & Privacy

### LGPD Compliance
- **Consent system** already in place (`whatsapp_consent_records`)
- **Data deletion** requests tracked (`data_deletion_requests`)
- **RLS policies** ensure users see only their own data
- **Audit logs** track all sync operations

### API Security
- **API keys** stored in Supabase secrets (never in code)
- **Webhook signature validation** (Sprint 4)
- **Rate limiting** handled with exponential backoff
- **Error logging** excludes sensitive data

---

## 📊 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Sync 100 contacts | < 30s | Sprint 2 validation |
| Analyze 1 contact | < 5s | Sprint 3 validation |
| Batch analyze 50 contacts | < 2 min | Sprint 3 validation |
| Webhook latency | < 2s | Sprint 4 validation |
| Dashboard load time | < 1s | Sprint 4 validation |

---

## 🛠️ Development Workflow

### Setup (First Time)
```bash
# 1. Clone repository
git clone <repo_url>
cd Aica_frontend

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with real credentials

# 4. Start Supabase locally
npx supabase start

# 5. Apply migrations
npx supabase db reset

# 6. Start dev server
npm run dev
```

### Daily Workflow
```bash
# 1. Pull latest changes
git pull origin main

# 2. Create feature branch
git checkout -b feature/whatsapp-sprint-1

# 3. Implement tasks (follow SPRINT_1_TASKS.md)

# 4. Run tests
cd supabase/functions
deno test --allow-net --allow-env tests/

# 5. Commit changes
git add .
git commit -m "feat(whatsapp): Sprint 1 Task 1.2 - Extend Evolution API client"

# 6. Push to remote
git push origin feature/whatsapp-sprint-1

# 7. Update checklist
# Mark tasks as complete in EVOLUTION_API_CHECKLIST.md
```

---

## 🧪 Testing Strategy

### Unit Tests (All Sprints)
```bash
cd supabase/functions
deno test tests/evolution-client.test.ts
deno test tests/database-schema.test.ts
```

### Integration Tests (Sprint 2, 3)
```bash
# Test sync Edge Function
curl -X POST http://localhost:54321/functions/v1/sync-whatsapp-contacts \
  -H "Authorization: Bearer <token>" \
  -d '{"syncType": "full"}'

# Test analysis Edge Function
curl -X POST http://localhost:54321/functions/v1/analyze-whatsapp-contact \
  -H "Authorization: Bearer <token>" \
  -d '{"contactId": "uuid"}'
```

### E2E Tests (Sprint 4)
1. Open app in browser
2. Navigate to Connections page
3. Click "Sync WhatsApp" button
4. Verify contacts appear
5. Click on contact → verify insights card
6. Send WhatsApp message → verify real-time update

---

## 🐛 Troubleshooting

### Common Issues

| Issue | Quick Fix | Details |
|-------|-----------|---------|
| "Environment variable not set" | `cat .env \| grep EVOLUTION` | [Troubleshooting Guide](EVOLUTION_API_TROUBLESHOOTING.md#issue-evolution_api_url-environment-variable-is-not-set) |
| "Migration fails" | Use `IF NOT EXISTS` | [Troubleshooting Guide](EVOLUTION_API_TROUBLESHOOTING.md#issue-migration-fails-with-column-already-exists) |
| "Sync returns 0 contacts" | Test Evolution API directly | [Troubleshooting Guide](EVOLUTION_API_TROUBLESHOOTING.md#issue-sync-returns-0-contacts) |
| "Gemini quota exceeded" | Reduce batch size, cache results | [Troubleshooting Guide](EVOLUTION_API_TROUBLESHOOTING.md#issue-gemini-api-quota-exceeded) |

**Full Guide:** [EVOLUTION_API_TROUBLESHOOTING.md](EVOLUTION_API_TROUBLESHOOTING.md)

---

## 📈 Success Metrics

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

## 🚀 Deployment

### Sprint 1 (Local Only)
```bash
# Apply migration locally
npx supabase db reset

# Run tests
deno test tests/
```

### Sprint 2 (Deploy Edge Function)
```bash
# Deploy sync function
npx supabase functions deploy sync-whatsapp-contacts

# Verify deployment
npx supabase functions list

# Test in production
curl https://gppebtrshbvuzatmebhr.supabase.co/functions/v1/sync-whatsapp-contacts \
  -H "Authorization: Bearer <token>"
```

### Sprint 3 (Deploy Analysis Functions)
```bash
npx supabase functions deploy analyze-whatsapp-contact
npx supabase functions deploy analyze-all-whatsapp-contacts
```

### Sprint 4 (Configure Webhook)
```bash
# Update webhook URL to point to Edge Function
curl -X POST "https://evolution-evolution-api.w9jo16.easypanel.host/webhook/set/Lucas_4569" \
  -H "apikey: 429683C4C977415CAAFCCE10F7D57E11" \
  -d '{
    "webhook": {
      "enabled": true,
      "url": "https://gppebtrshbvuzatmebhr.supabase.co/functions/v1/webhook-evolution"
    }
  }'
```

### Production Migration
```bash
# Apply database migration
# Via Supabase Dashboard SQL Editor:
# 1. Go to: https://supabase.com/dashboard/project/gppebtrshbvuzatmebhr/sql
# 2. Copy contents of supabase/migrations/20260108_whatsapp_contact_network.sql
# 3. Paste and click "Run"

# OR via CLI (if linked)
npx supabase db push
```

---

## 🔄 Post-Integration

### Phase 2 Features (Optional)
- **Group Support:** Sync WhatsApp groups as "Team" spaces
- **Message Search:** Full-text search in WhatsApp messages
- **Sentiment Timeline:** Graph sentiment over time
- **Automated Follow-ups:** Reminders for stale contacts
- **CSV Export:** Export health scores and insights

### Integration Opportunities
- **Journey Module:** Auto-create moments from conversations
- **Studio Module:** Link podcast guests to WhatsApp
- **Atlas Module:** Task creation via WhatsApp commands
- **Gamification:** XP for maintaining connection health

---

## 🤝 Contributing

### Adding New Features
1. Read relevant sprint plan
2. Create feature branch: `feature/whatsapp-<feature-name>`
3. Implement with tests
4. Update documentation
5. Submit PR with screenshots

### Reporting Issues
1. Check [Troubleshooting Guide](EVOLUTION_API_TROUBLESHOOTING.md) first
2. Open GitHub issue with:
   - Sprint/Task reference
   - Steps to reproduce
   - Expected vs actual behavior
   - Error logs
   - Environment (local/production)

---

## 📞 Support

**Questions?** Open an issue on GitHub: #23
**Bugs?** Check [Troubleshooting Guide](EVOLUTION_API_TROUBLESHOOTING.md), then report
**Improvements?** Submit a PR or feature request

---

## 📝 Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-01-08 | Initial planning documentation | Claude Sonnet 4.5 |

---

## 🎉 Let's Build!

You now have everything needed to implement the Evolution API integration:

1. ✅ **Complete architectural plan** (4 sprints)
2. ✅ **Detailed task breakdown** (Sprint 1 ready to execute)
3. ✅ **Progress tracking checklist** (daily standup ready)
4. ✅ **Risk mitigation strategies** (dependencies mapped)
5. ✅ **Comprehensive troubleshooting guide** (common issues covered)

**Next Step:** Start [SPRINT_1_TASKS.md](../../SPRINT_1_TASKS.md) - Task 1.1 (Environment Setup)

**Good luck!** 🚀

---

**Maintainer:** Development Team
**Last Updated:** 2026-01-08
**Status:** ✅ Ready for Implementation
