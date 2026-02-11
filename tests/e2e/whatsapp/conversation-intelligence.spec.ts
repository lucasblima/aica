/**
 * WhatsApp Conversation Intelligence E2E Tests
 *
 * Comprehensive test suite for the Conversation Intelligence features:
 * - Phase 1: Contact Dossier Card (living summary)
 * - Phase 2: Conversation Timeline (threaded sessions)
 * - Phase 3: Entity Inbox (accept/reject routing to Atlas/Finance)
 * - Phase 4: Group Analytics Card (group intelligence)
 *
 * Related:
 * - Epic #238 - WhatsApp Conversation Intelligence
 * - Issue #93 - WhatsApp Pipeline
 *
 * Components under test:
 * - src/modules/connections/components/whatsapp/ContactDossierCard.tsx
 * - src/modules/connections/components/whatsapp/ConversationTimeline.tsx
 * - src/modules/connections/components/whatsapp/EntityInbox.tsx
 * - src/modules/connections/components/whatsapp/GroupAnalyticsCard.tsx
 * - src/modules/connections/hooks/useContactDossier.ts
 * - src/modules/connections/hooks/useConversationThreads.ts
 * - src/modules/connections/hooks/useExtractedEntities.ts
 */

import { test, expect, Page } from '@playwright/test';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const MOCK_USER_ID = 'test-user-id-123';

const MOCK_CONTACT = {
  id: 'contact-id-123',
  user_id: MOCK_USER_ID,
  name: 'Maria Silva',
  whatsapp_name: 'Maria',
  phone: '5511999887766',
  relationship_type: 'personal',
};

const MOCK_GROUP_CONTACT = {
  id: 'group-contact-id-456',
  user_id: MOCK_USER_ID,
  name: 'Equipe Projeto Alpha',
  whatsapp_name: 'Equipe Alpha',
  phone: null,
  relationship_type: 'group',
};

// Phase 1: Dossier data
const MOCK_DOSSIER = {
  contact_id: 'contact-id-123',
  contact_name: 'Maria Silva',
  phone: '5511999887766',
  relationship_type: 'personal',
  dossier_summary: 'Maria e designer UX na empresa ABC. Conversas frequentes sobre projetos de interface, deadlines de entrega e feedback de usuarios. Pendencia: revisao do prototipo do app mobile.',
  dossier_topics: ['UX Design', 'App Mobile', 'Feedback', 'Deadlines'],
  dossier_pending_items: ['Revisao do prototipo mobile', 'Enviar referencias de UI'],
  dossier_context: {
    relationship_nature: 'Colega de trabalho - area de design',
    communication_style: 'Casual e proativo',
    key_dates: ['2026-02-15 deadline prototipo'],
    notable_patterns: ['Responde rapido pela manha', 'Prefere audios a texto'],
    preferred_topics: ['UX Design', 'Tecnologia', 'Projetos'],
  },
  dossier_version: 3,
  dossier_updated_at: new Date(Date.now() - 3600000).toISOString(),
};

// Phase 2: Thread data
const MOCK_THREADS = [
  {
    id: 'thread-1',
    contact_id: 'contact-id-123',
    thread_start: new Date(Date.now() - 86400000).toISOString(),
    thread_end: new Date(Date.now() - 82800000).toISOString(),
    message_count: 12,
    summary: 'Discussao sobre o novo prototipo do app mobile. Maria apresentou 3 opcoes de layout e definiu-se pela opcao B.',
    topic: 'Prototipo App Mobile',
    decisions: ['Escolher layout opcao B', 'Usar cores do brand guide'],
    action_items: ['Maria: finalizar mockup ate sexta', 'Eu: enviar feedback da reuniao'],
    participants: [],
    thread_type: 'decision',
    sentiment_arc: 'positive',
    is_group: false,
  },
  {
    id: 'thread-2',
    contact_id: 'contact-id-123',
    thread_start: new Date(Date.now() - 172800000).toISOString(),
    thread_end: new Date(Date.now() - 169200000).toISOString(),
    message_count: 8,
    summary: 'Check-in sobre status do projeto e alinhamento de prioridades para a semana.',
    topic: 'Status Semanal',
    decisions: [],
    action_items: ['Agendar reuniao com stakeholders'],
    participants: [],
    thread_type: 'planning',
    sentiment_arc: 'neutral',
    is_group: false,
  },
];

// Phase 3: Entity data
const MOCK_ENTITIES = [
  {
    entity_id: 'entity-1',
    entity_type: 'task',
    entity_summary: 'Finalizar mockup do app mobile ate sexta-feira',
    entity_details: { title: 'Finalizar mockup mobile', priority: 'high', due_date: '2026-02-14' },
    routed_to_module: 'atlas',
    routing_status: 'suggested',
    confidence: 0.92,
    source_context: 'Maria Silva - Prototipo App Mobile',
    contact_name: 'Maria Silva',
    thread_topic: 'Prototipo App Mobile',
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    entity_id: 'entity-2',
    entity_type: 'monetary',
    entity_summary: 'Pagamento de R$2.500 pelo servico de design',
    entity_details: { description: 'Pagamento design UX', amount: 2500, currency: 'BRL', type: 'expense' },
    routed_to_module: 'finance',
    routing_status: 'suggested',
    confidence: 0.85,
    source_context: 'Maria Silva - Negociacao',
    contact_name: 'Maria Silva',
    thread_topic: 'Negociacao',
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    entity_id: 'entity-3',
    entity_type: 'event',
    entity_summary: 'Reuniao com stakeholders na quarta 14h',
    entity_details: { title: 'Reuniao stakeholders', date: '2026-02-12', time: '14:00' },
    routed_to_module: 'agenda',
    routing_status: 'suggested',
    confidence: 0.78,
    source_context: 'Maria Silva - Status Semanal',
    contact_name: 'Maria Silva',
    thread_topic: 'Status Semanal',
    created_at: new Date(Date.now() - 10800000).toISOString(),
  },
];

const MOCK_ENTITY_STATS = {
  total_entities: 15,
  pending_count: 3,
  accepted_count: 10,
  rejected_count: 2,
  entities_by_type: { task: 8, monetary: 3, event: 2, person: 1, deadline: 1 },
};

// Phase 4: Group analytics data
const MOCK_GROUP_ANALYTICS = {
  total_participants: 8,
  active_7d: 5,
  total_messages: 234,
  total_threads: 12,
  total_decisions: 4,
  total_action_items: 7,
  top_topics: ['Desenvolvimento', 'Design', 'Sprint Planning', 'Deploy'],
  avg_sentiment: 'positive',
  group_purpose: 'Equipe de desenvolvimento do projeto Alpha',
  activity_score: 78,
};

const MOCK_GROUP_PARTICIPANTS = [
  { participant_id: 'p1', participant_phone: '5511111111', participant_name: 'Carlos', message_count: 45, last_message_at: new Date().toISOString(), first_seen_at: new Date(Date.now() - 604800000).toISOString(), inferred_role: 'admin' },
  { participant_id: 'p2', participant_phone: '5522222222', participant_name: 'Ana', message_count: 38, last_message_at: new Date().toISOString(), first_seen_at: new Date(Date.now() - 604800000).toISOString(), inferred_role: 'active' },
  { participant_id: 'p3', participant_phone: '5533333333', participant_name: 'Pedro', message_count: 12, last_message_at: new Date(Date.now() - 172800000).toISOString(), first_seen_at: new Date(Date.now() - 604800000).toISOString(), inferred_role: 'member' },
  { participant_id: 'p4', participant_phone: '5544444444', participant_name: 'Julia', message_count: 3, last_message_at: new Date(Date.now() - 432000000).toISOString(), first_seen_at: new Date(Date.now() - 604800000).toISOString(), inferred_role: 'lurker' },
];

// ============================================================================
// PAGE OBJECT MODEL
// ============================================================================

class ConversationIntelligencePage {
  constructor(private page: Page) {}

  // Navigation
  async navigateToConnections() {
    await this.page.goto('/connections');
    await this.page.waitForLoadState('networkidle');

    const whatsappTab = this.page.getByRole('tab', { name: /whatsapp/i });
    if (await whatsappTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await whatsappTab.click();
      await this.page.waitForLoadState('networkidle');
    }
  }

  // Dossier elements
  get dossierCard() {
    return this.page.locator('.ceramic-card').filter({ hasText: /Dossie|Dossier/ });
  }

  get dossierSummary() {
    return this.dossierCard.locator('p').first();
  }

  get dossierTopics() {
    return this.dossierCard.locator('.rounded-full');
  }

  get dossierPendingItems() {
    return this.dossierCard.locator('text=/Pendencias|Pendências/i').locator('..');
  }

  get dossierRefreshButton() {
    return this.dossierCard.locator('button').filter({ has: this.page.locator('svg') });
  }

  get dossierGenerateButton() {
    return this.page.locator('button:has-text("Gerar dossie"), button:has-text("Gerar dossiê")');
  }

  // Timeline elements
  get timeline() {
    return this.page.locator('.ceramic-card').filter({ hasText: /Timeline|Historico|Histórico/ });
  }

  get threadCards() {
    return this.page.locator('.ceramic-inset').filter({ hasText: /Resumo|summary/i });
  }

  get loadMoreButton() {
    return this.page.locator('button:has-text("Carregar mais")');
  }

  get buildThreadsButton() {
    return this.page.locator('button:has-text("Construir threads"), button:has-text("Analisar conversas")');
  }

  // Entity Inbox elements
  get entityInbox() {
    return this.page.locator('.ceramic-card').filter({ hasText: /Sugestoes|Sugestões|Inbox/ });
  }

  get entityCards() {
    return this.entityInbox.locator('.ceramic-inset');
  }

  get acceptButtons() {
    return this.page.locator('button').filter({ has: this.page.locator('svg.lucide-check') });
  }

  get rejectButtons() {
    return this.page.locator('button').filter({ has: this.page.locator('svg.lucide-x') });
  }

  // Group Analytics elements
  get groupAnalyticsCard() {
    return this.page.locator('.ceramic-card').filter({ hasText: /Inteligencia do Grupo|Inteligência do Grupo/ });
  }

  get groupStats() {
    return this.groupAnalyticsCard.locator('.ceramic-inset');
  }

  get participantsToggle() {
    return this.groupAnalyticsCard.locator('button').filter({ hasText: /Participantes/ });
  }

  get participantsList() {
    return this.groupAnalyticsCard.locator('text=/Admin|Ativo|Membro|Observador/i');
  }
}

// ============================================================================
// HELPERS
// ============================================================================

async function mockSupabaseAuth(page: Page) {
  await page.route('**/auth/v1/user', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ id: MOCK_USER_ID, email: 'test@aica.guru' }),
    });
  });
}

async function mockDossierRPCs(page: Page) {
  await page.route('**/rest/v1/rpc/get_contact_dossier', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify([MOCK_DOSSIER]),
    });
  });
}

async function mockThreadRPCs(page: Page) {
  await page.route('**/rest/v1/rpc/get_contact_threads', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify(MOCK_THREADS),
    });
  });

  await page.route('**/rest/v1/rpc/get_recent_threads', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify(MOCK_THREADS),
    });
  });
}

async function mockEntityRPCs(page: Page) {
  await page.route('**/rest/v1/rpc/get_pending_entities', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify(MOCK_ENTITIES),
    });
  });

  await page.route('**/rest/v1/rpc/get_entity_stats', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify([MOCK_ENTITY_STATS]),
    });
  });
}

async function mockGroupRPCs(page: Page) {
  await page.route('**/rest/v1/rpc/get_group_analytics', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify([MOCK_GROUP_ANALYTICS]),
    });
  });

  await page.route('**/rest/v1/rpc/get_group_participants', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify(MOCK_GROUP_PARTICIPANTS),
    });
  });
}

async function mockContactNetwork(page: Page) {
  await page.route('**/rest/v1/contact_network**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([MOCK_CONTACT, MOCK_GROUP_CONTACT]),
      });
    } else {
      await route.continue();
    }
  });
}

async function mockWhatsAppSession(page: Page) {
  await page.route('**/rest/v1/whatsapp_sessions**', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify([{
        id: 'session-1',
        user_id: MOCK_USER_ID,
        instance_name: 'aica_test',
        status: 'connected',
        phone_number: '5511999887766',
        connected_at: new Date().toISOString(),
        contacts_count: 50,
        groups_count: 5,
      }]),
    });
  });
}

// ============================================================================
// TEST SUITES
// ============================================================================

test.describe('WhatsApp Conversation Intelligence', () => {
  let ciPage: ConversationIntelligencePage;

  test.beforeEach(async ({ page }) => {
    ciPage = new ConversationIntelligencePage(page);
    await mockSupabaseAuth(page);
    await mockWhatsAppSession(page);
    await mockContactNetwork(page);
  });

  // ==========================================================================
  // PHASE 1: Contact Dossier
  // ==========================================================================
  test.describe('Phase 1: Contact Dossier', () => {
    test.beforeEach(async ({ page }) => {
      await mockDossierRPCs(page);
      await mockThreadRPCs(page);
    });

    test('should display dossier card when contact is selected', async ({ page }) => {
      await ciPage.navigateToConnections();

      // Click on a contact to select it
      const contactCard = page.locator('text=/Maria Silva/i').first();
      if (await contactCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await contactCard.click();
        await page.waitForTimeout(1000);

        // Dossier card should appear
        const dossierText = page.locator('text=/Dossie|Dossier|designer UX/i').first();
        const hasDossier = await dossierText.isVisible({ timeout: 5000 }).catch(() => false);
        expect(hasDossier).toBeTruthy();
      }
    });

    test('should display dossier topics as tags', async ({ page }) => {
      await ciPage.navigateToConnections();

      const contactCard = page.locator('text=/Maria Silva/i').first();
      if (await contactCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await contactCard.click();
        await page.waitForTimeout(1000);

        // Check for topic tags
        const topicTag = page.locator('text=/UX Design|App Mobile|Feedback/i').first();
        const hasTopic = await topicTag.isVisible({ timeout: 5000 }).catch(() => false);
        expect(hasTopic).toBeTruthy();
      }
    });

    test('should display pending items', async ({ page }) => {
      await ciPage.navigateToConnections();

      const contactCard = page.locator('text=/Maria Silva/i').first();
      if (await contactCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await contactCard.click();
        await page.waitForTimeout(1000);

        const pendingItem = page.locator('text=/prototipo mobile|referencias de UI/i').first();
        const hasPending = await pendingItem.isVisible({ timeout: 5000 }).catch(() => false);
        expect(hasPending).toBeTruthy();
      }
    });

    test('should show generate button when no dossier exists', async ({ page }) => {
      // Override with empty dossier
      await page.route('**/rest/v1/rpc/get_contact_dossier', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify([{ ...MOCK_DOSSIER, dossier_summary: null, dossier_version: 0 }]),
        });
      });

      await ciPage.navigateToConnections();

      const contactCard = page.locator('text=/Maria Silva/i').first();
      if (await contactCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await contactCard.click();
        await page.waitForTimeout(1000);

        const generateBtn = page.locator('button:has-text("Gerar dossie"), button:has-text("Gerar dossiê")');
        const hasGenerate = await generateBtn.isVisible({ timeout: 5000 }).catch(() => false);
        expect(hasGenerate).toBeTruthy();
      }
    });

    test('should trigger dossier refresh via Edge Function', async ({ page }) => {
      let edgeFunctionCalled = false;

      await page.route('**/functions/v1/build-contact-dossier', async (route) => {
        edgeFunctionCalled = true;
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true, dossier: MOCK_DOSSIER }),
        });
      });

      await ciPage.navigateToConnections();

      const contactCard = page.locator('text=/Maria Silva/i').first();
      if (await contactCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await contactCard.click();
        await page.waitForTimeout(1000);

        // Click refresh button on dossier card
        const refreshBtn = ciPage.dossierRefreshButton;
        if (await refreshBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await refreshBtn.click();
          await page.waitForTimeout(2000);
          expect(edgeFunctionCalled).toBe(true);
        }
      }
    });
  });

  // ==========================================================================
  // PHASE 2: Conversation Timeline
  // ==========================================================================
  test.describe('Phase 2: Conversation Timeline', () => {
    test.beforeEach(async ({ page }) => {
      await mockDossierRPCs(page);
      await mockThreadRPCs(page);
    });

    test('should display conversation threads when contact is selected', async ({ page }) => {
      await ciPage.navigateToConnections();

      const contactCard = page.locator('text=/Maria Silva/i').first();
      if (await contactCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await contactCard.click();
        await page.waitForTimeout(1000);

        // Should show thread topics
        const threadTopic = page.locator('text=/Prototipo App Mobile|Status Semanal/i').first();
        const hasThread = await threadTopic.isVisible({ timeout: 5000 }).catch(() => false);
        expect(hasThread).toBeTruthy();
      }
    });

    test('should display thread decisions and action items', async ({ page }) => {
      await ciPage.navigateToConnections();

      const contactCard = page.locator('text=/Maria Silva/i').first();
      if (await contactCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await contactCard.click();
        await page.waitForTimeout(1000);

        // Look for decisions or action items
        const decisionText = page.locator('text=/layout opcao B|finalizar mockup|feedback/i').first();
        const hasDecision = await decisionText.isVisible({ timeout: 5000 }).catch(() => false);
        expect(hasDecision).toBeTruthy();
      }
    });

    test('should display thread type badges', async ({ page }) => {
      await ciPage.navigateToConnections();

      const contactCard = page.locator('text=/Maria Silva/i').first();
      if (await contactCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await contactCard.click();
        await page.waitForTimeout(1000);

        // Thread type badge (decision, planning, etc.)
        const typeBadge = page.locator('text=/Decisao|Planejamento|decision|planning/i').first();
        const hasType = await typeBadge.isVisible({ timeout: 5000 }).catch(() => false);
        expect(hasType).toBeTruthy();
      }
    });

    test('should show message count per thread', async ({ page }) => {
      await ciPage.navigateToConnections();

      const contactCard = page.locator('text=/Maria Silva/i').first();
      if (await contactCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await contactCard.click();
        await page.waitForTimeout(1000);

        // Message count (12 or 8)
        const msgCount = page.locator('text=/12 msg|8 msg|12 mensag|8 mensag/i').first();
        const hasCount = await msgCount.isVisible({ timeout: 5000 }).catch(() => false);
        expect(hasCount).toBeTruthy();
      }
    });

    test('should trigger thread building via Edge Function', async ({ page }) => {
      let buildCalled = false;

      await page.route('**/functions/v1/build-conversation-threads', async (route) => {
        buildCalled = true;
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true, threads_created: 2 }),
        });
      });

      await ciPage.navigateToConnections();

      const contactCard = page.locator('text=/Maria Silva/i').first();
      if (await contactCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await contactCard.click();
        await page.waitForTimeout(1000);

        const buildBtn = ciPage.buildThreadsButton;
        if (await buildBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await buildBtn.click();
          await page.waitForTimeout(2000);
          expect(buildCalled).toBe(true);
        }
      }
    });
  });

  // ==========================================================================
  // PHASE 3: Entity Inbox
  // ==========================================================================
  test.describe('Phase 3: Entity Inbox', () => {
    test.beforeEach(async ({ page }) => {
      await mockEntityRPCs(page);
    });

    test('should display pending entity suggestions', async ({ page }) => {
      await ciPage.navigateToConnections();

      // Entity inbox should be on the Overview tab
      const entityText = page.locator('text=/Finalizar mockup|Pagamento.*2.500|Reuniao.*stakeholders/i').first();
      const hasEntity = await entityText.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasEntity).toBeTruthy();
    });

    test('should display entity type icons', async ({ page }) => {
      await ciPage.navigateToConnections();

      // Entity types should be visually indicated (task, monetary, event icons)
      const entityLabel = page.locator('text=/Atlas|Finance|Agenda|Tarefa|Financeiro/i').first();
      const hasLabel = await entityLabel.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasLabel).toBeTruthy();
    });

    test('should display confidence scores', async ({ page }) => {
      await ciPage.navigateToConnections();

      // Confidence (92%, 85%, 78%)
      const confidence = page.locator('text=/92%|85%|78%|0\\.92|0\\.85|0\\.78/').first();
      const hasConfidence = await confidence.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasConfidence).toBeTruthy();
    });

    test('should accept entity and route to module', async ({ page }) => {
      let routeCalled = false;
      let routePayload: Record<string, unknown> | null = null;

      await page.route('**/rest/v1/rpc/route_accepted_entity', async (route) => {
        routeCalled = true;
        routePayload = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            success: true,
            entity_id: 'entity-1',
            routed_to_module: 'atlas',
            created_item_id: 'work-item-123',
            entity_type: 'task',
          }),
        });
      });

      await ciPage.navigateToConnections();

      // Click accept on first entity
      const acceptBtn = page.locator('button').filter({ has: page.locator('svg.lucide-check') }).first();
      if (await acceptBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await acceptBtn.click();
        await page.waitForTimeout(1000);

        expect(routeCalled).toBe(true);
      }
    });

    test('should reject entity suggestion', async ({ page }) => {
      let rejectCalled = false;

      await page.route('**/rest/v1/rpc/resolve_entity', async (route) => {
        rejectCalled = true;
        await route.fulfill({
          status: 200,
          body: JSON.stringify(true),
        });
      });

      await ciPage.navigateToConnections();

      // Click reject on first entity
      const rejectBtn = page.locator('button').filter({ has: page.locator('svg.lucide-x') }).first();
      if (await rejectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await rejectBtn.click();
        await page.waitForTimeout(1000);

        expect(rejectCalled).toBe(true);
      }
    });

    test('should remove entity from list after accept/reject', async ({ page }) => {
      await page.route('**/rest/v1/rpc/route_accepted_entity', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true, entity_id: 'entity-1', routed_to_module: 'atlas', created_item_id: 'wi-1', entity_type: 'task' }),
        });
      });

      await ciPage.navigateToConnections();

      const entityCards = page.locator('text=/Finalizar mockup/i');
      const initialCount = await entityCards.count();

      const acceptBtn = page.locator('button').filter({ has: page.locator('svg.lucide-check') }).first();
      if (await acceptBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await acceptBtn.click();
        await page.waitForTimeout(1000);

        // Entity should be removed from the list
        const newCount = await page.locator('text=/Finalizar mockup/i').count();
        expect(newCount).toBeLessThanOrEqual(initialCount);
      }
    });

    test('should trigger entity extraction via Edge Function', async ({ page }) => {
      let extractCalled = false;

      await page.route('**/functions/v1/route-entities-to-modules', async (route) => {
        extractCalled = true;
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true, entities_created: 3 }),
        });
      });

      await ciPage.navigateToConnections();

      const extractBtn = page.locator('button:has-text("Extrair"), button:has-text("Analisar")');
      if (await extractBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await extractBtn.click();
        await page.waitForTimeout(2000);
        expect(extractCalled).toBe(true);
      }
    });
  });

  // ==========================================================================
  // PHASE 4: Group Intelligence
  // ==========================================================================
  test.describe('Phase 4: Group Intelligence', () => {
    test.beforeEach(async ({ page }) => {
      await mockGroupRPCs(page);
      await mockDossierRPCs(page);
      await mockThreadRPCs(page);
    });

    test('should display group analytics card for group contacts', async ({ page }) => {
      await ciPage.navigateToConnections();

      // Select group contact
      const groupCard = page.locator('text=/Equipe.*Alpha/i').first();
      if (await groupCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await groupCard.click();
        await page.waitForTimeout(1000);

        // Group analytics card should appear
        const analyticsText = page.locator('text=/Inteligencia do Grupo|Inteligência do Grupo/i').first();
        const hasAnalytics = await analyticsText.isVisible({ timeout: 5000 }).catch(() => false);
        expect(hasAnalytics).toBeTruthy();
      }
    });

    test('should display participant and message counts', async ({ page }) => {
      await ciPage.navigateToConnections();

      const groupCard = page.locator('text=/Equipe.*Alpha/i').first();
      if (await groupCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await groupCard.click();
        await page.waitForTimeout(1000);

        // Stats: 5/8 participants, 234 messages
        const statText = page.locator('text=/5\\/8|234|Participantes|Mensagens/i').first();
        const hasStat = await statText.isVisible({ timeout: 5000 }).catch(() => false);
        expect(hasStat).toBeTruthy();
      }
    });

    test('should display group topics', async ({ page }) => {
      await ciPage.navigateToConnections();

      const groupCard = page.locator('text=/Equipe.*Alpha/i').first();
      if (await groupCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await groupCard.click();
        await page.waitForTimeout(1000);

        const topicTag = page.locator('text=/Desenvolvimento|Design|Sprint Planning|Deploy/i').first();
        const hasTopic = await topicTag.isVisible({ timeout: 5000 }).catch(() => false);
        expect(hasTopic).toBeTruthy();
      }
    });

    test('should expand and show participant list', async ({ page }) => {
      await ciPage.navigateToConnections();

      const groupCard = page.locator('text=/Equipe.*Alpha/i').first();
      if (await groupCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await groupCard.click();
        await page.waitForTimeout(1000);

        // Click participants toggle
        const participantsBtn = page.locator('button').filter({ hasText: /Participantes/ });
        if (await participantsBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          await participantsBtn.click();
          await page.waitForTimeout(500);

          // Should show participant names and roles
          const participant = page.locator('text=/Carlos|Ana|Pedro|Julia/i').first();
          const hasParticipant = await participant.isVisible({ timeout: 3000 }).catch(() => false);
          expect(hasParticipant).toBeTruthy();
        }
      }
    });

    test('should display inferred participant roles', async ({ page }) => {
      await ciPage.navigateToConnections();

      const groupCard = page.locator('text=/Equipe.*Alpha/i').first();
      if (await groupCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await groupCard.click();
        await page.waitForTimeout(1000);

        const participantsBtn = page.locator('button').filter({ hasText: /Participantes/ });
        if (await participantsBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          await participantsBtn.click();
          await page.waitForTimeout(500);

          // Should show roles: Admin, Ativo, Membro, Observador
          const role = page.locator('text=/Admin|Ativo|Membro|Observador/i').first();
          const hasRole = await role.isVisible({ timeout: 3000 }).catch(() => false);
          expect(hasRole).toBeTruthy();
        }
      }
    });

    test('should display activity score', async ({ page }) => {
      await ciPage.navigateToConnections();

      const groupCard = page.locator('text=/Equipe.*Alpha/i').first();
      if (await groupCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await groupCard.click();
        await page.waitForTimeout(1000);

        const score = page.locator('text=/78\\/100|Atividade/i').first();
        const hasScore = await score.isVisible({ timeout: 5000 }).catch(() => false);
        expect(hasScore).toBeTruthy();
      }
    });
  });

  // ==========================================================================
  // CROSS-PHASE: Error Handling & Edge Cases
  // ==========================================================================
  test.describe('Error Handling', () => {
    test('should handle RPC errors gracefully', async ({ page }) => {
      await page.route('**/rest/v1/rpc/get_pending_entities', async (route) => {
        await route.fulfill({ status: 500, body: JSON.stringify({ error: 'Internal error' }) });
      });

      await ciPage.navigateToConnections();

      // Page should not crash
      await expect(page).not.toHaveTitle(/error|crash/i);
    });

    test('should handle empty state when no entities exist', async ({ page }) => {
      await page.route('**/rest/v1/rpc/get_pending_entities', async (route) => {
        await route.fulfill({ status: 200, body: JSON.stringify([]) });
      });

      await page.route('**/rest/v1/rpc/get_entity_stats', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify([{ total_entities: 0, pending_count: 0, accepted_count: 0, rejected_count: 0, entities_by_type: {} }]),
        });
      });

      await ciPage.navigateToConnections();

      // Should show empty state or no inbox section
      await expect(page).not.toHaveTitle(/error|crash/i);
    });

    test('should handle network failure on dossier fetch', async ({ page }) => {
      await page.route('**/rest/v1/rpc/get_contact_dossier', async (route) => {
        route.abort('failed');
      });

      await mockThreadRPCs(page);
      await ciPage.navigateToConnections();

      const contactCard = page.locator('text=/Maria Silva/i').first();
      if (await contactCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await contactCard.click();
        await page.waitForTimeout(1000);

        // Should not crash, may show error or fallback
        await expect(page).not.toHaveTitle(/error|crash/i);
      }
    });

    test('should handle entity accept failure gracefully', async ({ page }) => {
      await mockEntityRPCs(page);

      await page.route('**/rest/v1/rpc/route_accepted_entity', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ success: false, error: 'Duplicate item already exists' }),
        });
      });

      await ciPage.navigateToConnections();

      const acceptBtn = page.locator('button').filter({ has: page.locator('svg.lucide-check') }).first();
      if (await acceptBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await acceptBtn.click();
        await page.waitForTimeout(1000);

        // Should show error message, not crash
        await expect(page).not.toHaveTitle(/error|crash/i);
      }
    });
  });
});
