# Guia Rápido: Criando Agentes Especializados

## Quick Start em 5 Minutos

### 1. Escolha o Agente que Precisa

```
Infraestrutura:
├─ Backend Architect → Database, RLS, migrations
└─ Frontend Core → React, components, routing

Módulos:
├─ Atlas Task → Tasks, timeline, Eisenhower
├─ Podcast Copilot → Produção de podcast
├─ Calendar Executive → Google Calendar sync
├─ Gamification → XP, levels, achievements
├─ Memories & Context → Emotional intelligence
├─ Contact Network → Relacionamentos
├─ Life Dashboard → Life in Weeks
└─ Finance → Orçamento, despesas

Integração:
├─ AI Integration → Gemini API
└─ WhatsApp Integration → Evolution API

Qualidade:
├─ Testing & QA → Playwright E2E
├─ Security & Privacy → GDPR, OWASP
└─ Performance → Optimization
```

---

### 2. Setup Básico

#### Claude Code (Recomendado)

Crie arquivo `.claude/agents/backend-architect.md`:

```markdown
Você é o Backend Architect Agent do Aica Life OS.

# Conhecimento
- docs/architecture/backend_architecture.md
- docs/DATABASE_SCHEMA_NEW_TABLES.sql

# Ferramentas
- mcp__supabase__execute_sql
- mcp__supabase__apply_migration

# Padrões RLS
SEMPRE use SECURITY DEFINER functions:

CREATE OR REPLACE FUNCTION public.check_access(...)
RETURNS BOOLEAN AS $$
BEGIN
  -- logic
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

# Template de Tabela
CREATE TABLE [name] (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE [name] ENABLE ROW LEVEL SECURITY;
```

---

### 3. Teste Rápido

```bash
# No Claude Code
/agent backend-architect "Criar tabela podcast_ratings com RLS"

# Ou ChatGPT
"Usando o Backend Architect Agent, crie uma tabela podcast_ratings"
```

---

## Templates Prontos

### Backend Architect Agent

**Use para:**
- Criar/modificar tabelas
- Implementar RLS policies
- Otimizar queries
- Aplicar migrations

**Exemplo:**
```
"Criar tabela user_preferences com campos:
- theme (light/dark)
- language (pt-BR/en-US)
- notifications_enabled (boolean)

Com RLS para cada usuário ver apenas suas preferências"
```

---

### Podcast Copilot Agent

**Use para:**
- Pesquisar convidados
- Gerar pautas
- Gerenciar gravações
- Features de post-production

**Exemplo:**
```
"Pesquisar perfil de Lex Fridman para episódio sobre AI.
Gerar pauta de 90 minutos com foco em AGI e consciousness."
```

---

### Calendar Executive Agent

**Use para:**
- Sincronizar Google Calendar
- Detectar conflitos
- Sugerir horários
- Integrar eventos com tasks

**Exemplo:**
```
"Sincronizar eventos da próxima semana.
Identificar conflitos com tasks do Atlas.
Sugerir reagendamento para tasks de alta prioridade."
```

---

### Atlas Task Agent

**Use para:**
- CRUD de tasks
- Priorização automática
- Filtros e visualizações
- Timeline management

**Exemplo:**
```
"Criar task 'Revisar código do módulo X' com:
- Prioridade: Urgente + Importante
- Data: Amanhã 14:00
- Duração estimada: 2h
- Vincular ao módulo Podcast"
```

---

### Gamification Agent

**Use para:**
- Calcular XP
- Gerenciar levels
- Desbloquear achievements
- Efficiency scores

**Exemplo:**
```
"Calcular efficiency score dos últimos 7 dias.
Sugerir achievements próximos de desbloquear.
Comparar com média mensal."
```

---

### AI Integration Agent

**Use para:**
- Otimizar prompts
- Gerenciar Gemini API
- Criar embeddings
- Gemini Live integration

**Exemplo:**
```
"Otimizar prompt de geração de pauta para:
- Reduzir tokens em 30%
- Manter qualidade
- Adicionar formatação markdown"
```

---

### Security & Privacy Agent

**Use para:**
- Auditar RLS
- GDPR compliance
- Data subject requests
- Security testing

**Exemplo:**
```
"Auditar RLS policies da tabela memories.
Verificar se está conforme GDPR Article 17 (Right to Erasure).
Gerar relatório de conformidade."
```

---

### Testing & QA Agent

**Use para:**
- Criar testes E2E
- Debugar testes
- Relatórios de cobertura
- CI/CD integration

**Exemplo:**
```
"Criar teste E2E para fluxo:
1. Login
2. Criar episódio de podcast
3. Pesquisar convidado
4. Gerar pauta
5. Iniciar gravação

Verificar estados intermediários."
```

---

## Comunicação Entre Agentes

### Quando Fazer Handoff

```typescript
// Exemplo: Atlas Agent precisa de Calendar Agent
if (needsCalendarSync) {
  return {
    status: 'handoff',
    handoffTo: 'calendar-executive',
    context: {
      task_id: 'uuid-123',
      request: 'Verificar conflitos para task em 2025-12-10 14:00'
    }
  }
}
```

### Fluxo de Handoff

```
User Query → QueryClassifier → Primary Agent → Execute

                                     ↓ (se necessário)

                             Secondary Agent → Execute → Consolidate
```

---

## Comandos Úteis

### Claude Code

```bash
# Listar agentes disponíveis
/agents list

# Invocar agente específico
/agent backend-architect "sua query"

# Múltiplos agentes (paralelo)
/agents [podcast-copilot, ai-integration] "implementar Gemini Live"
```

### ChatGPT

```
@Backend-Architect criar tabela X
@Podcast-Copilot pesquisar convidado Y
@Testing-QA criar teste para fluxo Z
```

---

## Estrutura de Projeto

```
docs/architecture/
├── AGENT_ARCHITECTURE.md          # Visão completa (15 agentes)
├── AGENT_IMPLEMENTATION_GUIDE.md  # Código + exemplos
├── AGENT_PROMPTS.md               # System prompts otimizados
└── AGENT_QUICKSTART.md            # Este arquivo (início rápido)

src/agents/                         # Implementação futura
├── core/
│   ├── AgentRouter.ts
│   ├── AgentBase.ts
│   └── QueryClassifier.ts
├── infrastructure/
├── modules/
├── integration/
└── quality/
```

---

## Roadmap de Implementação

### Semana 1-2: Foundation
- [ ] Implementar `AgentBase` class
- [ ] Criar `AgentRouter` com classifier
- [ ] Setup `Backend Architect Agent`
- [ ] Setup `Frontend Core Agent`
- [ ] Testar handoff protocol

### Semana 3-4: Critical Modules
- [ ] `Atlas Task Agent`
- [ ] `Calendar Executive Agent`
- [ ] `Podcast Copilot Agent`
- [ ] Testing framework

### Semana 5-6: Intelligence Layer
- [ ] `Memories & Context Agent`
- [ ] `AI Integration Agent`
- [ ] `Contact Network Agent`
- [ ] Inter-agent communication

### Semana 7-8: Quality
- [ ] `Testing & QA Agent`
- [ ] `Security & Privacy Agent`
- [ ] `Performance Agent`
- [ ] Monitoring dashboard

### Semana 9-10: Expansion
- [ ] `Gamification Agent`
- [ ] `Life Dashboard Agent`
- [ ] `Finance Agent`
- [ ] `WhatsApp Integration Agent`
- [ ] Analytics & reporting

---

## Métricas de Sucesso

### Por Agente
- Response Time: < 2s (simple), < 10s (complex)
- Accuracy: > 95%
- Coverage: > 90% sem handoff

### Sistema
- User Satisfaction: NPS > 50
- Productivity Gain: 40% redução em dev time
- Error Rate: < 5%
- Handoff Success: > 85%

---

## Troubleshooting

### Agent Não Responde
1. Verificar se query está no escopo do agente
2. Checar permissions do agente
3. Tentar classificação manual via `QueryClassifier`

### Handoff Infinito
1. Verificar loop entre agentes
2. Adicionar max_handoffs = 3
3. Escalar para supervisão humana

### Low Accuracy
1. Refinar system prompt
2. Adicionar exemplos ao knowledge base
3. Treinar classifier com mais dados

---

## Próximos Passos

1. **Escolha 1 agente** para começar (recomendado: Backend Architect)
2. **Copie o system prompt** de `AGENT_PROMPTS.md`
3. **Configure no Claude Code** ou ChatGPT
4. **Teste com queries reais** do seu projeto
5. **Itere** baseado em feedback
6. **Expanda** para outros agentes

---

## Recursos

- **Documentação Completa**: `AGENT_ARCHITECTURE.md`
- **Guia de Implementação**: `AGENT_IMPLEMENTATION_GUIDE.md`
- **System Prompts**: `AGENT_PROMPTS.md`
- **PRD do Aica**: `docs/PRD.md`
- **Backend Architecture**: `docs/architecture/backend_architecture.md`

---

## Suporte

**Issues**:
- Criar issue no repositório com tag `[agent]`
- Incluir: agente, query, resposta esperada vs real

**Discussões**:
- GitHub Discussions para ideias de novos agentes
- Compartilhar prompts otimizados

---

**Última Atualização**: 2025-12-06
**Versão**: 1.0
**Status**: Ready to Use
