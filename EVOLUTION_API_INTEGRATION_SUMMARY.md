# Evolution API Integration - Executive Summary

**Data:** 2026-01-08
**Status:** 📋 Plano Completo Aprovado
**Prioridade:** Alta
**Estimativa Total:** 5-7 dias

---

## O Que Será Implementado

### Objetivo
Integrar **completamente** o WhatsApp (via Evolution API) com o sistema de **Contact Network**, permitindo que conversas do WhatsApp atualizem automaticamente os health scores dos contatos.

### Benefícios Principais
1. **Health Scores Reais**: Substituir simulação por dados de interação reais
2. **Visão 360°**: Unificar Google Contacts + WhatsApp + Podcast Guests
3. **Alerts Proativos**: Detectar relacionamentos em risco
4. **Insights de Engagement**: Dashboard completo de comunicação

---

## Infraestrutura Atual

### ✅ Já Temos (Issue #12)
- Evolution API Client implementado
- 3 Edge Functions deployadas
- 4 tabelas WhatsApp criadas
- Webhook configurado
- Frontend services prontos

**Completude:** 95%

### ⚠️ O Que Falta
1. Endpoints para buscar histórico de mensagens
2. Sincronização automática WhatsApp → Contact Network
3. Atualização automática de health scores
4. UI para visualizar conversas WhatsApp nos contatos

---

## Plano de Implementação

### Phase 1: Backend Extensions (1 dia)
- Add `fetchMessages()`, `fetchChats()`, `fetchGroupMetadata()` to Evolution Client
- Test endpoints

### Phase 2: Database Schema (0.5 dia)
- Add WhatsApp columns to `contact_network`
- Create `contact_whatsapp_sync` table
- Create trigger function for auto-sync

### Phase 3: Sync Services (1.5 dias)
- `whatsappContactSyncService.ts` - Sync logic
- `whatsappAnalyticsService.ts` enhancements
- Health score calculation

### Phase 4: Frontend UI (1 dia)
- WhatsApp badge on contact cards
- WhatsApp tab in contact detail
- Conversation summary widget

### Phase 5: Background Jobs (0.5 dia)
- Cron job for periodic sync
- Rate limiting & error handling

### Phase 6: Testing & QA (1 dia)
- Unit tests
- E2E tests
- Performance testing

---

## Arquitetura Simplificada

```
WhatsApp Message Received
    ↓
webhook-evolution (Edge Function)
    ↓
whatsapp_messages table (INSERT)
    ↓
TRIGGER: sync_whatsapp_to_contact_network()
    ↓
contact_network table (UPSERT)
    ├→ health_score updated
    ├→ last_contact_at updated
    └→ whatsapp_message_count updated
    ↓
Health Alert Service
    └→ Generate alerts if health < 30
```

---

## Database Changes

### New Columns in `contact_network`
```sql
whatsapp_phone TEXT
whatsapp_conversation_id UUID
last_whatsapp_message_at TIMESTAMPTZ
whatsapp_message_count INTEGER
whatsapp_average_sentiment DECIMAL
```

### New Table: `contact_whatsapp_sync`
Links contacts to WhatsApp conversations with sync configuration.

### New Function: `sync_whatsapp_to_contact_network()`
Trigger function that runs on every new WhatsApp message to update contact data.

---

## Health Score Calculation

```typescript
health_score = BASE(50) + 
               RECENCY_SCORE(20) + 
               SENTIMENT_SCORE(20) + 
               ENGAGEMENT_SCORE(10)

// Recency Score:
- Last 7 days:  +20
- Last 30 days: +10
- Older:        -10

// Sentiment Score:
average_sentiment * 20

// Engagement Score:
Has bidirectional messages: +10
Only one-way: -5
```

---

## Frontend Features

### Contact Card Enhancements
- WhatsApp badge with message count
- Sentiment indicator (↑↓→)
- Quick link to WhatsApp tab

### Contact Detail - WhatsApp Tab
- Conversation summary
- Message count, sentiment, engagement score
- Last message timestamp
- "Sync Now" button

### Health Alert Integration
- "Low WhatsApp engagement" alert type
- "No response in 30 days" alert
- Actionable: "Send WhatsApp message"

---

## Privacy & LGPD

### Compliance
✅ Consent system already implemented
✅ Data minimization: Only store aggregates
✅ Right to erasure: Soft-delete with cascade
✅ Data retention: 90-day auto-delete

### What We DON'T Store
❌ Full message content in contact_network
❌ Media files beyond 30 days
❌ Messages without consent

---

## Rollout Strategy

1. **Dev Environment** (1 dia)
   - Deploy all changes
   - Manual testing

2. **Staging** (1 dia)
   - Test with real data
   - Performance validation

3. **Production** (Feature Flag)
   - Gradual rollout: 10% → 50% → 100%
   - Monitor errors
   - 48h stability window

---

## Success Metrics

### Functional
- 100% of WhatsApp conversations synced
- Health scores update within 5 minutes
- Zero data loss

### Performance
- Sync latency < 2 seconds
- Cron job < 10 minutes for 1000 contacts
- Database queries < 100ms (p95)

### User Experience
- WhatsApp badge visible
- Analytics load < 1 second
- Real-time updates

---

## Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| Evolution API rate limits | Exponential backoff + queue |
| Database trigger slow | Optimize query, add indexes |
| Large message history | Batch processing, pagination |
| LGPD non-compliance | Legal review, consent audit |

---

## Next Steps

1. ✅ Review this plan with Lucas
2. ✅ Create GitHub issue
3. ✅ Start Phase 1 implementation
4. ✅ Schedule sync meeting after Phase 2

---

## Documentation

- **Full Implementation Plan:** `docs/EVOLUTION_API_INTEGRATION_PLAN.md`
- **WhatsApp Setup:** `docs/whatsapp/README_WHATSAPP_SETUP.md`
- **Current Status:** `WHATSAPP_INTEGRATION_SUMMARY.md`
- **Database Schema:** `supabase/migrations/20260108_contact_google_sync.sql`

---

**Maintainer:** Lucas Boscacci Lima + Claude Sonnet 4.5
**Last Updated:** 2026-01-08
