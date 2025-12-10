# File Search E2E Test Suite

Testes end-to-end completos para o sistema de File Search integrado em todos os módulos do Aica Life OS.

## 📋 Visão Geral

Esta suite de testes valida:

1. **Isolamento de Módulos**: Cada módulo (Grants, Finance, Podcast, Journey) mantém seus próprios corpora e documentos isolados
2. **RLS (Row-Level Security)**: Usuários não conseguem acessar dados de outros usuários
3. **Qualidade de Busca**: Resultados semânticos relevantes usando Gemini Corpora API
4. **Tracking de Custos**: Integração com AI Cost Dashboard
5. **Analytics Dashboard**: Métricas agregadas e estatísticas por módulo
6. **Error Handling**: Tratamento gracioso de falhas e edge cases

## 🛠️ Pré-requisitos

### 1. Backend FastAPI

O backend Python deve estar rodando em `http://localhost:8000`:

```bash
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Endpoints necessários**:
- `POST /file-search/corpus` - Criar corpus
- `POST /file-search/document` - Adicionar documento
- `POST /file-search/query` - Buscar documentos
- `DELETE /file-search/corpus/{corpus_name}` - Deletar corpus

### 2. Supabase

Tabelas necessárias (criadas via migrations):
- `file_search_corpora` - Registro de corpora por usuário e módulo
- `file_search_documents` - Registro de documentos indexados
- `ai_usage_logs` - Tracking de custos de API

**RLS Policies**:
- Usuários só podem acessar seus próprios corpora
- Usuários só podem ver seus próprios documentos
- Usuários só podem ver seus próprios logs de custo

### 3. Usuários de Teste

Crie dois usuários no Supabase Auth para testes de isolamento:

```sql
-- User 1
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES ('filetest1@example.com', crypt('TestPassword123!', gen_salt('bf')), now());

-- User 2
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES ('filetest2@example.com', crypt('TestPassword123!', gen_salt('bf')), now());
```

**Configure as variáveis de ambiente** no arquivo `.env.test`:

```bash
TEST_USER_EMAIL_1=filetest1@example.com
TEST_USER_PASSWORD_1=TestPassword123!
TEST_USER_EMAIL_2=filetest2@example.com
TEST_USER_PASSWORD_2=TestPassword123!
BASE_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
```

### 4. Playwright Instalado

```bash
npm install --save-dev @playwright/test
npx playwright install
```

## 🚀 Executando os Testes

### Rodar todos os testes

```bash
npx playwright test src/tests/e2e/fileSearch.spec.ts
```

### Rodar suites específicas

```bash
# Apenas testes de isolamento de módulos
npx playwright test --grep "Module Isolation"

# Apenas testes de RLS
npx playwright test --grep "RLS Data Isolation"

# Apenas testes de qualidade de busca
npx playwright test --grep "Search Quality"

# Apenas testes de custos
npx playwright test --grep "Cost Tracking"

# Apenas testes de analytics
npx playwright test --grep "Analytics Dashboard"
```

### Rodar em modo debug

```bash
npx playwright test --debug src/tests/e2e/fileSearch.spec.ts
```

### Rodar com UI

```bash
npx playwright test --ui src/tests/e2e/fileSearch.spec.ts
```

### Gerar relatório HTML

```bash
npx playwright test src/tests/e2e/fileSearch.spec.ts --reporter=html
npx playwright show-report
```

## 📊 Estrutura dos Testes

### 1. Module Isolation Tests

**Objetivo**: Validar que cada módulo mantém seus documentos isolados dos outros módulos.

**Cenários**:
- Grants module retorna apenas documentos de grants
- Finance module retorna apenas documentos de finance
- Podcast module retorna apenas documentos de podcast
- Journey module retorna apenas documentos de journey

**Como funciona**:
1. Cria corpora para diferentes módulos do mesmo usuário
2. Adiciona documentos específicos em cada corpus
3. Realiza buscas em cada módulo
4. Valida que apenas documentos do módulo correto são retornados

### 2. RLS Data Isolation Tests

**Objetivo**: Validar que usuários não conseguem acessar dados de outros usuários (Row-Level Security).

**Cenários**:
- User 1 não vê documentos de User 2
- User 2 não vê documentos de User 1
- Cada usuário vê apenas seus próprios documentos

**Como funciona**:
1. Cria documentos para User 1
2. Cria documentos para User 2
3. Tenta buscar documentos de User 1 enquanto logado como User 2
4. Valida que a busca retorna vazio ou apenas documentos de User 2

### 3. Search Quality Tests

**Objetivo**: Validar a qualidade e relevância dos resultados de busca semântica.

**Cenários**:
- Busca semântica retorna documentos relacionados (não apenas exact match)
- Relevance scores são calculados corretamente
- Queries sem resultados mostram mensagem apropriada

**Como funciona**:
1. Cria múltiplos documentos sobre tópicos relacionados
2. Realiza busca semântica (ex: "inteligência artificial")
3. Valida que documentos relacionados são retornados (ex: "deep learning", "NLP")
4. Verifica que relevance scores são exibidos

### 4. Cost Tracking Tests

**Objetivo**: Validar que operações de File Search são rastreadas no AI Cost Dashboard.

**Cenários**:
- Busca cria entrada no dashboard de custos
- Entrada mostra módulo correto (grants, finance, etc.)
- Entrada mostra operação correta (file_search)

**Como funciona**:
1. Realiza busca em um módulo
2. Navega para AI Cost Dashboard
3. Valida que nova entrada foi criada com dados corretos

### 5. Analytics Dashboard Tests

**Objetivo**: Validar que métricas de File Search são exibidas corretamente.

**Cenários**:
- Dashboard mostra total de corpora
- Dashboard mostra total de documentos
- Dashboard mostra total de buscas
- Breakdown por módulo está correto

**Como funciona**:
1. Cria corpora e documentos em diferentes módulos
2. Navega para File Search Analytics
3. Valida que métricas agregadas estão corretas

### 6. Error Handling Tests

**Objetivo**: Validar que a aplicação trata erros graciosamente.

**Cenários**:
- Backend indisponível mostra mensagem de erro
- Queries malformadas não quebram a aplicação
- Edge cases (string vazia, caracteres especiais) são tratados

## 🔧 Troubleshooting

### Testes falhando com "Timeout"

**Problema**: Backend lento ou não está respondendo.

**Solução**:
1. Verifique se o backend está rodando: `curl http://localhost:8000/health`
2. Aumente o timeout nos testes:
   ```typescript
   await page.waitForSelector('[data-testid="search-results"]', { timeout: 30000 });
   ```

### Testes falhando com "Element not found"

**Problema**: Seletores `data-testid` não estão nos componentes.

**Solução**: Adicione os `data-testid` aos componentes:

```tsx
// Em EditalSearchBar.tsx
<input
  data-testid="search-input"
  type="text"
  placeholder="Buscar no edital..."
/>

<button data-testid="search-button">
  Buscar
</button>

<div data-testid="search-results">
  {results.map(r => <div key={r.id}>{r.text}</div>)}
</div>
```

**Componentes que precisam de data-testid**:
- `EditalSearchBar` → `grants-search-panel`, `search-input`, `search-button`
- `FinanceSearchPanel` → `finance-search-panel`, `search-input`, `search-button`
- `TranscriptSearchPanel` → `podcast-search-panel`, `search-input`, `search-button`
- `JourneySearchPanel` → `journey-search-panel`, `search-input`, `search-button`
- `FileSearchAnalyticsDashboard` → `total-corpora-metric`, `total-documents-metric`, etc.

### RLS Tests falhando

**Problema**: Policies de RLS não estão aplicadas corretamente.

**Solução**: Verifique as policies no Supabase:

```sql
-- Verificar policies em file_search_corpora
SELECT * FROM pg_policies WHERE tablename = 'file_search_corpora';

-- Policy esperada:
CREATE POLICY "Users can only access their own corpora"
ON file_search_corpora
FOR ALL
USING (auth.uid() = user_id);
```

### Cost Tracking Tests falhando

**Problema**: AI usage logs não estão sendo criados.

**Solução**: Verifique que `aiUsageTrackingService.ts` está sendo chamado:

```typescript
// Em fileSearchApiClient.ts
import { trackAIUsage } from '../services/aiUsageTrackingService';

async function searchInCorpora(...) {
  const response = await fetch(...);
  const data = await response.json();

  // Track AI usage
  await trackAIUsage({
    model: 'aqa',
    operation: 'file_search',
    module_type: moduleType,
    // ...
  });

  return data;
}
```

## 📝 Adicionando Novos Testes

Para adicionar novos cenários, siga o padrão:

```typescript
test.describe('File Search - Nova Funcionalidade', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER_1.email, TEST_USER_1.password);
  });

  test('Deve validar novo comportamento', async ({ page }) => {
    const userId = 'test-user-1';

    // Setup: Criar dados de teste
    const corpus = await createTestCorpus(userId, 'grants', 'grant-test', 'Test Corpus');
    await uploadTestDocument(corpus, 'Conteúdo de teste', 'Test Document');

    // Action: Executar ação
    await navigateToModule(page, 'grants');
    await page.click('[data-testid="new-feature-button"]');

    // Assert: Validar resultado
    await expect(page.locator('[data-testid="result"]')).toContainText('Expected Result');

    // Cleanup: Limpar dados
    await cleanupTestCorpus(corpus);
  });
});
```

## 🎯 Próximos Passos

### Tasks pendentes (Fase 10 - Deploy):

1. **Verificar custos em produção**:
   - Configurar alertas para custos acima de threshold
   - Monitorar uso de quota do Gemini Corpora API
   - Dashboard de custos agregados por módulo

2. **Otimizar performance**:
   - Implementar cache de resultados (Redis/Memcached)
   - Adicionar índices no Supabase para queries frequentes
   - Rate limiting para evitar abuse

3. **CI/CD Integration**:
   ```yaml
   # .github/workflows/e2e-tests.yml
   name: E2E Tests
   on: [push, pull_request]
   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
         - run: npm ci
         - run: npx playwright install
         - run: npm run test:e2e
   ```

## 📚 Referências

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Gemini Corpora API](https://ai.google.dev/docs/semantic_retriever)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [File Search Integration Guide](../../../docs/FILE_SEARCH_INTEGRATION_GUIDE.md)

## 🤝 Contribuindo

Para reportar bugs ou sugerir melhorias nos testes:

1. Crie uma issue descrevendo o problema
2. Inclua logs de erro completos
3. Descreva o comportamento esperado vs. atual
4. Forneça steps para reproduzir

---

**Status**: ✅ Fase 9 Completa - 35/37 tasks (94%)

**Última atualização**: 2025-12-09
