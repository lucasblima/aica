# AICA Life OS - Codebase Digest

> Auto-generated architectural digest for Claude.ai project context.
> Provides type definitions, signatures, and structure without full implementation code.
> Last updated: 2026-03-08

---

## Table of Contents

1. [File Tree](#1-file-tree)
2. [Global Types](#2-global-types)
3. [Module Types](#3-module-types)
4. [Hook Signatures](#4-hook-signatures)
5. [Service Signatures](#5-service-signatures)
6. [Module Service Signatures](#6-module-service-signatures)
7. [Edge Function Index](#7-edge-function-index)
8. [Shared Edge Function Utils](#8-shared-edge-function-utils)
9. [Database Schema Summary](#9-database-schema-summary)

---

## 1. File Tree

### Source Tree (`src/`)

```
src/
├── api/
│   ├── feedbackAPI.ts
│   ├── geminiDeepResearch.ts
│   ├── journeyAPI.ts
│   ├── onboardingAPI.ts
│   └── recommendationAPI.ts
├── components/
│   ├── Accordion.tsx
│   ├── AreaQuickActionModal/
│   ├── ContextCard/
│   ├── EfficiencyFlowCard/
│   ├── FloatingActionButton.advanced.tsx
│   ├── IdentityPassport/
│   ├── ModuleTray/
│   ├── ProfileModal/
│   ├── RecentContactsWidget.tsx
│   ├── RecurrencePicker.tsx
│   ├── SubtaskList.tsx
│   ├── TagInput.tsx
│   ├── VitalStatsTray/
│   ├── admin/
│   │   └── AdminMonitoringDashboard.tsx
│   ├── aiCost/
│   │   ├── AICostDashboard.tsx
│   │   ├── BudgetAlertBanner.tsx
│   │   ├── BudgetMonitor.tsx
│   │   ├── BudgetSettingsDrawer.tsx
│   │   ├── BudgetSettingsModal.tsx
│   │   ├── CostTrendChart.tsx
│   │   ├── ModelBreakdownChart.tsx
│   │   ├── MonthlyCostCard.tsx
│   │   ├── OperationBreakdownChart.tsx
│   │   └── TopExpensiveOperationsTable.tsx
│   ├── auth/
│   │   └── OAuthDiagnostics.tsx
│   ├── coming-soon/
│   │   ├── AIChatPreview.tsx
│   │   ├── ComingSoonGrid.tsx
│   │   ├── ComingSoonModule.tsx
│   │   ├── ModuleCard.tsx
│   │   ├── ModuleHubPage.tsx
│   │   ├── ModulePreviewCard.tsx
│   │   ├── WaitlistButton.tsx
│   │   └── WaitlistCounter.tsx
│   ├── documents/
│   │   ├── DocumentSearch.tsx
│   │   └── FileSearchExample.tsx
│   ├── domain/
│   │   ├── AgendaModeToggle.tsx
│   │   ├── CompletedTasksSection.tsx
│   │   ├── EmptyQuadrantState.tsx
│   │   ├── PriorityMatrix.tsx
│   │   ├── RecurrenceChip.tsx
│   │   ├── SwipeableTaskCard.tsx
│   │   ├── TaskBottomSheet.tsx
│   │   ├── TaskCreationQuickAdd.tsx
│   │   ├── TaskEditDrawer.tsx
│   │   ├── TaskEditModal.tsx
│   │   ├── TaskFilterBar.tsx
│   │   ├── TaskKanbanView.tsx
│   │   └── TaskListView.tsx
│   ├── features/
│   │   ├── AchievementsView.tsx
│   │   ├── AgendaTimeline.tsx
│   │   ├── AicaChatFAB/
│   │   ├── AnalysisResultsPanel.tsx
│   │   ├── BadgeShowcase.tsx
│   │   ├── CalendarSyncIndicator.tsx
│   │   ├── ConnectionArchetypes.tsx
│   │   ├── ConsciousnessPointsDisplay.tsx
│   │   ├── ContactCard.tsx
│   │   ├── ContactCardGrid.tsx
│   │   ├── ContactDetailModal.tsx
│   │   ├── ContactProfileDrawer.tsx
│   │   ├── ContactProfileView.tsx
│   │   ├── CreditBalanceWidget.tsx
│   │   ├── CrossDomainInsights.tsx
│   │   ├── DailySummaryView.tsx
│   │   ├── DailyTimeline.tsx
│   │   ├── DigitalSabbaticalPrompt.tsx
│   │   ├── DomainWeightSliders.tsx
│   │   ├── EfficiencyBreakdown.tsx
│   │   ├── EfficiencyControlPanel.tsx
│   │   ├── EfficiencyMedallion.tsx
│   │   ├── EfficiencyScoreCard.tsx
│   │   ├── EfficiencyTrendChart.tsx
│   │   ├── EthicalGuardrailsBanner.tsx
│   │   ├── ExecutionPlanView/
│   │   ├── ExploreMoreSection.tsx
│   │   ├── GoodhartAlert.tsx
│   │   ├── GoogleCalendarConnect.tsx
│   │   ├── GoogleCalendarEventsList.tsx
│   │   ├── InviteBadge.tsx
│   │   ├── InviteModal.tsx
│   │   ├── InviteShareCard.tsx
│   │   ├── LifeCouncilCard.tsx
│   │   ├── LifeScoreRadar.tsx
│   │   ├── LifeScoreWidget.tsx
│   │   ├── LifeWeeksGrid.tsx
│   │   ├── MementoMoriBar/
│   │   ├── ModuleAgentChat/
│   │   ├── ModuleCard.tsx
│   │   ├── ModulePulse/
│   │   ├── MultiModalInput.tsx
│   │   ├── NextEventHero.tsx
│   │   ├── NextTwoDaysView.tsx
│   │   ├── NotificationBell.tsx
│   │   ├── OnboardingWizard.tsx
│   │   ├── PatternsSummary.tsx
│   │   ├── PomodoroTimer.tsx
│   │   ├── ProcessWithAicaButton.tsx
│   │   ├── ProcessingEstimateModal.tsx
│   │   ├── ScoreCard.tsx
│   │   ├── ScoreExplainer.tsx
│   │   ├── UnifiedJourneyCard.tsx
│   │   ├── VidaChatHero/
│   │   ├── VidaUniversalInput/
│   │   ├── WeatherStrip.tsx
│   │   ├── WeeklyCalendarView.tsx
│   │   └── visualizations/
│   │       ├── BarChartSimple.tsx
│   │       ├── CalendarGrid.tsx
│   │       ├── CircularScore.tsx
│   │       ├── EisenhowerMatrix.tsx
│   │       ├── HeatmapGrid.tsx
│   │       ├── HorizontalTimeline.tsx
│   │       ├── NetworkGraph.tsx
│   │       └── WeeklyBlocks.tsx
│   ├── fileSearch/
│   │   ├── CacheStatsWidget.tsx
│   │   ├── FileSearchAnalyticsDashboard.tsx
│   │   └── FileSearchAnalyticsView.tsx
│   ├── gamification/
│   │   ├── BadgeUnlockModal.tsx
│   │   ├── MilestoneProgressCard.tsx
│   │   └── XPGainPopup.tsx
│   ├── guards/
│   │   ├── ActivationGuard.tsx
│   │   ├── AdminGuard.tsx
│   │   └── AuthGuard.tsx
│   ├── layout/
│   │   ├── AuthSheet.tsx
│   │   ├── BottomNav.tsx
│   │   ├── HeaderGlobal.tsx
│   │   ├── HelpButton.tsx
│   │   ├── Login.tsx
│   │   └── SettingsMenu.tsx
│   └── ui/
│       ├── AIThinkingState.tsx
│       ├── Accordion.tsx
│       ├── AuthLoadingScreen.tsx
│       ├── BentoCard.tsx
│       ├── CalendarStatusDot.tsx
│       ├── CeramicBadge.tsx
│       ├── CeramicErrorState.tsx
│       ├── CeramicFilterTab.tsx
│       ├── CeramicLoadingState.tsx
│       ├── CeramicPillButton.tsx
│       ├── CeramicTabSelector.tsx
│       ├── ConfirmationModal.tsx
│       ├── ContactAvatar.tsx
│       ├── EmptyState.tsx
│       ├── ErrorBoundary.tsx
│       ├── FloatingActionButton.tsx
│       ├── InfoCard.tsx
│       ├── LoadingScreen.tsx
│       ├── Logo.tsx
│       ├── MasonryGrid.tsx
│       ├── MetricRow.tsx
│       ├── NotificationContainer.tsx
│       ├── PageShell.tsx
│       ├── RecurrencePicker.tsx
│       ├── RelationshipScoreBadge.tsx
│       ├── StatCard.tsx
│       ├── StatGrid.tsx
│       ├── SubtaskList.tsx
│       └── TagInput.tsx
├── config/
│   ├── api.ts
│   └── tours/
├── constants/
│   └── quadrantColors.ts
├── contexts/
│   ├── NavigationContext.tsx
│   ├── TourContext.tsx
│   └── XPNotificationContext.tsx
├── data/
│   ├── contextualTrails.ts
│   ├── journeySchemas.ts
│   ├── moduleDefinitions.ts
│   └── pillarData.tsx
├── hooks/
│   ├── queries/
│   │   ├── queryKeys.ts
│   │   ├── useAssociationsQuery.ts
│   │   ├── useDailyAgendaQuery.ts
│   │   ├── useGrantsHomeQuery.ts
│   │   └── useLifeAreasQuery.ts
│   ├── useActivationStatus.ts
│   ├── useAdminCoupons.ts
│   ├── useAuth.ts
│   ├── useBilling.ts
│   ├── useBrasilApi.ts
│   ├── useCalendarSync.ts
│   ├── useCardSelection.ts
│   ├── useChatContextData.ts
│   ├── useChatSession.ts
│   ├── useConsciousnessPoints.ts
│   ├── useContactAppearances.ts
│   ├── useContactsAtRisk.ts
│   ├── useContextCache.ts
│   ├── useContextSource.ts
│   ├── useContextualCTAs.ts
│   ├── useConversationSummary.ts
│   ├── useCouponRedemption.ts
│   ├── useCrossModuleIntelligence.ts
│   ├── useDebounce.ts
│   ├── useDriveIntegration.ts
│   ├── useExecutionPlan.ts
│   ├── useFileSearch.ts
│   ├── useFileSearchAnalytics.ts
│   ├── useFileSearchV2.ts
│   ├── useGmailIntegration.ts
│   ├── useGoogleAuth.ts
│   ├── useGoogleCalendarEvents.ts
│   ├── useGoogleScopes.ts
│   ├── useGroundedSearch.ts
│   ├── useHealthScore.ts
│   ├── useHolidays.ts
│   ├── useInteractionGuard.ts
│   ├── useInviteSystem.ts
│   ├── useLifeCouncil.ts
│   ├── useLifeScore.ts
│   ├── useMediaQuery.ts
│   ├── useMediaUpload.ts
│   ├── useModuleAgent.ts
│   ├── useModuleChatSession.ts
│   ├── useModuleGoogleContext.ts
│   ├── useModuleRegistry.ts
│   ├── useNotifications.ts
│   ├── usePlatformContact.ts
│   ├── useProcessContact.ts
│   ├── useScientificScore.ts
│   ├── useSpeechRecognition.ts
│   ├── useStreakTrend.ts
│   ├── useTaskCompletion.ts
│   ├── useTaskFilters.ts
│   ├── useTemperature.ts
│   ├── useTourAutoStart.ts
│   ├── useUserBirthdate.ts
│   ├── useUserCredits.ts
│   ├── useUserLocation.ts
│   ├── useUserPatterns.ts
│   ├── useUserPlan.ts
│   ├── useUserRole.ts
│   ├── useUserStats.ts
│   ├── useVoiceRecorder.ts
│   ├── useWaitlist.ts
│   └── useWeatherInsight.ts
├── integrations/
│   ├── geminiSentimentAnalysis.ts
│   └── journeyIntegration.tsx
├── lib/
│   ├── agents/
│   │   ├── formatAgentName.ts
│   │   ├── intentClassifier.ts
│   │   ├── prompts/ (atlas, agenda, captacao, connections, coordinator, finance, flux, journey, studio)
│   │   ├── trustLevel.ts
│   │   └── types.ts
│   ├── animations/
│   │   └── ceramic-motion.ts
│   ├── dateUtils.ts
│   ├── envCheck.ts
│   ├── external-api/
│   │   ├── client.ts
│   │   └── types.ts
│   ├── formatMarkdown.ts
│   ├── gemini/
│   │   ├── client.ts
│   │   ├── models.ts
│   │   ├── pricing.ts
│   │   ├── retry.ts
│   │   └── types.ts
│   ├── haptics.ts
│   ├── logger.ts
│   ├── supabase/
│   │   └── cookieStorageAdapter.ts
│   └── utils.ts
├── modules/
│   ├── atlas/
│   │   ├── components/ (CognitiveLoadBadge, FlowZoneIndicator, HolidayBadge, LocationConnectModal, PlanningFallacyCorrection, WeatherInsightCard)
│   │   ├── hooks/ (useCognitiveProfile, useFlowZone, useTaskScoring)
│   │   └── services/ (atlasAIService, atlasScoring)
│   ├── billing/
│   │   ├── components/ (PixPaymentModal, PlanCard, UsageStatsCard, simulator/)
│   │   └── pages/ (AdminCouponsPage, AdminPortalPage, ManageSubscriptionPage, PricingPage, PricingSimulatorPage, UsageDashboardPage)
│   ├── connections/
│   │   ├── components/ (AddMemberSheet, ContactFilters, ContactSearchBar, CreateSpaceDrawer, CreateSpaceModal, DunbarLayerMap, IntentTimelineCard, NetworkHealthDashboard, SpaceCard, TieStrengthBadge, WhatsAppContactCard, WhatsAppContactList, health-score/, telegram/, whatsapp/)
│   │   ├── hooks/ (useConnectionNavigation, useConnectionSpaces, useContactDossier, useContactFilters, useContactIntelligence, useContactSearch, useConversationThreads, useDunbarLayers, useExtractedEntities, useIntentTimeline, useNetworkMetrics, useRelationshipScore, useSpace, useSpaceMembers, useTelegramLink, useWhatsAppGamification, useWhatsAppImport)
│   │   ├── services/ (connectionSpaceService, financeIntegration, invitationService, memberService, networkScoring, spaceService)
│   │   ├── types/ (index.ts, intent.ts, import.ts)
│   │   └── views/ (ConnectionsView, ConnectionsWhatsAppTab, SpaceDetailView)
│   ├── eraforge/
│   │   ├── components/ (EF_AdvisorPanel, EF_GameScreen, EF_HomeScreen, EF_NavHeader, EF_OnboardingScreen, EF_ParentDashboard, EF_SceneRenderer, EF_SimulationScreen, EF_StatsBar, EF_TurnCounter, EF_VoiceWave, EraForgeAccessGuard, scenes/)
│   │   ├── contexts/ (EraforgeGameContext, EraforgeVoiceContext)
│   │   ├── hooks/ (useEraforgeAccess, useEraforgeGame, useEraforgeTurns, useEraforgeVoice)
│   │   ├── services/ (eraforgeAIService, eraforgeAccessService, eraforgeGameService, eraforgeVoiceService)
│   │   ├── types/ (eraforge.types.ts)
│   │   └── views/ (EraForgeLandingView, EraForgeMainView)
│   ├── finance/
│   │   ├── components/ (AccountManagement, AccountSelector, CSVUpload, Charts/, FinanceCard, FinanceEmptyState, FinanceNotificationCard, FinanceSearchPanel, FinancialHealthCard, GoalForm, GoalTracker, LossFramingBanner, MonthComparisonView, MonthlyDigestCard, RecategorizationReview, RecategorizeModal, SavingsGoalProjection, StatementUpload, TransactionListView)
│   │   ├── hooks/ (useFinanceFileSearch, useFinanceStatements, useFinancialHealth, useLossFraming, useTransactions)
│   │   ├── services/ (accountService, budgetService, csvParserService, exportService, financeAgentService, financeDigestService, financeService, financialHealthScoring, pdfProcessingService, statementService)
│   │   ├── types/ (index.ts)
│   │   └── views/ (BudgetView, FinanceDashboard)
│   ├── flux/
│   │   ├── components/ (AlertBadge, AthleteCard, AthleteWelcome, AutomationTester, CreateAssessoriaModal, DraggableTemplate, DroppableCell, FatigueRiskBadge, FluxCard, LevelBadge, MicrocycleProgressBar, ProgressionBar, ReadinessGauge, ScheduleWhatsAppModal, ScheduledWorkoutStatus, SlotCard, TrainingLoadChart, WhatsAppMessageModal, athlete/, canvas/, profile/)
│   │   ├── hooks/ (useAthleteStatus, useAutomationEngine, useCanvasEditor, useCoachAvailability, useExerciseSearch, useFatigueModeling, useFluxAlerts, useFluxCalendar, useFluxScheduler, useLevelingEngine, useMicrocycle, useParQ, usePerformanceTests, useWorkoutTemplates)
│   │   ├── services/ (assessoriaService, athleteDocumentService, athleteProfileService, athleteService, automationEngineService, automationService, exerciseService, fatigueModeling, fluxAIService, fluxAtlasBridge, fluxJourneyBridge, fluxWhatsAppService, intensityCalculatorService, levelingEngineService, microcycleService, parqService, performanceTestService, workoutSlotService, workoutTemplateService)
│   │   ├── types/ (index.ts → flux.ts, flow.ts, zones.ts, parq.ts)
│   │   └── views/ (FluxLanding, CoachDashboard, AthleteDashboard, CanvasEditorView, AthleteProfileView, ExerciseLibraryView)
│   ├── google-hub/
│   │   ├── components/ (DriveFileList, DriveFileSearch, EmailCategorizedView, EmailContextCard, GmailInbox, GoogleHubLayout, ResourceLinksManager)
│   │   └── services/ (emailIntelligenceService)
│   ├── grants/
│   │   ├── components/ (BriefingAIAssist, EditalViewer, GrantForm, GrantOverviewCard, GrantProjectCard, GrantResponseForm, GrantTimeline, GrantWizard, OpportunityDocuments, OrganizationDocumentUpload, OrganizationForm, OrganizationList, ProjectDocuments, ProjectSourceUpload, ProspectPipeline, SponsorDeckGenerator, SponsorTierEditor, TRLAssessment)
│   │   ├── hooks/ (useEditalSearch, useGrantDocuments, useGrantProjects, useGrantTasks, useIncentiveLaws, useOpportunityDocuments, useOrganizationDocuments, useOrganizations, useProspectPipeline, useSponsorDeck, useSponsorshipTiers, useTRLAssessment)
│   │   ├── services/ (briefingAIService, documentProcessingService, documentService, editalIndexingService, fileSearchDocumentService, grantAIService, grantService, grantTaskGenerator, grantTaskSync, incentiveLawService, opportunityDocumentService, organizationDocumentService, organizationService, organizationVenturesService, presentationContentGenerator, presentationContentSchemas, presentationPrompts, presentationRAGService, projectDocumentService, prospectService, researcherScoring, sponsorshipService)
│   │   ├── types/ (index.ts, organizations.ts, sponsorship.ts, sponsorDeck.ts, prospect.ts, wizard.ts, presentationRAG.ts)
│   │   └── views/ (GrantsHomePage, GrantProjectDetailPage, ProspectPage, SponsorDeckPage)
│   ├── journey/
│   │   ├── components/ (CPLeaderboard, ConsciousnessChart, DailyQuestionCard, EmotionSelector, InterviewerView, JourneyTimeline, MomentCard, MomentForm, QualityBadge, WeeklySummaryCard)
│   │   ├── hooks/ (useDailyQuestion, useInterviewer, useJourneyHeatmap, useJourneyStats, useMomentForm, useMoments, useWeeklySummary)
│   │   ├── services/ (aiAnalysisService, assessmentInstruments, consciousnessPointsService, dailyQuestionService, interviewerService, momentIndexingService, momentPersistenceService, momentService, qualityEvaluationService, questionGenerationService, questionService, unifiedTimelineService, weeklySummaryService)
│   │   ├── types/ (index.ts → moment.ts, sentiment.ts, weeklySummary.ts, consciousnessPoints.ts, dailyQuestion.ts, interviewer.ts)
│   │   └── views/ (JourneyDashboard, JourneyCapturePage)
│   ├── liferpg/
│   │   ├── components/ (EntityCard, EntityProfileView, InventoryGrid, QuestBoard, QuestCard, WorldMap)
│   │   ├── hooks/ (useEntityAgent, useInventory, useLifeRPG, useQuests)
│   │   ├── services/ (autoPersonaService, entityAgentService, featureUnlockService, inventoryService, inventorySuggestService, questEngineService)
│   │   ├── types/ (index.ts)
│   │   └── views/ (LifeRPGDashboard)
│   ├── onboarding/
│   │   ├── components/ (OnboardingFlow, ContextualTrailCard, ModuleRecommendationCard)
│   │   └── services/ (onboardingService)
│   ├── podcast/
│   │   ├── services/ (episodeService, guestResearchService)
│   │   └── types/
│   └── studio/
│       ├── components/ (AudioLivePanel, CreativeHub, DossierSection, EpisodeCard, EpisodeDetail, EpisodeWorkspace, GuestResearchPanel, PautaEditor, PautaOutlineView, PodcastDashboard, ScoreGuestModal, ShowForm, TeleprompterView, TopicBoard, TranscriptViewer, WriteAssistPanel)
│       ├── hooks/ (useCreativeHub, useDossier, useEpisodeForm, useEpisodes, useGeminiLive, usePautaGenerator, usePautaPersistence, useShowForm, useStudioAnalytics, useStudioFileSearch, useWriteAssist)
│       ├── services/ (geminiLiveAudioService, geminiLiveService, guestScoring, pautaGeneratorService, pautaPersistenceService, podcastAIService, workspaceDatabaseService)
│       ├── types/ (index.ts → studio.ts, podcast.ts, podcast-workspace.ts, research.ts)
│       └── views/ (StudioHomePage, StudioWorkspacePage)
├── pages/
│   ├── AgendaPage.tsx
│   ├── AicaVideoView.tsx
│   ├── AtlasPage.tsx
│   ├── ConnectionsPage.tsx
│   ├── EraForgePage.tsx
│   ├── FinancePage.tsx
│   ├── FluxPage.tsx
│   ├── GoogleHubPage.tsx
│   ├── GrantsPage.tsx
│   ├── HomePage.tsx
│   ├── Index.tsx
│   ├── JourneyPage.tsx
│   ├── LifeRPGPage.tsx
│   ├── NotFoundPage.tsx
│   ├── StatusPage.tsx
│   └── StudioPage.tsx
├── services/
│   ├── scoring/
│   │   ├── types.ts
│   │   ├── scoringEngine.ts
│   │   ├── lifeScoreService.ts
│   │   ├── spiralDetectionService.ts
│   │   ├── goodhartDetectionService.ts
│   │   ├── correlationAnalysisService.ts
│   │   └── sabbaticalService.ts
│   ├── aiCostAnalyticsService.ts
│   ├── aiUsageTrackingService.ts
│   ├── aicaAutoService.ts
│   ├── audioService.ts
│   ├── authCacheService.ts
│   ├── badgeEvaluationService.ts
│   ├── billingService.ts
│   ├── brasilApiService.ts
│   ├── calendarSyncService.ts
│   ├── calendarSyncTransforms.ts
│   ├── chatActionService.ts
│   ├── chatService.ts
│   ├── chatStreamService.ts
│   ├── consciousnessPointsService.ts
│   ├── contactNetworkService.ts
│   ├── contactSearchService.ts
│   ├── contactSyncService.ts
│   ├── couponService.ts
│   ├── dailyReportService.ts
│   ├── driveService.ts
│   ├── edgeFunctionService.ts
│   ├── efficiencyService.ts
│   ├── feedbackLoopService.ts
│   ├── fileSearchApiClient.ts
│   ├── fileSearchCacheService.ts
│   ├── gamificationService.ts
│   ├── geminiMemoryService.ts
│   ├── geolocationService.ts
│   ├── gmailService.ts
│   ├── gmailSummarizeService.ts
│   ├── googleAuthService.ts
│   ├── googleCalendarService.ts
│   ├── googleCalendarTokenService.ts
│   ├── googleCalendarWriteService.ts
│   ├── googleContactsService.ts
│   ├── googleContextService.ts
│   ├── guestApprovalService.ts
│   ├── healthScoreService.ts
│   ├── holidayService.ts
│   ├── inviteSystemService.ts
│   ├── journeyService.ts
│   ├── journeyValidator.ts
│   ├── mediaUploadService.ts
│   ├── modelRouterService.ts
│   ├── notificationService.ts
│   ├── onboardingService.ts
│   ├── platformContactService.ts
│   ├── podcastProductionService.ts
│   ├── recommendationEngine.ts
│   ├── secureFileSearchService.ts
│   ├── streakRecoveryService.ts
│   ├── supabaseClient.ts
│   ├── supabaseService.ts
│   ├── taskExtractionService.ts
│   ├── taskRecurrenceService.ts
│   ├── turnstileService.ts
│   ├── unifiedEfficiencyService.ts
│   ├── universalInputService.ts
│   ├── userAIContextService.ts
│   ├── userSettingsService.ts
│   ├── waitlistService.ts
│   ├── weatherService.ts
│   └── whatsappAnalyticsService.ts
└── types/
    ├── index.ts
    ├── aiCost.ts
    ├── badges.ts
    ├── chatActions.ts
    ├── consciousnessPoints.ts
    ├── fileSearch.ts
    ├── healthScore.ts
    ├── journeySchemas.ts
    ├── memoryTypes.ts
    ├── onboardingTypes.ts
    ├── recipe.ts
    ├── recommendationTypes.ts
    ├── streakTrend.ts
    ├── unifiedEfficiency.ts
    └── whatsapp.ts
```

### Supabase Tree

```
supabase/
├── functions/
│   ├── _shared/
│   │   ├── channel-adapter.ts
│   │   ├── channel-registry.ts
│   │   ├── cors.ts
│   │   ├── external-api.ts
│   │   ├── google-token-manager.ts
│   │   ├── health-tracker.ts
│   │   ├── logger.ts
│   │   ├── model-router.ts
│   │   ├── telegram-adapter.ts
│   │   ├── telegram-ai-router.ts
│   │   ├── whatsapp-document-processor.ts
│   │   ├── whatsapp-export-parser.ts
│   │   └── whatsapp-media-handler.ts
│   ├── agent-proxy/
│   ├── asaas-webhook/
│   ├── assess-athlete-fatigue/
│   ├── atlas-task-intelligence/
│   ├── build-contact-dossier/
│   ├── build-conversation-threads/
│   ├── build-user-profile/
│   ├── calculate-entity-decay/
│   ├── check-rate-limit/
│   ├── claim-daily-credits/
│   ├── compute-atlas-scores/
│   ├── compute-cross-module-intelligence/
│   ├── compute-financial-health/
│   ├── compute-life-score/
│   ├── compute-network-scores/
│   ├── compute-researcher-profile/
│   ├── compute-wellbeing-scores/
│   ├── context-cache/
│   ├── create-asaas-checkout/
│   ├── credential-health-check/
│   ├── deep-research/
│   ├── drive-proxy/
│   ├── email-intelligence/
│   ├── entity-agent-chat/
│   ├── eraforge-gamemaster/
│   ├── eraforge-tts/
│   ├── estimate-processing-cost/
│   ├── external-brasil/
│   ├── external-geolocation/
│   ├── external-holidays/
│   ├── external-turnstile-verify/
│   ├── external-weather/
│   ├── extract-intent/
│   ├── fetch-athlete-calendar/
│   ├── fetch-coach-availability/
│   ├── file-search-corpus/
│   ├── file-search-v2/
│   ├── file-search/
│   ├── finance-monthly-digest/
│   ├── flux-training-analysis/
│   ├── gemini-chat/
│   ├── gemini-live-token/
│   ├── gemini-live/
│   ├── generate-contact-embeddings/
│   ├── generate-entity-quests/
│   ├── generate-presentation-pdf/
│   ├── generate-questions/
│   ├── generate-sponsor-deck/
│   ├── github-roadmap/
│   ├── gmail-proxy/
│   ├── gmail-summarize/
│   ├── google-contextual-search/
│   ├── ingest-whatsapp-export/
│   ├── manage-asaas-subscription/
│   ├── module-preview-chat/
│   ├── notification-scheduler/
│   ├── oauth-token-refresh/
│   ├── plan-and-execute/
│   ├── proactive-trigger/
│   ├── process-action-queue/
│   ├── process-contact-analysis/
│   ├── process-document/
│   ├── process-edital/
│   ├── process-interview-response/
│   ├── process-message-queue/
│   ├── process-module-notifications/
│   ├── process-workout-automations/
│   ├── query-edital/
│   ├── reanalyze-moments/
│   ├── receive-email-import/
│   ├── route-entities-to-modules/
│   ├── run-life-council/
│   ├── score-guest-candidate/
│   ├── search-contacts/
│   ├── search-documents/
│   ├── send-athlete-invite/
│   ├── send-guest-approval-link/
│   ├── send-invitation-email/
│   ├── send-module-invite/
│   ├── stripe-webhook/
│   ├── studio-analytics-insights/
│   ├── studio-clip-extract/
│   ├── studio-deep-research/
│   ├── studio-enrich-card/
│   ├── studio-extract-quotes/
│   ├── studio-file-search/
│   ├── studio-gap-analysis/
│   ├── studio-generate-captions/
│   ├── studio-outline/
│   ├── studio-show-notes/
│   ├── studio-transcribe/
│   ├── studio-write-assist/
│   ├── suggest-inventory-items/
│   ├── sync-workout-calendar/
│   ├── synthesize-user-patterns/
│   ├── telegram-mini-app-auth/
│   ├── telegram-send-notification/
│   └── telegram-webhook/
└── migrations/ (~200 SQL migration files, 2024-12 through 2026-03)
```

---

## 2. Global Types

### `src/types/index.ts` - Core Task Type

```typescript
export interface Task {
  id: string;
  user_id?: string;
  title: string;
  description?: string | null;
  status?: string;
  priority?: string;
  is_urgent?: boolean;
  is_important?: boolean;
  due_date?: string | null;
  scheduled_time?: string | null;
  estimated_duration?: number | null;
  archived?: boolean;
  created_at?: string;
  updated_at?: string;
  parent_task_id?: string | null;
  task_type?: 'task' | 'list' | 'event';
  checklist?: Array<{ text: string; done: boolean }> | null;
  completed_at?: string | null;
  priority_quadrant?: Quadrant | null;
  associations?: { name: string } | null;
  recurrence_rule?: string | null;
  tags?: string[] | null;
}

export type Quadrant = 'urgent-important' | 'important' | 'urgent' | 'low';
```

### `src/types/aiCost.ts` - AI Cost Analytics

```typescript
export type AIOperationType = string;
export type ModuleType = 'grants' | 'journey' | 'podcast' | 'finance' | 'atlas' | 'chat' | 'connections' | 'flux' | 'studio';
export type AlertLevel = 'ok' | 'warning' | 'critical' | 'danger' | 'none';

export interface AIUsageRecord {
  id: string;
  user_id: string;
  action: string;
  model_used: string;
  module?: string;
  tokens_input: number;
  tokens_output: number;
  cost_brl: number;
  credits_used: number;
  credit_deducted?: boolean;
  created_at: string;
}

export interface CostByOperation {
  action: string;
  model: string;
  total_requests: number;
  total_tokens: number;
  total_cost_brl: number;
  total_credits: number;
}

export interface DailyCostSummary {
  date: string;
  total_cost_brl: number;
  total_credits: number;
  total_requests: number;
}

export interface ModelCostBreakdown {
  ai_model: string;
  total_requests: number;
  total_cost_brl: number;
  total_credits: number;
  percentage: number;
}

export interface OperationCostBreakdown {
  operation_type: string;
  total_cost_brl: number;
  total_credits: number;
  percentage: number;
  count: number;
}

export interface MonthlyCostSummary {
  current_month_cost: number;
  budget: number;
  percentage_used: number;
  days_remaining: number;
  projected_month_end_cost: number;
  is_over_budget: boolean;
  credits_used: number;
  credits_total: number;
  credits_percentage: number;
  plan_name: string;
}

export interface CreditSummary {
  used: number;
  total: number;
  percentage: number;
  plan_name: string;
}

export interface BudgetAlert {
  level: AlertLevel;
  message: string;
  percentage: number;
}

export interface UserAIBudget {
  monthly_ai_budget_brl: number;
  created_at?: string;
  updated_at?: string;
}

export const ACTION_CREDIT_COSTS: Record<string, number> = {
  // 1 credit -- lightweight
  analyze_moment_sentiment: 1, evaluate_quality: 1, generate_daily_question: 1,
  route_entities_to_modules: 1, text_embedding: 1, classify_intent: 1,
  chat: 1, chat_aica: 1, analyze_moment: 1, generate_tags: 1,
  chat_aica_stream: 1, transcribe_audio: 1, analyze_content_realtime: 1,
  extract_task_from_voice: 1, generate_post_capture_insight: 1,
  chat_with_agent: 1, atlas_suggest: 1,
  // 2 credits -- moderate
  build_conversation_threads: 2, whatsapp_sentiment: 2, generate_report: 2,
  generate_briefing: 2, generate_field_content: 2, generate_ice_breakers: 2,
  build_profile: 2, interview_extract_insights: 2, generate_interview_followup: 2,
  atlas_prioritize: 2, atlas_breakdown: 2,
  // 3 credits -- heavy
  build_contact_dossier: 3, research_guest: 3, generate_pauta_outline: 3,
  pattern_synthesis: 3, generate_dossier: 3, generate_pauta_questions: 3,
  plan_and_execute: 3,
  // 5 credits -- very heavy
  life_council: 5, generate_weekly_summary: 5,
  // 8 credits -- PDF parsing
  parse_statement: 8,
};

// Utility functions:
export function getActionCreditCost(action: string): number;
export function getOperationLabel(actionType: string): string;
export function getOperationColor(actionType: string): string;
export function getModelLabel(model: string): string;
export function formatCredits(n: number): string;
export function formatBRL(amount: number): string;
export function formatPercentage(value: number): string;
export function getAlertLevelFromPercentage(percentage: number): AlertLevel;
export function getAlertMessage(level: AlertLevel, percentage: number): string;
```

### `src/types/chatActions.ts` - Chat Action Buttons

```typescript
export type ChatActionType =
  | 'complete_task' | 'start_task' | 'update_priority'
  | 'reschedule_task' | 'create_moment' | 'create_task' | 'create_tasks';

export interface ChatAction {
  id: string;
  type: ChatActionType;
  label: string;
  icon: string;
  module: 'atlas' | 'journey' | 'agenda';
  params: Record<string, string | number | boolean>;
}

export type ChatActionStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ChatActionState {
  action: ChatAction;
  status: ChatActionStatus;
  errorMessage?: string;
}
```

### `src/types/consciousnessPoints.ts` - CP System

```typescript
export type CPCategory = 'presence' | 'reflection' | 'connection' | 'intention' | 'growth';

export interface CPTransaction {
  id: string;
  user_id: string;
  amount: number;
  category: CPCategory;
  source: string;
  description: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface CPBalance {
  user_id: string;
  total_cp: number;
  current_cp: number;
  lifetime_cp: number;
  cp_by_category: Record<CPCategory, number>;
  cp_earned_today: number;
  cp_earned_this_week: number;
  cp_earned_this_month: number;
  last_earned_at: string | null;
  updated_at: string;
}

export interface CPReward {
  id: string;
  name: string;
  description: string;
  category: CPCategory;
  amount: number;
  conditions?: string;
  cooldown_hours?: number;
  max_daily?: number;
}

export interface CPConfig {
  dailyCap: number;
  streakMultiplierBase: number;
  maxStreakMultiplier: number;
  weeklyBonusEnabled: boolean;
  weeklyBonusAmount: number;
  weeklyBonusMinDays: number;
}

export const CP_REWARDS: Record<string, CPReward>; // ~20 reward definitions
export const DEFAULT_CP_CONFIG: CPConfig;
export const DEFAULT_CP_BALANCE: CPBalance;

// Helper functions:
export function getCPReward(rewardId: string): CPReward | undefined;
export function getCPRewardsByCategory(category: CPCategory): CPReward[];
export function calculateStreakMultiplier(trendPercentage: number, config?: CPConfig): number;
export function applyDailyCap(currentDailyTotal: number, newAmount: number, config?: CPConfig): number;
export function formatCP(cp: number): string;
export function getCPCategoryDisplayName(category: CPCategory): string;
export function getCPCategoryColor(category: CPCategory): string;
export function getCPCategoryIcon(category: CPCategory): string;
```

### `src/types/healthScore.ts` - Relationship Health Scoring

```typescript
export type HealthScoreTrend = 'improving' | 'stable' | 'declining' | 'new';
export type RiskLevel = 'critical' | 'high' | 'moderate' | 'healthy';
export type HealthAlertType = 'score_critical' | 'score_low' | 'rapid_decline' | 'no_interaction' | 'sentiment_negative';
export type CalculationMethod = 'automated' | 'manual' | 'migration';

export interface HealthScoreComponents {
  frequency_score: number;   // 0-25
  recency_score: number;     // 0-25
  sentiment_score: number;   // 0-20
  reciprocity_score: number; // 0-15
  depth_score: number;       // 0-15
  total_score: number;       // 0-100
  messages_analyzed: number;
  days_since_last_message: number;
  calculated_at: string;
}

export interface HealthScoreHistory {
  id: string;
  contact_id: string;
  user_id: string;
  score: number;
  components: HealthScoreComponents;
  previous_score: number | null;
  score_delta: number | null;
  trend: HealthScoreTrend;
  alert_generated: boolean;
  alert_type: HealthAlertType | null;
  calculation_method: CalculationMethod;
  messages_analyzed: number;
  calculated_at: string;
  created_at: string;
}

export interface ContactWithHealthScore {
  id: string; user_id: string; name: string | null;
  phone_number: string | null; profile_picture_url: string | null;
  relationship_type: string | null; health_score: number | null;
  health_score_components: HealthScoreComponents | null;
  health_score_trend: HealthScoreTrend | null;
  health_score_updated_at: string | null; last_contact_at: string | null;
}

export interface ContactAtRisk {
  contact_id: string; user_id: string; contact_name: string;
  phone_number: string | null; profile_picture_url: string | null;
  relationship_type: string | null; health_score: number;
  health_score_trend: HealthScoreTrend | null;
  health_score_components: HealthScoreComponents | null;
  risk_level: RiskLevel; days_inactive: number;
}

export interface HealthScoreStats {
  totalContacts: number; healthyContacts: number;
  atRiskContacts: number; criticalContacts: number;
  averageScore: number; improvedContacts: number;
  decliningContacts: number; lastCalculatedAt: string | null;
}

export interface HealthScoreAlert {
  id: string; contact_id: string; contact_name: string;
  alert_type: HealthAlertType; score: number;
  previous_score: number | null; score_delta: number | null;
  created_at: string; acknowledged: boolean; acknowledged_at: string | null;
}

// Helper functions:
export function getRiskLevel(score: number): RiskLevel;
export function getRiskColor(level: RiskLevel): string;
export function getHealthScoreColor(score: number): string;
export function getTrendIcon(trend: HealthScoreTrend): string;
export function getAlertMessage(alertType: HealthAlertType): string;
```

### `src/types/whatsapp.ts` - WhatsApp Integration

```typescript
export type MessageDirection = 'incoming' | 'outgoing';
export type MessageType = 'text' | 'audio' | 'image' | 'video' | 'document' | 'sticker' | 'location' | 'contact' | 'reaction';
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
export type SentimentLabel = 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';

export interface WhatsAppMessage {
  id: string; user_id: string; instance_name: string; message_id: string;
  remote_jid: string; contact_name: string | null; contact_phone: string;
  direction: MessageDirection; message_type: MessageType;
  content_text: string | null; content_transcription: string | null;
  content_ocr: string | null; media_url: string | null;
  sentiment_score: number | null; sentiment_label: SentimentLabel | null;
  detected_intent: string | null; detected_topics: string[] | null;
  processing_status: ProcessingStatus; message_timestamp: string;
  created_at: string; updated_at: string;
}

export interface WhatsAppConversation {
  id: string; user_id: string; contact_phone: string; contact_name: string | null;
  total_messages: number; messages_incoming: number; messages_outgoing: number;
  average_sentiment: number | null; last_message_at: string | null;
}

// Notification types
export type NotificationType = 'reminder' | 'daily_report' | 'weekly_summary' | 'custom' | 'system' | 'follow_up';
export type NotificationStatus = 'scheduled' | 'queued' | 'sending' | 'sent' | 'failed' | 'cancelled' | 'expired';
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'weekdays' | 'weekends' | 'custom';

export interface ScheduledNotification { /* 20+ fields for scheduling, recurrence, status */ }

// LGPD Consent types
export type ConsentType = 'data_collection' | 'ai_processing' | 'sentiment_analysis' | 'notifications' | 'data_retention' | 'third_party_sharing';
export type ConsentStatus = 'granted' | 'revoked' | 'pending';
export interface ConsentRecord { /* LGPD consent tracking fields */ }
export interface DataDeletionRequest { /* LGPD data deletion request fields */ }

// Connection/Media/Webhook types
export interface WhatsAppConnectionStatus { isConnected: boolean; state: ConnectionState; instanceName: string; /* ... */ }
export interface MediaMetadata { /* media file tracking fields */ }
export interface EvolutionWebhookPayload { event: string; instance: string; data: Record<string, unknown>; }
export interface WebhookMessageData { key: { remoteJid: string; fromMe: boolean; id: string; }; /* ... */ }
export interface PaginatedResponse<T> { data: T[]; total: number; limit: number; offset: number; hasMore: boolean; }
export type WhatsAppMessageFilter = Partial<{ direction: MessageDirection; message_type: MessageType; /* ... */ }>;
```

### `src/services/scoring/types.ts` - Scientific Scoring Engine

```typescript
export type ScoreTrend = 'improving' | 'stable' | 'declining';
export type SufficiencyLevel = 'thriving' | 'sufficient' | 'growing' | 'attention_needed';

export interface ScientificScore {
  dimension: string;
  value: number;           // Normalized 0-1
  rawValue: number;        // Original scale
  methodology: string;     // Paper citation
  confidence: number;      // 0-1
  computedAt: string;
  trend: ScoreTrend;
  explainer: string;       // "How is this calculated?"
  sufficiency: SufficiencyLevel;
  isContested: boolean;
  contestedNote?: string;
}

export type AicaDomain = 'atlas' | 'journey' | 'connections' | 'finance' | 'grants' | 'studio' | 'flux';

export const DEFAULT_DOMAIN_WEIGHTS: Record<AicaDomain, number>;

export interface DomainScore {
  module: AicaDomain;
  normalized: number;  // 0-1
  raw: number;
  label: string;
  confidence: number;
  trend: ScoreTrend;
}

export interface LifeScore {
  composite: number;  // Weighted geometric mean, 0-1
  domainScores: Record<AicaDomain, number>;
  domainWeights: Record<AicaDomain, number>;
  weightMethod: 'equal' | 'slider' | 'ahp';
  trend: ScoreTrend;
  sufficiency: SufficiencyLevel;
  spiralAlert: boolean;
  spiralDomains: AicaDomain[];
  computedAt: string;
}

export interface SpiralAlert {
  detected: boolean;
  decliningDomains: string[];
  correlatedDeclines: CorrelatedPair[];
  severity: 'warning' | 'critical';
  message: string;
}

export interface AHPComparison {
  domainA: AicaDomain;
  domainB: AicaDomain;
  value: number;  // Saaty 9-point scale
}

export interface AHPResult {
  weights: Record<AicaDomain, number>;
  consistencyRatio: number;
  isConsistent: boolean;
}

export interface ScoreAttribution {
  id: string; modelId: string; previousScore: number | null;
  newScore: number; delta: number | null; triggerAction: string;
}

export type ModelCategory = 'scoring' | 'assessment' | 'detection' | 'matching' | 'planning';

export interface ScientificModel {
  id: string; name: string; module: string; category: ModelCategory;
  methodologyReference: string; version: string; isContested: boolean;
}

export interface AssessmentItem {
  code: string; text: string; subscale: string;
  inputType: 'likert' | 'grid_tap' | 'text' | 'number';
  scaleMin?: number; scaleMax?: number; isReversed?: boolean;
}

export interface AssessmentInstrument {
  id: string; name: string; shortName: string; description: string;
  items: AssessmentItem[]; scoringRules: ScoringRule[];
  language: 'pt-BR'; validationReference: string; estimatedMinutes: number;
  scoreRange: { min: number; max: number };
}

export interface ScoreExplanation {
  title: string; summary: string; methodology: string;
  brazilianValidation?: string; formulaDescription: string;
  scaleDescription: string; isContested: boolean; contestedNote?: string;
  improvementTips: string[];
}

// Helper functions:
export function getSufficiencyLevel(score: number): SufficiencyLevel;
export function getSufficiencyColor(level: SufficiencyLevel): string;
export function getTrendDisplayText(trend: ScoreTrend): string;
export function getSufficiencyDisplayText(level: SufficiencyLevel): string;
```

---

## 3. Module Types

### Finance Module (`src/modules/finance/types/index.ts`)

```typescript
export interface FinanceTransaction {
  id: string; user_id: string; statement_id?: string;
  description: string; original_description?: string; normalized_description?: string;
  amount: number; type: 'income' | 'expense';
  category: string; subcategory?: string;
  merchant_name?: string; merchant_category?: string;
  transaction_date: string; is_recurring: boolean;
  hash_id?: string; tags?: string[]; notes?: string;
  ai_categorized?: boolean; ai_confidence?: number;
  reference_number?: string; created_at: string; updated_at?: string;
}

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
export type AccountType = 'checking' | 'savings' | 'credit_card' | 'investment' | 'other';

export interface FinanceStatement {
  id: string; user_id: string; file_name: string;
  file_size_bytes?: number; file_hash?: string; storage_path?: string;
  bank_name?: string; account_type?: AccountType;
  statement_period_start?: string; statement_period_end?: string;
  currency: string; processing_status: ProcessingStatus;
  opening_balance?: number; closing_balance?: number;
  total_credits?: number; total_debits?: number;
  transaction_count: number; markdown_content?: string;
  ai_summary?: string; ai_insights?: AIInsight[];
  created_at: string; updated_at: string;
}

export interface AIInsight {
  type: 'warning' | 'suggestion' | 'pattern' | 'anomaly';
  title: string; description: string;
  category?: string; amount?: number; confidence: number;
}

export type MessageRole = 'user' | 'assistant' | 'system';
export interface FinanceAgentMessage { /* agent chat message fields */ }
export interface AgentSession { /* session with messages + context */ }
export interface AgentContext { transactions: FinanceTransaction[]; statements?: FinanceStatement[]; summary: { /* ... */ }; }

export type CategoryType = 'income' | 'expense' | 'transfer' | 'investment';
export interface FinanceCategory {
  id: string; user_id?: string | null; name: string; display_name: string;
  icon?: string; color: string; parent_id?: string | null;
  category_type: CategoryType; keywords: string[]; merchant_patterns: string[];
  sort_order: number; is_active: boolean;
}

export interface FinanceBudget { id: string; user_id: string; category: string; budget_amount: number; month: number; year: number; }
export interface BudgetSummaryRow { category: string; budget_amount: number; spent: number; remaining: number; percentage: number; }
export interface MonthlyBudgetSummary { year: number; month: number; totalBudget: number; totalSpent: number; rows: BudgetSummaryRow[]; }

export interface GoalProgress { id: string; title: string; goal_type: string; target_amount: number; current_amount: number; progress_pct: number; }

export interface FinanceSummary { currentBalance: number; totalIncome: number; totalExpenses: number; transactionCount: number; }
export interface BurnRateData { averageMonthlyExpense: number; trend: 'increasing' | 'decreasing' | 'stable'; percentageChange: number; }
export interface CategoryBreakdown { category: string; amount: number; percentage: number; transactionCount: number; }
export interface MonthlyTrend { month: string; year: number; income: number; expenses: number; balance: number; }

export interface PDFExtractionResult { rawText: string; pageCount: number; extractedAt: string; }
export interface ParsedStatement { bankName: string; accountType: AccountType; periodStart: string; periodEnd: string; openingBalance: number; closingBalance: number; currency: string; transactions: ParsedTransaction[]; }
export interface ParsedTransaction { date: string; description: string; amount: number; type: 'income' | 'expense'; balance?: number; category?: string; }

export interface TransactionFilters { startDate?: string; endDate?: string; category?: string; type?: 'income' | 'expense'; minAmount?: number; maxAmount?: number; searchTerm?: string; statementId?: string; }

export interface FinanceAccount { id: string; user_id: string; account_name: string; bank_name: string | null; account_type: AccountType; is_default: boolean; color: string; icon: string; }
export interface FinanceGoal { id: string; user_id: string; title: string; goal_type: 'savings' | 'debt_payoff' | 'investment' | 'emergency_fund' | 'custom'; target_amount: number; current_amount: number; deadline: string | null; }

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const ALLOWED_MIME_TYPES = ['application/pdf'];
export const DEFAULT_CURRENCY = 'BRL';
export const TRANSACTION_CATEGORIES = ['housing', 'food', 'transport', 'health', 'education', 'entertainment', 'shopping', 'salary', 'freelance', 'investment', 'transfer', 'other'] as const;
```

### Connections Module (`src/modules/connections/types/index.ts`)

```typescript
export type ArchetypeType = 'habitat' | 'ventures' | 'academia' | 'tribo';

export interface ConnectionSpace {
  id: string; user_id: string; name: string; archetype: ArchetypeType;
  description?: string; color: string; icon: string;
  settings?: Record<string, unknown>; member_count: number;
  is_active: boolean; created_at: string; updated_at: string;
}

export interface ConnectionMember {
  id: string; space_id: string; contact_id: string; user_id: string;
  role: 'owner' | 'admin' | 'member' | 'guest'; nickname?: string;
  joined_at: string; is_active: boolean;
  contact?: { name: string | null; phone_number: string | null; profile_picture_url: string | null; };
}

// Re-exports from intent.ts and import.ts
export type IntentCategory = 'task' | 'meeting' | 'finance' | 'social' | 'information' | 'other';
export interface MessageIntent { category: IntentCategory; summary: string; confidence: number; }
export type ImportProcessingStatus = 'pending' | 'parsing' | 'extracting_intents' | 'completed' | 'failed' | 'partial';
export interface WhatsAppFileImport { id: string; user_id: string; file_name: string; status: ImportProcessingStatus; /* ... */ }
```

### Flux Module (`src/modules/flux/types/`) - Training Management

```typescript
// Re-exports from flux.ts, flow.ts, zones.ts, parq.ts
// Key types:
export interface Athlete { id: string; user_id: string; name: string; modality: string; level: string; /* ... */ }
export interface WorkoutBlock { id: string; athlete_id: string; name: string; /* 12-week periodization */ }
export interface WorkoutSlot { id: string; block_id: string; day: number; week: number; /* ... */ }
export interface WorkoutTemplate { id: string; name: string; exercises: TemplateExercise[]; /* ... */ }
export interface TrainingZone { name: string; min_intensity: number; max_intensity: number; color: string; }
export interface ParQQuestion { id: string; question: string; risk_level: string; }
export interface FluxAlert { id: string; athlete_id: string; type: string; message: string; severity: string; }
```

### Studio Module (`src/modules/studio/types/`) - Podcast Production

```typescript
// Re-exports from studio.ts, podcast.ts, podcast-workspace.ts, research.ts
export interface PodcastShow { id: string; user_id: string; title: string; description: string; /* ... */ }
export interface PodcastEpisode { id: string; show_id: string; title: string; guest_name?: string; status: string; /* ... */ }
export interface GuestDossier { name: string; bio: string; social_links: Record<string, string>; talking_points: string[]; /* ... */ }
export interface Pauta { id: string; episode_id: string; sections: PautaSection[]; /* ... */ }
export interface PautaSection { title: string; duration_minutes: number; questions: string[]; notes: string; }
export interface ResearchSource { title: string; url: string; summary: string; relevance: number; }
// Type guards for discriminated unions
```

### Journey Module (`src/modules/journey/types/`) - Consciousness & Self-Knowledge

```typescript
// Re-exports from moment.ts, sentiment.ts, weeklySummary.ts, consciousnessPoints.ts, dailyQuestion.ts, interviewer.ts
export interface Moment { id: string; user_id: string; content: string; emotion: string; cp_awarded: number; quality_score: number; /* ... */ }
export interface WeeklySummary { id: string; user_id: string; week_start: string; summary: string; insights: string[]; /* ... */ }
export interface DailyQuestion { id: string; question_text: string; category: string; difficulty: string; }
export interface InterviewSession { id: string; user_id: string; instrument_id: string; status: string; }
export interface InterviewQuestion { id: string; session_id: string; question_text: string; response?: string; }
```

### Grants Module (`src/modules/grants/types/`) - Grant Management

```typescript
export interface GrantOpportunity {
  id: string; user_id: string; title: string; organization: string;
  funding_agency: string; deadline: string; amount_min: number; amount_max: number;
  status: 'prospecting' | 'preparing' | 'submitted' | 'approved' | 'rejected';
  edital_url?: string; file_search_document_id?: string;
}

export interface GrantProject {
  id: string; user_id: string; title: string; description: string;
  opportunity_id?: string; status: string; budget: number;
}

export interface GrantBriefing { id: string; project_id: string; field_name: string; content: string; ai_generated: boolean; }

// Re-exports from organizations.ts, sponsorship.ts, sponsorDeck.ts, prospect.ts, wizard.ts, presentationRAG.ts
export interface Organization { id: string; name: string; cnpj: string; /* ... */ }
export interface SponsorshipTier { id: string; project_id: string; name: string; amount: number; benefits: string[]; }
export interface ProspectActivity { id: string; sponsor_id: string; activity_type: string; /* ... */ }
export interface PresentationContext { project: GrantProject; organization: Organization; /* ... */ }
```

---

## 4. Hook Signatures

```typescript
// === Authentication & User ===
export function useAuth(): { user, session, signIn, signOut, loading };
export function useActivationStatus(): UseActivationStatusReturn;
export function useUserRole(): UseUserRoleReturn;
export function useUserPlan(): { plan, loading, error };
export function useUserCredits(): UseUserCreditsReturn;
export function useUserStats(): { stats, loading };
export function useUserBirthdate(): { birthdate, loading };
export function useUserLocation(): { location, loading };
export function useUserPatterns(): UseUserPatternsReturn;
export function useInteractionGuard(): UseInteractionGuardReturn;

// === Billing & Coupons ===
export function useBilling(): UseBillingReturn;
export function useAdminCoupons(): UseAdminCouponsReturn;
export function useCouponRedemption(): UseCouponRedemptionReturn;
export function useInviteSystem(): UseInviteSystemReturn;

// === Google Integration ===
export function useGoogleAuth(): UseGoogleAuthReturn;
export function useGoogleScopes(): GoogleScopesState;
export function useGoogleCalendarEvents(options): { events, loading, error };
export function useCalendarSync(): UseCalendarSyncReturn;
export function useGmailIntegration(): UseGmailIntegrationReturn;
export function useDriveIntegration(): UseDriveIntegrationReturn;
export function useModuleGoogleContext(module, entityId): { context, loading };

// === Chat & AI ===
export function useChatSession(): UseChatSessionReturn;
export function useChatContextData(isExpanded: boolean): ChatContextDataResult;
export function useModuleAgent(): UseModuleAgentReturn;
export function useModuleChatSession(module: AgentModule): UseModuleChatSessionReturn;
export function useContextCache(): { cache, invalidate };
export function useContextSource(options): { source, loading };
export function useConversationSummary(): { summary, loading };
export function useLifeCouncil(options?): UseLifeCouncilReturn;
export function useCrossModuleIntelligence(options): { insights, loading };
export function useExecutionPlan(): UseExecutionPlanReturn;

// === Gamification & Scoring ===
export function useConsciousnessPoints(userId, options): { balance, transactions, award };
export function useStreakTrend(options?): UseStreakTrendReturn;
export function useLifeScore(): UseLifeScoreReturn;
export function useScientificScore(domain, userId): { score, loading };
export function useHealthScore(contactId, userId): { score, history, loading };
export function useContactsAtRisk(options): { contacts, loading, count };
export function useTemperature(options?): UseTemperatureReturn;

// === File Search & Documents ===
export function useFileSearch(): { search, results, loading };
export function useModuleFileSearch(module_type, module_id?): { search, results };
export function useFileSearchV2(): UseFileSearchV2Return;
export function useFileSearchAnalytics(options?): { analytics, loading };
export function useFileSearchQuickStats(userId?): { stats };
export function useGroundedSearch(): UseGroundedSearchReturn;

// === Contacts & Connections ===
export function useContactAppearances(contactId: string | null): { appearances, loading };
export function useProcessContact(): UseProcessContactReturn;
export function usePlatformContact(contactId: string | null): { contact, loading };
export function usePlatformContacts(sourceModule?): { contacts, loading };
export function useMyContactProfiles(): { profiles, loading };

// === Media & Voice ===
export function useMediaUpload(): { upload, progress, error };
export function useVoiceRecorder(options): { recording, start, stop, transcript };
export function useSpeechRecognition(options): { transcript, listening, start, stop };

// === UI & Utilities ===
export function useMediaQuery(query: string): boolean;
export const useIsMobile: () => boolean;
export const useIsDesktop: () => boolean;
export function useDebounce<T>(fn: T, delay: number): T;
export function useCardSelection(options?): UseCardSelectionReturn;
export function useTaskFilters(tasks: Task[]): { filtered, filters, setFilters };
export function useTaskCompletion(options): { complete, undo };
export function useNotifications(): UseNotificationsReturn;
export function useModuleRegistry(): UseModuleRegistryReturn;
export function useWaitlist(): { join, status, loading };
export function useContextualCTAs(): { ctas, loading };
export const useTourAutoStart: (tourKey: string) => void;

// === External APIs ===
export function useBrasilApi(): { lookupCEP, lookupCNPJ };
export function useHolidays(year?: number): { holidays, isHoliday, nextHoliday };
export function useWeatherInsight(): { weather, insight, loading };
```

---

## 5. Service Signatures (Top-Level)

### AI & Cost Tracking
```typescript
// aiCostAnalyticsService.ts
export async function getUserAICosts(userId, startDate, endDate): Promise<AIUsageRecord[]>;
export async function getCurrentMonthCost(userId): Promise<number>;
export async function getModelCostBreakdown(userId, startDate, endDate): Promise<ModelCostBreakdown[]>;
export async function getMonthlyCostSummary(userId): Promise<MonthlyCostSummary>;

// aiUsageTrackingService.ts
export async function trackAIUsage(params: TrackAIUsageParams): Promise<void>;
export async function withAITracking<T>(operation, params): Promise<T>;
export function calculateCost(modelName, inputTokens, outputTokens): CostCalculation;

// aicaAutoService.ts
export async function getTaskPrioritySuggestions(userId): Promise<PriorityRecommendation[]>;
export async function getDailyExecutionPlan(userId): Promise<TaskSuggestion[]>;
```

### Gamification & Scoring
```typescript
// gamificationService.ts
export const BADGES_CATALOG: Record<string, Badge>;
export const FINANCE_XP_REWARDS, WHATSAPP_XP_REWARDS, FLUX_XP_REWARDS: Record<string, number>;

// badgeEvaluationService.ts
export async function evaluateAllBadges(userId): Promise<BadgeWithProgress[]>;
export async function checkAndAwardBadges(userId): Promise<UserBadge[]>;

// consciousnessPointsService.ts
export async function getCPBalance(userId): Promise<CPBalance>;
export async function awardCP(userId, rewardId, metadata?): Promise<CPTransaction>;
export async function getCPLeaderboard(limit?): Promise<LeaderboardEntry[]>;

// streakRecoveryService.ts
export async function getStreakTrend(userId): Promise<StreakTrend>;
export async function getStreakStatus(userId): Promise<StreakStatus>;
export async function useGracePeriod(userId): Promise<{ success, message }>;

// efficiencyService.ts
export async function calculateDailyEfficiency(userId, date): Promise<EfficiencyScore>;
export async function getEfficiencyTrends(userId, days): Promise<EfficiencyTrend[]>;

// unifiedEfficiencyService.ts
export async function calculateEfficiencyScore(userId): Promise<UnifiedEfficiencyScore>;
export async function getEfficiencyHistory(userId, limit): Promise<UnifiedEfficiencyScore[]>;
```

### Scoring Engine (`src/services/scoring/`)
```typescript
// scoringEngine.ts — Provider Registration Pattern
export function registerDomainProvider(domain: AicaDomain, provider: DomainScoreProvider): void;
export async function computeLifeScore(userId): Promise<LifeScore>;

// lifeScoreService.ts — Persistence layer
export async function saveLifeScore(userId, score: LifeScore): Promise<void>;
export async function getLifeScoreHistory(userId, limit): Promise<LifeScore[]>;

// spiralDetectionService.ts
export async function detectSpiral(userId, domainScores): Promise<SpiralAlert>;

// goodhartDetectionService.ts
export async function detectGoodhart(userId, domain): Promise<GoodhartAlert>;

// correlationAnalysisService.ts
export async function computeCorrelations(userId): Promise<CorrelationResult[]>;
```

### Google Integration
```typescript
// googleAuthService.ts
export async function connectGoogleCalendar(): Promise<void>;
export async function requestGoogleScopes(additionalScopes): Promise<void>;
export async function connectGmail(): Promise<void>;
export async function connectDrive(): Promise<void>;
export async function handleOAuthCallback(): Promise<{ calendarScopeGranted: boolean }>;

// googleCalendarService.ts
export async function fetchCalendarEvents(options): Promise<GoogleCalendarEvent[]>;
export async function fetchTodayEvents(): Promise<GoogleCalendarEvent[]>;

// googleCalendarWriteService.ts
export async function createCalendarEvent(event): Promise<GoogleCalendarEventResponse>;
export async function updateCalendarEvent(eventId, event): Promise<GoogleCalendarEventResponse>;
export async function deleteCalendarEvent(eventId): Promise<void>;

// calendarSyncService.ts
export async function syncEntityToGoogle(entity, module): Promise<SyncMapping>;
export async function bulkSyncFluxSlots(slots): Promise<{ synced, skipped, failed }>;
export async function bulkSyncAtlasTasks(): Promise<{ synced, skipped, failed, scopeUpgradeNeeded }>;

// gmailService.ts
export async function listEmails(options?): Promise<GmailMessage[]>;
export async function searchEmails(query): Promise<GmailMessage[]>;

// driveService.ts
export async function listFiles(options?): Promise<DriveFile[]>;
export async function searchFiles(query): Promise<DriveFile[]>;
```

### Contacts & Network
```typescript
// contactNetworkService.ts
export async function getUserContacts(userId): Promise<ContactNetwork[]>;
export async function createContact(contact): Promise<ContactNetwork>;
export async function updateHealthScore(contactId): Promise<number>;

// contactSearchService.ts
export async function searchContacts(query, options): Promise<ContactSearchResponse>;
export async function getContactInsights(contactId): Promise<ContactInsight[]>;

// healthScoreService.ts
export async function calculateHealthScore(contactId): Promise<number>;
export async function getContactsAtRisk(userId, limit): Promise<ContactAtRisk[]>;

// platformContactService.ts
export async function findOrCreateContact(data): Promise<PlatformContact>;
export async function sendModuleInvite(contactId, module, role): Promise<void>;
```

### Chat & Streaming
```typescript
// chatService.ts
export const chatService: { createSession, getSession, saveMessage, listSessions };

// chatStreamService.ts
export async function* streamChat(message, sessionId, module?): AsyncGenerator<StreamEvent>;

// chatActionService.ts
export async function executeChatAction(action: ChatAction): Promise<{ success, message }>;
```

### Billing
```typescript
// billingService.ts
export async function getPricingPlans(): Promise<PricingPlan[]>;
export async function getUserSubscription(): Promise<UserSubscription>;
export async function getUserCredits(): Promise<UserCredits>;
export async function spendCredits(amount, action): Promise<SpendCreditsResult>;

// couponService.ts
export async function redeemCoupon(code): Promise<RedeemResult>;
export async function adminCreateCoupon(params): Promise<CreateCouponResult>;
```

### Other Key Services
```typescript
// supabaseClient.ts
export const supabase: SupabaseBrowserClient;

// edgeFunctionService.ts
export async function invokeEdgeFunction<T>(name, body, options?): Promise<T>;
export async function callGeminiEdgeFunction<T>(action, payload, model?): Promise<T>;

// journeyService.ts
export async function registerMoment(userId, content, emotion, metadata): Promise<JourneyMoment>;
export async function getDailyQuestion(): Promise<DailyQuestion>;

// dailyReportService.ts
export async function generateDailyReport(userId, date): Promise<DailyReport>;
export async function aggregateDailyMetrics(userId, date): Promise<DailyReportMetrics>;

// universalInputService.ts
export async function extractIntent(text, source): Promise<IntentResult>;

// modelRouterService.ts
export const modelRouterService: ModelRouterService;  // Client-side model routing

// recommendationEngine.ts
export function getRecommendationEngine(config?): RecommendationEngine;

// feedbackLoopService.ts
export const feedbackLoopService: FeedbackLoopService;

// taskRecurrenceService.ts
export function parseRecurrenceRule(rrule): RecurrencePattern;
export function generateNextOccurrence(pattern, fromDate): Date;
export function describeRRuleInPortuguese(rrule): string;
```

---

## 6. Module Service Signatures

### Atlas (Task Management)
```typescript
// atlasAIService.ts
export interface PrioritySuggestion { quadrant: Quadrant; confidence: number; reasoning: string; }
export interface TaskDecomposition { subtasks: Subtask[]; estimatedTotal: number; }
export interface DailyBriefing { summary: string; topTasks: string[]; insights: string[]; }

// atlasScoring.ts
export type Chronotype = 'morning_lark' | 'night_owl' | 'intermediate';
export type EnergyLevel = 'peak' | 'sustain' | 'rest';
export interface CognitiveProfile { chronotype: Chronotype; peakHours: number[]; /* ... */ }
export interface TaskScores { cognitiveLoad: number; flowProbability: number; optimalTime: string; }
```

### Connections (CRM)
```typescript
// connectionSpaceService.ts
export async function getConnectionSpaces(userId): Promise<ConnectionSpace[]>;
export async function createConnectionSpace(userId, data): Promise<ConnectionSpace>;

// financeIntegration.ts
export interface SharedExpense { id: string; space_id: string; amount: number; /* ... */ }
export async function createSharedExpense(expense): Promise<SharedExpense>;

// networkScoring.ts
export type ScoreTrend = 'improving' | 'stable' | 'declining';
export interface RelationshipScoreResult { score: number; trend: ScoreTrend; components: Record<string, number>; }
```

### EraForge (Educational Game)
```typescript
// eraforgeAIService.ts
export class EraforgeAIService {
  generateScenario(era, context): Promise<GenerateScenarioResult>;
  processDecision(choice, context): Promise<ProcessDecisionResult>;
}

// eraforgeGameService.ts
export class EraforgeGameService {
  createGame(childId, era): Promise<Game>;
  submitTurn(gameId, decision): Promise<TurnResult>;
}

// eraforgeVoiceService.ts
export class EraforgeVoiceService {
  speak(text, voiceOption): Promise<SpeechResult>;
  listen(): Promise<ListenResult>;
}
```

### Finance
```typescript
// financeService.ts
export async function getAllTimeSummary(userId): Promise<FinanceSummary>;
export async function getCurrentMonthSummary(userId): Promise<FinanceSummary>;
export async function getBurnRate(userId): Promise<BurnRateData>;
export async function getCategoryBreakdown(userId): Promise<CategoryBreakdown[]>;

// csvParserService.ts
export class CSVParserService {
  parseCSV(file: File, bankFormat?): Promise<CSVParseResult>;
  detectBankFormat(headers: string[]): CSVBankFormat | null;
}

// pdfProcessingService.ts
export class PDFProcessingService {
  processStatement(file: File, onProgress?): Promise<StatementUploadResult>;
}

// financeAgentService.ts
export class FinanceAgentService {
  chat(message, sessionId): Promise<AgentResponse>;
  getInsights(userId): Promise<AIInsight[]>;
}

// financialHealthScoring.ts
export type FinHealthTier = 'vulnerable' | 'coping' | 'healthy';
export interface FinHealthScore { tier: FinHealthTier; score: number; components: Record<string, number>; }
```

### Flux (Training Management)
```typescript
// athleteService.ts
export class AthleteService {
  create(input: CreateAthleteInput): Promise<Athlete>;
  update(id, input: UpdateAthleteInput): Promise<Athlete>;
  getByCoach(coachId): Promise<Athlete[]>;
}

// workoutSlotService.ts
export class WorkoutSlotService {
  create(input: CreateWorkoutSlotInput): Promise<WorkoutSlot>;
  getByBlock(blockId): Promise<WorkoutSlot[]>;
}

// fluxAIService.ts
export interface LoadAnalysisResult { suggestion: string; adjustments: LoadAdjustmentAI[]; risk: string; }
export interface WeeklySummaryResult { summary: string; metrics: Record<string, number>; recommendations: string[]; }

// fatigueModeling.ts
export interface TrainingLoadMetrics { acuteLoad: number; chronicLoad: number; acwr: number; monotony: number; strain: number; }
export type FatigueRisk = 'low' | 'moderate' | 'high' | 'overtraining';
export interface ReadinessAssessment { readiness: number; risk: FatigueRisk; recommendation: string; }

// automationEngineService.ts
export class AutomationEngineService { /* workout automation rules engine */ }

// exerciseService.ts
export class ExerciseService {
  search(filters: ExerciseFilters): Promise<Exercise[]>;
  create(input: CreateExerciseInput): Promise<Exercise>;
}
```

### Grants (Research Funding)
```typescript
// grantService.ts
export async function createOpportunity(data): Promise<GrantOpportunity>;
export async function listOpportunities(filters): Promise<GrantOpportunity[]>;

// grantAIService.ts
export async function generateFieldContent(fieldName, context): Promise<string>;
export async function analyzeEditalStructure(editalText): Promise<{ sections, requirements, deadlines }>;

// grantTaskSync.ts
export async function syncGrantTasksToAtlas(projectId): Promise<{ synced, failed }>;

// researcherScoring.ts
export interface ResearcherProfile { hIndex: number; publications: number; citations: number; /* ... */ }
export const TRL_CRITERIA: Record<number, string[]>;

// presentationRAGService.ts
export async function buildPresentationContext(projectId): Promise<PresentationContext>;

// organizationService.ts
export async function getOrganizations(): Promise<Organization[]>;
export async function createOrganization(data): Promise<Organization>;
```

### Journey (Self-Knowledge)
```typescript
// momentService.ts
export async function createMoment(userId, data): Promise<Moment>;
export async function getMoments(userId, filters): Promise<Moment[]>;

// qualityEvaluationService.ts
export function calculateCP(qualityScore: number): number;
export async function evaluateAndCalculateCP(userId, momentId, content): Promise<QualityEvaluationResult>;

// weeklySummaryService.ts
export async function generateWeeklySummary(userId, weekStart): Promise<WeeklySummary>;

// dailyQuestionService.ts
export async function getDailyQuestionWithContext(userId): Promise<DailyQuestion>;
export async function getDailyQuestionsForCarousel(userId, count): Promise<DailyQuestion[]>;

// interviewerService.ts
export async function getInterviewSessions(userId): Promise<InterviewSession[]>;
export async function submitInterviewResponse(sessionId, questionId, response): Promise<ProcessedInterviewResponse>;

// assessmentInstruments.ts
export function scoreAssessment(instrumentId, responses): AssessmentResponse;
export function normalizeScore(instrumentId, rawScore): number;
export function computeJourneyDomainScore(assessments): DomainScore;
```

### LifeRPG
```typescript
// entityAgentService.ts
export class EntityAgentService {
  chat(entityId, message): Promise<EntityChatResult>;
}

// questEngineService.ts
export class QuestEngineService { /* quest generation and tracking */ }

// inventoryService.ts
export class InventoryService {
  getItems(userId, filters): Promise<InventoryItem[]>;
  addItem(input: CreateInventoryItemInput): Promise<InventoryItem>;
}

// featureUnlockService.ts
export function getUnlockedFeatures(level: number): string[];
export function isFeatureUnlocked(level: number, featureId: string): boolean;
```

### Studio (Podcast Production)
```typescript
// podcastAIService.ts
export async function generateDossier(guestName, context): Promise<GuestDossier>;
export async function searchGuestProfile(name): Promise<GuestSearchResult>;

// pautaGeneratorService.ts
export interface PautaGenerationRequest { episodeId: string; guestName: string; theme: string; style: PautaStyle; }
export interface GeneratedPauta { outline: PautaOutline; questions: string[]; sources: PautaSource[]; }

// guestScoring.ts
export interface GuestScoreResult { total: number; dimensions: Record<string, number>; narrativeMoments: NarrativeMoment[]; }
export function scoreGuest(profile: GuestProfile): GuestScoreResult;

// geminiLiveService.ts
export class GeminiLiveService {
  connect(config): Promise<void>;
  sendMessage(text): void;
  onMessage(callback: (msg: GeminiLiveMessage) => void): void;
}

// workspaceDatabaseService.ts
export async function createEpisode(episode): Promise<Episode>;
export async function getEpisode(id): Promise<Episode | null>;
```

### Google Hub
```typescript
// emailIntelligenceService.ts
export async function categorizeInbox(limit?): Promise<{ categorized: number; error?: string }>;
export async function extractTasksFromEmails(messageIds): Promise<{ extracted: number }>;
export async function enrichContactFromEmails(contactEmail): Promise<ContactEnrichment | null>;
```

---

## 7. Edge Function Index

| Function | Purpose |
|----------|---------|
| `agent-proxy` | Deprecated agent proxy |
| `asaas-webhook` | Asaas payment gateway webhook |
| `assess-athlete-fatigue` | AI fatigue risk assessment for athletes |
| `atlas-task-intelligence` | AI task prioritization and decomposition |
| `build-contact-dossier` | AI contact dossier from WhatsApp intents |
| `build-conversation-threads` | Group WhatsApp messages into conversation threads |
| `build-user-profile` | Build/update user AI profile |
| `calculate-entity-decay` | LifeRPG entity stat decay |
| `check-rate-limit` | Rate limiting check for API calls |
| `claim-daily-credits` | Claim daily free credits |
| `compute-atlas-scores` | Atlas domain scoring (cognitive load, flow) |
| `compute-cross-module-intelligence` | Cross-module pattern detection |
| `compute-financial-health` | Financial health score computation |
| `compute-life-score` | Composite Life Score computation |
| `compute-network-scores` | Connections network scoring |
| `compute-researcher-profile` | Grants researcher profile scoring |
| `compute-wellbeing-scores` | Journey wellbeing domain scoring |
| `context-cache` | AI context caching for chat sessions |
| `create-asaas-checkout` | Create Asaas payment checkout |
| `credential-health-check` | Verify API credentials are valid |
| `deep-research` | Deep research with Gemini + Google Search |
| `drive-proxy` | Google Drive API proxy |
| `email-intelligence` | Gmail categorization and task extraction |
| `entity-agent-chat` | LifeRPG entity conversation AI |
| `eraforge-gamemaster` | EraForge game AI (scenario generation, decisions) |
| `eraforge-tts` | EraForge text-to-speech |
| `estimate-processing-cost` | Estimate credit cost before AI operation |
| `external-brasil` | Brasil API proxy (CEP, CNPJ) |
| `external-geolocation` | IP geolocation lookup |
| `external-holidays` | Brazilian holidays API |
| `external-turnstile-verify` | Cloudflare Turnstile verification |
| `external-weather` | Weather forecast API |
| `extract-intent` | WhatsApp message intent extraction |
| `fetch-athlete-calendar` | Get athlete workout calendar |
| `fetch-coach-availability` | Check coach time slot availability |
| `file-search` | Gemini File Search RAG query |
| `file-search-corpus` | File Search corpus management |
| `file-search-v2` | File Search v2 with improved ranking |
| `finance-monthly-digest` | Monthly financial digest generation |
| `flux-training-analysis` | AI training load analysis |
| `gemini-chat` | Main AI chat (multi-action: chat, analyze, generate) |
| `gemini-live` | Gemini Live API WebSocket proxy |
| `gemini-live-token` | Gemini Live auth token generation |
| `generate-contact-embeddings` | Contact vector embeddings |
| `generate-entity-quests` | LifeRPG quest generation |
| `generate-presentation-pdf` | Sponsor deck PDF generation |
| `generate-questions` | Journey daily question generation |
| `generate-sponsor-deck` | AI sponsor presentation generation |
| `github-roadmap` | GitHub issues as roadmap |
| `gmail-proxy` | Gmail API proxy |
| `gmail-summarize` | AI email conversation summarization |
| `google-contextual-search` | Google context search (Gmail + Drive) |
| `ingest-whatsapp-export` | Parse WhatsApp chat export files |
| `manage-asaas-subscription` | Asaas subscription management |
| `module-preview-chat` | Module preview chat for non-subscribers |
| `notification-scheduler` | Scheduled notification processor |
| `oauth-token-refresh` | Google OAuth token refresh |
| `plan-and-execute` | AI execution plan generation |
| `proactive-trigger` | Proactive AI notification triggers |
| `process-action-queue` | Process queued AI actions |
| `process-contact-analysis` | AI contact analysis pipeline |
| `process-document` | Document classification and extraction |
| `process-edital` | Grant edital PDF processing |
| `process-interview-response` | Interview response AI analysis |
| `process-message-queue` | Message queue processor |
| `process-module-notifications` | Module-specific notification processing |
| `process-workout-automations` | Flux workout automation execution |
| `query-edital` | RAG query against indexed edital |
| `reanalyze-moments` | Bulk re-analyze journey moments |
| `receive-email-import` | Email import receiver (WhatsApp exports via email) |
| `route-entities-to-modules` | Route extracted entities to AICA modules |
| `run-life-council` | AI Life Council (cross-domain insights) |
| `score-guest-candidate` | AI guest scoring for podcasts |
| `search-contacts` | AI-powered contact search |
| `search-documents` | Cross-module document search |
| `send-athlete-invite` | Send Flux athlete invitation |
| `send-guest-approval-link` | Send podcast guest approval link |
| `send-invitation-email` | Send space invitation email |
| `send-module-invite` | Send module access invitation |
| `stripe-webhook` | Stripe payment webhook |
| `studio-analytics-insights` | Podcast analytics AI insights |
| `studio-clip-extract` | Extract clips from podcast |
| `studio-deep-research` | Deep guest/topic research |
| `studio-enrich-card` | Enrich podcast topic card |
| `studio-extract-quotes` | Extract quotes from transcript |
| `studio-file-search` | Studio-specific file search |
| `studio-gap-analysis` | Podcast content gap analysis |
| `studio-generate-captions` | Generate social media captions |
| `studio-outline` | Generate podcast outline/pauta |
| `studio-show-notes` | Generate show notes |
| `studio-transcribe` | Audio transcription |
| `studio-write-assist` | AI writing assistant for studio |
| `suggest-inventory-items` | LifeRPG inventory suggestions |
| `sync-workout-calendar` | Sync workouts to Google Calendar |
| `synthesize-user-patterns` | AI pattern synthesis for user dossier |
| `telegram-mini-app-auth` | Telegram Mini App authentication |
| `telegram-send-notification` | Send notification via Telegram |
| `telegram-webhook` | Telegram bot webhook handler |

---

## 8. Shared Edge Function Utils

### `_shared/cors.ts` - CORS Configuration

```typescript
const ALLOWED_ORIGINS = ['https://dev.aica.guru', 'https://aica.guru'];

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (/^http:\/\/localhost:\d+$/.test(origin)) return true;
  return false;
}

export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') || '';
  const allowedOrigin = isAllowedOrigin(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}
```

### `_shared/model-router.ts` - AI Model Router

```typescript
export type ComplexityLevel = 'low' | 'medium' | 'high';

export interface CallAIOptions {
  prompt: string;
  systemPrompt?: string;
  complexity: ComplexityLevel;
  expectJson?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface CallAIResult {
  text: string;
  model: string;
  tokens: { input: number; output: number };
  latencyMs: number;
  wasEscalated: boolean;
  confidence: number;
}

// Model configuration
const MODEL_MAP: Record<ComplexityLevel, string> = {
  low: 'gemini-2.5-flash',
  medium: 'gemini-2.5-flash',
  high: 'gemini-2.5-pro',
};

const ESCALATION_MAP: Record<ComplexityLevel, string | null> = {
  low: null,
  medium: 'gemini-2.5-pro',
  high: null,
};

// Core functions
export function assessConfidence(text: string, expectJson?: boolean): number;
export async function callAI(options: CallAIOptions): Promise<CallAIResult>;
export function getComplexityForAction(action: string): ComplexityLevel;
export function extractJSON<T = unknown>(text: string): T;

// Use case complexity map (~40 mapped actions)
export const USE_CASE_TO_COMPLEXITY: Record<string, ComplexityLevel>;
```

### `_shared/health-tracker.ts` - AI Health Monitoring

```typescript
export interface HealthTrackOptions {
  functionName: string;
  actionName: string;
  promptHash?: string;
}

export async function trackSuccess(opts: HealthTrackOptions, supabaseClient): Promise<void>;
export async function trackFailure(opts: HealthTrackOptions, error: Error, context, supabaseClient): Promise<TrackFailureResult>;
export async function withHealthTracking<T>(opts, supabaseClient, operation: () => Promise<T>): Promise<T>;
export function hashPrompt(prompt: string): string;
```

### `_shared/logger.ts` - Namespaced Logger

```typescript
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

export interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
  child: (namespace: string) => Logger;
}

export const createNamespacedLogger: (namespace: string) => Logger;
export const logger: Logger;
export function setLogLevel(level: LogLevel): void;
```

### `_shared/external-api.ts` - External API Infrastructure

```typescript
export interface ExternalApiConfig {
  name: string;
  baseUrl: string;
  cacheTtlSeconds: number;
  maxRetries: number;
  rateLimitPerDay?: number;
}

export interface ExternalApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  source: string;
  cached: boolean;
  latencyMs: number;
}

export async function fetchExternalApi<T>(
  config: ExternalApiConfig,
  path: string,
  options?: { cacheKey?: string; skipCache?: boolean; init?: RequestInit }
): Promise<ExternalApiResponse<T>>;
// Includes in-memory cache, rate limiting, retry with exponential backoff
```

### `_shared/google-token-manager.ts` - Google OAuth Token Manager

```typescript
export async function getGoogleTokenForUser(
  userId: string,
  requiredScope: string, // e.g., 'gmail.readonly', 'calendar.events'
  supabaseClient: SupabaseClient
): Promise<{ accessToken: string } | { error: string }>;
// Handles scope checking, token expiry, automatic refresh, disconnection on revoked tokens
```

### `_shared/channel-adapter.ts` - Unified Messaging Interface

```typescript
export type ChannelType = 'telegram' | 'whatsapp' | 'email' | 'push';

export interface UnifiedMessage {
  messageId: string;
  channel: ChannelType;
  sender: { channelUserId: string; username?: string; firstName?: string; lastName?: string; };
  chat: { chatId: string; type: 'private' | 'group' | 'supergroup' | 'channel'; title?: string; messageThreadId?: string; };
  content: { type: 'text' | 'command' | 'callback_query' | 'voice' | 'photo' | 'document' | 'unknown'; text?: string; command?: string; commandArgs?: string; callbackData?: string; callbackQueryId?: string; };
  timestamp: Date;
}

export interface OutboundMessage {
  chatId: string; text: string; parseMode?: 'HTML' | 'Markdown';
  inlineKeyboard?: InlineKeyboard; replyKeyboard?: ReplyKeyboard;
  replyToMessageId?: string; messageThreadId?: string;
}

export interface SendResult { success: boolean; messageId?: string; error?: string; }

export interface ChannelCapabilities {
  supportsInlineKeyboard: boolean; supportsReplyKeyboard: boolean;
  supportsHTML: boolean; supportsMarkdown: boolean; supportsVoice: boolean;
  supportsTypingAction: boolean; supportsCallbackQuery: boolean;
  supportsEditMessage: boolean; maxMessageLength: number;
}

export interface ChannelAdapter {
  readonly channel: ChannelType;
  normalizeInbound(rawUpdate: unknown): UnifiedMessage | null;
  sendMessage(message: OutboundMessage): Promise<SendResult>;
  sendTypingAction(chatId: string, messageThreadId?: string): Promise<void>;
  getCapabilities(): ChannelCapabilities;
  validateWebhook(request: Request): boolean;
  answerCallbackQuery?(callbackQueryId: string, text?: string): Promise<void>;
}
```

### `_shared/channel-registry.ts` - Adapter Factory

```typescript
export function getAdapter(channel: ChannelType): ChannelAdapter;
export function hasAdapter(channel: ChannelType): boolean;
export function getRegisteredChannels(): ChannelType[];
// Registered: telegram (full implementation), whatsapp (stub)
```

### `_shared/telegram-adapter.ts` - Telegram Bot Implementation

```typescript
export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export class TelegramAdapter implements ChannelAdapter {
  readonly channel = 'telegram';
  normalizeInbound(rawUpdate: unknown): UnifiedMessage | null;
  async sendMessage(message: OutboundMessage): Promise<SendResult>;
  async sendTypingAction(chatId: string, messageThreadId?: string): Promise<void>;
  async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void>;
  getCapabilities(): ChannelCapabilities;
  validateWebhook(request: Request): boolean;
}
// Handles: text, commands, callback queries, voice, photo, document, forum topics
// Security: constant-time webhook secret comparison
```

### `_shared/telegram-ai-router.ts` - Telegram AI Command Router

```typescript
// ~1400 lines - Routes Telegram messages to AICA module actions via Gemini function calling
// Key features:
// - Gemini 2.5 Flash function calling for intent detection
// - 15+ function declarations (atlas_create_task, finance_add_expense, journey_record_mood, etc.)
// - Automatic module routing based on detected intent
// - LGPD: never stores raw text, only intent_summary (max 200 chars)
// - Fallback to casual conversation when no function matches
// - Health tracking via withHealthTracking wrapper

export async function routeMessage(
  message: UnifiedMessage,
  supabaseClient: SupabaseClient,
  userId: string
): Promise<{ reply: string; actions?: ModuleAction[] }>;
```

### `_shared/whatsapp-export-parser.ts` - WhatsApp Chat Export Parser

```typescript
export interface ParsedMessage {
  timestamp: Date;
  senderName: string;
  text: string;
  messageType: 'text' | 'media_omitted' | 'system';
}

export interface ParsedExport {
  messages: ParsedMessage[];
  participants: string[];
  isGroup: boolean;
  exportFormat: 'android' | 'ios' | 'unknown';
  dateRange: { start: Date; end: Date };
  totalMessages: number;
  mediaOmittedCount: number;
}

export function parseWhatsAppExport(text: string): ParsedExport;
export function extractTextForRAG(parsed: ParsedExport): string;
export async function generateDedupHash(contactId, timestamp, senderName, text): Promise<string>;
// Supports Android + iOS formats, multiline messages, media omitted markers (multilingual)
```

### `_shared/whatsapp-media-handler.ts` - WhatsApp Media Handler

```typescript
export interface DownloadMediaOptions { instanceName: string; mediaUrl: string; messageId: string; timeout?: number; }
export interface DownloadResult { success: boolean; buffer?: Uint8Array; mimeType?: string; filename?: string; error?: string; }
export interface UploadOptions { buffer: Uint8Array; userId: string; originalFilename: string; mimeType: string; }
export interface UploadResult { success: boolean; storagePath?: string; error?: string; }

export const ALLOWED_MIME_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'image/jpeg', 'image/png', 'image/webp'];

export function validateMimeType(mimeType: string): boolean;
export async function downloadMediaFromEvolution(options: DownloadMediaOptions): Promise<DownloadResult>;
export async function uploadToStorage(supabase, options: UploadOptions): Promise<UploadResult>;
// Retry with exponential backoff (3 attempts), filename sanitization, MIME whitelist
```

### `_shared/whatsapp-document-processor.ts` - Document Processing Orchestrator

```typescript
export interface ProcessMediaOptions {
  userId: string; instanceName: string; messageId: string;
  mediaType: 'document' | 'image' | 'audio' | 'video';
  mediaUrl: string; mimeType: string; originalFilename?: string;
  contactPhone: string; remoteJid: string;
}

export interface ProcessMediaResult {
  success: boolean; trackingId?: string; documentId?: string;
  detectedType?: string; confidence?: number; error?: string;
}

export async function processWhatsAppMedia(supabase, options: ProcessMediaOptions): Promise<ProcessMediaResult>;
// Pipeline: create tracking -> validate MIME -> download -> upload to storage -> call process-document -> update tracking
```

---

## 9. Database Schema Summary

### Key Tables by Module

| Module | Tables |
|--------|--------|
| **Atlas** | `work_items` |
| **Agenda** | `calendar_events`, `google_calendar_tokens`, `calendar_sync_map` |
| **Journey** | `moments`, `daily_reports`, `weekly_summaries`, `consciousness_points`, `daily_questions`, `interviewer_sessions`, `interviewer_questions` |
| **Grants** | `grant_projects`, `grant_opportunities`, `grant_responses`, `organizations`, `sponsorship_tiers`, `prospect_activities`, `incentive_laws`, `generated_decks` |
| **Connections** | `connection_spaces`, `connection_members`, `contact_network`, `whatsapp_messages`, `whatsapp_file_imports`, `conversation_threads`, `whatsapp_extracted_entities`, `whatsapp_group_participants`, `consent_records`, `contact_health_history` |
| **Studio** | `podcast_shows`, `podcast_episodes`, `podcast_pautas`, `episode_topics`, `guest_research` |
| **Finance** | `finance_transactions`, `finance_statements`, `finance_categories`, `finance_budgets`, `finance_goals`, `finance_accounts`, `finance_agent_conversations` |
| **Flux** | `athletes`, `workout_blocks`, `workout_slots`, `workout_templates`, `exercises`, `performance_tests`, `flux_alerts`, `athlete_feedback_entries` |

### Cross-Module Tables

| Table | Purpose |
|-------|---------|
| `users` | Core user profile (Supabase Auth) |
| `user_profiles` | Extended user profile data |
| `user_credits` | Credit balance and plan info |
| `usage_logs` | AI usage tracking (tokens, cost, credits) |
| `ai_function_health` | OpenClaw auto-correction tracking |
| `daily_council_insights` | Life Council AI outputs |
| `user_patterns` | Living User Dossier (vector embeddings) |
| `life_score_history` | Life Score snapshots |
| `life_score_weights` | User domain weight preferences |
| `life_score_domain_correlations` | Cross-domain correlation data |
| `streak_trends` | Compassionate streak tracking |
| `badge_unlocks` | Gamification badge awards |
| `chat_sessions` | AI chat session storage |
| `chat_messages` | AI chat message history |
| `agent_sessions` | Module agent sessions |
| `file_search_stores` | Gemini File Search stores |
| `file_search_documents` | Indexed documents for RAG |
| `file_search_corpora` | Corpus management |
| `notification_settings` | User notification preferences |
| `scheduled_notifications` | Scheduled notification queue |
| `module_registry` | Module activation status |
| `waitlist_signups` | Module waitlist |
| `invite_codes` | Invite system |
| `billing_subscriptions` | Subscription management |
| `credit_coupons` | Coupon system |
| `platform_contacts` | Cross-module contact unification |
| `google_resource_links` | Google Drive/Gmail entity links |
| `email_import_log` | Email import tracking |
| `telegram_users` | Telegram bot user mapping |
| `status_page_*` | System status page tables |
| `data_deletion_requests` | LGPD data deletion requests |

### Key RPC Functions

| RPC | Purpose |
|-----|---------|
| `log_interaction` | Log AI usage with credit deduction |
| `get_usage_summary` | Aggregate usage statistics |
| `award_user_xp` | Award XP with gamification |
| `track_ai_success` / `track_ai_failure` | Health tracker RPCs |
| `get_contacts_needing_dossier_update` | Batch dossier processing |
| `get_contact_intent_summaries` | Privacy-safe intent retrieval |
| `calculate_athlete_adherence` | Flux adherence metrics |
| `get_unanswered_question` | Journey daily question |
| `get_budget_summary` | Finance budget aggregation |
| `search_aica_users` | Admin user search |

### Migration Timeline

- **2024-12**: Initial gamification, grants tables
- **2025-12**: Core modules (finance, journey, studio, connections, flux, agenda, file search)
- **2026-01**: WhatsApp pipeline, consent/LGPD, billing, documents
- **2026-02**: Conversation intelligence (4 phases), scientific scoring, Telegram integration, EraForge, LifeRPG, credit system
- **2026-03**: Atlas cognitive scoring, cross-module intelligence, external APIs, status page

---

*End of Codebase Digest*
