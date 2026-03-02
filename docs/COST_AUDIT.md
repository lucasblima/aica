# AICA Life OS — Cost Audit & Margin Analysis

> Last updated: March 2026
> Audience: Founder / CEO / Investors
> Exchange rate used: R$5.50 = $1 USD

---

## 1. Fixed Monthly Costs

| Service | Provider | Tier | Monthly Cost (USD) | Notes |
|---------|----------|------|--------------------|-------|
| Database + Auth + Storage | Supabase Pro | Pro | $20.00 | sa-east-1 region, includes 8GB DB, 250GB bandwidth |
| App Hosting (prod) | Google Cloud Run | Pay-per-use | ~$3-6 | `aica` service, southamerica-east1 |
| App Hosting (staging) | Google Cloud Run | Pay-per-use | ~$2-4 | `aica-dev` service, us-central1 |
| CDN / Edge Proxy | Firebase Hosting | Free tier | $0.00 | 10GB/month bandwidth, sufficient for current scale |
| Domain | aica.guru | Annual | ~$1.25 | ~$15/year prorated |

**Total Fixed: ~$26–31/month (~R$143–170/month)**

Cloud Run costs are low because both services use scale-to-zero with minimal sustained traffic. As traffic grows, expect Cloud Run to scale linearly but remain cost-efficient due to per-request billing.

---

## 2. Variable Costs (Gemini API)

### Model Pricing (per 1M tokens, USD)

| Model | Input | Output | Primary Use |
|-------|-------|--------|-------------|
| gemini-2.5-flash | $0.10 | $0.40 | Chat, classification, sentiment, daily tasks |
| gemini-2.5-pro | $1.25 | $5.00 | Life Council, complex analysis, pattern synthesis |
| text-embedding-004 | ~$0.00001 | ~$0.00001 | Semantic search, RAG indexing |

### Real Usage Data (Jan 26 – Mar 2, 2026)

| Metric | Value |
|--------|-------|
| Total AI interactions | 757 |
| Active days tracked | 30 |
| Total cost | R$ 0.59 (~$0.11 USD) |
| Average cost per interaction | ~$0.00015 USD |
| Average daily cost | ~$0.0037 USD |
| Most expensive action | `life_council` (Gemini Pro) at ~R$0.015/call |
| Cheapest actions | `chat`, `classify`, `sentiment` (Flash) at <R$0.001/call |

Key insight: AI variable costs are extremely low at current scale. Even heavy daily usage by a single user barely exceeds $0.01/day.

---

## 3. Credit Formula

### Cost-to-Credit Mapping

**Base unit: 1 credit ≈ $0.0002 USD of real AI cost**

A 200% margin (3x real cost) is built into every credit charge, ensuring sustainability even with heavy users.

### Action Pricing Table

| Action | Avg Tokens (in+out) | Real Cost (USD) | Credits Charged | Tier |
|--------|---------------------|-----------------|-----------------|------|
| chat | ~500 | $0.00005 | 1 | basic |
| sentiment_analysis | ~300 | $0.00003 | 1 | basic |
| classify_intent | ~400 | $0.00004 | 1 | basic |
| daily_question | ~600 | $0.00006 | 1 | basic |
| build_threads | ~1,200 | $0.00012 | 2 | standard |
| daily_report | ~1,500 | $0.00015 | 2 | standard |
| briefing | ~1,800 | $0.00018 | 2 | standard |
| build_dossier | ~2,500 | $0.00030 | 3 | advanced |
| research_topic | ~3,000 | $0.00035 | 3 | advanced |
| pattern_synthesis | ~3,500 | $0.00040 | 3 | advanced |
| life_council | ~5,000 | $0.00080 | 5 | premium |
| weekly_summary | ~4,500 | $0.00070 | 5 | premium |
| parse_statement | ~8,000+ | $0.00150 | 8 | ultra |

### Tier Summary

| Tier | Credits | Typical Actions | Real Cost Range (USD) |
|------|---------|----------------|-----------------------|
| basic | 1 | Chat, sentiment, classify, daily question | $0.00003–0.00006 |
| standard | 2 | Threads, reports, briefings | $0.00012–0.00018 |
| advanced | 3 | Dossiers, research, pattern synthesis | $0.00030–0.00040 |
| premium | 5 | Life Council, weekly summary | $0.00070–0.00080 |
| ultra | 8 | PDF statement parsing (heavy token use) | $0.00150+ |

---

## 4. Margin Analysis by Plan

### Plan Definitions

| Plan | Price (BRL/month) | Credits/month | Target User |
|------|-------------------|---------------|-------------|
| Free | R$0 | 500 | Trial users, casual explorers |
| Pro | R$39.90 | 5,000 | Daily active users, professionals |
| Teams | R$149.00 | 20,000 | Teams, power users, coaches |

### Margin Breakdown

| Plan | Revenue (BRL) | AI Cost @ full usage (BRL) | Gross Margin (BRL) | Margin % |
|------|--------------|----------------------------|---------------------|----------|
| Free | R$0.00 | ~R$0.45 | -R$0.45 | Loss leader |
| Pro | R$39.90 | ~R$4.50 | R$35.40 | 88.7% |
| Teams | R$149.00 | ~R$18.00 | R$131.00 | 87.9% |

**Notes:**
- AI cost assumes 100% credit utilization (worst case). Typical users consume 40-60% of their credits.
- At typical 50% utilization, Pro margin rises to ~94% and Teams to ~94%.
- Free tier cost of R$0.45/month is the maximum if the user exhausts all 500 credits.

---

## 5. Break-Even Analysis

### Fixed Cost Coverage

| Metric | Value |
|--------|-------|
| Total fixed costs | ~R$156/month (midpoint of R$143–170 range) |
| Pro user margin | R$35.40/month |
| **Pro users needed to break even** | **5 users** |
| Teams user margin | R$131.00/month |
| **Teams users needed to break even** | **2 users** |

### Free User Subsidy

| Metric | Value |
|--------|-------|
| AI cost per Free user (max) | R$0.45/month |
| Pro margin per user | R$35.40/month |
| **Free users subsidized by 1 Pro user** | **~79 users** |
| Teams margin per user | R$131.00/month |
| **Free users subsidized by 1 Teams user** | **~291 users** |

### Path to Profitability

With just 5 Pro subscribers, AICA covers all fixed infrastructure costs. Every additional paying user contributes almost entirely to profit, making the unit economics highly favorable for scaling.

---

## 6. Scaling Projections

Assumptions:
- User distribution: 80% Free, 15% Pro, 5% Teams (typical SaaS freemium conversion rates)
- Credit utilization: 50% average (conservative)
- Fixed infra scales at roughly +$5/month per 500 users (Cloud Run auto-scaling)
- Supabase upgrade to Team ($599/month) triggered at ~1,000 users

| Total Users | Free (80%) | Pro (15%) | Teams (5%) | Monthly Revenue (BRL) | Fixed Infra (BRL) | AI Variable (BRL) | Gross Margin (BRL) | Margin % |
|-------------|-----------|-----------|------------|----------------------|--------------------|--------------------|---------------------|----------|
| 10 | 8 | 1 | 1 | R$188.90 | R$156 | R$5.33 | R$27.57 | 14.6% |
| 50 | 40 | 8 | 2 | R$617.20 | R$170 | R$24.60 | R$422.60 | 68.5% |
| 100 | 80 | 15 | 5 | R$1,343.50 | R$185 | R$52.50 | R$1,106.00 | 82.3% |
| 500 | 400 | 75 | 25 | R$6,717.50 | R$240 | R$262.50 | R$6,215.00 | 92.5% |
| 1,000 | 800 | 150 | 50 | R$13,435.00 | R$3,545 | R$525.00 | R$9,365.00 | 69.7% |
| 5,000 | 4,000 | 750 | 250 | R$67,175.00 | R$4,100 | R$2,625.00 | R$60,450.00 | 90.0% |

**Notes on the 1,000-user tier:** The margin dip at 1,000 users reflects the Supabase upgrade from Pro ($20/month) to Team ($599/month). This is a one-time step-up that is quickly absorbed as user count grows.

### Key Takeaways

1. **AI costs are negligible** — Even at 5,000 users, AI variable cost is only R$2,625/month (~4% of revenue).
2. **Infrastructure is the real cost driver** — Supabase tier upgrades are the largest cost jumps.
3. **Break-even is very achievable** — Just 5 Pro users cover all current fixed costs.
4. **Margins are SaaS-grade** — 85-90% gross margin at scale, comparable to top SaaS companies.
5. **Free tier is sustainable** — At R$0.45/month max per free user, even thousands of free users are cheap to serve.

---

## Appendix: Cost Monitoring

AI costs are tracked in real-time via `aiUsageTrackingService`, which logs every Gemini API call with:
- Action name
- Model used
- Token counts (input + output)
- Calculated cost in BRL

Dashboard query for monthly cost review:
```sql
SELECT
  DATE_TRUNC('month', created_at) AS month,
  COUNT(*) AS interactions,
  SUM(estimated_cost_brl) AS total_cost_brl,
  AVG(estimated_cost_brl) AS avg_cost_brl
FROM usage_logs
GROUP BY 1
ORDER BY 1 DESC;
```
