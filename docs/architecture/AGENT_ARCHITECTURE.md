# Arquitetura de Agentes Especializados - Aica Life OS

## 1. Visão Geral

Este documento define a arquitetura de **agentes especializados** para o Aica Life OS, onde cada agente possui conhecimento profundo de um domínio específico da aplicação, permitindo assistência contextualizada e eficiente.

### 1.1. Filosofia de Design

- **Especialização por Domínio**: Cada agente é expert em uma área específica
- **Conhecimento de Contexto**: Agentes conhecem estrutura de pastas, schemas e padrões do seu módulo
- **Interoperabilidade**: Agentes podem se comunicar entre si quando necessário
- **Single Source of Truth**: Todos os agentes seguem os mesmos princípios arquiteturais

---

## 2. Taxonomia de Agentes

### 2.1. Agentes de Infraestrutura (Foundation Layer)

#### **Agent 1: Backend Architect Agent**
- **Responsabilidade**: Banco de dados, RLS policies, migrations, schema design
- **Escopo**:
  - Supabase PostgreSQL
  - Row-Level Security (RLS)
  - Database migrations
  - Schema validation
  - Performance optimization (indexes, queries)
- **Conhecimento**:
  - `docs/architecture/backend_architecture.md`
  - `docs/DATABASE_SCHEMA_NEW_TABLES.sql`
  - Migration files pattern
  - RLS patterns (SECURITY DEFINER functions)
- **Comandos Típicos**:
  - "Criar tabela X com RLS policies"
  - "Otimizar query Y com índices"
  - "Migrar schema Z de dev para prod"
  - "Auditar políticas de segurança"

#### **Agent 2: Frontend Core Agent**
- **Responsabilidade**: Arquitetura React, routing, state management, componentes base
- **Escopo**:
  - React 18.3 + Vite 6.2
  - Tailwind CSS 4.1
  - Framer Motion animations
  - Error Boundaries
  - Component architecture
- **Conhecimento**:
  - `src/App.tsx`
  - `src/components/` (core components)
  - `src/views/` (view layer)
  - TypeScript type system
  - Performance patterns (React.memo, useMemo, useCallback)
- **Comandos Típicos**:
  - "Criar novo componente com error boundary"
  - "Otimizar re-renders da view X"
  - "Implementar routing para módulo Y"
  - "Configurar animações com Framer Motion"

---

### 2.2. Agentes de Módulo (Feature Layer)

#### **Agent 3: Atlas Task Agent (Meu Dia)**
- **Responsabilidade**: Gerenciamento de tarefas, timeline, Eisenhower Matrix
- **Escopo**:
  - `src/modules/atlas/`
  - `src/services/supabaseService.ts` (work_items)
  - Daily timeline logic
  - Priority matrix
  - Drag-and-drop
- **Conhecimento**:
  - Tabelas: `work_items`, `states`, `modules`
  - DnD Kit patterns
  - Timeline rendering logic
  - Priority scoring algorithms
- **Comandos Típicos**:
  - "Adicionar filtro de prioridade no timeline"
  - "Implementar drag-and-drop entre quadrantes"
  - "Criar visualização de tarefas em atraso"

#### **Agent 4: Gamification Agent**
- **Responsabilidade**: XP, levels, achievements, streaks, efficiency score
- **Escopo**:
  - `src/services/gamificationService.ts`
  - `src/services/efficiencyService.ts`
  - `src/components/GamificationWidget.tsx`
  - Leveling system
- **Conhecimento**:
  - Tabelas: `user_stats`, `task_metrics`, `activity_log`
  - XP calculation formulas
  - Achievement unlock conditions
  - Efficiency score algorithm (40% completion + 30% focus + 30% consistency)
- **Comandos Típicos**:
  - "Criar novo badge de conquista"
  - "Ajustar fórmula de XP para tarefas urgentes"
  - "Visualizar distribuição de eficiência semanal"

#### **Agent 5: Life Dashboard Agent (Minha Vida)**
- **Responsabilidade**: Life in Weeks grid, life areas, modules visualization
- **Escopo**:
  - Life Grid visualization
  - Death Clock
  - Module cards
  - Gamification integration
- **Conhecimento**:
  - Tabelas: `modules`, `associations`, `user_stats`
  - SVG grid rendering
  - Life expectancy calculations
  - Module health scoring
- **Comandos Típicos**:
  - "Adicionar nova área de vida"
  - "Customizar grid de semanas"
  - "Integrar módulo financeiro no dashboard"

#### **Agent 6: Podcast Copilot Agent**
- **Responsabilidade**: Produção de podcast end-to-end
- **Escopo**:
  - `src/modules/podcast/`
  - `src/services/podcastProductionService.ts`
  - `src/api/geminiDeepResearch.ts`
  - Gemini Live API integration
- **Conhecimento**:
  - Tabelas: `podcast_shows`, `podcast_episodes`, `podcast_topics`, `podcast_guest_research`
  - Workflow: Guest ID → Pre-Production → Recording → Post-Production
  - Gemini Deep Research API
  - Teleprompter logic
  - Audio waveform visualization
- **Comandos Típicos**:
  - "Pesquisar convidado X usando Gemini"
  - "Gerar pauta automática baseada em perfil"
  - "Implementar transcrição automática"
  - "Criar cut de 60s para Reels"

#### **Agent 7: Calendar Executive Agent (Secretária Executiva)**
- **Responsabilidade**: Google Calendar sync, scheduling, timeline integration
- **Escopo**:
  - `src/services/googleAuthService.ts`
  - `src/services/googleCalendarService.ts`
  - `src/services/googleCalendarTokenService.ts`
  - `src/hooks/useGoogleCalendarEvents.ts`
  - OAuth 2.0 flow
- **Conhecimento**:
  - Tabela: `google_calendar_tokens`
  - Google Calendar API v3
  - OAuth scopes: `calendar.events`, `userinfo.email`
  - Auto-sync strategies (polling, Visibility API)
  - Token refresh logic
- **Comandos Típicos**:
  - "Sincronizar eventos da semana"
  - "Resolver conflito de agendamento"
  - "Sugerir melhor horário para reunião"
  - "Integrar evento do Calendar com task do Atlas"

#### **Agent 8: Memories & Context Agent**
- **Responsabilidade**: Emotional intelligence, memories, daily reports
- **Escopo**:
  - `src/services/geminiMemoryService.ts`
  - `src/services/dailyReportService.ts`
  - Vector embeddings (1536-dimensional)
  - RAG (Retrieval-Augmented Generation)
- **Conhecimento**:
  - Tabelas: `memories`, `daily_reports`
  - Gemini embeddings API
  - Privacy-first architecture (no raw message storage)
  - Sentiment analysis patterns
- **Comandos Típicos**:
  - "Analisar padrões emocionais da última semana"
  - "Gerar relatório diário de bem-estar"
  - "Buscar memórias relacionadas a 'deadline projeto X'"

#### **Agent 9: Contact Network Agent**
- **Responsabilidade**: Relacionamentos, contact tracking, WhatsApp integration
- **Escopo**:
  - `src/services/contactNetworkService.ts`
  - Contact health scoring
  - Last interaction tracking
  - Association mapping
- **Conhecimento**:
  - Tabela: `contact_network`
  - Relationship health algorithm
  - WhatsApp webhook integration (Evolution API)
  - Privacy constraints (metadata only, no message content)
- **Comandos Típicos**:
  - "Identificar contatos sem interação há 30+ dias"
  - "Mapear rede de influência de associação X"
  - "Sugerir follow-up para contato Y"

#### **Agent 10: Finance Module Agent**
- **Responsabilidade**: Financial tracking, budgets, expenses
- **Escopo**:
  - `src/modules/finance/`
  - `src/modules/finance/services/financeService.ts`
  - Budget visualization
  - Expense categorization
- **Conhecimento**:
  - Finance-specific tables (to be defined)
  - Financial calculation patterns
  - Chart.js/visualization libraries
- **Comandos Típicos**:
  - "Criar categoria de despesa"
  - "Visualizar gastos mensais"
  - "Alertar orçamento ultrapassado"

---

### 2.3. Agentes de Integração (Integration Layer)

#### **Agent 11: AI Integration Agent**
- **Responsabilidade**: Gemini API, prompts, AI features
- **Escopo**:
  - `src/modules/podcast/services/geminiService.ts`
  - `src/api/geminiDeepResearch.ts`
  - Prompt engineering
  - Gemini Live (WebSocket)
  - Gemini embeddings
- **Conhecimento**:
  - Google AI SDK (`@google/genai`)
  - Multimodal Live API
  - Embedding generation
  - Token optimization
  - Error handling (rate limits, timeouts)
- **Comandos Típicos**:
  - "Otimizar prompt para geração de pauta"
  - "Implementar retry logic para Gemini API"
  - "Criar embedding de nova memória"

#### **Agent 12: WhatsApp Integration Agent (Evolution API)**
- **Responsabilidade**: n8n workflows, Evolution API, message processing
- **Escopo**:
  - n8n webhook configuration
  - Evolution API integration
  - Message flow (Webhook → n8n → AI → Supabase)
  - Privacy pipeline (extract context, discard raw data)
- **Conhecimento**:
  - Tabelas: `pair_conversations`, `chat_sessions`, `audit_log`
  - Evolution API endpoints
  - n8n workflow patterns
  - GDPR compliance (message purge)
- **Comandos Típicos**:
  - "Processar mensagem e extrair task"
  - "Configurar novo webhook para grupo"
  - "Auditar pipeline de privacidade"

---

### 2.4. Agentes de Qualidade (Quality Layer)

#### **Agent 13: Testing & QA Agent**
- **Responsabilidade**: E2E tests, test coverage, test maintenance
- **Escopo**:
  - `tests/e2e/` (Playwright tests)
  - `playwright.config.ts`
  - Test scenarios
  - CI/CD integration
- **Conhecimento**:
  - 32 E2E tests across 5 spec files
  - Playwright API
  - Test patterns (auth, task management, gamification, security)
  - Visual regression testing
- **Comandos Típicos**:
  - "Criar teste E2E para fluxo de podcast"
  - "Debugar falha no teste de autenticação"
  - "Gerar relatório de cobertura"

#### **Agent 14: Security & Privacy Agent**
- **Responsabilidade**: GDPR compliance, security audit, privacy patterns
- **Escopo**:
  - `docs/PRIVACY_AND_SECURITY.md`
  - `docs/SECURITY_AUDIT_REPORT.md`
  - RLS policies
  - Encryption (AES-256, TLS 1.3)
  - Data retention
- **Conhecimento**:
  - GDPR Articles (30, 17, 20, 15)
  - OWASP Top 10
  - ISO 27001 controls
  - Privacy by Design principles
  - Supabase security best practices
- **Comandos Típicos**:
  - "Auditar RLS policies para GDPR compliance"
  - "Implementar data subject access request"
  - "Verificar exposição de dados sensíveis"

#### **Agent 15: Performance & Optimization Agent**
- **Responsabilidade**: Performance monitoring, optimization, bundle size
- **Escopo**:
  - React performance patterns
  - Database query optimization
  - Bundle analysis
  - Lazy loading
  - Caching strategies
- **Conhecimento**:
  - Vite build optimization
  - React DevTools Profiler
  - Database indexes
  - Lighthouse metrics
  - Compression techniques
- **Comandos Típicos**:
  - "Otimizar bundle size do módulo podcast"
  - "Implementar lazy loading de componentes"
  - "Criar índices para queries lentas"

---

## 3. Princípios de Comunicação Entre Agentes

### 3.1. Handoff Protocol
Quando um agente precisa de assistência de outro domínio:

```typescript
// Exemplo: Atlas Agent solicita Calendar Agent
interface AgentHandoff {
  from: 'atlas-agent',
  to: 'calendar-agent',
  context: {
    task_id: 'uuid-xxx',
    request: 'Verificar conflitos de horário para task em 2025-12-10 14:00'
  },
  priority: 'high' | 'medium' | 'low'
}
```

### 3.2. Shared Knowledge Base
Todos os agentes acessam:
- `docs/PRD.md` - Source of truth do produto
- `docs/architecture/backend_architecture.md` - Database schema
- `docs/ARCHITECTURE_GUIDE.md` - Padrões de código
- Type definitions em `src/types/database.types.ts`

### 3.3. Conflict Resolution
Quando dois agentes sugerem soluções conflitantes:
1. **Prioridade de Domínio**: Agente especializado no domínio prevalece
2. **Backend First**: Database Agent tem palavra final em questões de schema
3. **Security First**: Security Agent pode vetar qualquer implementação
4. **Escalation**: Conflitos não resolvidos sobem para supervisão humana

---

## 4. Implementação Técnica

### 4.1. Agent Configuration File

```typescript
// src/agents/config/agentRegistry.ts
export const AGENT_REGISTRY = {
  'backend-architect': {
    name: 'Backend Architect Agent',
    scope: ['supabase', 'rls', 'migrations', 'schema'],
    knowledgeBase: [
      'docs/architecture/backend_architecture.md',
      'docs/DATABASE_SCHEMA_NEW_TABLES.sql'
    ],
    tools: ['execute_sql', 'apply_migration', 'list_tables'],
    priority: 10 // Highest for foundational decisions
  },
  'podcast-copilot': {
    name: 'Podcast Copilot Agent',
    scope: ['podcast', 'gemini-live', 'recording', 'research'],
    knowledgeBase: [
      'src/modules/podcast/**/*',
      'src/services/podcastProductionService.ts'
    ],
    tools: ['gemini_api', 'storage_upload', 'teleprompter'],
    priority: 5
  },
  // ... outros agentes
}
```

### 4.2. Agent Invocation Pattern

```typescript
// src/agents/core/AgentRouter.ts
export class AgentRouter {
  async routeRequest(userQuery: string): Promise<AgentResponse> {
    // 1. Classificar query
    const classification = await this.classifyQuery(userQuery)

    // 2. Selecionar agente(s)
    const agents = this.selectAgents(classification)

    // 3. Executar em paralelo quando possível
    const results = await Promise.all(
      agents.map(agent => agent.execute(userQuery, classification.context))
    )

    // 4. Consolidar respostas
    return this.consolidate(results)
  }
}
```

### 4.3. Context Injection

Cada agente recebe context object:

```typescript
interface AgentContext {
  // Global context
  userId: string
  sessionId: string
  timestamp: Date

  // Domain-specific context
  currentModule?: 'atlas' | 'podcast' | 'finance' | 'calendar'
  activeView?: string
  recentActions?: Action[]

  // Technical context
  database: SupabaseClient
  aiClient?: GoogleGenerativeAI
  storageClient?: StorageClient

  // Security context
  permissions: Permission[]
  rlsContext: RLSContext
}
```

---

## 5. Roadmap de Implementação

### Phase 1: Foundation (Weeks 1-2)
- [ ] Implementar Backend Architect Agent
- [ ] Implementar Frontend Core Agent
- [ ] Criar AgentRouter e classificador de queries
- [ ] Setup knowledge base indexing

### Phase 2: Critical Modules (Weeks 3-4)
- [ ] Atlas Task Agent
- [ ] Calendar Executive Agent
- [ ] Podcast Copilot Agent
- [ ] Testing framework para agents

### Phase 3: Intelligence Layer (Weeks 5-6)
- [ ] Memories & Context Agent
- [ ] Contact Network Agent
- [ ] AI Integration Agent
- [ ] Inter-agent communication protocol

### Phase 4: Quality & Optimization (Weeks 7-8)
- [ ] Testing & QA Agent
- [ ] Security & Privacy Agent
- [ ] Performance Agent
- [ ] Agent performance monitoring

### Phase 5: Expansion (Weeks 9-10)
- [ ] Finance Module Agent
- [ ] Gamification Agent
- [ ] Life Dashboard Agent
- [ ] WhatsApp Integration Agent
- [ ] Agent analytics dashboard

---

## 6. Métricas de Sucesso

### 6.1. Por Agente
- **Response Time**: < 2s para queries simples, < 10s para complexas
- **Accuracy**: > 95% de respostas corretas no domínio
- **Coverage**: > 90% das queries do domínio sem handoff

### 6.2. Sistema Global
- **User Satisfaction**: NPS > 50
- **Productivity Gain**: 40% redução em tempo de desenvolvimento
- **Error Rate**: < 5% de respostas incorretas
- **Inter-Agent Coordination**: < 15% de conflitos não resolvidos

---

## 7. Considerações de Segurança

### 7.1. Agent Permissions
Cada agente tem permissões restritas ao seu domínio:

```typescript
const AGENT_PERMISSIONS = {
  'backend-architect': ['database:read', 'database:write', 'rls:manage'],
  'podcast-copilot': ['storage:upload', 'gemini:api', 'database:podcast:write'],
  'security-agent': ['*:audit', 'rls:read', 'logs:read']
}
```

### 7.2. Audit Trail
Toda ação de agente é logada:

```sql
CREATE TABLE agent_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id TEXT NOT NULL,
    action TEXT NOT NULL,
    context JSONB,
    user_id UUID REFERENCES auth.users(id),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    status TEXT CHECK (status IN ('success', 'failure', 'partial'))
);
```

---

## 8. Próximos Passos

1. **Validar Proposta**: Revisar com stakeholders
2. **Prototipar Agent Framework**: Criar MVP do AgentRouter
3. **Implementar Agent Pilot**: Começar com Backend Architect Agent
4. **Iterate**: Coletar feedback e ajustar arquitetura
5. **Scale**: Expandir para todos os 15 agentes

---

**Última Atualização**: 2025-12-06
**Versão**: 1.0
**Status**: Proposta Inicial
