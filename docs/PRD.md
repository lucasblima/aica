# AICA Life OS — Product Requirements Document

> **Audience**: Claude Code and LLMs assisting development. Optimized for context window efficiency.
> **Updated**: March 2026 | **Commits**: 1100+ | **Files**: 1100+ TS/TSX, 460 Edge/SQL

---

## 1. Vision

**AICA Life OS** is a "Life Operating System" for Brazilians — a personal AI assistant ("Jarvis pessoal") that integrates 8+ life domains into a unified platform. It combines productivity, emotional well-being, community leadership, financial health, and professional tools under one roof.

**Core Philosophy:**
- **Context-Aware**: The AI understands *why* tasks exist, not just *what* they are
- **Privacy by Design**: Raw communication data is processed for insights then discarded — never stored permanently
- **Gamified Existence**: Life viewed as a finite journey with XP, consciousness points, streaks, and badges
- **Proactive Assistance**: AI suggests priorities, drafts communications, and nudges users at the right time
- **Multi-Channel**: Web app + Telegram bot + WhatsApp pipeline — meet users where they are

**Target Audience:**
- Brazilian professionals seeking integrated productivity + well-being
- Community leaders managing complex relationship networks
- Coaches managing athletes (Flux module)
- Content creators producing podcasts (Studio module)
- Researchers managing grants and academic opportunities (Grants module)

---

## 2. Architecture

### Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite 6.2 + Tailwind CSS |
| Backend | Supabase (PostgreSQL + 95 Edge Functions) |
| AI | Google Gemini API (2.5 Flash/Pro) via Edge Functions only |
| Design System | Ceramic (neumorphic, warm palettes, semantic tokens) |
| Auth | Supabase Auth (`@supabase/ssr`, PKCE flow, cookie sessions) |
| Payments | Stripe + Asaas (Brazilian gateway) |
| Deploy | Google Cloud Run + Firebase Hosting |
| Bot | Telegram Bot API (grammY framework) |
| Database | 316 migrations, 50+ tables, full RLS |

### Deployment Topology
| Service | Domain | Region |
|---------|--------|--------|
| `aica` (production) | aica.guru | southamerica-east1 |
| `aica-dev` (staging) | dev.aica.guru | us-central1 |
| `aica-agents` (backend) | — | southamerica-east1 |
| Firebase Hosting | aica.guru | Edge proxy |
| Supabase | uzywajqzbdbrfammshdg.supabase.co | — |

### Key Architectural Patterns
- **Edge Functions for all AI**: Gemini API keys NEVER exposed client-side
- **GeminiClient singleton**: `GeminiClient.getInstance()` for all frontend AI calls
- **Model Router**: `_shared/model-router.ts` — Low→Flash, Medium→Flash/Pro, High→Pro with auto-escalation
- **Health Tracker**: `_shared/health-tracker.ts` — monitors consecutive failures, alerts on 3+
- **Channel Adapter**: `_shared/channel-adapter.ts` — unified messaging interface for Telegram/WhatsApp/future channels
- **RLS everywhere**: Every table has Row-Level Security policies. No exceptions.
- **SECURITY DEFINER**: Functions like `is_member_of()`, `is_association_admin()` prevent recursive RLS
- **Ceramic Design System**: Semantic tokens (`ceramic-base`, `ceramic-text-primary`, `ceramic-accent`) replace Material Design defaults

---

## 3. Module Catalog

AICA has 12 modules organized in `src/modules/`. Each module follows the pattern:
```
src/modules/{name}/
├── views/          # Page-level components (route targets)
├── components/     # Module-specific UI
├── hooks/          # Data fetching + state management
├── services/       # API calls, business logic
├── types/          # TypeScript interfaces
├── context/        # React Context (if needed)
└── index.ts        # Barrel exports
```

### 3.1 Atlas — Task Management
**Purpose**: Eisenhower Matrix-based task management with AI prioritization.
**Route**: `/` (home dashboard), inline task creation
**Key files**: `src/modules/atlas/` (10 files)
**Tables**: `work_items`
**Features**:
- Eisenhower Matrix (urgent/important quadrants)
- AI-powered task extraction from messages
- Recurring tasks via `taskRecurrenceService.ts`
- Daily efficiency scoring (40% completion + 30% focus + 30% consistency)
- Google Calendar integration (tasks merge with calendar events in timeline)
**Edge Functions**: `atlas-task-intelligence`, `compute-atlas-scores`
**Scoring**: Cognitive scoring — task completion patterns, decision quality, priority alignment

### 3.2 Journey — Emotional Intelligence
**Purpose**: Self-awareness through moment logging, daily questions, mood tracking, and consciousness points.
**Route**: Integrated into home dashboard
**Key files**: `src/modules/journey/` (92 files)
**Tables**: `moments`, `daily_reports`, `daily_questions`, `user_patterns`
**Features**:
- Moment logging with emotion detection (Portuguese NLP)
- Daily questions system (infinite rotation)
- Consciousness Points (CP) — 5 categories: presence, reflection, connection, intention, growth
- Weekly AI-generated summaries
- Heatmap visualization of emotional patterns
- Unified timeline (events from all modules)
**Edge Functions**: `generate-questions`, `reanalyze-moments`, `synthesize-user-patterns`, `run-life-council`
**Scoring**: Psychometric scoring — emotional regulation, self-awareness patterns

### 3.3 Connections — Personal CRM
**Purpose**: Organize people by context (4 archetypes) with WhatsApp + Telegram integration.
**Route**: `/connections`, `/connections/:spaceId`
**Key files**: `src/modules/connections/` (67 files)
**Tables**: `connection_spaces`, `connection_members`, `contact_network`, `whatsapp_messages`, `user_telegram_links`, `telegram_conversations`
**Archetypes**:
- 🏠 **Habitat** — Housing/neighborhood
- 💼 **Ventures** — Work/business
- 🎓 **Academia** — Studies/research
- 👥 **Tribo** — Community/social
**Features**:
- Space creation with archetype assignment
- Member management with roles
- WhatsApp contact import + 4-phase conversation intelligence
- Telegram account linking (6-char code flow)
- Contact health scoring (frequency, recency, sentiment, reciprocity, depth)
- Contact dossier (AI-generated profiles from message patterns)
- Split payments integration
**Edge Functions**: `build-contact-dossier`, `build-conversation-threads`, `route-entities-to-modules`, `search-contacts`, `generate-contact-embeddings`
**Scoring**: Network analysis — relationship health, communication patterns

### 3.4 Finance — Personal Financial Management
**Purpose**: Transaction tracking, budget management, CSV/PDF statement import, AI categorization.
**Route**: Integrated into home + dedicated views
**Key files**: `src/modules/finance/` (48 files)
**Tables**: `finance_transactions`, `finance_budgets`, `finance_goals`, `finance_accounts`
**Features**:
- Manual transaction entry + CSV upload + PDF extraction
- AI-powered categorization (Gemini function calling)
- Monthly budget tracking with category limits
- Financial health scoring
- Agent chat for financial questions
**Edge Functions**: `compute-financial-health`, `finance-monthly-digest`
**Scoring**: Behavioral economics — spending patterns, savings rate, budget adherence

### 3.5 Studio — Podcast Production
**Purpose**: End-to-end podcast production workflow from research to post-production.
**Route**: `/studio/*`
**Key files**: `src/modules/studio/` (83 files)
**Tables**: `podcast_shows`, `podcast_episodes`, `podcast_guest_research`, `podcast_topics`
**Features**:
- Multi-show management with episode lifecycle (Draft → Preparation → Studio → Published)
- Guest research via Gemini Deep Research (bio, news, social profiles)
- AI-assisted pauta (outline) generation
- Teleprompter with auto-scroll
- Production mode with topic tracking
- Guest approval portal (`/meu-episodio`)
- Interview question generation
- Studio analytics and insights
**Edge Functions**: `studio-deep-research`, `studio-outline`, `studio-transcribe`, `studio-analytics-insights`, `studio-clip-extract`, `studio-extract-quotes`, `studio-generate-captions`, `studio-show-notes`, `studio-write-assist`, `generate-interview-questions`, `score-guest-candidate`, `send-guest-approval-link`
**Scoring**: Narrative quality — preparation depth, guest research quality

### 3.6 Grants — Academic Grant Management
**Purpose**: Track grant opportunities, manage proposals, parse edital PDFs, sponsor CRM.
**Route**: Via module hub
**Key files**: `src/modules/grants/` (132 files)
**Tables**: `grant_projects`, `grant_opportunities`, `organizations`, `prospect_crm`, `sponsorship_tiers`, `generated_decks`, `incentive_laws`
**Features**:
- PDF edital parsing with Gemini
- Semantic search in edital documents (File Search API)
- Organization management with document processing
- Sponsor prospect pipeline (CRM)
- Presentation deck generation
- Researcher profile computation
**Edge Functions**: `process-edital`, `query-edital`, `deep-research`, `generate-presentation-pdf`, `generate-sponsor-deck`, `compute-researcher-profile`, `process-organization-document`
**Scoring**: Scientometric scoring — publication impact, grant success rate

### 3.7 Flux — Training Management (Coach Platform)
**Purpose**: Comprehensive training management for coaches working with athletes across multiple modalities.
**Route**: `/flux/*` (10+ sub-routes)
**Key files**: `src/modules/flux/` (129 files — largest module)
**Tables**: `athletes`, `workout_blocks`, `alerts`, `workout_templates`, `exercises`, `microcycles`, `athlete_feedback_entries`
**Features**:
- Multi-modality support: swimming, running, cycling, strength
- 7-level athlete progression (Iniciante I-III, Intermediario I-III, Avancado)
- 12-week workout block canvas editor
- 4-week microcycle planning
- Exercise library with categories
- Alert system (5 types: health, motivation, absence, documents, custom)
- AI-generated WhatsApp messages for follow-up
- Athlete portal (`/meu-treino`) for self-service
- PAR-Q health questionnaire
- CRM command center
- Intensity calculator
- Calendar sync for workout scheduling
- Fatigue assessment AI
**Edge Functions**: `flux-training-analysis`, `assess-athlete-fatigue`, `process-workout-automations`, `fetch-athlete-calendar`, `fetch-coach-availability`, `send-athlete-invite`, `sync-workout-calendar`
**Scoring**: Training science — volume/intensity analysis, fatigue assessment

### 3.8 Google Hub — Google Integration
**Purpose**: Centralized Google services integration (Calendar, Drive, Gmail, Contacts).
**Route**: `/google-hub`
**Key files**: `src/modules/google-hub/` (13 files)
**Tables**: Uses `google_calendar_tokens`, `calendar_sync_map`, `google_resource_links`
**Features**:
- Google Calendar OAuth 2.0 (read/write events)
- Auto-sync every 5 minutes + Visibility API
- Google Drive file proxy
- Gmail integration (read, summarize)
- Google Contacts sync
**Edge Functions**: `oauth-token-refresh`, `drive-proxy`, `gmail-proxy`, `gmail-summarize`

### 3.9 Billing — Subscription & Payments
**Purpose**: Freemium model with credit-based usage and Stripe/Asaas payments.
**Route**: `/pricing`, `/usage`, `/subscription`
**Key files**: `src/modules/billing/` (8 files)
**Tables**: `user_credits`, `billing_subscriptions`, `credit_coupons`
**Features**:
- Credit-based AI usage system
- Stripe checkout integration
- Asaas (Brazilian payment gateway) integration
- Usage dashboard with cost tracking
- Coupon/promo code system
- Invite system (5 invites per user)
**Edge Functions**: `create-checkout-session`, `create-portal-session`, `stripe-webhook`, `create-asaas-checkout`, `manage-asaas-subscription`, `asaas-webhook`, `claim-daily-credits`, `check-rate-limit`

### 3.10 EraForge — Gamified RPG Experience
**Purpose**: Turn life into an RPG — create personas, complete quests linked to real tasks.
**Route**: `/eraforge`
**Key files**: `src/modules/eraforge/` (36 files)
**Tables**: `eraforge_*` (characters, quests, inventory, game state)
**Features**:
- Character creation with class selection
- Quest system linked to real AICA tasks
- Inventory and item management
- AI gamemaster (voice-enabled via TTS)
- Access-gated (invite/subscription required)
**Edge Functions**: `eraforge-gamemaster`, `eraforge-tts`, `generate-entity-quests`, `suggest-inventory-items`

### 3.11 LifeRPG — Persona Management
**Purpose**: Define life personas (roles) with HP/stats that decay without engagement.
**Route**: `/liferpg`, `/liferpg/:personaId`
**Key files**: `src/modules/liferpg/` (25 files)
**Tables**: `liferpg_*` (personas, stats, decay schedules)
**Features**:
- Multiple persona creation (Student, Professional, Parent, etc.)
- HP system with daily decay (motivates daily engagement)
- Stats tracking per persona
- pg_cron for automated decay

### 3.12 Onboarding — User Setup
**Purpose**: First-time user experience and module selection.
**Route**: `/onboarding`, `/landing`
**Key files**: `src/modules/onboarding/` (28 files)
**Status**: Onboarding DISABLED by default (migration `20260107000002` marks all users as completed). Users go directly to `/vida`. Landing page simplified to minimal hero + CTAs.
**Features**:
- Multi-step onboarding wizard (optional, can be accessed manually)
- Module selection (choose active modules)
- Landing page for unauthenticated users (simplified hero)
- Waitlist signup
- Tour progress tracking

### 3.13 Podcast (Legacy → Studio)
**Note**: `src/modules/podcast/` (18 files) contains legacy podcast components that were refactored into the Studio module. Some barrel exports still reference this path.

---

## 4. Cross-Cutting Systems

### 4.1 Gamification Engine
**Scope**: XP, CP, streaks, badges, leaderboard — across all modules.

| System | Description |
|--------|------------|
| **XP** | Exponential growth (1.15x/level), 1000 XP base, levels 1-10+ |
| **CP** (Consciousness Points) | 5 categories: presence, reflection, connection, intention, growth |
| **Streaks** | Compassionate model — "47/50 dias", 4 grace periods/month, 3-task recovery |
| **Badges** | 16+ unlock condition types, compound AND/OR logic |
| **Leaderboard** | Privacy controls, opt-in |

**Key services**: `gamificationService.ts`, `consciousnessPointsService.ts`, `streakRecoveryService.ts`, `badgeEvaluationService.ts`
**Tables**: `user_stats`, `activity_log`, `badges`, `streak_trends`, `consciousness_points`

### 4.2 Scientific Scoring Engine
**Scope**: Domain-specific scores per module + composite Life Score.

| Domain | Edge Function | Method |
|--------|--------------|--------|
| Atlas | `compute-atlas-scores` | Cognitive patterns |
| Journey | `compute-wellbeing-scores` | Psychometric analysis |
| Connections | `compute-network-scores` | Network graph analysis |
| Finance | `compute-financial-health` | Behavioral economics |
| Grants | `compute-researcher-profile` | Scientometrics |
| Studio | `studio-analytics-insights` | Narrative quality |
| Flux | `flux-training-analysis` | Training science |
| **Life Score** | `compute-life-score` | Weighted composite |

**Cross-module**: `compute-cross-module-intelligence` — finds patterns across domains.
**Frontend hooks**: `useLifeScore.ts`, `useScientificScore.ts`, `useHealthScore.ts`

### 4.3 AI Infrastructure
- **Model Router** (`_shared/model-router.ts`): `callAI()` with complexity cascade + confidence-based escalation
- **Health Tracker** (`_shared/health-tracker.ts`): `withHealthTracking()` wrapper for all AI calls
- **Cost Tracking**: `aiUsageTrackingService.ts` — non-blocking async tracking per operation
- **File Search**: Gemini Corpora API for semantic search across modules (grants PDFs, transcriptions, moments)
- **Grounded Search**: `useGroundedSearch.ts` — Gemini with Google Search for real-time information
- **Context Cache**: `context-cache` Edge Function for reusable prompt contexts
- **Life Council**: `run-life-council` — weekly AI-generated cross-domain insights

### 4.4 Privacy & LGPD Compliance
- **Raw text NEVER stored** — only `intent_summary` (100 chars max) from WhatsApp
- **LGPD commands** in Telegram bot: `/privacidade`, `/meus_dados`, `/apagar_dados`
- **Privacy purge**: `privacy-purge` Edge Function for data deletion requests
- **Consent tracking**: `user_telegram_links.consent_given/consent_timestamp/consent_scope`
- **Encryption**: AES-256 at rest, TLS 1.3 in transit
- **Vector embeddings**: Non-reversible (1536-dimensional)

### 4.5 Notification System
- **Scheduler**: `notification-scheduler` Edge Function + pg_cron
- **Channels**: WhatsApp, Telegram, email, push (multi-channel cascade)
- **Table**: `scheduled_notifications` with `channel` and `channel_user_id` columns
- **Telegram sender**: `telegram-send-notification` — batch processing, inline keyboards per notification type

---

## 5. Channel Integrations

### 5.1 Telegram Bot (@AicaLifeBot)
**Status**: Phase 1 (MVP) + Phase 2 (AI) deployed.

| Component | File |
|-----------|------|
| Webhook handler | `supabase/functions/telegram-webhook/index.ts` |
| AI router | `supabase/functions/_shared/telegram-ai-router.ts` |
| Notification sender | `supabase/functions/telegram-send-notification/index.ts` |
| Channel adapter | `supabase/functions/_shared/telegram-adapter.ts` |
| Channel registry | `supabase/functions/_shared/channel-registry.ts` |
| Frontend link card | `src/modules/connections/components/telegram/TelegramLinkCard.tsx` |
| Frontend hook | `src/modules/connections/hooks/useTelegramLink.ts` |

**Commands**: `/start`, `/help`, `/status`, `/vincular <code>`, `/desvincular`, `/privacidade`, `/meus_dados`, `/apagar_dados`
**AI features**: Natural language → Gemini function calling → module actions (create_task, log_expense, log_mood, create_event, get_daily_summary, get_budget_status)
**Voice**: OGG download → Gemini multimodal transcription → NLP routing
**Inline keyboards**: Task priority (Eisenhower), expense categories, mood rating (1-5)
**Tables**: `user_telegram_links`, `telegram_conversations`, `telegram_message_log`
**Phase 3 (planned)**: Telegram Mini App (embedded React dashboard)

### 5.2 WhatsApp Pipeline (Privacy-First)
**Status**: 4-phase conversation intelligence deployed.

**Inbound flow**: User exports WhatsApp chat (.txt) → email to `import@import.aica.guru` OR web upload → `ingest-whatsapp-export` → `extract-intent` → pipeline

| Phase | Edge Function | Output |
|-------|--------------|--------|
| 1. Contact Dossier | `build-contact-dossier` | AI-generated contact profiles |
| 2. Conversation Threading | `build-conversation-threads` | 30-min gap session grouping |
| 3. Entity Extraction | `route-entities-to-modules` | Tasks, events, expenses → module routing |
| 4. Group Intelligence | (frontend-only) | Per-participant activity, inferred roles |

**Tables**: `whatsapp_messages`, `whatsapp_file_imports`, `contact_network`, `conversation_threads`, `whatsapp_extracted_entities`
**Privacy**: Raw text NEVER stored. Only `intent_summary` (100 chars max).

### 5.3 Google Calendar
**OAuth 2.0** with `calendar.events` + `userinfo.email` scopes.
Auto-sync every 5 minutes + Visibility API on tab focus.
Events merge with tasks in daily timeline.
**Key files**: `googleAuthService.ts`, `googleCalendarService.ts`, `useGoogleCalendarEvents.ts`

### 5.4 Gmail
Read and summarize emails via `gmail-proxy` and `gmail-summarize` Edge Functions.
Email intelligence: `email-intelligence` Edge Function for parsing imported emails.

---

## 6. Infrastructure

### 6.1 Edge Functions (95 total)
Organized in `supabase/functions/`. Each follows the pattern:
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// CORS + Auth validation + Business logic + JSON response with `success` boolean
```

**Shared utilities** (`_shared/`):
| File | Purpose |
|------|---------|
| `cors.ts` | CORS headers for dev + prod origins |
| `model-router.ts` | AI model selection + `callAI()` |
| `health-tracker.ts` | `withHealthTracking()` for AI calls |
| `logger.ts` | Structured logging |
| `channel-adapter.ts` | Unified messaging interfaces |
| `telegram-adapter.ts` | Telegram Bot API wrapper |
| `telegram-ai-router.ts` | Gemini function calling for Telegram |
| `channel-registry.ts` | Adapter factory |
| `google-token-manager.ts` | OAuth token refresh |
| `whatsapp-export-parser.ts` | .txt chat file parser |
| `whatsapp-document-processor.ts` | Document processing |
| `whatsapp-media-handler.ts` | Media file handling |

### 6.2 Database (316 migrations)
Full PostgreSQL with:
- **pg_cron**: Scheduled jobs (notification delivery, decay systems, conversation intelligence)
- **pg_net**: HTTP calls from database (Edge Function triggers)
- **pgmq**: Message queues (future migration path for high-volume processing)
- **RLS**: Every table protected. Service role access for Edge Functions.
- **SECURITY DEFINER**: Functions for membership checks, cross-table operations.

Key table groups:
| Domain | Tables |
|--------|--------|
| Auth/Users | `auth.users`, `profiles`, `user_stats`, `user_credits` |
| Atlas | `work_items`, `task_projects` |
| Journey | `moments`, `daily_reports`, `daily_questions`, `user_patterns` |
| Connections | `connection_spaces`, `connection_members`, `contact_network` |
| WhatsApp | `whatsapp_messages`, `whatsapp_file_imports`, `conversation_threads`, `whatsapp_extracted_entities` |
| Telegram | `user_telegram_links`, `telegram_conversations`, `telegram_message_log` |
| Finance | `finance_transactions`, `finance_budgets`, `finance_goals`, `finance_accounts` |
| Studio | `podcast_shows`, `podcast_episodes`, `podcast_guest_research`, `podcast_topics`, `podcast_pautas`, `podcast_guest_candidates` |
| Grants | `grant_projects`, `grant_opportunities`, `organizations`, `generated_decks` |
| Flux | `athletes`, `workout_blocks`, `alerts`, `exercises`, `microcycles`, `workout_templates`, `workout_slots`, `athlete_feedback_entries` |
| Gamification | `badges`, `streak_trends`, `consciousness_points`, `activity_log` |
| Billing | `user_credits`, `billing_subscriptions`, `credit_coupons` |
| AI | `ai_usage_analytics`, `ai_function_health`, `file_search_corpora`, `file_search_documents` |
| Notifications | `scheduled_notifications` |
| EraForge | `eraforge_*` tables |
| LifeRPG | `liferpg_*` tables |

### 6.3 Ceramic Design System
Neumorphic design language with semantic tokens.

| Token | Usage |
|-------|-------|
| `bg-ceramic-base` | Page background |
| `ceramic-cool` | Subtle backgrounds |
| `ceramic-border` | Borders |
| `ceramic-text-primary` | Main text |
| `ceramic-text-secondary` | Supporting text |
| `ceramic-accent` | Brand accent |
| `ceramic-info/warning/success/error` | Status colors |
| `shadow-ceramic-emboss` | Neumorphic elevation |

**Foundation components**: `PageShell`, `CeramicLoadingState`, `CeramicErrorState`, `AIThinkingState`, `CeramicTabSelector`
**Reference**: `docs/CERAMIC_DESIGN_SYSTEM_GUIDANCE.md`, `.claude/design/DESIGN_TOKENS.md`

### 6.4 Shared Frontend
**Components** (`src/components/`): 150+ components across 19 categories:
- `ui/` (30) — primitives: LoadingScreen, Button, Modal, etc.
- `features/` (60) — cross-module: LifeScoreRadar, ScoreCard, DomainWeightSliders, etc.
- `domain/` (13) — business logic components
- `layout/` (6) — HeaderGlobal, BottomNav, PageShell
- `gamification/` (3), `fileSearch/` (4), `aiCost/` (10), `guards/` (3)

**Global hooks** (`src/hooks/`): 55 hooks including:
- `useAuth.ts` — Authentication state
- `useLifeScore.ts`, `useScientificScore.ts` — Scoring
- `useConsciousnessPoints.ts`, `useStreakTrend.ts` — Gamification
- `useGoogleCalendarEvents.ts`, `useGoogleAuth.ts` — Google integration
- `useFileSearch.ts`, `useFileSearchV2.ts` — Semantic search
- `useBilling.ts`, `useUserCredits.ts`, `useUserPlan.ts` — Billing
- `useLifeCouncil.ts`, `useCrossModuleIntelligence.ts` — AI insights
- `useModuleRegistry.ts`, `useModuleAgent.ts` — Module system

**Global services** (`src/services/`): 58 services including:
- `supabaseClient.ts` — Single Supabase instance
- `aiUsageTrackingService.ts` — AI cost tracking
- `gamificationService.ts` — XP/level calculations
- `consciousnessPointsService.ts` — CP system
- `healthScoreService.ts` — Relationship health
- `chatService.ts`, `chatStreamService.ts` — AI chat
- `billingService.ts`, `couponService.ts` — Payments
- `contactNetworkService.ts`, `contactSyncService.ts` — CRM

**Contexts** (`src/contexts/`): `NavigationContext`, `TourContext`, `XPNotificationContext`

---

## 7. Routes

All routes defined in `src/router/AppRouter.tsx` (882 lines).

| Route | Component | Module |
|-------|-----------|--------|
| `/` | Home dashboard | Atlas + Journey + cross-module |
| `/onboarding` | OnboardingFlow | Onboarding |
| `/connections` | ConnectionsPage | Connections |
| `/connections/:spaceId` | SpaceDetailView | Connections |
| `/contatos` | ContactsPage | Connections (contacts) |
| `/contatos/:contactId` | ContactDetailPage | Connections |
| `/studio/*` | StudioLayout | Studio |
| `/studio/calendar` | StudioCalendarView | Studio |
| `/studio/analytics` | StudioAnalyticsView | Studio |
| `/flux` | FluxDashboard | Flux |
| `/flux/athlete/:athleteId` | FluxAthleteDetailView | Flux |
| `/flux/canvas/:athleteId/:blockId?` | FluxCanvasEditorView | Flux |
| `/flux/alerts` | FluxAlertsView | Flux |
| `/flux/templates` | TemplateLibraryView | Flux |
| `/flux/microcycle/:microcycleId` | MicrocycleEditorView | Flux |
| `/flux/leveling` | LevelingEngineView | Flux |
| `/flux/intensity/:athleteId?` | IntensityCalculatorView | Flux |
| `/flux/crm` | CRMCommandCenterView | Flux |
| `/flux/parq/:athleteId` | ParQFormView | Flux |
| `/eraforge` | EraForgeMainView | EraForge |
| `/meu-treino` | AthletePortalView | Flux (athlete self-service) |
| `/google-hub` | GoogleHubPage | Google Hub |
| `/meu-episodio` | GuestPortalView | Studio (guest self-service) |
| `/pricing` | PricingPage | Billing |
| `/usage` | UsageDashboardPage | Billing |
| `/subscription` | ManageSubscriptionPage | Billing |
| `/modules` | ModuleHubPage | Module registry |
| `/liferpg` | LifeRPGMainView | LifeRPG |
| `/liferpg/:personaId` | LifeRPGDetailView | LifeRPG |
| `/file-search` | FileSearchAnalyticsView | File Search |
| `/profile` | ProfilePage | User profile |
| `/invites` | InvitesPage | Invite system |
| `/share-target` | ShareTargetPage | PWA share target |
| `/status` | StatusPage | Public service status |
| `/chat` | ChatPage | AI chat |

**Public routes** (no auth): `/` (landing), `/onboarding`, `/status`, `/pricing`, `/privacy`, `/terms`, `/invite/:inviteToken`, `/invite-accept`
**Auth callback**: `/auth/callback` — OAuth redirect handler
**Protected routes**: All others require authentication via `ProtectedRoute` wrapper.
**Admin/Diagnostics**: `/diagnostics` (system health), `/usage` (AI credits), `/subscription` (Stripe portal)
**PWA**: `/share-target` — receives WhatsApp exports via Web Share API
**Context Providers** (in AppRouter): `NavigationContext`, `StudioProvider`, `FluxProvider`, `EraforgeGameProvider`, `EraforgeVoiceProvider`, `XPNotificationProvider`, `TourProvider`

---

## 8. Development

### Commands
```bash
npm run dev              # Vite dev server (port 3000)
npm run build            # Production build
npm run typecheck        # TypeScript strict check
npm run lint             # ESLint
npm run test             # Vitest unit tests
npm run test:e2e         # Playwright E2E (32 tests)

npx supabase db diff     # Preview migration changes
npx supabase db push     # Apply migrations to remote
npx supabase functions serve  # Local Edge Functions
npx supabase functions deploy <name> --no-verify-jwt  # Deploy Edge Function
```

### Quality Targets
| Metric | Target |
|--------|--------|
| Unit test coverage | >80% |
| Build time | <3 min |
| Lighthouse | >90 |
| Compliance | LGPD, OWASP Top 10, WCAG 2.1 AA |

### Critical Rules
- **NEVER** expose API keys in frontend — use Edge Functions
- **NEVER** create .backup/.bak files — Git is the backup
- **ALWAYS** include RLS policies with new tables
- **ALWAYS** use `@supabase/ssr` for auth
- **ALWAYS** use `GeminiClient.getInstance()` singleton
- **ALWAYS** use Ceramic semantic tokens (not Material Design defaults)
- **ALWAYS** test with `npm run build && npm run typecheck` before committing
- Use `moments` table (not `moment_entries`) until consolidation confirmed
- Never call `supabase.auth.refreshSession()` unconditionally

### Git Conventions
- Branch naming: `feature/{name}`, `fix/{name}`, `docs/{name}`
- Commits: `<type>(<scope>): <description>` + `Co-Authored-By: Claude Opus 4.6`
- Always create PRs — never push directly to main
- Squash merge with `--delete-branch`

---

## 9. Roadmap Status

### Completed (Phases 1-9)
- Foundation (UI, auth, task management)
- Privacy-first architecture
- Gamification system (XP, CP, streaks, badges)
- Emotional intelligence (Journey module)
- AI & Voice (Gemini Live, podcast workflow)
- Testing & security audit (32 E2E tests)
- Architecture refactoring (SECURITY DEFINER, error boundaries)
- Agent architecture + developer experience
- Production hardening (OAuth, PKCE)

### Recently Shipped (2026)
- WhatsApp 4-phase conversation intelligence
- Telegram bot integration (Phase 1 + 2)
- Scientific Scoring Engine (7 domains + Life Score)
- Flux module expansion (canvas editor, microcycles, templates, CRM)
- EraForge gamified RPG
- LifeRPG persona system
- Billing/subscription system (Stripe + Asaas)
- Google Hub (Calendar, Drive, Gmail, Contacts)
- Module registry and hub
- Invite system
- Landing page refinements

### Planned (Next)
- Telegram Mini App (Phase 3) — embedded React dashboard inside Telegram
- Voice interface expansion (Web Speech API)
- Offline support (service workers)
- Advanced contact network AI insights
- Cross-module intelligence dashboard

---

## 10. Key Documentation

| Document | Path | Purpose |
|----------|------|---------|
| This PRD | `docs/PRD.md` | Product overview for LLMs |
| CLAUDE.md | `CLAUDE.md` | Claude Code operating instructions |
| Ceramic Design System | `docs/CERAMIC_DESIGN_SYSTEM_GUIDANCE.md` | Full token reference |
| Privacy & Security | `docs/PRIVACY_AND_SECURITY.md` | LGPD/GDPR compliance |
| Security Audit | `docs/SECURITY_AUDIT_REPORT.md` | OWASP assessment |
| Agent Architecture | `docs/architecture/AGENT_ARCHITECTURE.md` | Multi-agent system |
| File Search Guide | `docs/FILE_SEARCH_INTEGRATION_GUIDE.md` | Semantic search integration |
| Google Calendar | `docs/features/GOOGLE_CALENDAR_INTEGRATION.md` | OAuth & sync setup |
| Design Vision | `.claude/design/DESIGN_VISION.md` | Design rationale |
| Design Tokens | `.claude/design/DESIGN_TOKENS.md` | Complete token list |
| Module Guides | `.claude/design/MODULE_GUIDES.md` | Per-module design |
