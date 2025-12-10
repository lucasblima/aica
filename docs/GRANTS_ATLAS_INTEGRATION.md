# Integração Grants-Atlas: Sistema de Tarefas Contextuais

## Visão Geral

Este documento descreve a implementação da integração entre o módulo **Grants** e o módulo **Atlas** (sistema de tarefas), permitindo a criação automática de tarefas contextuais quando projetos de edital são criados.

## Migrations Aplicadas

### 1. Migration Principal: `20251209_grants_metadata_and_atlas_integration`

**Data de Aplicação:** 2025-12-09

**Componentes:**

#### 1.1. Coluna `metadata` em `grant_opportunities`
```sql
ALTER TABLE grant_opportunities
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
```

**Propósito:** Armazenar metadados customizados de editais, incluindo etapas (steps), requisitos e outros dados específicos.

**Exemplo de Uso:**
```json
{
  "steps": [
    {
      "title": "Cadastro no sistema FAPERJ",
      "description": "Realizar cadastro institucional no SisFAPERJ",
      "deadline": "2025-03-15",
      "priority": "high",
      "type": "external_action",
      "metadata": {"url": "https://sisfaperj.faperj.br"}
    },
    {
      "title": "Submissão de carta de intenção",
      "description": "Enviar carta de intenção (máx. 2 páginas)",
      "deadline": "2025-03-30",
      "priority": "critical",
      "type": "document_upload"
    }
  ]
}
```

**Índice GIN:** `idx_grant_opportunities_metadata` para buscas eficientes em JSON.

#### 1.2. Coluna `metadata` em `work_items` (Atlas)
```sql
ALTER TABLE work_items
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
```

**Propósito:** Armazenar contexto de origem das tarefas, permitindo rastreamento bidirecional entre módulos.

**Exemplo de Uso:**
```json
{
  "source": "grants",
  "grant_task_type": "briefing",
  "project_id": "uuid-do-projeto",
  "opportunity_id": "uuid-da-oportunidade",
  "auto_generated": true,
  "created_by_trigger": true
}
```

**Índice GIN:** `idx_work_items_metadata` para queries eficientes.

#### 1.3. Função Helper: `get_or_create_captacao_life_area`

```sql
CREATE OR REPLACE FUNCTION public.get_or_create_captacao_life_area(
  p_user_id UUID
) RETURNS UUID
```

**Propósito:** Cria ou retorna a life area "Captação" para organizar tarefas relacionadas a editais.

**Características:**
- `SECURITY DEFINER` para executar com permissões elevadas
- `SET search_path = public` para segurança
- Cria life area com:
  - Nome: "Captação"
  - Slug: "captacao"
  - Ícone: 💰
  - Cor: #10b981 (verde)

#### 1.4. Trigger Function: `create_grant_tasks_on_project_insert`

```sql
CREATE OR REPLACE FUNCTION public.create_grant_tasks_on_project_insert()
RETURNS TRIGGER
```

**Propósito:** Automaticamente cria tarefa no Atlas quando novo projeto de edital é criado.

**Fluxo:**
1. Busca título da oportunidade relacionada
2. Obtém ou cria life area "Captação"
3. Cria tarefa "Completar contexto do projeto"
4. Inclui metadata rastreando origem (grants module)

**Tarefa Criada:**
- **Título:** "Completar contexto do projeto"
- **Descrição:** "Preencha as informações sobre seu projeto para o edital: [Nome do Edital]"
- **Prioridade:** `high`
- **Status:** `is_completed = false`
- **Life Area:** Captação (💰)

#### 1.5. Trigger: `trigger_create_grant_tasks`

```sql
CREATE TRIGGER trigger_create_grant_tasks
AFTER INSERT ON grant_projects
FOR EACH ROW
EXECUTE FUNCTION create_grant_tasks_on_project_insert();
```

**Execução:** Após cada inserção em `grant_projects`.

### 2. Migration de Correção: `20251209_fix_life_area_creation_function`

**Propósito:** Corrigir função `get_or_create_captacao_life_area` para corresponder ao schema real de `life_areas`.

**Problema Resolvido:** Schema de `life_areas` não tinha coluna `description`, mas tinha `slug` e `color` obrigatórios.

## Teste Executado

### Cenário de Teste
1. Criada oportunidade: "Edital 32/2025 - FAPERJ Apoio a Projetos Temáticos [TESTE]"
2. Criado projeto: "Projeto de Teste - Inteligência Artificial na Educação"
3. Trigger disparado automaticamente

### Resultados
✅ **Life Area criada:**
- ID: `42faef61-f182-46d4-ae69-096858e6ec4b`
- Nome: "Captação"
- Ícone: 💰
- Cor: #10b981

✅ **Tarefa criada:**
- ID: `231ca3c4-b2e6-4609-93bc-f7c02075e639`
- Título: "Completar contexto do projeto"
- Descrição: "Preencha as informações sobre seu projeto para o edital: Edital 32/2025 - FAPERJ Apoio a Projetos Temáticos [TESTE]"
- Prioridade: `high`
- Life Area: Captação
- Metadata: Contém referências a `project_id`, `opportunity_id`, `source: grants`

✅ **Dados de teste removidos** após validação.

## Auditoria de Segurança

### Alertas Identificados (Não Críticos)

**1. Tabelas sem RLS policies:**
- `podcast_news_articles` - INFO
- `task_metrics` - INFO

**2. Funções sem search_path fixo:**
- Múltlas funções com `search_path` mutável - WARN
- **Ação Recomendada:** Adicionar `SET search_path = public` em futuras funções

**3. Performance:**
- Várias políticas RLS re-avaliam `auth.uid()` por linha
- **Ação Recomendada:** Usar `(SELECT auth.uid())` em vez de `auth.uid()` direto

**4. Chaves estrangeiras sem índices:**
- `work_items.life_area_id` - INFO
- `work_items.life_event_id` - INFO
- `work_items.user_id` - INFO
- **Ação Recomendada:** Criar índices para melhorar performance de JOINs

### Alertas Críticos
❌ **RLS Desabilitado:**
- `contact_network` - ERROR
- **Ação Necessária:** Habilitar RLS nesta tabela

⚠️ **View com SECURITY DEFINER:**
- `podcast_shows_with_stats` - ERROR
- **Ação Recomendada:** Revisar se é realmente necessário

## Uso no Frontend

### 1. Consultar Tarefas de um Projeto

```typescript
const { data: tasks } = await supabase
  .from('work_items')
  .select('*')
  .eq('metadata->source', 'grants')
  .eq('metadata->project_id', projectId);
```

### 2. Atualizar Metadata de Oportunidade

```typescript
const { data, error } = await supabase
  .from('grant_opportunities')
  .update({
    metadata: {
      steps: [
        {
          title: "Cadastro no sistema",
          description: "Realizar cadastro",
          deadline: "2025-03-15",
          priority: "high",
          type: "external_action"
        }
      ]
    }
  })
  .eq('id', opportunityId);
```

### 3. Criar Projeto (Trigger Automático)

```typescript
// Ao criar projeto, tarefa é criada automaticamente
const { data: newProject } = await supabase
  .from('grant_projects')
  .insert({
    user_id: userId,
    opportunity_id: opportunityId,
    project_name: "Meu Projeto",
    status: "draft"
  })
  .select()
  .single();

// Tarefa já foi criada em work_items automaticamente!
```

## Próximos Passos

### Melhorias Recomendadas

1. **Adicionar índices de performance:**
   ```sql
   CREATE INDEX idx_work_items_user_id ON work_items(user_id);
   CREATE INDEX idx_work_items_life_area_id ON work_items(life_area_id);
   ```

2. **Criar função para gerar tarefas a partir de steps:**
   - Ler `grant_opportunities.metadata.steps`
   - Criar múltiplas tarefas no Atlas automaticamente
   - Sincronizar deadlines

3. **Sincronização bidirecional:**
   - Quando tarefa é completada → atualizar `grant_projects.completion_percentage`
   - Quando projeto muda de status → atualizar tarefas relacionadas

4. **Habilitar RLS em `contact_network`:**
   ```sql
   ALTER TABLE contact_network ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Users can manage own contacts"
     ON contact_network FOR ALL
     USING (user_id = auth.uid());
   ```

## Arquivos Relacionados

- Migration: `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\supabase\migrations\20251209_grants_metadata_and_atlas_integration.sql`
- Migration (fix): `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\supabase\migrations\20251209_fix_life_area_creation_function.sql`
- Documentação: Este arquivo

## Changelog

- **2025-12-09:** Implementação inicial da integração Grants-Atlas
- **2025-12-09:** Correção de schema `life_areas` na função helper
- **2025-12-09:** Testes executados com sucesso
- **2025-12-09:** Dados de teste removidos
- **2025-12-09:** Auditoria de segurança e performance concluída
