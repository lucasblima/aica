# BE-01: Guia de Implementação - Daily Reports Automation

## Quick Start (15 minutos)

### Pré-requisitos
- Acesso ao Supabase dashboard
- Arquivo `src/services/dailyReportService.ts` (já existe)
- Arquivo `src/App.tsx` com hook de autenticação

### Passo 1: Deploy da Migration (5 min)

```bash
# 1. Copiar arquivo SQL
cp migrations/20251212_daily_reports_generation.sql /seu-projeto/

# 2. Executar no Supabase SQL Editor
# Ir para: https://app.supabase.com/project/[PROJECT_ID]/sql/new
# Copiar conteúdo de 20251212_daily_reports_generation.sql
# Click "Execute"

# Verificação:
# SELECT proname FROM pg_proc WHERE proname = 'generate_daily_report';
# Deve retornar 1 linha
```

**O que faz:**
- Cria função `generate_daily_report(UUID, DATE)` no PostgreSQL
- Cria índices de performance
- Cria trigger para atualizar `updated_at`

### Passo 2: Verificar `dailyReportService.ts` (3 min)

O arquivo já existe em `src/services/dailyReportService.ts`, mas pode precisar de ajustes.

**Comparar com o serviço esperado:**

```typescript
// Estas funções devem existir:
- generateDailyReport(userId, reportDate)
- generateMissingDailyReports(userId)
- hasTodayReport(userId)
- getDailyReport(userId, reportDate)
```

**Se usar versão auxiliar:**

Se preferir versão simplificada, copie `src/services/dailyReportService.simplified.ts`

### Passo 3: Integrar em `App.tsx` (5 min)

Localize seu hook de autenticação em `App.tsx`:

```typescript
import { generateMissingDailyReports } from './services/dailyReportService';

export function App() {
  useEffect(() => {
    // Seu código de autenticação existente
    const handleAuthStateChange = async (user: User | null) => {
      if (user) {
        // Adicionar esta linha:
        const result = await generateMissingDailyReports(user.id);
        console.log('Daily reports generated:', result);
      }
    };

    // Seu onAuthStateChange ou similar...
  }, []);

  // resto do componente
}
```

**Locais comuns:**
- `App.tsx` - Dentro de `useEffect(() => { onAuthStateChange(...) }, [])`
- `AuthLayout.tsx` - Após login bem-sucedido
- `useAuth.ts` - Hook customizado

---

## Integração Detalhada

### Opção A: Integration na Raiz da App (RECOMENDADO)

**Arquivo: `src/App.tsx`**

```typescript
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './services/supabaseClient';
import { generateMissingDailyReports } from './services/dailyReportService';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Recuperar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        // Gerar relatórios faltando
        generateMissingDailyReports(session.user.id)
          .then(result => {
            if (result.success) {
              console.log(`Generated ${result.daysGenerated} daily reports`);
            } else if (result.error) {
              console.warn('Failed to generate reports:', result.error);
            }
          })
          .catch(err => console.error('Unexpected error:', err));
      }
      setLoading(false);
    });

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        // Gerar relatórios faltando
        await generateMissingDailyReports(session.user.id);
      } else {
        setUser(null);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <>
      {user ? (
        <MainApp user={user} />
      ) : (
        <LoginScreen />
      )}
    </>
  );
}
```

### Opção B: Integration em Serviço de Auth

**Arquivo: `src/services/authService.ts`**

```typescript
export async function handleAuthSuccess(user: User) {
  // Seu código existente...

  // Adicionar geração de relatórios
  const { generateMissingDailyReports } = await import('./dailyReportService');
  generateMissingDailyReports(user.id).catch(err =>
    console.warn('Failed to generate daily reports:', err)
  );
}
```

### Opção C: Integration em Custom Hook

**Arquivo: `src/hooks/useAuthWithDailyReports.ts`** (novo)

```typescript
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { generateMissingDailyReports } from '../services/dailyReportService';

export function useAuthWithDailyReports() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    // Setup auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);

          // Gerar relatórios em background
          try {
            const result = await generateMissingDailyReports(session.user.id);
            if (!result.success && result.error) {
              setReportError(result.error);
            }
          } catch (err) {
            console.warn('Error generating reports:', err);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  return { user, loading, reportError };
}
```

---

## Validação

### Verificação 1: Função SQL Criada

```sql
-- No Supabase SQL Editor:
SELECT proname, pronargs, prosecdef
FROM pg_proc
WHERE proname = 'generate_daily_report';

-- Esperado: 1 linha com prosecdef = true (SECURITY DEFINER)
```

### Verificação 2: Índices Criados

```sql
SELECT indexname FROM pg_indexes
WHERE tablename IN ('work_items', 'daily_question_responses', 'memories', 'daily_reports')
ORDER BY indexname;

-- Esperado: ver índices do tipo idx_*_user_date
```

### Verificação 3: Teste Manual

```typescript
// No console do navegador após login:
import { generateDailyReport } from './services/dailyReportService';

// Gerar para hoje:
const today = new Date().toISOString().split('T')[0];
const result = await generateDailyReport(
  'seu-user-id-aqui',
  today
);

console.log('Result:', result);
// Esperado: { success: true, reportId: 'uuid-aqui' }
```

### Verificação 4: Verificar Dados Gerados

```typescript
// No console do navegador:
import { getDailyReport } from './services/dailyReportService';

const today = new Date().toISOString().split('T')[0];
const report = await getDailyReport('seu-user-id-aqui', today);

console.log('Report:', report);
// Esperado: Objeto com fields: tasks_completed, productivity_score, etc.
```

### Verificação 5: Ver no EfficiencyTrendChart

1. Completar algumas tarefas
2. Acessar a tela de eficiência/dashboard
3. O componente `EfficiencyTrendChart` deve mostrar dados em vez de "A mente está silenciosa hoje"

---

## Troubleshooting

### Erro: "function generate_daily_report does not exist"

**Causa**: Migration não foi executada

**Solução**:
1. Ir para Supabase SQL Editor
2. Executar `migrations/20251212_daily_reports_generation.sql`
3. Confirmar sucesso com query de verificação

### Erro: "Permission denied for schema public"

**Causa**: Permissões insuficientes

**Solução**:
1. Usar conta admin/proprietário do projeto
2. Ou verificar RLS policies

### Erro: "user_id mismatch in RLS"

**Causa**: `auth.uid()` não corresponde ao `user_id` em daily_reports

**Solução**:
1. Verificar que `user_id` em daily_reports é UUID correto
2. Confirmar que `auth.users(id)` é mesmo UUID

### Nenhum relatório gerado

**Verificações**:
1. Usuário tem tarefas completadas?
   ```sql
   SELECT COUNT(*) FROM work_items WHERE user_id = 'xxx' AND completed_at IS NOT NULL;
   ```

2. Tabela `daily_question_responses` existe?
   ```sql
   SELECT table_name FROM information_schema.tables WHERE table_name = 'daily_question_responses';
   ```

3. Logs do console mostram erros?
   - Verificar DevTools Console
   - Procurar por erros em `generateMissingDailyReports`

---

## Performance Esperada

### Tempo de Execução

| Operação | Tempo |
|----------|-------|
| `generateDailyReport()` (1 dia) | 50-200ms |
| `generateMissingDailyReports()` (30 dias) | 2-5s |
| Login com geração | +300-500ms |

### Otimizações Implementadas

- Índices em `work_items(user_id, created_at, completed_at)`
- Índices em `daily_question_responses(user_id, created_at)`
- Batch processing para múltiplos dias (max 10 concorrentes)
- UPSERT para operações idempotentes

---

## Monitoramento em Produção

### Logs a Observar

```typescript
// No console do navegador ou logs do servidor:
console.log('Generated X daily reports');
console.warn('Failed to generate daily reports: [error]');
```

### Métricas Úteis

- Tempo médio de geração por login
- Taxa de sucesso de geração
- Número de dias faltando por usuário

### Alertas a Configurar

1. Se `generateMissingDailyReports()` falha > 3x consecutivas
2. Se tempo de geração > 10s
3. Se nenhum relatório foi gerado em 7 dias

---

## Próximos Passos

### Curto Prazo (Semana 1)
- [x] Deploy da migration SQL
- [x] Integração em App.tsx
- [x] Validação manual
- [ ] Testes com dados reais

### Médio Prazo (Semana 2)
- [ ] Setup de cron job diário (Edge Function)
- [ ] Monitoramento em produção
- [ ] Ajustes de performance

### Longo Prazo (Futuro)
- [ ] AI-generated insights (Gemini)
- [ ] Recomendações baseadas em padrões
- [ ] Sharing de relatórios com associações

---

## Rollback

Se precisar remover a feature:

```sql
-- No Supabase SQL Editor:
DROP FUNCTION IF EXISTS public.generate_daily_report CASCADE;

-- A tabela daily_reports permanece (dados preservados)
-- RLS policies permanecem ativas
```

---

## Suporte

**Dúvidas sobre implementação?**
- Verificar seção "Troubleshooting" acima
- Consultar `BE-01_DAILY_REPORTS_AUTOMATION.md` para detalhes arquiteturais
- Revisar código em `src/services/dailyReportService.ts`

**Bugs encontrados?**
- Descrever: quando ocorre, dados de entrada, erro exato
- Fornecer: user_id, data, screenshot de error
- Incluir: logs do console do navegador

---

**Última atualização**: 2025-12-12
**Status**: Ready for Implementation
