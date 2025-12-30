# Guia de Configuração - Gemini API (Seguro)

> **Última atualização:** 26/12/2025
> **Status:** Migração para padrão seguro implementada

---

## 🔐 Segurança CRÍTICA

**⚠️ NUNCA exponha a API key do Gemini no frontend!**

A API key deve estar **APENAS** no backend (Supabase Edge Functions). Se você adicionar no arquivo `.env` com prefixo `VITE_`, ela ficará exposta no código JavaScript do browser e qualquer pessoa poderá:
- Extrair a key e usar de graça às suas custas
- Esgotar sua quota do Google
- Gerar custos ilimitados na sua conta

---

## 📋 Pré-requisitos

1. **Conta Google Cloud Platform** com faturamento habilitado
2. **Projeto Aica** no Supabase configurado
3. **Supabase CLI** instalado localmente (para deploy de Edge Functions)

---

## 🚀 Setup Rápido (5 minutos)

### Passo 1: Gerar Nova API Key do Gemini

1. Acesse [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click em **"Create API key"**
3. Escolha seu projeto do Google Cloud
4. **COPIE A KEY** (você verá apenas uma vez!)
5. **Restrinja a API key** (Opcional mas recomendado):
   - No [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Selecione a key criada
   - Em "Application restrictions", escolha "IP addresses"
   - Adicione os IPs dos servidores Supabase (veja documentação Supabase)

### Passo 2: Adicionar API Key no Supabase

**Via Dashboard:**
1. Acesse [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto **Aica**
3. Vá em **Settings** → **Edge Functions** → **Secrets**
4. Click em **"Add Secret"**
5. Name: `GEMINI_API_KEY`
6. Value: Cole a API key copiada
7. Click **"Save"**

**Via CLI (alternativa):**
```bash
cd C:\Users\lucas\repos\Aica_frontend\Aica_frontend

# Login no Supabase (se ainda não logou)
npx supabase login

# Link ao projeto
npx supabase link --project-ref gppebtrshbvuzatmebhr

# Adicionar secret
npx supabase secrets set GEMINI_API_KEY=<sua-api-key-aqui>

# Verificar
npx supabase secrets list
```

### Passo 3: Deploy das Edge Functions

```bash
cd C:\Users\lucas\repos\Aica_frontend\Aica_frontend

# Deploy da função file-search
npx supabase functions deploy file-search

# Deploy da função gemini-chat (se ainda não deployou)
npx supabase functions deploy gemini-chat

# Deploy da função deep-research (se ainda não deployou)
npx supabase functions deploy deep-research

# Verificar deploy
npx supabase functions list
```

### Passo 4: Testar a Integração

```bash
# Rodar a aplicação localmente
npm run dev

# Abra o browser e teste uma funcionalidade que usa File-Search
# Por exemplo: Module Journey > Buscar momentos
```

**Teste de API key:**
```bash
# Verificar se a key está configurada (via Supabase CLI)
npx supabase secrets list

# Deve mostrar:
# GEMINI_API_KEY | *****************************ZTs
```

---

## 🔧 Configuração Avançada

### Variáveis de Ambiente Locais (Desenvolvimento)

Para desenvolvimento local com Supabase CLI:

1. Crie arquivo `.env.local` na raiz do projeto:
```bash
GEMINI_API_KEY=<sua-api-key-aqui>
```

2. Start Supabase local:
```bash
npx supabase start
npx supabase functions serve --env-file .env.local
```

⚠️ **NUNCA commite `.env.local`** ao Git (já está no `.gitignore`)

### Configurar em Produção (Google Cloud Run)

Se você usa Cloud Run para backend:

1. Via `gcloud` CLI:
```bash
gcloud run services update aica-backend \
  --update-secrets=GEMINI_API_KEY=gemini-api-key:latest \
  --region=southamerica-east1
```

2. Via Google Cloud Console:
   - Acesse Cloud Run
   - Selecione o serviço
   - Edit & Deploy New Revision
   - Variables & Secrets → Add Secret
   - Name: `GEMINI_API_KEY`
   - Value: Selecione o secret criado no Secret Manager

---

## 📂 Arquitetura de Segurança (Como Funciona)

### Antes (INSEGURO - Código Antigo):
```
┌──────────────────┐
│  Frontend (JS)   │
│  - VITE_GEMINI_  │  ⚠️ API key visível no browser!
│    API_KEY       │
└────────┬─────────┘
         │
         ↓ Chamada DIRETA
┌─────────────────────┐
│  Google Gemini API  │
└─────────────────────┘
```

### Agora (SEGURO - Novo Padrão):
```
┌──────────────────┐
│  Frontend (JS)   │
│  - Nenhuma key!  │
└────────┬─────────┘
         │ GeminiClient.call()
         ↓ Authenticated request
┌───────────────────────────────┐
│  Supabase Edge Function       │
│  - file-search, gemini-chat   │
│  - GEMINI_API_KEY (protected) │  ✅ Key segura no backend!
└────────┬──────────────────────┘
         │
         ↓ Backend API call
┌─────────────────────┐
│  Google Gemini API  │
└─────────────────────┘
```

---

## 🧪 Validação de Segurança

### Checklist Pós-Setup:

- [ ] ✅ **API key NÃO está no `.env`** com prefixo `VITE_`
- [ ] ✅ **API key ESTÁ no Supabase Secrets** (`npx supabase secrets list`)
- [ ] ✅ **Edge Functions deployadas** (`npx supabase functions list`)
- [ ] ✅ **Bundle de produção NÃO contém a key**
  ```bash
  npm run build
  grep -r "AIzaSy" dist/
  # Resultado esperado: nada encontrado
  ```
- [ ] ✅ **Network tab mostra chamadas para Edge Functions**, não diretamente para Google
- [ ] ✅ **Aplicação funciona** sem erros de autenticação

---

## 🐛 Troubleshooting

### Erro: "API key não configurada no servidor"

**Causa:** `GEMINI_API_KEY` não está nos secrets do Supabase

**Solução:**
```bash
npx supabase secrets set GEMINI_API_KEY=<sua-key>
npx supabase functions deploy file-search
npx supabase functions deploy gemini-chat
```

### Erro: "Usuário não autenticado"

**Causa:** Frontend não está passando token de autenticação Supabase

**Solução:**
- Verifique se usuário está logado: `await supabase.auth.getUser()`
- Token é automaticamente incluído pelo `GeminiClient.getInstance()`

### Erro: 403 - "The caller does not have permission"

**Causa:** API key não tem permissões para Gemini API

**Solução:**
1. Acesse [Google Cloud Console](https://console.cloud.google.com)
2. Vá em **APIs & Services** → **Enabled APIs & services**
3. Habilite:
   - **Generative Language API**
   - **Gemini API**
4. Aguarde 2-3 minutos para propagação

### Erro: 429 - "Resource exhausted"

**Causa:** Quota da API excedida

**Solução:**
1. Verifique [Google Cloud Console Quotas](https://console.cloud.google.com/iam-admin/quotas)
2. Veja uso atual em `ai_usage_analytics` table no Supabase
3. Solicite aumento de quota se necessário

### Edge Function não recebe secret

**Causa:** Secret não propagou ou função não foi re-deployada

**Solução:**
```bash
# Re-deploy forçado
npx supabase functions deploy file-search --no-verify-jwt

# Verificar logs
npx supabase functions logs file-search
```

---

## 📊 Monitoramento de Custos

### Tracking de Uso

Todas as chamadas ao Gemini são logadas em `ai_usage_analytics`:

```sql
SELECT
  operation_type,
  ai_model,
  COUNT(*) AS calls,
  SUM(total_tokens) AS total_tokens,
  SUM(estimated_cost) AS estimated_cost
FROM ai_usage_analytics
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY operation_type, ai_model
ORDER BY estimated_cost DESC;
```

### Alertas de Custo

Configure alertas no Google Cloud:
1. **Budget & Alerts** no Google Cloud Console
2. Defina orçamento mensal (ex: $100)
3. Alerta em 50%, 80%, 100% do orçamento

---

## 🔄 Migração de Código Legado

### Módulos que ainda usam padrão INSEGURO:

⚠️ **Os seguintes serviços precisam ser migrados:**

1. **`src/modules/grants/services/grantAIService.ts`**
   - Usa `GoogleGenerativeAI` diretamente (linha 10-20)
   - **Ação:** Migrar para usar `GeminiClient.getInstance()`
   - **Esforço:** M (Médio - 3-4 horas)

2. **`src/hooks/useFileSearch.ts` e módulos dependentes**
   - Usa `fileSearchApiClient.ts` que chama o antigo `geminiFileSearchService.ts`
   - **Ação:** Atualizar para usar `secureFileSearchService.ts`
   - **Esforço:** M (Médio - 4-5 horas)

3. **Hooks específicos de módulos:**
   - `src/modules/journey/hooks/useJourneyFileSearch.ts`
   - `src/modules/finance/hooks/useFinanceFileSearch.ts`
   - `src/modules/grants/hooks/useGrantsFileSearch.ts`
   - `src/modules/studio/hooks/usePodcastFileSearch.ts`

   **Ação:** Atualizar para usar `GeminiClient` via ações File-Search
   **Esforço:** L (Grande - 8-10 horas total)

### Como Migrar um Serviço:

**ANTES (Inseguro):**
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

export async function analyzeDocument(text: string) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent(text);
  return result.response.text();
}
```

**DEPOIS (Seguro):**
```typescript
import { GeminiClient } from '@/lib/gemini/client';

export async function analyzeDocument(text: string) {
  const client = GeminiClient.getInstance();

  const response = await client.call({
    action: 'analyze_document', // Adicione esta action ao gemini-chat
    payload: { text },
    model: 'fast'
  });

  return response.result;
}
```

**E adicione no Edge Function `gemini-chat/index.ts`:**
```typescript
case 'analyze_document':
  const model = genAI.getGenerativeModel({ model: MODELS.fast });
  const result = await model.generateContent(payload.text);
  return { text: result.response.text() };
```

---

## 📚 Referências

- [Gemini API Documentation](https://ai.google.dev/gemini-api/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Google Cloud Pricing Calculator](https://cloud.google.com/products/calculator)
- [Aica Architecture Analysis](./AICA_ARCHITECTURE_ANALYSIS.md)

---

## 🆘 Suporte

**Problemas?** Abra uma issue no GitHub ou contate a equipe de desenvolvimento.

**Contribuindo:** Veja [CONTRIBUTING.md](../CONTRIBUTING.md) para diretrizes.
