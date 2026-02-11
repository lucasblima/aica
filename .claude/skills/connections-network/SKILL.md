---
name: connections-network
description: Rede de Conexoes - especialista no modulo Connections (CRM pessoal, 4 arquetipos, WhatsApp, split payments, calendario). Use quando trabalhar com connection spaces, members, habitat, ventures, academia, tribo, WhatsApp integration, pairing code, ou finance sync.
allowed-tools: Read, Grep, Glob, Edit, Write
---

# Connections Network - Rede de Conexoes

Especialista no modulo de CRM pessoal do AICA Life OS. Gerencia espacos de conexao com 4 arquetipos (Habitat, Ventures, Academia, Tribo), integracao WhatsApp, split payments, e calendario.

---

## Arquitetura do Modulo

```
src/modules/connections/
|-- components/
|   |-- SpaceCard.tsx, SpaceHeader.tsx, SpaceDetailsHeader.tsx
|   |-- SpaceMemberList.tsx, SpaceFinanceSummary.tsx
|   |-- CreateSpaceWizard.tsx, CreateConnectionModal.tsx
|   |-- InviteMemberForm.tsx, MemberAvatarStack.tsx, MemberBalanceCard.tsx
|   |-- ContactSearchBar.tsx, ContactFilters.tsx
|   |-- EventTimelineMini.tsx, IntentTimelineCard.tsx
|   |-- SplitPaymentTracker.tsx, SyncToFinanceButton.tsx
|   |-- CalendarConflictAlert.tsx, CalendarSyncButton.tsx, SpaceCalendarSettings.tsx
|   |-- VirtualList.tsx, OptimizedImage.tsx, skeletons.tsx
|   |-- WhatsAppContactCard.tsx, WhatsAppContactList.tsx
|   |-- whatsapp/
|   |   |-- ConnectionStatusCard.tsx, ConsentManager.tsx
|   |   |-- EmotionalThermometer.tsx, PairingCodeDisplay.tsx
|   |-- health-score/
|   |   |-- HealthScoreBadge.tsx, HealthScoreCard.tsx
|   |   |-- HealthScoreTrendChart.tsx, ContactsAtRiskWidget.tsx
|-- hooks/
|   |-- useSpaces.ts, useSpace.ts, useConnectionSpaces.ts
|   |-- useSpaceMembers.ts, useConnectionMembers.ts
|   |-- useSpaceEvents.ts, useUpcomingEvents.ts
|   |-- useFinanceIntegration.ts, useCalendarSync.ts
|   |-- useContactSearch.ts, useDebouncedSearch.ts, useContactFilters.ts
|   |-- useConnectionNavigation.ts
|   |-- useWhatsAppConnection.ts, useWhatsAppGamification.ts
|-- services/
|   |-- spaceService.ts, memberService.ts, connectionSpaceService.ts
|   |-- eventService.ts, calendarSyncService.ts
|   |-- financeIntegrationService.ts, financeIntegration.ts
|   |-- invitationService.ts, reminderService.ts
|-- types/
|   |-- index.ts           # ConnectionSpace, ConnectionMember, ARCHETYPE_METADATA
|   |-- intent.ts          # WhatsApp MessageIntent types
|-- views/
|   |-- ConnectionsView.tsx, ConnectionsWhatsAppTab.tsx
|-- lib/
|   |-- performanceMonitor.ts, queryConfig.ts
```

---

## 4 Arquetipos

### Habitat: Ancora Fisico

*Logistica da serenidade - gestao de lar como manutencao silenciosa*

```
connections/habitat/
|-- components/
|   |-- HabitatDashboard.tsx, PropertyCard.tsx
|   |-- InventoryItemCard.tsx, InventoryGrid.tsx, InventoryGridOptimized.tsx
|   |-- MaintenanceTracker.tsx, MaintenanceTrackerOptimized.tsx
|   |-- MaintenanceCalendarView.tsx, WarrantyAlertsCard.tsx, CondoContacts.tsx
|-- hooks/
|   |-- useProperty.ts, useInventory.ts, useMaintenance.ts
|-- services/
|   |-- propertyService.ts, inventoryService.ts, maintenanceService.ts
|-- views/
|   |-- HabitatHome.tsx, PropertyDetail.tsx, InventoryView.tsx, MaintenanceView.tsx
```

**Tipos**: PropertyType (`apartment|house|condo|room`), InventoryStatus, MaintenanceUrgency (`baixa|normal|alta|emergencia`)

**Tabelas**: `habitat_properties`, `inventory_items`, `maintenance_records`, `habitat_documents`

---

### Ventures: Motor de Criacao

*Cockpit de ambicao profissional - estrategia e visao*

```
connections/ventures/
|-- components/
|   |-- VenturesDashboard.tsx, MetricsCard.tsx, FinanceOverviewCard.tsx
|   |-- MRRChart.tsx, HealthGauge.tsx, EquityTable.tsx
|   |-- StakeholderGrid.tsx, MilestoneTimeline.tsx
|-- hooks/
|   |-- useEntity.ts, useMetrics.ts, useMilestones.ts, useStakeholders.ts
|-- services/
|   |-- entityService.ts, metricsService.ts, milestoneService.ts, stakeholderService.ts
|-- views/
|   |-- VenturesHome.tsx, EntityDetail.tsx, MetricsHistory.tsx, TeamView.tsx
```

**Tipos**: EntityType (`MEI|EIRELI|LTDA|SA|SLU|STARTUP|NONPROFIT`), StakeholderType, InvestmentRound

**Tabelas**: `ventures_entities`, `ventures_metrics`, `ventures_milestones`, `ventures_stakeholders`

---

### Academia: Cultivo da Mente

*Templo de crescimento intelectual - conhecimento curado*

```
connections/academia/
|-- components/
|   |-- AcademiaDashboard.tsx, JourneyCard.tsx, LearningJourneyCard.tsx
|   |-- JourneyProgress.tsx, NoteCard.tsx, NoteEditor.tsx, NoteGraph.tsx
|   |-- MentorshipCard.tsx, MentorshipScheduler.tsx
|   |-- CredentialCard.tsx, CourseModuleCard.tsx
|   |-- ReadingProgressBar.tsx, KnowledgeSearch.tsx
|-- hooks/
|   |-- useJourneys.ts, useNotes.ts, useMentorships.ts, useCredentials.ts
|-- services/
|   |-- journeyService.ts, noteService.ts, mentorshipService.ts, credentialService.ts
|-- views/
|   |-- AcademiaHome.tsx, JourneyDetail.tsx, MentorshipsView.tsx
|   |-- NotesView.tsx, PortfolioView.tsx
```

**Tipos**: JourneyType (`course|book|certification|mentorship|workshop`), NoteType (`fleeting|literature|permanent` - Zettelkasten), CredentialType

**Tabelas**: `academia_journeys`, `academia_notes`, `academia_mentorships`, `academia_credentials`

---

### Tribo: Tecido Social

*Antitese das redes sociais modernas - pertencimento intencional*

```
connections/tribo/
|-- components/
|   |-- TriboDashboard.tsx, RitualCard.tsx, RitualRSVP.tsx, RitualCalendarSync.tsx
|   |-- DiscussionCard.tsx, DiscussionThread.tsx, DiscussionThreadOptimized.tsx
|   |-- PollVoting.tsx, GroupFundCard.tsx, SharedResourceCard.tsx
|   |-- ContributionTracker.tsx, BringListEditor.tsx, MemberDirectory.tsx
|-- hooks/
|   |-- useRituals.ts, useResources.ts, useFunds.ts, useDiscussions.ts
|-- services/
|   |-- ritualService.ts, resourceService.ts, fundService.ts, discussionService.ts
|-- views/
|   |-- TriboHome.tsx, DiscussionsView.tsx, FundsView.tsx
|   |-- ResourcesView.tsx, RitualDetail.tsx
```

**Tipos**: RecurrenceFrequency, ResourceCategory (`equipment|space|vehicle|other`), DiscussionCategory, ContributionType

**Tabelas**: `tribo_rituals`, `ritual_occurrences`, `shared_resources`, `group_funds`, `fund_contributions`, `discussions`, `discussion_replies`

---

## WhatsApp Integration

### Pipeline Privacy-First (LGPD)

```
Mensagem recebida → webhook-evolution → extract-intent (Gemini)
    → Armazena APENAS intent_summary (max 100 chars)
    → NUNCA armazena texto raw
```

### Componentes WhatsApp

| Componente | Funcao |
|------------|--------|
| `PairingCodeDisplay.tsx` | Codigo 8 digitos (60s TTL) |
| `ConnectionStatusCard.tsx` | Status da conexao |
| `ConsentManager.tsx` | Gerenciamento LGPD |
| `EmotionalThermometer.tsx` | Visualizacao de sentimento |
| `WhatsAppContactCard.tsx` | Card de contato com intent |
| `WhatsAppContactList.tsx` | Lista virtualizada |

### Intent Types

```typescript
interface MessageIntent {
  summary: string;           // Max 100 chars PT-BR
  category: IntentCategory;  // question|response|scheduling|document|audio|social|request|update|media
  sentiment: IntentSentiment; // positive|neutral|negative|urgent
  urgency: 1 | 2 | 3 | 4 | 5;
  actionRequired: boolean;
  confidence: number;        // 0-1 LLM confidence
}
```

---

## Finance Integration

| Feature | Hook/Servico | Descricao |
|---------|-------------|-----------|
| Sync to Finance | `useFinanceIntegration` | Sincroniza porcao do usuario para Finance module |
| Balance | `useUserBalance` | Calcula saldo entre membros |
| Split payments | `SplitPaymentTracker` | Equal, %, ou valor fixo |
| Space summary | `SpaceFinanceSummary` | Resumo financeiro do espaco |

---

## Tabelas do Banco (25+)

### Base
| Tabela | Proposito |
|--------|-----------|
| `connection_spaces` | Espacos (arquetipo, nome, settings) |
| `connection_members` | Membros (role, permissoes) |
| `connection_events` | Eventos com RSVP |
| `connection_transactions` | Despesas com splits |
| `connection_documents` | Documentos |

### WhatsApp
| Tabela | Proposito |
|--------|-----------|
| `whatsapp_messages` | Intents APENAS (sem raw text) |
| `whatsapp_sessions` | Estado da conexao + consent |
| `contact_network` | Sentimento + intent summary |

---

## Health Score

| Componente | Funcao |
|------------|--------|
| `HealthScoreBadge.tsx` | Badge visual do score |
| `HealthScoreCard.tsx` | Card completo com metricas |
| `HealthScoreTrendChart.tsx` | Grafico de tendencia |
| `ContactsAtRiskWidget.tsx` | Alertas de contatos em risco |

---

## Archetype Design Cues

```typescript
const ARCHETYPE_METADATA = {
  habitat:  { colorTheme: 'earthy',   tone: 'Tons terrosos, peso visual pesado' },
  ventures: { colorTheme: 'precise',  tone: 'Clareza cirurgica, tipografia tecnica' },
  academia: { colorTheme: 'serene',   tone: 'Biblioteca silenciosa, muito whitespace' },
  tribo:    { colorTheme: 'warm',     tone: 'Ambiente caloroso, humano' },
}
```

---

## Padroes Criticos

### SEMPRE:
- WhatsApp: armazenar APENAS `intent_summary` (max 100 chars), NUNCA raw text
- RLS em TODAS as tabelas (filtro por user_id ou member_id)
- ConsentManager para LGPD compliance
- Finance sync respeita permissoes do membro
- Performance: usar VirtualList para listas grandes, OptimizedImage para fotos

### NUNCA:
- Armazenar texto raw de mensagens WhatsApp
- Exportar numeros de telefone em bulk
- Ignorar consent status ao acessar dados WhatsApp
- Split payment sem validacao de membros
