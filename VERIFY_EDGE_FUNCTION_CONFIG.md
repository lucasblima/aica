# ✅ Checklist: Verificar Configuração da Edge Function

## Status Atual
- ✅ Frontend: Autenticação funcionando
- ✅ Token: Válido (expira 09/01/2026, 08:48:19)
- ❌ Edge Function: Retorna 401 "Invalid JWT"

---

## Passo 1: Verificar Deploy da Edge Function

### 1.1 Acessar Dashboard do Supabase
```
https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/functions
```

### 1.2 Verificar se `sync-whatsapp-contacts` aparece na lista
- ✅ **SIM**: Vá para Passo 2
- ❌ **NÃO**: A função não está deployada!

**Se NÃO estiver deployada:**
- Você precisa fazer deploy manual via Dashboard
- Use o código em: `EDGE_FUNCTION_COMPLETE_CODE.ts`
- Siga: `DEPLOY_GUIDE.md`

---

## Passo 2: Verificar Status da Edge Function

### 2.1 Clicar na função `sync-whatsapp-contacts`

### 2.2 Verificar o status
- ✅ **Active** (Verde): Função está ativa
- ❌ **Paused** (Vermelho): Função está pausada
- ❌ **Failed**: Último deploy falhou

**Se estiver Paused ou Failed:**
- Clique em "Unpause" ou "Redeploy"

---

## Passo 3: Verificar Secrets (CRÍTICO!)

### 3.1 Na página da função, ir na aba **"Secrets"**

### 3.2 Verificar se TODAS as 3 secrets estão configuradas:

| Nome da Secret | Valor Esperado | Status |
|----------------|----------------|--------|
| `EVOLUTION_API_URL` | URL do servidor Evolution | ⬜ |
| `EVOLUTION_API_KEY` | Chave da API Evolution | ⬜ |
| `EVOLUTION_INSTANCE_NAME` | Nome da instância WhatsApp | ⬜ |

**⚠️ IMPORTANTE:**
- Se qualquer secret estiver faltando, a Edge Function vai falhar!
- Secrets são configuradas APENAS via Dashboard (não via código)

### 3.3 Como Adicionar Secrets

1. Clique em **"Add secret"**
2. Preencha:
   - **Name**: `EVOLUTION_API_URL`
   - **Value**: (URL do seu servidor Evolution)
3. Repita para as outras 2 secrets

**Valores esperados:**
```bash
EVOLUTION_API_URL=https://seu-servidor-evolution.com
EVOLUTION_API_KEY=sua-chave-api-aqui
EVOLUTION_INSTANCE_NAME=nome-da-sua-instancia
```

---

## Passo 4: Verificar Logs da Edge Function

### 4.1 Ir na aba **"Logs"**

### 4.2 Clicar em "Refresh" para ver logs recentes

### 4.3 Procurar por erros:

**Logs Esperados (SUCESSO):**
```
[INFO] Function invoked
[INFO] User authenticated: 3d88f68e-87a5-4d45-93d1-5a28dfacaf86
[INFO] Fetching contacts from Evolution API...
```

**Logs de ERRO (procurar por):**
```
[ERROR] Missing authorization header
[ERROR] Invalid authentication token
[ERROR] Missing environment variables
[ERROR] EVOLUTION_API_URL is undefined
```

---

## Passo 5: Verificar Código da Edge Function

### 5.1 Na aba **"Code"**, verificar se o código está completo

### 5.2 Procurar por estas linhas críticas:

#### ✅ Validação de Auth (deve ter):
```typescript
const authHeader = req.headers.get('Authorization')
if (!authHeader) {
  throw new Error('Missing authorization header')
}

const token = authHeader.replace('Bearer ', '')
const {
  data: { user },
  error: authError,
} = await supabase.auth.getUser(token)

if (authError || !user) {
  throw new Error('Invalid authentication token')
}
```

#### ✅ Validação de Secrets (deve ter):
```typescript
const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL')
const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')
const instanceName = Deno.env.get('EVOLUTION_INSTANCE_NAME')

if (!evolutionApiUrl || !evolutionApiKey || !instanceName) {
  throw new Error('Missing required environment variables')
}
```

---

## 🎯 Resultado Esperado Após Configuração

Depois de configurar as secrets e garantir que a função está deployada:

### Teste Novamente em `/diagnostics`:

**Sucesso (200):**
```
✅ SUCESSO! Edge Function funcionou!
📋 Contatos sincronizados: 544
📋 Contatos ignorados: 0
⏱️ Duração (servidor): 2500ms
```

**Se ainda der 401:**
1. Verifique se clicou "Save" após adicionar secrets
2. Redeploy a função (botão "Deploy" no canto superior direito)
3. Aguarde 30 segundos e teste novamente

---

## 📸 Screenshots Úteis (se possível)

Me envie screenshots de:
1. Lista de Edge Functions (mostrando `sync-whatsapp-contacts`)
2. Aba "Secrets" da função (pode ocultar valores sensíveis)
3. Últimos logs da função (aba "Logs")

---

## 🚨 Problemas Comuns

### Problema 1: Edge Function não aparece na lista
**Solução:** Deploy manual via Dashboard usando `EDGE_FUNCTION_COMPLETE_CODE.ts`

### Problema 2: Função existe mas status "Failed"
**Solução:** Verificar logs para ver erro de deploy, corrigir código e redeploy

### Problema 3: Secrets configuradas mas ainda 401
**Solução:**
1. Redeploy a função (secrets só são carregadas no deploy)
2. Verificar se os valores das secrets estão corretos (sem espaços extras)

### Problema 4: Logs mostram "Missing environment variables"
**Solução:** Adicionar as 3 secrets obrigatórias e redeploy

---

**Execute essa verificação AGORA e me diga o que encontrou!** 🔍

Especialmente:
1. A função `sync-whatsapp-contacts` aparece na lista?
2. Quantas secrets estão configuradas (0, 1, 2 ou 3)?
3. Qual é o último log que aparece na aba "Logs"?
