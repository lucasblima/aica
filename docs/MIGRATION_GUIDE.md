# Guia de Migração - Backend Seguro para Gemini API

## 📋 Visão Geral

Este guia detalha a migração de chamadas diretas ao Gemini API (inseguras) para uma arquitetura híbrida segura com Edge Functions e servidor Python.

**Mudanças Principais**:
- ✅ API key movida do frontend para backend
- ✅ Arquitetura híbrida: Edge Functions (< 10s) + Python server (> 10s)
- ✅ PII detection e sanitization automática (LGPD/GDPR)
- ✅ Rate limiting, cache e retry logic
- ✅ Audit logs completos

---

## 🎯 Passo 1: Preparar Ambiente

### 1.1 Atualizar Dependências

```bash
# Instalar novas dependências do frontend
npm install

# Instalar dependências do Python server
cd scripts
pip install -r requirements_llm.txt
python -m spacy download pt_core_news_lg
cd ..
```

### 1.2 Atualizar Variáveis de Ambiente

**Criar novo `.env` baseado em `.env.example`**:

```bash
cp .env.example .env
```

**Editar `.env`**:

```env
# REMOVER esta linha (não usar mais):
# VITE_GEMINI_API_KEY=...

# ADICIONAR:
VITE_LLM_API_URL=http://localhost:8001  # Desenvolvimento
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key
```

---

## 🗄️ Passo 2: Aplicar Migrations no Supabase

### 2.1 Verificar Conexão

```bash
npx supabase status
```

Se não estiver conectado:

```bash
npx supabase login
npx supabase link --project-ref seu-projeto-ref
```

### 2.2 Aplicar Migration de Infraestrutura LLM

```bash
# Aplicar migration
npx supabase db push

# Verificar se foi aplicada
npx supabase db remote ls
```

**Migration aplicada**: `20251206_llm_infrastructure.sql`

**Tabelas criadas**:
- `llm_cache` - Cache de respostas LLM
- `llm_metrics` - Métricas de uso
- `rate_limits` - Rate limiting por usuário

### 2.3 Verificar no Dashboard

Acesse o Supabase Dashboard > Table Editor e verifique:

✅ Tabela `llm_cache` existe
✅ Tabela `llm_metrics` existe
✅ Tabela `rate_limits` existe
✅ Function `check_and_increment_rate_limit` existe

---

## 🚀 Passo 3: Deploy Edge Functions

### 3.1 Configurar Secrets

```bash
# Configurar API key do Gemini
npx supabase secrets set GEMINI_API_KEY=sua_chave_gemini_aqui

# Verificar secrets
npx supabase secrets list
```

### 3.2 Deploy das Functions

```bash
# Deploy da função de chat principal
npx supabase functions deploy gemini-chat

# Deploy da função WebSocket (Gemini Live)
npx supabase functions deploy gemini-live
```

### 3.3 Testar Edge Functions

```bash
# Obter token de teste
TOKEN=$(npx supabase auth get-token)

# Testar health check
curl https://seu-projeto.supabase.co/functions/v1/gemini-chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "suggest_guest",
    "payload": {}
  }'
```

**Resposta esperada**:
```json
{
  "result": "Nome de convidado sugerido",
  "latencyMs": 1234
}
```

---

## 🐍 Passo 4: Deploy Python Server (Easypanel)

### 4.1 Preparar Repositório

Certifique-se que os arquivos estão commitados:

```bash
git add scripts/
git commit -m "feat: add Python LLM server"
git push
```

### 4.2 Configurar no Easypanel

1. **Criar Novo Serviço**:
   - Tipo: Docker
   - Nome: `aica-llm-server`
   - Repositório: `https://github.com/seu-usuario/Aica_frontend`
   - Branch: `main`

2. **Configurar Build**:
   - Dockerfile: `scripts/Dockerfile`
   - Context: `scripts/`

3. **Configurar Variáveis de Ambiente**:

```env
GEMINI_API_KEY=sua_chave_gemini
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua_service_role_key
CORS_ORIGINS=http://localhost:5173,https://seu-app.vercel.app
```

4. **Configurar Porta**:
   - Container Port: `8001`
   - Protocolo: HTTP

5. **Deploy**: Clique em "Deploy"

### 4.3 Obter URL de Produção

Após deploy, o Easypanel fornecerá uma URL:

```
https://aica-llm-server.seu-dominio.com
```

**Atualizar `.env` de produção**:

```env
VITE_LLM_API_URL=https://aica-llm-server.seu-dominio.com
```

### 4.4 Testar Python Server

```bash
# Health check
curl https://aica-llm-server.seu-dominio.com/health

# Resposta esperada:
# {"status":"healthy","timestamp":"2024-XX-XX..."}
```

---

## 🔧 Passo 5: Atualizar Frontend

### 5.1 Verificar Imports

**Verificar que todos os serviços usam `GeminiClient`**:

```bash
# Procurar por importações antigas (não deve encontrar nada)
grep -r "import.*GoogleGenAI.*from.*@google/genai" src/

# Procurar por nova biblioteca (deve encontrar vários)
grep -r "import.*GeminiClient.*from.*@/lib/gemini" src/
```

### 5.2 Verificar que API Key não está exposta

```bash
# NÃO deve encontrar nada:
grep -r "VITE_GEMINI_API_KEY" src/

# Se encontrar, remover as ocorrências
```

### 5.3 Build de Teste

```bash
npm run build
```

**Não deve ter erros de TypeScript**.

---

## 🧪 Passo 6: Testes de Integração

### 6.1 Rodar Localmente

**Terminal 1 - Frontend**:
```bash
npm run dev
```

**Terminal 2 - Python Server**:
```bash
python scripts/aica_llm_server.py
```

**Terminal 3 - Supabase Local (opcional)**:
```bash
npx supabase start
```

### 6.2 Testar Módulo Podcast

1. Abrir `http://localhost:5173`
2. Navegar para Podcast > Pre-Production
3. Testar:
   - ✅ Sugerir convidado trending
   - ✅ Sugerir tema
   - ✅ Gerar dossiê completo

**Verificar**:
- Chamadas vão para Edge Function (veja Network tab)
- Respostas são cacheadas (segunda chamada mais rápida)
- Sem erros no console

### 6.3 Testar Módulo Finance

1. Navegar para Finance > Upload Statement
2. Fazer upload de um PDF de extrato bancário
3. Verificar:
   - ✅ PDF processado via Python server
   - ✅ PII detectado e sanitizado
   - ✅ Transações extraídas corretamente

**Verificar**:
- Request vai para `http://localhost:8001/process-pdf`
- Response inclui `pii_sanitized: true`
- Response inclui `pii_stats` com contagens

### 6.4 Testar Finance Agent

1. Navegar para Finance > Agent Chat
2. Fazer pergunta: "Analise meus gastos"
3. Verificar:
   - ✅ Resposta do chat via Edge Function
   - ✅ Context incluído no prompt
   - ✅ Conversa salva no banco

**Verificar**:
- Request vai para Edge Function
- Response time < 5 segundos
- Mensagem aparece no histórico

### 6.5 Verificar Metrics no Supabase

```sql
-- Ver métricas recentes
SELECT
  action,
  COUNT(*) as total_calls,
  AVG(latency_ms) as avg_latency,
  SUM(CASE WHEN cached THEN 1 ELSE 0 END) as cache_hits
FROM llm_metrics
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY action;
```

---

## 📊 Passo 7: Monitoramento e Troubleshooting

### 7.1 Ver Logs do Python Server (Easypanel)

```bash
# No Easypanel Dashboard
Logs Tab > Filter: ERROR ou INFO
```

### 7.2 Ver Logs das Edge Functions

```bash
# Via CLI
npx supabase functions logs gemini-chat --tail

# Ou no Dashboard
Functions > gemini-chat > Logs
```

### 7.3 Verificar Rate Limits

```sql
-- Ver rate limits de um usuário
SELECT * FROM rate_limits
WHERE user_id = 'user-uuid-aqui';
```

### 7.4 Verificar Cache Efficiency

```sql
-- Ver estatísticas de cache
SELECT * FROM cache_efficiency;
```

### 7.5 Problemas Comuns

#### "401 Unauthorized" nas Edge Functions

**Causa**: Token JWT inválido ou expirado

**Solução**:
```typescript
// Verificar se usuário está logado
const { data: { session } } = await supabase.auth.getSession()
if (!session) {
  // Redirecionar para login
}
```

#### "Failed to fetch" para Python Server

**Causa**: Servidor não está rodando ou CORS bloqueado

**Solução**:
```bash
# Verificar se servidor está up
curl http://localhost:8001/health

# Verificar CORS no servidor
# Em scripts/aica_llm_server.py, verificar allow_origins
```

#### "Rate limit exceeded"

**Causa**: Usuário excedeu 100 requests/hora

**Solução**:
```sql
-- Reset rate limit manualmente (apenas para testes)
UPDATE rate_limits
SET hourly_count = 0, last_reset = NOW()
WHERE user_id = 'user-uuid-aqui';
```

#### PDFs não sendo processados

**Causa**: Python server não tem dependências instaladas

**Solução**:
```bash
cd scripts
pip install pdfplumber
python -m spacy download pt_core_news_lg
```

---

## 🚢 Passo 8: Deploy em Produção

### 8.1 Checklist Pré-Deploy

- [ ] Migration aplicada no Supabase
- [ ] Edge Functions deployed com secrets
- [ ] Python server deployed no Easypanel
- [ ] Variáveis de ambiente configuradas
- [ ] Testes locais passando
- [ ] Build de produção sem erros

### 8.2 Deploy Frontend (Vercel)

```bash
# Build local
npm run build

# Commit e push
git add .
git commit -m "feat: migrate to secure backend architecture"
git push

# Vercel deploy automático ou manual
vercel --prod
```

**Configurar variáveis no Vercel**:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key
VITE_LLM_API_URL=https://aica-llm-server.seu-dominio.com
```

### 8.3 Verificar Produção

1. **Edge Functions**:
   ```bash
   curl https://seu-projeto.supabase.co/functions/v1/gemini-chat/health
   ```

2. **Python Server**:
   ```bash
   curl https://aica-llm-server.seu-dominio.com/health
   ```

3. **Frontend**:
   ```
   https://seu-app.vercel.app
   ```

### 8.4 Smoke Tests em Produção

- [ ] Login funciona
- [ ] Sugerir convidado no Podcast
- [ ] Upload de PDF no Finance
- [ ] Chat com Finance Agent
- [ ] Verificar logs no Supabase (sem erros)

---

## 📈 Passo 9: Monitoramento Contínuo

### 9.1 Métricas para Acompanhar

**Diariamente**:
- Total de requests LLM
- Taxa de erro
- Cache hit rate
- Custo estimado (tokens)

**Query útil**:
```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE status = 'error') as errors,
  COUNT(*) FILTER (WHERE cached = true) as cache_hits,
  ROUND(COUNT(*) FILTER (WHERE cached = true)::numeric / COUNT(*) * 100, 2) as cache_hit_rate
FROM llm_metrics
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### 9.2 Alertas Recomendados

1. **Taxa de erro > 5%**
   - Investigar logs
   - Verificar rate limits do Gemini

2. **Latência média > 10s**
   - Verificar performance do Python server
   - Considerar escalar instância

3. **Cache hit rate < 30%**
   - Revisar TTLs do cache
   - Verificar se keys estão sendo geradas corretamente

---

## 🔄 Rollback (Caso Necessário)

Se algo der errado, você pode voltar temporariamente:

### Rollback Parcial (manter backend, voltar frontend)

```bash
# Reverter commit
git revert HEAD
git push

# Redeploy automático no Vercel
```

### Rollback Completo (voltar tudo)

**NÃO RECOMENDADO** - Você perderia proteção de segurança!

Mas se necessário:

1. Reverter código:
   ```bash
   git revert <commit-hash>
   ```

2. Readicionar API key no frontend (temporário):
   ```env
   VITE_GEMINI_API_KEY=sua_chave
   ```

3. Usar serviços antigos

---

## ✅ Checklist Final

### Segurança
- [ ] Nenhuma API key exposta no frontend
- [ ] Edge Functions autenticadas via JWT
- [ ] Rate limiting ativo
- [ ] PII sanitization funcionando
- [ ] Audit logs registrando chamadas

### Performance
- [ ] Cache hit rate > 40%
- [ ] Latência média < 3s (Edge Functions)
- [ ] Latência média < 15s (Python server)
- [ ] Retry logic funcionando

### Funcionalidade
- [ ] Podcast: sugestões e dossiês funcionando
- [ ] Finance: PDFs sendo processados
- [ ] Finance Agent: chat responsivo
- [ ] Métricas sendo salvas no Supabase

### Documentação
- [ ] `.env.example` atualizado
- [ ] README com instruções
- [ ] Este guia de migração completo

---

## 🆘 Suporte

**Problemas?**

1. Verificar logs:
   - Easypanel: `Logs` tab
   - Supabase: `Functions > Logs`
   - Browser: DevTools Console

2. Verificar variáveis de ambiente:
   ```bash
   # Frontend
   echo $VITE_LLM_API_URL

   # Easypanel
   # Ver no dashboard
   ```

3. Abrir issue no repositório com:
   - Descrição do erro
   - Logs relevantes
   - Steps para reproduzir

---

**Migração concluída com sucesso! 🎉**

Seu sistema agora está:
- ✅ Mais seguro (API key protegida)
- ✅ Mais confiável (retry + rate limiting)
- ✅ Mais performático (cache inteligente)
- ✅ Conforme LGPD/GDPR (PII sanitization)
