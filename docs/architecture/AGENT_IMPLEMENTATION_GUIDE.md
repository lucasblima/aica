# Guia de Implementação de Agentes - Aica Life OS

## 1. Estrutura de Diretórios

```
src/
├── agents/
│   ├── core/
│   │   ├── AgentRouter.ts          # Roteador de queries para agentes
│   │   ├── AgentBase.ts            # Classe base para todos os agentes
│   │   ├── AgentContext.ts         # Context injection
│   │   └── AgentRegistry.ts        # Registro de todos os agentes
│   ├── infrastructure/
│   │   ├── BackendArchitectAgent.ts
│   │   └── FrontendCoreAgent.ts
│   ├── modules/
│   │   ├── AtlasTaskAgent.ts
│   │   ├── GamificationAgent.ts
│   │   ├── PodcastCopilotAgent.ts
│   │   ├── CalendarExecutiveAgent.ts
│   │   ├── MemoriesContextAgent.ts
│   │   ├── ContactNetworkAgent.ts
│   │   ├── LifeDashboardAgent.ts
│   │   └── FinanceModuleAgent.ts
│   ├── integration/
│   │   ├── AIIntegrationAgent.ts
│   │   └── WhatsAppIntegrationAgent.ts
│   ├── quality/
│   │   ├── TestingQAAgent.ts
│   │   ├── SecurityPrivacyAgent.ts
│   │   └── PerformanceAgent.ts
│   ├── utils/
│   │   ├── QueryClassifier.ts      # Classificação de queries
│   │   ├── KnowledgeBase.ts        # Indexação de documentos
│   │   └── AgentCommunication.ts   # Protocolos de handoff
│   └── types/
│       ├── agentTypes.ts
│       └── communicationTypes.ts
```

---

## 2. Classe Base: AgentBase

```typescript
// src/agents/core/AgentBase.ts
import { SupabaseClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/genai'

export interface AgentConfig {
  name: string
  version: string
  scope: string[]
  knowledgeBase: string[]
  tools: string[]
  priority: number
  permissions: string[]
}

export interface AgentContext {
  userId: string
  sessionId: string
  timestamp: Date
  currentModule?: string
  activeView?: string
  recentActions?: any[]
  database: SupabaseClient
  aiClient?: GoogleGenerativeAI
  permissions: string[]
}

export interface AgentResponse {
  agentId: string
  status: 'success' | 'failure' | 'partial' | 'handoff'
  data?: any
  message: string
  handoffTo?: string
  context?: any
  timestamp: Date
  executionTime: number
}

export abstract class AgentBase {
  protected config: AgentConfig
  protected context: AgentContext

  constructor(config: AgentConfig, context: AgentContext) {
    this.config = config
    this.context = context
  }

  // Método abstrato que cada agente implementa
  abstract execute(query: string, params?: any): Promise<AgentResponse>

  // Métodos auxiliares comuns
  protected async logAction(action: string, status: string, details?: any) {
    await this.context.database.from('agent_audit_log').insert({
      agent_id: this.config.name,
      action,
      status,
      context: details,
      user_id: this.context.userId,
      timestamp: new Date()
    })
  }

  protected hasPermission(permission: string): boolean {
    return this.config.permissions.includes(permission) ||
           this.config.permissions.includes('*')
  }

  protected async requestHandoff(
    targetAgent: string,
    reason: string,
    context: any
  ): Promise<AgentResponse> {
    return {
      agentId: this.config.name,
      status: 'handoff',
      message: `Transferindo para ${targetAgent}: ${reason}`,
      handoffTo: targetAgent,
      context,
      timestamp: new Date(),
      executionTime: 0
    }
  }

  // Knowledge base query
  protected async queryKnowledgeBase(query: string): Promise<any> {
    // Implementar busca semântica nos documentos do knowledgeBase
    // Pode usar embeddings do Gemini para RAG
    return null
  }

  // Performance tracking
  protected startTimer(): () => number {
    const start = Date.now()
    return () => Date.now() - start
  }
}
```

---

## 3. Exemplo: Backend Architect Agent

```typescript
// src/agents/infrastructure/BackendArchitectAgent.ts
import { AgentBase, AgentConfig, AgentContext, AgentResponse } from '../core/AgentBase'

export class BackendArchitectAgent extends AgentBase {
  constructor(context: AgentContext) {
    const config: AgentConfig = {
      name: 'backend-architect',
      version: '1.0.0',
      scope: ['supabase', 'rls', 'migrations', 'schema', 'database'],
      knowledgeBase: [
        'docs/architecture/backend_architecture.md',
        'docs/DATABASE_SCHEMA_NEW_TABLES.sql',
        'docs/MIGRATION_GUIDE_NEW_TABLES.md'
      ],
      tools: [
        'mcp__supabase__execute_sql',
        'mcp__supabase__apply_migration',
        'mcp__supabase__list_tables',
        'mcp__supabase__get_advisors'
      ],
      priority: 10,
      permissions: [
        'database:read',
        'database:write',
        'rls:manage',
        'migrations:apply'
      ]
    }
    super(config, context)
  }

  async execute(query: string, params?: any): Promise<AgentResponse> {
    const timer = this.startTimer()

    try {
      // Classificar tipo de query
      const queryType = this.classifyQuery(query)

      switch (queryType) {
        case 'create_table':
          return await this.createTable(params)
        case 'add_rls_policy':
          return await this.addRLSPolicy(params)
        case 'optimize_query':
          return await this.optimizeQuery(params)
        case 'audit_security':
          return await this.auditSecurity()
        case 'apply_migration':
          return await this.applyMigration(params)
        default:
          return await this.handleGenericQuery(query)
      }
    } catch (error) {
      await this.logAction('execute', 'failure', { query, error })
      return {
        agentId: this.config.name,
        status: 'failure',
        message: `Erro ao processar query: ${error.message}`,
        timestamp: new Date(),
        executionTime: timer()
      }
    }
  }

  private classifyQuery(query: string): string {
    const lowerQuery = query.toLowerCase()

    if (lowerQuery.includes('criar tabela') || lowerQuery.includes('create table')) {
      return 'create_table'
    }
    if (lowerQuery.includes('rls') || lowerQuery.includes('policy')) {
      return 'add_rls_policy'
    }
    if (lowerQuery.includes('otimizar') || lowerQuery.includes('optimize')) {
      return 'optimize_query'
    }
    if (lowerQuery.includes('auditar') || lowerQuery.includes('audit')) {
      return 'audit_security'
    }
    if (lowerQuery.includes('migração') || lowerQuery.includes('migration')) {
      return 'apply_migration'
    }

    return 'generic'
  }

  private async createTable(params: any): Promise<AgentResponse> {
    const timer = this.startTimer()

    if (!this.hasPermission('database:write')) {
      return {
        agentId: this.config.name,
        status: 'failure',
        message: 'Permissão negada: database:write',
        timestamp: new Date(),
        executionTime: timer()
      }
    }

    // Gerar SQL baseado em template
    const sql = this.generateTableSQL(params)

    // Aplicar via migration
    await this.context.database.rpc('apply_migration', {
      name: params.tableName,
      query: sql
    })

    await this.logAction('create_table', 'success', { tableName: params.tableName })

    return {
      agentId: this.config.name,
      status: 'success',
      message: `Tabela ${params.tableName} criada com sucesso`,
      data: { sql },
      timestamp: new Date(),
      executionTime: timer()
    }
  }

  private async addRLSPolicy(params: any): Promise<AgentResponse> {
    const timer = this.startTimer()

    // Seguir padrão SECURITY DEFINER
    const policySQL = `
      -- Function
      CREATE OR REPLACE FUNCTION public.check_${params.tableName}_access(
        user_id UUID,
        record_id UUID
      ) RETURNS BOOLEAN AS $$
      BEGIN
        -- Logic here
        RETURN TRUE;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER
      SET search_path = public;

      -- Policy
      CREATE POLICY "${params.policyName}"
        ON ${params.tableName}
        FOR ${params.operation}
        USING (public.check_${params.tableName}_access(auth.uid(), id));
    `

    await this.context.database.rpc('execute_sql', { query: policySQL })

    return {
      agentId: this.config.name,
      status: 'success',
      message: `RLS policy ${params.policyName} criada`,
      data: { sql: policySQL },
      timestamp: new Date(),
      executionTime: timer()
    }
  }

  private async auditSecurity(): Promise<AgentResponse> {
    const timer = this.startTimer()

    // Buscar advisors do Supabase
    const { data: securityAdvisors } = await this.context.database
      .rpc('get_advisors', { type: 'security' })

    const { data: performanceAdvisors } = await this.context.database
      .rpc('get_advisors', { type: 'performance' })

    return {
      agentId: this.config.name,
      status: 'success',
      message: 'Auditoria de segurança concluída',
      data: {
        security: securityAdvisors,
        performance: performanceAdvisors
      },
      timestamp: new Date(),
      executionTime: timer()
    }
  }

  private generateTableSQL(params: any): string {
    // Template padrão seguindo padrões do Aica
    return `
      CREATE TABLE IF NOT EXISTS ${params.tableName} (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
        ${params.customColumns || ''}
      );

      -- Enable RLS
      ALTER TABLE ${params.tableName} ENABLE ROW LEVEL SECURITY;

      -- Basic policy
      CREATE POLICY "Users can view own records"
        ON ${params.tableName} FOR SELECT
        USING (auth.uid() = user_id);

      -- Trigger for updated_at
      CREATE TRIGGER update_${params.tableName}_updated_at
        BEFORE UPDATE ON ${params.tableName}
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `
  }

  private async optimizeQuery(params: any): Promise<AgentResponse> {
    // Analisar query plan e sugerir índices
    const { data: queryPlan } = await this.context.database
      .rpc('explain_query', { query: params.query })

    const suggestions = this.analyzeQueryPlan(queryPlan)

    return {
      agentId: this.config.name,
      status: 'success',
      message: 'Análise de query concluída',
      data: { queryPlan, suggestions },
      timestamp: new Date(),
      executionTime: 0
    }
  }

  private analyzeQueryPlan(plan: any): string[] {
    // Lógica de análise (simplificada)
    const suggestions = []

    if (plan.includes('Seq Scan')) {
      suggestions.push('Considere adicionar índice para evitar Seq Scan')
    }

    return suggestions
  }

  private async applyMigration(params: any): Promise<AgentResponse> {
    const timer = this.startTimer()

    await this.context.database.rpc('apply_migration', {
      name: params.migrationName,
      query: params.sql
    })

    await this.logAction('apply_migration', 'success', {
      migrationName: params.migrationName
    })

    return {
      agentId: this.config.name,
      status: 'success',
      message: `Migration ${params.migrationName} aplicada`,
      timestamp: new Date(),
      executionTime: timer()
    }
  }

  private async handleGenericQuery(query: string): Promise<AgentResponse> {
    // Consultar knowledge base via RAG
    const knowledge = await this.queryKnowledgeBase(query)

    return {
      agentId: this.config.name,
      status: 'success',
      message: 'Consulta genérica processada',
      data: knowledge,
      timestamp: new Date(),
      executionTime: 0
    }
  }
}
```

---

## 4. Agent Router

```typescript
// src/agents/core/AgentRouter.ts
import { AgentBase, AgentContext, AgentResponse } from './AgentBase'
import { BackendArchitectAgent } from '../infrastructure/BackendArchitectAgent'
import { PodcastCopilotAgent } from '../modules/PodcastCopilotAgent'
// ... outros agentes

export class AgentRouter {
  private agents: Map<string, AgentBase>
  private classifier: QueryClassifier

  constructor(context: AgentContext) {
    this.agents = new Map()
    this.classifier = new QueryClassifier()

    // Registrar agentes
    this.registerAgent('backend-architect', new BackendArchitectAgent(context))
    this.registerAgent('podcast-copilot', new PodcastCopilotAgent(context))
    // ... outros
  }

  private registerAgent(id: string, agent: AgentBase) {
    this.agents.set(id, agent)
  }

  async route(userQuery: string): Promise<AgentResponse> {
    // 1. Classificar query
    const classification = await this.classifier.classify(userQuery)

    // 2. Selecionar agente primário
    const primaryAgentId = classification.primaryAgent
    const primaryAgent = this.agents.get(primaryAgentId)

    if (!primaryAgent) {
      throw new Error(`Agent ${primaryAgentId} não encontrado`)
    }

    // 3. Executar
    const response = await primaryAgent.execute(userQuery, classification.params)

    // 4. Handoff se necessário
    if (response.status === 'handoff' && response.handoffTo) {
      const secondaryAgent = this.agents.get(response.handoffTo)
      if (secondaryAgent) {
        return await secondaryAgent.execute(userQuery, response.context)
      }
    }

    return response
  }

  async routeMultiple(userQuery: string): Promise<AgentResponse[]> {
    // Para queries que necessitam múltiplos agentes
    const classification = await this.classifier.classify(userQuery)

    const agentIds = classification.multipleAgents || [classification.primaryAgent]

    const promises = agentIds.map(id => {
      const agent = this.agents.get(id)
      return agent ? agent.execute(userQuery, classification.params) : null
    }).filter(Boolean)

    return await Promise.all(promises)
  }
}
```

---

## 5. Query Classifier

```typescript
// src/agents/utils/QueryClassifier.ts
import { GoogleGenerativeAI } from '@google/genai'

export interface Classification {
  primaryAgent: string
  multipleAgents?: string[]
  params: any
  confidence: number
}

export class QueryClassifier {
  private aiClient: GoogleGenerativeAI

  constructor() {
    this.aiClient = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)
  }

  async classify(query: string): Promise<Classification> {
    // Usar Gemini para classificar query
    const model = this.aiClient.getGenerativeModel({ model: 'gemini-2.0-flash-001' })

    const prompt = `
      Você é um classificador de queries para um sistema de agentes especializados.

      Agentes disponíveis:
      - backend-architect: Banco de dados, RLS, migrations, schema
      - frontend-core: React, componentes, routing, state
      - atlas-task: Tarefas, timeline, Eisenhower matrix
      - podcast-copilot: Produção de podcast, Gemini Live
      - calendar-executive: Google Calendar, scheduling
      - memories-context: Memórias, contexto emocional, RAG
      - contact-network: Relacionamentos, contatos
      - gamification: XP, levels, achievements
      - finance: Finanças, orçamento, despesas
      - ai-integration: Gemini API, prompts
      - testing-qa: Testes E2E, Playwright
      - security-privacy: GDPR, RLS, segurança

      Query do usuário: "${query}"

      Retorne JSON:
      {
        "primaryAgent": "id-do-agente-principal",
        "multipleAgents": ["id1", "id2"] // se aplicável,
        "params": { /* parâmetros extraídos */ },
        "confidence": 0.95
      }
    `

    const result = await model.generateContent(prompt)
    const response = result.response.text()

    // Parse JSON
    const classification = JSON.parse(response)

    return classification
  }

  // Classificação baseada em keywords (fallback)
  classifyByKeywords(query: string): Classification {
    const lowerQuery = query.toLowerCase()

    const keywordMap = {
      'backend-architect': ['tabela', 'database', 'rls', 'migration', 'schema', 'sql'],
      'podcast-copilot': ['podcast', 'episódio', 'gravação', 'convidado', 'pauta'],
      'calendar-executive': ['calendar', 'agenda', 'evento', 'meeting', 'reunião'],
      'atlas-task': ['task', 'tarefa', 'timeline', 'eisenhower', 'prioridade'],
      'gamification': ['xp', 'level', 'achievement', 'badge', 'streak'],
    }

    for (const [agentId, keywords] of Object.entries(keywordMap)) {
      if (keywords.some(kw => lowerQuery.includes(kw))) {
        return {
          primaryAgent: agentId,
          params: {},
          confidence: 0.7
        }
      }
    }

    // Default
    return {
      primaryAgent: 'frontend-core',
      params: {},
      confidence: 0.5
    }
  }
}
```

---

## 6. Exemplo de Uso

```typescript
// src/components/AgentChat.tsx
import { useState } from 'react'
import { AgentRouter } from '../agents/core/AgentRouter'
import { supabase } from '../services/supabaseClient'

export function AgentChat() {
  const [query, setQuery] = useState('')
  const [response, setResponse] = useState(null)

  const handleSubmit = async () => {
    const context = {
      userId: (await supabase.auth.getUser()).data.user?.id,
      sessionId: crypto.randomUUID(),
      timestamp: new Date(),
      database: supabase,
      permissions: ['database:read']
    }

    const router = new AgentRouter(context)
    const result = await router.route(query)

    setResponse(result)
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Aica Agent Assistant</h2>

      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Pergunte algo ao agente..."
        className="w-full p-2 border rounded mb-2"
        rows={4}
      />

      <button
        onClick={handleSubmit}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Enviar
      </button>

      {response && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <p className="font-bold">Agent: {response.agentId}</p>
          <p className="text-sm text-gray-600">Status: {response.status}</p>
          <p className="mt-2">{response.message}</p>
          {response.data && (
            <pre className="mt-2 text-xs overflow-auto">
              {JSON.stringify(response.data, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
```

---

## 7. Testing

```typescript
// tests/agents/BackendArchitectAgent.test.ts
import { describe, it, expect, beforeEach } from '@playwright/test'
import { BackendArchitectAgent } from '../../src/agents/infrastructure/BackendArchitectAgent'
import { createTestContext } from '../helpers/agentTestHelpers'

describe('BackendArchitectAgent', () => {
  let agent: BackendArchitectAgent
  let context: AgentContext

  beforeEach(() => {
    context = createTestContext()
    agent = new BackendArchitectAgent(context)
  })

  it('should create table with RLS', async () => {
    const response = await agent.execute('Criar tabela test_users', {
      tableName: 'test_users',
      customColumns: ', email TEXT NOT NULL'
    })

    expect(response.status).toBe('success')
    expect(response.data.sql).toContain('CREATE TABLE')
    expect(response.data.sql).toContain('ENABLE ROW LEVEL SECURITY')
  })

  it('should audit security', async () => {
    const response = await agent.execute('Auditar segurança do banco')

    expect(response.status).toBe('success')
    expect(response.data).toHaveProperty('security')
    expect(response.data).toHaveProperty('performance')
  })

  it('should handoff when missing permissions', async () => {
    // Context sem permissões
    context.permissions = []
    agent = new BackendArchitectAgent(context)

    const response = await agent.execute('Criar tabela sensitive_data', {
      tableName: 'sensitive_data'
    })

    expect(response.status).toBe('failure')
    expect(response.message).toContain('Permissão negada')
  })
})
```

---

## 8. Deployment Checklist

- [ ] Criar tabela `agent_audit_log` no Supabase
- [ ] Configurar permissões de agentes no `.env`
- [ ] Implementar rate limiting para queries de agentes
- [ ] Setup monitoring (Sentry, LogRocket)
- [ ] Criar dashboard de performance de agentes
- [ ] Documentar APIs de cada agente
- [ ] Treinar usuários no uso dos agentes
- [ ] Coletar feedback inicial
- [ ] Iterar baseado em métricas

---

**Última Atualização**: 2025-12-06
**Versão**: 1.0
