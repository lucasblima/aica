# Aica Life OS - Architecture Map (PRD Reference)

**Generated:** 2026-01-30
**Purpose:** Comprehensive mapping for troubleshooting and debugging
**Maintainer:** Claude Code + Development Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Edge Functions (42 total)](#2-edge-functions)
3. [React Hooks (70+ total)](#3-react-hooks)
4. [Routes & Pages](#4-routes--pages)
5. [Services & Integrations (47 total)](#5-services--integrations)
6. [Dependency Matrix](#6-dependency-matrix)
7. [Common Issues & Debugging Guide](#7-common-issues--debugging-guide)

---

## 1. Executive Summary

### Architecture Overview

| Layer | Count | Technology |
|-------|-------|------------|
| Edge Functions | 42 | Deno + Supabase Functions |
| React Hooks | 70+ | React 18 + TypeScript |
| Routes | 26 | React Router v6 |
| ViewStates | 10 | Context-based navigation |
| Services | 47 | TypeScript modules |
| Database Tables | 50+ | PostgreSQL + Supabase |

### Key Integration Points

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
├─────────────────────────────────────────────────────────────┤
│  Pages/Views  →  Hooks  →  Services  →  Edge Functions      │
│       ↓            ↓           ↓              ↓              │
│  Components    State      API Calls      External APIs      │
│                Management                                    │
├─────────────────────────────────────────────────────────────┤
│                    Supabase (Backend)                        │
│  Auth │ Database (RLS) │ Storage │ Realtime │ Functions     │
├─────────────────────────────────────────────────────────────┤
│                    External Services                         │
│  Gemini │ Evolution API │ Google OAuth │ Stripe │ Resend    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Edge Functions

### 2.1 Complete Function Inventory (42 Functions)

| # | Function | Purpose | Auth | External API |
|---|----------|---------|------|--------------|
| 1 | `calculate-health-scores` | Dual-mode health score (batch/single) | JWT/Service | - |
| 2 | `chat-with-aica` | Real-time Gemini chat (premium/standard/lite) | JWT | Gemini |
| 3 | `check-rate-limit` | Token validation per model tier | Service | - |
| 4 | `claim-daily-credits` | Awards 5 daily credits + XP | JWT | - |
| 5 | `configure-instance-webhook` | Evolution API webhook config | JWT | Evolution |
| 6 | `create-checkout-session` | Stripe checkout for subscriptions | JWT | Stripe |
| 7 | `create-user-instance` | Multi-instance WhatsApp session | JWT | Evolution |
| 8 | `deep-research` | Comprehensive guest research | None | Gemini |
| 9 | `disconnect-whatsapp` | Disconnect WhatsApp instance | JWT | Evolution |
| 10 | `estimate-processing-cost` | Credit cost for contact analysis | JWT | - |
| 11 | `file-search` | Gemini File Search wrapper | JWT | Gemini Files |
| 12 | `file-search-corpus` | Corpus-based document retrieval | JWT | Gemini Files |
| 13 | `gemini-chat` | Multi-action Gemini engine (20+ actions) | None | Gemini |
| 14 | `gemini-live` | Real-time streaming for podcast | JWT | Gemini |
| 15 | `generate-contact-embeddings` | 768-dim embeddings for contacts | Service | Gemini |
| 16 | `generate-pairing-code` | 8-digit WhatsApp pairing (60s TTL) | JWT | Evolution |
| 17 | `generate-presentation-pdf` | PDF from podcast data | JWT | - |
| 18 | `generate-questions` | Interview questions from outline | JWT | Gemini |
| 19 | `generate-slide-content` | Slide content for episodes | JWT | Gemini |
| 20 | `generate-sponsor-deck` | Sponsor deck generation | JWT | Gemini |
| 21 | `media-processor` | Media resize/compress/convert | JWT | - |
| 22 | `notification-sender` | In-app & push notifications | Service | FCM |
| 23 | `oauth-token-refresh` | Google OAuth token refresh | JWT | Google OAuth |
| 24 | `privacy-purge` | LGPD/GDPR data deletion | Service | - |
| 25 | `process-action-queue` | Queued AI actions processing | Service | Gemini |
| 26 | `process-contact-analysis` | WhatsApp message analysis | Service | Gemini |
| 27 | `process-document` | Document OCR/extraction | JWT | Document AI |
| 28 | `process-edital` | Grant PDF processing | JWT | Gemini |
| 29 | `process-message-queue` | Queued chat messages | Service | Gemini |
| 30 | `process-organization-document` | Org document processing | JWT | Gemini |
| 31 | `process-whatsapp-ai` | Sentiment & intent analysis | JWT | Gemini |
| 32 | `process-whatsapp-document` | WhatsApp document processing | Service | Gemini |
| 33 | `query-edital` | Query edital via File Search | JWT | Gemini |
| 34 | `search-contacts` | Full-text contact search | JWT | - |
| 35 | `search-documents` | Full-text document search | JWT | Gemini Files |
| 36 | `send-guest-approval-link` | Guest approval notification | JWT | Resend |
| 37 | `send-invitation-email` | Branded invite emails | Service | Resend |
| 38 | `stripe-webhook` | Stripe payment events | Webhook | Stripe |
| 39 | `sync-message-history` | WhatsApp message sync | Service | Evolution |
| 40 | `sync-whatsapp-contacts` | Sync contacts from WhatsApp | JWT | Evolution |
| 41 | `test-process-edital` | Test function for edital | JWT | Gemini |
| 42 | `webhook-evolution` | Evolution API webhook receiver | HMAC | Evolution |

### 2.2 Gemini-Chat Actions (20+ Sub-Actions)

| Action | Input | Output | Use Case |
|--------|-------|--------|----------|
| `analyze_moment_sentiment` | content, context | sentiment, emotions, triggers | Journey moments |
| `generate_weekly_summary` | moments[] | emotionalTrend, insights | Journey weekly |
| `generate_dossier` | guestName, theme | biography, controversies | Podcast research |
| `generate_ice_breakers` | guestName, keyFacts | iceBreakers[] | Podcast prep |
| `generate_pauta_questions` | guestName, outline | questions[] | Podcast prep |
| `generate_pauta_outline` | guestName, theme | title, sections | Podcast prep |
| `whatsapp_sentiment` | text | sentiment, triggers | WhatsApp analysis |
| `generate_daily_report` | date, tasks, scores | summary, insights | Atlas daily |
| `generate_field_content` | edital_text, config | generatedText | Grants auto-fill |
| `analyze_edital_structure` | editalText | title, fields[] | Grants parsing |
| `parse_form_fields` | text | fields[] | Grants extraction |
| `generate_auto_briefing` | projectIdea | briefing | Grants AI |
| `improve_briefing_field` | fieldId, content | improvedText | Grants AI |
| `extract_required_documents` | pdfContent | documents[] | Grants parsing |
| `extract_timeline_phases` | pdfContent | phases[] | Grants parsing |
| `parse_statement` | rawText | bankName, transactions[] | Finance parsing |
| `research_guest` | guest_name | biography, topics | Podcast research |
| `generate_daily_question` | userId, category | question, options | Journey questions |
| `analyze_content_realtime` | prompt | text | Generic AI |
| `cluster_moments_by_theme` | prompt | text | Journey clustering |

### 2.3 Database Tables Accessed by Functions

| Table | Functions Using It |
|-------|-------------------|
| `contact_network` | 14 functions |
| `whatsapp_sessions` | 6 functions |
| `whatsapp_messages` | 5 functions |
| `user_credits` | 4 functions |
| `profiles` | 3 functions |
| `moments` | 3 functions |
| `tasks` | 3 functions |

---

## 3. React Hooks

### 3.1 Global Hooks (src/hooks/)

#### Authentication & Session

| Hook | Purpose | Key State | Side Effects |
|------|---------|-----------|--------------|
| `useAuth` | Core auth with PKCE | user, session, isLoading | onAuthStateChange subscription |
| `useGoogleAuth` | Google OAuth login | loading, error | OAuth redirect |

#### WhatsApp Integration

| Hook | Purpose | Key State | Side Effects |
|------|---------|-----------|--------------|
| `usePairingCode` | 8-digit pairing code | code, secondsRemaining, isExpired | Edge Function + timer |
| `useWhatsAppSessionSubscription` | Realtime session | session, isConnected | Supabase Realtime |
| `useWhatsAppContacts` | Contacts list | contacts, syncStatus | Periodic sync |

#### Google Calendar

| Hook | Purpose | Key State | Side Effects |
|------|---------|-----------|--------------|
| `useGoogleCalendarEvents` | Calendar sync | events, isConnected | 5-min auto-sync, token refresh |

#### Gamification

| Hook | Purpose | Key State | Side Effects |
|------|---------|-----------|--------------|
| `useConsciousnessPoints` | CP balance | balance, history | Auto-fetch on mount |
| `useUserCredits` | Credit system | balance, canClaimDaily | Realtime subscription |

#### Notifications

| Hook | Purpose | Key State | Side Effects |
|------|---------|-----------|--------------|
| `useNotifications` | In-app notifications | notifications, unreadCount | Realtime subscription |

#### Invite System

| Hook | Purpose | Key State | Side Effects |
|------|---------|-----------|--------------|
| `useInviteSystem` | Viral invites | stats, pendingInvites | Auto-fetch, token gen |

#### Chat & AI

| Hook | Purpose | Key State | Side Effects |
|------|---------|-----------|--------------|
| `useChatMessages` | Unified chat | messages, rateLimitStatus | Realtime, optimistic updates |
| `useFileSearch` | File Search API | corpora, documents, searchResults | API calls |

### 3.2 Module-Specific Hooks

#### Journey Module (src/modules/journey/hooks/)

| Hook | Purpose |
|------|---------|
| `useConsciousnessPoints` | Journey CP stats |
| `useMoments` | Moment CRUD |
| `useDailyQuestion` | Daily question workflow |
| `useUnifiedTimeline` | Timeline with filtering |
| `useWeeklySummary` | AI weekly summary |
| `useAudioRecording` | Audio for moments |

#### Grants Module (src/modules/grants/hooks/)

| Hook | Purpose |
|------|---------|
| `useDocumentProcessing` | Document upload/RAG |
| `useOrganizationWizard` | Wizard flow state |
| `useOrganizationProgress` | Completion tracking |
| `useSponsorship` | Sponsorship tracking |
| `useIncentiveLaws` | Law/regulation data |
| `useAutoSave` | Form auto-save |

#### Connections Module (src/modules/connections/hooks/)

| Hook | Purpose |
|------|---------|
| `useContactSearch` | Semantic search |
| `useSpaces` | Space CRUD |
| `useWhatsAppConnection` | Connection lifecycle |
| `useWhatsAppGamification` | WA gamification |
| `useConnectionNavigation` | Navigation state |

#### Finance Module (src/modules/finance/hooks/)

| Hook | Purpose |
|------|---------|
| `useFinanceStatements` | Statement list |
| `useTransactions` | Transaction list |
| `usePdfExtractor` | PDF extraction |
| `useFinanceAgent` | AI agent |

#### Studio Module (src/modules/studio/hooks/)

| Hook | Purpose |
|------|---------|
| `useStudioData` | Episode data (topics, ice breakers) |
| `useWorkspaceState` | Workspace state |
| `useWorkspaceAI` | AI integration |
| `useSavedPauta` | Saved outlines |

---

## 4. Routes & Pages

### 4.1 Public Routes (No Auth)

| Route | Component | Purpose |
|-------|-----------|---------|
| `/landing` | `LandingPage` | Entry point |
| `/privacy` | `PrivacyPolicyPage` | LGPD/GDPR policy |
| `/terms` | `TermsOfServicePage` | Legal terms |
| `/diagnostics` | `DiagnosticsPage` | Auth troubleshooting |
| `/invite/:token` | `InviteAcceptPage` | Invite acceptance |
| `/guest-approval/:episodeId/:token` | `GuestApprovalPage` | Podcast guest approval |

### 4.2 Protected Routes (Auth Required)

| Route | Component | Auth | Layout |
|-------|-----------|------|--------|
| `/` | `MainAppWithNavigation` | Yes | BottomNav conditional |
| `/onboarding` | `OnboardingFlow` | Yes | Full screen |
| `/connections` | `ConnectionsPage` | Yes | BottomNav visible |
| `/connections/:archetype` | `ArchetypeListPage` | Yes | BottomNav visible |
| `/connections/:archetype/:spaceId` | `SpaceDetailPage` | Yes | No BottomNav |
| `/connections/:archetype/:spaceId/:section` | `SpaceSectionPage` | Yes | No BottomNav |
| `/contacts` | `ContactsView` | Yes | BottomNav visible |
| `/studio` | `StudioMainView` | Yes | No BottomNav |
| `/profile` | `ProfilePage` | Yes | BottomNav visible |
| `/ai-cost` | `AICostDashboard` | Yes | No BottomNav |
| `/file-search` | `FileSearchAnalyticsView` | Yes | No BottomNav |
| `/admin/whatsapp-monitoring` | `WhatsAppMonitoringDashboard` | AdminGuard | No BottomNav |

### 4.3 Internal ViewStates (Rendered on `/`)

| ViewState | Component | BottomNav |
|-----------|-----------|-----------|
| `vida` | `Home` | Visible |
| `agenda` | `AgendaView` | Visible |
| `finance` | `FinanceDashboard` | Hidden |
| `finance_agent` | `FinanceAgentView` | Hidden |
| `journey` | `JourneyFullScreen` | Hidden |
| `grants` | `GrantsModuleView` | Hidden |
| `health` | `LifeAreaView` | Hidden |
| `education` | `LifeAreaView` | Hidden |
| `legal` | `LifeAreaView` | Hidden |
| `professional` | `LifeAreaView` | Hidden |

### 4.4 Navigation Flow

```
Authentication
     │
     ▼
┌─────────────────┐
│ onboarding_     │──No──► /onboarding
│ completed_at?   │
└────────┬────────┘
         │Yes
         ▼
┌─────────────────┐
│   Main App (/)  │
│   ViewState     │
├─────────────────┤
│ vida ◄──────────┼──► connections (Router)
│ agenda          │     ├─ :archetype
│ finance         │     └─ :archetype/:spaceId
│ journey         │
│ grants          │──► studio (Router)
└─────────────────┘──► contacts (Router)
```

---

## 5. Services & Integrations

### 5.1 Core Infrastructure

| Service | File | Purpose | External API |
|---------|------|---------|--------------|
| `supabaseClient` | supabaseClient.ts | Single Supabase instance | Supabase |
| `edgeFunctionService` | edgeFunctionService.ts | Edge Function invoker with retry | All via Edge |
| `supabaseService` | supabaseService.ts | High-level DB operations | Supabase |

### 5.2 Google Integration

| Service | File | Purpose | External API |
|---------|------|---------|--------------|
| `googleAuthService` | googleAuthService.ts | OAuth token management | Google OAuth |
| `googleCalendarService` | googleCalendarService.ts | Calendar CRUD | Google Calendar |
| `googleContactsService` | googleContactsService.ts | Contacts sync | Google Contacts |
| `googleCalendarTokenService` | googleCalendarTokenService.ts | Token storage | - |

### 5.3 WhatsApp Integration

| Service | File | Purpose | External API |
|---------|------|---------|--------------|
| `whatsappService` | whatsappService.ts | Message operations | Evolution |
| `whatsappContactSyncService` | whatsappContactSyncService.ts | Contact sync | Evolution |
| `whatsappAnalyticsService` | whatsappAnalyticsService.ts | Sentiment analytics | Gemini |
| `whatsappConsentService` | whatsappConsentService.ts | LGPD consent | - |
| `pairingCodeService` | pairingCodeService.ts | Pairing code generation | Evolution |
| `adminWhatsAppService` | adminWhatsAppService.ts | Instance management | Evolution |

### 5.4 AI Integration

| Service | File | Purpose | External API |
|---------|------|---------|--------------|
| `geminiSentimentAnalysis` | geminiSentimentAnalysis.ts | Sentiment analysis | Gemini |
| `whisperTranscription` | whisperTranscription.ts | Audio transcription | Whisper |
| `geminiMemoryService` | geminiMemoryService.ts | Conversation memory | - |
| `modelRouterService` | modelRouterService.ts | Model selection | - |
| `aiUsageTrackingService` | aiUsageTrackingService.ts | Usage tracking | - |
| `aiCostAnalyticsService` | aiCostAnalyticsService.ts | Cost analysis | - |

### 5.5 Gamification

| Service | File | Purpose |
|---------|------|---------|
| `gamificationService` | gamificationService.ts | XP, levels, streaks |
| `badgeEvaluationService` | badgeEvaluationService.ts | Badge unlock logic |
| `consciousnessPointsService` | consciousnessPointsService.ts | CP system |
| `streakRecoveryService` | streakRecoveryService.ts | Compassionate streaks |

### 5.6 Business Logic

| Service | File | Purpose |
|---------|------|---------|
| `journeyService` | journeyService.ts | Moments, questions |
| `podcastProductionService` | podcastProductionService.ts | Episode workflow |
| `guestApprovalService` | guestApprovalService.ts | Guest workflow |
| `healthScoreService` | healthScoreService.ts | Health metrics |
| `efficiencyService` | efficiencyService.ts | Task efficiency |
| `recommendationEngine` | recommendationEngine.ts | AI recommendations |

---

## 6. Dependency Matrix

### 6.1 Edge Function → Database Tables

```
┌─────────────────────────────────────────────────────────────────┐
│                    Edge Function Dependencies                    │
├─────────────────────────────────────────────────────────────────┤
│ gemini-chat          → profiles, tasks, moments                 │
│ webhook-evolution    → whatsapp_sessions, whatsapp_messages,    │
│                        contact_network, message_queue           │
│ generate-pairing-code → whatsapp_sessions (RPC)                 │
│ chat-with-aica       → profiles, tasks, moments                 │
│ process-edital       → file_search_documents, opportunities     │
│ calculate-health-scores → contact_network, health_score_*      │
│ claim-daily-credits  → user_credits (RPC)                       │
│ stripe-webhook       → user_subscriptions, user_credits         │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Hook → Service Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                      Hook Dependencies                           │
├─────────────────────────────────────────────────────────────────┤
│ useAuth              → supabaseClient                           │
│ usePairingCode       → Edge: generate-pairing-code              │
│ useGoogleCalendarEvents → googleCalendarService,                │
│                          googleCalendarTokenService             │
│ useConsciousnessPoints → consciousnessPointsService            │
│ useUserCredits       → Edge: claim-daily-credits                │
│ useHealthScore       → healthScoreService                       │
│ useNotifications     → Supabase Realtime                        │
│ useInviteSystem      → inviteSystemService                      │
│ useChatMessages      → unifiedChatService, Supabase Realtime    │
│ useFileSearch        → fileSearchApiClient                      │
│ useWhatsAppConnection → useWhatsAppSessionSubscription          │
│ useStudioData        → workspaceDatabaseService, Supabase RT    │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Page → Hook Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                      Page Dependencies                           │
├─────────────────────────────────────────────────────────────────┤
│ Home                 → useAuth, useNavigate                     │
│ AgendaView           → useGoogleCalendarEvents, useTourAutoStart│
│ ConnectionsPage      → useAuth, useConnectionNavigation         │
│ ContactsView         → useAuth, useWhatsAppConnection           │
│ ProfilePage          → useNavigate                              │
│ InviteAcceptPage     → useParams, useNavigate, useAuth          │
│ StudioMainView       → useStudioContext (FSM)                   │
│ JourneyFullScreen    → useMoments, useConsciousnessPoints       │
│ FinanceDashboard     → useFinanceStatements                     │
│ GrantsModuleView     → useDocumentProcessing, useOrganizations  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Common Issues & Debugging Guide

### 7.1 Authentication Issues

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| OAuth redirect fails | Missing URL in Supabase config | Add redirect URL to Supabase Dashboard |
| Session not persisting | Cookie issue on Cloud Run | Verify @supabase/ssr usage |
| Token expired | No auto-refresh | Check googleCalendarTokenService |
| 401 on Edge Function | JWT not passed | Use explicit Authorization header |

### 7.2 WhatsApp Issues

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| Pairing code not generating | Evolution API error | Check EVOLUTION_API_URL/KEY |
| Session status stuck | Webhook not configured | Call configure-instance-webhook |
| Messages not syncing | Realtime not enabled | Enable replication for table |
| Connection drops | Instance restart | Check webhook-evolution logs |

### 7.3 Gemini/AI Issues

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| Rate limit errors | Too many requests | Check check-rate-limit function |
| Empty responses | Model error | Check gemini-chat logs |
| High costs | Wrong model tier | Review modelRouterService |
| Slow responses | No caching | Implement client-side cache |

### 7.4 Database Issues

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| RLS policy error | Missing policy | Check table RLS in Dashboard |
| Query returns empty | Wrong user_id filter | Verify auth.uid() |
| Realtime not working | Replication disabled | Enable in Database settings |
| Migration conflict | Duplicate versions | Rename migration files |

### 7.5 Debugging Commands

```bash
# Check Edge Function logs
npx supabase functions logs <function-name> --tail

# Verify migrations
npx supabase db push --dry-run

# Test database connection
npx supabase db lint

# Check project status
npx supabase status
```

### 7.6 Key Files for Debugging

| Issue Area | Key Files |
|------------|-----------|
| Auth | `src/hooks/useAuth.ts`, `src/services/supabaseClient.ts` |
| WhatsApp | `supabase/functions/webhook-evolution/`, `src/hooks/usePairingCode.ts` |
| AI/Gemini | `supabase/functions/gemini-chat/`, `src/services/edgeFunctionService.ts` |
| Calendar | `src/services/googleCalendarService.ts`, `src/hooks/useGoogleCalendarEvents.ts` |
| Gamification | `src/services/gamificationService.ts`, `src/hooks/useConsciousnessPoints.ts` |
| Routing | `src/router/AppRouter.tsx`, `src/contexts/NavigationContext.tsx` |

---

## Appendix: Quick Reference

### External API Credentials Required

| Service | Environment Variable | Dashboard |
|---------|---------------------|-----------|
| Supabase | VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY | supabase.com |
| Google OAuth | GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET | console.cloud.google.com |
| Evolution API | EVOLUTION_API_URL, EVOLUTION_API_KEY | Evolution Dashboard |
| Gemini | GOOGLE_GEMINI_API_KEY | ai.google.dev |
| Stripe | STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET | stripe.com |
| Resend | RESEND_API_KEY | resend.com |

### Database Table Count by Module

| Module | Table Count | Key Tables |
|--------|-------------|------------|
| Auth | 5 | users, profiles, google_tokens |
| WhatsApp | 8 | whatsapp_sessions, whatsapp_messages, contact_network |
| Journey | 6 | moments, daily_questions, consciousness_stats |
| Gamification | 5 | user_stats, badges, user_achievements |
| Podcast | 6 | podcast_episodes, podcast_topics, guests |
| Grants | 7 | opportunities, organizations, projects |
| Finance | 4 | finance_statements, transactions |
| Connections | 5 | connection_spaces, space_members |

---

**Document Version:** 1.0
**Last Updated:** 2026-01-30
**Generated by:** Claude Code Architecture Explorer
