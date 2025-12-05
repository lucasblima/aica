# 🏗️ Guia de Arquitetura Profissional - Aica Frontend

**Data:** 2025-12-04
**Versão:** 2.0 (Migração para padrões de produção)

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Problemas Resolvidos](#problemas-resolvidos)
3. [Padrões Aplicados](#padrões-aplicados)
4. [Instruções de Execução](#instruções-de-execução)
5. [Arquivos Modificados](#arquivos-modificados)
6. [Manutenção Futura](#manutenção-futura)

---

## 🎯 Visão Geral

Esta migração transforma o sistema de uma abordagem "apagar incêndios" para uma **arquitetura profissional baseada em padrões de engenharia de software**, especificamente para **React + Supabase/PostgreSQL**.

### Antes vs Depois

| Problema | ❌ Antes | ✅ Depois |
|----------|---------|----------|
| RLS recursivo | Políticas consultam a própria tabela | Security Definer Functions quebram o loop |
| Tipos desalineados | TypeScript ≠ Banco de dados | Tipos gerados automaticamente (Single Source of Truth) |
| Crashes totais | Um erro quebra toda a aplicação | Error Boundaries com graceful degradation |

---

## 🔥 Problemas Resolvidos

### 1. **Erro 500 - Recursão Infinita (42P17)**

**Problema:**
```sql
-- ❌ RECURSIVO - Política consulta a própria tabela
CREATE POLICY "read_members" ON association_members
USING (
  auth.uid() IN (
    SELECT user_id FROM association_members  -- ⚠️ Loop infinito!
    WHERE association_id = association_members.association_id
  )
);
```

**Solução:** Security Definer Functions
```sql
-- ✅ NÃO-RECURSIVO - Função roda com privilégios admin
CREATE FUNCTION is_member_of(_association_id uuid)
RETURNS boolean
SECURITY DEFINER  -- 🔑 Ignora RLS
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM association_members  -- Sem RLS!
    WHERE association_id = _association_id
      AND user_id = auth.uid()
  );
END;
$$;

-- Política usa a função (não-recursiva)
CREATE POLICY "read_members_v2" ON associations
USING (is_member_of(id));  -- ✅ Sem loop!
```

### 2. **Erro 400 - Bad Request (Schema Mismatch)**

**Problema:**
- **Código TypeScript** esperava: `productivity_score`, `tasks_completed`, `mood_score`
- **Banco de dados** tinha: `report_type`, `report_content`, `insights_count`

**Causa Raiz:** Violação do princípio "Single Source of Truth"

**Solução:**
1. **Migration SQL:** Adicionar colunas faltantes no banco
2. **Type Generation:** `supabase gen types typescript` → `database.types.ts`
3. **Importar no código:**
   ```typescript
   import { Database } from './types/database.types'
   const client = createClient<Database>(URL, KEY)
   ```

### 3. **Crashes Totais - "Bootstrap Failed"**

**Problema:**
Se o módulo de Associações falhava, **toda a aplicação travava** (tela branca).

**Solução:** Error Boundaries (React)
```tsx
// App.tsx
<ErrorBoundary fallback={<ModuleErrorFallback moduleName="Associações" />}>
  <AssociationsView />
</ErrorBoundary>
```

**Resultado:** Se Associações quebrar, o usuário ainda pode acessar Perfil, Agenda, etc.

---

## 🏛️ Padrões Aplicados

### 1. **Security Definer Pattern**

**Quando usar:** Sempre que uma política RLS precisar consultar outra tabela.

**Template:**
```sql
-- 1. Criar função SECURITY DEFINER
CREATE OR REPLACE FUNCTION check_permission(_resource_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- ⚠️ Segurança: previne injection
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM permissions_table
    WHERE resource_id = _resource_id
      AND user_id = auth.uid()
  );
END;
$$;

-- 2. Usar função na política (não consultar tabela diretamente)
CREATE POLICY "resource_access" ON resources
USING (check_permission(id));  -- ✅ Não-recursivo
```

### 2. **Single Source of Truth (Type Generation)**

**Workflow:**
```bash
# 1. Fazer mudanças no schema do Supabase (via migration ou Dashboard)
supabase migration new add_columns_to_daily_reports

# 2. Gerar tipos TypeScript automaticamente
npx supabase gen types typescript --project-id gppebtrshbvuzatmebhr > src/types/database.types.ts

# 3. Usar no código
import { Database } from './types/database.types'
type DailyReport = Database['public']['Tables']['daily_reports']['Row']
```

**Benefício:** Se você renomear uma coluna no banco e rodar o gerador, o TypeScript vai **quebrar em tempo de compilação** (evitando erro 400 em produção).

### 3. **Graceful Degradation (Error Boundaries)**

**Estrutura:**
```
src/
├── components/
│   └── ErrorBoundary.tsx  ← Componente reutilizável
└── App.tsx
    └── <ErrorBoundary> ← Envolver módulos críticos
        └── <ModuloCritico />
```

**Uso:**
```tsx
import ErrorBoundary, { ModuleErrorFallback } from './components/ErrorBoundary';

function App() {
  return (
    <div className="app">
      <Sidebar />
      <MainContent>
        {/* Se AgendaView falhar, mostra fallback mas mantém Sidebar funcionando */}
        <ErrorBoundary fallback={<ModuleErrorFallback moduleName="Agenda" />}>
          <AgendaView />
        </ErrorBoundary>
      </MainContent>
    </div>
  );
}
```

---

## 🚀 Instruções de Execução

### **PASSO 1: Executar Migrations SQL**

Você precisa executar **2 migrations** no Supabase Dashboard:

#### Migration 1: Professional RLS Architecture
```bash
# Arquivo: supabase/migrations/20251204_professional_rls_architecture.sql

# O que faz:
# - Cria funções SECURITY DEFINER (is_association_admin, is_association_owner)
# - Adiciona SET search_path às funções existentes (segurança)
# - Remove políticas recursivas problemáticas
# - Cria políticas v2 não-recursivas usando funções
```

**Como executar:**
1. Abra: [Supabase Dashboard](https://supabase.com/dashboard/project/gppebtrshbvuzatmebhr/sql)
2. Copie o conteúdo de `supabase/migrations/20251204_professional_rls_architecture.sql`
3. Cole no SQL Editor
4. Clique "Run" ▶️

#### Migration 2: Fix daily_reports Schema & RLS
```bash
# Arquivo: supabase/migrations/20251204_fix_daily_reports_schema_and_rls.sql

# O que faz:
# - Adiciona colunas faltantes (tasks_completed, productivity_score, etc.)
# - Cria políticas RLS para daily_reports
# - Adiciona índices para performance
```

**Como executar:**
1. Mesma URL do Supabase SQL Editor
2. Copie o conteúdo de `supabase/migrations/20251204_fix_daily_reports_schema_and_rls.sql`
3. Cole no SQL Editor
4. Clique "Run" ▶️

---

### **PASSO 2: Gerar Tipos TypeScript**

Após executar as migrations, **sincronize os tipos**:

```bash
# Opção A: Via Supabase CLI (recomendado)
npx supabase gen types typescript --project-id gppebtrshbvuzatmebhr > src/types/database.types.ts

# Opção B: Já foi gerado e salvo em src/types/database.types.ts
# (Você pode pular este passo se o arquivo já existe)
```

---

### **PASSO 3: Validar Aplicação**

1. **Recarregue o app:**
   ```bash
   # Se estiver rodando npm run dev, apenas recarregue o navegador
   # Ctrl + R ou Cmd + R
   ```

2. **Abra o DevTools:**
   - Pressione F12
   - Vá para a aba "Console"

3. **Verifique se os erros sumiram:**
   - ✅ `associations` → 500 (42P17) - DEVE ESTAR RESOLVIDO
   - ✅ `work_items` → 500 - DEVE ESTAR RESOLVIDO
   - ✅ `daily_reports` → 400 - DEVE ESTAR RESOLVIDO

4. **Teste a navegação Podcast:**
   - Library → Dashboard → Preparation → Studio
   - Verifique que não há headers duplicados
   - Botão "Voltar" deve ir para Preparation (não pular para Dashboard)

---

## 📁 Arquivos Modificados

### Migrations SQL (Execute no Supabase Dashboard)
```
supabase/migrations/
├── 20251204_professional_rls_architecture.sql  ← RLS com Security Definer
└── 20251204_fix_daily_reports_schema_and_rls.sql  ← Schema alignment
```

### Código TypeScript (Já modificado no repo)
```
src/
├── types/
│   └── database.types.ts  ← ✨ NOVO: Tipos gerados do Supabase
├── components/
│   └── ErrorBoundary.tsx  ← ✅ ATUALIZADO: Graceful degradation
├── services/
│   └── dailyReportService.ts  ← ✅ CORRIGIDO: user_id em inserts
├── modules/podcast/views/
│   ├── StudioMode.tsx  ← ✅ CORRIGIDO: Header duplicado removido
│   └── PodcastCopilotView.tsx  ← ✅ CORRIGIDO: Navegação back
```

---

## 🛠️ Manutenção Futura

### Ao criar nova tabela:

1. **Sempre habilitar RLS:**
   ```sql
   ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
   ```

2. **Criar políticas usando funções:**
   ```sql
   -- ❌ NÃO FAÇA:
   USING (user_id IN (SELECT user_id FROM other_table ...))

   -- ✅ FAÇA:
   CREATE FUNCTION has_access(_table_id uuid) RETURNS boolean
   SECURITY DEFINER SET search_path = public AS $$ ... $$;

   CREATE POLICY "access" USING (has_access(id));
   ```

3. **Gerar tipos após mudanças:**
   ```bash
   npx supabase gen types typescript --project-id gppebtrshbvuzatmebhr > src/types/database.types.ts
   ```

### Ao criar novo componente crítico:

```tsx
// ❌ NÃO FAÇA:
function App() {
  return <CriticalComponent />; // Se quebrar, app inteiro quebra
}

// ✅ FAÇA:
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <CriticalComponent />
    </ErrorBoundary>
  );
}
```

---

## 🎓 Referências

- [Supabase RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Security Definer Functions](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [TypeScript Type Generation](https://supabase.com/docs/guides/api/rest/generating-types)

---

## ✅ Checklist de Validação

Após executar as migrations, verifique:

- [ ] Console sem erros 500 (42P17)
- [ ] Console sem erros 400 (Bad Request)
- [ ] Navegação Podcast funcionando (Library → Studio)
- [ ] ErrorBoundary não aparece (tudo carregando corretamente)
- [ ] Políticas RLS verificadas no Dashboard → Database → Policies
- [ ] Tipos TypeScript sincronizados (`database.types.ts` atualizado)

---

**Autor:** Aica System Architecture
**Última atualização:** 2025-12-04
