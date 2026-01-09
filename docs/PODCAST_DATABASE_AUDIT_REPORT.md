# Auditoria de Arquitetura de Banco de Dados - Módulo Podcast

**Data:** 2025-12-10
**Projeto:** Aica Life OS - Podcast Module
**Auditor:** Backend Architect Agent
**Project ID:** uzywajqzbdbrfammshdg

---

## Sumário Executivo

### Status Geral: ⚠️ PROBLEMAS CRÍTICOS IDENTIFICADOS

A auditoria identificou **discrepâncias graves** entre a migration documentada e o schema aplicado no banco de dados, além de ausência total de dados nas tabelas de pautas e pesquisa de convidados.

**Principais Descobertas:**
1. ❌ **Schema Incorreto Aplicado**: Tabela `podcast_generated_pautas` tem campo `project_id` em vez de `episode_id` e `user_id`
2. ❌ **Tabelas Vazias**: 0 registros em `podcast_generated_pautas` e `podcast_guest_research`
3. ❌ **Campos de Contato Ausentes**: Faltam `phone` e `email` em `podcast_guest_research`
4. ⚠️ **RLS Policies Muito Permissivas**: `podcast_generated_pautas` permite acesso público total
5. ✅ **Estrutura de Guest Research**: Bem desenhada, mas faltam campos críticos

---

## 1. PROBLEMA CRÍTICO: Schema Errado Aplicado

### 1.1. Problema Identificado

**Migration Documentada:**
```sql
-- C:/Users/lucas/repos/Aica_frontend/Aica_frontend/supabase/migrations/20251208_podcast_pautas_generated.sql
CREATE TABLE IF NOT EXISTS public.podcast_generated_pautas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES public.podcast_episodes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  theme TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  -- ... outros campos
  UNIQUE(episode_id, version)
);
```

**Schema Aplicado no Banco:**
```sql
-- REAL DATABASE SCHEMA (INCORRETO!)
CREATE TABLE podcast_generated_pautas (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),  -- ❌ ERRADO!
  guest_name TEXT NOT NULL,
  theme TEXT NOT NULL,
  version INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  -- ... outros campos
  UNIQUE(project_id, version)  -- ❌ ERRADO!
);
```

### 1.2. Impacto

- ❌ **Migration não foi aplicada corretamente** no banco de dados
- ❌ **Frontend tentando salvar com `episode_id`** mas banco espera `project_id`
- ❌ **RLS policies usando `episode_id`** mas campo não existe
- ❌ **Falha silenciosa**: Inserts devem estar falhando no backend

### 1.3. Causa Raiz

Provavelmente uma migration antiga foi aplicada e a nova migration (20251208) foi ignorada ou aplicada parcialmente. A tabela `projects` existe no banco com 0 registros, sugerindo que houve uma tentativa de usar um modelo de dados diferente.

---

## 2. Auditoria de `podcast_generated_pautas`

### 2.1. Schema Atual (INCORRETO)

| Campo | Tipo | Nullable | Default | Problema |
|-------|------|----------|---------|----------|
| id | UUID | NO | gen_random_uuid() | ✅ OK |
| **project_id** | UUID | NO | - | ❌ Deveria ser `episode_id` |
| **[user_id AUSENTE]** | - | - | - | ❌ Campo crítico faltando |
| guest_name | TEXT | NO | - | ✅ OK |
| theme | TEXT | NO | - | ✅ OK |
| version | INTEGER | NO | 1 | ✅ OK |
| is_active | BOOLEAN | YES | TRUE | ✅ OK |
| research_summary | TEXT | YES | NULL | ✅ OK |
| biography | TEXT | YES | NULL | ✅ OK |
| key_facts | TEXT[] | YES | NULL | ✅ OK |
| controversies | JSONB | YES | '[]'::jsonb | ✅ OK |
| technical_sheet | JSONB | YES | '{}'::jsonb | ✅ OK |
| outline_title | TEXT | YES | NULL | ✅ OK |
| estimated_duration | INTEGER | YES | NULL | ✅ OK |
| confidence_score | INTEGER | YES | NULL | ✅ OK |
| tone | TEXT | YES | NULL | ✅ OK |
| depth | TEXT | YES | NULL | ✅ OK |
| focus_areas | TEXT[] | YES | NULL | ✅ OK |
| ice_breakers | TEXT[] | YES | NULL | ✅ OK |
| additional_context | TEXT | YES | NULL | ✅ OK |
| created_at | TIMESTAMPTZ | YES | NOW() | ✅ OK |
| updated_at | TIMESTAMPTZ | YES | NOW() | ✅ OK |

### 2.2. Constraints (INCORRETAS)

- PRIMARY KEY: `id` ✅
- FOREIGN KEY: `project_id` → `projects(id)` ❌ (deveria ser `episode_id` → `podcast_episodes(id)`)
- UNIQUE: `(project_id, version)` ❌ (deveria ser `(episode_id, version)`)

### 2.3. RLS Policies (CRÍTICO!)

```sql
-- POLÍTICAS ATUAIS (INSEGURAS!)
CREATE POLICY "Allow public read access on pautas"
  ON podcast_generated_pautas FOR SELECT
  USING (true);  -- ❌ ACESSO PÚBLICO TOTAL!

CREATE POLICY "Allow public insert access on pautas"
  ON podcast_generated_pautas FOR INSERT
  WITH CHECK (true);  -- ❌ QUALQUER UM PODE INSERIR!

CREATE POLICY "Allow public update access on pautas"
  ON podcast_generated_pautas FOR UPDATE
  USING (true);  -- ❌ QUALQUER UM PODE ATUALIZAR!

CREATE POLICY "Allow public delete access on pautas"
  ON podcast_generated_pautas FOR DELETE
  USING (true);  -- ❌ QUALQUER UM PODE DELETAR!
```

**PROBLEMA GRAVE DE SEGURANÇA:** Qualquer usuário pode acessar, modificar e deletar pautas de qualquer outro usuário!

### 2.4. Triggers

✅ `trigger_increment_pauta_version` - OK, mas usa campo errado (`project_id`)
✅ `trigger_update_podcast_pautas_updated_at` - OK

### 2.5. Dados

**Registros na tabela:** 0
**Status:** ❌ Nenhuma pauta foi salva com sucesso

---

## 3. Auditoria de `podcast_guest_research`

### 3.1. Schema Atual

| Campo | Tipo | Nullable | Default | Status |
|-------|------|----------|---------|--------|
| id | UUID | NO | gen_random_uuid() | ✅ OK |
| episode_id | UUID | NO | - | ✅ OK |
| guest_name | TEXT | NO | - | ✅ OK |
| guest_reference | TEXT | YES | NULL | ✅ OK |
| profile_search_completed | BOOLEAN | YES | FALSE | ✅ OK |
| profile_search_at | TIMESTAMPTZ | YES | NULL | ✅ OK |
| profile_confidence_score | INTEGER | YES | NULL | ✅ OK |
| biography | TEXT | YES | NULL | ✅ OK |
| bio_summary | TEXT | YES | NULL | ✅ OK |
| bio_sources | JSONB | YES | '[]'::jsonb | ✅ OK |
| full_name | TEXT | YES | NULL | ✅ OK |
| birth_date | DATE | YES | NULL | ✅ OK |
| birth_place | TEXT | YES | NULL | ✅ OK |
| nationality | TEXT | YES | NULL | ✅ OK |
| occupation | TEXT | YES | NULL | ✅ OK |
| known_for | TEXT | YES | NULL | ✅ OK |
| education | TEXT | YES | NULL | ✅ OK |
| awards | JSONB | YES | '[]'::jsonb | ✅ OK |
| social_media | JSONB | YES | '{}'::jsonb | ✅ OK |
| controversies | JSONB | YES | '[]'::jsonb | ✅ OK |
| recent_news | JSONB | YES | '[]'::jsonb | ✅ OK |
| custom_sources | JSONB | YES | '[]'::jsonb | ✅ OK |
| chat_history | JSONB | YES | '[]'::jsonb | ✅ OK |
| low_context_warning | BOOLEAN | YES | FALSE | ✅ OK |
| research_quality_score | INTEGER | YES | NULL | ✅ OK |
| created_at | TIMESTAMPTZ | YES | NOW() | ✅ OK |
| updated_at | TIMESTAMPTZ | YES | NOW() | ✅ OK |

### 3.2. Campos Ausentes (REPORTADOS PELO USUÁRIO)

❌ **`phone` (TEXT)** - Campo de telefone do convidado
❌ **`email` (TEXT)** - Campo de email do convidado
❌ **`guest_category` (ENUM)** - Categorização: 'public_figure', 'common_person', 'expert', 'influencer'
❌ **`approved_by_guest` (BOOLEAN)** - Convidado aprovou informações?
❌ **`approved_at` (TIMESTAMPTZ)** - Quando aprovou?
❌ **`approval_notes` (TEXT)** - Notas sobre aprovação/correções

### 3.3. Constraints

- PRIMARY KEY: `id` ✅
- FOREIGN KEY: `episode_id` → `podcast_episodes(id)` ✅
- CHECK: `profile_confidence_score` entre 0-100 ✅
- CHECK: `research_quality_score` entre 0-100 ✅

### 3.4. RLS Policies

✅ **Políticas corretas usando SECURITY DEFINER:**

```sql
CREATE POLICY "podcast_guest_research_select"
  ON podcast_guest_research FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM podcast_episodes
      WHERE podcast_episodes.id = podcast_guest_research.episode_id
        AND podcast_episodes.user_id = auth.uid()
    )
  );
-- E similar para INSERT, UPDATE, DELETE
```

**Status:** ✅ RLS está implementado corretamente, verificando ownership via `podcast_episodes.user_id`.

### 3.5. Triggers

✅ `trigger_update_podcast_guest_research_updated_at` - OK

### 3.6. Dados

**Registros na tabela:** 0
**Status:** ❌ Nenhuma pesquisa de convidado foi salva

---

## 4. Auditoria de Índices e Performance

### 4.1. `podcast_generated_pautas`

❌ **Índices ausentes para campos críticos:**

| Índice Necessário | Status | Impacto |
|-------------------|--------|---------|
| `idx_podcast_pautas_episode_id` | ❌ Ausente (campo não existe) | Performance de queries por episódio |
| `idx_podcast_pautas_user_id` | ❌ Ausente (campo não existe) | Performance de queries por usuário |
| `idx_podcast_pautas_project_id` | ✅ Existe (mas é campo errado) | - |

### 4.2. `podcast_guest_research`

⚠️ **Índice ausente:**

| Índice Necessário | Status | Impacto |
|-------------------|--------|---------|
| `idx_podcast_guest_research_episode_id` | ❌ Ausente | Queries por episódio serão lentas |

**Recomendação:**
```sql
CREATE INDEX idx_podcast_guest_research_episode_id
  ON podcast_guest_research(episode_id);
```

### 4.3. Outras Tabelas do Podcast

⚠️ **Foreign keys sem índices (Supabase Advisor):**

- `podcast_briefings.episode_id` - sem índice
- `podcast_news_articles.episode_id` - sem índice
- `podcast_research.episode_id` - sem índice
- `podcast_shows.user_id` - sem índice

---

## 5. Auditoria de Segurança (Supabase Advisors)

### 5.1. Alertas Críticos

#### 🔴 RLS Disabled (CRÍTICO)
```
Table `public.contact_network` is public, but RLS has not been enabled.
```

#### 🟡 RLS Enabled No Policy (INFO)
```
Table `public.podcast_news_articles` has RLS enabled, but no policies exist.
Table `public.task_metrics` has RLS enabled, but no policies exist.
```

#### 🟡 Security Definer View (WARNING)
```
View `public.podcast_shows_with_stats` is defined with the SECURITY DEFINER property.
```

### 5.2. Function Search Path Mutable (MUITOS WARNINGS)

As seguintes functions não têm `search_path` definido (vulnerabilidade de segurança):

- `increment_pauta_version()`
- `update_podcast_pautas_updated_at()`
- `update_podcast_guest_research_updated_at()`
- `get_active_pauta()`
- `list_pauta_versions()`

**Recomendação:** Adicionar `SET search_path = public` em todas as functions.

---

## 6. Diagnóstico: Por Que as Pautas Não Persistem?

### 6.1. Fluxo Atual (QUEBRADO)

```
[Frontend] PautaGeneratorPanel.tsx
  └─ handleApplyPauta()
      └─ pautaPersistenceService.savePauta({
          episodeId: episode.id,  // ✅ Enviando episode_id
          userId: user.id,         // ✅ Enviando user_id
          ...
        })
          └─ INSERT INTO podcast_generated_pautas (
              episode_id,  // ❌ CAMPO NÃO EXISTE!
              user_id,     // ❌ CAMPO NÃO EXISTE!
              ...
            ) VALUES (...)
              └─ ❌ ERRO: column "episode_id" does not exist
                    Hint: Perhaps you meant to reference the column "podcast_generated_pautas.project_id"
```

### 6.2. Por Que Cadastro de Convidados Falha?

✅ **`podcast_guest_research` tem schema correto**, MAS:

1. ❌ **Faltam campos essenciais**: `phone`, `email`, `guest_category`
2. ❌ **Faltam campos de aprovação**: `approved_by_guest`, `approved_at`, `approval_notes`
3. ⚠️ **Frontend pode não estar salvando** porque a pauta não persiste primeiro

---

## 7. Proposta de Correção: Migration Completa

### 7.1. Estratégia de Correção

**Opção 1: Recriar Tabela (RECOMENDADO SE SEM DADOS)**
```sql
-- Como não há dados, podemos DROP e recriar
DROP TABLE IF EXISTS podcast_generated_pautas CASCADE;

-- Aplicar migration correta
-- (copiar de 20251208_podcast_pautas_generated.sql)
```

**Opção 2: Alterar Tabela Existente (SE HOUVER DADOS)**
```sql
-- Adicionar novos campos
ALTER TABLE podcast_generated_pautas
  ADD COLUMN episode_id UUID,
  ADD COLUMN user_id UUID;

-- Migrar dados (se houver)
UPDATE podcast_generated_pautas
SET episode_id = (SELECT episode_id FROM projects WHERE id = project_id),
    user_id = (SELECT user_id FROM projects WHERE id = project_id);

-- Tornar campos NOT NULL
ALTER TABLE podcast_generated_pautas
  ALTER COLUMN episode_id SET NOT NULL,
  ALTER COLUMN user_id SET NOT NULL;

-- Adicionar FKs
ALTER TABLE podcast_generated_pautas
  ADD CONSTRAINT podcast_generated_pautas_episode_id_fkey
    FOREIGN KEY (episode_id) REFERENCES podcast_episodes(id) ON DELETE CASCADE,
  ADD CONSTRAINT podcast_generated_pautas_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Remover campos antigos
ALTER TABLE podcast_generated_pautas
  DROP CONSTRAINT podcast_generated_pautas_project_id_fkey,
  DROP CONSTRAINT podcast_generated_pautas_project_id_version_key,
  DROP COLUMN project_id;

-- Adicionar constraint correta
ALTER TABLE podcast_generated_pautas
  ADD CONSTRAINT podcast_generated_pautas_episode_version_key
    UNIQUE (episode_id, version);
```

### 7.2. Correção de RLS Policies

```sql
-- Remover policies públicas perigosas
DROP POLICY IF EXISTS "Allow public read access on pautas" ON podcast_generated_pautas;
DROP POLICY IF EXISTS "Allow public insert access on pautas" ON podcast_generated_pautas;
DROP POLICY IF EXISTS "Allow public update access on pautas" ON podcast_generated_pautas;
DROP POLICY IF EXISTS "Allow public delete access on pautas" ON podcast_generated_pautas;

-- Aplicar policies corretas da migration
-- (copiar seção 8 de 20251208_podcast_pautas_generated.sql)
```

### 7.3. Adicionar Campos em `podcast_guest_research`

```sql
-- Campos de contato
ALTER TABLE podcast_guest_research
  ADD COLUMN phone TEXT,
  ADD COLUMN email TEXT;

-- Categorização de convidado
CREATE TYPE guest_category_enum AS ENUM (
  'public_figure',
  'common_person',
  'expert',
  'influencer',
  'entrepreneur',
  'artist',
  'athlete',
  'politician',
  'other'
);

ALTER TABLE podcast_guest_research
  ADD COLUMN guest_category guest_category_enum DEFAULT 'other';

-- Aprovação de conteúdo
ALTER TABLE podcast_guest_research
  ADD COLUMN approved_by_guest BOOLEAN DEFAULT FALSE,
  ADD COLUMN approved_at TIMESTAMPTZ,
  ADD COLUMN approval_notes TEXT;

-- Comentários
COMMENT ON COLUMN podcast_guest_research.phone IS
  'Telefone de contato do convidado (para confirmação de participação)';
COMMENT ON COLUMN podcast_guest_research.email IS
  'Email de contato do convidado (para envio de briefing e aprovação)';
COMMENT ON COLUMN podcast_guest_research.guest_category IS
  'Categorização do convidado (ajuda na preparação de perguntas contextualizadas)';
COMMENT ON COLUMN podcast_guest_research.approved_by_guest IS
  'TRUE se convidado aprovou informações biográficas e perfil gerado pela IA';
COMMENT ON COLUMN podcast_guest_research.approved_at IS
  'Timestamp quando convidado aprovou informações';
COMMENT ON COLUMN podcast_guest_research.approval_notes IS
  'Correções ou observações feitas pelo convidado sobre seu perfil';
```

### 7.4. Adicionar Índices de Performance

```sql
-- Índices para podcast_generated_pautas (APÓS CORREÇÃO)
CREATE INDEX IF NOT EXISTS idx_podcast_pautas_episode_id
  ON podcast_generated_pautas(episode_id);
CREATE INDEX IF NOT EXISTS idx_podcast_pautas_user_id
  ON podcast_generated_pautas(user_id);
CREATE INDEX IF NOT EXISTS idx_podcast_pautas_is_active
  ON podcast_generated_pautas(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_podcast_pautas_created_at
  ON podcast_generated_pautas(created_at DESC);

-- Índices para podcast_guest_research
CREATE INDEX IF NOT EXISTS idx_podcast_guest_research_episode_id
  ON podcast_guest_research(episode_id);
CREATE INDEX IF NOT EXISTS idx_podcast_guest_research_guest_category
  ON podcast_guest_research(guest_category);
CREATE INDEX IF NOT EXISTS idx_podcast_guest_research_approved
  ON podcast_guest_research(approved_by_guest)
  WHERE approved_by_guest = TRUE;

-- Índices para outras tabelas podcast
CREATE INDEX IF NOT EXISTS idx_podcast_briefings_episode_id
  ON podcast_briefings(episode_id);
CREATE INDEX IF NOT EXISTS idx_podcast_news_articles_episode_id
  ON podcast_news_articles(episode_id);
CREATE INDEX IF NOT EXISTS idx_podcast_research_episode_id
  ON podcast_research(episode_id);
CREATE INDEX IF NOT EXISTS idx_podcast_shows_user_id
  ON podcast_shows(user_id);
```

---

## 8. Migration Proposta: `20251210_fix_podcast_pautas_schema.sql`

Criarei uma migration completa para corrigir todos os problemas identificados.

---

## 9. Recomendações de Ação Imediata

### Prioridade CRÍTICA 🔴

1. **Aplicar Migration de Correção**
   - Executar `20251210_fix_podcast_pautas_schema.sql`
   - Verificar que `episode_id` e `user_id` foram criados
   - Confirmar que RLS policies foram atualizadas

2. **Testar Persistência**
   - Gerar uma pauta no frontend
   - Verificar que salvou no banco
   - Confirmar que apenas o dono pode ver

3. **Adicionar Campos de Contato**
   - Adicionar `phone`, `email` em `podcast_guest_research`
   - Atualizar frontend para coletar esses dados

### Prioridade ALTA 🟡

4. **Adicionar Categorização e Aprovação**
   - Criar enum `guest_category_enum`
   - Adicionar campos de aprovação
   - Criar UI para convidado aprovar informações

5. **Melhorar Performance**
   - Adicionar todos os índices recomendados
   - Monitorar queries lentas

6. **Corrigir Segurança**
   - Adicionar `SET search_path = public` em todas as functions
   - Habilitar RLS em `contact_network`
   - Adicionar policies em `podcast_news_articles`

### Prioridade MÉDIA 🟢

7. **Documentação**
   - Atualizar docs com schema correto
   - Criar guia de teste de RLS
   - Documentar fluxo de aprovação de convidado

8. **Testes**
   - Criar testes automatizados de RLS
   - Testar versionamento de pautas
   - Testar CASCADE deletes

---

## 10. Conclusão

### Resumo dos Problemas

| Problema | Severidade | Status | Impacto |
|----------|-----------|--------|---------|
| Schema incorreto de `podcast_generated_pautas` | 🔴 CRÍTICO | ❌ Bloqueante | Pautas não salvam |
| RLS policies públicas em pautas | 🔴 CRÍTICO | ❌ Vulnerabilidade | Dados expostos |
| Campos de contato ausentes | 🟡 ALTO | ❌ Feature incompleta | Cadastro falha |
| Campos de aprovação ausentes | 🟡 ALTO | ❌ Feature incompleta | Workflow incompleto |
| Índices de performance ausentes | 🟢 MÉDIO | ⚠️ Degradação | Queries lentas |
| Functions sem search_path | 🟢 MÉDIO | ⚠️ Vulnerabilidade | Risco de injeção |

### Próximos Passos

1. ✅ **Aplicar migration de correção** (arquivo gerado a seguir)
2. ✅ **Testar salvamento de pautas** no frontend
3. ✅ **Adicionar campos de contato** e atualizar UI
4. ✅ **Implementar fluxo de aprovação** de convidado
5. ✅ **Monitorar logs** para erros de inserção

### Tempo Estimado de Correção

- Migration e testes: **30 minutos**
- Frontend (campos de contato): **1 hora**
- Fluxo de aprovação: **2-3 horas**
- **Total: ~4 horas**

---

## Arquivos Gerados

1. `C:/Users/lucas/repos/Aica_frontend/Aica_frontend/supabase/migrations/20251210_fix_podcast_pautas_schema.sql` - Migration completa de correção
2. `C:/Users/lucas/repos/Aica_frontend/Aica_frontend/docs/PODCAST_DATABASE_AUDIT_REPORT.md` - Este relatório

---

**Relatório Completo | Backend Architect Agent | 2025-12-10**
