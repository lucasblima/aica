# Logger Migration Plan - Issue #141

## Status Summary

**Total arquivos com console statements:** 299 (161 .ts + 138 .tsx)
**Ja migrados:** ~5 arquivos (usando createNamespacedLogger)
**Excluir da migracao:** ~35 arquivos (stories, examples, tests)
**Arquivos para migrar:** ~260 arquivos

---

## Padrao de Migracao

### Antes
```typescript
console.log('Message', data);
console.error('Error:', error);
console.warn('Warning');
```

### Depois
```typescript
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('NomeDoModulo');

log.debug('Message', data);  // console.log -> log.debug
log.error('Error:', error);  // console.error -> log.error
log.warn('Warning');         // console.warn -> log.warn
log.info('Info message');    // console.info -> log.info
```

### Regras de Namespace
- Services: `createNamespacedLogger('ServiceName')` - ex: `CalendarSync`, `GamificationService`
- Hooks: `createNamespacedLogger('useHookName')` - ex: `useAuth`, `useFileSearch`
- Components: `createNamespacedLogger('ComponentName')` - ex: `PriorityMatrix`, `AudioRecorder`
- Views: `createNamespacedLogger('ViewName')` - ex: `GrantsModuleView`, `FinanceDashboard`

---

## ARQUIVOS A EXCLUIR (NAO MIGRAR)

### Stories (~10 arquivos)
- [x] `src/modules/connections/components/__stories__/*.stories.tsx`

### Examples (~15 arquivos)
- [x] `*.example.tsx` - Todos os arquivos
- [x] `*.examples.tsx` - Todos os arquivos
- [x] `src/modules/journey/examples/*.tsx`
- [x] `src/modules/connections/FINANCE_INTEGRATION_EXAMPLES.tsx`
- [x] `src/modules/connections/hooks/EXAMPLES.tsx`

### Tests (~3 arquivos)
- [x] `*.test.ts` - Todos os arquivos

### Logger proprio
- [x] `src/lib/logger.ts` - O proprio logger usa console internamente

---

## BATCH 4: STUDIO MODULE (Parcialmente Migrado)

**Agente Delegado:** `podcast-production-copilot`
**Prioridade:** ALTA
**Estimativa:** ~20 arquivos

### Services (8 arquivos)
- [ ] `src/modules/studio/services/workspaceDatabaseService.ts`
- [ ] `src/modules/studio/services/podcastAIService.ts`
- [ ] `src/modules/studio/services/pautaPersistenceService.ts`
- [ ] `src/modules/studio/services/pautaGeneratorService.ts`

### Hooks (6 arquivos)
- [ ] `src/modules/studio/hooks/useWorkspaceState.ts`
- [ ] `src/modules/studio/hooks/useWorkspaceAI.ts`
- [ ] `src/modules/studio/hooks/useStudioData.ts`
- [ ] `src/modules/studio/hooks/useSavedPauta.ts`
- [ ] `src/modules/studio/hooks/usePodcastFileSearch.ts`
- [ ] `src/modules/studio/hooks/useAutoSave.ts`

### Views (5 arquivos)
- [ ] `src/modules/studio/views/StudioWorkspace.tsx`
- [ ] `src/modules/studio/views/StudioWizard.tsx`
- [ ] `src/modules/studio/views/StudioMainView.tsx`
- [ ] `src/modules/studio/views/StudioLibrary.tsx`
- [ ] `src/modules/studio/views/PodcastShowPage.tsx`

### Components (4 arquivos)
- [ ] `src/modules/studio/context/PodcastWorkspaceContext.tsx`
- [ ] `src/modules/studio/components/workspace/SetupStage.tsx`
- [ ] `src/modules/studio/components/workspace/ResearchStage.tsx`
- [ ] `src/modules/studio/components/workspace/PodcastWorkspace.tsx`
- [ ] `src/modules/studio/components/workspace/PautaStage.tsx`
- [ ] `src/modules/studio/components/CreatePodcastDialog.tsx`

---

## BATCH 5A: PODCAST MODULE

**Agente Delegado:** `podcast-production-copilot`
**Prioridade:** ALTA
**Estimativa:** ~8 arquivos

### Services (2 arquivos)
- [ ] `src/modules/podcast/services/guestResearchService.ts`
- [ ] `src/modules/podcast/services/episodeService.ts`

### Views (2 arquivos)
- [ ] `src/modules/podcast/views/PreProductionHub.tsx`
- [ ] `src/modules/podcast/views/GuestApprovalPage.tsx`

### Components (2 arquivos)
- [ ] `src/modules/podcast/components/GuestIdentificationWizard.tsx`
- [ ] `src/modules/podcast/components/GuestApprovalLinkDialog.tsx`

---

## BATCH 5B: GRANTS MODULE

**Agente Delegado:** `general-purpose` (Backend Architect)
**Prioridade:** MEDIA
**Estimativa:** ~30 arquivos

### Services (12 arquivos)
- [ ] `src/modules/grants/services/organizationDocumentService.ts`
- [ ] `src/modules/grants/services/organizationVenturesService.ts`
- [ ] `src/modules/grants/services/documentProcessingService.ts`
- [ ] `src/modules/grants/services/grantService.ts`
- [ ] `src/modules/grants/services/organizationService.ts`
- [ ] `src/modules/grants/services/incentiveLawService.ts`
- [ ] `src/modules/grants/services/grantAIService.ts`
- [ ] `src/modules/grants/services/briefingAIService.ts`
- [ ] `src/modules/grants/services/projectDocumentService.ts`
- [ ] `src/modules/grants/services/pdfService.ts`
- [ ] `src/modules/grants/services/opportunityDocumentService.ts`
- [ ] `src/modules/grants/services/grantTaskSync.ts`
- [ ] `src/modules/grants/services/documentService.ts`

### Hooks (5 arquivos)
- [ ] `src/modules/grants/hooks/useIncentiveLaws.ts`
- [ ] `src/modules/grants/hooks/useSponsorDeck.ts`
- [ ] `src/modules/grants/hooks/useOrganizations.ts`
- [ ] `src/modules/grants/hooks/useWorkspaceState.ts`
- [ ] `src/modules/grants/hooks/useGrantsFileSearch.ts`
- [ ] `src/modules/grants/hooks/useAutoSave.ts`

### Views (1 arquivo)
- [ ] `src/modules/grants/views/GrantsModuleView.tsx`

### Components (12 arquivos)
- [ ] `src/modules/grants/components/EditalSetupWizard.tsx`
- [ ] `src/modules/grants/components/EditalDetailView.tsx`
- [ ] `src/modules/grants/components/documents/LinkConfirmationModal.tsx`
- [ ] `src/modules/grants/components/documents/DocumentUploader.tsx`
- [ ] `src/modules/grants/components/SponsorDeckGenerator.tsx`
- [ ] `src/modules/grants/components/ProspectPipeline.tsx`
- [ ] `src/modules/grants/context/WorkspaceContext.tsx`
- [ ] `src/modules/grants/components/stages/TimelineStage.tsx`
- [ ] `src/modules/grants/components/stages/StructureStage.tsx`
- [ ] `src/modules/grants/components/stages/DocsStage.tsx`
- [ ] `src/modules/grants/components/stages/ContextStage.tsx`
- [ ] `src/modules/grants/components/ProposalGeneratorView.tsx`
- [ ] `src/modules/grants/components/ProjectBriefingView.tsx`
- [ ] `src/modules/grants/components/PdfPreviewModal.tsx`
- [ ] `src/modules/grants/components/FormFieldsEditorModal.tsx`
- [ ] `src/modules/grants/components/FloatingTaskPanel.tsx`
- [ ] `src/modules/grants/components/EditalSetupModal.tsx`
- [ ] `src/modules/grants/components/EditalSearchBar.tsx`
- [ ] `src/modules/grants/components/EditalDocumentSection.tsx`

---

## BATCH 5C: FINANCE MODULE

**Agente Delegado:** `general-purpose` (Backend Architect)
**Prioridade:** MEDIA
**Estimativa:** ~15 arquivos

### Services (7 arquivos)
- [ ] `src/modules/finance/services/financeAgentService.ts`
- [ ] `src/modules/finance/services/statementService.ts`
- [ ] `src/modules/finance/services/statementIndexingService.ts`
- [ ] `src/modules/finance/services/pdfProcessingService.ts`
- [ ] `src/modules/finance/services/financeService.ts`
- [ ] `src/modules/finance/services/csvParserService.ts`

### Hooks (4 arquivos)
- [ ] `src/modules/finance/hooks/useTransactions.ts`
- [ ] `src/modules/finance/hooks/useFinanceStatements.ts`
- [ ] `src/modules/finance/hooks/useFinanceFileSearch.ts`
- [ ] `src/modules/finance/hooks/useFinanceAgent.ts`

### Views (3 arquivos)
- [ ] `src/modules/finance/views/FinanceDashboard.tsx`
- [ ] `src/modules/finance/views/FinanceAgentView.tsx`
- [ ] `src/modules/finance/views/BudgetView.tsx`

### Components (4 arquivos)
- [ ] `src/modules/finance/components/StatementUpload.tsx`
- [ ] `src/modules/finance/components/FinanceSearchPanel.tsx`
- [ ] `src/modules/finance/components/FinanceAgent/AgentChat.tsx`
- [ ] `src/modules/finance/components/CSVUpload.tsx`
- [ ] `src/modules/finance/components/FinanceCard.tsx`

---

## BATCH 5D: JOURNEY MODULE

**Agente Delegado:** `general-purpose` (Frontend Core)
**Prioridade:** MEDIA
**Estimativa:** ~20 arquivos

### Services (8 arquivos)
- [ ] `src/modules/journey/services/weeklySummaryService.ts`
- [ ] `src/modules/journey/services/unifiedTimelineService.ts`
- [ ] `src/modules/journey/services/momentService.ts`
- [ ] `src/modules/journey/services/dailyQuestionService.ts`
- [ ] `src/modules/journey/services/consciousnessPointsService.ts`
- [ ] `src/modules/journey/services/momentPersistenceService.ts`
- [ ] `src/modules/journey/services/aiAnalysisService.ts`
- [ ] `src/modules/journey/services/questionService.ts`
- [ ] `src/modules/journey/services/momentIndexingService.ts`

### Hooks (7 arquivos)
- [ ] `src/modules/journey/hooks/useUnifiedTimeline.ts`
- [ ] `src/modules/journey/hooks/useMoments.ts`
- [ ] `src/modules/journey/hooks/useWeeklySummary.ts`
- [ ] `src/modules/journey/hooks/useJourneyFileSearch.ts`
- [ ] `src/modules/journey/hooks/useDailyQuestionAI.ts`
- [ ] `src/modules/journey/hooks/useDailyQuestion.ts`
- [ ] `src/modules/journey/hooks/useConsciousnessPoints.ts`

### Views (1 arquivo)
- [ ] `src/modules/journey/views/JourneyFullScreen.tsx`

### Components (5 arquivos)
- [ ] `src/modules/journey/components/capture/AudioRecorder.tsx`
- [ ] `src/modules/journey/components/insights/WeeklySummaryCard.tsx`
- [ ] `src/modules/journey/components/insights/DailyQuestionCard.tsx`
- [ ] `src/modules/journey/components/capture/QuickCapture.tsx`
- [ ] `src/modules/journey/components/capture/MomentCapture.tsx`
- [ ] `src/modules/journey/components/JourneySearchPanel.tsx`

---

## BATCH 5E: CONNECTIONS MODULE (Ventures, Academia, Tribo, Habitat)

**Agente Delegado:** `general-purpose` (Frontend Core)
**Prioridade:** MEDIA
**Estimativa:** ~50 arquivos

### Connections Core Services (8 arquivos)
- [ ] `src/modules/connections/services/spaceService.ts`
- [ ] `src/modules/connections/services/reminderService.ts`
- [ ] `src/modules/connections/services/memberService.ts`
- [ ] `src/modules/connections/services/invitationService.ts`
- [ ] `src/modules/connections/services/financeIntegrationService.ts`
- [ ] `src/modules/connections/services/eventService.ts`
- [ ] `src/modules/connections/services/calendarSyncService.ts`
- [ ] `src/modules/connections/services/connectionSpaceService.ts`
- [ ] `src/modules/connections/services/financeIntegration.ts`

### Connections Core Hooks (10 arquivos)
- [ ] `src/modules/connections/hooks/useContactSearch.ts`
- [ ] `src/modules/connections/hooks/useWhatsAppGamification.ts`
- [ ] `src/modules/connections/hooks/useSpaces.ts`
- [ ] `src/modules/connections/hooks/useCalendarSync.ts`
- [ ] `src/modules/connections/hooks/useSpaceMembers.ts`
- [ ] `src/modules/connections/hooks/useSpaceEvents.ts`
- [ ] `src/modules/connections/hooks/useSpace.ts`
- [ ] `src/modules/connections/hooks/useDebouncedSearch.ts`
- [ ] `src/modules/connections/hooks/useConnectionSpaces.ts`
- [ ] `src/modules/connections/hooks/useConnectionMembers.ts`

### Connections Core Views/Components (8 arquivos)
- [ ] `src/modules/connections/views/ConnectionsWhatsAppTab.tsx`
- [ ] `src/modules/connections/views/ConnectionsView.tsx`
- [ ] `src/modules/connections/components/whatsapp/ConnectionStatusCard.tsx`
- [ ] `src/modules/connections/components/whatsapp/PairingCodeDisplay.tsx`
- [ ] `src/modules/connections/components/whatsapp/ConsentManager.tsx`
- [ ] `src/modules/connections/components/SyncToFinanceButton.tsx`
- [ ] `src/modules/connections/components/SplitPaymentTracker.tsx`
- [ ] `src/modules/connections/components/SpaceCalendarSettings.tsx`
- [ ] `src/modules/connections/components/MemberAvatarStack.tsx`
- [ ] `src/modules/connections/components/EventTimelineMini.tsx`
- [ ] `src/modules/connections/components/CreateConnectionModal.tsx`
- [ ] `src/modules/connections/components/CalendarSyncButton.tsx`
- [ ] `src/modules/connections/components/CreateSpaceWizard.tsx`
- [ ] `src/modules/connections/lib/performanceMonitor.ts`

### Ventures (8 arquivos)
- [ ] `src/modules/connections/ventures/services/entityService.ts`
- [ ] `src/modules/connections/ventures/services/stakeholderService.ts`
- [ ] `src/modules/connections/ventures/services/milestoneService.ts`
- [ ] `src/modules/connections/ventures/services/metricsService.ts`
- [ ] `src/modules/connections/ventures/hooks/useStakeholders.ts`
- [ ] `src/modules/connections/ventures/hooks/useMilestones.ts`
- [ ] `src/modules/connections/ventures/hooks/useMetrics.ts`
- [ ] `src/modules/connections/ventures/hooks/useEntity.ts`
- [ ] `src/modules/connections/ventures/views/VenturesHome.tsx`
- [ ] `src/modules/connections/ventures/views/EntityDetail.tsx`

### Academia (8 arquivos)
- [ ] `src/modules/connections/academia/services/noteService.ts`
- [ ] `src/modules/connections/academia/services/mentorshipService.ts`
- [ ] `src/modules/connections/academia/services/journeyService.ts`
- [ ] `src/modules/connections/academia/services/credentialService.ts`
- [ ] `src/modules/connections/academia/hooks/useNotes.ts`
- [ ] `src/modules/connections/academia/hooks/useMentorships.ts`
- [ ] `src/modules/connections/academia/hooks/useJourneys.ts`
- [ ] `src/modules/connections/academia/hooks/useCredentials.ts`
- [ ] `src/modules/connections/academia/views/NotesView.tsx`
- [ ] `src/modules/connections/academia/views/JourneyDetail.tsx`
- [ ] `src/modules/connections/academia/views/AcademiaHome.tsx`
- [ ] `src/modules/connections/academia/components/NoteEditor.tsx`
- [ ] `src/modules/connections/academia/components/MentorshipScheduler.tsx`
- [ ] `src/modules/connections/academia/components/JourneyProgress.tsx`

### Tribo (6 arquivos)
- [ ] `src/modules/connections/tribo/views/ResourcesView.tsx`
- [ ] `src/modules/connections/tribo/components/RitualRSVP.tsx`
- [ ] `src/modules/connections/tribo/components/RitualCard.tsx`
- [ ] `src/modules/connections/tribo/components/PollVoting.tsx`
- [ ] `src/modules/connections/tribo/components/DiscussionThreadOptimized.tsx`
- [ ] `src/modules/connections/tribo/components/DiscussionThread.tsx`
- [ ] `src/modules/connections/tribo/components/BringListEditor.tsx`

### Habitat (3 arquivos)
- [ ] `src/modules/connections/habitat/hooks/useProperty.ts`
- [ ] `src/modules/connections/habitat/hooks/useMaintenance.ts`
- [ ] `src/modules/connections/habitat/hooks/useInventory.ts`
- [ ] `src/modules/connections/habitat/components/MaintenanceCalendarView.tsx`
- [ ] `src/modules/connections/habitat/components/HabitatDashboard.tsx`

---

## BATCH 5F: ONBOARDING MODULE

**Agente Delegado:** `general-purpose` (Frontend Core)
**Prioridade:** BAIXA
**Estimativa:** ~6 arquivos

- [ ] `src/modules/onboarding/services/onboardingService.ts`
- [ ] `src/modules/onboarding/hooks/useOnboarding.ts`
- [ ] `src/modules/onboarding/components/WhatsAppPairingStep.tsx`
- [ ] `src/modules/onboarding/components/ContactsSyncStep.tsx`
- [ ] `src/modules/onboarding/components/PairingCodeDisplay.tsx`
- [ ] `src/modules/onboarding/components/TrailSelectionFlow.tsx`

---

## BATCH 5G: SERVICES GLOBAIS

**Agente Delegado:** `general-purpose` (Backend Architect)
**Prioridade:** ALTA
**Estimativa:** ~40 arquivos

### Core Services (ja parcialmente migrados)
- [ ] `src/services/contactSearchService.ts`
- [ ] `src/services/whatsappService.ts`
- [ ] `src/services/notificationSchedulerService.ts`
- [ ] `src/services/adminWhatsAppService.ts`
- [ ] `src/services/supabaseService.ts`
- [ ] `src/services/podcastProductionService.ts`
- [ ] `src/services/googleCalendarTokenService.ts`
- [ ] `src/services/googleCalendarService.ts`
- [ ] `src/services/googleAuthService.ts`
- [ ] `src/services/fileSearchCacheService.ts`
- [ ] `src/services/fileSearchApiClient.ts`
- [ ] `src/services/dailyReportService.ts`
- [ ] `src/services/contactSyncService.ts`
- [ ] `src/services/supabaseClient.ts`
- [ ] `src/services/pairingCodeService.ts`
- [ ] `src/services/edgeFunctionService.ts`
- [ ] `src/services/unifiedChatService.ts`
- [ ] `src/services/modelRouterService.ts`
- [ ] `src/services/whatsappContactSyncService.ts`
- [ ] `src/services/contactNetworkService.ts`
- [ ] `src/services/taskRecurrenceService.ts`
- [ ] `src/services/googleContactsService.ts`
- [ ] `src/services/userSettingsService.ts`
- [ ] `src/services/recommendationEngine.ts`
- [ ] `src/services/pythonApiService.ts`
- [ ] `src/services/onboardingService.ts`
- [ ] `src/services/notificationService.ts`
- [ ] `src/services/mediaUploadService.ts`
- [ ] `src/services/guestApprovalService.ts`
- [ ] `src/services/geminiMemoryService.ts`
- [ ] `src/services/feedbackLoopService.ts`
- [ ] `src/services/efficiencyService.ts`
- [ ] `src/services/aicaAutoService.ts`
- [ ] `src/services/aiUsageTrackingService.ts`
- [ ] `src/services/aiCostAnalyticsService.ts`

---

## BATCH 5H: HOOKS GLOBAIS

**Agente Delegado:** `general-purpose` (Frontend Core)
**Prioridade:** MEDIA
**Estimativa:** ~15 arquivos

- [x] `src/hooks/useWhatsAppSessionSubscription.ts` (JA MIGRADO)
- [ ] `src/hooks/useWhatsAppContacts.ts`
- [ ] `src/hooks/useUserCredits.ts`
- [ ] `src/hooks/useProcessContact.ts`
- [ ] `src/hooks/useAdminInstanceStats.ts`
- [ ] `src/hooks/useWhatsAppConnection.ts`
- [ ] `src/hooks/useTourAutoStart.ts`
- [ ] `src/hooks/useGoogleCalendarEvents.ts`
- [ ] `src/hooks/useFileSearchAnalytics.ts`
- [ ] `src/hooks/useFileSearch.ts`
- [ ] `src/hooks/useContextSource.ts`
- [ ] `src/hooks/useAuth.ts`

---

## BATCH 5I: COMPONENTS COMPARTILHADOS

**Agente Delegado:** `gamification-engine` (Gamification) + `general-purpose` (UI)
**Prioridade:** MEDIA
**Estimativa:** ~25 arquivos

### Gamification Components (gamification-engine)
- [x] `src/services/gamificationService.ts` (JA MIGRADO)
- [ ] `src/components/features/GamificationWidget.tsx`
- [ ] `src/components/features/AchievementsView.tsx`

### Domain Components (general-purpose)
- [ ] `src/components/domain/PriorityMatrix.tsx`
- [ ] `src/components/domain/TaskCreationQuickAdd.tsx`
- [ ] `src/components/domain/TaskEditModal.tsx`

### Feature Components (general-purpose)
- [ ] `src/components/features/UnifiedChatInterface.tsx`
- [ ] `src/components/features/PomodoroTimer.tsx`
- [ ] `src/components/features/OnboardingWizard.tsx`
- [ ] `src/components/features/ModuleCard.tsx`
- [ ] `src/components/features/LifeWeeksGrid.tsx`
- [ ] `src/components/features/GoogleCalendarConnect.tsx`
- [ ] `src/components/features/EfficiencyTrendChart.tsx`
- [ ] `src/components/features/EfficiencyScoreCard.tsx`
- [ ] `src/components/features/EfficiencyControlPanel.tsx`
- [ ] `src/components/features/DailyTimeline.tsx`
- [ ] `src/components/features/DailySummaryView.tsx`
- [ ] `src/components/features/ContactProfileView.tsx`
- [ ] `src/components/features/ConnectionArchetypes.tsx`

### Layout/UI Components (general-purpose)
- [ ] `src/components/layout/SettingsMenu.tsx`
- [ ] `src/components/layout/HelpButton.tsx`
- [ ] `src/components/guards/AdminGuard.tsx`
- [ ] `src/components/ui/ErrorBoundary.tsx`
- [ ] `src/components/ProfileModal/ProfileModal.tsx`
- [ ] `src/components/EfficiencyFlowCard/EfficiencyFlowCard.tsx`
- [ ] `src/components/documents/DocumentSearch.tsx`
- [ ] `src/components/aiCost/BudgetSettingsModal.tsx`
- [ ] `src/components/aiCost/BudgetMonitor.tsx`
- [ ] `src/components/aiCost/AICostDashboard.tsx`
- [ ] `src/components/admin/AdminMonitoringDashboard.tsx`

---

## BATCH 5J: PAGES, VIEWS, CONTEXTS, UTILS

**Agente Delegado:** `general-purpose` (Frontend Core)
**Prioridade:** BAIXA
**Estimativa:** ~15 arquivos

### Pages
- [ ] `src/pages/ContactsView.tsx`
- [ ] `src/pages/Home.tsx`
- [ ] `src/pages/ConnectionsPage.tsx`
- [ ] `src/pages/ArchetypeListPage.tsx`

### Views
- [ ] `src/views/AgendaView.tsx`
- [ ] `src/views/ProfilePage.tsx`
- [ ] `src/views/PodcastCopilotView.tsx`

### Contexts
- [ ] `src/contexts/TourContext.tsx`

### Router
- [ ] `src/router/AppRouter.tsx`

### Utils
- [ ] `src/utils/cleanupOAuthCookies.ts`
- [ ] `src/utils/authUrlCleaner.ts`

### API
- [ ] `src/api/feedbackAPI.ts`
- [ ] `src/api/journeyAPI.ts`
- [ ] `src/api/recommendationAPI.ts`
- [ ] `src/api/onboardingAPI.ts`
- [ ] `src/api/geminiDeepResearch.ts`

---

## BATCH 5K: LIB E INTEGRATIONS

**Agente Delegado:** `gemini-integration-specialist` (AI) + `general-purpose`
**Prioridade:** BAIXA
**Estimativa:** ~8 arquivos

### Lib
- [ ] `src/lib/supabase/cookieStorageAdapter.ts`
- [ ] `src/lib/haptics.ts`
- [ ] `src/lib/gemini/retry.ts`
- [ ] `src/lib/gemini/client.ts`
- [ ] `src/lib/envCheck.ts`

### Integrations
- [ ] `src/integrations/whisperTranscription.ts`
- [ ] `src/integrations/geminiSentimentAnalysis.ts`

---

## PLANO DE EXECUCAO PARALELA

### FASE 1 - Execucao Simultanea (4 agentes em paralelo)

| Agente | Batch | Arquivos | Tempo Estimado |
|--------|-------|----------|----------------|
| `podcast-production-copilot` | Batch 4 + 5A (Studio + Podcast) | ~28 arquivos | ~45 min |
| `general-purpose` #1 | Batch 5B (Grants) | ~30 arquivos | ~50 min |
| `general-purpose` #2 | Batch 5C + 5D (Finance + Journey) | ~35 arquivos | ~55 min |
| `gamification-engine` | Gamification components | ~3 arquivos | ~10 min |

### FASE 2 - Execucao Simultanea (3 agentes em paralelo)

| Agente | Batch | Arquivos | Tempo Estimado |
|--------|-------|----------|----------------|
| `general-purpose` #1 | Batch 5E (Connections full) | ~50 arquivos | ~80 min |
| `general-purpose` #2 | Batch 5G (Services globais) | ~35 arquivos | ~55 min |
| `general-purpose` #3 | Batch 5H + 5I (Hooks + Components) | ~40 arquivos | ~65 min |

### FASE 3 - Finalizacao (2 agentes em paralelo)

| Agente | Batch | Arquivos | Tempo Estimado |
|--------|-------|----------|----------------|
| `general-purpose` #1 | Batch 5F + 5J (Onboarding + Pages) | ~21 arquivos | ~35 min |
| `gemini-integration-specialist` | Batch 5K (Lib + Integrations) | ~8 arquivos | ~15 min |

### FASE 4 - Verificacao Final

| Task | Comando | Responsavel |
|------|---------|-------------|
| Build check | `npm run build` | `master-architect-planner` |
| Type check | `npm run typecheck` | `master-architect-planner` |
| Lint check | `npm run lint` | `master-architect-planner` |
| Verificar console restantes | `grep -r "console\." src/ --include="*.ts" --include="*.tsx"` | `master-architect-planner` |

---

## COMANDOS PARA CADA AGENTE

### Para podcast-production-copilot:
```
Migrar console statements para logger centralizado nos arquivos de Studio e Podcast.
Padrao: import { createNamespacedLogger } from '@/lib/logger';
Ver task-logger-migration.md Batch 4 e 5A para lista completa.
```

### Para general-purpose (Backend):
```
Migrar console statements para logger centralizado nos arquivos de Services globais e Grants.
Padrao: import { createNamespacedLogger } from '@/lib/logger';
Ver task-logger-migration.md Batch 5B e 5G para lista completa.
```

### Para general-purpose (Frontend):
```
Migrar console statements para logger centralizado nos arquivos de Components, Hooks e Views.
Padrao: import { createNamespacedLogger } from '@/lib/logger';
Ver task-logger-migration.md Batch 5H, 5I, 5J para lista completa.
```

### Para gamification-engine:
```
Migrar console statements para logger centralizado em:
- src/components/features/GamificationWidget.tsx
- src/components/features/AchievementsView.tsx
Padrao: import { createNamespacedLogger } from '@/lib/logger';
```

### Para gemini-integration-specialist:
```
Migrar console statements para logger centralizado em:
- src/lib/gemini/*.ts
- src/integrations/*.ts
Padrao: import { createNamespacedLogger } from '@/lib/logger';
```

---

## CRITERIOS DE ACEITACAO

- [ ] Nenhum `console.log/warn/error` em codigo de producao (exceto logger.ts)
- [ ] Build passa sem erros
- [ ] TypeScript compila sem erros
- [ ] Lint passa (ou apenas warnings aceitaveis)
- [ ] Todos os arquivos usam namespace apropriado
- [ ] Arquivos de example/stories/tests NAO foram modificados

---

## NOTAS IMPORTANTES

1. **NAO MIGRAR** arquivos em `docs/`, `scripts/`, `*.stories.tsx`, `*.example.tsx`, `*.test.ts`
2. **MANTER** `console` dentro de `src/lib/logger.ts` (e o proprio logger)
3. **NAMESPACE** deve refletir o nome do servico/hook/componente
4. **COMMIT** ao final de cada batch com mensagem: `refactor(logger): migrate Batch X - [modulo]`

---

*Gerado por Master Architect & Planner - Issue #141*
