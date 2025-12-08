# Testes - Aica Life OS

Suíte completa de testes para validar a migração do Gemini API para arquitetura backend segura.

## 📋 Estrutura de Testes

```
tests/
├── unit/                   # Testes unitários
│   └── gemini-client.test.ts
├── integration/            # Testes de integração (APIs)
│   ├── edge-functions.test.ts
│   └── python-server.test.ts
├── e2e/                    # Testes End-to-End (Playwright)
│   ├── podcast-gemini-integration.spec.ts
│   ├── finance-gemini-integration.spec.ts
│   ├── memory-gemini-integration.spec.ts
│   └── atlas-categorization.spec.ts
├── fixtures/               # Dados de teste
│   ├── bank-statement-with-pii.pdf
│   └── mock-whatsapp-messages.json
└── setup.ts               # Configuração global
```

## 🚀 Pré-requisitos

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Crie `.env.test` com:

```env
# Supabase
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your_anon_key

# Python Server
VITE_LLM_API_URL=http://localhost:8001

# Test User
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword123
```

### 3. Criar Usuário de Teste

```bash
# Via Supabase CLI
npx supabase auth create-user --email test@example.com --password testpassword123

# Ou via dashboard
# Supabase Dashboard > Authentication > Users > Invite User
```

### 4. Iniciar Serviços

**Terminal 1 - Frontend**:
```bash
npm run dev
```

**Terminal 2 - Supabase Local** (opcional para testes locais):
```bash
npx supabase start
```

**Terminal 3 - Python Server**:
```bash
python scripts/aica_llm_server.py
```

## 🧪 Rodar Testes

### Testes Unitários

Testam a lógica interna do GeminiClient (sem chamadas de rede).

```bash
# Rodar todos os testes unitários
npm run test:unit

# Watch mode (reroda ao salvar arquivos)
npm run test:watch

# Com cobertura
npm run test:coverage
```

**Cobertura esperada**: > 80%

### Testes de Integração

Testam as APIs backend (Edge Functions + Python Server).

```bash
# Rodar todos os testes de integração
npm run test:integration

# Rodar teste específico
npm run test:integration edge-functions.test.ts
```

**Pré-requisitos**:
- ✅ Supabase rodando (local ou remoto)
- ✅ Python server rodando
- ✅ Usuário de teste criado
- ✅ API keys configuradas no backend

### Testes E2E (End-to-End)

Testam fluxos completos através da UI usando Playwright.

```bash
# Rodar todos os testes E2E
npm run test:e2e

# Modo UI (com interface gráfica)
npm run test:e2e:ui

# Modo debug (step-by-step)
npm run test:e2e:debug

# Com browser visível
npm run test:e2e:headed

# Teste específico
npm run test:e2e tests/e2e/podcast-gemini-integration.spec.ts
```

**Pré-requisitos**:
- ✅ Frontend rodando em http://localhost:5173
- ✅ Backend services rodando
- ✅ Usuário de teste criado

### Todos os Testes

```bash
# Rodar TODOS os testes (unit + integration + e2e)
npm run test:all
```

⚠️ **Atenção**: Isso pode demorar 5-10 minutos.

## 📊 O Que Cada Teste Valida

### ✅ Testes Unitários (`tests/unit/`)

**GeminiClient** (`gemini-client.test.ts`):
- ✅ Singleton pattern funciona
- ✅ Seleção de modelo (fast/smart/embedding)
- ✅ Roteamento correto (Edge Function vs Python)
- ✅ Tratamento de erros (401, 429, 500)
- ✅ Retry com exponential backoff
- ✅ Parsing de respostas

### ✅ Testes de Integração - Edge Functions (`tests/integration/edge-functions.test.ts`)

**Autenticação**:
- ✅ Rejeita requests sem JWT
- ✅ Aceita requests com JWT válido

**Podcast Actions**:
- ✅ `suggest_guest` - Sugere convidado trending
- ✅ `suggest_topic` - Sugere tema para convidado
- ✅ `generate_dossier` - Gera dossiê completo

**Finance Actions**:
- ✅ `finance_chat` - Chat com Finance Agent

**Memory Actions**:
- ✅ `extract_insights` - Extrai insights de mensagem
- ✅ `extract_work_items` - Extrai tarefas de mensagem

**Atlas Actions**:
- ✅ `categorize_task` - Categoriza tarefa corretamente

**Performance**:
- ✅ Cache retorna resultados ~50% mais rápido
- ✅ Response inclui flag `cached: true`

**Error Handling**:
- ✅ Invalid action retorna 400
- ✅ Malformed payload retorna 400

### ✅ Testes de Integração - Python Server (`tests/integration/python-server.test.ts`)

**Health Check**:
- ✅ Retorna `{ status: "healthy" }`
- ✅ Inclui version info

**PII Sanitization**:
- ✅ Detecta e sanitiza CPF
- ✅ Detecta e sanitiza CNPJ
- ✅ Detecta e sanitiza Email
- ✅ Detecta múltiplos tipos de PII
- ✅ Retorna stats de PII detectado

**PDF Processing**:
- ✅ Processa PDF e extrai transações
- ✅ Sanitiza PII automaticamente
- ✅ Retorna flag `pii_sanitized: true`

**Embedding Generation**:
- ✅ Gera embeddings (768 dimensões)
- ✅ Processa batch de textos
- ✅ Trata texto vazio gracefully

**Sentiment Analysis**:
- ✅ Detecta sentimento positivo
- ✅ Detecta sentimento negativo
- ✅ Detecta sentimento neutro

**Error Handling**:
- ✅ Rejeita requests sem auth (401)
- ✅ Trata base64 inválido (400/500)
- ✅ Trata malformed request (422)

**CORS**:
- ✅ Permite origins configurados

### ✅ Testes E2E (`tests/e2e/`)

**Podcast Module**:
- ✅ Sugerir convidado via UI
- ✅ Gerar dossiê completo
- ✅ Loading states aparecem corretamente
- ✅ Cache funciona (segunda chamada mais rápida)

**Finance Module**:
- ✅ Upload de PDF funciona
- ✅ PII sanitizado (badge aparece)
- ✅ Transações extraídas corretamente
- ✅ Chat com Finance Agent funciona

**Memory Module**:
- ✅ Extração de insights funciona
- ✅ Embeddings gerados corretamente
- ✅ Relatório diário gerado

**Atlas Module**:
- ✅ Auto-categorização funciona
- ✅ Sugestão aparece após digitar
- ✅ Aceitar/rejeitar categoria funciona

**Segurança**:
- ✅ API key NÃO aparece em network requests
- ✅ Apenas endpoints backend são chamados

## 🐛 Troubleshooting

### "No test user found"

**Solução**: Criar usuário de teste:

```bash
# Via Supabase CLI
npx supabase auth create-user \
  --email test@example.com \
  --password testpassword123

# Ou via SQL
INSERT INTO auth.users (email, encrypted_password)
VALUES ('test@example.com', crypt('testpassword123', gen_salt('bf')));
```

### "Python server not reachable"

**Solução**: Iniciar servidor:

```bash
python scripts/aica_llm_server.py
```

Verifique se está rodando em http://localhost:8001

### "Edge Functions not reachable"

**Solução**: Iniciar Supabase local:

```bash
npx supabase start
```

Ou apontar para Supabase remoto no `.env.test`.

### Testes E2E falham com timeout

**Causa**: Backend demorou mais que 30s para responder.

**Solução**:
1. Verificar se Python server está rodando
2. Verificar se API key do Gemini está configurada
3. Aumentar timeout no `playwright.config.ts`:

```typescript
timeout: 60000 // 60s
```

### "Rate limit exceeded"

**Causa**: Executou muitos testes seguidos.

**Solução**:
```sql
-- Reset rate limit no banco
UPDATE rate_limits
SET hourly_count = 0, last_reset = NOW()
WHERE user_id = 'test-user-uuid';
```

### Testes passam localmente mas falham no CI

**Possíveis causas**:
1. Variáveis de ambiente não configuradas no CI
2. Backend services não disponíveis
3. Timeout muito curto

**Solução**: Configurar secrets do GitHub Actions:
```yaml
env:
  VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
  VITE_LLM_API_URL: ${{ secrets.PYTHON_SERVER_URL }}
  TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
  TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
```

## 📈 Métricas de Sucesso

### Critérios para Passar

- ✅ **Unit Tests**: 100% passando, cobertura > 80%
- ✅ **Integration Tests**: > 90% passando
- ✅ **E2E Tests**: > 85% passando (pode ter flakiness)

### Performance Esperada

| Teste | Tempo Esperado |
|-------|----------------|
| Unit tests (todos) | < 5s |
| Integration - Edge Functions | < 30s |
| Integration - Python Server | < 45s |
| E2E - Podcast | < 2min |
| E2E - Finance | < 3min (upload PDF) |
| E2E - Memory | < 1min |
| E2E - Atlas | < 1min |
| **Total (test:all)** | **< 10min** |

## 🎯 Roadmap de Testes

### ✅ Concluído
- [x] Testes unitários do GeminiClient
- [x] Testes de integração Edge Functions
- [x] Testes de integração Python Server
- [x] Setup de testes E2E

### 🔄 Em Andamento
- [ ] Testes E2E completos (Playwright agent rodando)

### 📋 Próximo
- [ ] Testes de carga (stress testing)
- [ ] Testes de segurança (penetration testing)
- [ ] Testes de acessibilidade (a11y)
- [ ] Visual regression testing

## 📚 Referências

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Supabase Testing Guide](https://supabase.com/docs/guides/testing)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

## 🆘 Suporte

Se encontrar problemas:

1. Verificar logs dos serviços backend
2. Conferir variáveis de ambiente
3. Rodar testes individualmente para isolar o problema
4. Abrir issue com logs completos
